// API_BASE_URL HTML'de global olarak tanımlanıyor
// API_URL'yi sadece bu dosyada kullan, const yerine direkt kullan

function checkAuth() {
    const API = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.location.origin + '/api'));
    return fetch(API + '/check_auth.php', {
        method: 'GET',
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                return data.data;
            }
            return null;
        })
        .catch(error => {
            console.error('Auth check error:', error);
            return null;
        });
}

function login(email, password) {
    const API = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.location.origin + '/api'));
    return fetch(API + '/login.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ email, password })
    })
        .then(response => response.json());
}

function register(userData) {
    const API = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.location.origin + '/api'));
    return fetch(API + '/register.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(userData)
    })
        .then(response => response.json());
}

function logout() {
    const API = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.location.origin + '/api'));
    return fetch(API + '/logout.php', {
        method: 'POST',
        credentials: 'same-origin'
    })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.location.href = 'index.html';
            }
        });
}

function showMessage(elementId, message, type = 'info') {
    const messageEl = document.getElementById(elementId);
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = `message ${type} show`;

        setTimeout(() => {
            messageEl.classList.remove('show');
        }, 5000);
    }
}

function requireAuth(redirectTo = 'index.html') {
    checkAuth().then(user => {
        if (!user) {
            window.location.href = redirectTo;
        }
        return user;
    });
}

// Google Auth Callback
function handleCredentialResponse(response) {
    const API = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.location.origin + '/api'));

    fetch(API + '/auth_google.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ credential: response.credential })
    })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                window.location.href = 'dashboard.html';
            } else {
                alert('Google ile giriş başarısız: ' + (data.message || 'Bilinmeyen hata'));
            }
        })
        .catch(err => {
            console.error('Google Auth Error:', err);
            alert('Google ile giriş sırasında bir hata oluştu');
        });
}

