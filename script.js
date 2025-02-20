// Local storage keys
const STORAGE_KEYS = {
    API_KEY: 'researcher_api_key',
    REPORTS: 'researcher_reports'
};

// Model pricing per 1M tokens
const MODEL_PRICING = {
    'gpt-4o': {
        input: 2.5,      // $2.50 per 1M input tokens
        cachedInput: 1.25, // $1.25 per 1M cached input tokens
        output: 10       // $10.00 per 1M output tokens
    },
    'gpt-4o-mini': {
        input: 0.15,     // $0.15 per 1M input tokens
        cachedInput: 0.075, // $0.075 per 1M cached input tokens
        output: 0.6      // $0.60 per 1M output tokens
    },
    'o1': {
        input: 15,       // $15.00 per 1M input tokens
        cachedInput: 7.5,  // $7.50 per 1M cached input tokens
        output: 60       // $60.00 per 1M output tokens
    },
    'o3-mini': {
        input: 1.1,      // $1.10 per 1M input tokens
        cachedInput: 0.55, // $0.55 per 1M cached input tokens
        output: 4.4      // $4.40 per 1M output tokens
    }
};

// Configuration settings
const CONFIG = {
    followUpQuestions: 10,  // Number of follow-up questions to generate
    searchResults: 10,      // Number of DuckDuckGo results to fetch
    maxContentLength: 8000, // Maximum length of content to fetch per article (in characters)
    depthCycle: 1,         // Number of research cycles to perform (1-3)
};

// Function to toggle API key clear button visibility
function updateClearKeyButton() {
    const clearBtn = document.getElementById('clearApiKey');
    const apiKeyInput = document.getElementById('apiKey');
    clearBtn.style.display = apiKeyInput.value || localStorage.getItem(STORAGE_KEYS.API_KEY) ? 'inline-block' : 'none';
}

// Function to save report to history
function saveReport(question, report) {
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
    const newReport = {
        id: Date.now(),
        question,
        report: report.content,
        timestamp: new Date().toISOString(),
        cost: report.cost,
        model: report.model
    };
    reports.unshift(newReport); // Add to beginning of array
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports));
    loadReportHistory(); // Refresh the history list
}

// Function to load and display report history
function loadReportHistory() {
    const historyList = document.getElementById('historyList');
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');

    historyList.innerHTML = reports.map(report => `
        <div class="history-item" data-id="${report.id}">
            <div class="history-content" onclick="loadHistoryReport(${report.id})">
                <h3>${report.question}</h3>
                <p>
                    ${new Date(report.timestamp).toLocaleString()}
                    <span class="cost-info">
                        <br>Model: ${report.model} | Cost: ${formatCost(report.cost)}
                    </span>
                </p>
            </div>
            <button class="delete-btn" onclick="deleteReport(${report.id})">×</button>
        </div>
    `).join('');
}

// Function to delete a report from history
function deleteReport(id) {
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
    const newReports = reports.filter(r => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(newReports));
    loadReportHistory();
}

// Function to load a report from history
function loadHistoryReport(id) {
    const reports = JSON.parse(localStorage.getItem(STORAGE_KEYS.REPORTS) || '[]');
    const report = reports.find(r => r.id === id);
    if (report) {
        document.getElementById('report').innerHTML = `
            <p>Researching: <strong>${report.question}</strong></p>
            <p class="cost-info">Model: ${report.model} | Total Cost: ${formatCost(report.cost)}</p>
            <div class="report-actions">
                <button class="action-btn" onclick="copyReport()">Copy Report</button>
                <button class="action-btn" onclick="downloadReport('${report.question}')">Download</button>
            </div>
            <div class="response">${marked(report.report)}</div>
        `;
        document.getElementById('question').value = report.question;
    }
}

// Function to copy report to clipboard
function copyReport() {
    const reportText = document.querySelector('.response').textContent;
    navigator.clipboard.writeText(reportText).then(() => {
        alert('Report copied to clipboard!');
    }).catch(err => {
        console.error('Failed to copy report:', err);
        alert('Failed to copy report to clipboard');
    });
}

// Function to download report as file
function downloadReport(question) {
    const reportText = document.querySelector('.response').textContent;
    const filename = question.toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') + '-report.txt';

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);

    // Add click handlers to history items
    document.querySelectorAll('.history-item').forEach(item => {
        item.addEventListener('click', () => {
            const reportId = parseInt(item.dataset.id);
            const report = reports.find(r => r.id === reportId);
            if (report) {
                document.getElementById('report').innerHTML = `
                    <p>Researching: <strong>${report.question}</strong></p>
                    <div class="response">${marked(report.report)}</div>
                `;
                document.getElementById('question').value = report.question;
            }
        });
    });
}

// Initialize UI
document.addEventListener('DOMContentLoaded', () => {
    // Initialize sidebar
    const sidebar = document.querySelector('.sidebar');
    const toggleBtn = document.getElementById('toggleSidebar');
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    // Load saved API key and set config section state
    const savedApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
    const configSection = document.getElementById('configSection');
    
    if (savedApiKey) {
        document.getElementById('apiKey').value = savedApiKey;
        configSection.removeAttribute('open');
    } else {
        configSection.setAttribute('open', '');
    }
    updateClearKeyButton();

    // Load saved reports
    loadReportHistory();

    // Set initial values
    document.getElementById('followUpQuestions').value = CONFIG.followUpQuestions;
    document.getElementById('searchResults').value = CONFIG.searchResults;
    document.getElementById('maxContentLength').value = CONFIG.maxContentLength;
    document.getElementById('depthCycle').value = CONFIG.depthCycle;

    // Add change event listeners for real-time validation
    ['followUpQuestions', 'searchResults', 'maxContentLength', 'depthCycle'].forEach(id => {
        document.getElementById(id).addEventListener('change', updateConfigFromUI);
    });
});

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

3. **Key Questions and Analysis** (Minimum 500 words per question)
   - List of generated research questions
   - For each question:
     * In-depth exploration and analysis
     * Supporting evidence from multiple sources
     * Critical evaluation of findings
     * Real-world implications and examples
     * Connection to the main research topic
     * Future considerations and open questions

4. **Detailed Analysis** (No length limit - be as comprehensive as needed)
   - Analyze the topic based on the specific question asked
   - Create relevant sections that directly address different aspects of the question
   - Each section should include:
     * Thorough explanation of the topic (minimum 500 words per section)
     * Supporting evidence and data from sources
     * Real-world examples and applications
     * Critical analysis and insights
     * Implications and impact
     * Future considerations where relevant

5. **References**
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

        // Extract search results based on configuration
        const results = await Promise.all(
            Array.from(doc.querySelectorAll('.result')).slice(0, CONFIG.searchResults).map(async result => {
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
                            .slice(0, CONFIG.maxContentLength); // Use configured content length limit
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

// Function to perform a single research cycle
async function performResearchCycle(question, apiKey, model, cycleNumber, previousReport = '') {
    document.getElementById('status').innerHTML = `Cycle ${cycleNumber}/${CONFIG.depthCycle}: Searching the web...`;

    const mainResults = await searchDuckDuckGo(question);
    document.getElementById('status').innerHTML = `Cycle ${cycleNumber}/${CONFIG.depthCycle}: Analyzing results...`;

    // Modify the follow-up prompt based on cycle number
    let followUpPrompt;
    if (cycleNumber === 1) {
        followUpPrompt = `
Based on the following research results about "${question}", generate ${CONFIG.followUpQuestions} specific follow-up questions that would help create a comprehensive research report. Focus on unexplored aspects and areas that need deeper investigation.

Research Results:
${mainResults.results.map((r, index) => `
Source ${index + 1} [${r.sourceName}]:
${r.content || r.snippet}
---`).join('\n')}`;
    } else {
        followUpPrompt = `
Based on the previous research report and results about "${question}", generate ${CONFIG.followUpQuestions} deeper, more specific follow-up questions for cycle ${cycleNumber}. Focus on:
1. Areas that need more detailed investigation
2. Complex aspects that weren't fully explored
3. Advanced concepts that deserve deeper analysis
4. Emerging trends and future implications
5. Interconnections between different aspects

Previous Report:
${previousReport}

Additional Research Results:
${mainResults.results.map((r, index) => `
Source ${index + 1} [${r.sourceName}]:
${r.content || r.snippet}
---`).join('\n')}`;
    }

    followUpPrompt += `
Generate ${CONFIG.followUpQuestions} specific, detailed follow-up questions that would provide valuable additional insights for a comprehensive report. Each question should:
1. Focus on a different aspect of the topic
2. Address gaps in the current research
3. Explore potential future developments
4. Consider practical implications
5. Examine related areas and impacts

Format the response as a simple numbered list, 1-${CONFIG.followUpQuestions}, one question per line.`;

    const followUpResponse = await sendMessage([
        { role: 'user', content: followUpPrompt }
    ], apiKey, model);

    // Extract questions from response
    const followUpQuestions = followUpResponse.choices[0].message.content
        .split('\n')
        .filter(line => line.trim().match(/^\d+\.\s+/))
        .map(line => line.replace(/^\d+\.\s+/, '').trim());

    document.getElementById('status').innerHTML = `Cycle ${cycleNumber}/${CONFIG.depthCycle}: Gathering additional information...`;

    // Search for follow-up questions
    const followUpResults = await Promise.all(
        followUpQuestions.map(q => searchDuckDuckGo(q))
    );

    // Combine all sources
    const allSources = [
        ...mainResults.results,
        ...followUpResults.flatMap(r => r.results)
    ];

    document.getElementById('status').innerHTML = `Cycle ${cycleNumber}/${CONFIG.depthCycle}: Synthesizing report...`;

    // Format research data for synthesis
    const researchData = `
Main Research Question: ${question}
${cycleNumber > 1 ? '\nPrevious Research Cycle Results:\n' + previousReport + '\n' : ''}

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

Create a comprehensive research report following this structure:

1. Quick Answer (300-500 words): Provide a concise but comprehensive summary of the main findings.

2. Executive Summary (800-1000 words): Synthesize all findings, including insights from both main research and follow-up questions.

3. Key Questions and Analysis:
Here are the follow-up questions that were explored:
${followUpQuestions.map((q, i) => `\n${i + 1}. ${q}`).join('')}

For each question above, provide:
- Minimum 500 words of in-depth analysis
- Integration of findings from multiple sources
- Critical evaluation of the evidence
- Real-world implications and examples
- Connection to the main research question
- Future considerations and open areas for research

4. Detailed Analysis: Provide comprehensive analysis of all aspects of the main research question, incorporating insights from both primary and follow-up research  (1500-10000 words).

Use [SourceName] format for citations and include all sources in the References section. Be as thorough and detailed as the topic requires - there is no maximum length limit. Include extensive analysis, examples, and case studies where relevant.
`;

    // Send all research data for final synthesis
    const finalReport = await sendMessage([
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: researchData }
    ], apiKey, model);

    // Calculate total cost for this cycle
    const totalCost = (
        parseFloat(followUpResponse.usage.cost) +
        parseFloat(finalReport.usage.cost)
    ).toFixed(4);

    return {
        report: finalReport.choices[0].message.content,
        sources: allSources,
        cost: totalCost,
        model: model
    };
}

const sendMessage = async (messages, apiKey, model) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    const cost = calculateCost(
        result.usage.prompt_tokens,
        result.usage.completion_tokens,
        model
    );

    return {
        ...result,
        usage: {
            ...result.usage,
            cost: cost
        }
    };
};

// Function to update CONFIG from UI inputs
function updateConfigFromUI() {
    const followUpQuestions = Math.min(Math.max(1, parseInt(document.getElementById('followUpQuestions').value) || 10), 20);
    const searchResults = Math.min(Math.max(1, parseInt(document.getElementById('searchResults').value) || 10), 20);
    const maxContentLength = Math.min(Math.max(1000, parseInt(document.getElementById('maxContentLength').value) || 8000), 16000);
    const depthCycle = Math.min(Math.max(1, parseInt(document.getElementById('depthCycle').value) || 1), 3);

    // Update CONFIG with validated values
    CONFIG.followUpQuestions = followUpQuestions;
    CONFIG.searchResults = searchResults;
    CONFIG.maxContentLength = maxContentLength;
    CONFIG.depthCycle = depthCycle;

    // Update UI with validated values
    document.getElementById('followUpQuestions').value = followUpQuestions;
    document.getElementById('searchResults').value = searchResults;
    document.getElementById('maxContentLength').value = maxContentLength;
    document.getElementById('depthCycle').value = depthCycle;
}

// Add event listeners for API key management
document.getElementById('apiKey').addEventListener('input', function (event) {
    const apiKey = event.target.value.trim();
    if (apiKey) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
    }
    updateClearKeyButton();
});

document.getElementById('clearApiKey').addEventListener('click', function (event) {
    event.preventDefault();
    localStorage.removeItem(STORAGE_KEYS.API_KEY);
    document.getElementById('apiKey').value = '';
    updateClearKeyButton();
});

document.getElementById('questionForm').addEventListener('submit', async function (event) {
    event.preventDefault();

    const apiKeyInput = document.getElementById('apiKey');
    const model = document.getElementById('model').value;
    const question = document.getElementById('question').value;

    // Update configuration from UI
    updateConfigFromUI();

    // Get API key from input or localStorage
    const apiKey = apiKeyInput.value || localStorage.getItem(STORAGE_KEYS.API_KEY);
    if (!apiKey) {
        document.getElementById('report').innerHTML = `<p class="error">Please enter an API key.</p>`;
        return;
    }

    // Save API key if new
    if (apiKeyInput.value) {
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey);
        updateClearKeyButton();
    }
    document.getElementById('report').innerHTML = `<p>Researching: <strong>${question}</strong></p>`;

    document.getElementById('loading').style.display = 'block';
    document.getElementById('loading').innerHTML = '<div class="loading-animation"></div>';

    try {
        let currentReport = '';
        let allSources = [];
        let totalCost = 0;

        // Perform multiple research cycles if configured
        for (let cycle = 1; cycle <= CONFIG.depthCycle; cycle++) {
            const result = await performResearchCycle(question, apiKey, model, cycle, currentReport);
            currentReport = result.report;
            allSources = [...new Set([...allSources, ...result.sources])];
            totalCost = (parseFloat(totalCost) + parseFloat(result.cost)).toFixed(4);

            // Process and display the report after each cycle
            const processedReport = processResponse(currentReport, allSources);
            const reportHtml = `
                <p>Researching: <strong>${question}</strong></p>
                <p>Completed Cycle ${cycle}/${CONFIG.depthCycle}</p>
                <p class="cost-info">Model: ${model} | Current Cycle Cost: ${formatCost(result.cost)} | Total Cost: ${formatCost(totalCost)}</p>
                <div class="report-actions">
                    <button class="action-btn" onclick="copyReport()">Copy Report</button>
                    <button class="action-btn" onclick="downloadReport('${question}')">Download</button>
                </div>
                <div class="response">${marked(processedReport)}</div>
            `;
            document.getElementById('report').innerHTML = reportHtml;
        }

        // Save the final report to history with total cost
        saveReport(question, {
            content: currentReport,
            cost: totalCost,
            model: model
        });
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('report').innerHTML += `<p class="error">Error: ${error.message}. Please try again.</p>`;
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('status').innerHTML = '';
    }
});

// Function to calculate cost based on token counts and model
function calculateCost(inputTokens, outputTokens, model) {
    const pricing = MODEL_PRICING[model];
    if (!pricing) return 0;

    // Convert token counts to millions
    const inputMillions = inputTokens / 1000000;
    const outputMillions = outputTokens / 1000000;

    const inputCost = inputMillions * pricing.input;
    const outputCost = outputMillions * pricing.output;

    return (inputCost + outputCost).toFixed(4);
}

// Function to format cost display
function formatCost(cost) {
    return `$${parseFloat(cost).toFixed(4)}`;
}

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