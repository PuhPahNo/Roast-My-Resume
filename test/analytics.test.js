const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeAnalyticsEvent } = require('../src/analytics');

test('normalizes an allowed analytics event without accepting identifiers', () => {
    assert.deepEqual(normalizeAnalyticsEvent({
        eventName: 'roast_completed',
        pagePath: '/roast-result.html?source=organic#score',
        landingPath: '/blog/is-my-resume-cooked?utm_source=google',
        trafficSource: 'google'
    }), {
        eventName: 'roast_completed',
        pagePath: '/roast-result.html',
        landingPath: '/blog/is-my-resume-cooked',
        trafficSource: 'google'
    });
});

test('rejects unknown event names', () => {
    assert.equal(normalizeAnalyticsEvent({ eventName: 'email_address' }), null);
});

test('falls back to safe paths and rejects high-cardinality source labels', () => {
    const event = normalizeAnalyticsEvent({
        eventName: 'page_view',
        pagePath: 'https://example.com/private',
        landingPath: '//example.com/private',
        trafficSource: 'someone@example.com'
    });

    assert.equal(event.pagePath, '/');
    assert.equal(event.landingPath, '/');
    assert.equal(event.trafficSource, 'unknown');
});
