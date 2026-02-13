# Julisha Petition Platform - Deployment Guide

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database running
- Git installed

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Setup Database
```bash
# Create a PostgreSQL database
createdb julisha_petition

# Or using SQL:
psql -U postgres
CREATE DATABASE julisha_petition;
\q
```

### Step 3: Configure Environment
```bash
# Copy environment template
cp .env.example .env

# Edit .env with your values
nano .env
```

Required variables:
```
DATABASE_URL=postgresql://username:password@localhost:5432/julisha_petition
SERVER_SALT=your_secure_random_salt_here
ADMIN_SECRET=your_admin_secret_here
```

### Step 4: Start Server
```bash
# Development mode (auto-restart on changes)
npm run dev

# Production mode
npm start
```

The server will start on http://localhost:3000

### Step 5: Open Frontend
Open `index.html` in your browser or serve it:
```bash
# Option 1: Simple HTTP server
python3 -m http.server 8000

# Option 2: Using Node.js
npx http-server -p 8000
```

Access at: http://localhost:8000

---

## ☁️ Production Deployment

### Option A: Deploy to Render (Recommended - Free Tier)

#### 1. Deploy Backend
1. Create account at https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: julisha-petition-api
   - **Environment**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

5. Add Environment Variables:
   ```
   DATABASE_URL=[Your Render PostgreSQL URL]
   SERVER_SALT=[Generate secure random string]
   ADMIN_SECRET=[Generate secure random string]
   NODE_ENV=production
   ```

6. Click "Create Web Service"

#### 2. Setup Database
1. In Render Dashboard → "New +" → "PostgreSQL"
2. Name: `julisha-petition-db`
3. Copy the **Internal Database URL**
4. Add to your Web Service as `DATABASE_URL`

#### 3. Deploy Frontend
1. "New +" → "Static Site"
2. Connect repository
3. **Publish Directory**: `.` (root)
4. Add Environment Variable:
   - `API_URL` = Your backend URL (e.g., `https://julisha-petition-api.onrender.com/api`)

5. Update `app.js`:
   ```javascript
   const API_URL = 'https://julisha-petition-api.onrender.com/api';
   ```

Your site will be live at: `https://your-site-name.onrender.com`

---

### Option B: Deploy to Railway

1. Create account at https://railway.app
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway auto-detects Node.js and creates:
   - Web service
   - PostgreSQL database (automatically linked)

5. Add Environment Variables in Railway dashboard:
   ```
   SERVER_SALT=[Generate secure random string]
   ADMIN_SECRET=[Generate secure random string]
   NODE_ENV=production
   ```

6. Deploy frontend to Railway Static Sites or Vercel

---

### Option C: Deploy to Vercel (Frontend) + Railway (Backend)

#### Backend on Railway:
Follow Railway steps above

#### Frontend on Vercel:
1. Install Vercel CLI: `npm i -g vercel`
2. In your project directory:
   ```bash
   vercel
   ```
3. Follow prompts
4. Update `app.js` with your Railway API URL

---

### Option D: Traditional VPS (DigitalOcean, Linode, etc.)

```bash
# SSH into your server
ssh root@your-server-ip

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Clone repository
git clone https://github.com/yourusername/julisha-petition.git
cd julisha-petition

# Install dependencies
npm install

# Setup database
sudo -u postgres createdb julisha_petition

# Configure environment
cp .env.example .env
nano .env

# Install PM2 (process manager)
sudo npm install -g pm2

# Start server
pm2 start server.js --name julisha-api

# Setup nginx reverse proxy
sudo apt-get install nginx
sudo nano /etc/nginx/sites-available/julisha
```

Nginx configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /path/to/julisha-petition;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/julisha /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Setup SSL with Let's Encrypt
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔒 Security Checklist

### Before Going Live:

- [ ] Change all default secrets in `.env`
- [ ] Use strong `SERVER_SALT` (32+ characters random)
- [ ] Use strong `ADMIN_SECRET`
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure CORS properly (restrict origins)
- [ ] Set up database backups
- [ ] Enable rate limiting (already configured)
- [ ] Review logs regularly
- [ ] Set up monitoring (UptimeRobot, etc.)

### Generate Secure Secrets:
```bash
# Run in terminal:
node -e "console.log('SERVER_SALT=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('ADMIN_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📱 SMS Integration (Optional)

### Setup Africa's Talking (Kenyan SMS Provider)

1. Sign up at https://africastalking.com
2. Get API credentials
3. Add to `.env`:
   ```
   AFRICASTALKING_USERNAME=your_username
   AFRICASTALKING_API_KEY=your_api_key
   ```

4. Install SDK:
   ```bash
   npm install africastalking
   ```

5. Update `server.js`:
   ```javascript
   const AfricasTalking = require('africastalking');
   
   const sms = AfricasTalking({
       apiKey: process.env.AFRICASTALKING_API_KEY,
       username: process.env.AFRICASTALKING_USERNAME
   }).SMS;
   
   async function sendSMS(phoneNumber, message) {
       try {
           const result = await sms.send({
               to: [phoneNumber],
               message: message,
               from: 'JULISHA'
           });
           return result;
       } catch (error) {
           console.error('SMS Error:', error);
           throw error;
       }
   }
   ```

Cost: ~KES 0.80 per SMS = KES 800,000 for 1M verifications

---

## 📊 Admin Dashboard Access

Access vote statistics:
```bash
# Get vote count
curl https://your-api-url.com/api/votes/count

# Get county breakdown
curl https://your-api-url.com/api/votes/counties

# Get recent votes (requires authentication)
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
     https://your-api-url.com/api/admin/recent-votes
```

---

## 🔥 Performance Optimization

### Frontend:
- Minify CSS/JS before deployment
- Use CDN for static assets
- Enable browser caching
- Compress images

### Backend:
- Enable PostgreSQL connection pooling (already configured)
- Set up Redis for caching vote counts
- Use CDN for API (Cloudflare)
- Monitor database queries

### Scaling:
- **0-10K votes**: Single server is fine
- **10K-100K votes**: Add database read replicas
- **100K-1M votes**: Load balancer + multiple app servers
- **1M+ votes**: Horizontal scaling + caching layer

---

## 📈 Monitoring

### Recommended Tools:
- **Uptime**: UptimeRobot (free)
- **Errors**: Sentry (error tracking)
- **Analytics**: Plausible (privacy-friendly)
- **Logs**: Papertrail, Logtail

---

## 🛡️ DDoS Protection

### Cloudflare Setup (Free):
1. Sign up at https://cloudflare.com
2. Add your domain
3. Update nameservers
4. Enable:
   - DDoS Protection
   - Rate Limiting
   - Web Application Firewall (WAF)
   - Bot Fight Mode

---

## 🗄️ Database Backups

### Automated Backups:
```bash
# Create backup script
nano backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump julisha_petition > backups/backup_$DATE.sql
# Upload to S3 or Google Drive
```

```bash
chmod +x backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

---

## 🚨 Troubleshooting

### Server won't start:
```bash
# Check logs
pm2 logs

# Check if port is in use
lsof -i :3000

# Restart server
pm2 restart julisha-api
```

### Database connection fails:
```bash
# Test connection
psql $DATABASE_URL

# Check PostgreSQL status
sudo systemctl status postgresql
```

### High latency:
- Check database indexes are created
- Enable query caching
- Use CDN for static assets

---

## 📞 Support

For deployment issues:
- Check server logs: `pm2 logs` or `heroku logs --tail`
- Monitor database: `psql $DATABASE_URL`
- Test API: `curl https://your-api.com/api/health`

---

## 🎯 Next Steps After Deployment

1. Test thoroughly (try submitting votes)
2. Monitor initial traffic
3. Set up analytics
4. Prepare social media campaign
5. Have legal counsel review
6. Plan for scaling if viral

---

**Remember**: This platform handles sensitive political data. Prioritize security and privacy at every step.
