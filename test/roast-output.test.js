const assert = require('node:assert/strict');
const test = require('node:test');
const { parseRoastResponse } = require('../src/roast-output');

function validResponse(overrides = {}) {
    return JSON.stringify({
        overallScore: 3,
        contentScore: 4,
        formatScore: 3,
        atsScore: 4,
        html: `
            <div class="analysis-overview"><div class="score-container">Scores</div></div>
            <div class="roast-tabs-container">Tabs</div>
            <div class="action-items"><div class="action-item">Fix it</div></div>
        `,
        ...overrides
    });
}

test('parses valid structured output', () => {
    const result = parseRoastResponse(validResponse());
    assert.equal(result.overallScore, 3);
    assert.match(result.html, /analysis-overview/);
});

test('sanitizes scripts, event handlers, and unapproved elements', () => {
    const html = `
        <div class="analysis-overview" onclick="alert(1)"><div class="score-container">Scores</div></div>
        <div class="roast-tabs-container"><script>alert(1)</script>Tabs</div>
        <div class="action-items"><img src=x onerror="alert(1)">Fix it</div>
    `;
    const result = parseRoastResponse(validResponse({ html }));
    assert.doesNotMatch(result.html, /script|onclick|onerror|<img/i);
    assert.match(result.html, /Fix it/);
});

test('rejects invalid scores', () => {
    assert.throws(
        () => parseRoastResponse(validResponse({ overallScore: 11 })),
        /invalid overallScore/
    );
});

test('rejects output that would break the results UI', () => {
    assert.throws(
        () => parseRoastResponse(validResponse({ html: '<div class="analysis-overview">Incomplete</div>' })),
        /omitted the score-container section/
    );
});

test('rejects malformed JSON instead of rendering it as HTML', () => {
    assert.throws(() => parseRoastResponse('not-json'), /malformed JSON/);
});
