document.addEventListener('DOMContentLoaded', function() {
    const loadingSpinner = document.getElementById('loading-spinner');
    const roastContent = document.getElementById('roast-content');
    const errorMessage = document.getElementById('error-message');
    const dynamicContent = document.getElementById('dynamic-roast-content');

    // Get data from localStorage
    const roastData = localStorage.getItem('roastData');
    
    if (roastData) {
        try {
            const data = JSON.parse(roastData);
            
            // Clear localStorage after reading
            localStorage.removeItem('roastData');
            
            if (data.error) {
                // Handle error case
                showError(data.errorDetails);
            } else if (data.success && data.html) {
                // Hide loading, show content
                loadingSpinner.style.display = 'none';
                roastContent.style.display = 'block';
                
                // Insert the AI-generated HTML directly
                dynamicContent.innerHTML = data.html;
                
                // Initialize roast tabs functionality
                initializeRoastTabs();
                
                // Scroll to top smoothly
                window.scrollTo({ top: 0, behavior: 'smooth' });
                
            } else {
                throw new Error('Invalid data format');
            }
        } catch (error) {
            console.error('Error parsing resume data:', error);
            showError(error.message);
        }
    } else {
        // No data provided, show error
        showError('No data provided');
    }
});

function showError(details) {
    document.getElementById('loading-spinner').style.display = 'none';
    document.getElementById('roast-content').style.display = 'none';
    document.getElementById('error-message').style.display = 'block';
    
    // Update error message if details provided
    if (details) {
        const errorElement = document.querySelector('#error-message p');
        if (errorElement) {
            errorElement.textContent = `We couldn't roast your resume. Details: ${details}`;
        }
    }
}

function initializeRoastTabs() {
    const tabs = document.querySelectorAll('.roast-tab');
    const contents = document.querySelectorAll('.roast-section-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const targetSection = this.getAttribute('data-section');
            
            // Remove active class from all tabs and contents
            tabs.forEach(t => t.classList.remove('active'));
            contents.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Show corresponding content
            const targetContent = document.getElementById(targetSection + '-content');
            if (targetContent) {
                targetContent.classList.add('active');
            }
        });
    });
}
