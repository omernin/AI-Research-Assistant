# Research App

A web application for performing comprehensive research using AI and web search capabilities.

## Project Structure

```
chatgpt-research-app/
├── backend/           # Go backend service
│   ├── cmd/          # Command line applications
│   ├── internal/     # Internal packages
│   └── README.md     # Backend documentation
├── index.html        # Frontend HTML
├── styles.css        # Frontend styles
└── script.js         # Frontend JavaScript
```

## Setup and Running

### 1. Start the Backend Server

First, start the Go backend server that handles web searches and content fetching:

```bash
cd backend
go mod tidy
go run cmd/server/main.go
```

The backend server will run on http://localhost:8080

### 2. Start the Frontend

You can use any static file server to serve the frontend. For example, using Python's built-in HTTP server:

```bash
# From the root directory
python3 -m http.server 5500
```

Or using VS Code's Live Server extension, right-click on index.html and select "Open with Live Server".

The frontend will be available at http://localhost:5500

## Features

- Web search functionality using DuckDuckGo
- Content extraction from search results
- AI-powered research synthesis
- Cost tracking for API usage
- Report history management
- Configurable search parameters

## Configuration

The application can be configured through the UI:
- Number of follow-up questions
- Number of search results to fetch
- Maximum content length per article
- Research depth cycles

## API Key

The application requires an OpenAI API key to function. You can enter your API key in the configuration section of the UI.

## CORS Handling

The Go backend service handles CORS issues by proxying web requests. This allows the frontend to fetch content from various websites without running into CORS restrictions.