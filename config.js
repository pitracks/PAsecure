// PASecure Configuration
const CONFIG = {
    supabase: {
        url: 'https://jkrotqcstjnrmhxyturv.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imprcm90cWNzdGpucm1oeHl0dXJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NDI3MzYsImV4cCI6MjA3NjUxODczNn0.UT7NwWLKAtb-1E2ps9q079zP96XX6iXzle9KZ3ZkF5g'
    },
    app: {
        name: 'PASecure',
        version: '1.0.0',
        maxFileSize: 10 * 1024 * 1024, // 10MB
        allowedFileTypes: ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'],
        confidenceThreshold: 80
    },
    api: {
        timeout: 30000, // 30 seconds
        retryAttempts: 3
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
}
