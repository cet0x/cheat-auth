// Global state
let authCredentials = null;
let allKeys = [];

// API Base URL
const API_BASE = window.location.origin;

// Helper function to make authenticated API calls
async function apiCall(endpoint, options = {}) {
    if (authCredentials) {
        options.headers = {
            ...options.headers,
            'Authorization': `Basic ${btoa(`${authCredentials.username}:${authCredentials.password}`)}`,
            'Content-Type': 'application/json'
        };
    }

    const response = await fetch(`${API_BASE}${endpoint}`, options);

    if (response.status === 401) {
        logout();
        throw new Error('Authentication failed');
    }

    return response.json();
}

// Login functionality
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    authCredentials = { username, password };

    try {
        // Test authentication
        await apiCall('/api/admin/test');

        // Login successful
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('mainPanel').style.display = 'block';

        // Load initial data
        loadStats();
        loadKeys();

    } catch (error) {
        errorDiv.textContent = 'Invalid credentials';
        errorDiv.classList.add('show');
        authCredentials = null;
    }
});

// Logout
function logout() {
    authCredentials = null;
    document.getElementById('loginSection').style.display = 'flex';
    document.getElementById('mainPanel').style.display = 'none';
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// Load statistics
async function loadStats() {
    try {
        const stats = await apiCall('/api/admin/stats');

        document.getElementById('totalKeys').textContent = stats.total || 0;
        document.getElementById('activeKeys').textContent = stats.active || 0;
        document.getElementById('expiredKeys').textContent = stats.expired || 0;
        document.getElementById('boundKeys').textContent = stats.bound || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load all keys
async function loadKeys() {
    try {
        allKeys = await apiCall('/api/admin/keys');
        renderKeys(allKeys);
    } catch (error) {
        console.error('Error loading keys:', error);
        document.getElementById('keysTableBody').innerHTML = `
            <tr><td colspan="7" class="loading">Error loading keys</td></tr>
        `;
    }
}

// Render keys table
function renderKeys(keys) {
    const tbody = document.getElementById('keysTableBody');

    if (keys.length === 0) {
        tbody.innerHTML = `
            <tr><td colspan="7" class="loading">No keys found</td></tr>
        `;
        return;
    }

    tbody.innerHTML = keys.map(key => {
        const createdDate = new Date(key.created_at).toLocaleString();
        const expiresDate = key.expires_at ? new Date(key.expires_at).toLocaleString() : 'Never';
        const lastUsed = key.last_used ? new Date(key.last_used).toLocaleString() : 'Never';
        const isExpired = key.expires_at && new Date(key.expires_at) < new Date();
        const status = isExpired ? 'Expired' : (key.is_active ? 'Active' : 'Inactive');
        const statusClass = isExpired ? 'status-expired' : 'status-active';
        const hwidDisplay = key.hwid || '<span class="status-unbound">Not Bound</span>';

        return `
            <tr>
                <td><code>${key.key}</code></td>
                <td>${hwidDisplay}</td>
                <td>${createdDate}</td>
                <td>${expiresDate}</td>
                <td>${lastUsed}</td>
                <td class="${statusClass}">${status}</td>
                <td>
                    <button class="btn btn-danger" onclick="deleteKey('${key.key}')">🗑️ Delete</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Generate new key
document.getElementById('generateBtn').addEventListener('click', async () => {
    const expiryDays = parseInt(document.getElementById('expiryDays').value);
    const btn = document.getElementById('generateBtn');

    btn.disabled = true;
    btn.textContent = '⏳ Generating...';

    try {
        const result = await apiCall('/api/admin/generate', {
            method: 'POST',
            body: JSON.stringify({ expiryDays })
        });

        // Display generated key
        document.getElementById('keyValue').value = result.key;
        document.getElementById('generatedKey').style.display = 'block';

        const expiryText = expiryDays > 0
            ? `Expires: ${new Date(result.expiresAt).toLocaleString()}`
            : 'Lifetime License (No Expiry)';
        document.getElementById('keyInfo').textContent = expiryText;

        // Reload data
        loadStats();
        loadKeys();

    } catch (error) {
        alert('Error generating key: ' + error.message);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔑 Generate Key';
    }
});

// Copy key to clipboard
document.getElementById('copyBtn').addEventListener('click', () => {
    const keyInput = document.getElementById('keyValue');
    keyInput.select();
    document.execCommand('copy');

    const btn = document.getElementById('copyBtn');
    const originalText = btn.textContent;
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
        btn.textContent = originalText;
    }, 2000);
});

// Delete key
async function deleteKey(key) {
    if (!confirm(`Are you sure you want to delete key: ${key}?`)) {
        return;
    }

    try {
        await apiCall(`/api/admin/keys/${key}`, {
            method: 'DELETE'
        });

        // Reload data
        loadStats();
        loadKeys();

    } catch (error) {
        alert('Error deleting key: ' + error.message);
    }
}

// Refresh button
document.getElementById('refreshBtn').addEventListener('click', () => {
    loadStats();
    loadKeys();
});

// Search functionality
document.getElementById('searchInput').addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();

    if (searchTerm === '') {
        renderKeys(allKeys);
    } else {
        const filtered = allKeys.filter(key =>
            key.key.toLowerCase().includes(searchTerm) ||
            (key.hwid && key.hwid.toLowerCase().includes(searchTerm))
        );
        renderKeys(filtered);
    }
});

// Check server status on load
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE}/api/health`);
        const data = await response.json();

        if (data.status === 'online') {
            document.getElementById('serverStatus').innerHTML = `
                <span class="status-dot"></span>
                Server Online
            `;
        }
    } catch (error) {
        document.getElementById('serverStatus').innerHTML = `
            <span class="status-dot" style="background: red;"></span>
            Server Offline
        `;
    }
}

// Initialize
checkServerStatus();
setInterval(checkServerStatus, 30000); // Check every 30 seconds
