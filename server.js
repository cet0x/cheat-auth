const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(express.static(__dirname)); // Kok dizini de statik dosyalar icin kullan

// Admin Panel Routes (Fallback system)
app.get('/admin.html', (req, res) => {
    // Once public icinde ara, yoksa kok dizinde ara
    const publicPath = path.join(__dirname, 'public', 'admin.html');
    const rootPath = path.join(__dirname, 'admin.html');

    res.sendFile(publicPath, (err) => {
        if (err) res.sendFile(rootPath);
    });
});

app.get('/admin.css', (req, res) => {
    const publicPath = path.join(__dirname, 'public', 'admin.css');
    const rootPath = path.join(__dirname, 'admin.css');
    res.sendFile(publicPath, (err) => { if (err) res.sendFile(rootPath); });
});

app.get('/admin.js', (req, res) => {
    const publicPath = path.join(__dirname, 'public', 'admin.js');
    const rootPath = path.join(__dirname, 'admin.js');
    res.sendFile(publicPath, (err) => { if (err) res.sendFile(rootPath); });
});

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Database Setup
const dbPath = process.env.DB_PATH || './database.db';
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        db.run(`CREATE TABLE IF NOT EXISTS licenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code TEXT UNIQUE,
            hwid TEXT,
            is_used BOOLEAN DEFAULT 0,
            expiry_date TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Add specific admin user table if needed, for now using env vars
    }
});

// Admin Authentication Middleware
const authenticateAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const user = auth[0];
    const pass = auth[1];

    if (user === process.env.ADMIN_USERNAME && pass === process.env.ADMIN_PASSWORD) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

// API Routes
app.post('/api/validate', (req, res) => {
    const { key, hwid } = req.body;

    if (!key || !hwid) {
        return res.status(400).json({ valid: false, message: 'Missing key or HWID' });
    }

    db.get('SELECT * FROM licenses WHERE code = ?', [key], (err, row) => {
        if (err) {
            return res.status(500).json({ valid: false, message: 'Database error' });
        }
        if (!row) {
            return res.status(200).json({ valid: false, message: 'Invalid key' });
        }

        // Check HWID binding
        if (row.is_used && row.hwid !== hwid) {
            return res.status(200).json({ valid: false, message: 'Key already used on another machine' });
        }

        // Check Expiry
        if (row.expiry_date && new Date(row.expiry_date) < new Date()) {
            return res.status(200).json({ valid: false, message: 'Key expired' });
        }

        // Bind HWID if new
        if (!row.is_used) {
            db.run('UPDATE licenses SET is_used = 1, hwid = ? WHERE id = ?', [hwid, row.id]);
        }

        res.json({ valid: true, message: 'Success', expiry: row.expiry_date });
    });
});

// Admin API
app.get('/api/admin/keys', authenticateAdmin, (req, res) => {
    db.all('SELECT * FROM licenses ORDER BY created_at DESC', [], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ keys: rows });
    });
});

app.post('/api/admin/generate', authenticateAdmin, (req, res) => {
    const { durationDays, count } = req.body;
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + (durationDays || 30));

    // Generate simple random key
    const key = 'CS2-' + Math.random().toString(36).substr(2, 9).toUpperCase();

    db.run('INSERT INTO licenses (code, expiry_date) VALUES (?, ?)', [key, expiryDate.toISOString()], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ key: key, id: this.lastID });
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
