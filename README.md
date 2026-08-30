# Roast My Resume

Roast My Resume is an Express application that extracts text from PDF, DOCX, and TXT resumes, sends that text to a Groq-hosted model, validates the structured response, and displays an automated critique.

## Local setup

Requirements: Node.js 20.19 or newer.

```bash
npm install
cp .env.example .env
npm run build
npm test
npm start
```

`GROQ_API_KEY` is required. The remaining environment variables are optional:

```env
PORT=3000
GROQ_MODEL=openai/gpt-oss-120b
GROQ_REQUESTS_PER_MINUTE=1
DATABASE_URL=
DB_SSL_MODE=require
EMAIL_OCTOPUS_API_KEY=
EMAIL_OCTOPUS_LIST_ID=
```

## Commands

- `npm run build` compiles Tailwind and regenerates `sitemap.xml`.
- `npm test` runs parser, output-validation, error-handling, analytics, and SEO checks.
- `npm start` starts the Express server.
- `npm run dev` starts the server with nodemon.

Run the build before committing any HTML or Tailwind-class change. The compiled stylesheet is committed so the deployed server can serve it without a runtime asset pipeline.

## Data flow

1. Multer writes an upload to a randomly named file in the operating system's temporary directory.
2. The server extracts readable text and sends that text to Groq.
3. The model response is validated against a strict schema and sanitized before rendering.
4. The temporary upload is removed when the request finishes or errors.
5. An email is stored in PostgreSQL to unlock full results. EmailOctopus receives the address only when the optional marketing checkbox is selected.

Do not describe the ATS score as a simulation of an employer's applicant-tracking system. The model receives extracted text, not a rendered page or job description. The public methodology and privacy pages document these boundaries.

## Aggregate measurement

The browser sends a small allowlisted set of events to `POST /api/analytics/event`. PostgreSQL stores only daily aggregate counts by event, page, landing page, and bounded source category. The event payload has no email, resume text, cookie, visitor ID, or session ID.

Example report:

```sql
SELECT event_date, landing_path, traffic_source, event_name, SUM(total) AS total
FROM analytics_daily
WHERE event_date >= CURRENT_DATE - INTERVAL '28 days'
GROUP BY event_date, landing_path, traffic_source, event_name
ORDER BY event_date DESC, landing_path, event_name;
```

## Main routes

- `/` — upload and product page
- `/resume-roast-examples` — synthetic before-and-after examples
- `/methodology` — processing, scoring, and limitations
- `/blog` — resume guides
- `/privacy` and `/terms` — current policies
- `/api/health` — model and deployed-revision health check
- `/api/roast` — resume processing
- `/api/capture-email` — email unlock and optional marketing consent
- `/api/analytics/event` — aggregate event counter

Legacy `.html` policy and company URLs redirect to their canonical extensionless routes.
