// server.js - Backend API for Julisha Petition Platform

const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Server-side secret salt (KEEP THIS SECRET!)
const SERVER_SALT = process.env.SERVER_SALT || 'CHANGE_THIS_IN_PRODUCTION_' + crypto.randomBytes(32).toString('hex');

// Database Configuration
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(cors());
app.use(express.json());

// Rate Limiting (Prevent Spam/DDoS)
const submitLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3, // Max 3 submissions per IP per 15 minutes
    message: { success: false, message: 'Too many submission attempts. Please try again later.' }
});

const verifyLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Max 5 verification attempts
    message: { success: false, message: 'Too many verification attempts. Please wait a few minutes.' }
});

// Database Initialization
async function initializeDatabase() {
    try {
        // Create votes table
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

        // Create index for faster lookups
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_hashed_identifier ON votes(hashed_identifier);
        `);

        // Create index for county statistics
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_county ON votes(county);
        `);

        // Create verification codes table (for phone verification)
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

        console.log('✅ Database initialized successfully');
    } catch (error) {
        console.error('❌ Database initialization error:', error);
        process.exit(1);
    }
}

// Helper: Double Hash (Add server-side salt)
function doubleHash(clientHash) {
    return crypto.createHash('sha256')
        .update(clientHash + SERVER_SALT)
        .digest('hex');
}

// Helper: Hash IP Address
function hashIP(ip) {
    return crypto.createHash('sha256')
        .update(ip + SERVER_SALT)
        .digest('hex');
}

// Helper: Generate 4-digit verification code
function generateVerificationCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

// Helper: Check if identifier already voted
async function hasVoted(hashedIdentifier) {
    const result = await pool.query(
        'SELECT id FROM votes WHERE hashed_identifier = $1',
        [hashedIdentifier]
    );
    return result.rows.length > 0;
}

// Helper: Check IP submission count
async function getIPSubmissionCount(ipHash) {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await pool.query(
        'SELECT COUNT(*) FROM votes WHERE ip_hash = $1 AND created_at > $2',
        [ipHash, twentyFourHoursAgo]
    );
    return parseInt(result.rows[0].count);
}

// API Routes

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Server is running' });
});

// Get Vote Count
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
        res.status(500).json({
            success: false,
            message: 'Error retrieving vote count'
        });
    }
});

// Get County Statistics
app.get('/api/votes/counties', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT county, COUNT(*) as count
            FROM votes
            GROUP BY county
            ORDER BY count DESC
        `);
        
        res.json({
            success: true,
            counties: result.rows
        });
    } catch (error) {
        console.error('Error getting county stats:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving county statistics'
        });
    }
});

// Phone Verification - Send Code
app.post('/api/votes/verify-phone', verifyLimiter, async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Hash the phone number
        const phoneHash = crypto.createHash('sha256')
            .update(phoneNumber + SERVER_SALT)
            .digest('hex');

        // Check if already voted
        const alreadyVoted = await hasVoted(phoneHash);
        if (alreadyVoted) {
            return res.status(400).json({
                success: false,
                message: 'This phone number has already been used to sign the petition.'
            });
        }

        // Generate verification code
        const code = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store verification code
        await pool.query(
            'INSERT INTO verification_codes (phone_hash, code, expires_at) VALUES ($1, $2, $3)',
            [phoneHash, code, expiresAt]
        );

        // In production, send SMS here using Africa's Talking API
        // await sendSMS(phoneNumber, `Your Julisha Petition verification code is: ${code}`);

        // For demo purposes, return the code (REMOVE IN PRODUCTION!)
        res.json({
            success: true,
            message: 'Verification code sent successfully',
            code: code // REMOVE THIS IN PRODUCTION!
        });

    } catch (error) {
        console.error('Phone verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error sending verification code'
        });
    }
});

// Submit Vote
app.post('/api/votes/submit', submitLimiter, async (req, res) => {
    try {
        const { type, identifier, verificationCode, county, comment } = req.body;

        // Validation
        if (!type || !identifier || !county) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }

        if (!['id', 'phone'].includes(type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid verification type'
            });
        }

        // Double hash the identifier (add server-side salt)
        const finalHash = doubleHash(identifier);

        // Check if already voted
        const alreadyVoted = await hasVoted(finalHash);
        if (alreadyVoted) {
            return res.status(400).json({
                success: false,
                message: 'You have already signed this petition. Thank you for your support!'
            });
        }

        // For phone verification, validate the code
        if (type === 'phone') {
            if (!verificationCode) {
                return res.status(400).json({
                    success: false,
                    message: 'Verification code is required'
                });
            }

            // Check verification code
            const codeResult = await pool.query(
                `SELECT id FROM verification_codes 
                 WHERE phone_hash = $1 AND code = $2 AND used = FALSE AND expires_at > NOW()`,
                [finalHash, verificationCode]
            );

            if (codeResult.rows.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired verification code'
                });
            }

            // Mark code as used
            await pool.query(
                'UPDATE verification_codes SET used = TRUE WHERE id = $1',
                [codeResult.rows[0].id]
            );
        }

        // Hash IP address
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
        const ipHash = hashIP(clientIP);

        // Check IP submission count (anti-spam)
        const ipCount = await getIPSubmissionCount(ipHash);
        if (ipCount >= 3) {
            return res.status(429).json({
                success: false,
                message: 'Too many submissions from this network. Please try again later.'
            });
        }

        // Generate verification token (for potential future verification)
        const verificationToken = 'VERIFY-' + crypto.randomBytes(4).toString('hex').toUpperCase();

        // Insert vote
        await pool.query(
            `INSERT INTO votes (hashed_identifier, verification_type, county, comment, ip_hash, verification_token)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [finalHash, type, county, comment || null, ipHash, verificationToken]
        );

        // Get new total count
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
        res.status(500).json({
            success: false,
            message: 'Error recording your vote. Please try again.'
        });
    }
});

// Admin: Get Recent Votes (with privacy protection)
app.get('/api/admin/recent-votes', async (req, res) => {
    try {
        // Basic auth (in production, use proper authentication)
        const authHeader = req.headers.authorization;
        const adminSecret = process.env.ADMIN_SECRET || 'change_this_secret';
        
        if (authHeader !== `Bearer ${adminSecret}`) {
            return res.status(401).json({
                success: false,
                message: 'Unauthorized'
            });
        }

        const result = await pool.query(`
            SELECT 
                verification_type,
                county,
                LEFT(comment, 50) as comment_preview,
                created_at
            FROM votes
            ORDER BY created_at DESC
            LIMIT 50
        `);

        res.json({
            success: true,
            votes: result.rows
        });
    } catch (error) {
        console.error('Error fetching recent votes:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving votes'
        });
    }
});

// Start Server
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log(`
╔═══════════════════════════════════════╗
║   🇰🇪 JULISHA PETITION API SERVER     ║
║                                       ║
║   Port: ${PORT}                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}          ║
║   Status: ✅ RUNNING                  ║
╚═══════════════════════════════════════╝
            `);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
