function getGroqErrorCode(error) {
    return error?.error?.error?.code || error?.error?.code || error?.code || '';
}

function getErrorResponse(error) {
    const message = String(error?.message || '');
    const normalizedMessage = message.toLowerCase();
    const code = getGroqErrorCode(error);

    if (
        error?.status === 429 ||
        code === 'rate_limit_exceeded' ||
        /\b(rate limit|quota exceeded|too many requests)\b/i.test(message)
    ) {
        return {
            status: 503,
            error: 'Service temporarily busy',
            details: 'Our AI is experiencing high demand. Please try again in a few minutes.',
            retryAfter: 60
        };
    }

    if (
        error?.status === 408 ||
        code === 'request_timeout' ||
        normalizedMessage.includes('deadline_exceeded') ||
        normalizedMessage.includes('request timeout')
    ) {
        return {
            status: 408,
            error: 'Request timeout',
            details: 'The analysis took too long. Try uploading a simpler resume or try again later.'
        };
    }

    if (normalizedMessage.includes('safety') || code === 'content_filter') {
        return {
            status: 400,
            error: 'Content issue',
            details: 'We couldn\'t process this resume. Please ensure it contains appropriate professional content.'
        };
    }

    if (message.startsWith('parse:')) {
        return {
            status: 400,
            error: 'Invalid file',
            details: 'We couldn\'t read this resume. Please upload a valid PDF, DOCX, or UTF-8 TXT file with selectable text.'
        };
    }

    if (
        message.startsWith('model_output:') ||
        error?.status === 400 ||
        error?.status === 404 ||
        ['json_validate_failed', 'model_not_found'].includes(code)
    ) {
        return {
            status: 502,
            error: 'AI service error',
            details: 'Our AI returned an unusable response. Please try again in a moment.'
        };
    }

    return {
        status: 500,
        error: 'Analysis failed',
        details: 'Something went wrong during the roast. Please try again.'
    };
}

module.exports = { getErrorResponse, getGroqErrorCode };
