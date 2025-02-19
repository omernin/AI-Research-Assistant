# AI Research Assistant

A powerful web-based research tool that combines DuckDuckGo web search with AI models to provide comprehensive, up-to-date answers with proper citations and references.

## Features

- **Web Search Integration**: Automatically searches DuckDuckGo for current information
- **AI-Powered Analysis**: Uses advanced language models to analyze and synthesize information
- **Comprehensive Reports**:
  * Quick answer (300-500 words)
  * Executive summary (800-1000 words)
  * Dynamic, detailed analysis sections (500+ words each)
- **Responsive Design**: Optimized layout that adapts to your screen size
- **Source Citations**: Includes references with clickable URLs
- **Intelligent Research**: Automatically generates and processes internal follow-up questions for comprehensive coverage
- **Markdown Support**: Renders responses with proper formatting
- **Multiple Models**: Support for gpt-4o, gpt-4o-mini, o1, and o3-mini

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, etc.)
- An API key for authentication

### Installation

1. Clone the repository or download the files:
```bash
git clone https://github.com/omernin/researcher.git
```

2. Open `index.html` in your web browser.

### Usage

1. Enter your API key in the designated field
2. Select your preferred model (gpt-4o, gpt-4o-mini, o1, or o3-mini)
3. Type your research question
4. Click "Research" to start the process

The assistant will:
- Search the web for current information
- Analyze and synthesize the findings
- Provide a quick summary and detailed answer
- Include references with source URLs
- Generate relevant follow-up questions

## How It Works

1. When you submit a question, the application first searches DuckDuckGo for relevant information
2. The search results are processed and formatted
3. The AI automatically generates relevant follow-up questions internally
4. Additional searches are performed for each follow-up question to gather comprehensive data
5. All gathered information is analyzed and synthesized by the selected AI model
6. A complete research report is generated with proper citations and references

## Response Structure

Each response includes:
- A quick answer (300-500 words) with key findings and implications
- An executive summary (800-1000 words) synthesizing all information
- Dynamic, detailed analysis sections based on the specific question:
  * Each section contains 500+ words of thorough explanation
  * Comprehensive coverage of topic-specific aspects
  * Real-world examples and applications
  * Critical analysis and insights
  * Future considerations where relevant
- Web sources and references with clickable links

## Technical Details

- Uses the DuckDuckGo API for web searches
- Integrates with advanced language models
- Supports markdown formatting
- Implements responsive design
- Features collapsible sections for follow-up questions

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- DuckDuckGo for their search API
- Marked.js for markdown rendering