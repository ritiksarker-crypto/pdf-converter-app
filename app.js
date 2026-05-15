document.addEventListener('DOMContentLoaded', () => {
    // === DOM Elements ===
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabContents = document.querySelectorAll('.tab-content');
    const htmlEditor = document.getElementById('html-editor');
    const lineNumbers = document.getElementById('line-numbers');
    const previewContent = document.getElementById('preview-content');
    const chatPreviewContent = document.getElementById('chat-preview-content');
    const btnDownload = document.getElementById('btn-download');
    const pageSizeSelect = document.getElementById('page-size');
    const orientationSelect = document.getElementById('orientation');
    
    // Editor Actions
    const btnPaste = document.getElementById('btn-paste');
    const btnClear = document.getElementById('btn-clear');
    const btnFormat = document.getElementById('btn-format');
    
    // Chat Elements
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSend = document.getElementById('btn-send');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');
    const btnUseInEditor = document.getElementById('btn-use-in-editor');
    
    // Resizable Panel
    const panelDivider = document.getElementById('panel-divider');
    const editorPanel = document.querySelector('.editor-panel');
    
    // Overlays
    const toastContainer = document.getElementById('toast-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    // === State ===
    let currentTab = 'editor';
    let isDragging = false;
    let chatHistory = [
        {
            role: "system",
            content: "You are an expert HTML and inline CSS developer. Your task is to generate complete, beautiful, professional HTML templates for documents (invoices, resumes, reports, etc.) based on user requests. IMPORTANT RULES: 1) Respond ONLY with the raw HTML code. Do NOT wrap it in markdown code blocks like ```html. 2) Do NOT include any explanations or conversational text. 3) Use inline CSS or a <style> block in the <head>. 4) Use modern, clean design (like Tailwind-style utility classes or nice vanilla CSS). 5) Ensure the design fits well on A4/Letter size paper when converted to PDF."
        }
    ];
    let latestGeneratedHtml = "";

    // === Initialization ===
    updateLineNumbers();
    updatePreview(htmlEditor.value);

    // === Navigation ===
    navTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.getAttribute('data-tab');
            currentTab = target;
            
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${target}`) {
                    content.classList.add('active');
                }
            });

            // Handle Download button visibility/state
            if (target === 'api') {
                btnDownload.style.opacity = '0.5';
                btnDownload.style.pointerEvents = 'none';
            } else {
                btnDownload.style.opacity = '1';
                btnDownload.style.pointerEvents = 'auto';
            }
        });
    });

    // === Editor Logic ===
    htmlEditor.addEventListener('input', () => {
        updateLineNumbers();
        updatePreview(htmlEditor.value);
    });

    htmlEditor.addEventListener('scroll', () => {
        lineNumbers.scrollTop = htmlEditor.scrollTop;
    });

    // Handle Tab key in editor
    htmlEditor.addEventListener('keydown', (e) => {
        if (e.key === 'Tab') {
            e.preventDefault();
            const start = htmlEditor.selectionStart;
            const end = htmlEditor.selectionEnd;
            htmlEditor.value = htmlEditor.value.substring(0, start) + "  " + htmlEditor.value.substring(end);
            htmlEditor.selectionStart = htmlEditor.selectionEnd = start + 2;
            updateLineNumbers();
            updatePreview(htmlEditor.value);
        }
    });

    function updateLineNumbers() {
        const lines = htmlEditor.value.split('\n').length;
        lineNumbers.innerHTML = Array(lines).fill(0).map((_, i) => i + 1).join('<br>');
    }

    function updatePreview(html) {
        if (!html.trim()) {
            previewContent.innerHTML = `
                <div class="preview-placeholder">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none"><rect x="8" y="6" width="32" height="36" rx="4" stroke="currentColor" stroke-width="2" opacity="0.3"/><path d="M16 18h16M16 24h12M16 30h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.3"/></svg>
                    <p>Your PDF preview will appear here</p>
                    <span>Paste HTML in the editor or use Chat</span>
                </div>
            `;
            return;
        }
        
        // Basic sanitization/wrapper if needed, but direct injection is fine for this local tool
        previewContent.innerHTML = html;
    }

    // Editor Toolbar Actions
    btnPaste.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            htmlEditor.value = text;
            updateLineNumbers();
            updatePreview(text);
            showToast('Pasted from clipboard', 'success');
        } catch (err) {
            showToast('Failed to read clipboard', 'error');
        }
    });

    btnClear.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear the editor?')) {
            htmlEditor.value = '';
            updateLineNumbers();
            updatePreview('');
        }
    });

    btnFormat.addEventListener('click', () => {
        // Very basic formatting logic for demonstration
        let html = htmlEditor.value;
        // Basic indentation
        let formatted = '';
        let indent = 0;
        html.split(/>\s*</).forEach(function(element) {
            if (element.match(/^\/\w/)) {
                indent -= 1;
            }
            formatted += '\n' + '  '.repeat(Math.max(0, indent)) + '<' + element + '>';
            if (element.match(/^<?\w[^>]*[^\/]$/) && !element.startsWith("input") && !element.startsWith("img") && !element.startsWith("br") && !element.startsWith("meta") && !element.startsWith("link")) {
                indent += 1;
            }
        });
        htmlEditor.value = formatted.substring(1, formatted.length - 1);
        updateLineNumbers();
        showToast('HTML formatted (basic)', 'success');
    });

    // === Resizable Panel ===
    panelDivider.addEventListener('mousedown', (e) => {
        isDragging = true;
        panelDivider.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const containerWidth = document.querySelector('.editor-layout').offsetWidth;
        const newWidth = (e.clientX / containerWidth) * 100;
        
        if (newWidth > 20 && newWidth < 80) {
            editorPanel.style.flex = \`0 0 \${newWidth}%\`;
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            panelDivider.classList.remove('dragging');
            document.body.style.cursor = '';
        }
    });

    // === Chat Logic ===
    
    // Replace this with a free proxy or instruct user to set key if deploying
    // For this demo, we use a mock AI response if no key is provided, or you can plug in Gemini Free Tier
    const GEMINI_API_KEY = ""; // Optional: User can add their own free Gemini key here
    const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

    function appendMessage(role, content) {
        // Remove welcome screen if present
        const welcome = document.querySelector('.chat-welcome');
        if (welcome) welcome.remove();

        const msgDiv = document.createElement('div');
        msgDiv.className = \`chat-msg \${role}\`;
        
        const avatar = document.createElement('div');
        avatar.className = 'chat-msg-avatar';
        avatar.textContent = role === 'user' ? 'U' : 'AI';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'chat-msg-content';
        
        if (role === 'user') {
            contentDiv.textContent = content;
        } else {
            // For AI, we might just show a summary or the code snippet
            contentDiv.innerHTML = '<p>Generated template below. Checking preview...</p>';
        }

        msgDiv.appendChild(avatar);
        msgDiv.appendChild(contentDiv);
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'chat-msg bot typing-msg';
        msgDiv.innerHTML = \`
            <div class="chat-msg-avatar">AI</div>
            <div class="chat-msg-content">
                <div class="typing-indicator">
                    <span></span><span></span><span></span>
                </div>
            </div>
        \`;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingMsg = document.querySelector('.typing-msg');
        if (typingMsg) typingMsg.remove();
    }

    async function handleChatSubmission(prompt) {
        if (!prompt.trim()) return;
        
        chatInput.value = '';
        appendMessage('user', prompt);
        showTypingIndicator();

        try {
            let generatedHtml = "";

            if (GEMINI_API_KEY) {
                // Call Gemini API
                const response = await fetch(\`\${GEMINI_URL}?key=\${GEMINI_API_KEY}\`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{
                            parts: [{
                                text: \`You are an expert HTML/CSS developer. Generate a complete HTML document for: \${prompt}. IMPORTANT: Return ONLY the raw HTML code. Do NOT wrap in markdown like \`\`\`html. Use inline CSS or <style>. Make it look beautiful.\`
                            }]
                        }]
                    })
                });

                const data = await response.json();
                if (data.candidates && data.candidates.length > 0) {
                    generatedHtml = data.candidates[0].content.parts[0].text;
                    // Clean up potential markdown wrappers just in case
                    generatedHtml = generatedHtml.replace(/^\`\`\`html\\n?/, '').replace(/\\n?\`\`\`$/, '');
                } else {
                    throw new Error("Invalid response from AI");
                }
            } else {
                // Fallback / Mock Response if no API key
                await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
                generatedHtml = generateMockHtml(prompt);
            }

            removeTypingIndicator();
            appendMessage('bot', "Template generated successfully.");
            
            latestGeneratedHtml = generatedHtml;
            
            // Update Chat Preview
            if (generatedHtml) {
                chatPreviewContent.innerHTML = generatedHtml;
            }

        } catch (error) {
            console.error("Chat Error:", error);
            removeTypingIndicator();
            appendMessage('bot', "Sorry, I encountered an error generating the template. Please try again.");
            showToast('Failed to generate template', 'error');
        }
    }

    // Handle Send Button
    btnSend.addEventListener('click', () => handleChatSubmission(chatInput.value));
    
    // Handle Enter Key (Shift+Enter for newline)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleChatSubmission(chatInput.value);
        }
    });

    // Handle Suggestion Chips
    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            handleChatSubmission(chip.getAttribute('data-prompt'));
        });
    });

    // Use Generated HTML in Editor
    btnUseInEditor.addEventListener('click', () => {
        if (!latestGeneratedHtml) {
            showToast('No template generated yet', 'error');
            return;
        }
        
        // Switch to editor tab
        document.getElementById('nav-editor').click();
        
        // Update editor content
        htmlEditor.value = latestGeneratedHtml;
        updateLineNumbers();
        updatePreview(latestGeneratedHtml);
        
        showToast('Template loaded in editor', 'success');
    });

    // === PDF Generation Logic ===
    btnDownload.addEventListener('click', async () => {
        const sourceHtml = currentTab === 'editor' ? htmlEditor.value : latestGeneratedHtml;
        
        if (!sourceHtml || !sourceHtml.trim()) {
            showToast('Nothing to convert. Please add HTML first.', 'error');
            return;
        }

        loadingOverlay.classList.add('active');

        try {
            // Create a temporary container off-screen
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = sourceHtml;
            
            // Apply some base styles to ensure background colors print
            tempContainer.style.background = '#ffffff';
            tempContainer.style.color = '#000000';
            tempContainer.style.width = '210mm'; // A4 width
            
            document.body.appendChild(tempContainer);

            // Hide temp container visually but keep it in flow for html2canvas
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px';
            tempContainer.style.top = '0';

            const opt = {
                margin:       10, // mm
                filename:     'document.pdf',
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2, useCORS: true, logging: false },
                jsPDF:        { 
                    unit: 'mm', 
                    format: pageSizeSelect.value || 'a4', 
                    orientation: orientationSelect.value || 'portrait' 
                }
            };

            // Allow elements to render properly
            await new Promise(r => setTimeout(r, 500));

            await html2pdf().set(opt).from(tempContainer).save();
            
            document.body.removeChild(tempContainer);
            showToast('PDF downloaded successfully', 'success');

        } catch (error) {
            console.error('PDF Generation Error:', error);
            showToast('Error generating PDF', 'error');
        } finally {
            loadingOverlay.classList.remove('active');
        }
    });

    // === API Copy Logic ===
    const copyButtons = document.querySelectorAll('.btn-copy');
    copyButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.getAttribute('data-target');
            const codeBlock = document.getElementById(targetId);
            
            try {
                await navigator.clipboard.writeText(codeBlock.innerText);
                const originalText = btn.innerHTML;
                btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 3.5l-6 6-2.5-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Copied!';
                setTimeout(() => {
                    btn.innerHTML = originalText;
                }, 2000);
            } catch (err) {
                showToast('Failed to copy text', 'error');
            }
        });
    });

    // === Helpers ===
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = \`toast \${type}\`;
        
        const icon = type === 'success' 
            ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M13 4l-7 7-3-3" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8m0-8l-8 8" stroke="#ef4444" stroke-width="2" stroke-linecap="round"/></svg>';
            
        toast.innerHTML = \`\${icon} <span>\${message}</span>\`;
        
        toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    // Mock HTML Generator for Demo purposes
    function generateMockHtml(prompt) {
        const title = prompt.split(' ')[0] || 'Document';
        return \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #333; }
        .header { border-bottom: 2px solid #8b5cf6; padding-bottom: 20px; margin-bottom: 30px; }
        h1 { color: #1a1a25; margin: 0; }
        .content { line-height: 1.6; }
        .box { background: #f3f4f6; padding: 20px; border-radius: 8px; margin-top: 20px; }
        .footer { margin-top: 50px; font-size: 12px; color: #666; text-align: center; }
    </style>
</head>
<body>
    <div class="header">
        <h1>\${title.toUpperCase()}</h1>
        <p>Generated based on: "\${prompt}"</p>
    </div>
    <div class="content">
        <p>This is a generated template. In a production environment, you would connect the GEMINI_API_KEY in app.js to get real AI-generated HTML structures based on the exact prompt.</p>
        
        <div class="box">
            <h3>Sample Data Block</h3>
            <ul>
                <li>Item 1: <strong>$100.00</strong></li>
                <li>Item 2: <strong>$250.00</strong></li>
                <li>Total: <strong>$350.00</strong></li>
            </ul>
        </div>
    </div>
    <div class="footer">
        Generated by PDF Forge Free Edition
    </div>
</body>
</html>\`;
    }
});
