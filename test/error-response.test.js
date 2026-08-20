const assert = require('node:assert/strict');
const test = require('node:test');
const { getErrorResponse } = require('../src/error-response');

test('classifies actual Groq rate limits as temporary capacity errors', () => {
    const result = getErrorResponse({ status: 429, message: 'Too many requests' });
    assert.equal(result.status, 503);
    assert.equal(result.retryAfter, 60);
});

test('does not mistake the word generate for a rate-limit error', () => {
    const result = getErrorResponse({
        status: 400,
        message: 'Failed to generate JSON',
        error: { error: { code: 'json_validate_failed' } }
    });
    assert.equal(result.status, 502);
    assert.equal(result.error, 'AI service error');
});

test('classifies parser failures as invalid uploads', () => {
    const result = getErrorResponse(new Error('parse: No readable text found in PDF file'));
    assert.equal(result.status, 400);
    assert.equal(result.error, 'Invalid file');
});

test('classifies retired model failures as upstream AI errors', () => {
    const result = getErrorResponse({
        status: 404,
        message: 'Model not found',
        error: { error: { code: 'model_not_found' } }
    });
    assert.equal(result.status, 502);
});
