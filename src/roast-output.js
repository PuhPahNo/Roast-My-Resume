const sanitizeHtml = require('sanitize-html');

const ROAST_RESPONSE_SCHEMA = Object.freeze({
    name: 'resume_roast',
    strict: true,
    schema: {
        type: 'object',
        properties: {
            overallScore: { type: 'integer', minimum: 1, maximum: 10 },
            contentScore: { type: 'integer', minimum: 1, maximum: 10 },
            formatScore: { type: 'integer', minimum: 1, maximum: 10 },
            atsScore: { type: 'integer', minimum: 1, maximum: 10 },
            html: { type: 'string' }
        },
        required: ['overallScore', 'contentScore', 'formatScore', 'atsScore', 'html'],
        additionalProperties: false
    }
});

const REQUIRED_HTML_CLASSES = [
    'analysis-overview',
    'score-container',
    'roast-tabs-container',
    'action-items'
];

function sanitizeRoastHtml(html) {
    return sanitizeHtml(html, {
        allowedTags: ['div', 'h2', 'h3', 'span', 'button', 'ul', 'li', 'p', 'strong', 'em', 'br'],
        allowedAttributes: {
            '*': ['class'],
            div: ['id'],
            button: ['data-section', 'type']
        },
        allowedSchemes: [],
        disallowedTagsMode: 'discard'
    }).trim();
}

function hasClass(html, className) {
    return Array.from(html.matchAll(/class="([^"]*)"/g))
        .some(match => match[1].split(/\s+/).includes(className));
}

function parseRoastResponse(content) {
    let result;
    try {
        result = JSON.parse(String(content || '').trim());
    } catch {
        throw new Error('model_output: Groq returned malformed JSON');
    }

    for (const scoreName of ['overallScore', 'contentScore', 'formatScore', 'atsScore']) {
        const score = result[scoreName];
        if (!Number.isInteger(score) || score < 1 || score > 10) {
            throw new Error(`model_output: Groq returned an invalid ${scoreName}`);
        }
    }

    if (typeof result.html !== 'string' || !result.html.trim()) {
        throw new Error('model_output: Groq returned empty roast HTML');
    }

    const html = sanitizeRoastHtml(result.html);
    const missingClass = REQUIRED_HTML_CLASSES.find(className => !hasClass(html, className));
    if (missingClass) {
        throw new Error(`model_output: Groq omitted the ${missingClass} section`);
    }

    return { ...result, html };
}

module.exports = {
    REQUIRED_HTML_CLASSES,
    ROAST_RESPONSE_SCHEMA,
    parseRoastResponse,
    sanitizeRoastHtml
};
