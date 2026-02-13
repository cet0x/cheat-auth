const API_URL = '';
let allKeys = [];

// Auth Logic
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;

    // Store credentials in memory for session
    const credentials = btoa(`${user}:${pass}`);
    sessionStorage.setItem('auth', credentials);

    try {
        const res = await fetch(`${API_URL}/api/admin/keys`, {
            headers: { 'Authorization': `Basic ${credentials}` }
        });

        if (res.ok) {
            document.getElementById('loginOverlay').style.display = 'none';
            document.getElementById('dashboard').style.display = 'block';
            loadKeys();
        } else {
            alert('Invalid credentials!');
        }
    } catch (err) {
        alert('Server validation failed');
    }
});

// Load Keys
async function loadKeys() {
    const auth = sessionStorage.getItem('auth');
    try {
        const res = await fetch(`${API_URL}/api/admin/keys`, {
            headers: { 'Authorization': `Basic ${auth}` }
        });
        const data = await res.json();
        allKeys = data.keys || [];
        updateStats();
        renderKeys(allKeys);
    } catch (err) {
        console.error('Error loading keys:', err);
    }
}

function updateStats() {
    document.getElementById('totalKeys').textContent = allKeys.length;
    const used = allKeys.filter(k => k.is_used).length;
    document.getElementById('activeKeys').textContent = used;

    // Only check expiry if date exists
    const expired = allKeys.filter(k => k.expiry_date && new Date(k.expiry_date) < new Date()).length;
    document.getElementById('expiredKeys').textContent = expired;
}

function renderKeys(keys) {
    const tbody = document.getElementById('keysTableBody');
    tbody.innerHTML = '';

    keys.forEach(key => {
        const tr = document.createElement('tr');

        // Status determination
        let statusClass = 'status-unused';
        let statusText = 'UNUSED';

        if (key.is_used) {
            statusClass = 'status-active';
            statusText = 'ACTIVE';
        }

        if (key.expiry_date && new Date(key.expiry_date) < new Date()) {
            statusClass = 'status-expired';
            statusText = 'EXPIRED';
        }

        tr.innerHTML = `
            <td>
                <code>${key.code}</code>
                <button class="copy-btn" onclick="navigator.clipboard.writeText('${key.code}')">📋</button>
            </td>
            <td><span class="status-indicator ${statusClass}">${statusText}</span></td>
            <td>${key.hwid ? key.hwid.substring(0, 15) + '...' : '-'}</td>
            <td>${key.expiry_date ? new Date(key.expiry_date).toLocaleDateString() : 'Lifetime'}</td>
            <td>${new Date(key.created_at).toLocaleDateString()}</td>
            <td>
                <button class="copy-btn" style="color: #ef4444;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Generate Key
document.getElementById('generateBtn').addEventListener('click', async () => {
    const auth = sessionStorage.getItem('auth');
    const days = prompt("Enter duration in days (default 30):", "30");
    if (days === null) return;

    try {
        const res = await fetch(`${API_URL}/api/admin/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${auth}`
            },
            body: JSON.stringify({ durationDays: parseInt(days) })
        });

        const data = await res.json();
        if (data.key) {
            alert(`Key Generated:\n${data.key}`);
            loadKeys();
        }
    } catch (err) {
        alert('Failed to generate key');
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    sessionStorage.removeItem('auth');
    location.reload();
});

// Search
document.getElementById('searchInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const filtered = allKeys.filter(k => k.code.toLowerCase().includes(term));
    renderKeys(filtered);
});
