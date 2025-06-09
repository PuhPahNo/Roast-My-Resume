require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// --- API Key Check ---
if (!process.env.GOOGLE_API_KEY) {
    console.error("FATAL ERROR: GOOGLE_API_KEY is not defined in your .env file.");
    console.error("Please ensure you have a .env file in the root directory with the following content:");
    console.error("GOOGLE_API_KEY=YOUR_API_KEY");
    process.exit(1); // Stop the server
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
        // Check if email already exists
        const existingEmail = await pool.query("SELECT email FROM emails WHERE email = $1", [email]);
        
        if (existingEmail.rows.length > 0) {
            console.log(`Email ${email} already exists in database`);
            return { success: true, message: "Email already registered" };
        }
        
        // Insert the new email
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

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '..'))); // Serve static files from the project root

// Setup Multer for file uploads
const uploadDir = path.join(__dirname, '../static/uploads/');
// Ensure upload directory exists
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
const upload = multer({ storage: storage });

// Initialize Google Generative AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// HTML Page Routes
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
app.post('/api/capture-email', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }
        
        // Basic email validation
        if (!email.includes('@') || !email.includes('.')) {
            return res.status(400).json({ success: false, message: "Invalid email format" });
        }
        
        // Save the email to database
        const result = await saveEmail(email);
        
        return res.json(result);
        
    } catch (error) {
        console.error("Error in capture-email route:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
});

// Converts local file information to a GoogleGenerativeAI.Part object.
function fileToGenerativePart(path, mimeType) {
    return {
        inlineData: {
            data: Buffer.from(fs.readFileSync(path)).toString("base64"),
            mimeType
        },
    };
}


app.post('/api/roast', upload.single('resume'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    // Check if email was provided (for user resumes) - email already saved via /api/capture-email
    const email = req.body.email;
    if (email) {
        console.log('Email provided for resume roast:', email, '(already saved via progress modal)');
    }

    try {
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash-latest",
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_NONE",
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH", 
                    threshold: "BLOCK_NONE",
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_ONLY_HIGH",
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_ONLY_HIGH",
                },
            ],
        });

        const prompt = `You are a SAVAGE resume reviewer with ZERO filter. Absolutely DESTROY this resume with vicious humor and brutal honesty. Be hilariously mean, sarcastic, and ruthless. Think of the meanest roast comedian mixed with a harsh hiring manager. Be EDGY and don't hold back. NO EMOJIS EVER.

SCORING GUIDELINES:
- Overall scores should typically range from 2-5 out of 10
- Content Quality: Usually 2-4, with 5 for exceptional content, 1 only for completely empty/nonsensical content
- Format & Design: Usually 2-4, with 5 for great formatting, 1 only for completely broken formatting
- ATS Compatibility: Usually 3-5, with 2 for poor ATS optimization, 1 only for resumes with major ATS-breaking issues (like heavy graphics/tables)
- Give occasional 1s only when the resume is truly terrible in that specific area
- Most resumes should get 2-3 overall, with better ones getting 4, and rare exceptional ones getting 5

Your response MUST be formatted as raw HTML only - NO markdown formatting, NO code blocks, NO backticks.

CONTENT STYLE:
- SAVAGE, MEAN, and HILARIOUS roasting
- Use creative insults and metaphors 
- Be edgy and push boundaries (but stay professional enough for business)
- Roast specific content with brutal humor
- Use BULLET POINTS for each roast section (3-4 bullets per section)
- Each bullet should be a separate savage roast
- NO EMOJIS anywhere in your response

REQUIRED STRUCTURE with exact CSS classes:
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
                    <li>First savage bullet point about their terrible objective</li>
                    <li>Second brutal roast about their summary's obvious lies</li>
                    <li>Third creative insult about their career goals delusions</li>
                </ul>
            </div>
            
            <div class="roast-section-content" id="experience-content">
                <h3 class="section-header">Work Experience Obliteration</h3>
                <ul class="roast-list">
                    <li>Brutal roast about their job descriptions and obvious exaggerations</li>
                    <li>Savage mockery of their "accomplishments" and made-up metrics</li>
                    <li>Creative destruction of their employment timeline gaps</li>
                </ul>
            </div>
            
            <div class="roast-section-content" id="skills-content">
                <h3 class="section-header">Skills Section Mockery</h3>
                <ul class="roast-list">
                    <li>Vicious roasting of their outdated technical skills</li>
                    <li>Brutal mockery of their "expert" level claims</li>
                    <li>Savage destruction of their soft skills nonsense</li>
                </ul>
            </div>
            
            <div class="roast-section-content" id="education-content">
                <h3 class="section-header">Education & Format Catastrophe</h3>
                <ul class="roast-list">
                    <li>Savage roasting of their educational background</li>
                    <li>Brutal criticism of their formatting disasters</li>
                    <li>Creative insults about their design choices</li>
                </ul>
            </div>
        </div>
    </div>
</div>

<div class="analysis-section">
    <h3 class="section-header section-header-positive">What Didn't Make Me Vomit (Barely)</h3>
    <ul class="analysis-list">
        <li>Grudgingly admit 1-2 things that aren't completely terrible (if any exist)</li>
        <li>Use backhanded compliments like "At least you..."</li>
    </ul>
</div>

<div class="analysis-section">
    <h3 class="section-header section-header-improvements">How to Fix This Train Wreck</h3>
    <div class="action-items">
        <div class="action-item">
            <div class="action-title">1. [Brutal but actionable advice]</div>
            <div class="action-description">Savage explanation with humor</div>
        </div>
        [Repeat for 3-4 action items with increasing brutality]
    </div>
</div>

ANALYZE EACH SECTION OF THE RESUME SEPARATELY. Be hilariously mean and creative with insults for each specific area. Most resumes are garbage fires that deserve to be roasted mercilessly. NO EMOJIS. Return ONLY the HTML content.`;

        const resumePart = fileToGenerativePart(req.file.path, req.file.mimetype);

        const result = await model.generateContent([prompt, resumePart]);
        const response = await result.response;
        let htmlContent = response.text();

        // Clean up any markdown formatting that might be present
        htmlContent = htmlContent.trim();
        
        // Remove markdown code blocks
        if (htmlContent.startsWith('```html')) {
            htmlContent = htmlContent.replace(/^```html\s*/, '').replace(/\s*```$/, '');
        } else if (htmlContent.startsWith('```')) {
            htmlContent = htmlContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }
        
        // Trim again after cleanup
        htmlContent = htmlContent.trim();

        // Delete the temporary file
        fs.unlinkSync(req.file.path);
        
        // Return the HTML content directly
        res.json({ html: htmlContent });

    } catch (error) {
        console.error('--- ERROR DURING ROAST ---');
        console.error('Timestamp:', new Date().toISOString());
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Full Error Object:', error);
        console.error('--- END ERROR REPORT ---');

        // Also delete the file in case of error
        if (req.file && req.file.path && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }
        res.status(500).json({ error: 'Failed to roast resume.', details: error.message });
    }
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
