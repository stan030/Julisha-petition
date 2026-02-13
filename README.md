# Julisha Petition Platform 🇰🇪

**Constitutional Digital Petition & Voter Tally Platform for Kenya 2026**

A privacy-preserving petition platform built under Article 257 of the Constitution of Kenya, enabling 1 million verified Kenyan voters to petition for accountability.

---

## 🎯 Project Overview

### Purpose
Collect 1 million verified signatures from Kenyan citizens petitioning for economic accountability, citing:
- Youth unemployment crisis (67% of unemployed are under 35)
- Over-taxation through the 2026 Finance Bill
- Economic mismanagement and rising public debt
- Broken social contract between leaders and citizens

### Legal Basis
- **Article 37**: Right to Assembly and Petition
- **Article 257**: Popular Initiative
- **Data Protection Act 2019**: Privacy by Design

---

## ✨ Key Features

### Dual Verification System
- ✅ **Option A**: National ID/Passport verification (instant)
- ✅ **Option B**: Phone number verification (SMS code)
- Users choose their preferred method

### Privacy-First Architecture
- 🔒 **No Personal Data Stored**: Only cryptographic hashes
- 🔒 **Client-Side Hashing**: IDs never leave user's browser in plain text
- 🔒 **Double Hashing**: Server adds additional salt layer
- 🔒 **IP Protection**: IP addresses are also hashed
- 🔒 **Right to be Forgotten**: Compliant by design (no PII to delete)

### Anti-Fraud Measures
- ✅ Unique identifier deduplication (prevents double voting)
- ✅ Rate limiting (max 3 submissions per IP per 24 hours)
- ✅ Phone verification with time-limited codes (10 minutes)
- ✅ reCAPTCHA integration ready

### Real-Time Engagement
- 📊 Live vote counter (updates every 10 seconds)
- 📊 Progress bar toward 1M goal
- 📊 County-level statistics
- 📊 WhatsApp share functionality for viral growth

### Production-Ready
- ⚡ Optimized for high traffic (1M+ users)
- ⚡ PostgreSQL with indexed queries
- ⚡ Express rate limiting and CORS protection
- ⚡ Responsive mobile-first design
- ⚡ Cloudflare DDoS protection ready

---

## 🏗️ Technical Architecture

### Frontend
- **HTML5** + **CSS3** (Custom design, no frameworks)
- **Vanilla JavaScript** (No dependencies except Crypto-JS)
- **Bebas Neue** + **Work Sans** fonts
- **Kenya flag colors** design system
- **Mobile-first responsive** design

### Backend
- **Node.js** + **Express.js**
- **PostgreSQL** database
- **express-rate-limit** for API protection
- **Crypto** module for hashing

### Security Stack
```
User Input → Client Hash (SHA-256 + Public Salt)
           ↓
           Server Hash (SHA-256 + Secret Salt)
           ↓
           Database Storage (Irreversible)
```

**Even if database is stolen**: Attackers get meaningless hashes they cannot reverse.

---

## 📁 Project Structure

```
julisha-petition/
├── index.html              # Main landing page
├── app.js                  # Client-side logic
├── server.js               # Backend API
├── package.json            # Dependencies
├── .env.example            # Environment template
├── DEPLOYMENT.md           # Detailed deployment guide
├── README.md               # This file
└── backups/                # Database backup directory
```

---

## 🚀 Quick Start

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/julisha-petition.git
cd julisha-petition
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database
```bash
# Create PostgreSQL database
createdb julisha_petition
```

### 4. Configure Environment
```bash
cp .env.example .env
nano .env
```

Required variables:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/julisha_petition
SERVER_SALT=your_secure_random_salt
ADMIN_SECRET=your_admin_password
```

Generate secure salts:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Start Backend
```bash
npm run dev
```

### 6. Serve Frontend
```bash
# Option 1: Python
python3 -m http.server 8000

# Option 2: Node.js
npx http-server -p 8000
```

### 7. Access Platform
- **Frontend**: http://localhost:8000
- **Backend**: http://localhost:3000
- **API Health**: http://localhost:3000/api/health

---

## 🌐 Deployment

### Recommended Stack (Free Tier)
- **Backend**: Render.com (Free PostgreSQL + Web Service)
- **Frontend**: Vercel or Netlify (Free static hosting)
- **DNS/CDN**: Cloudflare (Free DDoS protection)

See **[DEPLOYMENT.md](DEPLOYMENT.md)** for detailed instructions.

---

## 🔐 Security Features

### Data Protection
- ✅ AES-256 equivalent hashing (SHA-256 + salt)
- ✅ No reversible encryption of identifiers
- ✅ IP addresses hashed
- ✅ HTTPS enforced (in production)
- ✅ CORS restricted to allowed origins

### Fraud Prevention
- ✅ Server-side deduplication
- ✅ Rate limiting (IP-based)
- ✅ Phone verification with expiring codes
- ✅ Comment length limits (prevent spam)
- ✅ SQL injection protection (parameterized queries)

### Compliance
- ✅ Data Protection Act 2019 compliant
- ✅ Privacy by Design principle
- ✅ No PII storage
- ✅ Audit trail via timestamps
- ✅ Right to be forgotten (no data to delete)

---

## 📊 API Endpoints

### Public Endpoints

#### Get Vote Count
```bash
GET /api/votes/count
```
Response:
```json
{
  "success": true,
  "count": 42350,
  "target": 1000000,
  "percentage": "4.24"
}
```

#### Get County Statistics
```bash
GET /api/votes/counties
```
Response:
```json
{
  "success": true,
  "counties": [
    { "county": "Nairobi", "count": 15234 },
    { "county": "Mombasa", "count": 8721 },
    ...
  ]
}
```

#### Submit Vote (ID Verification)
```bash
POST /api/votes/submit
Content-Type: application/json

{
  "type": "id",
  "identifier": "hashed_id_from_client",
  "county": "Nairobi",
  "comment": "We demand accountability"
}
```

#### Request Phone Verification
```bash
POST /api/votes/verify-phone
Content-Type: application/json

{
  "phoneNumber": "+254712345678"
}
```

### Admin Endpoints (Authenticated)

#### Get Recent Votes
```bash
GET /api/admin/recent-votes
Authorization: Bearer YOUR_ADMIN_SECRET
```

---

## 🎨 Design System

### Colors
```css
--kenya-red: #BB0000
--kenya-green: #006B3F
--kenya-black: #000000
--gold: #FDB913
```

### Typography
- **Display**: Bebas Neue (bold, impactful headers)
- **Body**: Work Sans (clean, readable)

### Responsive Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

---

## 📈 Scaling Strategy

### Traffic Expectations
- **Week 1**: 1K - 10K votes
- **Month 1**: 10K - 100K votes
- **Target**: 1M votes in 3-6 months

### Infrastructure Scaling
- **0-10K**: Single server (Free tier)
- **10K-100K**: Database optimization, CDN
- **100K-1M**: Load balancer, multiple app servers
- **1M+**: Horizontal scaling, Redis caching

---

## 🔧 Configuration Options

### Enable SMS Verification (Optional)
1. Sign up for Africa's Talking API
2. Add credentials to `.env`:
   ```
   AFRICASTALKING_USERNAME=your_username
   AFRICASTALKING_API_KEY=your_api_key
   ```
3. Uncomment SMS code in `server.js`
4. Cost: ~KES 0.80 per SMS

### Enable reCAPTCHA (Recommended)
1. Get keys from https://www.google.com/recaptcha
2. Add to `index.html`:
   ```html
   <script src="https://www.google.com/recaptcha/api.js" async defer></script>
   ```
3. Validate on server before submission

---

## 🧪 Testing

### Manual Testing Checklist
- [ ] Submit vote with ID verification
- [ ] Submit vote with phone verification
- [ ] Try submitting twice with same ID (should fail)
- [ ] Check counter updates in real-time
- [ ] Test rate limiting (submit 4 times quickly)
- [ ] Verify WhatsApp share link works
- [ ] Test on mobile devices
- [ ] Check county dropdown includes all 47 counties

### Load Testing
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test with 1000 requests, 10 concurrent
ab -n 1000 -c 10 http://localhost:3000/api/votes/count
```

---

## 🐛 Known Issues & Limitations

- SMS integration requires paid API (Africa's Talking)
- Rate limiting is IP-based (can be bypassed with VPN)
- No email verification option (by design for simplicity)
- No admin dashboard UI (use API endpoints)

---

## 🤝 Contributing

This is a civic tech project. Contributions welcome:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/improvement`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/improvement`)
5. Open Pull Request

---

## 📜 Legal Disclaimer

This platform is designed to facilitate constitutional rights under:
- **Article 37**: Right to Assembly, Demonstration, Picketing, and Petition
- **Article 257**: Popular Initiative

Users participate voluntarily. The platform does not store personal information and operates under Privacy by Design principles.

⚠️ **Important**: Consult legal counsel before launching. Ensure compliance with:
- Data Protection Act 2019
- IEBC regulations on popular initiatives
- Computer Misuse and Cybercrimes Act 2018

---

## 📞 Support & Contact

- **Issues**: Open a GitHub issue
- **Security**: Email security@yourdomain.com
- **General**: info@yourdomain.com

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🙏 Acknowledgments

Built for the people of Kenya 🇰🇪

*"The power of the people is greater than the people in power."*

---

**Version**: 1.0.0  
**Last Updated**: February 2026  
**Status**: Ready for Deployment ✅
