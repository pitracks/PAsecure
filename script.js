// PASecure - ID Verification System JavaScript

// Global variables
let currentFile = null;
let isProcessing = false;
let mediaStream = null;
let currentUser = null;
let verificationSubscription = null;
let tfModel = null;
const CLASS_LABELS = [
    'senior_genuine',
    'senior_counterfeit',
    'pwd_genuine',
    'pwd_counterfeit'
];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    setupAccessibilityFeatures();
    initializeSupabase();
});

// Initialize Application
function initializeApp() {
    console.log('PASecure ID Verification System initialized');
    
    // Initialize tooltips and other UI elements
    initializeTooltips();
    
    // Setup file upload
    setupFileUpload();
    
    // Initialize FAQ functionality
    initializeFAQ();
    
    // Load system settings
    loadSystemSettings();
}

// Initialize Supabase
async function initializeSupabase() {
    try {
        // Wait for Supabase client to be ready
        while (!window.supabaseClient || !window.supabaseClient.initialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('Supabase client ready');
        
        // Check if user is already logged in
        try {
            const user = await window.supabaseClient.getCurrentUser();
            if (user) {
                currentUser = user;
                console.log('User already logged in:', user.email);
            }
        } catch (error) {
            console.warn('Auth check failed (this is normal for public users):', error.message);
        }
        
        // Setup real-time subscriptions
        setupRealTimeSubscriptions();
        
        // Wait for TensorFlow.js to load, then load the model
        await waitForTensorFlow();
        
        // Load TensorFlow.js model so it's ready before first verification
        try {
            await loadTfModel();
            console.log('TensorFlow.js model ready');
        } catch (modelErr) {
            console.error('Failed to load TensorFlow.js model:', modelErr);
            showNotification('AI model failed to load. Verifications will be unavailable until it is fixed.', 'error');
        }
        
    } catch (error) {
        console.error('Failed to initialize Supabase:', error);
        showNotification('Failed to connect to verification system. Please refresh the page.', 'error');
    }
}

// Load system settings
async function loadSystemSettings() {
    try {
        if (window.supabaseClient && window.supabaseClient.initialized) {
            const settings = await window.supabaseClient.getSettings();
            
            // Update configuration with database settings
            if (settings.confidence_threshold) {
                CONFIG.app.confidenceThreshold = parseInt(settings.confidence_threshold);
            }
            if (settings.max_file_size) {
                CONFIG.app.maxFileSize = parseInt(settings.max_file_size);
            }
            if (settings.allowed_file_types) {
                CONFIG.app.allowedFileTypes = settings.allowed_file_types.split(',');
            }
            
            console.log('System settings loaded:', settings);
        }
    } catch (error) {
        console.error('Failed to load system settings:', error);
    }
}

// Setup real-time subscriptions
function setupRealTimeSubscriptions() {
    try {
        // Subscribe to verification updates
        verificationSubscription = window.supabaseClient.subscribeToVerifications((payload) => {
            console.log('Verification update received:', payload);
            
            // Handle OCR completion
            if (payload.eventType === 'UPDATE' && payload.new.ocr_status === 'complete') {
                console.log('OCR completed, updating UI with extracted data:', payload.new);
                
                // Update the displayed results with OCR data
                const resultsSection = document.getElementById('resultsSection');
                const storedVerificationId = resultsSection?.dataset?.verificationId;
                
                if (storedVerificationId === payload.new.id) {
                    // Update the UI elements with correct selectors
                    const idNumberEl = document.getElementById('idNumber');
                    const nameEl = document.getElementById('holderName');
                    
                    if (idNumberEl && payload.new.detected_id_number) {
                        idNumberEl.textContent = payload.new.detected_id_number;
                    }
                    if (nameEl && payload.new.detected_holder_name) {
                        nameEl.textContent = payload.new.detected_holder_name;
                    }
                    
                    showNotification('OCR processing completed - ID details extracted', 'success');
                }
            }
            
            // Update UI if needed
            if (payload.eventType === 'INSERT' && payload.new.status === 'verified') {
                showNotification('New verification completed successfully', 'success');
            }
        });
        
        console.log('Real-time subscriptions established');
    } catch (error) {
        console.error('Failed to setup real-time subscriptions:', error);
    }
}

// Setup Event Listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });
    
    // File input
    const fileInput = document.getElementById('fileInput');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }

    // Scanner input
    const scannerFileInput = document.getElementById('scannerFileInput');
    if (scannerFileInput) {
        scannerFileInput.addEventListener('change', handleFileSelect);
    }
    
    // Upload area drag and drop
    const uploadArea = document.getElementById('uploadArea');
    if (uploadArea) {
        uploadArea.addEventListener('dragover', handleDragOver);
        uploadArea.addEventListener('dragleave', handleDragLeave);
        uploadArea.addEventListener('drop', handleDrop);
        uploadArea.addEventListener('click', () => fileInput.click());
    }

    // Mode switching
    document.querySelectorAll('.mode-tab').forEach(btn => {
        btn.addEventListener('click', () => switchInputMode(btn.dataset.mode));
    });

    // Camera controls
    const startCameraBtn = document.getElementById('startCameraBtn');
    const captureBtn = document.getElementById('captureBtn');
    const retakeBtn = document.getElementById('retakeBtn');
    if (startCameraBtn) startCameraBtn.addEventListener('click', startCamera);
    if (captureBtn) captureBtn.addEventListener('click', capturePhoto);
    if (retakeBtn) retakeBtn.addEventListener('click', retakePhoto);
}

// Navigation Handler
function handleNavigation(e) {
    e.preventDefault();
    const targetId = e.target.getAttribute('href').substring(1);
    scrollToSection(targetId);
    
    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.target.classList.add('active');
}

// Scroll to Section
function scrollToSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// File Upload Setup
function setupFileUpload() {
    const fileInput = document.getElementById('fileInput');
    const uploadArea = document.getElementById('uploadArea');
    
    if (!fileInput || !uploadArea) return;
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });
    
    // Highlight drop area when item is dragged over it
    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });
}

// Prevent Default Drag Behaviors
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// Highlight Upload Area
function highlight(e) {
    document.getElementById('uploadArea').classList.add('dragover');
}

// Unhighlight Upload Area
function unhighlight(e) {
    document.getElementById('uploadArea').classList.remove('dragover');
}

// Handle Drag Over
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.add('dragover');
}

// Handle Drag Leave
function handleDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
}

// Handle Drop
function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect({ target: { files: files } });
    }
}

// Handle File Selection
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type using config
    if (!CONFIG.app.allowedFileTypes.includes(file.type)) {
        showNotification(`Please select a valid file. Allowed types: ${CONFIG.app.allowedFileTypes.join(', ')}`, 'error');
        return;
    }
    
    // Validate file size using config
    if (file.size > CONFIG.app.maxFileSize) {
        const maxSizeMB = CONFIG.app.maxFileSize / (1024 * 1024);
        showNotification(`File size must be less than ${maxSizeMB}MB.`, 'error');
        return;
    }
    
    currentFile = file;
    processFile(file);
}

// Switch Input Mode (upload | camera | scanner)
function switchInputMode(mode) {
    // tabs
    document.querySelectorAll('.mode-tab').forEach(tab => {
        const active = tab.dataset.mode === mode;
        tab.classList.toggle('active', active);
        tab.setAttribute('aria-selected', String(active));
    });

    // panels
    const panels = {
        upload: document.getElementById('uploadArea'),
        camera: document.getElementById('cameraArea'),
        scanner: document.getElementById('scannerArea')
    };
    Object.entries(panels).forEach(([key, el]) => {
        if (!el) return;
        const isActive = key === mode;
        el.classList.toggle('active', isActive);
        el.setAttribute('aria-hidden', String(!isActive));
    });

    // manage camera lifecycle
    if (mode === 'camera') {
        // enable start button
        const startBtn = document.getElementById('startCameraBtn');
        const captureBtn = document.getElementById('captureBtn');
        const retakeBtn = document.getElementById('retakeBtn');
        if (startBtn) startBtn.disabled = false;
        if (captureBtn) captureBtn.disabled = true;
        if (retakeBtn) retakeBtn.disabled = true;
    } else {
        stopCamera();
    }
}

// Start camera
async function startCamera() {
    try {
        const constraints = { video: { facingMode: 'environment' } };
        mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

        const video = document.getElementById('cameraVideo');
        video.srcObject = mediaStream;
        await video.play();

        document.getElementById('captureBtn').disabled = false;
        document.getElementById('retakeBtn').disabled = true;
        document.getElementById('startCameraBtn').disabled = true;
    } catch (err) {
        console.error('Camera access error:', err);
        showNotification('Unable to access camera. Please allow camera permission or use Upload.', 'error');
    }
}

// Stop camera
function stopCamera() {
    if (mediaStream) {
        mediaStream.getTracks().forEach(t => t.stop());
        mediaStream = null;
    }
    const video = document.getElementById('cameraVideo');
    if (video) {
        video.srcObject = null;
    }
}

// Capture photo from video to a Blob and process as file
function capturePhoto() {
    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('cameraCanvas');
    if (!video || !canvas) return;

    const width = video.videoWidth;
    const height = video.videoHeight;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(blob => {
        if (!blob) return;
        const capturedFile = new File([blob], `camera-capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
        currentFile = capturedFile;

        // Pause camera preview and enable retake
        document.getElementById('retakeBtn').disabled = false;
        document.getElementById('captureBtn').disabled = true;

        // Stop camera to save resources before processing
        stopCamera();
        processFile(capturedFile);
    }, 'image/jpeg', 0.92);
}

// Retake photo
function retakePhoto() {
    const canvas = document.getElementById('cameraCanvas');
    if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    document.getElementById('retakeBtn').disabled = true;
    document.getElementById('captureBtn').disabled = false;
    document.getElementById('startCameraBtn').disabled = true;
    startCamera();
}

// Process File
async function processFile(file) {
    if (isProcessing) return;
    
    isProcessing = true;
    updateVerificationSteps(1);
    
    // Show loading state
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.innerHTML = `
        <div class="upload-content">
            <div class="loading"></div>
            <h3>Processing ID...</h3>
            <p>Please wait while we analyze your ID</p>
        </div>
    `;
    
    try {
        // Upload file to Supabase Storage
        const filePath = `verifications/${Date.now()}-${file.name}`;
        const uploadResult = await window.supabaseClient.uploadFile(file, filePath);
        
        updateVerificationSteps(2);
        
        // Create verification record
        const verificationData = {
            file_path: uploadResult.path,
            file_type: file.type,
            file_size: file.size,
            status: 'processing',
            ocr_status: 'pending'  // Mark for OCR processing
        };
        
        console.log('Creating verification record:', verificationData);
        const verification = await window.supabaseClient.createVerification(verificationData);
        console.log('Verification created:', verification);
        
        // Run CNN analysis
        try {
            console.log('Starting CNN analysis...');
            const modelResults = await runCNNAnalysis(file);
            console.log('CNN analysis completed:', modelResults);
            
            console.log('Updating verification in database...');
            const supabasePayload = {
                status: modelResults.status,
                confidence_score: modelResults.confidence_score,
                detected_id_type: modelResults.detected_id_type,
                detected_id_number: modelResults.detected_id_number,
                detected_holder_name: modelResults.detected_holder_name,
                security_features: modelResults.security_features,
                processing_time_ms: modelResults.processing_time_ms
            };
            const updateResult = await window.supabaseClient.updateVerification(verification.id, supabasePayload);
            console.log('Database update result:', updateResult);
            
            await window.supabaseClient.createLog('info', `CNN result ${modelResults.status} (${modelResults.confidence_score}%)`, { verification_id: verification.id });
            
            // Store verification ID for realtime updates
            modelResults.verification_id = verification.id;
            displayResults(modelResults);
        } catch (cnnErr) {
            console.error('CNN analysis failed:', cnnErr);
            await window.supabaseClient.updateVerification(verification.id, {
                status: 'failed'
            });
                await window.supabaseClient.createLog(
                'error',
                `CNN analysis failed: ${cnnErr?.message || cnnErr}`,
                { verification_id: verification.id }
            );
            showNotification('AI analysis failed. Please try again later.', 'error');
            throw cnnErr;
        }
        
        updateVerificationSteps(3);
        
    } catch (error) {
        console.error('Error processing file:', error);
        showNotification('Failed to process ID. Please try again.', 'error');
        resetUploadArea();
    } finally {
        isProcessing = false;
    }
}
// ===================== CNN (TF.js) Inference =====================
async function waitForTensorFlow() {
    // Wait for TensorFlow.js to be loaded from CDN
    let attempts = 0;
    const maxAttempts = 50; // 5 seconds max wait
    
    while ((typeof window.tf === 'undefined' || !window.tfReady) && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (typeof window.tf === 'undefined') {
        console.warn('TensorFlow.js not loaded after waiting. It may still load later.');
        return false;
    }
    
    // Make tf available globally
    if (typeof tf === 'undefined' && typeof window.tf !== 'undefined') {
        window.tf = window.tf; // Ensure it's accessible
    }
    
    // Wait for loadGraphModel to be available
    let apiAttempts = 0;
    while ((!window.tf.loadGraphModel && !window.tf.loadLayersModel) && apiAttempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 100));
        apiAttempts++;
    }
    
    console.log('TensorFlow.js detected, version:', window.tf?.version || 'unknown');
    console.log('loadGraphModel available:', typeof window.tf?.loadGraphModel);
    console.log('loadLayersModel available:', typeof window.tf?.loadLayersModel);
    return true;
}

async function loadTfModel() {
    if (tfModel) return tfModel;
    
    // Use window.tf if tf is not available globally
    const tf = window.tf || (typeof tf !== 'undefined' ? tf : null);
    
    if (!tf) {
        throw new Error('TensorFlow.js not loaded. Please refresh the page.');
    }
    
    // Wait a bit for TensorFlow.js to fully initialize
    let attempts = 0;
    while ((!tf.loadGraphModel && !tf.loadLayersModel) && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
    }
    
    if (typeof tf.loadGraphModel === 'undefined' && typeof tf.loadLayersModel === 'undefined') {
        throw new Error('TensorFlow.js API not available. Please refresh the page.');
    }
    
    const url = './web_model/model.json';
    try {
        console.log('Loading TensorFlow.js model from:', url);
        console.log('TensorFlow.js version:', tf.version);
        console.log('Available load functions:', {
            loadGraphModel: typeof tf.loadGraphModel,
            loadLayersModel: typeof tf.loadLayersModel
        });
        
        // Try loadGraphModel first (for SavedModel format)
        if (typeof tf.loadGraphModel === 'function') {
            tfModel = await tf.loadGraphModel(url);
            console.log('✅ TensorFlow.js model loaded successfully (GraphModel)!');
        } 
        // Fallback to loadLayersModel (for Keras format)
        else if (typeof tf.loadLayersModel === 'function') {
            tfModel = await tf.loadLayersModel(url);
            console.log('✅ TensorFlow.js model loaded successfully (LayersModel)!');
        } 
        else {
            throw new Error('No TensorFlow.js model loader available');
        }
        
        return tfModel;
    } catch (e) {
        console.error('❌ Failed to load TensorFlow.js model:', e);
        throw new Error('TF.js model not found at ' + url + ': ' + e.message);
    }
}

function preprocessImageToTensor(imgOrFile, target = 224) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!(imgOrFile instanceof Blob)) return reject(new Error('Expected Blob/File'));
            
            // Get tf reference
            const tf = window.tf || (typeof tf !== 'undefined' ? tf : null);
            if (!tf) {
                return reject(new Error('TensorFlow.js not loaded'));
            }
            
            const url = URL.createObjectURL(imgOrFile);
            const img = new Image();
            img.onload = () => {
                const t = tf.tidy(() => tf.browser.fromPixels(img)
                    .resizeBilinear([target, target])
                    .toFloat()
                    .div(255)
                    .expandDims(0));
                URL.revokeObjectURL(url);
                resolve(t);
            };
            img.onerror = () => reject(new Error('Failed to load image for tensor'));
            img.src = url;
        } catch (e) { reject(e); }
    });
}

async function runCNNAnalysis(file) {
    // Get tf reference
    const tf = window.tf || (typeof tf !== 'undefined' ? tf : null);
    if (!tf) {
        throw new Error('TensorFlow.js not loaded');
    }
        
    const model = await loadTfModel();
    const tensor = await preprocessImageToTensor(file, 224);
    let predictionTensor = null;
    const start = performance.now();

    try {
        if (typeof model.predict === 'function') {
            predictionTensor = model.predict(tensor);
        } else if (typeof model.execute === 'function') {
            predictionTensor = model.execute(tensor);
        } else {
            throw new Error('Unsupported TensorFlow.js model type');
        }

        const scoresTensor = Array.isArray(predictionTensor) ? predictionTensor[0] : predictionTensor;
        const scores = Array.from(await scoresTensor.data());
        const elapsed = Math.round(performance.now() - start);

        const bestScore = Math.max(...scores);
        const bestIndex = scores.indexOf(bestScore);
        const predictedLabel = CLASS_LABELS[bestIndex] || 'unknown';
        const isGenuine = predictedLabel.endsWith('_genuine');
        const detectedType = predictedLabel.startsWith('senior')
            ? 'senior_citizen'
            : predictedLabel.startsWith('pwd')
                ? 'pwd'
                : null;

        return {
            confidence_score: Math.round(bestScore * 100),
            status: isGenuine ? 'verified' : 'flagged',
            detected_id_type: detectedType,
            detected_id_number: null,
            detected_holder_name: null,
            security_features: [],
            processing_time_ms: elapsed,
            predicted_label: predictedLabel,
            raw_scores: scores
        };
    } finally {
        tensor.dispose();
        if (predictionTensor) {
            if (Array.isArray(predictionTensor)) {
                predictionTensor.forEach(t => t.dispose && t.dispose());
            } else if (predictionTensor.dispose) {
                predictionTensor.dispose();
            }
        }
    }
}


// Reset upload area to initial state
function resetUploadArea(hideResults = true) {
    const uploadArea = document.getElementById('uploadArea');
    uploadArea.innerHTML = `
        <div class="upload-content">
            <i class="fas fa-cloud-upload-alt upload-icon"></i>
            <h3>Upload ID Card</h3>
            <p>Drag and drop your ID image here or click to browse</p>
            <p class="upload-hint">Supported formats: JPG, PNG, PDF (Max 10MB)</p>
            <p class="upload-hint">Accepted IDs: Senior Citizen & PWD ID Cards only</p>
            <input type="file" id="fileInput" accept="image/*,.pdf" hidden>
            <button class="btn btn-primary" onclick="document.getElementById('fileInput').click()">
                <i class="fas fa-folder-open"></i>
                Choose File
            </button>
        </div>
    `;
    
    // Re-setup event listeners
    setupFileUpload();
    
    // Reset verification steps when clearing results entirely
    if (hideResults) {
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active');
    });
    document.querySelector('.step[data-step="1"]').classList.add('active');
    }
    
    // Hide results section if requested
    if (hideResults) {
    const resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'none';
    }
}
}

// Update Verification Steps
function updateVerificationSteps(activeStep, status = 'active') {
    document.querySelectorAll('.step').forEach((step, index) => {
        const stepNumber = index + 1;
        step.classList.remove('active', 'completed', 'error');
        
        if (stepNumber < activeStep) {
            step.classList.add('completed');
        } else if (stepNumber === activeStep) {
            step.classList.add(status);
        }
    });
}

// Display Results
function displayResults(results) {
    const resultsSection = document.getElementById('resultsSection');
    
    // Store verification ID for realtime updates
    if (results.verification_id) {
        resultsSection.dataset.verificationId = results.verification_id;
    }
    
    const confidenceScore = document.getElementById('scoreValue');
    const verificationStatus = document.getElementById('verificationStatus');
    const idType = document.getElementById('idType');
    const idNumber = document.getElementById('idNumber');
    const holderName = document.getElementById('holderName');
    const validity = document.getElementById('validity');
    
    // Update confidence score
    const confidence = results.confidence_score || 0;
    confidenceScore.textContent = confidence + '%';
    confidenceScore.style.color = confidence >= 90 ? '#28A745' : 
                                 confidence >= 80 ? '#FFC107' : '#DC3545';
    
    // Update verification status
    const isVerified = results.status === 'verified';
    if (isVerified) {
        verificationStatus.innerHTML = `
            <i class="fas fa-check-circle status-icon valid"></i>
            <div>
                <h4>ID Verified</h4>
                <p>This appears to be a genuine ID card</p>
            </div>
        `;
    } else {
        verificationStatus.innerHTML = `
            <i class="fas fa-times-circle status-icon invalid"></i>
            <div>
                <h4>ID Verification Failed</h4>
                <p>This ID may be counterfeit or invalid</p>
            </div>
        `;
    }
    
    // Update ID details and security features
    const idDetails = document.getElementById('idDetails');
    const securityFeatures = document.querySelector('.security-features');
    
    const detectedTypeText = results.detected_id_type ? formatIDType(results.detected_id_type) : '—';
    idType.textContent = detectedTypeText;
    idNumber.textContent = results.detected_id_number || '—';
    holderName.textContent = results.detected_holder_name || '—';
    validity.textContent = isVerified ? 'Valid until ' + generateFutureDate() : '—';

        const featuresGrid = document.querySelector('.features-grid');
        const securityFeaturesList = results.security_features || [];
    if (featuresGrid) {
        if (securityFeaturesList.length > 0) {
        featuresGrid.innerHTML = securityFeaturesList.map(feature => `
            <div class="feature-item">
                <i class="fas fa-shield-alt"></i>
                <span>${formatSecurityFeature(feature)}</span>
            </div>
        `).join('');
    } else {
            featuresGrid.innerHTML = '<div class="no-features">Security features not analyzed</div>';
        }
    }
    
    // Always show both sections
    if (idDetails) idDetails.style.display = 'block';
    if (securityFeatures) securityFeatures.style.display = 'block';
    
    // Show results section
    resultsSection.style.display = 'block';
    resultsSection.scrollIntoView({ behavior: 'smooth' });
    
    // Reset upload area
    resetUploadArea(false);
}

// Format ID Type
function formatIDType(type) {
    const typeMap = {
        'senior_citizen': 'Senior Citizen ID',
        'pwd': 'PWD ID'
    };
    return typeMap[type] || 'Unknown ID Type';
}

// Format Security Feature
function formatSecurityFeature(feature) {
    const featureMap = {
        'holographic_seal': 'Holographic Seal',
        'microprinting': 'Microprinting',
        'qr_code': 'QR Code',
        'watermark': 'Watermark'
    };
    return featureMap[feature] || feature;
}

// Verify Another ID
function verifyAnother() {
    // Reset all states
    currentFile = null;
    isProcessing = false;
    
    // Hide results
    document.getElementById('resultsSection').style.display = 'none';
    
    // Reset steps
    document.querySelectorAll('.step').forEach(step => {
        step.classList.remove('active', 'completed');
    });
    document.querySelector('.step[data-step="1"]').classList.add('active');
    
    // Reset upload area
    resetUploadArea();
    
    // Scroll to verification section
    scrollToSection('verify');
}

// Download Report
function downloadReport() {
    // Create a simple text report
    const report = generateReport();
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `passecure-verification-report-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Generate Report
function generateReport() {
    const confidenceScore = document.getElementById('scoreValue').textContent;
    const idType = document.getElementById('idType').textContent;
    const idNumber = document.getElementById('idNumber').textContent;
    const holderName = document.getElementById('holderName').textContent;
    const validity = document.getElementById('validity').textContent;
    
    return `PASecure ID Verification Report
Generated: ${new Date().toLocaleString()}

VERIFICATION RESULTS:
- ID Type: ${idType}
- ID Number: ${idNumber}
- Holder Name: ${holderName}
- Validity: ${validity}
- Confidence Score: ${confidenceScore}

This report was generated by PASecure, the official ID verification system of Pasig City.
For questions or concerns, contact: support@pasig.gov.ph
`;
}

// Initialize FAQ
function initializeFAQ() {
    document.querySelectorAll('.faq-question').forEach(question => {
        question.addEventListener('click', function() {
            const faqItem = this.parentElement;
            const isActive = faqItem.classList.contains('active');
            
            // Close all FAQ items
            document.querySelectorAll('.faq-item').forEach(item => {
                item.classList.remove('active');
            });
            
            // Toggle current item
            if (!isActive) {
                faqItem.classList.add('active');
            }
        });
    });
}

// Setup Accessibility Features
function setupAccessibilityFeatures() {
    // Font size toggle
    const fontSizeBtn = document.getElementById('fontSizeBtn');
    if (fontSizeBtn) {
        fontSizeBtn.addEventListener('click', toggleFontSize);
    }
    
    // High contrast toggle
    const contrastBtn = document.getElementById('contrastBtn');
    if (contrastBtn) {
        contrastBtn.addEventListener('click', toggleContrast);
    }
    
    // Voice assistant
    const voiceBtn = document.getElementById('voiceBtn');
    if (voiceBtn) {
        voiceBtn.addEventListener('click', toggleVoiceAssistant);
    }
}

// Toggle Font Size
function toggleFontSize() {
    document.body.classList.toggle('large-text');
    const btn = document.getElementById('fontSizeBtn');
    btn.classList.toggle('active');
    
    showNotification(
        document.body.classList.contains('large-text') ? 
        'Large text enabled' : 'Large text disabled', 
        'info'
    );
}

// Toggle High Contrast
function toggleContrast() {
    document.body.classList.toggle('high-contrast');
    const btn = document.getElementById('contrastBtn');
    btn.classList.toggle('active');
    
    showNotification(
        document.body.classList.contains('high-contrast') ? 
        'High contrast enabled' : 'High contrast disabled', 
        'info'
    );
}

// Toggle Voice Assistant
function toggleVoiceAssistant() {
    const btn = document.getElementById('voiceBtn');
    btn.classList.toggle('active');
    
    if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(
            'PASecure voice assistant activated. I can help you navigate the ID verification system.'
        );
        speechSynthesis.speak(utterance);
        
        showNotification('Voice assistant activated', 'info');
    } else {
        showNotification('Voice assistant not supported in this browser', 'error');
    }
}

// Initialize Tooltips
function initializeTooltips() {
    // Add tooltips to accessibility buttons
    const tooltips = {
        'fontSizeBtn': 'Increase Font Size',
        'contrastBtn': 'High Contrast Mode',
        'voiceBtn': 'Voice Assistant'
    };
    
    Object.entries(tooltips).forEach(([id, text]) => {
        const element = document.getElementById(id);
        if (element) {
            element.setAttribute('title', text);
        }
    });
}

// Show Notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
    `;
    
    // Add styles
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${getNotificationColor(type)};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        max-width: 300px;
    `;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .notification-content {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
    `;
    document.head.appendChild(style);
    
    // Add to page
    document.body.appendChild(notification);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Get Notification Icon
function getNotificationIcon(type) {
    const icons = {
        'success': 'check-circle',
        'error': 'times-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };
    return icons[type] || 'info-circle';
}

// Get Notification Color
function getNotificationColor(type) {
    const colors = {
        'success': '#28A745',
        'error': '#DC3545',
        'warning': '#FFC107',
        'info': '#17A2B8'
    };
    return colors[type] || '#17A2B8';
}

// Utility Functions
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Smooth scrolling for all anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Keyboard navigation support
document.addEventListener('keydown', function(e) {
    // ESC key to close modals or reset
    if (e.key === 'Escape') {
        verifyAnother();
    }
    
    // Enter key on upload area
    if (e.key === 'Enter' && e.target.id === 'uploadArea') {
        document.getElementById('fileInput').click();
    }
});

// Service Worker Registration (only if sw.js exists) + cleanup any old registrations
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async function() {
        try {
            const res = await fetch('/sw.js', { method: 'HEAD' });
            if (res.ok) {
                try {
                    await navigator.serviceWorker.register('/sw.js');
                console.log('ServiceWorker registration successful');
                } catch {
                    console.log('ServiceWorker registration failed, will skip');
                }
            } else {
                // If a SW was previously registered but the file no longer exists,
                // unregister it to avoid the 404 noise in console.
                const regs = await navigator.serviceWorker.getRegistrations();
                if (regs && regs.length) {
                    await Promise.all(regs.map(r => r.unregister().catch(() => {})));
                    console.log('ServiceWorker unregistered (sw.js not found)');
                } else {
                    console.log('ServiceWorker skipped: /sw.js not found');
                }
            }
        } catch {
            console.log('ServiceWorker skipped');
        }
    });
}

// Export functions for global access
window.scrollToSection = scrollToSection;
window.verifyAnother = verifyAnother;
window.downloadReport = downloadReport;
