# Rx Tool Form

## Overview
A secure, production-ready web application for submitting prescription information with WSFA code lookup, file upload to AWS S3, and Google Sheets integration.

## Features

### Core Functionality
- **WSFA Code Search**: Real-time filtering with intelligent search
- **Form Validation**: Comprehensive client and server-side validation
- **File Upload**: Secure prescription file upload to AWS S3 with encryption
- **Data Storage**: Automatic submission to Google Sheets with timestamp
- **Responsive Design**: Mobile-friendly interface using Bootstrap 5

### Security Features
- **Rate Limiting**: Configurable request limiting to prevent abuse
- **File Access Control**: Blocked access to sensitive files and directories
- **Input Validation**: Sanitized form data and file uploads
- **Security Headers**: Comprehensive HTTP security headers
- **API Proxy**: Hidden Google Apps Script URL for enhanced security
- **Environment Protection**: Secure handling of sensitive configuration

### User Experience
- **Smart Search**: Type to filter WSFA codes instantly
- **Auto-completion**: Keyboard shortcuts (Ctrl+F) for quick search
- **Real-time Feedback**: Loading states and success/error messages
- **Clean Interface**: Professional, medical-themed design

## Quick Start

### Prerequisites
- Node.js (v14 or higher)
- AWS S3 bucket with appropriate permissions
- Google Apps Script deployed as web app

### Installation
1. Clone or download the project
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your configuration (see Environment Configuration below)
4. Start the server:
   ```bash
   npm start
   ```
5. Open your browser to `http://localhost:3000`

## Environment Configuration

### Required Environment Variables
Create a `.env` file in the project root:

```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your_s3_bucket_name

# Google Apps Script URL
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/your_script_id/exec

# Rate Limiting Configuration (Optional)
RATE_LIMIT_ENABLED=true                    # Enable/disable rate limiting
RATE_LIMIT_WINDOW=900000                   # Window in milliseconds (15 minutes)
RATE_LIMIT_MAX_REQUESTS=50                 # Max requests per window
```

### Rate Limiting Options

#### Development Mode (No Limits)
```env
RATE_LIMIT_ENABLED=false
```

#### Production Mode (Standard Limits)
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=50      # 50 requests per window
```

#### High Traffic Mode (Relaxed Limits)
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000        # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100     # 100 requests per window
```

## How to Use

### Using the Form
1. **Search WSFA Code**: Type in the search field to filter WSFA codes
2. **Select Code**: Choose the appropriate WSFA code from the dropdown
3. **Set Date**: Select the prescription upload date (defaults to today)
4. **Upload File**: Choose a prescription file (image or PDF, max 10MB)
5. **Submit**: Click submit to upload file and send data to Google Sheets

### Data Flow
1. **File Upload**: Prescription file uploaded to AWS S3 with encryption
2. **Data Processing**: WSFA code lookup retrieves associated HCP, SM, RSM, ASM names
3. **Google Sheets**: All data submitted with timestamp to Google Sheets
4. **Confirmation**: Success message displayed to user

## Technical Architecture

### Backend (Node.js)
- **HTTP Server**: Custom Node.js server with security middleware
- **File Processing**: Server-side Excel parsing with xlsx library
- **AWS Integration**: S3 file upload with encryption and validation
- **Google Integration**: Apps Script proxy for secure data submission
- **Security**: Rate limiting, input validation, file access control

### Frontend (HTML/CSS/JavaScript)
- **Framework**: Vanilla JavaScript with Bootstrap 5
- **Search**: Real-time WSFA code filtering
- **Validation**: Client-side form validation
- **UX**: Loading states, alerts, and responsive design

### Data Storage
- **Files**: AWS S3 with AES256 encryption
- **Form Data**: Google Sheets with automatic timestamp formatting
- **Excel Data**: Server-side processing with secure API endpoints

## Security Features

### File Protection
- Blocked access to sensitive files (`.env`, `package.json`, etc.)
- Secure script delivery via API endpoints
- File upload validation (type, size, sanitization)

### Network Security
- Rate limiting to prevent abuse
- Security headers (CSP, XSS protection, etc.)
- Input sanitization and validation

### Data Security
- Environment variable protection
- Hidden API endpoints
- Encrypted file storage

## Deployment

### Local Development
```bash
npm start
```

### Production Considerations
1. **Environment Variables**: Ensure all required variables are set
2. **Rate Limiting**: Enable appropriate limits for your traffic
3. **SSL/TLS**: Use HTTPS in production
4. **Monitoring**: Monitor server logs and error rates
5. **Backup**: Regular backups of Google Sheets data

## File Structure
```
Rx Tool Form/
├── index.html          # Main application interface
├── script.js           # Frontend JavaScript logic
├── styles.css          # Application styling
├── server.js           # Node.js backend server
├── package.json        # Dependencies and scripts
├── .env               # Environment configuration (create this)
├── .gitignore         # Git ignore rules
├── README.md          # This file
├── SECURITY.md        # Security documentation
├── DEPLOYMENT_GUIDE.md # Google Apps Script deployment guide
└── RX_Combined_MR_Doctor_Template.xlsx  # Excel data source
```

## Troubleshooting

### Common Issues
1. **Port 3000 in use**: Kill existing Node.js processes or change port
2. **Missing environment variables**: Check `.env` file configuration
3. **File upload fails**: Verify AWS credentials and S3 bucket permissions
4. **Google Sheets not updating**: Check Google Apps Script deployment

### Server Logs
The server provides detailed startup information:
```
🚀 Server running on port 3000
🔒 Rate Limiting: ENABLED
   📊 Max Requests: 50 per 15 minutes
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the SECURITY.md file for security details
3. Check the DEPLOYMENT_GUIDE.md for Google Apps Script setup

## License

This project is for internal use. Please ensure compliance with your organization's data handling policies.