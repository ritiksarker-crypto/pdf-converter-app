const express = require('express');
const puppeteer = require('puppeteer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Allows large HTML payloads

// Health check endpoint
app.get('/', (req, res) => {
    res.send('✅ PDF Forge API is running! Send a POST request to /api/v1/generatePdf');
});

// The main PDF generation endpoint (for n8n)
app.post('/api/v1/generatePdf', async (req, res) => {
    let browser = null;
    try {
        const { html_content } = req.body;

        if (!html_content) {
            return res.status(400).json({ error: 'html_content is required in the JSON body.' });
        }

        // Launch headless Chrome (optimized for free servers like Render)
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        
        const page = await browser.newPage();
        
        // Load the HTML content
        await page.setContent(html_content, { waitUntil: 'networkidle0' });
        
        // Generate PDF
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '10mm', right: '10mm', bottom: '10mm', left: '10mm' }
        });
        
        await browser.close();
        
        // Better than PDFMunk: We return the actual PDF file directly!
        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="document.pdf"',
            'Content-Length': pdfBuffer.length
        });
        
        res.send(pdfBuffer);
        
    } catch (error) {
        console.error("PDF Generation Error:", error);
        if (browser) await browser.close();
        res.status(500).json({ error: 'Failed to generate PDF on the server.' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
