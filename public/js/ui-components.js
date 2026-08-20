// UI Components and interactions
class UIComponents {
    constructor() {
        this.currentTab = 'before';
        this.currentTestimonial = 0;
        this.init();
    }

    init() {
        this.setupResumePreview();
        this.setupMobileMenu();
        this.setupTestimonials();
        this.setupFAQ();
        this.setupScrollAnimations();
        this.setupSampleButton();
        this.setupCtaButton();
        this.setupNavigationButtons();
    }

    setupResumePreview() {
        const beforeTab = document.getElementById('beforeTab');
        const afterTab = document.getElementById('afterTab');
        const beforeContent = document.getElementById('beforeContent');
        const afterContent = document.getElementById('afterContent');
        const roastProgress = document.getElementById('roastProgress');
        const starRating = document.getElementById('starRating');
        const ratingText = document.getElementById('ratingText');

        if (beforeTab && afterTab) {
            beforeTab.addEventListener('click', () => this.switchTab('before'));
            afterTab.addEventListener('click', () => this.switchTab('after'));
            this.updateRoastMeter('before');
        }
    }

    switchTab(tab) {
        const beforeTab = document.getElementById('beforeTab');
        const afterTab = document.getElementById('afterTab');
        const beforeContent = document.getElementById('beforeContent');
        const afterContent = document.getElementById('afterContent');
        
        if (!beforeTab || !afterTab || !beforeContent || !afterContent) return;
        
        this.currentTab = tab;
        beforeTab.classList.toggle('active', tab === 'before');
        afterTab.classList.toggle('active', tab === 'after');
        beforeContent.style.display = tab === 'before' ? 'block' : 'none';
        afterContent.style.display = tab === 'after' ? 'block' : 'none';
        this.updateRoastMeter(tab);
    }

    updateRoastMeter(tab) {
        const roastProgress = document.getElementById('roastProgress');
        const starRating = document.getElementById('starRating');
        const ratingText = document.getElementById('ratingText');
        
        if (!roastProgress || !starRating || !ratingText) return;
        
        const isBefore = tab === 'before';
        roastProgress.className = `roast-progress ${isBefore ? 'poor' : 'excellent'}`;
        setTimeout(() => {
            roastProgress.style.width = isBefore ? '35%' : '100%';
        }, 100);
        this.updateStarRating(isBefore ? 1 : 5);
        ratingText.innerHTML = isBefore ? 'Second Look (Maybe Pile)' : 'CEO Material (Hire Immediately!)';
        ratingText.style.color = isBefore ? '#dc2626' : '#16a34a';
    }

    updateStarRating(rating) {
        const starRating = document.getElementById('starRating');
        if (!starRating) return;
        
        starRating.querySelectorAll('.star').forEach((star, index) => {
            star.classList.toggle('filled', index < rating);
        });
    }

    setupMobileMenu() {
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        const closeMobileMenu = document.getElementById('close-mobile-menu');

        if (mobileMenuButton && mobileMenu && closeMobileMenu) {
            const setMenuOpen = (isOpen) => {
                mobileMenu.classList.toggle('open', isOpen);
                mobileMenuButton.setAttribute('aria-expanded', String(isOpen));
            };

            mobileMenuButton.addEventListener('click', () => setMenuOpen(true));
            closeMobileMenu.addEventListener('click', () => setMenuOpen(false));
            
            // Close menu when clicking nav links
            const mobileNavLinks = mobileMenu.querySelectorAll('.mobile-nav-link');
            mobileNavLinks.forEach(link => {
                link.addEventListener('click', () => setMenuOpen(false));
            });
        }
    }

    setupTestimonials() {
        const testimonials = document.querySelectorAll('.testimonial-card');
        
        if (testimonials.length > 0) {
            setInterval(() => this.rotateTestimonials(), 5000);
        }
    }

    rotateTestimonials() {
        const testimonials = document.querySelectorAll('.testimonial-card');
        if (testimonials.length === 0) return;
        
        testimonials.forEach((testimonial, index) => {
            testimonial.style.transform = index === this.currentTestimonial ? 'scale(1.05)' : 'scale(1)';
            testimonial.style.zIndex = index === this.currentTestimonial ? '10' : '1';
        });
        this.currentTestimonial = (this.currentTestimonial + 1) % testimonials.length;
    }

    setupFAQ() {
        const faqQuestions = document.querySelectorAll('.faq-question');
        faqQuestions.forEach(question => {
            question.addEventListener('click', function() {
                const answer = this.nextElementSibling;
                const chevron = this.querySelector('i');
                const wasOpen = !answer.classList.contains('hidden');

                // Close all answers
                document.querySelectorAll('.faq-answer').forEach(ans => {
                    if(ans !== answer) ans.classList.add('hidden');
                });
                document.querySelectorAll('.faq-question i').forEach(chev => {
                    if(chev !== chevron) chev.style.transform = 'rotate(0deg)';
                });

                // Open the clicked one
                answer.classList.toggle('hidden');
                if(chevron) chevron.style.transform = wasOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        });
    }

    setupScrollAnimations() {
        // Smooth scroll for anchor links
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });

        // Animate elements on scroll
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        document.querySelectorAll('.animate-on-scroll').forEach(el => {
            observer.observe(el);
        });

        // Update roast meter on scroll
        const resumePreview = document.getElementById('resumePreview');
        if (resumePreview) {
            const meterObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.updateRoastMeter(this.currentTab);
                    }
                });
            }, { threshold: 0.5 });
            meterObserver.observe(resumePreview);
        }
    }

    setupSampleButton() {
        const sampleButton = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.includes('Try Sample Resume')
        );
        if (sampleButton) {
            sampleButton.addEventListener('click', this.loadSampleResume);
        }
    }

    async loadSampleResume(event) {
        if (event) event.stopPropagation();
        try {
            const url = '/static/sample-resume/resume.pdf';
            console.log('Attempting to fetch sample resume from:', url);
            console.log('Full URL:', window.location.origin + url);
            
            const response = await fetch(url);
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);
            
            if (!response.ok) throw new Error(`Sample resume not found. Status: ${response.status}`);
            
            const blob = await response.blob();
            const sampleFile = new File([blob], 'Engineering-Resume-Sample.pdf', { type: 'application/pdf' });
            
            // Just load the file into the upload area, don't process it yet
            window.uploadHandler.handleFile(sampleFile);

        } catch (error) {
            console.error('Error loading sample resume:', error);
            alert(`Could not load the sample resume. Details: ${error.message}`);
        }
    }

    setupCtaButton() {
        const ctaButton = document.querySelector('.cta-btn');
        if (ctaButton) {
            ctaButton.addEventListener('click', () => {
                // Scroll to upload area first
                const uploadArea = document.getElementById('uploadArea');
                if (uploadArea) {
                    uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    
                    // After scrolling, trigger file picker
                    setTimeout(() => {
                        const fileInput = document.getElementById('fileInput');
                        if (fileInput) fileInput.click();
                    }, 800); // Wait for scroll to complete
                }
            });
        }
    }

    setupNavigationButtons() {
        const heroUploadButton = Array.from(document.querySelectorAll('button')).find(btn => 
            btn.textContent.includes('Upload Resume')
        );
        if (heroUploadButton) {
            heroUploadButton.addEventListener('click', () => {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.click();
            });
        }

        const pricingButtons = document.querySelectorAll('.pricing-btn');
        pricingButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                if (this.getAttribute('href') === '#uploadArea') {
                    e.preventDefault();
                    const target = document.querySelector(this.getAttribute('href'));
                    if (target) target.scrollIntoView({ behavior: 'smooth' });
                } else if (!this.getAttribute('href').startsWith('http')) {
                    // For non-external links that are not the upload area, show alert
                    e.preventDefault();
                    alert('This feature is coming soon! For now, enjoy unlimited free roasts.');
                }
            });
        });
    }
}

// Global function for sample resume loading
async function roastSampleResume(event) {
    const uiComponents = new UIComponents();
    await uiComponents.loadSampleResume(event);
}
