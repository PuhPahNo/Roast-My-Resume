(function () {
    const sourceKey = 'rmrTrafficSource';
    const landingKey = 'rmrLandingPath';

    function getTrafficSource() {
        const params = new URLSearchParams(window.location.search);
        const campaignSource = params.get('utm_source');
        if (campaignSource) {
            const value = campaignSource.toLowerCase();
            for (const source of ['google', 'bing', 'reddit', 'linkedin', 'facebook', 'instagram', 'tiktok', 'newsletter']) {
                if (value.includes(source)) return source;
            }
            return 'campaign';
        }

        if (!document.referrer) return 'direct';

        try {
            const referrer = new URL(document.referrer);
            if (referrer.origin === window.location.origin) return 'internal';
            if (referrer.hostname.includes('google.')) return 'google';
            if (referrer.hostname.includes('bing.com')) return 'bing';
            if (referrer.hostname.includes('duckduckgo.com')) return 'duckduckgo';
            if (referrer.hostname.includes('reddit.com')) return 'reddit';
            if (referrer.hostname.includes('linkedin.com')) return 'linkedin';
            if (referrer.hostname.includes('facebook.com')) return 'facebook';
            if (referrer.hostname.includes('instagram.com')) return 'instagram';
            if (referrer.hostname.includes('tiktok.com')) return 'tiktok';
            if (referrer.hostname === 'x.com' || referrer.hostname.endsWith('.x.com')) return 'x';
            return 'referral';
        } catch {
            return 'unknown';
        }
    }

    const currentPath = window.location.pathname;
    const initialSource = getTrafficSource();

    if (!sessionStorage.getItem(sourceKey) || initialSource !== 'internal') {
        sessionStorage.setItem(sourceKey, initialSource);
    }
    if (!sessionStorage.getItem(landingKey) || initialSource !== 'internal') {
        sessionStorage.setItem(landingKey, currentPath);
    }

    function track(eventName) {
        const payload = JSON.stringify({
            eventName,
            pagePath: window.location.pathname,
            landingPath: sessionStorage.getItem(landingKey) || currentPath,
            trafficSource: sessionStorage.getItem(sourceKey) || initialSource
        });

        if (navigator.sendBeacon) {
            const body = new Blob([payload], { type: 'application/json' });
            if (navigator.sendBeacon('/api/analytics/event', body)) return;
        }

        fetch('/api/analytics/event', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: payload,
            keepalive: true
        }).catch(() => {});
    }

    window.rmrTrack = track;

    document.addEventListener('click', (event) => {
        const target = event.target.closest('[data-track]');
        if (target) track(target.dataset.track || 'cta_clicked');
    });

    track('page_view');
})();
