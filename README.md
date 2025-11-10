# PASecure - ID Verification System

A CNN-based ID verification system for Pasig City Senior Citizen and PWD identification cards, built with Supabase backend integration.

## Features

### Public Interface
- **ID Verification**: Upload, camera capture, or scanner input for ID verification
- **Real-time Processing**: AI-powered analysis with confidence scoring
- **Multiple Input Methods**: File upload, camera capture, and scanner integration
- **Accessibility Features**: Voice assistant, high contrast mode, font size adjustment
- **Responsive Design**: Works on desktop, tablet, and mobile devices

### Admin Dashboard
- **Real-time Monitoring**: Live updates of verification statistics
- **Verification Management**: View, filter, and manage all ID verifications
- **Analytics & Reports**: Comprehensive charts and data visualization
- **System Logs**: Real-time system monitoring and error tracking
- **Settings Management**: Configure system parameters and thresholds
- **User Management**: Admin user authentication and access control

## Technology Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL, Authentication, Storage, Real-time)
- **Database**: PostgreSQL with custom schema
- **File Storage**: Supabase Storage for ID images
- **Real-time**: Supabase Realtime subscriptions
- **Charts**: Chart.js for data visualization

## Database Schema

### Tables
- **users**: Admin and operator accounts
- **id_cards**: Verified ID card information
- **verifications**: ID verification records and results
- **system_logs**: Application logs and events
- **system_settings**: Configurable system parameters

### Key Features
- Real-time data synchronization
- File upload and storage
- User authentication and authorization
- Comprehensive logging system
- Configurable settings

## Setup Instructions

### Prerequisites
- Web server (XAMPP, Apache, Nginx, etc.)
- Modern web browser
- Supabase account

### Installation

1. **Clone or Download** the project files to your web server directory

2. **Configure Supabase**:
   - The database schema is already created
   - Default admin user: `admin@pasig.gov.ph` / `admin123`
   - Storage bucket `id-uploads` is configured

3. **Update Configuration** (if needed):
   - Edit `config.js` to update Supabase credentials
   - Modify system settings through the admin dashboard

4. **Access the Application**:
   - Public site: `http://localhost/CAPSTONE UI2/CAPSTONE UI2/index.html`
   - Admin dashboard: `http://localhost/CAPSTONE UI2/CAPSTONE UI2/admin.html`
   - Login page: `http://localhost/CAPSTONE UI2/CAPSTONE UI2/login.html`

## Usage

### Public Users
1. Navigate to the public site
2. Choose input method (Upload, Camera, or Scanner)
3. Upload or capture ID image
4. Wait for AI analysis
5. View verification results
6. Download report if needed

### Admin Users
1. Go to the login page
2. Sign in with admin credentials
3. Access the dashboard for:
   - Real-time verification monitoring
   - Verification history and management
   - System analytics and reports
   - Configuration settings
   - System logs and monitoring

## Configuration

### System Settings
- **Confidence Threshold**: Minimum confidence score for verification (default: 80%)
- **Processing Timeout**: Maximum processing time in seconds (default: 30s)
- **File Size Limit**: Maximum upload size (default: 10MB)
- **Allowed File Types**: Supported formats (JPG, PNG, PDF)

### Database Settings
All settings are stored in the `system_settings` table and can be modified through:
- Admin dashboard settings page
- Direct database queries
- Supabase dashboard

## API Integration

### Supabase Client
The system uses a custom Supabase client (`supabase-client.js`) with methods for:
- Authentication management
- Verification CRUD operations
- File upload and storage
- Real-time subscriptions
- System logging
- Settings management

### Real-time Features
- Live verification updates
- Real-time dashboard statistics
- Instant log monitoring
- Live activity feeds

## GitHub Actions Setup (OCR Worker)

The OCR worker is automatically triggered via GitHub Actions every 5 minutes to process pending ID verifications.

### Setting Up GitHub Secrets

1. Go to your GitHub repository: `https://github.com/pitracks/PAsecure`
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add the following:

   - **Name**: `SUPABASE_URL`
     - **Value**: Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
     - Found in: Supabase Dashboard → Project Settings → API → Project URL

   - **Name**: `SUPABASE_SERVICE_ROLE_KEY`
     - **Value**: Your Supabase service role key (⚠️ Keep this secret!)
     - Found in: Supabase Dashboard → Project Settings → API → Service Role Key
     - ⚠️ **Warning**: This key bypasses Row Level Security. Never expose it in client-side code.

4. Click **Add secret** for each one.

### Workflow File

The workflow file (`.github/workflows/ocr-worker.yml`) is already configured to:
- Run every 5 minutes automatically
- Trigger the Supabase Edge Function `ocr-worker`
- Process one pending verification per run

### Manual Trigger

You can also manually trigger the workflow:
1. Go to **Actions** tab in GitHub
2. Select **Trigger OCR Worker**
3. Click **Run workflow**

### Verifying Setup

After pushing to GitHub:
1. Check the **Actions** tab to see if the workflow runs
2. Monitor Supabase Edge Function logs for processing activity
3. Check your `verifications` table for updated `ocr_status` values

## Security Features

- **Authentication**: Secure admin login system
- **File Validation**: Type and size validation for uploads
- **Data Protection**: Secure file storage and processing
- **Audit Logging**: Comprehensive activity tracking
- **Access Control**: Role-based permissions

## Development

### File Structure
```
CAPSTONE UI2/
├── index.html              # Public interface
├── admin.html              # Admin dashboard
├── login.html              # Admin login
├── config.js               # Configuration
├── supabase-client.js      # Supabase integration
├── script.js               # Public interface logic
├── admin-script.js         # Admin dashboard logic
├── styles.css              # Main stylesheet
├── admin-styles.css        # Admin-specific styles
└── README.md               # This file
```

### Adding New Features
1. Update database schema if needed
2. Modify Supabase client methods
3. Update frontend JavaScript
4. Test with real data
5. Update documentation

## Troubleshooting

### Common Issues
1. **Supabase Connection**: Check internet connection and credentials
2. **File Upload**: Verify file size and type restrictions
3. **Authentication**: Ensure correct admin credentials
4. **Real-time Updates**: Check browser console for errors

### Debug Mode
Enable browser developer tools to see:
- Console logs for debugging
- Network requests to Supabase
- Real-time subscription status
- Error messages and stack traces

## Support

For technical support or questions:
- Check the browser console for error messages
- Review the system logs in the admin dashboard
- Verify Supabase connection and credentials
- Ensure all required files are properly loaded

## License

This project is developed for Pasig City's ID verification system. All rights reserved.

---

**Note**: This system is designed for demonstration purposes. In a production environment, additional security measures, error handling, and performance optimizations would be implemented.