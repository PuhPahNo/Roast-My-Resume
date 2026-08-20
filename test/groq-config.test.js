const assert = require('node:assert/strict');
const test = require('node:test');
const { DEFAULT_GROQ_MODEL, resolveGroqModel } = require('../src/groq-config');

test('uses GPT-OSS 120B by default and migrates the retired Llama setting', () => {
    assert.equal(resolveGroqModel(), DEFAULT_GROQ_MODEL);
    assert.equal(resolveGroqModel('llama-3.1-8b-instant'), DEFAULT_GROQ_MODEL);
});

test('preserves an explicit supported model override', () => {
    assert.equal(resolveGroqModel('openai/gpt-oss-20b'), 'openai/gpt-oss-20b');
});
