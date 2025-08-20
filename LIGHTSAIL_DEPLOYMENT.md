# AWS Lightsail Deployment Guide

## Overview
This guide will help you deploy the Rx Tool Form to an AWS Lightsail Node.js instance.

## Prerequisites
- AWS Account with Lightsail access
- GitHub repository with your code
- Domain name (optional but recommended)

## Step 1: Create Lightsail Instance

### 1.1 Access Lightsail Console
1. Go to [AWS Lightsail Console](https://lightsail.aws.amazon.com/)
2. Click "Create instance"

### 1.2 Choose Instance Configuration
- **Platform**: Linux/Unix
- **Blueprint**: Node.js
- **Instance plan**: Choose based on your needs:
  - **$3.50/month**: 512 MB RAM, 1 vCPU, 20 GB SSD (Development)
  - **$7/month**: 1 GB RAM, 1 vCPU, 40 GB SSD (Production recommended)
  - **$15/month**: 2 GB RAM, 1 vCPU, 60 GB SSD (High traffic)

### 1.3 Instance Details
- **Name**: `rx-tool-form`
- **Zone**: Choose closest to your users
- **Add launch script**: No (we'll set up manually)

## Step 2: Connect to Your Instance

### 2.1 Using Lightsail Browser-based SSH
1. In Lightsail console, click on your instance
2. Click "Connect using SSH"
3. Terminal will open in browser

### 2.2 Using SSH Client (Alternative)
```bash
# Download SSH key from Lightsail console
# Connect using:
ssh -i "your-key.pem" ubuntu@your-instance-ip
```

## Step 3: Set Up the Application

### 3.1 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 3.2 Install Git
```bash
sudo apt install git -y
```

### 3.3 Clone Your Repository
```bash
# Navigate to home directory
cd ~

# Clone your GitHub repository
git clone https://github.com/your-username/rx-tool-form.git

# Navigate to project directory
cd rx-tool-form
```

### 3.4 Install Dependencies
```bash
# Install Node.js dependencies
npm install

# Install PM2 for process management
sudo npm install -g pm2
```

## Step 4: Environment Configuration

### 4.1 Create Environment File
```bash
# Create .env file
nano .env
```

### 4.2 Add Environment Variables
```env
# AWS Configuration
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your_s3_bucket_name

# Google Apps Script URL
GOOGLE_SCRIPT_URL=https://script.google.com/macros/s/your_script_id/exec

# Rate Limiting Configuration (Production)
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=50

# Port Configuration
PORT=3000
```

### 4.3 Save and Exit
- Press `Ctrl + X`
- Press `Y` to confirm
- Press `Enter` to save

## Step 5: Configure Firewall

### 5.1 Open Required Ports
1. In Lightsail console, go to "Networking" tab
2. Add firewall rules:
   - **HTTP**: Port 80
   - **HTTPS**: Port 443 (if using SSL)
   - **Custom**: Port 3000 (for direct access)

### 5.2 Alternative: Using Lightsail CLI
```bash
# Install Lightsail CLI
sudo apt install awscli -y

# Configure AWS CLI
aws configure

# Open ports
aws lightsail open-instance-public-ports \
  --instance-name rx-tool-form \
  --port-info fromPort=80,toPort=80,protocol=TCP

aws lightsail open-instance-public-ports \
  --instance-name rx-tool-form \
  --port-info fromPort=443,toPort=443,protocol=TCP

aws lightsail open-instance-public-ports \
  --instance-name rx-tool-form \
  --port-info fromPort=3000,toPort=3000,protocol=TCP
```

## Step 6: Start the Application

### 6.1 Test the Application
```bash
# Start the application
npm start

# Test if it's working
curl http://localhost:3000
```

### 6.2 Set Up PM2 for Production
```bash
# Stop the current process (Ctrl+C if running)
# Start with PM2
pm2 start server.js --name "rx-tool-form"

# Save PM2 configuration
pm2 save

# Set up PM2 to start on boot
pm2 startup
```

### 6.3 PM2 Commands
```bash
# Check status
pm2 status

# View logs
pm2 logs rx-tool-form

# Restart application
pm2 restart rx-tool-form

# Stop application
pm2 stop rx-tool-form
```

## Step 7: Set Up Reverse Proxy (Optional but Recommended)

### 7.1 Install Nginx
```bash
sudo apt install nginx -y
```

### 7.2 Configure Nginx
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/rx-tool-form
```

### 7.3 Add Nginx Configuration
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 7.4 Enable Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/rx-tool-form /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# Enable Nginx on boot
sudo systemctl enable nginx
```

## Step 8: SSL Certificate (Recommended)

### 8.1 Install Certbot
```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 8.2 Get SSL Certificate
```bash
sudo certbot --nginx -d your-domain.com
```

## Step 9: Monitoring and Maintenance

### 9.1 Set Up Log Rotation
```bash
# Create log rotation configuration
sudo nano /etc/logrotate.d/rx-tool-form
```

Add:
```
/home/ubuntu/.pm2/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 ubuntu ubuntu
}
```

### 9.2 Monitor Application
```bash
# Check application status
pm2 status

# Monitor resources
htop

# Check disk space
df -h

# Check memory usage
free -h
```

## Step 10: Backup Strategy

### 10.1 Create Backup Script
```bash
# Create backup directory
mkdir ~/backups

# Create backup script
nano ~/backup.sh
```

Add:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
PROJECT_DIR="/home/ubuntu/rx-tool-form"

# Create backup
tar -czf $BACKUP_DIR/rx-tool-form_$DATE.tar.gz -C $PROJECT_DIR .

# Keep only last 7 backups
find $BACKUP_DIR -name "rx-tool-form_*.tar.gz" -mtime +7 -delete

echo "Backup completed: rx-tool-form_$DATE.tar.gz"
```

### 10.2 Set Up Automated Backups
```bash
# Make script executable
chmod +x ~/backup.sh

# Add to crontab (daily at 2 AM)
crontab -e
```

Add:
```
0 2 * * * /home/ubuntu/backup.sh
```

## Troubleshooting

### Common Issues

#### 1. Application Won't Start
```bash
# Check logs
pm2 logs rx-tool-form

# Check environment variables
cat .env

# Test manually
node server.js
```

#### 2. Port Already in Use
```bash
# Find process using port 3000
sudo netstat -tulpn | grep :3000

# Kill process
sudo kill -9 <PID>
```

#### 3. Permission Issues
```bash
# Fix file permissions
sudo chown -R ubuntu:ubuntu ~/rx-tool-form
chmod +x ~/rx-tool-form/server.js
```

#### 4. Nginx Issues
```bash
# Check Nginx status
sudo systemctl status nginx

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log
```

## Security Checklist

- [ ] Environment variables configured
- [ ] Firewall rules set up
- [ ] SSL certificate installed
- [ ] PM2 process management configured
- [ ] Log rotation enabled
- [ ] Backup strategy implemented
- [ ] Regular security updates enabled

## Cost Optimization

- **Instance**: Choose appropriate size for your traffic
- **Storage**: Monitor disk usage
- **Bandwidth**: Lightsail includes 1TB free
- **Snapshots**: Create snapshots for backup (additional cost)

## Support

For issues:
1. Check PM2 logs: `pm2 logs rx-tool-form`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Monitor system resources: `htop`
4. Review this deployment guide

Your Rx Tool Form should now be running securely on AWS Lightsail! 🚀 