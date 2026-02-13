const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || './database.db';

class Database {
    constructor() {
        this.db = new sqlite3.Database(DB_PATH, (err) => {
            if (err) {
                console.error('Error opening database:', err);
            } else {
                console.log('✅ Connected to SQLite database');
                this.initializeSchema();
            }
        });
    }

    initializeSchema() {
        const schema = `
            CREATE TABLE IF NOT EXISTS keys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                key TEXT UNIQUE NOT NULL,
                hwid TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at DATETIME,
                is_active BOOLEAN DEFAULT 1,
                last_used DATETIME
            )
        `;

        this.db.run(schema, (err) => {
            if (err) {
                console.error('Error creating schema:', err);
            } else {
                console.log('✅ Database schema initialized');
            }
        });
    }

    // Generate a random license key
    generateKey() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const segments = 4;
        const segmentLength = 4;

        let key = '';
        for (let i = 0; i < segments; i++) {
            for (let j = 0; j < segmentLength; j++) {
                key += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            if (i < segments - 1) key += '-';
        }
        return key;
    }

    // Create a new license key
    createKey(expiryDays = 30) {
        return new Promise((resolve, reject) => {
            const key = this.generateKey();
            const expiresAt = expiryDays > 0
                ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString()
                : null; // null = lifetime

            const query = `INSERT INTO keys (key, expires_at) VALUES (?, ?)`;

            this.db.run(query, [key, expiresAt], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ key, expiresAt, id: this.lastID });
                }
            });
        });
    }

    // Validate a license key
    validateKey(key, hwid) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM keys WHERE key = ? AND is_active = 1`;

            this.db.get(query, [key], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (!row) {
                    resolve({ valid: false, message: 'Invalid license key' });
                    return;
                }

                // Check if expired
                if (row.expires_at) {
                    const expiryDate = new Date(row.expires_at);
                    if (expiryDate < new Date()) {
                        resolve({ valid: false, message: 'License key expired' });
                        return;
                    }
                }

                // Check HWID
                if (row.hwid && row.hwid !== hwid) {
                    resolve({ valid: false, message: 'License key already bound to another PC' });
                    return;
                }

                // Bind HWID if not already bound
                if (!row.hwid) {
                    this.updateHWID(key, hwid);
                }

                // Update last used
                this.updateLastUsed(key);

                resolve({
                    valid: true,
                    message: 'License valid',
                    expiresAt: row.expires_at
                });
            });
        });
    }

    // Update HWID for a key
    updateHWID(key, hwid) {
        const query = `UPDATE keys SET hwid = ? WHERE key = ?`;
        this.db.run(query, [hwid, key]);
    }

    // Update last used timestamp
    updateLastUsed(key) {
        const query = `UPDATE keys SET last_used = CURRENT_TIMESTAMP WHERE key = ?`;
        this.db.run(query, [key]);
    }

    // Get all keys
    getAllKeys() {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM keys ORDER BY created_at DESC`;
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Delete a key
    deleteKey(key) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM keys WHERE key = ?`;
            this.db.run(query, [key], function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ success: true, changes: this.changes });
                }
            });
        });
    }

    // Get statistics
    getStats() {
        return new Promise((resolve, reject) => {
            const queries = {
                total: `SELECT COUNT(*) as count FROM keys`,
                active: `SELECT COUNT(*) as count FROM keys WHERE is_active = 1 AND (expires_at IS NULL OR expires_at > datetime('now'))`,
                expired: `SELECT COUNT(*) as count FROM keys WHERE expires_at IS NOT NULL AND expires_at <= datetime('now')`,
                bound: `SELECT COUNT(*) as count FROM keys WHERE hwid IS NOT NULL`
            };

            const stats = {};
            let completed = 0;

            Object.keys(queries).forEach(key => {
                this.db.get(queries[key], [], (err, row) => {
                    if (!err) {
                        stats[key] = row.count;
                    }
                    completed++;
                    if (completed === Object.keys(queries).length) {
                        resolve(stats);
                    }
                });
            });
        });
    }

    // Close database connection
    close() {
        this.db.close((err) => {
            if (err) {
                console.error('Error closing database:', err);
            } else {
                console.log('Database connection closed');
            }
        });
    }
}

module.exports = new Database();
