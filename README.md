# 🔥 RoastMyResume

AI-powered resume roasting application that provides brutally honest feedback to help job seekers improve their resumes.

## 📁 Project Structure

```
Roast-My-Resume/
├── src/                          # Backend source code
│   ├── server.js                 # Express server and API routes
│   ├── pages/                    # HTML pages
│   │   ├── index.html           # Main landing page
│   │   ├── roast-result.html    # Results page
│   │   ├── about.html           # About page
│   │   ├── contact.html         # Contact page
│   │   ├── privacy.html         # Privacy policy
│   │   └── terms.html           # Terms of service
│   └── components/              # Reusable components (future use)
├── public/                      # Frontend assets
│   ├── css/                     # Stylesheets
│   │   ├── main.css            # Main stylesheet (imports all)
│   │   ├── base.css            # Base styles and utilities
│   │   ├── upload.css          # Upload area styles
│   │   ├── resume-preview.css  # Resume preview component
│   │   ├── roast-results.css   # Results page styles
│   │   └── responsive.css      # Mobile responsive styles
│   └── js/                     # JavaScript modules
│       ├── app.js              # Main app initialization
│       ├── upload-handler.js   # File upload functionality
│       ├── progress-modal.js   # Progress modal component
│       ├── ui-components.js    # UI interactions
│       └── roast-result.js     # Results page functionality
├── static/                     # Static assets
│   ├── uploads/               # Temporary file uploads
│   └── Sample Resume/         # Sample resume files
├── docs/                      # Documentation (future use)
├── package.json              # Node.js dependencies
├── .gitignore               # Git ignore rules
└── README.md               # This file
```

## 🚀 Features

- **AI-Powered Analysis**: Uses Google Gemini AI for intelligent resume feedback
- **Brutal Honesty**: Provides savage, humorous roasts with actionable advice
- **Email Gate**: Captures user emails for marketing (bypassed for sample resumes)
- **Progress Modal**: Smooth progress tracking with realistic timing
- **Tabbed Roast Interface**: Organized feedback by resume sections
- **Mobile Responsive**: Works seamlessly on all devices
- **File Upload**: Supports PDF, DOC, and DOCX files
- **Sample Resume**: Demo functionality without email requirement

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Roast-My-Resume
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_API_KEY=your_google_gemini_api_key_here
   ```

4. **Start the server**
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

## 🏗️ Architecture

### Backend (Node.js/Express)
- **server.js**: Main server file with API routes
- **Multer**: Handles file uploads with temporary storage
- **Google Generative AI**: Processes resumes and generates roasts
- **Static file serving**: Serves frontend assets

### Frontend (Vanilla JS/CSS)
- **Modular JavaScript**: Split into logical components
- **CSS Modules**: Organized by functionality
- **Tailwind CSS**: Utility-first styling framework
- **Progressive Enhancement**: Works without JavaScript for basic functionality

### Key Components

#### Upload Handler (`upload-handler.js`)
- File validation (type, size)
- Drag & drop functionality
- Upload area state management

#### Progress Modal (`progress-modal.js`)
- Animated progress bar
- Email capture gate
- Resume processing workflow

#### UI Components (`ui-components.js`)
- Resume preview tabs
- Mobile menu
- FAQ interactions
- Scroll animations

## 🎨 Styling Architecture

The CSS is organized into modular files:

- **base.css**: Core utilities, gradients, animations
- **upload.css**: File upload area and mobile menu
- **resume-preview.css**: Interactive resume preview component
- **roast-results.css**: Results page and roast display
- **responsive.css**: Mobile-first responsive design

## 🔧 Configuration

### AI Prompt Customization
The AI roast behavior can be modified in `src/server.js`:
- Scoring guidelines (typically 2-5 range)
- Content style and tone
- Response structure and format

### File Upload Settings
Configure in `src/server.js`:
- File size limits (default: 10MB)
- Allowed file types
- Upload destination

### Progress Timing
Adjust in `public/js/progress-modal.js`:
- Progress increment speed
- Animation delays
- Email gate timing

## 🚀 Deployment

1. **Environment Setup**
   - Set `GOOGLE_API_KEY` environment variable
   - Configure upload directory permissions

2. **Build Process**
   - No build step required (vanilla JS/CSS)
   - Ensure all static assets are accessible

3. **Server Configuration**
   - Set appropriate port (default: 3000)
   - Configure reverse proxy if needed
   - Set up SSL certificates

## 📝 API Endpoints

### POST `/api/roast`
Processes uploaded resume and returns AI-generated roast.

**Request:**
- `resume`: File (PDF, DOC, DOCX)
- `email`: String (optional, for user resumes)

**Response:**
```json
{
  "html": "<div>AI-generated roast HTML</div>",
  "success": true
}
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Related Services

- **AI Resume Boost**: Professional resume optimization service
- **Sample Resumes**: Collection of industry-specific resume templates

---

Built with ❤️ and a lot of ☕ by the RoastMyResume team. 