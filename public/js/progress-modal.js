// Progress modal functionality
class ProgressModal {
    constructor() {
        this.progressModal = document.getElementById('progressModal');
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        this.emailGate = document.getElementById('emailGate');
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

    async simulateProgress(targetPercent) {
        const messages = [
            'Initializing analysis...',
            'Reading your resume...',
            'Analyzing content structure...',
            'Checking formatting quality...',
            'Evaluating keyword usage...',
            'Preparing feedback...'
        ];
        
        let currentPercent = 0;
        const increment = 0.5; // Even slower increment
        const delay = 200; // Much longer delay
        
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                currentPercent += increment;
                
                if (this.progressBar) {
                    this.progressBar.style.width = `${Math.min(currentPercent, targetPercent)}%`;
                }
                
                // Update message based on progress
                if (this.progressText) {
                    const messageIndex = Math.floor((currentPercent / targetPercent) * messages.length);
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
            
            // Setup email form handler
            const emailForm = document.getElementById('emailForm');
            if (emailForm) {
                emailForm.addEventListener('submit', (e) => this.handleEmailSubmit(e));
            }
        }
    }

    async handleEmailSubmit(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('emailInput');
        const email = emailInput.value;
        
        if (!email) return;
        
        // Save email to database via API
        try {
            const response = await fetch('/api/capture-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: email })
            });
            
            const result = await response.json();
            if (result.success) {
                console.log('Email saved successfully:', result.message);
            } else {
                console.error('Failed to save email:', result.message);
            }
        } catch (error) {
            console.error('Error saving email:', error);
        }
        
        // Hide email gate and continue progress
        this.emailGate.classList.add('hidden');
        
        // Complete progress and process resume
        await this.simulateProgress(100);
        await this.processResume(this.currentFile, email);
    }

    async processResume(file, email = null) {
        // Show final processing message
        if (this.progressText) {
            this.progressText.textContent = 'Processing with AI...';
        }

        const formData = new FormData();
        formData.append('resume', file);
        if (email) {
            formData.append('email', email);
        }

        try {
            const response = await fetch('/api/roast', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ details: response.statusText }));
                throw new Error(errorData.details || 'Unknown server error');
            }

            const result = await response.json();
            
            // Show completion message briefly
            if (this.progressText) {
                this.progressText.textContent = 'Analysis complete! Redirecting...';
            }
            
            // Wait a moment before hiding modal
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Hide progress modal
            this.hide();
            
            // Add success flag to the result
            result.success = true;
            // Use localStorage to avoid URI length limits
            localStorage.setItem('roastData', JSON.stringify(result));
            window.location.href = 'roast-result.html';

        } catch (error) {
            console.error('Error roasting resume:', error);
            
            // Hide progress modal
            this.hide();
            
            // Pass error data
            const errorData = {
                success: false,
                error: true,
                errorDetails: error.message
            };
            localStorage.setItem('roastData', JSON.stringify(errorData));
            window.location.href = 'roast-result.html';
        }
    }

    async startRoastProcess(file) {
        if (!file) {
            alert('Please select a resume first.');
            return;
        }

        this.currentFile = file;
        this.show();

        // Check if it's a sample resume (bypasses email gate)
        if (file.name === 'Engineering-Resume-Sample.pdf') {
            // Sample resume - go straight to 100%
            await this.simulateProgress(100);
            await this.processResume(file);
        } else {
            // User resume - stop at 50% for email
            await this.simulateProgress(50);
            this.showEmailGate();
        }
    }
} 