const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

const SERVER_SALT = process.env.SERVER_SALT || crypto.randomBytes(32).toString('hex');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

app.use(cors({
       origin: ['https://julisha-petition.vercel.app'],
       credentials: true
   }));

app.use(express.json());

const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 3,
    message: { success: false, message: 'Too many submission attempts. Please try again later.' }
});

async function initializeDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS votes (
                id SERIAL PRIMARY KEY,
                hashed_identifier VARCHAR(256) UNIQUE NOT NULL,
                verification_type VARCHAR(10) NOT NULL CHECK (verification_type IN ('id', 'phone')),
                county VARCHAR(100) NOT NULL,
                comment TEXT,
                ip_hash VARCHAR(256),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                verification_token VARCHAR(20)
            );
        `);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_hashed_identifier ON votes(hashed_identifier);`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_county ON votes(county);`);
        await pool.query(`
            CREATE TABLE IF NOT EXISTS verification_codes (
                id SERIAL PRIMARY KEY,
                phone_hash VARCHAR(256) NOT NULL,
                code VARCHAR(4) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                used BOOLEAN DEFAULT FALSE,
                expires_at TIMESTAMP NOT NULL
            );
        `);
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
}

function doubleHash(clientHash) {
    return crypto.createHash('sha256').update(clientHash + SERVER_SALT).digest('hex');
}

function hashIP(ip) {
    return crypto.createHash('sha256').update(ip + SERVER_SALT).digest('hex');
}

function generateVerificationCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

async function hasVoted(hashedIdentifier) {
    const result = await pool.query('SELECT id FROM votes WHERE hashed_identifier = $1', [hashedIdentifier]);
    return result.rows.length > 0;
}

async function getIPSubmissionCount(ipHash) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await pool.query(
        'SELECT COUNT(*) FROM votes WHERE ip_hash = $1 AND created_at > $2',
        [ipHash, twentyFourHoursAgo]
    );
    return parseInt(result.rows[0].count);
}

app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
});

app.get('/api/votes/count', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) FROM votes');
        const count = parseInt(result.rows[0].count);
        res.json({
            success: true,
            count: count,
            target: 1000000,
            percentage: ((count / 1000000) * 100).toFixed(2)
        });
    } catch (error) {
        console.error('Error getting vote count:', error);
        res.status(500).json({ success: false, message: 'Error retrieving vote count' });
    }
});

app.get('/api/votes/counties', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT county, COUNT(*) as count
            FROM votes
            GROUP BY county
            ORDER BY count DESC
        `);
        res.json({ success: true, counties: result.rows });
    } catch (error) {
        console.error('Error getting county stats:', error);
        res.status(500).json({ success: false, message: 'Error retrieving county statistics' });
    }
});

app.post('/api/votes/verify-phone', async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        if (!phoneNumber) {
            return res.status(400).json({ success: false, message: 'Phone number is required' });
        }
        const phoneHash = crypto.createHash('sha256').update(phoneNumber + SERVER_SALT).digest('hex');
        const alreadyVoted = await hasVoted(phoneHash);
        if (alreadyVoted) {
            return res.status(400).json({
                success: false,
                message: 'This phone number has already been used to sign the petition.'
            });
        }
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
        await pool.query(
            'INSERT INTO verification_codes (phone_hash, code, expires_at) VALUES ($1, $2, $3)',
            [phoneHash, code, expiresAt]
        );
        res.json({
            success: true,
            message: 'Verification code sent successfully',
            code: code
        });
    } catch (error) {
        console.error('Phone verification error:', error);
        res.status(500).json({ success: false, message: 'Error sending verification code' });
    }
});

app.post('/api/votes/submit', submitLimiter, async (req, res) => {
    try {
        const { type, identifier, verificationCode, county, comment } = req.body;
        if (!type || !identifier || !county) {
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }
        if (!['id', 'phone'].includes(type)) {
            return res.status(400).json({ success: false, message: 'Invalid verification type' });
        }
        const finalHash = doubleHash(identifier);
        const alreadyVoted = await hasVoted(finalHash);
        if (alreadyVoted) {
            return res.status(400).json({
                success: false,
                message: 'You have already signed this petition. Thank you for your support!'
            });
        }
        if (type === 'phone') {
            if (!verificationCode) {
                return res.status(400).json({ success: false, message: 'Verification code is required' });
            }
            const phoneHash = crypto.createHash('sha256').update(identifier + SERVER_SALT).digest('hex');
            const codeResult = await pool.query(
                `SELECT id FROM verification_codes 
                 WHERE phone_hash = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()`,
                [phoneHash, verificationCode]
            );
            if (codeResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired verification code'
                });
            }
            await pool.query('UPDATE verification_codes SET used = TRUE WHERE id = $1', [codeResult.rows[0].id]);
        }
        let clientIP = req.headers['x-forwarded-for'];
        if (!clientIP && req.socket) {
            clientIP = req.socket.remoteAddress;
        }
        if (!clientIP) {
            clientIP = 'unknown';
        }
        const ipHash = hashIP(clientIP);
        const ipCount = await getIPSubmissionCount(ipHash);
        if (ipCount >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Too many submissions from this network. Please try again later.'
            });
        }
        const verificationToken = 'VERIFY-' + crypto.randomBytes(4).toString('hex').toUpperCase();
        await pool.query(
            `INSERT INTO votes (hashed_identifier, verification_type, county, comment, ip_hash, verification_token)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [finalHash, type, county, comment || null, ipHash, verificationToken]
        );
        const countResult = await pool.query('SELECT COUNT(*) FROM votes');
        const totalVotes = parseInt(countResult.rows[0].count);
        res.json({
            success: true,
            message: 'Your voice has been recorded!',
            totalVotes: totalVotes,
            verificationToken: verificationToken
        });
    } catch (error) {
        console.error('Vote submission error:', error);
        res.status(500).json({ success: false, message: 'Error recording your vote. Please try again.' });
    }
});

app.get('/api/admin/recent-votes', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        const adminSecret = process.env.ADMIN_SECRET || 'change_this_secret';
        if (authHeader !== `Bearer ${adminSecret}`) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }
        const result = await pool.query(`
            SELECT 
                verification_type,
                county,
                SUBSTRING(comment, 1, 50) as comment_preview,
                created_at
            FROM votes
            ORDER BY created_at DESC
            LIMIT 50
        `);
        res.json({ success: true, votes: result.rows });
    } catch (error) {
        console.error('Error fetching recent votes:', error);
        res.status(500).json({ success: false, message: 'Error retrieving votes' });
    }
});

async function startServer() {
    try {
        await initializeDatabase();
        app.listen(PORT, () => {
            console.log(`Julisha API running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
