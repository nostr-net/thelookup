# Systemd Service Deployment Guide

This guide covers deploying TheLookup as an isolated systemd service with security hardening on Linux systems.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Build the Application](#build-the-application)
3. [System User Setup](#system-user-setup)
4. [Web Server Options](#web-server-options)
5. [Systemd Service Configuration](#systemd-service-configuration)
6. [Security Hardening](#security-hardening)
7. [SSL/TLS Configuration](#ssltls-configuration)
8. [Firewall Configuration](#firewall-configuration)
9. [Monitoring and Logs](#monitoring-and-logs)
10. [Updating the Application](#updating-the-application)
11. [Troubleshooting](#troubleshooting)

## Prerequisites

- Linux server with systemd (Ubuntu 20.04+, Debian 11+, RHEL 8+, etc.)
- Node.js 18+ and npm (for building)
- sudo/root access
- (Optional) Domain name and DNS configured
- (Optional) nginx for reverse proxy

## Build the Application

### 1. Install Node.js Dependencies

```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install -y nodejs npm git

# Verify versions
node --version  # Should be 18+
npm --version
```

### 2. Clone and Build

```bash
# Clone the repository
git clone https://github.com/nostr-net/thelookup.git
cd thelookup

# Optional: Configure environment variables
cp .env.example .env
nano .env  # Edit VITE_SITE_NAME, VITE_SITE_URL, etc.

# Build the application
npm run build

# Verify build output
ls -la dist/
```

The `dist/` directory now contains the production-ready static files.

## System User Setup

Create a dedicated system user for isolation and security:

```bash
# Create system user with no login shell
sudo useradd -r -s /usr/sbin/nologin -d /opt/thelookup -m thelookup

# Set up directory structure
sudo mkdir -p /opt/thelookup/{app,logs}
sudo chown -R thelookup:thelookup /opt/thelookup

# Copy built files
sudo cp -r dist/* /opt/thelookup/app/
sudo chown -R thelookup:thelookup /opt/thelookup/app
```

**Security Benefits:**
- Dedicated user limits blast radius of potential exploits
- No login shell prevents interactive access
- Restricted home directory isolation

## Web Server Options

Choose one of the following approaches:

### Option A: Using nginx (Recommended for Production)

```bash
# Install nginx
sudo apt install -y nginx

# Create nginx configuration
sudo nano /etc/nginx/sites-available/thelookup
```

**nginx Configuration:**

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name thelookup.app www.thelookup.app;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:; font-src 'self' data: https:; connect-src 'self' wss: https:; frame-src 'self' https:;" always;

    # Root directory
    root /opt/thelookup/app;
    index index.html;

    # Enable gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Deny access to hidden files
    location ~ /\. {
        deny all;
    }

    # Access and error logs
    access_log /var/log/nginx/thelookup_access.log;
    error_log /var/log/nginx/thelookup_error.log;
}
```

**Enable the site:**

```bash
# Enable configuration
sudo ln -s /etc/nginx/sites-available/thelookup /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

**Note:** With nginx, you don't need a separate systemd service for the app itself since nginx serves the static files directly.

### Option B: Using Node.js Static Server

For a simpler setup without nginx, use a Node.js static file server.

```bash
# Install serve globally in the app directory
sudo npm install -g serve

# Or use a local installation
cd /opt/thelookup
sudo npm install serve
```

**Create systemd service** (see next section).

### Option C: Using Caddy (Modern Alternative)

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy

# Create Caddyfile
sudo nano /etc/caddy/Caddyfile
```

**Caddyfile:**

```caddy
thelookup.app {
    root * /opt/thelookup/app
    file_server
    try_files {path} /index.html

    encode gzip

    header {
        X-Frame-Options "SAMEORIGIN"
        X-Content-Type-Options "nosniff"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

```bash
sudo systemctl reload caddy
sudo systemctl enable caddy
```

## Systemd Service Configuration

### For Node.js Static Server (Option B)

Create the service file:

```bash
sudo nano /etc/systemd/system/thelookup.service
```

**Basic Service File:**

```ini
[Unit]
Description=TheLookup Nostr Directory
Documentation=https://github.com/nostr-net/thelookup
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=thelookup
Group=thelookup
WorkingDirectory=/opt/thelookup/app

# Using npx serve
ExecStart=/usr/bin/npx serve -l 8080 -s /opt/thelookup/app

# Or using global serve installation
# ExecStart=/usr/local/bin/serve -l 8080 -s /opt/thelookup/app

# Restart policy
Restart=on-failure
RestartSec=10
KillMode=process

# Environment
Environment="NODE_ENV=production"

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=thelookup

[Install]
WantedBy=multi-user.target
```

**Hardened Service File with Security Features:**

```ini
[Unit]
Description=TheLookup Nostr Directory
Documentation=https://github.com/nostr-net/thelookup
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=thelookup
Group=thelookup
WorkingDirectory=/opt/thelookup/app

# Command to run
ExecStart=/usr/bin/npx serve -l 8080 -s /opt/thelookup/app

# Restart policy
Restart=on-failure
RestartSec=10
KillMode=process

# Environment
Environment="NODE_ENV=production"

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=thelookup

# Security Hardening
## Process Restrictions
NoNewPrivileges=true
LimitNOFILE=65536
LimitNPROC=512

## Filesystem Access
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/opt/thelookup/logs
ReadOnlyPaths=/opt/thelookup/app
PrivateTmp=true
PrivateDevices=true

## Network
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
IPAddressDeny=10.0.0.0/8 172.16.0.0/12 192.168.0.0/16

## Kernel
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true

## System Calls
SystemCallArchitectures=native
SystemCallFilter=@system-service
SystemCallFilter=~@privileged @resources @obsolete

## Capabilities
CapabilityBoundingSet=CAP_NET_BIND_SERVICE
AmbientCapabilities=CAP_NET_BIND_SERVICE

## Misc Protections
ProtectHostname=true
ProtectClock=true
RestrictRealtime=true
RestrictSUIDSGID=true
RemoveIPC=true
LockPersonality=true

[Install]
WantedBy=multi-user.target
```

**Enable and start the service:**

```bash
# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable thelookup

# Start the service
sudo systemctl start thelookup

# Check status
sudo systemctl status thelookup
```

### For nginx Setup (Option A)

If using nginx, you only need to manage the nginx service:

```bash
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

## Security Hardening

### Systemd Security Features Explained

| Feature | Purpose |
|---------|---------|
| `NoNewPrivileges=true` | Prevents privilege escalation |
| `ProtectSystem=strict` | Makes /usr, /boot, /efi read-only |
| `ProtectHome=true` | Makes /home, /root inaccessible |
| `PrivateTmp=true` | Isolated /tmp and /var/tmp |
| `PrivateDevices=true` | Restricted device access |
| `RestrictAddressFamilies` | Limits network protocols |
| `SystemCallFilter` | Restricts system calls |
| `CapabilityBoundingSet` | Minimal Linux capabilities |

### File Permissions

```bash
# Ensure proper ownership
sudo chown -R thelookup:thelookup /opt/thelookup

# Restrict permissions
sudo chmod 755 /opt/thelookup
sudo chmod -R 755 /opt/thelookup/app
sudo chmod 750 /opt/thelookup/logs

# Make files read-only
sudo chmod -R a-w /opt/thelookup/app
```

### SELinux/AppArmor (Optional)

**For SELinux (RHEL/CentOS):**

```bash
# Set SELinux context
sudo semanage fcontext -a -t httpd_sys_content_t "/opt/thelookup/app(/.*)?"
sudo restorecon -Rv /opt/thelookup/app
```

**For AppArmor (Ubuntu/Debian):**

```bash
# Install apparmor-utils
sudo apt install apparmor-utils

# Create profile
sudo nano /etc/apparmor.d/usr.bin.npx.thelookup
```

## SSL/TLS Configuration

### Using Certbot with nginx

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain and install certificate
sudo certbot --nginx -d thelookup.app -d www.thelookup.app

# Test auto-renewal
sudo certbot renew --dry-run

# Enable auto-renewal timer
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### Using Caddy (Automatic HTTPS)

Caddy automatically obtains and renews Let's Encrypt certificates. No additional configuration needed!

### Manual SSL Configuration with nginx

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name thelookup.app www.thelookup.app;

    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/thelookup.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/thelookup.app/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_stapling on;
    ssl_stapling_verify on;

    # HSTS (optional, be careful)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # ... rest of configuration ...
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name thelookup.app www.thelookup.app;
    return 301 https://$server_name$request_uri;
}
```

## Firewall Configuration

### Using UFW (Ubuntu/Debian)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# If using custom port for Node.js server
# sudo ufw allow 8080/tcp

# Check status
sudo ufw status verbose
```

### Using firewalld (RHEL/CentOS)

```bash
# Start and enable firewalld
sudo systemctl enable firewalld
sudo systemctl start firewalld

# Allow HTTP and HTTPS
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https

# Reload
sudo firewall-cmd --reload

# Check status
sudo firewall-cmd --list-all
```

### Using iptables (Manual)

```bash
# Allow established connections
sudo iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
sudo iptables -A INPUT -i lo -j ACCEPT

# Allow SSH
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP/HTTPS
sudo iptables -A INPUT -p tcp --dport 80 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Drop everything else
sudo iptables -A INPUT -j DROP

# Save rules (Ubuntu/Debian)
sudo apt install iptables-persistent
sudo netfilter-persistent save
```

## Monitoring and Logs

### View Service Logs

```bash
# Follow live logs
sudo journalctl -u thelookup -f

# View recent logs
sudo journalctl -u thelookup -n 100

# View logs from specific time
sudo journalctl -u thelookup --since "2025-01-01 00:00:00"

# View logs with specific priority
sudo journalctl -u thelookup -p err
```

### nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/thelookup_access.log

# Error logs
sudo tail -f /var/log/nginx/thelookup_error.log
```

### Set Up Log Rotation

Create `/etc/logrotate.d/thelookup`:

```bash
sudo nano /etc/logrotate.d/thelookup
```

```
/opt/thelookup/logs/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    missingok
    create 0640 thelookup thelookup
    sharedscripts
    postrotate
        systemctl reload thelookup > /dev/null 2>&1 || true
    endscript
}
```

### Monitoring with systemd

```bash
# Check service status
sudo systemctl status thelookup

# Check if service is active
sudo systemctl is-active thelookup

# Check if service is enabled
sudo systemctl is-enabled thelookup

# Show service properties
sudo systemctl show thelookup
```

### Optional: Set Up Monitoring Alerts

Install and configure monitoring tools:

```bash
# Install prometheus-node-exporter
sudo apt install prometheus-node-exporter

# Or use custom monitoring
sudo apt install monit

# Configure monit
sudo nano /etc/monit/conf.d/thelookup
```

**Monit configuration:**

```
check process thelookup with pidfile /run/thelookup.pid
    start program = "/bin/systemctl start thelookup"
    stop program = "/bin/systemctl stop thelookup"
    if failed host 127.0.0.1 port 8080 protocol http then restart
    if 5 restarts within 5 cycles then alert
```

## Updating the Application

### Manual Update Process

```bash
# Stop the service
sudo systemctl stop thelookup

# Navigate to repository
cd ~/thelookup

# Pull latest changes
git fetch origin
git pull origin main

# Rebuild
npm run build

# Backup current version
sudo cp -r /opt/thelookup/app /opt/thelookup/app.backup.$(date +%Y%m%d)

# Deploy new version
sudo rm -rf /opt/thelookup/app/*
sudo cp -r dist/* /opt/thelookup/app/
sudo chown -R thelookup:thelookup /opt/thelookup/app
sudo chmod -R 755 /opt/thelookup/app

# Start the service
sudo systemctl start thelookup

# Verify
sudo systemctl status thelookup
```

### Automated Update Script

Create `/usr/local/bin/update-thelookup.sh`:

```bash
#!/bin/bash
set -e

REPO_DIR="/home/admin/thelookup"
APP_DIR="/opt/thelookup/app"
BACKUP_DIR="/opt/thelookup/backups"
SERVICE_NAME="thelookup"

echo "Starting TheLookup update..."

# Create backup
echo "Creating backup..."
mkdir -p "$BACKUP_DIR"
BACKUP_NAME="app.backup.$(date +%Y%m%d_%H%M%S)"
cp -r "$APP_DIR" "$BACKUP_DIR/$BACKUP_NAME"

# Update repository
echo "Pulling latest changes..."
cd "$REPO_DIR"
git fetch origin
git pull origin main

# Build
echo "Building application..."
npm run build

# Stop service
echo "Stopping service..."
systemctl stop "$SERVICE_NAME"

# Deploy
echo "Deploying new version..."
rm -rf "$APP_DIR"/*
cp -r dist/* "$APP_DIR"/
chown -R thelookup:thelookup "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Start service
echo "Starting service..."
systemctl start "$SERVICE_NAME"

# Verify
echo "Verifying service..."
sleep 3
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo "✓ Update successful! Service is running."

    # Clean old backups (keep last 5)
    cd "$BACKUP_DIR"
    ls -t | tail -n +6 | xargs -r rm -rf
else
    echo "✗ Service failed to start! Rolling back..."
    rm -rf "$APP_DIR"/*
    cp -r "$BACKUP_DIR/$BACKUP_NAME"/* "$APP_DIR"/
    systemctl start "$SERVICE_NAME"
    echo "✓ Rollback complete."
    exit 1
fi
```

```bash
# Make executable
sudo chmod +x /usr/local/bin/update-thelookup.sh

# Run update
sudo /usr/local/bin/update-thelookup.sh
```

### Automated Updates with Cron

```bash
# Edit crontab
sudo crontab -e

# Add weekly update (every Sunday at 2 AM)
0 2 * * 0 /usr/local/bin/update-thelookup.sh >> /var/log/thelookup-update.log 2>&1
```

## Troubleshooting

### Service Won't Start

```bash
# Check service status
sudo systemctl status thelookup

# Check logs
sudo journalctl -u thelookup -n 50

# Check file permissions
ls -la /opt/thelookup/app

# Verify user exists
id thelookup

# Test command manually
sudo -u thelookup npx serve -l 8080 -s /opt/thelookup/app
```

### Port Already in Use

```bash
# Find what's using port 8080
sudo lsof -i :8080
sudo netstat -tulpn | grep 8080

# Kill process
sudo kill <PID>

# Or change port in service file
sudo nano /etc/systemd/system/thelookup.service
# Change -l 8080 to -l 8081
sudo systemctl daemon-reload
sudo systemctl restart thelookup
```

### Permission Denied Errors

```bash
# Fix ownership
sudo chown -R thelookup:thelookup /opt/thelookup

# Fix permissions
sudo chmod 755 /opt/thelookup
sudo chmod -R 755 /opt/thelookup/app
```

### nginx 502 Bad Gateway

```bash
# Check if service is running
sudo systemctl status thelookup

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test nginx configuration
sudo nginx -t

# Verify nginx can connect to backend
curl http://localhost:8080
```

### High Memory Usage

```bash
# Check memory usage
sudo systemctl status thelookup

# Add memory limits to service
sudo nano /etc/systemd/system/thelookup.service

# Add under [Service]:
MemoryLimit=512M
MemoryMax=1G

sudo systemctl daemon-reload
sudo systemctl restart thelookup
```

### SELinux Blocking Access

```bash
# Check SELinux denials
sudo ausearch -m avc -ts recent

# Temporarily set to permissive for testing
sudo setenforce 0

# If it works, create proper policy
sudo audit2allow -a -M thelookup
sudo semodule -i thelookup.pp

# Re-enable enforcing
sudo setenforce 1
```

## Performance Optimization

### nginx Tuning

```nginx
# Worker processes
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
    multi_accept on;
}

http {
    # Buffer sizes
    client_body_buffer_size 128k;
    client_max_body_size 10m;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 8k;
    output_buffers 1 32k;
    postpone_output 1460;

    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    keepalive_timeout 65;
    send_timeout 10;

    # ... rest of configuration
}
```

### Caching Strategy

```nginx
# Add to server block
location ~* \.(html)$ {
    expires 1h;
    add_header Cache-Control "public, must-revalidate";
}

location ~* \.(css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

location ~* \.(jpg|jpeg|png|gif|ico|svg|webp)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

## Backup Strategy

### Automated Backups

Create `/usr/local/bin/backup-thelookup.sh`:

```bash
#!/bin/bash
set -e

BACKUP_DIR="/var/backups/thelookup"
APP_DIR="/opt/thelookup/app"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

# Create backup
tar -czf "$BACKUP_DIR/thelookup-$DATE.tar.gz" -C /opt/thelookup app

# Keep only last 30 days of backups
find "$BACKUP_DIR" -name "thelookup-*.tar.gz" -mtime +30 -delete

echo "Backup completed: thelookup-$DATE.tar.gz"
```

```bash
sudo chmod +x /usr/local/bin/backup-thelookup.sh

# Schedule daily backups
sudo crontab -e
# Add:
0 3 * * * /usr/local/bin/backup-thelookup.sh >> /var/log/thelookup-backup.log 2>&1
```

## Complete Example: Production Setup

Here's a complete step-by-step example for Ubuntu 22.04 LTS:

```bash
# 1. Update system
sudo apt update && sudo apt upgrade -y

# 2. Install dependencies
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx git ufw

# 3. Create user and directories
sudo useradd -r -s /usr/sbin/nologin -d /opt/thelookup -m thelookup
sudo mkdir -p /opt/thelookup/{app,logs,backups}

# 4. Clone and build
cd /tmp
git clone https://github.com/nostr-net/thelookup.git
cd thelookup
npm run build

# 5. Deploy files
sudo cp -r dist/* /opt/thelookup/app/
sudo chown -R thelookup:thelookup /opt/thelookup
sudo chmod -R 755 /opt/thelookup/app

# 6. Configure nginx (paste configuration from above)
sudo nano /etc/nginx/sites-available/thelookup
sudo ln -s /etc/nginx/sites-available/thelookup /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# 7. Set up SSL
sudo certbot --nginx -d yourdomain.com

# 8. Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# 9. Verify
curl -I https://yourdomain.com

echo "Deployment complete!"
```

## Conclusion

This guide provides a secure, isolated deployment of TheLookup using systemd. Key benefits:

- **Isolation**: Dedicated system user with restricted permissions
- **Security**: Systemd sandboxing, SELinux/AppArmor, SSL/TLS
- **Reliability**: Automatic restarts, monitoring, logging
- **Maintainability**: Easy updates, backups, rollbacks

For production environments, always:
- Use HTTPS with valid certificates
- Enable firewall rules
- Set up monitoring and alerting
- Implement regular backups
- Keep system and dependencies updated
- Review logs regularly

For questions or issues, refer to the main [README.md](./README.md) or open an issue on GitHub.
