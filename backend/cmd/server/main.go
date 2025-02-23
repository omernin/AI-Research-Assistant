package main

import (
	"log"
	"net/http"
	"strconv"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/researcher/backend/internal/search"
)

func main() {
	r := gin.Default()

	// Configure CORS middleware
	config := cors.DefaultConfig()
	config.AllowAllOrigins = true
	config.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}
	config.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(config))

	// Search endpoint
	r.GET("/api/search", func(c *gin.Context) {
		query := c.Query("q")
		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "query parameter is required"})
			return
		}

		// Parse optional parameters with defaults
		numResults := 10
		if n, err := strconv.Atoi(c.DefaultQuery("results", "10")); err == nil {
			numResults = n
		}

		maxContentLength := 8000
		if n, err := strconv.Atoi(c.DefaultQuery("maxLength", "8000")); err == nil {
			maxContentLength = n
		}

		results, err := search.Search(query, numResults, maxContentLength)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		if results.Results == nil {
			results.Results = make([]search.SearchResult, 0)
		}

		c.JSON(http.StatusOK, results)
	})

	type FetchRsponse struct {
		Contents string `json:"contents"`
	}

	r.GET("/api/fetch", func(c *gin.Context) {
		url := c.Query("url")
		if url == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "url parameter is required"})
			return
		}

		maxContentLength := 8000
		if n, err := strconv.Atoi(c.DefaultQuery("maxLength", "8000")); err == nil {
			maxContentLength = n
		}

		content, err := search.FetchPageContent(url, maxContentLength)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, FetchRsponse{Contents: content})
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	log.Println("Starting server on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
