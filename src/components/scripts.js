document.addEventListener('DOMContentLoaded', function() {
    // --- Globals ---
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const loadingOverlay = document.getElementById('loadingOverlay');
    let currentFile = null;

    // --- File Handling and Roasting Logic ---

    function handleFile(file) {
        currentFile = file;
        if (!uploadArea) return;
        uploadArea.innerHTML = `
            <div class="space-y-6 text-center">
                <div class="w-24 h-24 mx-auto bg-green-100 rounded-full flex items-center justify-center relative">
                    <div class="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center">
                        <i class="fas fa-check text-3xl text-white"></i>
                    </div>
                </div>
                <div>
                    <p class="text-xl font-semibold text-gray-700">${file.name}</p>
                    <p class="text-lg text-green-600">Upload successful!</p>
                </div>
                <div class="flex flex-col sm:flex-row gap-3 justify-center">
                    <button id="roastBtn" class="btn-primary text-white px-8 py-3 rounded-lg font-semibold">
                        Roast This Resume <i class="fas fa-fire ml-2"></i>
                    </button>
                    <button id="removeBtn" class="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors">
                        <i class="fas fa-times mr-2"></i>Remove
                    </button>
                </div>
            </div>
        `;
        // Add event listeners to the new buttons
        document.getElementById('roastBtn').addEventListener('click', roastResume);
        document.getElementById('removeBtn').addEventListener('click', removeResume);
    }

    function resetUploadArea() {
        currentFile = null;
        if (!uploadArea) return;
        uploadArea.innerHTML = `
            <div class="space-y-6 text-center">
                <div class="w-24 h-24 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-file-pdf text-4xl text-orange-600"></i>
                </div>
                <div>
                    <p class="text-xl font-semibold text-gray-700">Drop your resume here</p>
                    <p class="text-lg text-gray-500">or click to browse</p>
                </div>
                <p class="text-base text-gray-400">PDF, DOCX, or TXT up to 10MB</p>
            </div>
        `;
        if (fileInput) fileInput.value = '';
    }
    
    function removeResume(event) {
        if (event) event.stopPropagation();
        resetUploadArea();
    }

    async function roastFile(file) {
        if (!file) {
            alert("No file available to roast.");
            return;
        }

        // Show progress modal
        showProgressModal();
        
        // Check if this is the sample resume file
        const isSample = file.name === 'Engineering-Resume-Sample.pdf';
        
        if (isSample) {
            // For sample resume, complete progress and process immediately
            await simulateProgress(100);
            await processResume(file);
        } else {
            // For user resume, stop at 50% and show email gate
            await simulateProgress(50);
            showEmailGate();
        }
    }

    function showProgressModal() {
        const progressModal = document.getElementById('progressModal');
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        const emailGate = document.getElementById('emailGate');
        
        if (progressModal) {
            progressModal.classList.remove('hidden');
            progressBar.style.width = '0%';
            progressText.textContent = 'Heating up the oven...';
            emailGate.classList.add('hidden');
        }
    }

    async function simulateProgress(targetPercent) {
        const progressBar = document.getElementById('progressBar');
        const progressText = document.getElementById('progressText');
        
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
                
                if (progressBar) {
                    progressBar.style.width = `${Math.min(currentPercent, targetPercent)}%`;
                }
                
                // Update message based on progress
                if (progressText) {
                    const messageIndex = Math.floor((currentPercent / targetPercent) * messages.length);
                    progressText.textContent = messages[Math.min(messageIndex, messages.length - 1)];
                }
                
                if (currentPercent >= targetPercent) {
                    clearInterval(interval);
                    resolve();
                }
            }, delay);
        });
    }

    function showEmailGate() {
        const emailGate = document.getElementById('emailGate');
        const progressText = document.getElementById('progressText');
        
        if (emailGate && progressText) {
            progressText.textContent = 'Almost done! Just need your email...';
            emailGate.classList.remove('hidden');
            
            // Setup email form handler
            const emailForm = document.getElementById('emailForm');
            if (emailForm) {
                emailForm.addEventListener('submit', handleEmailSubmit);
            }
        }
    }

    async function handleEmailSubmit(e) {
        e.preventDefault();
        
        const emailInput = document.getElementById('emailInput');
        const email = emailInput.value;
        
        if (!email) return;
        
        // Hide email gate and continue progress
        const emailGate = document.getElementById('emailGate');
        emailGate.classList.add('hidden');
        
        // Complete progress and process resume
        await simulateProgress(100);
        await processResume(currentFile, email);
    }

    async function processResume(file, email = null) {
        // Show final processing message
        const progressText = document.getElementById('progressText');
        if (progressText) {
            progressText.textContent = 'Processing with AI...';
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
            if (progressText) {
                progressText.textContent = 'Analysis complete! Redirecting...';
            }
            
            // Wait a moment before hiding modal
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Hide progress modal
            const progressModal = document.getElementById('progressModal');
            if (progressModal) {
                progressModal.classList.add('hidden');
            }
            
            // Add success flag to the result
            result.success = true;
            // Use localStorage to avoid URI length limits
            localStorage.setItem('roastData', JSON.stringify(result));
            window.location.href = 'roast-result.html';

        } catch (error) {
            console.error('Error roasting resume:', error);
            
            // Hide progress modal
            const progressModal = document.getElementById('progressModal');
            if (progressModal) {
                progressModal.classList.add('hidden');
            }
            
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

    function roastResume(event) {
        if (event) event.stopPropagation();
        roastFile(currentFile);
    }

    async function roastSampleResume(event) {
        if (event) event.stopPropagation();
        try {
            const response = await fetch('/static/sample-resume/resume.pdf');
            if (!response.ok) throw new Error('Sample resume not found.');
            
            const blob = await response.blob();
            const sampleFile = new File([blob], 'Engineering-Resume-Sample.pdf', { type: 'application/pdf' });
            
            // Just load the file into the upload area, don't process it yet
            handleFile(sampleFile);

        } catch (error) {
            console.error('Error loading sample resume:', error);
            alert(`Could not load the sample resume. Details: ${error.message}`);
        }
    }
    
    // --- Event Listeners Setup ---
    
    if (uploadArea) {
        uploadArea.addEventListener('click', (e) => {
            if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                if (fileInput) fileInput.click();
            }
        });
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length > 0) {
                handleFile(e.dataTransfer.files[0]);
            }
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleFile(e.target.files[0]);
            }
        });
    }

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

    const sampleButton = Array.from(document.querySelectorAll('button')).find(
        btn => btn.textContent.includes('Try Sample Resume')
    );
    if (sampleButton) {
        sampleButton.addEventListener('click', roastSampleResume);
    }
    
    const heroUploadButton = Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Upload Resume'));
    if(heroUploadButton) {
        heroUploadButton.addEventListener('click', () => {
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

    // CTA Button - Get Your Free Roast Now
    const ctaButton = document.querySelector('.cta-btn');
    if (ctaButton) {
        ctaButton.addEventListener('click', () => {
            // Scroll to upload area first
            const uploadArea = document.getElementById('uploadArea');
            if (uploadArea) {
                uploadArea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                
                // After scrolling, trigger file picker
                setTimeout(() => {
                    if (fileInput) fileInput.click();
                }, 800); // Wait for scroll to complete
            }
        });
    }


    // --- UI Components ---

    // Interactive Resume Preview
    const beforeTab = document.getElementById('beforeTab');
    const afterTab = document.getElementById('afterTab');
    const beforeContent = document.getElementById('beforeContent');
    const afterContent = document.getElementById('afterContent');
    const roastProgress = document.getElementById('roastProgress');
    const starRating = document.getElementById('starRating');
    const ratingText = document.getElementById('ratingText');
    let currentTab = 'before';

    function switchTab(tab) {
        if (!beforeTab || !afterTab || !beforeContent || !afterContent) return;
        currentTab = tab;
        beforeTab.classList.toggle('active', tab === 'before');
        afterTab.classList.toggle('active', tab === 'after');
        beforeContent.style.display = tab === 'before' ? 'block' : 'none';
        afterContent.style.display = tab === 'after' ? 'block' : 'none';
        updateRoastMeter(tab);
    }

    function updateRoastMeter(tab) {
        if (!roastProgress || !starRating || !ratingText) return;
        const isBefore = tab === 'before';
        roastProgress.className = `roast-progress ${isBefore ? 'poor' : 'excellent'}`;
        setTimeout(() => {
            roastProgress.style.width = isBefore ? '35%' : '100%';
        }, 100);
        updateStarRating(isBefore ? 1 : 5);
        ratingText.innerHTML = isBefore ? 'Second Look (Maybe Pile)' : 'CEO Material (Hire Immediately!)';
        ratingText.style.color = isBefore ? '#dc2626' : '#16a34a';
    }

    function updateStarRating(rating) {
        if (!starRating) return;
        starRating.querySelectorAll('.star').forEach((star, index) => {
            star.classList.toggle('filled', index < rating);
        });
    }

    if (beforeTab && afterTab) {
        beforeTab.addEventListener('click', () => switchTab('before'));
        afterTab.addEventListener('click', () => switchTab('after'));
        updateRoastMeter('before');
    }

    // Mobile Menu
    const mobileMenuButton = document.getElementById('mobile-menu-button');
    const mobileMenu = document.getElementById('mobile-menu');
    const closeMobileMenu = document.getElementById('close-mobile-menu');

    if (mobileMenuButton && mobileMenu && closeMobileMenu) {
        mobileMenuButton.addEventListener('click', () => mobileMenu.classList.add('open'));
        closeMobileMenu.addEventListener('click', () => mobileMenu.classList.remove('open'));
    }

    // Testimonial rotation
    let currentTestimonial = 0;
    const testimonials = document.querySelectorAll('.testimonial-card');
    
    function rotateTestimonials() {
        if(testimonials.length === 0) return;
        testimonials.forEach((testimonial, index) => {
            testimonial.style.transform = index === currentTestimonial ? 'scale(1.05)' : 'scale(1)';
            testimonial.style.zIndex = index === currentTestimonial ? '10' : '1';
        });
        currentTestimonial = (currentTestimonial + 1) % testimonials.length;
    }
    if (testimonials.length > 0) {
        setInterval(rotateTestimonials, 5000);
    }
    
    // FAQ Dropdown functionality
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
                    updateRoastMeter(currentTab);
                }
            });
        }, { threshold: 0.5 });
        meterObserver.observe(resumePreview);
    }
});
