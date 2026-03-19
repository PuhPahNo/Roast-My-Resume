class ProgressModal {
    constructor() {
        this.progressModal = document.getElementById('progressModal');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.emailGate = document.getElementById('emailGate');
        this.roastPromise = null;
        this.roastResult = null;
        this.emailCaptured = false;
    }

    show() {
        if (this.progressModal) {
            this.progressModal.classList.remove('hidden');
        }
    }

    hide() {
        if (this.progressModal) {
            this.progressModal.classList.add('hidden');
        }
    }

    async simulateProgress(targetPercent, speedMultiplier = 1) {
        const messages = [
            'Initializing analysis...',
            'Reading your resume...',
            'Analyzing content structure...',
            'Checking formatting quality...',
            'Evaluating keyword usage...',
            'Preparing feedback...'
        ];

        let currentPercent = parseFloat(this.progressBar?.style.width) || 0;
        const increment = 0.5 * speedMultiplier;
        const delay = 200;

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                currentPercent += increment;

                if (this.progressBar) {
                    this.progressBar.style.width = `${Math.min(currentPercent, targetPercent)}%`;
                }

                if (this.progressText && currentPercent < targetPercent) {
                    const messageIndex = Math.floor((currentPercent / 100) * messages.length);
                    this.progressText.textContent = messages[Math.min(messageIndex, messages.length - 1)];
                }

                if (currentPercent >= targetPercent) {
                    clearInterval(interval);
                    resolve();
                }
            }, delay);
        });
    }

    showEmailGate() {
        if (this.emailGate && this.progressText) {
            this.progressText.textContent = 'Almost done! Just need your email...';
            this.emailGate.classList.remove('hidden');

            const emailForm = document.getElementById('emailForm');
            if (emailForm && !emailForm.dataset.listenerAttached) {
                emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));
                emailForm.dataset.listenerAttached = 'true';
            }
        }
    }

    setEmailError(message) {
        const errorEl = document.getElementById('emailError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.toggle('hidden', !message);
        }
    }

    setEmailLoading(loading) {
        const btn = document.getElementById('emailSubmitBtn');
        const spinner = document.getElementById('emailBtnSpinner');
        const btnText = document.getElementById('emailBtnText');

        if (btn) btn.disabled = loading;
        if (spinner) spinner.classList.toggle('hidden', !loading);
        if (btnText) btnText.textContent = loading ? 'Validating...' : 'Get My Roast Results';
    }

    async handleEmailSubmit(e) {
        e.preventDefault();

        const emailInput = document.getElementById('emailInput');
        const email = emailInput?.value?.trim();

        if (!email) return;

        this.setEmailError('');
        this.setEmailLoading(true);

        try {
            const response = await fetch('/api/capture-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                this.setEmailError(result.message || 'Invalid email. Please try again.');
                this.setEmailLoading(false);
                return;
            }

            this.emailCaptured = true;
            this.setEmailLoading(false);
            this.emailGate.classList.add('hidden');

            await this.waitForRoastAndRedirect(email);

        } catch (error) {
            console.error('Error validating email:', error);
            this.setEmailError('Something went wrong. Please try again.');
            this.setEmailLoading(false);
        }
    }

    async waitForRoastAndRedirect(email) {
        if (this.progressText) {
            this.progressText.textContent = 'Processing with AI...';
        }

        try {
            if (!this.roastResult) {
                await this.simulateProgress(85, 0.3);
                this.roastResult = await this.roastPromise;
            }

            await this.simulateProgress(100, 2);

            if (this.progressText) {
                this.progressText.textContent = 'Analysis complete! Redirecting...';
            }

            await new Promise(resolve => setTimeout(resolve, 600));
            this.hide();

            this.roastResult.success = true;
            localStorage.setItem('roastData', JSON.stringify(this.roastResult));
            window.location.href = 'roast-result.html';

        } catch (error) {
            console.error('Error during roast:', error);
            this.hide();

            localStorage.setItem('roastData', JSON.stringify({
                success: false,
                error: true,
                errorDetails: error.message
            }));
            window.location.href = 'roast-result.html';
        }
    }

    fireRoastRequest(file) {
        const formData = new FormData();
        formData.append('resume', file);

        return fetch('/api/roast', {
            method: 'POST',
            body: formData,
        }).then(async (response) => {
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ details: response.statusText }));
                throw new Error(errorData.details || 'Unknown server error');
            }
            return response.json();
        });
    }

    async startRoastProcess(file) {
        if (!file) {
            alert('Please select a resume first.');
            return;
        }

        this.currentFile = file;
        this.roastResult = null;
        this.emailCaptured = false;
        this.show();

        if (this.progressBar) this.progressBar.style.width = '0%';

        if (file.name === 'Engineering-Resume-Sample.pdf') {
            this.roastPromise = this.fireRoastRequest(file);
            await this.simulateProgress(70);
            if (this.progressText) {
                this.progressText.textContent = 'Processing with AI...';
            }
            try {
                this.roastResult = await this.roastPromise;
                await this.simulateProgress(100, 2);
                if (this.progressText) {
                    this.progressText.textContent = 'Analysis complete! Redirecting...';
                }
                await new Promise(resolve => setTimeout(resolve, 600));
                this.hide();

                this.roastResult.success = true;
                localStorage.setItem('roastData', JSON.stringify(this.roastResult));
                window.location.href = 'roast-result.html';
            } catch (error) {
                console.error('Error during sample roast:', error);
                this.hide();
                localStorage.setItem('roastData', JSON.stringify({
                    success: false,
                    error: true,
                    errorDetails: error.message
                }));
                window.location.href = 'roast-result.html';
            }
        } else {
            // Fire roast request immediately (runs in parallel)
            this.roastPromise = this.fireRoastRequest(file);

            // Capture the resolved result as soon as available
            this.roastPromise
                .then(result => { this.roastResult = result; })
                .catch(() => {});

            await this.simulateProgress(50);
            this.showEmailGate();
        }
    }
}
