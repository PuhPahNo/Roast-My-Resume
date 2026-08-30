document.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-share-example]');
    if (!button) return;

    const title = button.dataset.shareExample;
    const shareData = {
        title: `${title} resume roast example`,
        text: `A practical before-and-after ${title.toLowerCase()} resume roast example.`,
        url: `${window.location.origin}${window.location.pathname}#${button.dataset.shareTarget}`
    };

    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(shareData.url);
            const original = button.textContent;
            button.textContent = 'Link copied';
            setTimeout(() => { button.textContent = original; }, 1800);
        }
        window.rmrTrack?.('example_shared');
    } catch (error) {
        if (error.name !== 'AbortError') console.warn('Could not share example:', error.message);
    }
});
