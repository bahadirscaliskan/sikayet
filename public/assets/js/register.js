document.addEventListener('DOMContentLoaded', function () {
    const registerForm = document.getElementById('registerForm');
    const registerBtn = document.getElementById('registerBtn');

    checkAuth().then(user => {
        if (user) {
            window.location.href = 'dashboard.html';
        }
    });


    // Telefon numarası - sadece rakam girişine izin ver
    const phoneInput = document.getElementById('phone');

    phoneInput.addEventListener('input', function (e) {
        // Sadece rakamları tut
        const digits = e.target.value.replace(/\D/g, '');
        // Maksimum 10 rakam
        e.target.value = digits.substring(0, 10);
    });

    registerForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const fullName = document.getElementById('full_name').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const address = document.getElementById('address').value;
        const password = document.getElementById('password').value;
        const passwordConfirm = document.getElementById('password_confirm').value;

        if (!fullName || !email || !password || !phone || !address) {
            showMessage('message', 'Lütfen zorunlu alanları doldurun', 'error');
            return;
        }

        if (password.length < 6) {
            showMessage('message', 'Şifre en az 6 karakter olmalıdır', 'error');
            return;
        }

        if (password !== passwordConfirm) {
            showMessage('message', 'Şifreler eşleşmiyor', 'error');
            return;
        }

        // E-posta formatı kontrolü
        const emailPattern = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
        if (!emailPattern.test(email)) {
            showMessage('message', 'Geçerli bir e-posta adresi giriniz (örn: ornek@email.com)', 'error');
            return;
        }

        // Telefon formatı kontrolü (Türkiye cep telefonu)
        // Tam 10 rakam, 5 ile başlamalı
        if (phone.length !== 10 || phone[0] !== '5') {
            showMessage('message', 'Geçerli bir Türkiye cep telefonu numarası giriniz (5XX XXX XX XX)', 'error');
            return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = 'Kayıt yapılıyor...';

        try {
            const result = await register({
                full_name: fullName,
                email: email,
                phone: '0' + phone, // 0 ile başlayan format: 05331234567
                address: address,
                password: password
            });

            if (result.success) {
                showMessage('message', result.message || 'Kayıt başarılı! Giriş sayfasına yönlendiriliyorsunuz...', 'success');
                setTimeout(() => {
                    window.location.href = 'index.html';
                }, 2000);
            } else {
                showMessage('message', result.message || 'Kayıt başarısız', 'error');
                registerBtn.disabled = false;
                registerBtn.textContent = 'Kayıt Ol';
            }
        } catch (error) {
            console.error('Register error:', error);
            showMessage('message', 'Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
            registerBtn.disabled = false;
            registerBtn.textContent = 'Kayıt Ol';
        }
    });
});

