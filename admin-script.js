// PASecure Admin Dashboard JavaScript

// Global variables
let charts = {};
let currentSection = 'dashboard';
let currentUser = null;
let verificationData = [];
let systemLogs = [];

// DOM Content Loaded
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminDashboard();
    setupAdminEventListeners();
    initializeCharts();
    startRealTimeUpdates();
    initializeSupabaseAdmin();
});

// Initialize Admin Dashboard
function initializeAdminDashboard() {
    console.log('PASecure Admin Dashboard initialized');
    
    // Initialize tooltips
    initializeAdminTooltips();
    
    // Setup real-time data updates
    setupRealTimeData();
    
    // Initialize settings
    initializeSettings();
}

// Initialize Supabase for Admin
async function initializeSupabaseAdmin() {
    try {
        // Wait for Supabase client to be ready
        while (!window.supabaseClient || !window.supabaseClient.initialized) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        console.log('Supabase client ready for admin');
        
        // Check authentication
        const user = await window.supabaseClient.getCurrentUser();
        if (!user) {
            // For demo purposes, try to load data anyway
            console.log('No user authenticated, loading data in demo mode');
            currentUser = { id: 'demo-user', email: 'demo@pasig.gov.ph', role: 'admin' };
        } else {
            currentUser = user;
            console.log('Admin user logged in:', user.email);
        }
        
        // Load initial data
        await loadInitialData();
        
        // Setup real-time subscriptions
        setupAdminRealTimeSubscriptions();
        
    } catch (error) {
        console.error('Failed to initialize Supabase admin:', error);
        showNotification('Failed to connect to admin system. Please refresh the page.', 'error');
    }
}

// Load initial data
async function loadInitialData() {
    try {
        console.log('Loading initial data...');
        
        // Try direct API first (most reliable)
        console.log('Loading verification data via direct API...');
        verificationData = await loadVerificationDataAPI();
        console.log('Verification data loaded:', verificationData);
        
        // Load system logs via direct API
        console.log('Loading system logs via direct API...');
        systemLogs = await loadSystemLogsAPI();
        console.log('System logs loaded:', systemLogs);
        
        // Update dashboard with real data
        updateDashboardWithRealData();
        
        console.log('Initial data loaded successfully');
    } catch (error) {
        console.error('Failed to load initial data:', error);
        showNotification('Failed to load data: ' + error.message, 'error');
    }
}

// Direct database query fallback
async function loadVerificationDataDirect() {
    try {
        // Try Supabase client first
        if (window.supabaseClient && window.supabaseClient.supabase) {
            const { data, error } = await window.supabaseClient.supabase
                .from('verifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);
            
            if (error) {
                console.error('Direct query error:', error);
                return await loadVerificationDataAPI();
            }
            
            console.log('Direct query successful:', data);
            return data || [];
        } else {
            // Fallback to direct API call
            return await loadVerificationDataAPI();
        }
    } catch (error) {
        console.error('Direct query failed:', error);
        return await loadVerificationDataAPI();
    }
}

// Direct API call for verifications
async function loadVerificationDataAPI() {
    try {
        console.log('Loading verifications via direct API...');
        
        const response = await fetch('https://jkrotqcstjnrmhxyturv.supabase.co/rest/v1/verifications?select=*&order=created_at.desc&limit=100', {
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprcm90cWNzdGpucm1oeHl0dXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDI3MzYsImV4cCI6MjA3NjUxODczNn0.UT7NwWLKAtb-1E2ps9q079zP96XX6iXzle9KZ3ZkF5g',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprcm90cWNzdGpucm1oeHl0dXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDI3MzYsImV4cCI6MjA3NjUxODczNn0.UT7NwWLKAtb-1E2ps9q079zP96XX6iXzle9KZ3ZkF5g',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Verifications API call successful:', data);
        return data || [];
    } catch (error) {
        console.error('Verifications API call failed:', error);
        return [];
    }
}

// Direct API call for system logs
async function loadSystemLogsAPI() {
    try {
        console.log('Loading system logs via direct API...');
        
        const response = await fetch('https://jkrotqcstjnrmhxyturv.supabase.co/rest/v1/system_logs?select=*&order=created_at.desc&limit=100', {
            headers: {
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprcm90cWNzdGpucm1oeHl0dXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDI3MzYsImV4cCI6MjA3NjUxODczNn0.UT7NwWLKAtb-1E2ps9q079zP96XX6iXzle9KZ3ZkF5g',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprcm90cWNzdGpucm1oeHl0dXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDI3MzYsImV4cCI6MjA3NjUxODczNn0.UT7NwWLKAtb-1E2ps9q079zP96XX6iXzle9KZ3ZkF5g',
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('System logs API call successful:', data);
        return data || [];
    } catch (error) {
        console.error('System logs API call failed:', error);
        return [];
    }
}

// Setup admin real-time subscriptions
function setupAdminRealTimeSubscriptions() {
    try {
        // Subscribe to verification updates
        window.supabaseClient.subscribeToVerifications((payload) => {
            console.log('Admin verification update:', payload);
            
            if (payload.eventType === 'INSERT') {
                verificationData.unshift(payload.new);
                updateVerificationTable(verificationData.slice(0, 50));
                updateDashboardWithRealData();
            } else if (payload.eventType === 'UPDATE') {
                const index = verificationData.findIndex(v => v.id === payload.new.id);
                if (index !== -1) {
                    verificationData[index] = payload.new;
                    updateVerificationTable(verificationData.slice(0, 50));
                    updateDashboardWithRealData();
                }
            }
        });
        
        // Subscribe to system logs
        window.supabaseClient.subscribeToLogs((payload) => {
            console.log('Admin log update:', payload);
            
            if (payload.eventType === 'INSERT') {
                systemLogs.unshift(payload.new);
                updateLogsDisplay(systemLogs.slice(0, 100));
            }
        });
        
        console.log('Admin real-time subscriptions established');
    } catch (error) {
        console.error('Failed to setup admin real-time subscriptions:', error);
    }
}

// Show login modal
function showLoginModal() {
    // Create a simple login modal
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
        <div class="login-content">
            <h2>Admin Login</h2>
            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email:</label>
                    <input type="email" id="adminEmail" required>
                </div>
                <div class="form-group">
                    <label for="password">Password:</label>
                    <input type="password" id="adminPassword" required>
                </div>
                <button type="submit" class="btn btn-primary">Login</button>
            </form>
        </div>
    `;
    
    // Add styles
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    const content = modal.querySelector('.login-content');
    content.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 8px;
        width: 400px;
        max-width: 90%;
    `;
    
    document.body.appendChild(modal);
    
    // Handle login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('adminEmail').value;
        const password = document.getElementById('adminPassword').value;
        
        try {
            await window.supabaseClient.signIn(email, password);
            currentUser = await window.supabaseClient.getCurrentUser();
            document.body.removeChild(modal);
            await loadInitialData();
            setupAdminRealTimeSubscriptions();
        } catch (error) {
            showNotification('Login failed: ' + error.message, 'error');
        }
    });
}

// Setup Admin Event Listeners
function setupAdminEventListeners() {
    // Navigation
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.addEventListener('click', handleAdminNavigation);
    });
    
    // Settings
    const confidenceThreshold = document.getElementById('confidenceThreshold');
    if (confidenceThreshold) {
        confidenceThreshold.addEventListener('input', updateConfidenceThreshold);
    }
    
    // Table actions
    document.querySelectorAll('.btn-icon').forEach(btn => {
        btn.addEventListener('click', handleTableAction);
    });
    
    // Export buttons
    document.querySelectorAll('button[onclick*="Export"]').forEach(btn => {
        btn.addEventListener('click', handleExport);
    });
}

// Handle Admin Navigation
function handleAdminNavigation(e) {
    e.preventDefault();
    const targetSection = e.target.getAttribute('data-section');
    
    // Update active nav link
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    e.target.classList.add('active');
    
    // Show target section
    showAdminSection(targetSection);
}

// Show Admin Section
function showAdminSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show target section
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
        currentSection = sectionId;
        
        // Initialize section-specific features
        initializeSectionFeatures(sectionId);
    }
}

// Initialize Section Features
function initializeSectionFeatures(sectionId) {
    switch (sectionId) {
        case 'dashboard':
            updateDashboardData();
            break;
        case 'analytics':
            updateAnalyticsCharts();
            break;
        case 'insights':
            updateInsights();
            break;
        case 'verifications':
            // Render using the real data already loaded
            if (Array.isArray(verificationData) && verificationData.length) {
                updateVerificationTable(verificationData.slice(0, 50));
            } else {
                // Fallback: trigger a refresh to load data, then render
                loadInitialData().then(() => {
                    if (Array.isArray(verificationData) && verificationData.length) {
                        updateVerificationTable(verificationData.slice(0, 50));
                    }
                });
            }
            break;
        case 'users':
            loadUserData();
            break;
        case 'settings':
            loadSettingsData();
            break;
        case 'logs':
            loadSystemLogs();
            break;
    }
}

// Initialize Charts
function initializeCharts() {
    // Check if Chart.js is loaded
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js not loaded, skipping chart initialization');
        showChartFallbacks();
        return;
    }
    
    // Verification Trends Chart
    const verificationCtx = document.getElementById('verificationChart');
    if (verificationCtx) {
        try {
            charts.verification = new Chart(verificationCtx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Verifications',
                    data: [120, 190, 300, 500, 200, 300, 450],
                    borderColor: '#1A428A',
                    backgroundColor: 'rgba(26, 66, 138, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        } catch (error) {
            console.error('Error initializing verification chart:', error);
        }
    }
    
    // ID Type Distribution Chart
    const idTypeCtx = document.getElementById('idTypeChart');
    if (idTypeCtx) {
        try {
            charts.idType = new Chart(idTypeCtx, {
            type: 'doughnut',
            data: {
                labels: ['Senior Citizen', 'PWD'],
                datasets: [{
                    data: [65, 35],
                    backgroundColor: ['#1A428A', '#2A82E0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
        } catch (error) {
            console.error('Error initializing ID type chart:', error);
        }
    }
    
    // Daily Volume Chart
    const dailyVolumeCtx = document.getElementById('dailyVolumeChart');
    if (dailyVolumeCtx) {
        try {
            charts.dailyVolume = new Chart(dailyVolumeCtx, {
            type: 'bar',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Verifications',
                    data: [1200, 1900, 3000, 2500],
                    backgroundColor: '#1A428A'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        } catch (error) {
            console.error('Error initializing daily volume chart:', error);
        }
    }
    
    // Success Rate Chart
    const successRateCtx = document.getElementById('successRateChart');
    if (successRateCtx) {
        try {
            charts.successRate = new Chart(successRateCtx, {
            type: 'bar',
            data: {
                labels: ['Senior Citizen', 'PWD'],
                datasets: [{
                    label: 'Success Rate (%)',
                    data: [98.5, 99.1],
                    backgroundColor: ['#28A745', '#2A82E0']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
        } catch (error) {
            console.error('Error initializing success rate chart:', error);
        }
    }
    
    // Processing Time Chart
    const processingTimeCtx = document.getElementById('processingTimeChart');
    if (processingTimeCtx) {
        try {
            charts.processingTime = new Chart(processingTimeCtx, {
            type: 'line',
            data: {
                labels: ['0-1s', '1-2s', '2-3s', '3-4s', '4-5s', '5s+'],
                datasets: [{
                    label: 'Count',
                    data: [150, 300, 200, 100, 50, 25],
                    borderColor: '#1A428A',
                    backgroundColor: 'rgba(26, 66, 138, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
        } catch (error) {
            console.error('Error initializing processing time chart:', error);
        }
    }
}

// Show Chart Fallbacks
function showChartFallbacks() {
    const chartContainers = document.querySelectorAll('.chart-container canvas');
    chartContainers.forEach(canvas => {
        const container = canvas.parentElement;
        container.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 300px; background-color: #f8f9fa; border-radius: 8px; color: #6c757d;">
                <div style="text-align: center;">
                    <i class="fas fa-chart-bar" style="font-size: 2rem; margin-bottom: 1rem; color: #1A428A;"></i>
                    <p>Chart visualization temporarily unavailable</p>
                    <small>Data is still being collected and processed</small>
                </div>
            </div>
        `;
    });
}

// Update Dashboard Data
function updateDashboardData() {
    // Use real data from verificationData
    const stats = calculateVerificationStats(verificationData);
    
    // Update stat cards
    document.getElementById('totalVerifications').textContent = stats.total.toLocaleString();
    document.getElementById('successRate').textContent = stats.successRate.toFixed(1) + '%';
    document.getElementById('flaggedIds').textContent = stats.flagged;
    document.getElementById('avgProcessingTime').textContent = stats.avgProcessingTime.toFixed(1) + 's';
    
    // Update recent activity
    updateRecentActivity();
}

// Calculate verification stats from real data
function calculateVerificationStats(data) {
    const total = data.length;
    const verified = data.filter(v => v.status === 'verified').length;
    const flagged = data.filter(v => v.status === 'flagged').length;
    const failed = data.filter(v => v.status === 'failed').length;
    const pending = data.filter(v => v.status === 'pending' || v.status === 'processing').length;
    
    const successRate = total > 0 ? (verified / total) * 100 : 0;
    
    // Calculate average processing time
    const processingTimes = data
        .filter(v => v.processing_time_ms)
        .map(v => v.processing_time_ms);
    const avgProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length / 1000
        : 0;
    
    return {
        total,
        verified,
        flagged,
        failed,
        pending,
        successRate,
        avgProcessingTime
    };
}

// Update dashboard with real data
function updateDashboardWithRealData() {
    console.log('Updating dashboard with real data...');
    console.log('Verification data:', verificationData);
    
    if (!verificationData || verificationData.length === 0) {
        console.log('No verification data available for dashboard update');
        return;
    }

    updateDashboardData();
    updateAnalyticsCharts();
    updateVerificationTable(verificationData.slice(0, 50));
    updateLogsDisplay(systemLogs.slice(0, 100));
    
    console.log('Dashboard updated successfully');
}

// Update Recent Activity
function updateRecentActivity() {
    // Get recent verifications (last 10)
    const recentVerifications = verificationData
        .slice(0, 10)
        .map(verification => {
            const timeAgo = getTimeAgo(verification.created_at);
            const idNumber = verification.detected_id_number || 'Unknown';
            const holderName = verification.detected_holder_name || 'Unknown';
            
            let type, message;
            switch (verification.status) {
                case 'verified':
                    type = 'success';
                    message = `ID Verified: ${idNumber} - ${holderName}`;
                    break;
                case 'flagged':
                    type = 'warning';
                    message = `Flagged ID: ${idNumber} - ${holderName}`;
                    break;
                case 'failed':
                    type = 'error';
                    message = `Processing Error: ${idNumber} - ${holderName}`;
                    break;
                case 'processing':
                    type = 'info';
                    message = `Processing: ${idNumber} - ${holderName}`;
                    break;
                default:
                    type = 'info';
                    message = `ID ${verification.status}: ${idNumber} - ${holderName}`;
            }
            
            return {
                type,
                message,
                time: timeAgo
            };
        });
    
    const activityList = document.querySelector('.activity-list');
    if (activityList) {
        activityList.innerHTML = recentVerifications.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="fas fa-${getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <p><strong>${activity.message}</strong></p>
                    <span class="activity-time">${activity.time}</span>
                </div>
            </div>
        `).join('');
    }
}

// Get time ago string
function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Just now';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }
}

// Get Activity Icon
function getActivityIcon(type) {
    const icons = {
        'success': 'check',
        'warning': 'exclamation',
        'error': 'times'
    };
    return icons[type] || 'info';
}

// Update Analytics Charts
function updateAnalyticsCharts() {
    // Update charts with real data
    if (charts.verification) {
        const trendData = calculateVerificationTrends(verificationData);
        charts.verification.data.datasets[0].data = trendData;
        charts.verification.update();
    }
    
    if (charts.idType) {
        const idTypeStats = calculateIDTypeDistribution(verificationData);
        charts.idType.data.datasets[0].data = [idTypeStats.seniorCitizen, idTypeStats.pwd];
        charts.idType.update();
    }
    
    if (charts.dailyVolume) {
        const dailyData = calculateDailyVolume(verificationData);
        charts.dailyVolume.data.datasets[0].data = dailyData;
        charts.dailyVolume.update();
    }
    
    if (charts.successRate) {
        const successData = calculateSuccessRateByType(verificationData);
        charts.successRate.data.datasets[0].data = [successData.seniorCitizen, successData.pwd];
        charts.successRate.update();
    }
    
    if (charts.processingTime) {
        const processingData = calculateProcessingTimeDistribution(verificationData);
        charts.processingTime.data.datasets[0].data = processingData;
        charts.processingTime.update();
    }
}

// Calculate verification trends for the last 7 days
function calculateVerificationTrends(data) {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
    });
    
    return last7Days.map(date => {
        return data.filter(v => v.created_at.startsWith(date)).length;
    });
}

// Calculate ID type distribution
function calculateIDTypeDistribution(data) {
    const total = data.length;
    const seniorCitizen = data.filter(v => v.detected_id_type === 'senior_citizen').length;
    const pwd = data.filter(v => v.detected_id_type === 'pwd').length;
    
    return {
        seniorCitizen: total > 0 ? Math.round((seniorCitizen / total) * 100) : 0,
        pwd: total > 0 ? Math.round((pwd / total) * 100) : 0
    };
}

// Calculate daily volume for the last 4 weeks
function calculateDailyVolume(data) {
    const last4Weeks = Array.from({ length: 4 }, (_, i) => {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (28 - (i * 7)));
        return weekStart.toISOString().split('T')[0];
    });
    
    return last4Weeks.map(weekStart => {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        return data.filter(v => {
            const createdDate = new Date(v.created_at);
            return createdDate >= new Date(weekStart) && createdDate <= weekEnd;
        }).length;
    });
}

// Calculate success rate by ID type
function calculateSuccessRateByType(data) {
    const seniorCitizenData = data.filter(v => v.detected_id_type === 'senior_citizen');
    const pwdData = data.filter(v => v.detected_id_type === 'pwd');
    
    const seniorCitizenSuccess = seniorCitizenData.length > 0 
        ? (seniorCitizenData.filter(v => v.status === 'verified').length / seniorCitizenData.length) * 100
        : 0;
    
    const pwdSuccess = pwdData.length > 0 
        ? (pwdData.filter(v => v.status === 'verified').length / pwdData.length) * 100
        : 0;
    
    return {
        seniorCitizen: Math.round(seniorCitizenSuccess * 10) / 10,
        pwd: Math.round(pwdSuccess * 10) / 10
    };
}

// Calculate processing time distribution
function calculateProcessingTimeDistribution(data) {
    const timeRanges = ['0-1s', '1-2s', '2-3s', '3-4s', '4-5s', '5s+'];
    const counts = [0, 0, 0, 0, 0, 0];
    
    data.forEach(v => {
        if (v.processing_time_ms) {
            const seconds = v.processing_time_ms / 1000;
            if (seconds <= 1) counts[0]++;
            else if (seconds <= 2) counts[1]++;
            else if (seconds <= 3) counts[2]++;
            else if (seconds <= 4) counts[3]++;
            else if (seconds <= 5) counts[4]++;
            else counts[5]++;
        }
    });
    
    return counts;
}

// Load Verification Data
function loadVerificationData() {
    // Simulate loading verification data
    console.log('Loading verification data...');
    
    // In a real application, this would fetch data from an API
    const verificationData = generateVerificationData();
    updateVerificationTable(verificationData);
}

// Generate Verification Data
function generateVerificationData() {
    const data = [];
    const names = ['Juan Dela Cruz', 'Maria Santos', 'Jose Reyes', 'Ana Garcia', 'Pedro Lopez'];
    const types = ['Senior Citizen', 'PWD'];
    const statuses = ['verified', 'flagged', 'failed'];
    
    for (let i = 0; i < 20; i++) {
        data.push({
            idNumber: `SC-2024-${String(i + 1).padStart(6, '0')}`,
            holderName: names[Math.floor(Math.random() * names.length)],
            type: types[Math.floor(Math.random() * types.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            confidence: Math.floor(Math.random() * 40) + 60,
            dateTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        });
    }
    
    return data;
}

// Update Verification Table
function updateVerificationTable(data) {
    const tbody = document.querySelector('.admin-table tbody');
    if (!tbody) {
        console.error('Verification table body not found');
        return;
    }

    if (!data || data.length === 0) {
        console.log('No verification data available');
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No verification data available</td></tr>';
        return;
    }

    console.log('Updating verification table with', data.length, 'records');

    tbody.innerHTML = data.map((item, index) => {
        // Format the data properly with better fallbacks
        const idNumber = item.detected_id_number || item.id_number || 'N/A';
        const holderName = item.detected_holder_name || item.holder_name || 'N/A';
        const idType = item.detected_id_type || item.id_type || 'Unknown';
        const status = item.status || 'Unknown';
        const confidence = item.confidence_score ? `${item.confidence_score}%` : 'N/A';
        const createdAt = item.created_at ? new Date(item.created_at).toLocaleString() : 'Invalid Date';
        
        console.log(`Row ${index + 1}:`, {
            idNumber,
            holderName,
            idType,
            status,
            confidence,
            createdAt
        });
        
        return `
            <tr>
                <td>${idNumber}</td>
                <td>${holderName}</td>
                <td>${formatIDType(idType)}</td>
                <td><span class="status-badge ${status.toLowerCase()}">${status.toUpperCase()}</span></td>
                <td>${confidence}</td>
                <td>${createdAt}</td>
                <td>
                    <button class="btn-icon" title="View Details" onclick="viewVerificationDetails('${item.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-icon" title="Download Report" onclick="downloadVerificationReport('${item.id}')">
                        <i class="fas fa-download"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Format ID Type for display
function formatIDType(type) {
    const typeMap = {
        'senior_citizen': 'Senior Citizen',
        'pwd': 'PWD'
    };
    return typeMap[type] || 'Unknown';
}

// Load User Data
function loadUserData() {
    console.log('Loading user data...');
    // In a real application, this would fetch user data from an API
}

// Load Settings Data
function loadSettingsData() {
    console.log('Loading settings data...');
    // In a real application, this would load current settings from an API
}

// Load System Logs
function loadSystemLogs() {
    console.log('Loading system logs...');
    
    const logs = generateSystemLogs();
    updateLogsDisplay(logs);
}

// Generate System Logs
function generateSystemLogs() {
    const logTypes = ['error', 'warning', 'info'];
    const messages = [
        'CNN model processing failed for ID',
        'Low confidence score detected for',
        'ID verification completed successfully for',
        'System maintenance completed',
        'New user registered',
        'Database backup completed',
        'Security alert triggered'
    ];
    
    const logs = [];
    for (let i = 0; i < 50; i++) {
        const type = logTypes[Math.floor(Math.random() * logTypes.length)];
        const message = messages[Math.floor(Math.random() * messages.length)];
        const idNumber = `SC-2024-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`;
        
        logs.push({
            time: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
            level: type,
            message: `${message} ${idNumber}`
        });
    }
    
    return logs.sort((a, b) => new Date(b.time) - new Date(a.time));
}

// Update Logs Display
function updateLogsDisplay(logs) {
    const logsContainer = document.querySelector('.logs-container');
    if (logsContainer) {
        logsContainer.innerHTML = logs.map(log => `
            <div class="log-entry ${log.level}">
                <span class="log-time">${new Date(log.created_at).toLocaleString()}</span>
                <span class="log-level">${log.level.toUpperCase()}</span>
                <span class="log-message">${log.message}</span>
            </div>
        `).join('');
    }
}

// Initialize Settings
function initializeSettings() {
    const confidenceThreshold = document.getElementById('confidenceThreshold');
    const thresholdValue = document.getElementById('thresholdValue');
    
    if (confidenceThreshold && thresholdValue) {
        confidenceThreshold.addEventListener('input', function() {
            thresholdValue.textContent = this.value + '%';
        });
    }
}

// Update Confidence Threshold
function updateConfidenceThreshold(e) {
    const value = e.target.value;
    const thresholdValue = document.getElementById('thresholdValue');
    if (thresholdValue) {
        thresholdValue.textContent = value + '%';
    }
    
    // In a real application, this would update the system settings
    console.log('Confidence threshold updated to:', value + '%');
}

// Handle Table Action
function handleTableAction(e) {
    const action = e.target.closest('.btn-icon').title;
    const row = e.target.closest('tr');
    const idNumber = row.querySelector('td:first-child').textContent;
    
    switch (action) {
        case 'View Details':
            viewVerificationDetails(idNumber);
            break;
        case 'Download Report':
            downloadVerificationReport(idNumber);
            break;
        case 'Edit':
            editUser(idNumber);
            break;
        case 'Delete':
            deleteUser(idNumber);
            break;
    }
}

// View Verification Details
function viewVerificationDetails(idNumber) {
    // In a real application, this would open a modal with detailed information
    alert(`Viewing details for ID: ${idNumber}`);
}

// Download Verification Report
function downloadVerificationReport(idNumber) {
    // In a real application, this would generate and download a PDF report
    const report = generateVerificationReport(idNumber);
    downloadFile(report, `verification-report-${idNumber}.txt`);
}

// Generate Verification Report
function generateVerificationReport(idNumber) {
    return `PASecure Verification Report
ID Number: ${idNumber}
Generated: ${new Date().toLocaleString()}

Detailed verification information would be included here.
This is a sample report for demonstration purposes.`;
}

// Download File
function downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Handle Export
async function handleExport(e) {
    const exportType = e.target.textContent.trim();
    console.log('Exporting:', exportType);
    
    try {
        switch (exportType) {
            case 'Export Data':
                await exportVerificationData();
                break;
            case 'Export Logs':
                await exportSystemLogs();
                break;
            case 'Generate Report':
                await generateAnalyticsReport();
                break;
            default:
                showNotification('Export type not supported', 'error');
        }
    } catch (error) {
        console.error('Export error:', error);
        showNotification('Export failed: ' + error.message, 'error');
    }
}

// Export verification data as CSV
async function exportVerificationData() {
    const csvContent = generateVerificationCSV(verificationData);
    downloadFile(csvContent, `verification-data-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showNotification('Verification data exported successfully', 'success');
}

// Export system logs as CSV
async function exportSystemLogs() {
    const csvContent = generateLogsCSV(systemLogs);
    downloadFile(csvContent, `system-logs-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
    showNotification('System logs exported successfully', 'success');
}

// Generate analytics report as PDF (simplified as text)
async function generateAnalyticsReport() {
    const report = generateAnalyticsReportContent();
    downloadFile(report, `analytics-report-${new Date().toISOString().split('T')[0]}.txt`, 'text/plain');
    showNotification('Analytics report generated successfully', 'success');
}

// Generate verification CSV content
function generateVerificationCSV(data) {
    const headers = ['ID Number', 'Holder Name', 'Type', 'Status', 'Confidence', 'Created At', 'Processing Time (ms)'];
    const rows = data.map(v => [
        v.detected_id_number || 'N/A',
        v.detected_holder_name || 'N/A',
        formatIDType(v.detected_id_type),
        v.status,
        v.confidence_score || 'N/A',
        new Date(v.created_at).toLocaleString(),
        v.processing_time_ms || 'N/A'
    ]);
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

// Generate logs CSV content
function generateLogsCSV(data) {
    const headers = ['Timestamp', 'Level', 'Message', 'Context'];
    const rows = data.map(log => [
        new Date(log.created_at).toLocaleString(),
        log.level,
        log.message,
        log.context ? JSON.stringify(log.context) : 'N/A'
    ]);
    
    return [headers, ...rows].map(row => row.map(field => `"${field}"`).join(',')).join('\n');
}

// Generate analytics report content
function generateAnalyticsReportContent() {
    const stats = calculateVerificationStats(verificationData);
    const idTypeStats = calculateIDTypeDistribution(verificationData);
    const successStats = calculateSuccessRateByType(verificationData);
    
    return `PASecure Analytics Report
Generated: ${new Date().toLocaleString()}

SUMMARY STATISTICS:
- Total Verifications: ${stats.total}
- Verified: ${stats.verified} (${stats.successRate.toFixed(1)}%)
- Flagged: ${stats.flagged}
- Failed: ${stats.failed}
- Pending: ${stats.pending}
- Average Processing Time: ${stats.avgProcessingTime.toFixed(1)}s

ID TYPE DISTRIBUTION:
- Senior Citizen: ${idTypeStats.seniorCitizen}%
- PWD: ${idTypeStats.pwd}%

SUCCESS RATE BY TYPE:
- Senior Citizen: ${successStats.seniorCitizen}%
- PWD: ${successStats.pwd}%

RECENT ACTIVITY:
${verificationData.slice(0, 10).map(v => 
    `- ${v.status.toUpperCase()}: ${v.detected_id_number || 'N/A'} - ${v.detected_holder_name || 'N/A'} (${new Date(v.created_at).toLocaleString()})`
).join('\n')}

This report was generated by PASecure Admin Dashboard.
For questions or concerns, contact: admin@pasig.gov.ph
`;
}

// Start Real-time Updates
function startRealTimeUpdates() {
    // Polling-based auto-refresh for verifications and logs
    const POLL_MS = 10000; // 10 seconds
    let pollTimer = null;
    let isPageVisible = !document.hidden;

    const runPoll = async () => {
        try {
            // Only poll when page is visible to save resources
            if (!isPageVisible) return;

            // Fetch latest data
            const [verifs, logs] = await Promise.all([
                loadVerificationDataAPI(),
                loadSystemLogsAPI()
            ]);

            let updated = false;

            // Update verifications if changed
            if (Array.isArray(verifs) && JSON.stringify(verifs[0]) !== JSON.stringify(verificationData[0])) {
                verificationData = verifs;
                updateVerificationTable(verificationData.slice(0, 50));
                updated = true;
            }

            // Update logs if changed
            if (Array.isArray(logs) && JSON.stringify(logs[0]) !== JSON.stringify(systemLogs[0])) {
                systemLogs = logs;
                updateLogsDisplay(systemLogs.slice(0, 100));
                updated = true;
            }

            if (updated) {
                updateDashboardData();
                updateAnalyticsCharts();
            }
        } catch (err) {
            console.warn('Polling refresh failed:', err.message || err);
        }
    };

    // Visibility handling
    const handleVisibility = () => {
        isPageVisible = !document.hidden;
        if (isPageVisible) {
            runPoll();
        }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Start polling
    pollTimer = setInterval(runPoll, POLL_MS);
    // Initial kick
    runPoll();

    // Keep lightweight updates too
    setInterval(() => {
        if (currentSection === 'dashboard') updateDashboardData();
    }, 30000);

    setInterval(() => {
        if (currentSection === 'analytics') updateAnalyticsCharts();
    }, 60000);
}

// Setup Real-time Data
function setupRealTimeData() {
    // In a real application, this would connect to WebSocket or Server-Sent Events
    console.log('Setting up real-time data connections...');
}

// Initialize Admin Tooltips
function initializeAdminTooltips() {
    // Add tooltips to various elements
    const tooltips = {
        '.btn-icon': 'Click for action',
        '.stat-card': 'Click to view details',
        '.chart-container': 'Hover for more information'
    };
    
    Object.entries(tooltips).forEach(([selector, text]) => {
        document.querySelectorAll(selector).forEach(element => {
            element.setAttribute('title', text);
        });
    });
}

// Utility Functions
function formatNumber(num) {
    return num.toLocaleString();
}

function formatDate(date) {
    return new Date(date).toLocaleDateString();
}

function formatDateTime(date) {
    return new Date(date).toLocaleString();
}

// Show Notification
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.admin-notification');
    existingNotifications.forEach(notification => notification.remove());
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `admin-notification admin-notification-${type}`;
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

// Debug function to test data loading
window.debugDataLoading = async function() {
    console.log('=== DEBUG DATA LOADING ===');
    console.log('Current verification data:', verificationData);
    console.log('Current system logs:', systemLogs);
    
    try {
        console.log('Testing direct API call...');
        const data = await loadVerificationDataAPI();
        console.log('Direct API success:', data);
        
        if (data && data.length > 0) {
            console.log('Updating table with real data...');
            verificationData = data;
            updateVerificationTable(verificationData);
        }
    } catch (err) {
        console.error('Direct API exception:', err);
    }
};

// Manual data refresh function
window.refreshData = async function() {
    console.log('Manually refreshing data...');
    await loadInitialData();
};

// Export functions for global access
window.viewVerificationDetails = viewVerificationDetails;
window.downloadVerificationReport = downloadVerificationReport;
window.refreshInsights = refreshInsights;
window.editUser = function(id) { alert(`Edit user: ${id}`); };
window.deleteUser = function(id) { 
    if (confirm(`Are you sure you want to delete user ${id}?`)) {
        alert(`User ${id} deleted`);
    }
};

// ============================================
// INSIGHTS FUNCTIONS
// ============================================

// Update Insights Section
async function updateInsights() {
    if (!Array.isArray(verificationData) || verificationData.length === 0) {
        console.log('No verification data available for insights');
        await loadInitialData();
    }
    
    const insights = calculateInsights(verificationData);
    displayInsights(insights);
    updateInsightCharts(insights);
    generateRecommendations(insights);
}

// Refresh Insights
function refreshInsights() {
    loadInitialData().then(() => {
        updateInsights();
        showNotification('Insights refreshed successfully', 'success');
    });
}

// Calculate Insights from Verification Data
function calculateInsights(data) {
    if (!Array.isArray(data) || data.length === 0) {
        return getEmptyInsights();
    }
    
    const insights = {
        // Peak time analysis
        peakTime: calculatePeakTime(data),
        
        // Confidence metrics
        avgConfidence: calculateAverageConfidence(data),
        confidenceTrend: calculateConfidenceTrend(data),
        confidenceDistribution: calculateConfidenceDistribution(data),
        
        // Processing metrics
        avgProcessingTime: calculateAverageProcessingTime(data),
        fastestProcessing: calculateFastestProcessing(data),
        slowestProcessing: calculateSlowestProcessing(data),
        processingTimeDistribution: calculateProcessingTimeDistribution(data),
        
        // ID type analysis
        idTypeStats: calculateIDTypeStats(data),
        
        // Status analysis
        flaggedRate: calculateFlaggedRate(data),
        verifiedRate: calculateVerifiedRate(data),
        
        // Timeline data
        timelineData: calculateTimelineData(data)
    };
    
    return insights;
}

// Get Empty Insights (fallback)
function getEmptyInsights() {
    return {
        peakTime: '--:--',
        avgConfidence: 0,
        confidenceTrend: { value: 0, direction: 'neutral' },
        confidenceDistribution: { high: 0, medium: 0, low: 0, veryLow: 0 },
        avgProcessingTime: 0,
        fastestProcessing: 0,
        slowestProcessing: 0,
        processingTimeDistribution: [],
        idTypeStats: { senior: 0, pwd: 0, total: 0 },
        flaggedRate: 0,
        verifiedRate: 0,
        timelineData: []
    };
}

// Calculate Peak Verification Time
function calculatePeakTime(data) {
    const hourCounts = Array(24).fill(0);
    
    data.forEach(item => {
        if (item.created_at) {
            const date = new Date(item.created_at);
            const hour = date.getHours();
            hourCounts[hour]++;
        }
    });
    
    const maxCount = Math.max(...hourCounts);
    const peakHour = hourCounts.indexOf(maxCount);
    
    return `${String(peakHour).padStart(2, '0')}:00`;
}

// Calculate Average Confidence
function calculateAverageConfidence(data) {
    const confidences = data
        .filter(item => item.confidence_score != null)
        .map(item => item.confidence_score);
    
    if (confidences.length === 0) return 0;
    
    const sum = confidences.reduce((a, b) => a + b, 0);
    return Math.round(sum / confidences.length);
}

// Calculate Confidence Trend
function calculateConfidenceTrend(data) {
    if (data.length < 2) {
        return { value: 0, direction: 'neutral', desc: 'Insufficient data' };
    }
    
    // Split data into two halves
    const mid = Math.floor(data.length / 2);
    const recent = data.slice(0, mid);
    const older = data.slice(mid);
    
    const recentAvg = calculateAverageConfidence(recent);
    const olderAvg = calculateAverageConfidence(older);
    
    const diff = recentAvg - olderAvg;
    const percentChange = olderAvg > 0 ? Math.round((diff / olderAvg) * 100) : 0;
    
    let direction = 'neutral';
    let desc = 'No change';
    
    if (percentChange > 5) {
        direction = 'up';
        desc = `Increased by ${Math.abs(percentChange)}%`;
    } else if (percentChange < -5) {
        direction = 'down';
        desc = `Decreased by ${Math.abs(percentChange)}%`;
    } else {
        desc = `Changed by ${Math.abs(percentChange)}%`;
    }
    
    return {
        value: percentChange,
        direction: direction,
        desc: desc
    };
}

// Calculate Confidence Distribution
function calculateConfidenceDistribution(data) {
    const distribution = { high: 0, medium: 0, low: 0, veryLow: 0 };
    
    data.forEach(item => {
        const score = item.confidence_score || 0;
        if (score >= 80) distribution.high++;
        else if (score >= 60) distribution.medium++;
        else if (score >= 40) distribution.low++;
        else distribution.veryLow++;
    });
    
    return distribution;
}

// Calculate Average Processing Time
function calculateAverageProcessingTime(data) {
    const times = data
        .filter(item => item.processing_time_ms != null)
        .map(item => item.processing_time_ms / 1000); // Convert to seconds
    
    if (times.length === 0) return 0;
    
    const sum = times.reduce((a, b) => a + b, 0);
    return (sum / times.length).toFixed(2);
}

// Calculate Fastest Processing
function calculateFastestProcessing(data) {
    const times = data
        .filter(item => item.processing_time_ms != null)
        .map(item => item.processing_time_ms / 1000);
    
    if (times.length === 0) return 0;
    return Math.min(...times).toFixed(2);
}

// Calculate Slowest Processing
function calculateSlowestProcessing(data) {
    const times = data
        .filter(item => item.processing_time_ms != null)
        .map(item => item.processing_time_ms / 1000);
    
    if (times.length === 0) return 0;
    return Math.max(...times).toFixed(2);
}

// Calculate ID Type Statistics
function calculateIDTypeStats(data) {
    const stats = { senior: 0, pwd: 0, total: data.length };
    
    data.forEach(item => {
        const type = item.detected_id_type || '';
        if (type.includes('senior')) stats.senior++;
        else if (type.includes('pwd')) stats.pwd++;
    });
    
    return stats;
}

// Calculate Flagged Rate
function calculateFlaggedRate(data) {
    if (data.length === 0) return 0;
    const flagged = data.filter(item => item.status === 'flagged').length;
    return Math.round((flagged / data.length) * 100);
}

// Calculate Verified Rate
function calculateVerifiedRate(data) {
    if (data.length === 0) return 0;
    const verified = data.filter(item => item.status === 'verified').length;
    return Math.round((verified / data.length) * 100);
}

// Calculate Timeline Data (last 7 days)
function calculateTimelineData(data) {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        date.setHours(0, 0, 0, 0);
        return { date, count: 0 };
    });
    
    data.forEach(item => {
        if (item.created_at) {
            const itemDate = new Date(item.created_at);
            itemDate.setHours(0, 0, 0, 0);
            
            const dayIndex = last7Days.findIndex(d => 
                d.date.getTime() === itemDate.getTime()
            );
            
            if (dayIndex !== -1) {
                last7Days[dayIndex].count++;
            }
        }
    });
    
    return last7Days.map(d => ({
        label: d.date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        count: d.count
    }));
}

// Display Insights
function displayInsights(insights) {
    // Peak Time
    document.getElementById('peakTime').textContent = insights.peakTime;
    
    // Confidence Trend
    const trendEl = document.getElementById('confidenceTrend');
    const trendDescEl = document.getElementById('confidenceTrendDesc');
    if (insights.confidenceTrend.direction === 'up') {
        trendEl.textContent = `↑ ${Math.abs(insights.confidenceTrend.value)}%`;
        trendEl.style.color = '#10b981';
    } else if (insights.confidenceTrend.direction === 'down') {
        trendEl.textContent = `↓ ${Math.abs(insights.confidenceTrend.value)}%`;
        trendEl.style.color = '#ef4444';
    } else {
        trendEl.textContent = '→ 0%';
        trendEl.style.color = '#6b7280';
    }
    trendDescEl.textContent = insights.confidenceTrend.desc;
    
    // Flagged Rate
    document.getElementById('flaggedRate').textContent = `${insights.flaggedRate}%`;
    document.getElementById('flaggedRateDesc').textContent = 
        `${insights.flaggedRate}% of IDs flagged as suspicious`;
    
    // Average Confidence
    document.getElementById('avgConfidence').textContent = `${insights.avgConfidence}%`;
    
    // Processing Times
    document.getElementById('avgProcessingTime').textContent = `${insights.avgProcessingTime}s`;
    document.getElementById('fastestProcessing').textContent = `${insights.fastestProcessing}s`;
    document.getElementById('slowestProcessing').textContent = `${insights.slowestProcessing}s`;
    
    // ID Type Stats
    const idStats = insights.idTypeStats;
    const total = idStats.total || 1;
    const seniorPercent = Math.round((idStats.senior / total) * 100);
    const pwdPercent = Math.round((idStats.pwd / total) * 100);
    
    document.getElementById('seniorCount').textContent = idStats.senior;
    document.getElementById('seniorPercent').textContent = `(${seniorPercent}%)`;
    document.getElementById('pwdCount').textContent = idStats.pwd;
    document.getElementById('pwdPercent').textContent = `(${pwdPercent}%)`;
    
    const mostCommon = idStats.senior >= idStats.pwd ? 'Senior Citizen' : 'PWD';
    document.getElementById('mostCommonType').textContent = mostCommon;
    
    // Confidence Distribution
    const dist = insights.confidenceDistribution;
    const distTotal = dist.high + dist.medium + dist.low + dist.veryLow || 1;
    
    const updateBucket = (id, count, total) => {
        const percent = Math.round((count / total) * 100);
        document.getElementById(id + 'Bar').style.width = `${percent}%`;
        document.getElementById(id + 'Count').textContent = count;
    };
    
    updateBucket('highConfidence', dist.high, distTotal);
    updateBucket('mediumConfidence', dist.medium, distTotal);
    updateBucket('lowConfidence', dist.low, distTotal);
    updateBucket('veryLowConfidence', dist.veryLow, distTotal);
}

// Update Insight Charts
function updateInsightCharts(insights) {
    // Processing Time Chart
    if (typeof Chart !== 'undefined') {
        const processingCtx = document.getElementById('processingTimeInsightChart');
        if (processingCtx) {
            if (charts.processingTimeInsight) {
                charts.processingTimeInsight.destroy();
            }
            charts.processingTimeInsight = new Chart(processingCtx, {
                type: 'bar',
                data: {
                    labels: ['0-1s', '1-2s', '2-3s', '3-5s', '5s+'],
                    datasets: [{
                        label: 'Processing Time Distribution',
                        data: insights.processingTimeDistribution || [0, 0, 0, 0, 0],
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
        
        // ID Type Chart
        const idTypeCtx = document.getElementById('idTypeInsightChart');
        if (idTypeCtx) {
            if (charts.idTypeInsight) {
                charts.idTypeInsight.destroy();
            }
            charts.idTypeInsight = new Chart(idTypeCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Senior Citizen', 'PWD'],
                    datasets: [{
                        data: [insights.idTypeStats.senior, insights.idTypeStats.pwd],
                        backgroundColor: ['rgba(16, 185, 129, 0.8)', 'rgba(59, 130, 246, 0.8)'],
                        borderColor: ['rgba(16, 185, 129, 1)', 'rgba(59, 130, 246, 1)'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
        
        // Timeline Chart
        const timelineCtx = document.getElementById('timelineChart');
        if (timelineCtx) {
            if (charts.timeline) {
                charts.timeline.destroy();
            }
            const timelineData = insights.timelineData || [];
            charts.timeline = new Chart(timelineCtx, {
                type: 'line',
                data: {
                    labels: timelineData.map(d => d.label),
                    datasets: [{
                        label: 'Verifications',
                        data: timelineData.map(d => d.count),
                        borderColor: 'rgba(59, 130, 246, 1)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        tension: 0.4,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { beginAtZero: true }
                    }
                }
            });
        }
    }
}

// Generate Recommendations
function generateRecommendations(insights) {
    const recommendations = [];
    
    // Low confidence recommendation
    if (insights.avgConfidence < 70) {
        recommendations.push({
            type: 'warning',
            icon: 'exclamation-triangle',
            message: 'Average confidence is below 70%. Consider retraining the CNN model with more data.',
            action: 'Review training data'
        });
    }
    
    // High flagged rate
    if (insights.flaggedRate > 20) {
        recommendations.push({
            type: 'warning',
            icon: 'shield-alt',
            message: `Flagged rate is ${insights.flaggedRate}%, which is above normal. Review flagged IDs for patterns.`,
            action: 'Review flagged IDs'
        });
    }
    
    // Slow processing
    if (parseFloat(insights.avgProcessingTime) > 5) {
        recommendations.push({
            type: 'info',
            icon: 'clock',
            message: `Average processing time is ${insights.avgProcessingTime}s. Consider optimizing the model or infrastructure.`,
            action: 'Optimize processing'
        });
    }
    
    // Low data volume
    if (insights.idTypeStats.total < 50) {
        recommendations.push({
            type: 'info',
            icon: 'database',
            message: 'Limited verification data. More data will improve insights accuracy.',
            action: 'Collect more data'
        });
    }
    
    // Good performance
    if (insights.avgConfidence >= 80 && insights.flaggedRate < 10) {
        recommendations.push({
            type: 'success',
            icon: 'check-circle',
            message: 'System is performing well with high confidence and low flagged rate.',
            action: 'Continue monitoring'
        });
    }
    
    // Display recommendations
    const recommendationsList = document.getElementById('recommendationsList');
    if (recommendationsList) {
        if (recommendations.length === 0) {
            recommendationsList.innerHTML = `
                <div class="recommendation-item">
                    <i class="fas fa-check-circle"></i>
                    <span>No recommendations at this time. System is operating normally.</span>
                </div>
            `;
        } else {
            recommendationsList.innerHTML = recommendations.map(rec => `
                <div class="recommendation-item ${rec.type}">
                    <i class="fas fa-${rec.icon}"></i>
                    <div>
                        <span class="rec-message">${rec.message}</span>
                        <span class="rec-action">${rec.action}</span>
                    </div>
                </div>
            `).join('');
        }
    }
}
