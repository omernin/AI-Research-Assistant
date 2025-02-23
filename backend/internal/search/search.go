package search

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/PuerkitoBio/goquery"
	"github.com/researcher/backend/internal/duckduckgo"
	"golang.org/x/net/html/charset"
)

// CacheEntry stores cached data with timestamp
type CacheEntry struct {
	Data      interface{}
	Timestamp time.Time
}

var (
	// Cache for search results and page contents
	searchCache = sync.Map{}
	pageCache   = sync.Map{}
	// Cache timeout duration
	cacheDuration = 24 * time.Hour
)

// SearchResult represents a single search result with additional content
type SearchResult struct {
	Title      string `json:"title"`
	Snippet    string `json:"snippet"`
	URL        string `json:"url"`
	Content    string `json:"content"`
	SourceName string `json:"sourceName"`
}

// SearchResponse contains the search results
type SearchResponse struct {
	Results []SearchResult `json:"results"`
}

// getCacheKey creates a unique key for caching
func getCacheKey(query string, numResults int) string {
	return fmt.Sprintf("%s:%d", query, numResults)
}

// getFromCache retrieves data from cache if it exists and is not expired
func getFromCache(cache *sync.Map, key string) (interface{}, bool) {
	if value, ok := cache.Load(key); ok {
		entry := value.(CacheEntry)
		if time.Since(entry.Timestamp) < cacheDuration {
			return entry.Data, true
		}
		cache.Delete(key) // Remove expired entry
	}
	return nil, false
}

// setCache stores data in cache with current timestamp
func setCache(cache *sync.Map, key string, data interface{}) {
	cache.Store(key, CacheEntry{
		Data:      data,
		Timestamp: time.Now(),
	})
}

func createSourceName(title, urlStr string) string {
	parsedURL, err := url.Parse(urlStr)
	if err != nil {
		words := strings.Fields(title)
		if len(words) > 2 {
			return strings.Join(words[:2], " ")
		}
		return title
	}

	domain := strings.TrimPrefix(parsedURL.Hostname(), "www.")
	return strings.Split(domain, ".")[0]
}

func FetchPageContent(urlStr string, maxContentLength int) (string, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	resp, err := client.Get(urlStr)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusMultipleChoices {
		return "", fmt.Errorf("status code error: %d", resp.StatusCode)
	}

	// Handle character encoding
	contentType := resp.Header.Get("Content-Type")
	reader, err := charset.NewReader(resp.Body, contentType)
	if err != nil {
		return "", fmt.Errorf("failed to create charset reader: %v", err)
	}

	doc, err := goquery.NewDocumentFromReader(reader)
	if err != nil {
		return "", err
	}

	// Remove non-content elements
	doc.Find("script, style, iframe, nav, header, footer, form, noscript, " +
		"#header, #footer, #nav, #menu, .nav, .menu, .header, .footer, " +
		".sidebar, .comments, .advertisement").Remove()

	// Get main content areas if they exist
	var content string
	mainContent := doc.Find("main, article, .content, .main, #content, #main")
	if mainContent.Length() > 0 {
		content = strings.TrimSpace(mainContent.First().Text())
	} else {
		// Fallback to body if no main content areas found
		content = strings.TrimSpace(doc.Find("body").Text())
	}

	// Clean up the text
	content = strings.Join(strings.Fields(content), " ")
	content = strings.Map(func(r rune) rune {
		if unicode.IsPrint(r) {
			return r
		}
		return -1
	}, content)

	if len(content) > maxContentLength {
		// Try to break at a word boundary
		lastSpace := strings.LastIndex(content[:maxContentLength], " ")
		if lastSpace > 0 {
			content = content[:lastSpace]
		} else {
			content = content[:maxContentLength]
		}
	}

	return content, nil
}

// Search performs a search and enriches results with page content
func Search(query string, numResults int, maxContentLength int) (*SearchResponse, error) {
	// Check cache first
	cacheKey := getCacheKey(query, numResults)
	if cached, ok := getFromCache(&searchCache, cacheKey); ok {
		return cached.(*SearchResponse), nil
	}

	// Perform search using DuckDuckGo
	results, err := duckduckgo.Search(query, numResults)
	if err != nil {
		return nil, fmt.Errorf("search failed: %w", err)
	}

	// Process results in parallel
	var wg sync.WaitGroup
	resultChan := make(chan SearchResult, len(results))
	semaphore := make(chan struct{}, 5) // Limit concurrent requests

	for _, result := range results {
		wg.Add(1)
		go func(r duckduckgo.Result) {
			defer wg.Done()
			semaphore <- struct{}{}        // Acquire semaphore
			defer func() { <-semaphore }() // Release semaphore

			searchResult := SearchResult{
				Title:      r.Title,
				Snippet:    r.Snippet,
				URL:        r.URL,
				SourceName: createSourceName(r.Title, r.URL),
			}

			// Check page cache first
			if cached, ok := getFromCache(&pageCache, r.URL); ok {
				searchResult.Content = cached.(string)
				resultChan <- searchResult
				return
			}

			// Fetch page content
			if content, err := FetchPageContent(r.URL, maxContentLength); err == nil {
				searchResult.Content = content
				setCache(&pageCache, r.URL, content)
			} else {
				searchResult.Content = r.Snippet
			}

			resultChan <- searchResult
		}(result)
	}

	// Wait for all goroutines to complete
	go func() {
		wg.Wait()
		close(resultChan)
	}()

	// Collect results
	var searchResults []SearchResult
	for result := range resultChan {
		searchResults = append(searchResults, result)
	}

	response := &SearchResponse{
		Results: searchResults,
	}

	// Cache the search results
	setCache(&searchCache, cacheKey, response)

	return response, nil
}
