let currentUser = null;
let currentView = 'dashboard';

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard loading...');
    
    currentUser = await checkAuth();
    console.log('Current user:', currentUser);
    
    if (!currentUser) {
        console.log('No user, redirecting to login');
        window.location.href = 'index.html';
        return;
    }
    
    document.getElementById('userName').textContent = currentUser.name || currentUser.full_name || 'Kullanıcı';
    
    document.getElementById('logoutBtn').addEventListener('click', function() {
        if (confirm('Çıkış yapmak istediğinize emin misiniz?')) {
            logout();
        }
    });
    
    buildSidebar();
    loadView('dashboard');
    setupModals();
});

function buildSidebar() {
    const sidebar = document.getElementById('sidebar');
    let menuItems = [];
    
    if (currentUser.role === 'citizen') {
        menuItems = [
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'my_complaints', label: 'Şikayetlerim', icon: '📝' },
            { id: 'new_complaint', label: 'Yeni Şikayet', icon: '➕' },
            { id: 'profile', label: 'Profilim', icon: '👤' }
        ];
    } else if (currentUser.role === 'admin') {
        menuItems = [
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'all_complaints', label: 'Tüm Şikayetler', icon: '📋' },
            { id: 'assign_tasks', label: 'Görev Atama', icon: '👥' },
            { id: 'staff_performance', label: 'Personel Performansı', icon: '📈' },
            { id: 'users', label: 'Kullanıcı Yönetimi', icon: '👥' },
            { id: 'profile', label: 'Profilim', icon: '👤' }
        ];
    } else if (currentUser.role === 'staff') {
        menuItems = [
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'my_tasks', label: 'Görevlerim', icon: '✅' },
            { id: 'completed_tasks', label: 'Tamamlananlar', icon: '✔️' },
            { id: 'profile', label: 'Profilim', icon: '👤' }
        ];
    }
    
    const menuHTML = `
        <ul class="sidebar-menu">
            ${menuItems.map(item => `
                <li><a href="#" data-view="${item.id}" class="${item.id === currentView ? 'active' : ''}">
                    ${item.icon} ${item.label}
                </a></li>
            `).join('')}
        </ul>
    `;
    
    sidebar.innerHTML = menuHTML;
    
    sidebar.querySelectorAll('a[data-view]').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const view = this.getAttribute('data-view');
            loadView(view);
            sidebar.querySelectorAll('a').forEach(a => a.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function loadView(view) {
    currentView = view;
    const content = document.getElementById('dashboardContent');
    
    switch(view) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'my_complaints':
        case 'all_complaints':
        case 'my_tasks':
            loadComplaintsList(view);
            break;
        case 'new_complaint':
            showNewComplaintModal();
            break;
        case 'assign_tasks':
            loadAssignTasks();
            break;
        case 'staff_performance':
            loadStaffPerformance();
            break;
        case 'completed_tasks':
            loadComplaintsList(view, { status: 'completed' });
            break;
        case 'profile':
            loadProfile();
            break;
        case 'users':
            loadUsers();
            break;
    }
}

async function loadDashboard() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="card"><p>Yükleniyor...</p></div>';
    
    try {
        const result = await listComplaints();
        
        console.log('Dashboard loadDashboard result:', result);
        
        if (!result || !result.success) {
            const errorMsg = result && result.message ? result.message : 'Bilinmeyen hata';
            content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${errorMsg}</p><p>Lütfen sayfayı yenileyin (F5) veya tekrar giriş yapın.</p></div>`;
            return;
        }
        
        if (!result.data) {
            content.innerHTML = '<div class="card"><p class="message error">Veri formatı hatalı. Lütfen sayfayı yenileyin.</p></div>';
            return;
        }
        
        const complaints = (result.data.complaints && Array.isArray(result.data.complaints)) ? result.data.complaints : [];
        
        let stats = {};
        if (currentUser.role === 'citizen') {
            stats = {
                total: complaints.length,
                pending: complaints.filter(c => c.status === 'pending').length,
                in_progress: complaints.filter(c => c.status === 'in_progress').length,
                completed: complaints.filter(c => c.status === 'completed').length
            };
        } else if (currentUser.role === 'admin') {
            stats = {
                total: complaints.length,
                pending: complaints.filter(c => c.status === 'pending').length,
                assigned: complaints.filter(c => c.status === 'assigned').length,
                completed: complaints.filter(c => c.status === 'completed').length
            };
        } else if (currentUser.role === 'staff') {
            stats = {
                total: complaints.length,
                assigned: complaints.filter(c => c.status === 'assigned').length,
                in_progress: complaints.filter(c => c.status === 'in_progress').length,
                completed: complaints.filter(c => c.status === 'completed').length
            };
        }
        
        const statsHTML = Object.keys(stats).map(key => `
            <div class="stat-card ${key === 'total' ? 'primary' : key === 'completed' ? 'success' : 'warning'}">
                <h3>${getStatusLabel(key)}</h3>
                <div class="stat-value">${stats[key]}</div>
            </div>
        `).join('');
        
        const recentComplaints = complaints.slice(0, 5);
        const complaintsHTML = recentComplaints.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Başlık</th>
                        <th>Durum</th>
                        <th>Tarih</th>
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentComplaints.map(complaint => `
                        <tr>
                            <td>${complaint.title}</td>
                            <td><span class="status-badge ${complaint.status}">${getStatusLabel(complaint.status)}</span></td>
                            <td>${formatDate(complaint.created_at)}</td>
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="showComplaintDetail(${complaint.id})">Detay</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Henüz şikayet bulunmamaktadır.</p>';
        
        content.innerHTML = `
            <div class="page-header">
                <h1>Dashboard</h1>
            </div>
            
            <div class="stats-grid">
                ${statsHTML}
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Son Şikayetler</h2>
                </div>
                <div class="table-container">
                    ${complaintsHTML}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Dashboard load error:', error);
        content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${error.message}</p><p>Lütfen tarayıcı konsolunu (F12) kontrol edin.</p></div>`;
    }
}

async function loadComplaintsList(view, filters = {}) {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="card"><p>Yükleniyor...</p></div>';
    
    try {
        const result = await listComplaints(filters);
        
        console.log('Complaints list result:', result);
        
        if (!result || !result.success) {
            const errorMsg = result && result.message ? result.message : 'Bilinmeyen hata';
            content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${errorMsg}</p><p>Lütfen sayfayı yenileyin (F5) veya tekrar giriş yapın.</p></div>`;
            return;
        }
        
        const complaints = (result.data && result.data.complaints) ? result.data.complaints : [];
        
        const title = view === 'my_complaints' ? 'Şikayetlerim' : 
                     view === 'all_complaints' ? 'Tüm Şikayetler' :
                     view === 'my_tasks' ? 'Görevlerim' : 'Tamamlanan Görevler';
        
        const complaintsHTML = complaints.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Başlık</th>
                        <th>Durum</th>
                        <th>Öncelik</th>
                        <th>Oluşturulma</th>
                        ${currentUser.role === 'admin' ? '<th>Kullanıcı</th><th>Atanan</th>' : ''}
                        <th>İşlemler</th>
                    </tr>
                </thead>
                <tbody>
                    ${complaints.map(complaint => `
                        <tr>
                            <td>${complaint.title}</td>
                            <td><span class="status-badge ${complaint.status}">${getStatusLabel(complaint.status)}</span></td>
                            <td><span class="priority-badge ${complaint.priority}">${getPriorityLabel(complaint.priority)}</span></td>
                            <td>${formatDate(complaint.created_at)}</td>
                            ${currentUser.role === 'admin' ? `
                                <td>${complaint.user_name || '-'}</td>
                                <td>${complaint.assigned_to_name || '-'}</td>
                            ` : ''}
                            <td>
                                <button class="btn btn-sm btn-secondary" onclick="showComplaintDetail(${complaint.id})">Detay</button>
                                ${canUpdateStatus(complaint) ? `
                                    <button class="btn btn-sm btn-success" onclick="updateStatus(${complaint.id}, 'in_progress')">İşleme Al</button>
                                    <button class="btn btn-sm btn-primary" onclick="updateStatus(${complaint.id}, 'completed')">Tamamla</button>
                                ` : ''}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Henüz şikayet bulunmamaktadır.</p>';
        
        content.innerHTML = `
            <div class="page-header">
                <h1>${title}</h1>
            </div>
            
            <div class="card">
                <div class="table-container">
                    ${complaintsHTML}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Complaints list load error:', error);
        content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${error.message}</p><p>Lütfen tarayıcı konsolunu (F12) kontrol edin.</p></div>`;
    }
}

async function showComplaintDetail(id) {
    const modal = document.getElementById('complaintModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = '<p>Yükleniyor...</p>';
    modal.classList.add('show');
    
    try {
        const result = await getComplaint(id);
        
        if (!result.success) {
            modalBody.innerHTML = '<p>Şikayet yüklenirken bir hata oluştu.</p>';
            return;
        }
        
        const complaint = result.data;
        
        const photosHTML = complaint.photos && complaint.photos.length > 0 ? `
            <div class="complaint-photos">
                ${complaint.photos.map(photo => `
                    <img src="/uploads/${photo.photo_path}" alt="Fotoğraf" onclick="window.open('/uploads/${photo.photo_path}', '_blank')">
                `).join('')}
            </div>
        ` : '<p>Fotoğraf bulunmamaktadır.</p>';
        
        const commentsHTML = complaint.comments && complaint.comments.length > 0 ? `
            <div class="comments-section">
                <h3>Yorumlar</h3>
                ${complaint.comments.map(comment => `
                    <div class="comment-item ${comment.is_internal ? 'comment-internal' : ''}">
                        <div class="comment-header">
                            <span class="comment-author">${comment.user_name} ${comment.is_internal ? '(Internal)' : ''}</span>
                            <span class="comment-date">${formatDate(comment.created_at)}</span>
                        </div>
                        <div class="comment-text">${comment.comment_text}</div>
                    </div>
                `).join('')}
            </div>
        ` : '<p>Henüz yorum yok.</p>';
        
        modalBody.innerHTML = `
            <div class="complaint-detail">
                <h2>${complaint.title}</h2>
                
                <div class="detail-row">
                    <div class="detail-label">Durum:</div>
                    <div class="detail-value"><span class="status-badge ${complaint.status}">${getStatusLabel(complaint.status)}</span></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Açıklama:</div>
                    <div class="detail-value">${complaint.description}</div>
                </div>
                
                ${complaint.address ? `
                    <div class="detail-row">
                        <div class="detail-label">Adres:</div>
                        <div class="detail-value">${complaint.address}</div>
                    </div>
                ` : ''}
                
                ${complaint.latitude && complaint.longitude ? `
                    <div class="detail-row">
                        <div class="detail-label">Konum:</div>
                        <div class="detail-value">
                            ${complaint.latitude}, ${complaint.longitude}
                            <a href="https://www.google.com/maps?q=${complaint.latitude},${complaint.longitude}" target="_blank" style="margin-left: 10px;">Haritada Göster</a>
                        </div>
                    </div>
                ` : ''}
                
                <div class="detail-row">
                    <div class="detail-label">Oluşturulma:</div>
                    <div class="detail-value">${formatDate(complaint.created_at)}</div>
                </div>
                
                ${complaint.assigned_to_name ? `
                    <div class="detail-row">
                        <div class="detail-label">Atanan:</div>
                        <div class="detail-value">${complaint.assigned_to_name}</div>
                    </div>
                ` : ''}
                
                <h3>Fotoğraflar</h3>
                ${photosHTML}
                
                ${commentsHTML}
                
                ${canAddComment(complaint) ? `
                    <div class="form-group" style="margin-top: 20px;">
                        <label>Yorum Ekle</label>
                        <textarea id="newCommentText" rows="3" style="width: 100%;"></textarea>
                        ${currentUser.role !== 'citizen' ? `
                            <label style="margin-top: 10px;">
                                <input type="checkbox" id="isInternalComment"> Internal Yorum
                            </label>
                        ` : ''}
                        <button class="btn btn-primary" style="margin-top: 10px;" onclick="addCommentToComplaint(${complaint.id})">Yorum Ekle</button>
                    </div>
                ` : ''}
                
                ${canUpdateStatus(complaint) ? `
                    <div class="action-buttons">
                        <button class="btn btn-success" onclick="updateStatus(${complaint.id}, 'in_progress')">İşleme Al</button>
                        <button class="btn btn-primary" onclick="updateStatus(${complaint.id}, 'completed')">Tamamla</button>
                    </div>
                ` : ''}
            </div>
        `;
    } catch (error) {
        console.error('Complaint detail error:', error);
        modalBody.innerHTML = '<p>Şikayet yüklenirken bir hata oluştu.</p>';
    }
}

function showNewComplaintModal() {
    const modal = document.getElementById('newComplaintModal');
    document.getElementById('newComplaintForm').reset();
    document.getElementById('locationStatus').textContent = '';
    modal.classList.add('show');
}

function setupModals() {
    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('show');
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });
    
    document.getElementById('newComplaintForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = {
            title: document.getElementById('complaint_title').value,
            description: document.getElementById('complaint_description').value,
            address: document.getElementById('complaint_address').value,
            latitude: document.getElementById('complaint_latitude').value,
            longitude: document.getElementById('complaint_longitude').value
        };
        
        const photos = document.getElementById('complaint_photos').files;
        
        try {
            const result = await createComplaint(formData, photos);
            
            if (result.success) {
                alert('Şikayet başarıyla oluşturuldu!');
                document.getElementById('newComplaintModal').classList.remove('show');
                loadView(currentView);
            } else {
                alert(result.message || 'Şikayet oluşturulurken bir hata oluştu');
            }
        } catch (error) {
            console.error('Create complaint error:', error);
            alert('Bir hata oluştu');
        }
    });
    
    document.getElementById('getLocationBtn').addEventListener('click', function() {
        const statusEl = document.getElementById('locationStatus');
        statusEl.textContent = 'Konum alınıyor...';
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function(position) {
                    document.getElementById('complaint_latitude').value = position.coords.latitude;
                    document.getElementById('complaint_longitude').value = position.coords.longitude;
                    statusEl.textContent = 'Konum alındı ✓';
                    statusEl.style.color = 'green';
                },
                function(error) {
                    statusEl.textContent = 'Konum alınamadı';
                    statusEl.style.color = 'red';
                }
            );
        } else {
            statusEl.textContent = 'Tarayıcınız konum desteği sağlamıyor';
            statusEl.style.color = 'red';
        }
    });
    
    // Yeni kullanıcı formu için handler
    const newUserForm = document.getElementById('newUserForm');
    if (newUserForm) {
        newUserForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const userData = {
                email: document.getElementById('user_email').value,
                full_name: document.getElementById('user_full_name').value,
                phone: document.getElementById('user_phone').value || null,
                role: document.getElementById('user_role').value,
                password: document.getElementById('user_password').value
            };
            
            try {
                const result = await createUser(userData);
                
                if (result.success) {
                    alert('Kullanıcı başarıyla oluşturuldu!');
                    document.getElementById('newUserModal').classList.remove('show');
                    if (currentView === 'users') {
                        loadUsers();
                    }
                } else {
                    alert(result.message || 'Kullanıcı oluşturulurken bir hata oluştu');
                }
            } catch (error) {
                console.error('Create user error:', error);
                alert('Bir hata oluştu');
            }
        });
    }
}

async function updateStatus(complaintId, status) {
    if (!confirm('Durumu güncellemek istediğinize emin misiniz?')) {
        return;
    }
    
    try {
        const result = await updateComplaintStatus(complaintId, status);
        
        if (result.success) {
            alert('Durum başarıyla güncellendi!');
            loadView(currentView);
            document.getElementById('complaintModal').classList.remove('show');
        } else {
            alert(result.message || 'Durum güncellenirken bir hata oluştu');
        }
    } catch (error) {
        console.error('Update status error:', error);
        alert('Bir hata oluştu');
    }
}

async function addCommentToComplaint(complaintId) {
    const commentText = document.getElementById('newCommentText').value;
    const isInternal = document.getElementById('isInternalComment') ? document.getElementById('isInternalComment').checked : false;
    
    if (!commentText.trim()) {
        alert('Lütfen yorum metni girin');
        return;
    }
    
    try {
        const result = await addComment(complaintId, commentText, isInternal);
        
        if (result.success) {
            alert('Yorum başarıyla eklendi!');
            showComplaintDetail(complaintId);
        } else {
            alert(result.message || 'Yorum eklenirken bir hata oluştu');
        }
    } catch (error) {
        console.error('Add comment error:', error);
        alert('Bir hata oluştu');
    }
}

async function loadAssignTasks() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="card"><p>Yükleniyor...</p></div>';
    
    try {
        const [complaintsResult, staffResult] = await Promise.all([
            listComplaints({ status: 'pending' }),
            listStaff()
        ]);
        
        console.log('Assign tasks results:', { complaintsResult, staffResult });
        
        if (!complaintsResult || !complaintsResult.success || !staffResult || !staffResult.success) {
            const errorMsg = (complaintsResult && complaintsResult.message) || (staffResult && staffResult.message) || 'Bilinmeyen hata';
            content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${errorMsg}</p><p>Lütfen sayfayı yenileyin (F5) veya tekrar giriş yapın.</p></div>`;
            return;
        }
        
        const complaints = complaintsResult.data.complaints || [];
        const staff = staffResult.data || [];
        
        const complaintsHTML = complaints.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Başlık</th>
                        <th>Kullanıcı</th>
                        <th>Oluşturulma</th>
                        <th>Atama</th>
                    </tr>
                </thead>
                <tbody>
                    ${complaints.map(complaint => `
                        <tr>
                            <td>${complaint.title}</td>
                            <td>${complaint.user_name || '-'}</td>
                            <td>${formatDate(complaint.created_at)}</td>
                            <td>
                                <select id="assign_${complaint.id}" class="form-control" style="display: inline-block; width: auto;">
                                    <option value="">Personel Seçin</option>
                                    ${staff.map(s => `<option value="${s.id}">${s.full_name}</option>`).join('')}
                                </select>
                                <button class="btn btn-sm btn-primary" onclick="assignComplaint(${complaint.id})">Ata</button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Atanacak bekleyen şikayet bulunmamaktadır.</p>';
        
        content.innerHTML = `
            <div class="page-header">
                <h1>Görev Atama</h1>
            </div>
            
            <div class="card">
                <div class="table-container">
                    ${complaintsHTML}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Assign tasks load error:', error);
        content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${error.message}</p><p>Lütfen tarayıcı konsolunu (F12) kontrol edin.</p></div>`;
    }
}

async function assignComplaint(complaintId) {
    const selectEl = document.getElementById(`assign_${complaintId}`);
    const assignedTo = selectEl.value;
    
    if (!assignedTo) {
        alert('Lütfen bir personel seçin');
        return;
    }
    
    try {
        const result = await assignTask(complaintId, parseInt(assignedTo));
        
        if (result.success) {
            alert('Şikayet başarıyla atandı!');
            loadAssignTasks();
        } else {
            alert(result.message || 'Atama sırasında bir hata oluştu');
        }
    } catch (error) {
        console.error('Assign complaint error:', error);
        alert('Bir hata oluştu');
    }
}

async function loadStaffPerformance() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="card"><p>Yükleniyor...</p></div>';
    
    try {
        const result = await listStaff();
        
        console.log('Staff performance result:', result);
        
        if (!result || !result.success) {
            const errorMsg = result && result.message ? result.message : 'Bilinmeyen hata';
            content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${errorMsg}</p><p>Lütfen sayfayı yenileyin (F5) veya tekrar giriş yapın.</p></div>`;
            return;
        }
        
        const staff = (result.data && Array.isArray(result.data)) ? result.data : [];
        
        const staffHTML = staff.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>Personel</th>
                        <th>Toplam Şikayet</th>
                        <th>Tamamlanan</th>
                        <th>Devam Eden</th>
                        <th>Başarı Oranı</th>
                    </tr>
                </thead>
                <tbody>
                    ${staff.map(s => {
                        const successRate = s.total_complaints > 0 
                            ? ((s.completed_complaints / s.total_complaints) * 100).toFixed(1) 
                            : 0;
                        return `
                            <tr>
                                <td>${s.full_name}</td>
                                <td>${s.total_complaints}</td>
                                <td>${s.completed_complaints}</td>
                                <td>${s.active_complaints}</td>
                                <td>${successRate}%</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        ` : '<p>Personel bulunmamaktadır.</p>';
        
        content.innerHTML = `
            <div class="page-header">
                <h1>Personel Performansı</h1>
            </div>
            
            <div class="card">
                <div class="table-container">
                    ${staffHTML}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Staff performance load error:', error);
        content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${error.message}</p><p>Lütfen tarayıcı konsolunu (F12) kontrol edin.</p></div>`;
    }
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'Bekliyor',
        'assigned': 'Atandı',
        'in_progress': 'İşlemde',
        'completed': 'Tamamlandı',
        'rejected': 'Reddedildi',
        'closed': 'Kapatıldı'
    };
    return labels[status] || status;
}

function getPriorityLabel(priority) {
    const labels = {
        'low': 'Düşük',
        'medium': 'Orta',
        'high': 'Yüksek',
        'urgent': 'Acil'
    };
    return labels[priority] || priority;
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function canUpdateStatus(complaint) {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'staff' && complaint.assigned_to === currentUser.id) {
        return ['assigned', 'in_progress'].includes(complaint.status);
    }
    return false;
}

function canAddComment(complaint) {
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'staff' && complaint.assigned_to === currentUser.id) return true;
    if (currentUser.role === 'citizen' && complaint.user_id === currentUser.id) return true;
    return false;
}

async function loadProfile() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="card"><p>Yükleniyor...</p></div>';
    
    try {
        const result = await getProfile();
        
        console.log('Profile result:', result);
        
        if (!result || !result.success) {
            const errorMsg = result && result.message ? result.message : 'Bilinmeyen hata';
            content.innerHTML = `<div class="card"><p class="message error">Profil yüklenirken bir hata oluştu: ${errorMsg}</p><p>Lütfen sayfayı yenileyin veya tekrar giriş yapın.</p></div>`;
            return;
        }
        
        const profile = result.data;
        
        if (!profile) {
            content.innerHTML = '<div class="card"><p class="message error">Profil verisi bulunamadı.</p></div>';
            return;
        }
        
        content.innerHTML = `
            <div class="page-header">
                <h1>Profilim</h1>
            </div>
            
            <div class="card">
                <form id="profileForm">
                    <div class="form-group">
                        <label for="profile_email">E-posta</label>
                        <input type="email" id="profile_email" value="${profile.email}" disabled>
                        <small>E-posta adresi değiştirilemez</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="profile_full_name">Ad Soyad *</label>
                        <input type="text" id="profile_full_name" value="${profile.full_name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="profile_phone">Telefon</label>
                        <input type="tel" id="profile_phone" value="${profile.phone || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label for="profile_role">Rol</label>
                        <input type="text" id="profile_role" value="${getRoleLabel(profile.role)}" disabled>
                    </div>
                    
                    <div class="form-group">
                        <label for="profile_password">Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
                        <input type="password" id="profile_password" minlength="6">
                        <small>En az 6 karakter</small>
                    </div>
                    
                    <div class="form-group">
                        <label for="profile_password_confirm">Yeni Şifre Tekrar</label>
                        <input type="password" id="profile_password_confirm" minlength="6">
                    </div>
                    
                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Güncelle</button>
                    </div>
                </form>
            </div>
        `;
        
        document.getElementById('profileForm').addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const fullName = document.getElementById('profile_full_name').value;
            const phone = document.getElementById('profile_phone').value;
            const password = document.getElementById('profile_password').value;
            const passwordConfirm = document.getElementById('profile_password_confirm').value;
            
            if (password && password !== passwordConfirm) {
                alert('Şifreler eşleşmiyor');
                return;
            }
            
            const updateData = {
                full_name: fullName,
                phone: phone || null
            };
            
            if (password) {
                updateData.password = password;
            }
            
            try {
                const result = await updateProfile(updateData);
                
                if (result.success) {
                    alert('Profil başarıyla güncellendi!');
                    currentUser.name = result.data.full_name;
                    document.getElementById('userName').textContent = result.data.full_name;
                    loadProfile();
                } else {
                    alert(result.message || 'Profil güncellenirken bir hata oluştu');
                }
            } catch (error) {
                console.error('Update profile error:', error);
                alert('Bir hata oluştu');
            }
        });
    } catch (error) {
        console.error('Load profile error:', error);
        content.innerHTML = `<div class="card"><p class="message error">Profil yüklenirken bir hata oluştu: ${error.message}</p><p>Lütfen tarayıcı konsolunu (F12) kontrol edin.</p></div>`;
    }
}

async function loadUsers() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="card"><p>Yükleniyor...</p></div>';
    
    try {
        const result = await listAllUsers();
        
        console.log('Users list result:', result);
        
        if (!result || !result.success) {
            const errorMsg = result && result.message ? result.message : 'Bilinmeyen hata';
            content.innerHTML = `<div class="card"><p class="message error">Kullanıcılar yüklenirken bir hata oluştu: ${errorMsg}</p><p>Lütfen sayfayı yenileyin (F5) veya tekrar giriş yapın.</p></div>`;
            return;
        }
        
        const users = (result.data && Array.isArray(result.data)) ? result.data : [];
        
        const usersHTML = users.length > 0 ? `
            <table>
                <thead>
                    <tr>
                        <th>E-posta</th>
                        <th>Ad Soyad</th>
                        <th>Telefon</th>
                        <th>Rol</th>
                        <th>Durum</th>
                        <th>Kayıt Tarihi</th>
                    </tr>
                </thead>
                <tbody>
                    ${users.map(user => `
                        <tr>
                            <td>${user.email}</td>
                            <td>${user.full_name}</td>
                            <td>${user.phone || '-'}</td>
                            <td><span class="status-badge ${user.role}">${getRoleLabel(user.role)}</span></td>
                            <td>${user.is_active ? '<span style="color: green;">Aktif</span>' : '<span style="color: red;">Pasif</span>'}</td>
                            <td>${formatDate(user.created_at)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '<p>Henüz kullanıcı bulunmamaktadır.</p>';
        
        content.innerHTML = `
            <div class="page-header">
                <h1>Kullanıcı Yönetimi</h1>
                <button class="btn btn-primary" onclick="showNewUserModal()">Yeni Kullanıcı Ekle</button>
            </div>
            
            <div class="card">
                <div class="table-container">
                    ${usersHTML}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Load users error:', error);
        content.innerHTML = `<div class="card"><p class="message error">Kullanıcılar yüklenirken bir hata oluştu: ${error.message}</p><p>Lütfen tarayıcı konsolunu (F12) kontrol edin.</p></div>`;
    }
}

function showNewUserModal() {
    const modal = document.getElementById('newUserModal');
    if (modal) {
        document.getElementById('newUserForm').reset();
        modal.classList.add('show');
    }
}

function getRoleLabel(role) {
    const labels = {
        'citizen': 'Vatandaş',
        'staff': 'Personel',
        'admin': 'Yönetici'
    };
    return labels[role] || role;
}

