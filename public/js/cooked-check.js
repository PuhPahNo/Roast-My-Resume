document.getElementById('scoreCookedResume')?.addEventListener('click', () => {
    const score = document.querySelectorAll('#cookedChecklist input:checked').length;
    const result = document.getElementById('cookedResult');
    const title = document.getElementById('cookedResultTitle');
    const copy = document.getElementById('cookedResultCopy');
    let resultTitle;
    let resultCopy;
    let classes;

    if (score <= 1) {
        resultTitle = 'Probably not cooked.';
        resultCopy = 'Your resume avoids most of the obvious warning signs. Focus on job fit and small, role-specific edits before rebuilding the document.';
        classes = ['bg-green-50', 'border-green-300'];
    } else if (score <= 3) {
        resultTitle = 'Warm around the edges.';
        resultCopy = 'There are enough weak signals to justify an edit. Fix the checked items first; they are more useful than chasing a different template.';
        classes = ['bg-yellow-50', 'border-yellow-300'];
    } else {
        resultTitle = 'Yes, it needs a rebuild.';
        resultCopy = 'The good news is that the problems are visible and fixable. Start with evidence in your recent roles, then simplify the structure and sharpen the target.';
        classes = ['bg-red-50', 'border-red-300'];
    }

    result.className = `mt-7 rounded-xl border p-6 ${classes.join(' ')}`;
    title.textContent = `${score}/6 — ${resultTitle}`;
    copy.textContent = resultCopy;
    result.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    window.rmrTrack?.('cooked_check_completed');
});
