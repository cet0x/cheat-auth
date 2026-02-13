require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// GitHub'a yanlıslikla ana dizine yuklenen dosyalar icin kurtarici:
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));
app.get('/admin.css', (req, res) => res.sendFile(path.join(__dirname, 'admin.css')));
app.get('/admin.js', (req, res) => res.sendFile(path.join(__dirname, 'admin.js')));

// Rate limiting for validation endpoint
const validationLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many validation requests, please try again later'
});

// Rate limiting for admin endpoints
const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 50,
    message: 'Too many admin requests, please try again later'
});

// Simple admin authentication middleware
const adminAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const base64Credentials = authHeader.split(' ')[1];
    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
};

// ==================== PUBLIC ENDPOINTS ====================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'online', timestamp: new Date().toISOString() });
});

// Validate license key
app.post('/api/validate', validationLimiter, async (req, res) => {
    try {
        const { key, hwid } = req.body;

        if (!key || !hwid) {
            return res.status(400).json({
                valid: false,
                message: 'Key and HWID are required'
            });
        }

        const result = await db.validateKey(key, hwid);
        res.json(result);
    } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
            valid: false,
            message: 'Server error during validation'
        });
    }
});

// ==================== ADMIN ENDPOINTS ====================

// Generate new license key
app.post('/api/admin/generate', adminAuth, adminLimiter, async (req, res) => {
    try {
        const { expiryDays } = req.body;
        const days = parseInt(expiryDays) || 30;

        const result = await db.createKey(days);
        res.json(result);
    } catch (error) {
        console.error('Key generation error:', error);
        res.status(500).json({ error: 'Failed to generate key' });
    }
});

// Get all license keys
app.get('/api/admin/keys', adminAuth, adminLimiter, async (req, res) => {
    try {
        const keys = await db.getAllKeys();
        res.json(keys);
    } catch (error) {
        console.error('Error fetching keys:', error);
        res.status(500).json({ error: 'Failed to fetch keys' });
    }
});

// Delete a license key
app.delete('/api/admin/keys/:key', adminAuth, adminLimiter, async (req, res) => {
    try {
        const { key } = req.params;
        const result = await db.deleteKey(key);
        res.json(result);
    } catch (error) {
        console.error('Error deleting key:', error);
        res.status(500).json({ error: 'Failed to delete key' });
    }
});

// Get statistics
app.get('/api/admin/stats', adminAuth, adminLimiter, async (req, res) => {
    try {
        const stats = await db.getStats();
        res.json(stats);
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

// Test admin authentication
app.get('/api/admin/test', adminAuth, (req, res) => {
    res.json({ authenticated: true, message: 'Admin access granted' });
});

// ==================== START SERVER ====================

app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║         CS2 License Server - Online & Ready          ║
╚═══════════════════════════════════════════════════════╝

🚀 Server running on: http://localhost:${PORT}
🔐 Admin Panel: http://localhost:${PORT}/admin.html
📊 API Health: http://localhost:${PORT}/api/health

Admin Credentials:
  Username: ${process.env.ADMIN_USERNAME}
  Password: ${process.env.ADMIN_PASSWORD}

⚠️  IMPORTANT: Change admin password in .env file!
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down server...');
    db.close();
    process.exit(0);
});
