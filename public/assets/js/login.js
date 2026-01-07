document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');
    
    checkAuth().then(user => {
        if (user) {
            window.location.href = 'dashboard.html';
        }
    });
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        if (!email || !password) {
            showMessage('message', 'Lütfen tüm alanları doldurun', 'error');
            return;
        }
        
        loginBtn.disabled = true;
        loginBtn.textContent = 'Giriş yapılıyor...';
        
        try {
            const result = await login(email, password);
            
            if (result.success) {
                showMessage('message', 'Giriş başarılı! Yönlendiriliyorsunuz...', 'success');
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                showMessage('message', result.message || 'Giriş başarısız', 'error');
                loginBtn.disabled = false;
                loginBtn.textContent = 'Giriş Yap';
            }
        } catch (error) {
            console.error('Login error:', error);
            showMessage('message', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
            loginBtn.disabled = false;
            loginBtn.textContent = 'Giriş Yap';
        }
    });
});

