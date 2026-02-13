# Julisha Petition - Quick Reference Guide

## 🚀 Getting Started (5 Minutes)

### 1. Install & Setup
```bash
# Make setup script executable
chmod +x setup.sh

# Run automated setup
./setup.sh
```

### 2. Start the Application
```bash
# Terminal 1: Start backend
npm start

# Terminal 2: Start frontend
python3 -m http.server 8000
```

### 3. Access
- **Platform**: http://localhost:8000
- **Admin**: http://localhost:8000/admin.html
- **API**: http://localhost:3000/api/health

---

## 🔑 Environment Variables (Essential)

```bash
# Generate secure secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Add to .env:
SERVER_SALT=generated_secret_here
ADMIN_SECRET=generated_secret_here
DATABASE_URL=postgresql://user:pass@localhost:5432/julisha_petition
```

---

## 📡 API Quick Reference

### Get Vote Count
```bash
curl http://localhost:3000/api/votes/count
```

### Submit Vote (ID)
```bash
curl -X POST http://localhost:3000/api/votes/submit \
  -H "Content-Type: application/json" \
  -d '{
    "type": "id",
    "identifier": "hashed_id",
    "county": "Nairobi",
    "comment": "Optional message"
  }'
```

### Admin Access
```bash
curl -H "Authorization: Bearer YOUR_ADMIN_SECRET" \
  http://localhost:3000/api/admin/recent-votes
```

---

## 🐳 Docker Quick Start

```bash
# Start everything (database + API)
docker-compose up -d

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

---

## 🌐 Deployment Checklist

### Pre-Launch
- [ ] Change all secrets in `.env`
- [ ] Test both verification methods
- [ ] Enable HTTPS/SSL
- [ ] Setup Cloudflare DNS
- [ ] Configure CORS origins
- [ ] Test rate limiting

### Go Live
- [ ] Deploy backend to Render/Railway
- [ ] Deploy frontend to Vercel/Netlify
- [ ] Setup database backups
- [ ] Configure monitoring
- [ ] Test end-to-end flow

---

## 🔧 Common Issues & Fixes

### Database Connection Failed
```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Or check Docker
docker-compose ps
```

### Port Already in Use
```bash
# Find process on port 3000
lsof -i :3000

# Kill process
kill -9 PID
```

### Frontend Can't Reach API
```javascript
// In app.js, update API_URL to your deployed backend
const API_URL = 'https://your-api.onrender.com/api';
```

---

## 📊 Monitoring

### Check Vote Count
```bash
# Via API
curl http://localhost:3000/api/votes/count | jq

# Via Database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM votes;"
```

### View Recent Activity
```bash
# Last 10 votes
psql $DATABASE_URL -c "SELECT county, created_at FROM votes ORDER BY created_at DESC LIMIT 10;"
```

---

## 🔐 Security Best Practices

1. **Never commit .env to Git**
2. **Use strong random salts** (32+ characters)
3. **Enable HTTPS** in production
4. **Restrict CORS** to your domain only
5. **Monitor for suspicious activity**
6. **Backup database daily**

---

## 📱 SMS Integration (Optional)

### Africa's Talking Setup
```bash
# Install SDK
npm install africastalking

# Add to .env
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
```

Cost: ~KES 0.80/SMS = KES 800K for 1M verifications

---

## 🎯 Performance Tips

### For 10K - 100K Votes
- Enable database connection pooling ✅ (already configured)
- Use CDN for static assets
- Enable browser caching

### For 100K - 1M Votes
- Add Redis for vote count caching
- Use multiple app servers
- Setup load balancer
- Database read replicas

---

## 📝 Database Backup

### Manual Backup
```bash
# Backup
pg_dump julisha_petition > backup_$(date +%Y%m%d).sql

# Restore
psql julisha_petition < backup_20260213.sql
```

### Automated Daily Backups
```bash
# Add to crontab -e
0 2 * * * pg_dump julisha_petition > /backups/backup_$(date +\%Y\%m\%d).sql
```

---

## 🧪 Testing Commands

### Load Test API
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test 1000 requests
ab -n 1000 -c 10 http://localhost:3000/api/votes/count
```

### Test Rate Limiting
```bash
# Should succeed 3 times, then fail
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/votes/submit \
    -H "Content-Type: application/json" \
    -d '{"type":"id","identifier":"test","county":"Nairobi"}'
  echo ""
done
```

---

## 🌍 DNS & Domain Setup

### Cloudflare Setup
1. Add domain to Cloudflare
2. Update nameservers at registrar
3. Add DNS records:
   - `A` record: `@` → Your server IP
   - `CNAME` record: `www` → `@`
   - `CNAME` record: `api` → Your backend URL

### SSL Certificate (Let's Encrypt)
```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🔄 Updates & Maintenance

### Pull Latest Changes
```bash
git pull origin main
npm install
pm2 restart julisha-api
```

### Database Migrations
```bash
# Add new column example
psql $DATABASE_URL -c "ALTER TABLE votes ADD COLUMN region VARCHAR(50);"
```

---

## 📞 Emergency Procedures

### Site Down
1. Check server status: `pm2 status`
2. Check logs: `pm2 logs julisha-api`
3. Restart: `pm2 restart julisha-api`
4. If database issue: Check PostgreSQL logs

### Under Attack (DDoS)
1. Enable Cloudflare "I'm Under Attack" mode
2. Increase rate limits temporarily
3. Block suspicious IPs
4. Monitor bandwidth usage

---

## 📚 Useful Resources

- **Render Docs**: https://render.com/docs
- **Railway Docs**: https://docs.railway.app
- **PostgreSQL Docs**: https://www.postgresql.org/docs/
- **Node.js Docs**: https://nodejs.org/docs/
- **Africa's Talking**: https://africastalking.com/docs

---

## 🎓 Learning More

### Understanding the Hash System
```javascript
// Client-side (browser)
const hash1 = SHA256(id + PUBLIC_SALT)

// Server-side (Node.js)
const hash2 = SHA256(hash1 + SECRET_SALT)

// Result: Double-hashed = Irreversible
```

### Why Privacy Matters
- Even if database stolen, attackers get meaningless hashes
- Cannot reverse engineer to find who voted
- Protects participants from potential retaliation
- Compliant with Data Protection Act 2019

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Support**: Open GitHub issue or email support@yourdomain.com
