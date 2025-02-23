package duckduckgo

import (
	"fmt"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
)

// Result represents a single search result from DuckDuckGo
type Result struct {
	Title   string
	Snippet string
	URL     string
}

// Search performs a search on DuckDuckGo and returns the results
func Search(query string, maxResults int) ([]Result, error) {
	client := &http.Client{
		Timeout: 10 * time.Second,
	}

	searchURL := fmt.Sprintf("https://html.duckduckgo.com/html/?q=%s", url.QueryEscape(query))
	req, err := http.NewRequest("GET", searchURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set a common User-Agent to avoid being blocked
	req.Header.Set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to perform search request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= http.StatusMultipleChoices {
		return nil, fmt.Errorf("search request failed with status: %d", resp.StatusCode)
	}

	doc, err := goquery.NewDocumentFromReader(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to parse search results: %w", err)
	}

	var results []Result
	count := 0

	doc.Find(".result").EachWithBreak(func(i int, s *goquery.Selection) bool {
		if count >= maxResults {
			return false // Break the loop
		}

		title := strings.TrimSpace(s.Find(".result__title").Text())
		snippet := strings.TrimSpace(s.Find(".result__snippet").Text())
		rawURL, exists := s.Find(".result__url").Attr("href")
		if !exists || rawURL == "" {
			return true // Continue to next result
		}

		cleanedURL := cleanURL(rawURL)
		if cleanedURL != "" {
			results = append(results, Result{
				Title:   title,
				Snippet: snippet,
				URL:     cleanedURL,
			})
			count++
		}
		return true // Continue loop
	})

	return results, nil
}

// cleanURL extracts the actual URL from DuckDuckGo's redirect URL
func cleanURL(rawURL string) string {
	if strings.Contains(rawURL, "duckduckgo.com/l/?uddg=") {
		parts := strings.Split(rawURL, "uddg=")
		if len(parts) > 1 {
			if decoded, err := url.QueryUnescape(parts[1]); err == nil {
				return decoded
			}
		}
	}
	return rawURL
}
