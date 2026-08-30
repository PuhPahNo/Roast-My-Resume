const ALLOWED_EVENTS = new Set([
    'page_view',
    'cta_clicked',
    'file_selected',
    'roast_started',
    'roast_completed',
    'email_unlocked',
    'marketing_subscribed',
    'cooked_check_completed',
    'example_shared'
]);

const ALLOWED_SOURCES = new Set([
    'direct',
    'internal',
    'google',
    'bing',
    'duckduckgo',
    'reddit',
    'linkedin',
    'facebook',
    'instagram',
    'tiktok',
    'x',
    'newsletter',
    'campaign',
    'referral',
    'unknown'
]);

function cleanText(value, maxLength) {
    if (typeof value !== 'string') return '';
    return value.trim().slice(0, maxLength);
}

function cleanPath(value) {
    const path = cleanText(value, 240);
    if (!path.startsWith('/') || path.startsWith('//')) return '/';
    return path.split('?')[0].split('#')[0] || '/';
}

function normalizeAnalyticsEvent(payload) {
    if (!payload || typeof payload !== 'object') return null;

    const eventName = cleanText(payload.eventName, 40);
    if (!ALLOWED_EVENTS.has(eventName)) return null;

    const trafficSource = cleanText(payload.trafficSource, 80).toLowerCase();

    return {
        eventName,
        pagePath: cleanPath(payload.pagePath),
        landingPath: cleanPath(payload.landingPath),
        trafficSource: ALLOWED_SOURCES.has(trafficSource) ? trafficSource : 'unknown'
    };
}

module.exports = {
    ALLOWED_EVENTS,
    ALLOWED_SOURCES,
    normalizeAnalyticsEvent
};
