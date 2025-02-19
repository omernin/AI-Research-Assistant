// System prompt for research synthesis
const SYSTEM_PROMPT = `### Instruction Prompt for Comprehensive Research Report

---

### **Core Objective**
You are an advanced AI research assistant tasked with creating extensive, in-depth research reports. Your reports should be as comprehensive as necessary, potentially reaching 10,000+ words when the topic demands it. You will receive extensive web search results covering multiple aspects of the research topic. Your goal is to synthesize this information into a detailed, well-structured report with proper citations.

---

### **Report Structure**

1. **Quick Answer** (300-500 words)
   - Comprehensive yet concise summary of key findings
   - Essential context and background
   - Core conclusions with supporting evidence
   - Key implications and takeaways

2. **Executive Summary** (800-1000 words)
   - Comprehensive synthesis of all findings
   - Integration of key insights from all sections
   - Major trends and patterns identified
   - Critical analysis of the overall topic
   - Important implications and recommendations
   - Future outlook and considerations

3. **Detailed Analysis** (No length limit - be as comprehensive as needed)
   - Analyze the topic based on the specific question asked
   - Create relevant sections that directly address different aspects of the question
   - Each section should include:
     * Thorough explanation of the topic (minimum 500 words per section)
     * Supporting evidence and data from sources
     * Real-world examples and applications
     * Critical analysis and insights
     * Implications and impact
     * Future considerations where relevant

3. **References**
   - Comprehensive source listing
   - All URLs as clickable links
   - Brief source descriptions

### **Writing Guidelines**

1. **Depth and Detail**
   - Provide extensive, thorough explanations for each topic
   - Minimum 500 words per section for proper depth
   - Include multiple perspectives and viewpoints
   - Connect concepts and show relationships
   - Explain complex ideas with clear examples

2. **Citations and Sources**
   - Use [SourceName] format for all citations
   - Multiple source citations for key claims
   - Cross-reference and validate information
   - Highlight consensus and disagreements
   - Integrate insights from various sources

3. **Quality Standards**
   - Academic-level analysis and rigor
   - Evidence-based arguments and conclusions
   - Comprehensive coverage of each aspect
   - Critical evaluation of information
   - Thorough fact-checking and verification

4. **Writing Style**
   - Clear, professional, and engaging tone
   - Logical flow and progression of ideas
   - In-depth technical explanations
   - Accessible yet sophisticated language
   - Strong narrative structure

---

Remember:
- Create sections that directly address the specific question
- Provide extensive, detailed explanations (500+ words per section)
- Support all claims with specific citations
- Include real-world examples and applications
- Focus on depth and thoroughness in every section
- Adapt the structure to best answer the specific question`;

// Function to clean URL from DuckDuckGo redirect
function cleanUrl(url) {
    try {
        if (url.includes('duckduckgo.com/l/?uddg=')) {
            const encoded = url.split('uddg=')[1];
            return decodeURIComponent(encoded);
        }
        return url;
    } catch (error) {
        console.warn('Error cleaning URL:', error);
        return url;
    }
}

// Function to create a short source name
function createSourceName(title, url) {
    try {
        const domain = new URL(url).hostname.replace('www.', '');
        return domain.split('.')[0];
    } catch {
        return title.split(/\s+/).slice(0, 2).join(' ');
    }
}

// Function to perform DuckDuckGo search and fetch page content
async function searchDuckDuckGo(query) {
    try {
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);
        const html = await response.text();
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Extract search results - increased to 10 results for more depth
        const results = await Promise.all(
            Array.from(doc.querySelectorAll('.result')).slice(0, 10).map(async result => {
                const titleEl = result.querySelector('.result__title');
                const snippetEl = result.querySelector('.result__snippet');
                const linkEl = result.querySelector('.result__url');
                
                const rawUrl = linkEl ? linkEl.href : '';
                const url = cleanUrl(rawUrl);
                let pageContent = '';
                
                // Try to fetch the actual page content with increased length
                if (url) {
                    try {
                        const pageResponse = await fetch(url);
                        const pageHtml = await pageResponse.text();
                        const pageDoc = parser.parseFromString(pageHtml, 'text/html');
                        pageContent = pageDoc.body.textContent
                            .replace(/\s+/g, ' ')
                            .trim()
                            .slice(0, 8000); // Significantly increased content length
                    } catch (error) {
                        console.warn(`Could not fetch content for ${url}:`, error);
                        pageContent = snippetEl ? snippetEl.textContent.trim() : '';
                    }
                }

                return {
                    title: titleEl ? titleEl.textContent.trim() : '',
                    snippet: snippetEl ? snippetEl.textContent.trim() : '',
                    url: url,
                    content: pageContent,
                    sourceName: createSourceName(titleEl ? titleEl.textContent.trim() : '', url)
                };
            })
        );

        return {
            results: results,
            abstract: results[0]?.content || results[0]?.snippet || '',
            source: results[0]?.title || '',
            sourceUrl: results[0]?.url || ''
        };
    } catch (error) {
        console.error('Search error:', error);
        return {
            results: [],
            abstract: '',
            source: '',
            sourceUrl: ''
        };
    }
}

const sendMessage = (messages, apiKey, model) => {
    return fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 16000 // Significantly increased for much longer responses
        })
    }).then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
};

document.getElementById('questionForm').addEventListener('submit', async function(event) {
    event.preventDefault();
    
    const apiKey = document.getElementById('apiKey').value;
    const model = document.getElementById('model').value;
    const question = document.getElementById('question').value;
    document.getElementById('report').innerHTML = `<p>Researching: <strong>${question}</strong></p>`;
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('loading').innerHTML = '<div class="loading-animation"></div>';
    document.getElementById('status').innerHTML = 'Searching the web...';

    try {
        // Initial search for main question
        const mainResults = await searchDuckDuckGo(question);
        document.getElementById('status').innerHTML = 'Analyzing initial results...';

        // Get follow-up questions from LLM based on initial results
        const followUpPrompt = `
Based on the following research results about "${question}", generate 10 specific follow-up questions that would help create a comprehensive research report. Focus on unexplored aspects and areas that need deeper investigation.

Research Results:
${mainResults.results.map((r, index) => `
Source ${index + 1} [${r.sourceName}]:
${r.content || r.snippet}
---`).join('\n')}

Generate 10 specific, detailed follow-up questions that would provide valuable additional insights for a comprehensive report. Each question should:
1. Focus on a different aspect of the topic
2. Address gaps in the current research
3. Explore potential future developments
4. Consider practical implications
5. Examine related areas and impacts

Format the response as a simple numbered list, 1-10, one question per line.`;

        const followUpResponse = await sendMessage([
            { role: 'user', content: followUpPrompt }
        ], apiKey, model);

        // Extract questions from response
        const followUpQuestions = followUpResponse.choices[0].message.content
            .split('\n')
            .filter(line => line.trim().match(/^\d+\.\s+/))
            .map(line => line.replace(/^\d+\.\s+/, '').trim());

        document.getElementById('status').innerHTML = 'Gathering additional information...';
        
        // Search for follow-up questions
        const followUpResults = await Promise.all(
            followUpQuestions.map(q => searchDuckDuckGo(q))
        );
        
        // Combine all sources
        const allSources = [
            ...mainResults.results,
            ...followUpResults.flatMap(r => r.results)
        ];

        document.getElementById('status').innerHTML = 'Synthesizing comprehensive report...';
        
        // Format all research data for final synthesis
        const researchData = `
Main Research Question: ${question}

Primary Research Results:
${mainResults.results.map((r, index) => `
Source ${index + 1} [${r.sourceName}]:
URL: ${r.url}
Content:
${r.content || r.snippet}
---`).join('\n')}

Additional Research Results:

${followUpQuestions.map((q, qIndex) => `
Follow-up Question ${qIndex + 1}: ${q}
${followUpResults[qIndex].results.map((r, rIndex) => `
Source FQ${qIndex + 1}-${rIndex + 1} [${r.sourceName}]:
URL: ${r.url}
Content:
${r.content || r.snippet}
---`).join('\n')}
`).join('\n')}

Create a comprehensive research report that includes a quick answer (200-300 words) followed by an extensive detailed analysis. Be as thorough and detailed as the topic requires - there is no maximum length limit. Include extensive analysis, examples, and case studies where relevant.

Use [SourceName] format for citations and include all sources in the References section.
`;

        // Send all research data for final synthesis
        const finalReport = await sendMessage([
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: researchData }
        ], apiKey, model);

        // Process and display the final report
        const processedReport = processResponse(finalReport.choices[0].message.content, allSources);
        document.getElementById('report').innerHTML += `<div class="response">${marked(processedReport)}</div>`;

    } catch (error) {
        console.error('Error:', error);
        document.getElementById('report').innerHTML += `<p class="error">Error: ${error.message}. Please try again.</p>`;
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('status').innerHTML = '';
    }
});

// Function to process response and format references
function processResponse(response, sources) {
    // Create a mapping of source names
    const sourceMap = new Map(sources.map(s => [s.sourceName.toLowerCase(), s]));
    
    // Convert [SourceName] references to hyperlinks
    let processedResponse = response.replace(/\[([^\]]+)\]/g, (match, sourceName) => {
        const source = sourceMap.get(sourceName.toLowerCase());
        if (source) {
            return `<a href="${source.url}" target="_blank">[${source.sourceName}]</a>`;
        }
        return match;
    });

    // Format the References section
    if (processedResponse.includes('References:')) {
        const [content, references] = processedResponse.split('References:');
        const formattedRefs = sources.map((source, index) => 
            `${index + 1}. <a href="${source.url}" target="_blank">${source.title}</a>`
        ).join('\n');
        
        processedResponse = `${content}\nReferences:\n${formattedRefs}`;
    }

    return processedResponse;
}