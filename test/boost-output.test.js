const assert = require('node:assert/strict');
const test = require('node:test');
const {
    MAX_JOB_DESCRIPTION_LENGTH,
    MAX_RESUME_TEXT_LENGTH,
    buildBoostUserMessage,
    parseBoostResponse,
    validateBoostRequest
} = require('../src/boost-output');

const resumeText = 'Experienced analyst. '.repeat(20);

function bullet(n) {
    return { original: `Did task ${n}`, rewrite: `Led task ${n}, cutting cycle time [X%]`, why: 'Adds outcome.' };
}

function validResponse(overrides = {}) {
    return JSON.stringify({
        verdict: 'Lead with outcomes.',
        summary: { original: '', rewrite: 'Analyst with five years of reporting work.', why: 'Adds focus.' },
        bullets: [bullet(1), bullet(2), bullet(3)],
        fixes: [{ title: 'Group skills', detail: 'Split tools from methods.' }],
        keywords: { missing: ['SQL', 'sql', 'Tableau'], matched: ['Excel'] },
        ...overrides
    });
}

test('accepts resume text with an optional job description', () => {
    assert.deepEqual(validateBoostRequest({ resumeText: `  ${resumeText}  ` }), {
        resumeText: resumeText.trim(),
        jobDescription: ''
    });
    assert.equal(validateBoostRequest({ resumeText, jobDescription: ' Data role ' }).jobDescription, 'Data role');
});

test('rejects missing, oversized, or non-string input', () => {
    assert.ok(validateBoostRequest({}).error);
    assert.ok(validateBoostRequest({ resumeText: 'too short' }).error);
    assert.ok(validateBoostRequest({ resumeText: { text: resumeText } }).error);
    assert.ok(validateBoostRequest({ resumeText: 'a'.repeat(MAX_RESUME_TEXT_LENGTH + 1) }).error);
    assert.ok(validateBoostRequest({ resumeText, jobDescription: 'a'.repeat(MAX_JOB_DESCRIPTION_LENGTH + 1) }).error);
});

test('wraps resume and job description in data tags', () => {
    assert.match(buildBoostUserMessage('R', 'J'), /<resume_data>\nR\n<\/resume_data>\n<job_description>\nJ\n<\/job_description>/);
    assert.match(buildBoostUserMessage('R', ''), /No job description was provided/);
});

test('parses a valid boost and keeps only deduped keywords from the job description', () => {
    const result = parseBoostResponse(validResponse(), { jobDescription: 'Needs SQL and Excel skills.' });
    assert.equal(result.bullets.length, 3);
    assert.deepEqual(result.keywords, { missing: ['SQL'], matched: ['Excel'] });
});

test('drops keywords when no job description was given', () => {
    const result = parseBoostResponse(validResponse());
    assert.deepEqual(result.keywords, { missing: [], matched: [] });
});

test('caps bullet rewrites and fixes', () => {
    const result = parseBoostResponse(validResponse({
        bullets: Array.from({ length: 12 }, (_, i) => bullet(i)),
        fixes: Array.from({ length: 5 }, (_, i) => ({ title: `Fix ${i}`, detail: 'Do it.' }))
    }));
    assert.equal(result.bullets.length, 8);
    assert.equal(result.fixes.length, 3);
});

test('rejects malformed or incomplete boosts', () => {
    assert.throws(() => parseBoostResponse('{nope'), /model_output/);
    assert.throws(() => parseBoostResponse(validResponse({ bullets: [bullet(1)] })), /too few bullet/);
    assert.throws(() => parseBoostResponse(validResponse({ summary: { original: '', rewrite: '', why: '' } })), /summary/);
    assert.throws(() => parseBoostResponse(validResponse({ fixes: [] })), /fixes/);
});
