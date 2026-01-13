// Upload handling functionality
class UploadHandler {
    constructor() {
        this.currentFile = null;
        this.fileInput = document.getElementById('fileInput');
        this.uploadArea = document.getElementById('uploadArea');
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        if (this.uploadArea) {
            this.uploadArea.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
                    if (this.fileInput) this.fileInput.click();
                }
            });
            this.uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.uploadArea.classList.add('dragover');
            });
            this.uploadArea.addEventListener('dragleave', () => {
                this.uploadArea.classList.remove('dragover');
            });
            this.uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.uploadArea.classList.remove('dragover');
                if (e.dataTransfer.files.length > 0) {
                    this.handleFile(e.dataTransfer.files[0]);
                }
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }
    }

    handleFile(file) {
        if (!file) return;
        
        const validTypes = ['application/pdf'];
        if (!validTypes.includes(file.type)) {
            alert('Please upload a PDF file. DOC/DOCX files are not currently supported.');
            return;
        }
        
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB.');
            return;
        }
        
        this.currentFile = file;
        this.updateUploadArea(file);
    }

    updateUploadArea(file) {
        if (!this.uploadArea) return;
        
        this.uploadArea.innerHTML = `
            <div class="space-y-6">
                <!-- File Preview Container -->
                <div class="bg-green-50 p-6 rounded-lg border-2 border-green-200 relative">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <i class="fas fa-file-pdf text-2xl text-green-600"></i>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-700">${file.name}</p>
                            <p class="text-sm text-gray-500">${(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                    </div>
                    <!-- Remove button in top right corner -->
                    <button onclick="removeResume(event)" class="absolute top-3 right-3 text-gray-400 hover:text-red-500 transition-colors">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <!-- Action Buttons Below -->
                <div class="flex justify-center space-x-4">
                    <button onclick="roastResume(event)" class="bg-orange-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-orange-700 transition-colors shadow-lg">
                        Roast It! <i class="fas fa-fire ml-2"></i>
                    </button>
                    <button onclick="removeResume(event)" class="bg-gray-600 text-white px-6 py-4 rounded-lg font-semibold text-lg hover:bg-gray-700 transition-colors shadow-lg">
                        <i class="fas fa-trash mr-2"></i>Remove
                    </button>
                </div>
                
                <!-- Terms Notice -->
                <p class="text-center text-sm text-gray-500">
                    By uploading, you agree to our <a href="/terms.html" class="text-orange-600 hover:underline">Terms of Service</a>
                </p>
            </div>
        `;
    }

    resetUploadArea() {
        if (!this.uploadArea) return;
        
        this.uploadArea.innerHTML = `
            <div class="space-y-6">
                <div class="w-24 h-24 mx-auto bg-orange-100 rounded-full flex items-center justify-center">
                    <i class="fas fa-file-pdf text-4xl text-orange-600"></i>
                </div>
                <div>
                    <p class="text-xl font-semibold text-gray-700">Drop your resume here</p>
                    <p class="text-lg text-gray-500">or click to browse</p>
                </div>
                <p class="text-base text-gray-400">PDF files up to 10MB</p>
            </div>
        `;
        this.currentFile = null;
    }

    removeResume(event) {
        if (event) event.stopPropagation();
        this.resetUploadArea();
    }

    getCurrentFile() {
        return this.currentFile;
    }
}

// Global functions for backward compatibility
function handleFile(file) {
    window.uploadHandler.handleFile(file);
}

function removeResume(event) {
    window.uploadHandler.removeResume(event);
}

function roastResume(event) {
    if (event) event.stopPropagation();
    const progressModal = new ProgressModal();
    progressModal.startRoastProcess(window.uploadHandler.getCurrentFile());
} 