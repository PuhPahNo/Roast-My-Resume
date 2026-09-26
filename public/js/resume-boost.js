// Resume Boost: turns the roast into paste-ready edits using the resume text
// the roast already extracted. Everything is rendered with textContent.
window.ResumeBoost = (function () {
    const LOADING_MESSAGES = [
        'Rewriting your weakest bullets...',
        'Drafting a sharper summary...',
        'Looking for your biggest wins...',
        'Checking every claim against your resume...'
    ];

    let resumeText = null;
    let loadingTimer = null;
    let lastBoost = null;

    const $ = (id) => document.getElementById(id);

    function el(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function show(id, visible) {
        $(id)?.classList.toggle('hidden', !visible);
    }

    // Highlight [placeholders] the user must replace with real numbers.
    function withPlaceholders(text) {
        const fragment = document.createDocumentFragment();
        text.split(/(\[[^\]]+\])/).forEach((part) => {
            if (!part) return;
            fragment.appendChild(/^\[[^\]]+\]$/.test(part)
                ? el('mark', 'bg-amber-100 text-amber-900 rounded px-1 font-semibold', part)
                : document.createTextNode(part));
        });
        return fragment;
    }

    async function copyText(text, button) {
        try {
            await navigator.clipboard.writeText(text);
        } catch {
            const area = el('textarea');
            area.value = text;
            document.body.appendChild(area);
            area.select();
            document.execCommand('copy');
            area.remove();
        }
        const label = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => { button.textContent = label; }, 1500);
    }

    function copyButton(text, label = 'Copy') {
        const button = el('button', 'shrink-0 text-sm font-semibold text-emerald-700 border border-emerald-200 bg-white hover:bg-emerald-50 rounded-md px-3 py-1 transition-colors', label);
        button.type = 'button';
        button.addEventListener('click', () => copyText(text, button));
        return button;
    }

    function sectionHeading(title, subtitle) {
        const wrap = el('div', 'mb-4');
        wrap.appendChild(el('h4', 'text-xl font-bold text-gray-900', title));
        if (subtitle) wrap.appendChild(el('p', 'text-sm text-gray-600 mt-1', subtitle));
        return wrap;
    }

    function rewriteCard(item) {
        const card = el('div', 'border border-gray-200 rounded-xl overflow-hidden');

        if (item.original) {
            const before = el('div', 'bg-gray-50 px-4 py-3 border-b border-gray-200');
            before.appendChild(el('p', 'text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1', 'Before'));
            before.appendChild(el('p', 'text-gray-600', item.original));
            card.appendChild(before);
        }

        const after = el('div', 'px-4 py-3');
        const header = el('div', 'flex items-start justify-between gap-3 mb-1');
        header.appendChild(el('p', 'text-xs font-semibold uppercase tracking-wide text-emerald-700', 'After'));
        header.appendChild(copyButton(item.rewrite));
        after.appendChild(header);
        const rewrite = el('p', 'text-gray-900 font-medium');
        rewrite.appendChild(withPlaceholders(item.rewrite));
        after.appendChild(rewrite);
        if (item.why) after.appendChild(el('p', 'text-sm text-gray-500 mt-2', item.why));
        card.appendChild(after);

        return card;
    }

    function keywordChips(words, className) {
        const wrap = el('div', 'flex flex-wrap gap-2');
        words.forEach((word) => wrap.appendChild(el('span', `text-sm rounded-full px-3 py-1 ${className}`, word)));
        return wrap;
    }

    function allRewritesText(boost) {
        const lines = ['SUMMARY', boost.summary.rewrite, '', 'BULLETS'];
        boost.bullets.forEach((item) => lines.push(`- ${item.rewrite}`));
        return lines.join('\n');
    }

    function renderResults(boost) {
        const results = $('boost-results');
        results.replaceChildren();

        if (boost.verdict) {
            const verdict = el('div', 'bg-emerald-50 border border-emerald-200 rounded-xl p-5');
            verdict.appendChild(el('p', 'text-xs font-semibold uppercase tracking-wide text-emerald-700 mb-1', 'Biggest lever'));
            verdict.appendChild(el('p', 'text-lg text-gray-900', boost.verdict));
            results.appendChild(verdict);
        }

        const notice = el('p', 'text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3');
        notice.appendChild(el('strong', '', 'Before you paste: '));
        notice.appendChild(document.createTextNode('replace anything in [brackets] with a real number you can defend in an interview, and cut any claim that isn\'t true.'));
        results.appendChild(notice);

        const summary = el('div');
        summary.appendChild(sectionHeading(
            boost.summary.original ? 'Your summary, rewritten' : 'A summary you can add',
            boost.summary.original ? null : 'Your resume doesn\'t have one. This goes right under your name and contact line.'
        ));
        summary.appendChild(rewriteCard(boost.summary));
        results.appendChild(summary);

        const bullets = el('div');
        bullets.appendChild(sectionHeading('Bullet rewrites', `${boost.bullets.length} lines that gain the most from a rewrite.`));
        const list = el('div', 'space-y-4');
        boost.bullets.forEach((item) => list.appendChild(rewriteCard(item)));
        bullets.appendChild(list);
        results.appendChild(bullets);

        if (boost.keywords.missing.length || boost.keywords.matched.length) {
            const keywords = el('div');
            keywords.appendChild(sectionHeading('Job match keywords', 'Only add a missing keyword if you genuinely have that skill.'));
            if (boost.keywords.missing.length) {
                keywords.appendChild(el('p', 'font-semibold text-gray-800 mb-2', 'Missing from your resume'));
                keywords.appendChild(keywordChips(boost.keywords.missing, 'bg-orange-100 text-orange-800'));
            }
            if (boost.keywords.matched.length) {
                keywords.appendChild(el('p', 'font-semibold text-gray-800 mt-4 mb-2', 'Already covered'));
                keywords.appendChild(keywordChips(boost.keywords.matched, 'bg-emerald-100 text-emerald-800'));
            }
            results.appendChild(keywords);
        }

        const fixes = el('div');
        fixes.appendChild(sectionHeading('Bigger fixes'));
        const fixList = el('ol', 'space-y-3');
        boost.fixes.forEach((fix, index) => {
            const item = el('li', 'flex gap-3');
            item.appendChild(el('span', 'shrink-0 w-7 h-7 rounded-full bg-emerald-600 text-white text-sm font-bold flex items-center justify-center', String(index + 1)));
            const body = el('div');
            body.appendChild(el('p', 'font-semibold text-gray-900', fix.title));
            body.appendChild(el('p', 'text-gray-600', fix.detail));
            item.appendChild(body);
            fixList.appendChild(item);
        });
        fixes.appendChild(fixList);
        results.appendChild(fixes);

        const actions = el('div', 'flex flex-col sm:flex-row gap-3 justify-center pt-2');
        const copyAll = copyButton(allRewritesText(boost), 'Copy All Rewrites');
        copyAll.className = 'bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 transition-colors';
        actions.appendChild(copyAll);
        const retarget = el('button', 'bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors', 'Tailor to a Different Job');
        retarget.type = 'button';
        retarget.addEventListener('click', () => {
            show('boost-form', true);
            $('boost-job-description')?.focus();
        });
        actions.appendChild(retarget);
        results.appendChild(actions);

        show('boost-results', true);
    }

    function setLoading(loading) {
        show('boost-loading', loading);
        const submit = $('boost-submit');
        if (submit) submit.disabled = loading;
        clearInterval(loadingTimer);
        if (loading) {
            let index = 0;
            $('boost-loading-text').textContent = LOADING_MESSAGES[0];
            loadingTimer = setInterval(() => {
                index = (index + 1) % LOADING_MESSAGES.length;
                $('boost-loading-text').textContent = LOADING_MESSAGES[index];
            }, 4000);
        }
    }

    function showError(message) {
        $('boost-error-text').textContent = message;
        show('boost-error', true);
        show('boost-form', true);
        if (lastBoost) show('boost-results', true);
    }

    async function runBoost() {
        const jobDescription = $('boost-job-description')?.value.trim() || '';

        show('boost-error', false);
        show('boost-form', false);
        show('boost-results', false);
        setLoading(true);
        window.rmrTrack?.('boost_started');

        try {
            const response = await fetch('/api/boost', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ resumeText, jobDescription })
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(data.details || 'Something went wrong. Please try again.');
            }

            lastBoost = data;
            setLoading(false);
            renderResults(data);
            window.rmrTrack?.('boost_completed');
            $('resume-boost')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (error) {
            setLoading(false);
            showError(error.message || 'Something went wrong. Please try again.');
        }
    }

    function init(text) {
        const form = $('boost-form');
        if (!form) return;

        resumeText = typeof text === 'string' && text.trim() ? text : null;
        if (!resumeText) {
            show('boost-form', false);
            show('boost-unavailable', true);
            return;
        }

        const jobDescription = $('boost-job-description');
        const counter = $('boost-jd-count');
        jobDescription?.addEventListener('input', () => {
            counter.textContent = `${jobDescription.value.length.toLocaleString('en-US')} / 8,000`;
        });

        form.addEventListener('submit', (event) => {
            event.preventDefault();
            runBoost();
        });
        $('boost-retry')?.addEventListener('click', runBoost);
    }

    return { init };
})();
