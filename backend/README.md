# Research App Backend

This is the Go backend service for the Research App that handles web searches and content fetching. It provides a CORS-enabled API endpoint that bypasses browser CORS restrictions when fetching content from various websites.

## Prerequisites

- Go 1.21 or later
- Internet connection for fetching search results

## Setup

1. Clone the repository
2. Navigate to the backend directory:
```bash
cd backend
```

3. Install dependencies:
```bash
go mod tidy
```

4. Build and run the server:
```bash
go run cmd/server/main.go
```

The server will start on `http://localhost:8080`

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go           # Server entry point
├── internal/
│   ├── duckduckgo/
│   │   └── duckduckgo.go    # DuckDuckGo search implementation
│   └── search/
│       └── search.go        # Search service with caching and content fetching
└── go.mod
```

### Internal Packages

#### duckduckgo

The `duckduckgo` package provides a simple interface for performing web searches using DuckDuckGo's HTML search. It handles:
- Performing searches with configurable result limits
- Parsing HTML search results
- Cleaning and normalizing URLs

Usage:
```go
results, err := duckduckgo.Search("your query", 10)
```

#### search

The `search` package builds on top of the DuckDuckGo search to provide:
- Result caching to improve performance
- Parallel content fetching from search results
- Content cleaning and processing
- Source name extraction
- Rate limiting for concurrent requests

## API Endpoints

### GET /api/search

Performs a web search and fetches content from the search results.

Query Parameters:
- `q` (required): The search query
- `results` (optional): Number of search results to return (default: 10)
- `maxLength` (optional): Maximum length of content to fetch per result (default: 8000)

Example:
```bash
curl "http://localhost:8080/api/search?q=your+search+query&results=5&maxLength=5000"
```

Response format:
```json
{
  "results": [
    {
      "title": "Result title",
      "snippet": "Result snippet",
      "url": "https://example.com",
      "content": "Full page content...",
      "sourceName": "example"
    }
  ]
}
```

### GET /health

Health check endpoint to verify the server is running.

Example:
```bash
curl http://localhost:8080/health
```

Response:
```json
{
  "status": "ok"
}
```

## CORS Configuration

The server is configured to allow requests from all origins.

## Caching

The search service implements two levels of caching:
1. Search Results Cache: Caches complete search responses for 24 hours
2. Page Content Cache: Caches fetched page content for 24 hours

This reduces load on external services and improves response times for repeated queries.