require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const rateLimit = require('express-rate-limit');

// Dynamic import for p-queue (ESM module)
let PQueue;
let roastQueue;

async function initQueue() {
    const pQueueModule = await import('p-queue');
    PQueue = pQueueModule.default;
    // Limit concurrent Gemini API calls to prevent quota exhaustion
    roastQueue = new PQueue({ concurrency: 3 });
    console.log('Queue initialized with concurrency limit of 3');
}

const app = express();
const port = process.env.PORT || 3000;

// Trust proxy for Render/Heroku/etc (needed for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// --- API Key Check ---
if (!process.env.GOOGLE_API_KEY) {
    console.error("FATAL ERROR: GOOGLE_API_KEY is not defined in your .env file.");
    console.error("Please ensure you have a .env file in the root directory with the following content:");
    console.error("GOOGLE_API_KEY=YOUR_API_KEY");
    process.exit(1);
}

// --- Database Configuration ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL_MODE === 'require' ? { rejectUnauthorized: false } : false
});

// --- Database Functions ---
async function initDB() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS emails (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log("Database initialized successfully");
    } catch (error) {
        console.error("Error initializing database:", error);
    }
}

async function saveEmail(email) {
    try {
        const existingEmail = await pool.query("SELECT email FROM emails WHERE email = $1", [email]);
        
        if (existingEmail.rows.length > 0) {
            console.log(`Email ${email} already exists in database`);
            return { success: true, message: "Email already registered" };
        }
        
        await pool.query(
            "INSERT INTO emails (email, created_at) VALUES ($1, $2)",
            [email, new Date()]
        );
        
        console.log(`Email ${email} saved successfully to database`);
        return { success: true, message: "Email saved successfully" };
    } catch (error) {
        console.error("Error saving email to database:", error);
        return { success: false, message: "Database error" };
    }
}

// Initialize database on startup
initDB();

// --- Rate Limiting ---
const roastLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute window
    max: 5, // 5 requests per minute per IP
    message: { 
        error: 'Too many requests', 
        details: 'Please wait a minute before roasting another resume. We limit requests to ensure quality service for everyone.',
        retryAfter: 60
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const emailLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    message: { success: false, message: 'Too many requests. Please try again later.' }
});

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Request timeout middleware
app.use((req, res, next) => {
    res.setTimeout(90000, () => { // 90 second timeout
        res.status(408).json({ 
            error: 'Request timeout', 
            details: 'The request took too long. Please try again with a smaller file.' 
        });
    });
    next();
});

// --- Multer Setup ---
const uploadDir = path.join(__dirname, '../static/uploads/');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir)
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
});

// File filter - PDF only
const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only PDF files are supported. Please convert your document to PDF and try again.'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// --- Initialize Google Generative AI ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- HTML Page Routes ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'index.html'));
});

app.get('/about.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'about.html'));
});

app.get('/contact.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'contact.html'));
});

app.get('/privacy.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'privacy.html'));
});

app.get('/terms.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'terms.html'));
});

app.get('/roast-result.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'pages', 'roast-result.html'));
});

// --- Email Capture API ---
app.post('/api/capture-email', emailLimiter, async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        
        const result = await saveEmail(email);
        return res.json(result);
        
    } catch (error) {
        console.error("Error in capture-email route:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- Helper Functions ---
function fileToGenerativePart(filePath, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(filePath)).toString("base64"),
            mimeType
        },
    };
}

function cleanupFile(filePath) {
    try {
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    } catch (err) {
        console.error('Error cleaning up file:', err);
    }
}

// Classify error type for user-friendly messages
function getErrorResponse(error) {
    const message = error.message || '';
    
    if (message.includes('429') || message.includes('quota') || message.includes('rate')) {
        return {
            status: 503,
            error: 'Service temporarily busy',
            details: 'Our AI is experiencing high demand. Please try again in a few minutes.',
            retryAfter: 60
        };
    }
    
    if (message.includes('timeout') || message.includes('DEADLINE_EXCEEDED')) {
        return {
            status: 408,
            error: 'Request timeout',
            details: 'The analysis took too long. Try uploading a simpler PDF or try again later.'
        };
    }
    
    if (message.includes('SAFETY') || message.includes('blocked')) {
        return {
            status: 400,
            error: 'Content issue',
            details: 'We couldn\'t process this resume. Please ensure it contains appropriate professional content.'
        };
    }
    
    if (message.includes('invalid') || message.includes('parse')) {
        return {
            status: 400,
            error: 'Invalid file',
            details: 'We couldn\'t read this PDF. Please ensure it\'s a valid, non-corrupted PDF file.'
        };
    }
    
    // Default error
    return {
        status: 500,
        error: 'Analysis failed',
        details: 'Something went wrong during the roast. Please try again.'
    };
}

// --- The Roast Prompt ---
const ROAST_PROMPT = `You are a SAVAGE resume reviewer with ZERO filter. Absolutely DESTROY this resume with vicious humor and brutal honesty. Be hilariously mean, sarcastic, and ruthless. Think of the meanest roast comedian mixed with a harsh hiring manager. Be EDGY and don't hold back. NO EMOJIS EVER.

IMPORTANT: Return your response as valid JSON with this exact structure:
{
    "overallScore": <number 1-10>,
    "contentScore": <number 1-10>,
    "formatScore": <number 1-10>,
    "atsScore": <number 1-10>,
    "html": "<your HTML content here>"
}

SCORING GUIDELINES:
- Overall scores should typically range from 2-5 out of 10
- Content Quality: Usually 2-4, with 5 for exceptional content, 1 only for completely empty/nonsensical content
- Format & Design: Usually 2-4, with 5 for great formatting, 1 only for completely broken formatting
- ATS Compatibility: Usually 3-5, with 2 for poor ATS optimization, 1 only for resumes with major ATS-breaking issues
- Most resumes should get 2-3 overall, with better ones getting 4, and rare exceptional ones getting 5

The "html" field MUST contain raw HTML (no markdown, no code blocks) with this EXACT structure and CSS classes:

<div class="analysis-overview">
    <h2 class="section-title">Resume Roast Results</h2>
    <div class="score-container">
        <div class="overall-score">Overall Score: <span class="score-value">X/10</span></div>
        <div class="score-breakdown">
            <div class="score-item">Content Quality: <span>X/10</span></div>
            <div class="score-item">Format & Design: <span>X/10</span></div>
            <div class="score-item">ATS Compatibility: <span>X/10</span></div>
        </div>
    </div>
</div>

<div class="analysis-section">
    <h2 class="section-title">The Roast Breakdown</h2>
    
    <div class="roast-tabs-container">
        <div class="roast-tabs">
            <button class="roast-tab active" data-section="summary">Objective/Summary</button>
            <button class="roast-tab" data-section="experience">Work Experience</button>
            <button class="roast-tab" data-section="skills">Skills</button>
            <button class="roast-tab" data-section="education">Education & Format</button>
        </div>
        
        <div class="roast-content-container">
            <div class="roast-section-content active" id="summary-content">
                <h3 class="section-header">Objective/Summary Destruction</h3>
                <ul class="roast-list">
                    <li>First savage bullet point</li>
                    <li>Second brutal roast</li>
                    <li>Third creative insult</li>
                </ul>
            </div>
            
            <div class="roast-section-content" id="experience-content">
                <h3 class="section-header">Work Experience Obliteration</h3>
                <ul class="roast-list">
                    <li>Brutal roast about job descriptions</li>
                    <li>Savage mockery of accomplishments</li>
                    <li>Creative destruction of timeline gaps</li>
                </ul>
            </div>
            
            <div class="roast-section-content" id="skills-content">
                <h3 class="section-header">Skills Section Mockery</h3>
                <ul class="roast-list">
                    <li>Vicious roasting of technical skills</li>
                    <li>Brutal mockery of expert claims</li>
                    <li>Savage destruction of soft skills</li>
                </ul>
            </div>
            
            <div class="roast-section-content" id="education-content">
                <h3 class="section-header">Education & Format Catastrophe</h3>
                <ul class="roast-list">
                    <li>Savage roasting of education</li>
                    <li>Brutal criticism of formatting</li>
                    <li>Creative insults about design</li>
                </ul>
            </div>
        </div>
    </div>
</div>

<div class="analysis-section">
    <h3 class="section-header section-header-positive">What Didn't Make Me Vomit (Barely)</h3>
    <ul class="analysis-list">
        <li>Grudgingly admit 1-2 things that aren't terrible</li>
        <li>Use backhanded compliments</li>
    </ul>
</div>

<div class="analysis-section">
    <h3 class="section-header section-header-improvements">How to Fix This Train Wreck</h3>
    <div class="action-items">
        <div class="action-item">
            <div class="action-title">1. [Brutal but actionable advice]</div>
            <div class="action-description">Savage explanation with humor</div>
        </div>
        <div class="action-item">
            <div class="action-title">2. [Another fix]</div>
            <div class="action-description">More savage advice</div>
        </div>
        <div class="action-item">
            <div class="action-title">3. [Third improvement]</div>
            <div class="action-description">Even more brutal suggestions</div>
        </div>
    </div>
</div>

CONTENT STYLE:
- SAVAGE, MEAN, and HILARIOUS roasting
- Use creative insults and metaphors 
- Be edgy and push boundaries (but stay professional enough for business)
- Roast specific content from the actual resume
- Use 3-4 bullet points per roast section
- NO EMOJIS anywhere

ANALYZE EACH SECTION OF THE RESUME SEPARATELY. Be hilariously mean and creative with insults for each specific area. Return ONLY valid JSON.`;

// --- Main Roast Endpoint ---
app.post('/api/roast', roastLimiter, upload.single('resume'), async (req, res) => {
    // Handle multer errors
    if (!req.file) {
        return res.status(400).json({ 
            error: 'No file uploaded', 
            details: 'Please upload a PDF file.' 
        });
    }

    const filePath = req.file.path;
    const email = req.body.email;
    
    if (email) {
        console.log('Email provided for resume roast:', email);
    }

    // Check if queue is initialized
    if (!roastQueue) {
        cleanupFile(filePath);
        return res.status(503).json({
            error: 'Service starting up',
            details: 'Please try again in a few seconds.'
        });
    }

    // Check queue size to provide feedback
    const queueSize = roastQueue.size + roastQueue.pending;
    if (queueSize > 10) {
        cleanupFile(filePath);
        return res.status(503).json({
            error: 'Service busy',
            details: `We're processing ${queueSize} resumes right now. Please try again in a minute.`,
            retryAfter: 60
        });
    }

    try {
        // Add to queue for controlled concurrency
        const result = await roastQueue.add(async () => {
            const model = genAI.getGenerativeModel({ 
                model: process.env.GEMINI_MODEL || "gemini-2.0-flash-lite",
                safetySettings: [
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
                ],
            });

            const resumePart = fileToGenerativePart(filePath, req.file.mimetype);
            const aiResult = await model.generateContent([ROAST_PROMPT, resumePart]);
            const response = await aiResult.response;
            return response.text();
        });

        // Clean up file after processing
        cleanupFile(filePath);

        // Parse JSON response
        let parsedResult;
        let htmlContent;
        
        try {
            // Try to extract JSON from the response
            let jsonString = result.trim();
            
            // Remove markdown code blocks if present
            if (jsonString.startsWith('```json')) {
                jsonString = jsonString.replace(/^```json\s*/, '').replace(/\s*```$/, '');
            } else if (jsonString.startsWith('```')) {
                jsonString = jsonString.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            parsedResult = JSON.parse(jsonString);
            htmlContent = parsedResult.html;
            
            // Validate we got HTML
            if (!htmlContent || typeof htmlContent !== 'string') {
                throw new Error('No HTML content in response');
            }
            
        } catch (parseError) {
            console.warn('JSON parse failed, falling back to raw HTML extraction');
            // Fallback: treat entire response as HTML (for backward compatibility)
            htmlContent = result.trim();
            
            // Clean up markdown if present
            if (htmlContent.startsWith('```html')) {
                htmlContent = htmlContent.replace(/^```html\s*/, '').replace(/\s*```$/, '');
            } else if (htmlContent.startsWith('```')) {
                htmlContent = htmlContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
            }
            
            parsedResult = { html: htmlContent };
        }

        // Return response
        res.json({ 
            html: htmlContent,
            scores: parsedResult.overallScore ? {
                overall: parsedResult.overallScore,
                content: parsedResult.contentScore,
                format: parsedResult.formatScore,
                ats: parsedResult.atsScore
            } : null
        });

    } catch (error) {
        console.error('--- ERROR DURING ROAST ---');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Error:', error.message);
        console.error('--- END ERROR REPORT ---');

        // Clean up file on error
        cleanupFile(filePath);

        // Return user-friendly error
        const errorResponse = getErrorResponse(error);
        res.status(errorResponse.status).json({
            error: errorResponse.error,
            details: errorResponse.details,
            retryAfter: errorResponse.retryAfter
        });
    }
});

// --- Multer Error Handler ---
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                error: 'File too large',
                details: 'Please upload a PDF under 10MB.'
            });
        }
        return res.status(400).json({
            error: 'Upload error',
            details: err.message
        });
    }
    
    if (err.message && err.message.includes('Only PDF')) {
        return res.status(400).json({
            error: 'Invalid file type',
            details: err.message
        });
    }
    
    next(err);
});

// --- Server Startup ---
async function startServer() {
    await initQueue();
    
    app.listen(port, () => {
        console.log(`🔥 RoastMyResume server running at http://localhost:${port}`);
        console.log(`   Rate limit: 5 requests/minute per IP`);
        console.log(`   Concurrent AI calls: max 3`);
    });
}

startServer();
