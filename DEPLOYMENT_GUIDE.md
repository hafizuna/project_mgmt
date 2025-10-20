# ICos PgMgmt - Home Server Deployment Guide

## 🏠 Deploying Your Project Management System on Home Server

This guide will walk you through deploying your project management system on your home server running Debian GNU/Linux.

---

## 📋 **Prerequisites Check**

First, let's check what's already installed on your system:

```bash
# Check current installations
node --version 2>/dev/null || echo "Node.js not installed"
npm --version 2>/dev/null || echo "NPM not installed"
git --version 2>/dev/null || echo "Git not installed"
docker --version 2>/dev/null || echo "Docker not installed"
psql --version 2>/dev/null || echo "PostgreSQL not installed"
nginx -v 2>/dev/null || echo "Nginx not installed"
```

---

## 🛠️ **Step 1: Install Essential Software**

### **1.1 Update System**
```bash
sudo apt update && sudo apt upgrade -y
```

### **1.2 Install Git**
```bash
# Install Git
sudo apt install git -y

# Configure Git (replace with your details)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify installation
git --version
```

### **1.3 Install Node.js & NPM**
```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version

# Install global packages
sudo npm install -g pm2
```

### **1.4 Install Docker & Docker Compose**
```bash
# Install Docker
sudo apt install apt-transport-https ca-certificates curl gnupg lsb-release -y

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt update
sudo apt install docker-ce docker-ce-cli containerd.io docker-compose-plugin -y

# Add your user to docker group
sudo usermod -aG docker $USER

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Install Docker Compose (standalone)
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation (you may need to log out and back in)
docker --version
docker-compose --version
```

### **1.5 Install PostgreSQL**
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Check status
sudo systemctl status postgresql
```

### **1.6 Install Nginx**
```bash
# Install Nginx
sudo apt install nginx -y

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Check status
sudo systemctl status nginx
```

---

## 🗄️ **Step 2: Database Configuration**

### **2.1 Setup PostgreSQL**
```bash
# Switch to postgres user
sudo -u postgres psql

# Inside PostgreSQL prompt, create database and user:
```
```sql
-- Create user
CREATE USER collabsync WITH PASSWORD 'your_secure_password_here';

-- Create database
CREATE DATABASE collabsync_prod OWNER collabsync;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE collabsync_prod TO collabsync;

-- Exit PostgreSQL
\q
```

### **2.2 Configure PostgreSQL for External Connections**
```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/15/main/postgresql.conf

# Find and uncomment/modify this line:
# listen_addresses = 'localhost'
# Change to:
listen_addresses = 'localhost,YOUR_SERVER_IP'

# Edit authentication settings
sudo nano /etc/postgresql/15/main/pg_hba.conf

# Add this line for your application:
host    collabsync_prod    collabsync    localhost    md5
host    collabsync_prod    collabsync    YOUR_SERVER_IP/32    md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## 🏗️ **Step 3: Application Deployment**

### **3.1 Prepare Deployment Directory**
```bash
# Create application directory
sudo mkdir -p /srv/collabsync
sudo mkdir -p /srv/collabsync/{api,web,logs}
sudo mkdir -p /var/collabsync/uploads
sudo mkdir -p /var/log/collabsync
sudo mkdir -p /var/backups/collabsync

# Create application user (optional but recommended)
sudo adduser --system --group --home /srv/collabsync collabsync

# Set permissions
sudo chown -R collabsync:collabsync /srv/collabsync /var/collabsync /var/log/collabsync /var/backups/collabsync
```

### **3.2 Deploy Backend**
```bash
# Copy your project to the server
sudo cp -r /home/hafizo/Projects/project_mgmt/backend/* /srv/collabsync/api/
sudo chown -R collabsync:collabsync /srv/collabsync/api

# Navigate to backend directory
cd /srv/collabsync/api

# Install dependencies
sudo -u collabsync npm install

# Create production environment file
sudo -u collabsync cp .env.example .env
sudo -u collabsync nano .env
```

**Backend .env Configuration:**
```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://collabsync:your_secure_password_here@localhost:5432/collabsync_prod
JWT_SECRET=your_very_secure_jwt_secret_here_min_32_chars
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_here_min_32_chars
FILE_UPLOAD_DIR=/var/collabsync/uploads
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png,gif
CORS_ORIGINS=http://YOUR_SERVER_IP:3000,http://your-domain.local
APP_BASE_URL=http://your-domain.local
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM=noreply@your-domain.local
```

```bash
# Build the backend
sudo -u collabsync npm run build

# Run Prisma migrations
sudo -u collabsync npx prisma generate
sudo -u collabsync npx prisma migrate deploy

# Seed the database
sudo -u collabsync npm run seed
```

### **3.3 Deploy Frontend**
```bash
# Copy frontend to deployment directory
sudo cp -r /home/hafizo/Projects/project_mgmt/frontend/* /srv/collabsync/web/
sudo chown -R collabsync:collabsync /srv/collabsync/web

# Navigate to frontend directory
cd /srv/collabsync/web

# Install dependencies
sudo -u collabsync npm install

# Create production environment file
sudo -u collabsync cp .env.example .env
sudo -u collabsync nano .env
```

**Frontend .env Configuration:**
```env
VITE_API_URL=http://YOUR_SERVER_IP:4000/api
VITE_WS_URL=http://YOUR_SERVER_IP:4000
```

```bash
# Build the frontend
sudo -u collabsync npm run build

# Copy build files to web root
sudo cp -r /srv/collabsync/web/dist/* /srv/collabsync/web/
```

---

## 🚀 **Step 4: Process Management with PM2**

### **4.1 Create PM2 Configuration**
```bash
# Create PM2 ecosystem file
sudo -u collabsync nano /srv/collabsync/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [
    {
      name: 'collabsync-api',
      script: '/srv/collabsync/api/dist/server.js',
      cwd: '/srv/collabsync/api',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      },
      instances: 1,
      exec_mode: 'cluster',
      watch: false,
      max_memory_restart: '1G',
      error_file: '/var/log/collabsync/api-error.log',
      out_file: '/var/log/collabsync/api-out.log',
      log_file: '/var/log/collabsync/api.log',
      time: true
    }
  ]
};
```

### **4.2 Start Application with PM2**
```bash
# Start the application
sudo -u collabsync pm2 start /srv/collabsync/ecosystem.config.js

# Save PM2 configuration
sudo -u collabsync pm2 save

# Generate systemd startup script
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u collabsync --hp /srv/collabsync

# Enable PM2 startup
sudo systemctl enable pm2-collabsync
```

---

## 🌐 **Step 5: Nginx Configuration**

### **5.1 Create Nginx Configuration**
```bash
# Create Nginx site configuration
sudo nano /etc/nginx/sites-available/collabsync
```

```nginx
server {
    listen 80;
    server_name YOUR_SERVER_IP your-domain.local;
    client_max_body_size 50M;

    # Frontend (React SPA)
    root /srv/collabsync/web;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.IO (for future real-time features)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Protected file serving
    location /protected/ {
        internal;
        alias /var/collabsync/uploads/;
        expires 1h;
        add_header Cache-Control "private, no-transform";
    }

    # Frontend routing (SPA)
    location / {
        try_files $uri $uri/ /index.html;
        expires 1h;
        add_header Cache-Control "public, immutable";
    }

    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### **5.2 Enable Site**
```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/collabsync /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

---

## 🔒 **Step 6: Security Configuration**

### **6.1 Firewall Setup**
```bash
# Install UFW (if not already installed)
sudo apt install ufw -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable

# Check status
sudo ufw status
```

### **6.2 SSL Certificate (Optional - for HTTPS)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.local

# Test automatic renewal
sudo certbot renew --dry-run
```

---

## 🌍 **Step 7: Domain Setup**

### **7.1 Local Network Access**

**Option A: Use IP Address**
- Access via: `http://YOUR_SERVER_IP`

**Option B: Local Domain Setup**
1. **Router Configuration:**
   - Access your router's admin panel
   - Look for "Local DNS" or "Host Names"
   - Add: `collabsync.local` → `YOUR_SERVER_IP`

2. **Or edit hosts file on client machines:**
```bash
# On Windows: C:\Windows\System32\drivers\etc\hosts
# On Linux/Mac: /etc/hosts
YOUR_SERVER_IP    collabsync.local
```

### **7.2 External Access (Optional)**

**Port Forwarding:**
1. Access router admin panel
2. Port Forwarding section
3. Forward port 80 (and 443 if using HTTPS) to your server IP

**Dynamic DNS (if you have dynamic IP):**
- Use services like DuckDNS, No-IP, or DynDNS

---

## 🔧 **Step 8: Maintenance Scripts**

### **8.1 Create Backup Script**
```bash
# Create backup script
sudo nano /usr/local/bin/collabsync-backup.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/collabsync"
DATE=$(date +%Y%m%d_%H%M%S)

# Database backup
sudo -u postgres pg_dump collabsync_prod > "$BACKUP_DIR/db_backup_$DATE.sql"

# Files backup
tar -czf "$BACKUP_DIR/files_backup_$DATE.tar.gz" /var/collabsync/uploads

# Keep only last 7 days
find "$BACKUP_DIR" -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/collabsync-backup.sh

# Add to crontab (daily backup at 2 AM)
sudo crontab -e
# Add this line:
0 2 * * * /usr/local/bin/collabsync-backup.sh
```

### **8.2 System Monitoring**
```bash
# Check application status
pm2 status

# Check logs
pm2 logs collabsync-api

# Check Nginx status
sudo systemctl status nginx

# Check database
sudo -u postgres psql -c "\l"
```

---

## 🚀 **Step 9: Starting Your Application**

### **9.1 Final Steps**
```bash
# Ensure all services are running
sudo systemctl restart postgresql
sudo systemctl restart nginx
sudo -u collabsync pm2 restart all

# Check if everything is running
sudo systemctl status postgresql nginx
sudo -u collabsync pm2 status
```

### **9.2 Access Your Application**
1. **Web Interface:** `http://YOUR_SERVER_IP` or `http://collabsync.local`
2. **Default Admin Login:**
   - Email: `admin@demo.com`
   - Password: `admin123` (change this immediately!)

---

## 📊 **Step 10: Performance Optimization**

### **10.1 Database Optimization**
```bash
# Configure PostgreSQL for better performance
sudo nano /etc/postgresql/15/main/postgresql.conf

# Add/modify these settings based on your server RAM:
shared_buffers = 256MB
effective_cache_size = 1GB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### **10.2 Node.js Optimization**
```bash
# Update PM2 configuration for better performance
sudo -u collabsync nano /srv/collabsync/ecosystem.config.js

# Modify instances based on CPU cores:
instances: 'max', // or specific number like 2
```

---

## 🔍 **Troubleshooting**

### **Common Issues:**

1. **Port 4000 already in use:**
```bash
sudo netstat -tlnp | grep :4000
sudo kill -9 PID_NUMBER
```

2. **Permission issues:**
```bash
sudo chown -R collabsync:collabsync /srv/collabsync
sudo chown -R collabsync:collabsync /var/collabsync
```

3. **Database connection issues:**
```bash
sudo -u postgres psql collabsync_prod -c "SELECT version();"
```

4. **Nginx issues:**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### **Logs Location:**
- **Application:** `/var/log/collabsync/`
- **Nginx:** `/var/log/nginx/`
- **PostgreSQL:** `/var/log/postgresql/`

---

## ✅ **Final Checklist**

- [ ] All software installed (Git, Node.js, Docker, PostgreSQL, Nginx)
- [ ] Database created and configured
- [ ] Backend deployed and running
- [ ] Frontend built and served
- [ ] PM2 managing application processes
- [ ] Nginx configured and serving requests
- [ ] Firewall configured
- [ ] Backups scheduled
- [ ] Application accessible via browser
- [ ] Admin credentials changed

---

## 🎉 **Success!**

Your ICos PgMgmt project management system should now be running on your home server! Access it via your configured domain or IP address and start managing your projects.

For any issues, check the logs and refer to the troubleshooting section above.