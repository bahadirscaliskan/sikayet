let currentUser = null;
let currentView = 'dashboard';

// Bootstrap modal instances - REMOVED (Not using Bootstrap)
let complaintModal = null;
let newComplaintModal = null;
let newUserModal = null;

document.addEventListener('DOMContentLoaded', async function () {
    console.log('Dashboard loading...');
    // Modals are handled by vanilla JS below


    currentUser = await checkAuth();
    console.log('Current user:', currentUser);

    if (!currentUser) {
        console.log('No user, redirecting to login');
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('userName').textContent = currentUser.name || currentUser.full_name || 'Kullanıcı';

    document.getElementById('logoutBtn').addEventListener('click', function () {
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
            { id: 'dashboard', label: 'Ana sayfa', icon: '📊' },
            { id: 'my_complaints', label: 'Şikayet ve İsteklerim', icon: '📝' },
            { id: 'profile', label: 'Profilim', icon: '👤' }
        ];
    } else if (currentUser.role === 'admin') {
        menuItems = [
            { id: 'dashboard', label: 'Ana sayfa', icon: '📊' },
            { id: 'all_complaints', label: 'Tüm Şikayet ve İstekler', icon: '📋' },
            { id: 'assign_tasks', label: 'Görev Atama', icon: '👥' },
            { id: 'staff_performance', label: 'Personel Performansı', icon: '📈' },
            { id: 'users', label: 'Kullanıcı Yönetimi', icon: '👥' },
            { id: 'profile', label: 'Profilim', icon: '👤' }
        ];
    } else if (currentUser.role === 'staff') {
        menuItems = [
            { id: 'dashboard', label: 'Ana sayfa', icon: '📊' },
            { id: 'my_tasks', label: 'Görevlerim', icon: '✅' },
            { id: 'completed_tasks', label: 'Tamamlananlar', icon: '✔️' },
            { id: 'profile', label: 'Profilim', icon: '👤' }
        ];
    }

    const menuHTML = `
        <ul class="sidebar-menu">
            ${menuItems.map(item => `
                <li><a href="#" data-view="${item.id}" class="${item.id === currentView ? 'active' : ''}">
                    <span class="menu-icon">${item.icon}</span> ${item.label}
                </a></li>
            `).join('')}
        </ul>
    `;

    sidebar.innerHTML = menuHTML;

    sidebar.querySelectorAll('a[data-view]').forEach(link => {
        link.addEventListener('click', function (e) {
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

    switch (view) {
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

        const statsHTML = Object.keys(stats).map(key => {
            let cardClass = 'primary';
            if (key === 'completed') cardClass = 'success';
            else if (key === 'pending' || key === 'assigned' || key === 'in_progress') cardClass = 'warning';

            return `
            <div class="stat-card ${cardClass}">
                <h3>${getStatusLabel(key)}</h3>
                <div class="stat-value">${stats[key]}</div>
            </div>
        `;
        }).join('');

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
        ` : '<p>Henüz şikayet ve istek bulunmamaktadır.</p>';

        content.innerHTML = `
            <div class="page-header">
                <h1>Ana sayfa</h1>
            </div>
            
            <div class="stats-grid">
                ${statsHTML}
            </div>
            
            <div class="card">
                <div class="card-header">
                    <h2>Son Şikayet ve İstekler</h2>
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
        const [result, staffResult] = await Promise.all([
            listComplaints(filters),
            currentUser.role === 'admin' ? listStaff() : Promise.resolve({ success: true, data: [] })
        ]);

        console.log('Complaints list result:', result);

        if (!result || !result.success) {
            const errorMsg = result && result.message ? result.message : 'Bilinmeyen hata';
            content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${errorMsg}</p><p>Lütfen sayfayı yenileyin (F5) veya tekrar giriş yapın.</p></div>`;
            return;
        }

        const complaints = (result.data && result.data.complaints) ? result.data.complaints : [];
        const staffList = staffResult.success ? (staffResult.data || []) : [];

        console.log('Staff list for complaints:', staffList);
        console.log('Sample complaint assigned_to:', complaints.length > 0 ? complaints[0].assigned_to : 'no complaints');

        const title = view === 'my_complaints' ? 'Şikayet ve İsteklerim' :
            view === 'all_complaints' ? 'Tüm Şikayet ve İstekler' :
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
                    ${complaints.map(complaint => {
            const isAssigned = !!complaint.assigned_to;
            // Removed row coloring for this view as requested
            const rowClass = '';

            // Find staff name if admin
            let assignedStaffName = '-';
            if (currentUser.role === 'admin' && complaint.assigned_to) {
                assignedStaffName = complaint.assigned_to_name ||
                    (staffList.find(s => s.id == complaint.assigned_to)?.full_name) ||
                    'Personel';
            }

            return `
                        <tr class="${rowClass}">
                            <td>${complaint.title}</td>
                            <td><span class="status-badge ${complaint.status}">${getStatusLabel(complaint.status)}</span></td>
                            <td><span class="priority-badge ${complaint.priority}">${getPriorityLabel(complaint.priority)}</span></td>
                            <td>${formatDate(complaint.created_at)}</td>
                            ${currentUser.role === 'admin' ? `
                                <td>${complaint.user_name || '-'}</td>
                                <td>${assignedStaffName}</td>
                            ` : ''}
                            <td>
                                <div style="display: flex; gap: 4px; flex-wrap: nowrap; align-items: center; width: 100%;">
                                    <button class="btn btn-sm btn-secondary" onclick="showComplaintDetail(${complaint.id})" style="display: inline-flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; padding: 4px 8px; font-size: 12px; flex: 1;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M15 12C15 13.6569 13.6569 15 12 15C10.3431 15 9 13.6569 9 12C9 10.3431 10.3431 9 12 9C13.6569 9 15 10.3431 15 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M2.45801 12C3.73231 7.94288 7.52257 5 12.0002 5C16.4778 5 20.2681 7.94288 21.5424 12C20.2681 16.0571 16.4778 19 12.0002 19C7.52257 19 3.73231 16.0571 2.45801 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        Detay
                                    </button>
                                    
                                    ${(complaint.status === 'pending' || (currentUser.role === 'admin' && view === 'all_complaints')) ? `
                                        <button class="btn btn-sm btn-info" onclick="showEditComplaintModal(${complaint.id})" style="display: inline-flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; padding: 4px 8px; font-size: 12px; flex: 1;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10217 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            Düzenle
                                        </button>
                                        <button class="btn btn-sm btn-danger" onclick="deleteComplaint(${complaint.id})" style="display: inline-flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; padding: 4px 8px; font-size: 12px; flex: 1;">
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                            Sil
                                        </button>
                                    ` : `
                                        ${canUpdateStatus(complaint) ? `
                                            ${currentUser.role !== 'staff' ? `
                                            <button class="btn btn-sm btn-success" onclick="updateStatus(${complaint.id}, 'in_progress')" style="display: inline-flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; padding: 4px 8px; font-size: 12px; flex: 1;">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M14.7 6.30005L9 12L14.7 17.7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                </svg>
                                                İşleme Al
                                            </button>
                                            ` : ''}
                                            <button class="btn btn-sm btn-primary" onclick="updateStatus(${complaint.id}, 'completed')" style="display: inline-flex; align-items: center; justify-content: center; gap: 3px; white-space: nowrap; padding: 4px 8px; font-size: 12px; flex: 1;">
                                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M9 11L12 14L22 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                    <path d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                </svg>
                                                Tamamla
                                            </button>
                                        ` : ''}
                                    `}
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            ` : '<p>Henüz şikayet ve istek bulunmamaktadır.</p>';

        content.innerHTML = `
            <div class="page-header">
                <h1>${title}</h1>
                ${view === 'my_complaints' && currentUser.role === 'citizen' ? `
                    <button class="btn btn-primary" onclick="showNewComplaintModal()" style="display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 5V19M5 12H19" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        Yeni Şikayet ve İstek Ekle
                    </button>
                ` : ''}
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

        // Yorumları filtrele - vatandaşlar için sadece public yorumlar gösterilsin
        let visibleComments = complaint.comments || [];
        if (currentUser.role === 'citizen') {
            visibleComments = visibleComments.filter(comment => !comment.is_internal);
        }

        // Yorum silme yetkisi kontrolü (sadece pending/assigned durumlarında)
        const canDeleteComment = (comment) => {
            if (currentUser.role === 'admin') return true;
            if (comment.user_id === currentUser.id) return true;
            if (currentUser.role === 'citizen' && complaint.user_id === currentUser.id &&
                ['pending', 'assigned'].includes(complaint.status)) {
                return true;
            }
            return false;
        };

        // Yorum düzenleme yetkisi kontrolü (sadece yorum sahibi)
        const canEditComment = (comment) => {
            return comment.user_id === currentUser.id;
        };

        const commentsHTML = visibleComments.length > 0 ? `
            <div class="comments-section">
                <h3>Yorumlar (${visibleComments.length})</h3>
                ${visibleComments.map(comment => `
                    <div class="comment-item ${comment.is_internal ? 'comment-internal' : ''}">
                        <div class="comment-header">
                            <span class="comment-author">
                                ${comment.user_name || 'Bilinmeyen Kullanıcı'}
                                ${comment.user_role === 'admin' ? ' <span style="color: var(--primary); font-weight: 600;">(Yönetici)</span>' : ''}
                                ${comment.user_role === 'staff' ? ' <span style="color: var(--success); font-weight: 600;">(Personel)</span>' : ''}
                                ${comment.is_internal ? ' <span style="color: var(--warning);">(İç Yorum)</span>' : ''}
                            </span>
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <span class="comment-date">${formatDate(comment.created_at)}</span>
                                ${canEditComment(comment) ? `
                                    <button class="btn btn-sm btn-secondary" onclick="showEditCommentModal(${comment.id}, ${complaint.id}, '${escapeHtml(comment.comment_text)}')" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Düzenle">
                                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M11 5H4C3.46957 5 2.96086 5.21071 2.58579 5.58579C2.21071 5.96086 2 6.46957 2 7V16C2 16.5304 2.21071 17.0391 2.58579 17.4142C2.96086 17.7893 3.46957 18 4 18H13C13.5304 18 14.0391 17.7893 14.4142 17.4142C14.7893 17.0391 15 16.5304 15 16V9M15 5L18 8M18 8L15 11M18 8L12 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                ` : ''}
                                ${canDeleteComment(comment) ? `
                                    <button class="btn btn-sm btn-danger" onclick="deleteCommentFromComplaint(${comment.id}, ${complaint.id})" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" title="Sil">
                                        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 6H5H17M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2C10.5304 2 11.0391 2.21071 11.4142 2.58579C11.7893 2.96086 12 3.46957 12 4V6M15 6V16C15 16.5304 14.7893 17.0391 14.4142 17.4142C14.0391 17.7893 13.5304 18 13 18H7C6.46957 18 5.96086 17.7893 5.58579 17.4142C5.21071 17.0391 5 16.5304 5 16V6H15Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                        <div class="comment-text">${comment.comment_text || ''}</div>
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
                    <div class="detail-value">
                        <div style="display: flex; align-items: flex-start; gap: 0.5rem; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 200px;">${complaint.description}</div>
                        </div>
                    </div>
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
                    <div class="comment-form-section">
                        <h3>Yorum Ekle</h3>
                        <div class="form-group">
                            <textarea id="newCommentText" rows="4" placeholder="Yorumunuzu buraya yazın..." class="comment-textarea"></textarea>
                        </div>
                        ${currentUser.role !== 'citizen' ? `
                            <div class="internal-comment-checkbox">
                                <input type="checkbox" id="isInternalComment">
                                <label for="isInternalComment">
                                    <span class="checkbox-custom"></span>
                                    <span class="checkbox-label">Kurum İçi Yorum</span>
                                </label>
                            </div>
                        ` : ''}
                        <div class="comment-form-actions">
                            <button class="btn btn-primary" onclick="addCommentToComplaint(${complaint.id})">
                                <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10 3V17M3 10H17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                                </svg>
                                Yorum Ekle
                            </button>
                        </div>
                    </div>
                ` : ''}
                
                ${canUpdateStatus(complaint) ? `
                    <div class="status-action-buttons">
                        ${currentUser.role !== 'staff' ? `
                        <button class="btn btn-success" onclick="updateStatus(${complaint.id}, 'in_progress')">
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z" stroke="currentColor" stroke-width="2"/>
                                <path d="M10 6V10L13 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                            </svg>
                            İşleme Al
                        </button>
                        ` : ''}
                        <button class="btn btn-primary" onclick="updateStatus(${complaint.id}, 'completed')">
                            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M16 6L7 15L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Tamamla
                        </button>
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
        closeBtn.addEventListener('click', function () {
            this.closest('.modal').classList.remove('show');
        });
    });

    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function (e) {
            if (e.target === this) {
                this.classList.remove('show');
            }
        });
    });

    document.getElementById('newComplaintForm').addEventListener('submit', async function (e) {
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
                alert('Şikayet ve istek başarıyla oluşturuldu!');
                document.getElementById('newComplaintModal').classList.remove('show');
                loadView(currentView);
            } else {
                alert(result.message || 'Şikayet ve istek oluşturulurken bir hata oluştu');
            }
        } catch (error) {
            console.error('Create complaint error:', error);
            alert('Bir hata oluştu');
        }
    });

    document.getElementById('getLocationBtn').addEventListener('click', function () {
        const statusEl = document.getElementById('locationStatus');
        statusEl.textContent = 'Konum alınıyor...';

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                function (position) {
                    document.getElementById('complaint_latitude').value = position.coords.latitude;
                    document.getElementById('complaint_longitude').value = position.coords.longitude;
                    statusEl.textContent = 'Konum alındı ✓';
                    statusEl.style.color = 'green';
                },
                function (error) {
                    let errorMessage = 'Konum alınamadı';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Konum izni reddedildi';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Konum bilgisi mevcut değil';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Konum isteği zaman aşımına uğradı';
                            break;
                        default:
                            errorMessage = 'Konum hatası: ' + error.message;
                    }
                    statusEl.textContent = errorMessage;
                    statusEl.style.color = 'red';
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
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
        newUserForm.addEventListener('submit', async function (e) {
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

    let priority = null;
    if (status === 'in_progress') {
        // Simple HTML helper for priority selection
        const priorityHtml = `
            <div id="priorityModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;justify-content:center;align-items:center;z-index:9999;">
                <div style="background:white;padding:20px;border-radius:8px;width:300px;">
                    <h3>Öncelik Belirle</h3>
                    <p>Lütfen bu şikayet ve istek için bir öncelik seçin:</p>
                    <select id="selectedPriority" class="form-control" style="width:100%;margin-bottom:15px;">
                        <option value="low">Düşük</option>
                        <option value="medium">Orta</option>
                        <option value="high">Yüksek</option>
                        <option value="urgent">Acil</option>
                    </select>
                    <div style="display:flex;justify-content:end;gap:10px;">
                        <button class="btn btn-secondary" onclick="document.getElementById('priorityModal').remove()">İptal</button>
                        <button class="btn btn-primary" onclick="window.confirmPriority()">Onayla</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', priorityHtml);

        try {
            priority = await new Promise((resolve, reject) => {
                window.confirmPriority = () => {
                    const val = document.getElementById('selectedPriority').value;
                    document.getElementById('priorityModal').remove();
                    delete window.confirmPriority;
                    resolve(val);
                };
            });
        } catch (e) {
            return; // Cancelled
        }
    }

    try {
        // Use direct fetch since we need to pass priority
        const token = localStorage.getItem('token');
        const body = { complaint_id: complaintId, status: status };
        if (priority) {
            body.priority = priority;
        }

        const response = await fetch('/api/update_complaint_status.php', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const result = await response.json();

        if (result.success) {
            alert('Durum başarıyla güncellendi!');
            loadView(currentView); // Refresh list
            document.getElementById('complaintModal').classList.remove('show');
        } else {
            alert(result.message || 'Durum güncellenirken bir hata oluştu');
        }
    } catch (error) {
        console.error('Update status error:', error);
        alert('Bir hata oluştu');
    }
}

function showEditCommentModal(commentId, complaintId, currentText) {
    const modal = document.getElementById('complaintModal');
    const modalBody = document.getElementById('modalBody');

    modalBody.innerHTML = `
        <div class="comment-edit-form">
            <h2>Yorumu Düzenle</h2>
            <form id="editCommentForm">
                <div class="form-group">
                    <label for="edit_comment_text">Yorum</label>
                    <textarea id="edit_comment_text" name="comment_text" rows="5" required class="comment-textarea">${escapeHtml(currentText)}</textarea>
                </div>
                <div class="form-group" style="display: flex; gap: 0.75rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button type="button" class="btn btn-secondary" onclick="showComplaintDetail(${complaintId})">İptal</button>
                    <button type="submit" class="btn btn-primary">Kaydet</button>
                </div>
            </form>
        </div>
    `;

    modal.classList.add('show');

    document.getElementById('editCommentForm').addEventListener('submit', async function (e) {
        e.preventDefault();
        await updateCommentData(commentId, complaintId);
    });
}

async function updateCommentData(commentId, complaintId) {
    const commentText = document.getElementById('edit_comment_text').value.trim();

    if (!commentText) {
        alert('Yorum metni boş olamaz');
        return;
    }

    try {
        const result = await updateComment(commentId, commentText);

        if (result && result.success) {
            alert('Yorum başarıyla güncellendi!');
            showComplaintDetail(complaintId);
        } else {
            const errorMsg = result && result.message ? result.message : 'Yorum güncellenirken bir hata oluştu';
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Update comment error:', error);
        const errorMsg = error.message || 'Yorum güncellenirken bir hata oluştu';
        alert(errorMsg);
    }
}

async function deleteCommentFromComplaint(commentId, complaintId) {
    if (!confirm('Bu yorumu silmek istediğinizden emin misiniz?')) {
        return;
    }

    try {
        const result = await deleteComment(commentId);

        if (result && result.success) {
            alert('Yorum başarıyla silindi!');
            showComplaintDetail(complaintId);
        } else {
            const errorMsg = result && result.message ? result.message : 'Yorum silinirken bir hata oluştu';
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Delete comment error:', error);
        const errorMsg = error.message || 'Yorum silinirken bir hata oluştu';
        alert(errorMsg);
    }
}

function showEditComplaintModal(complaintId) {
    // Şikayet detayını al ve düzenleme modalını göster
    getComplaint(complaintId).then(result => {
        if (!result.success) {
            alert('Şikayet yüklenirken bir hata oluştu');
            return;
        }

        const complaint = result.data;
        const modal = document.getElementById('complaintModal');
        const modalBody = document.getElementById('modalBody');

        const currentPhotosHTML = complaint.photos && complaint.photos.length > 0 ? `
            <div class="form-group" style="margin-top: 15px;">
                <label>Mevcut Fotoğraflar</label>
                <div class="current-photos-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 5px;">
                    ${complaint.photos.map(photo => `
                        <div class="photo-item" id="photo-${photo.id}" style="position: relative; border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
                            <img src="/uploads/${photo.photo_path}" style="width: 100%; height: 100px; object-fit: cover;" onclick="window.open('/uploads/${photo.photo_path}', '_blank')">
                            <button type="button" onclick="deletePhoto(${photo.id})" style="position: absolute; top: 2px; right: 2px; background: rgba(220, 53, 69, 0.9); color: white; border: none; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Sil">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M18 6L6 18M6 6l12 12"></path>
                                </svg>
                            </button>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        modalBody.innerHTML = `
            <div class="complaint-edit-form">
                <h2 style="margin-bottom: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px;">Şikayeti Düzenle</h2>
                <form id="editComplaintForm">
                    <div class="form-group">
                        <label for="edit_title" style="font-weight: 600;">Başlık</label>
                        <input type="text" id="edit_title" name="title" value="${escapeHtml(complaint.title)}" required class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    <div class="form-group">
                        <label for="edit_description" style="font-weight: 600;">Açıklama</label>
                        <textarea id="edit_description" name="description" rows="5" required class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">${escapeHtml(complaint.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="edit_address" style="font-weight: 600;">Adres</label>
                        <input type="text" id="edit_address" name="address" value="${complaint.address ? escapeHtml(complaint.address) : ''}" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                    </div>
                    
                    <div class="form-row" style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div class="form-group" style="flex: 1;">
                            <label for="edit_latitude" style="font-weight: 600;">Enlem</label>
                            <input type="text" id="edit_latitude" name="latitude" value="${complaint.latitude || ''}" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label for="edit_longitude" style="font-weight: 600;">Boylam</label>
                            <input type="text" id="edit_longitude" name="longitude" value="${complaint.longitude || ''}" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom: 20px;">
                        <button type="button" id="getLocationBtn" class="btn btn-info btn-block" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px;">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="currentColor"/>
                            </svg>
                            Mevcut Konumu Al
                        </button>
                        <span id="locationStatus" style="font-size: 14px; margin-top: 5px; display: block; text-align: center;"></span>
                    </div>
                    
                    ${currentPhotosHTML}

                    <div class="form-group photo-upload-section" style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px dashed #ced4da;">
                        <label for="edit_photos" style="font-weight: 600; display: block; margin-bottom: 8px;">
                            <span style="display: flex; align-items: center; gap: 8px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15M17 8L12 3M12 3L7 8M12 3V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                                Yeni Fotoğraf Ekle
                            </span>
                        </label>
                        <input type="file" id="edit_photos" name="photos[]" multiple accept="image/*" class="form-control-file" style="display: block; width: 100%;">
                        <small style="color: #6c757d; display: block; margin-top: 5px;">Mevcut fotoğraflar korunacaktır.</small>
                    </div>

                    <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px; pt-3; border-top: 1px solid #eee;">
                        <button type="button" class="btn btn-secondary close-modal-btn" onclick="showComplaintDetail(${complaintId})" style="display: flex; align-items: center; gap: 5px; padding: 8px 16px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            İptal
                        </button>
                        <button type="submit" class="btn btn-primary" style="display: flex; align-items: center; gap: 5px; padding: 8px 16px;">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16L21 8V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                <path d="M17 21V13H7V21M7 3V8H15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                            Değişiklikleri Kaydet
                        </button>
                    </div>
                </form>
            </div>
        `;

        // Add Location Button Logic
        document.getElementById('getLocationBtn').addEventListener('click', function () {
            const statusEl = document.getElementById('locationStatus');
            statusEl.textContent = 'Konum alınıyor...';
            statusEl.style.color = '#666';

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    function (position) {
                        document.getElementById('edit_latitude').value = position.coords.latitude;
                        document.getElementById('edit_longitude').value = position.coords.longitude;
                        statusEl.textContent = 'Konum başarıyla alındı ✓';
                        statusEl.style.color = '#28a745';
                    },
                    function (error) {
                        let errorMessage = 'Konum alınamadı';
                        switch (error.code) {
                            case error.PERMISSION_DENIED: errorMessage = 'Konum izni reddedildi'; break;
                            case error.POSITION_UNAVAILABLE: errorMessage = 'Konum bilgisi mevcut değil'; break;
                            case error.TIMEOUT: errorMessage = 'Konum alma zaman aşımı'; break;
                        }
                        statusEl.textContent = errorMessage;
                        statusEl.style.color = '#dc3545';
                    },
                    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
                );
            } else {
                statusEl.textContent = 'Tarayıcınız konum servisini desteklemiyor.';
                statusEl.style.color = '#dc3545';
            }
        });
        modal.classList.add('show');

        document.getElementById('editComplaintForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            await updateComplaintData(complaintId);
        });
    });
}

function deletePhoto(photoId) {
    if (!confirm('Bu fotoğrafı silmek istediğinizden emin misiniz?')) return;

    fetch('/api/delete_photo.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify({ photo_id: photoId })
    })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                const photoEl = document.getElementById(`photo-${photoId}`);
                if (photoEl) {
                    photoEl.remove();
                }
                alert('Fotoğraf başarıyla silindi!');
            } else {
                alert(result.message || 'Fotoğraf silinirken bir hata oluştu');
            }
        })
        .catch(error => {
            console.error('Delete photo error:', error);
            alert('Bir hata oluştu');
        });
}

async function updateComplaintData(complaintId) {
    const title = document.getElementById('edit_title').value;
    const description = document.getElementById('edit_description').value;
    const address = document.getElementById('edit_address').value;
    const latitude = document.getElementById('edit_latitude').value;
    const longitude = document.getElementById('edit_longitude').value;

    if (!title.trim() || !description.trim()) {
        alert('Başlık ve açıklama alanları zorunludur');
        return;
    }

    try {
        const formData = new FormData();
        formData.append('complaint_id', complaintId);
        formData.append('title', title.trim());
        formData.append('description', description.trim());
        if (address.trim()) {
            formData.append('address', address.trim());
        }
        if (latitude.trim()) {
            formData.append('latitude', latitude.trim());
        }
        if (longitude.trim()) {
            formData.append('longitude', longitude.trim());
        }

        const photos = document.getElementById('edit_photos').files;
        if (photos.length > 0) {
            for (let i = 0; i < photos.length; i++) {
                formData.append('photos[]', photos[i]);
            }
        }

        // updateComplaint fonksiyonu API çağrısını yapacak, 
        // ancak mevcut api.js yapısı muhtemelen JSON bekliyor olabilir.
        // Bu yüzden api.js'deki updateComplaint fonksiyonunu da kontrol etmeliyiz veya
        // direkt fetch çağrısı yapmalıyız.
        // Şimdilik varsayım: api.js FormData desteği sunmuyor olabilir, o yüzden burada
        // manuel fetch yapacağım.

        const token = localStorage.getItem('token');
        const response = await fetch('/api/update_complaint.php', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + token
                // 'Content-Type': 'multipart/form-data' // Fetch otomatik ayarlar
            },
            body: formData
        });

        const result = await response.json();

        if (result && result.success) {
            alert(result.message || 'Şikayet başarıyla güncellendi!');
            showComplaintDetail(complaintId);
        } else {
            const errorMsg = result && result.message ? result.message : 'Şikayet güncellenirken bir hata oluştu';
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Update complaint error:', error);
        const errorMsg = error.message || 'Şikayet güncellenirken bir hata oluştu';
        alert(errorMsg);
    }
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

async function addCommentToComplaint(complaintId) {
    const commentText = document.getElementById('newCommentText').value;
    const isInternal = document.getElementById('isInternalComment') ? document.getElementById('isInternalComment').checked : false;

    if (!commentText.trim()) {
        alert('Lütfen yorum metni girin');
        return;
    }

    try {
        console.log('Adding comment:', { complaintId, commentText, isInternal });
        const result = await addComment(complaintId, commentText, isInternal);
        console.log('Add comment result:', result);

        if (result && result.success) {
            alert('Yorum başarıyla eklendi!');
            // Formu temizle
            document.getElementById('newCommentText').value = '';
            if (document.getElementById('isInternalComment')) {
                document.getElementById('isInternalComment').checked = false;
            }
            // Şikayet detayını yenile
            showComplaintDetail(complaintId);
        } else {
            const errorMsg = result && result.message ? result.message : 'Yorum eklenirken bir hata oluştu';
            console.error('Add comment failed:', result);
            alert(errorMsg);
        }
    } catch (error) {
        console.error('Add comment error:', error);
        const errorMsg = error.message || 'Yorum eklenirken bir hata oluştu';
        alert(errorMsg);
    }
}

async function loadAssignTasks() {
    const content = document.getElementById('dashboardContent');
    content.innerHTML = '<div class="card"><p>Yükleniyor...</p></div>';

    try {
        const [complaintsResult, staffResult] = await Promise.all([
            listComplaints({}), // Fetch all complaints
            listStaff()
        ]);

        console.log('Assign tasks results:', { complaintsResult, staffResult });

        if (!complaintsResult || !complaintsResult.success || !staffResult || !staffResult.success) {
            const errorMsg = (complaintsResult && complaintsResult.message) || (staffResult && staffResult.message) || 'Bilinmeyen hata';
            content.innerHTML = `<div class="card"><p class="message error">Veri yüklenirken bir hata oluştu: ${errorMsg}</p><p>Lütfen sayfayı yenileyin (F5) veya tekrar giriş yapın.</p></div>`;
            return;
        }

        let complaints = complaintsResult.data.complaints || [];
        const staff = staffResult.data || [];

        console.log('Staff list for assignment:', staff);
        console.log('Sample complaint assigned_to:', complaints.length > 0 ? complaints[0].assigned_to : 'no complaints');

        // Filter out completed/closed if desired, or keep all. 
        // User said "all complaints should be visible". 
        // But usually only active ones need assignment. 
        // Let's sort them: unassigned first, then assigned.
        complaints.sort((a, b) => {
            if (a.assigned_to && !b.assigned_to) return 1;
            if (!a.assigned_to && b.assigned_to) return -1;
            return new Date(b.created_at) - new Date(a.created_at);
        });

        const complaintsHTML = complaints.length > 0 ? `
            <style>
                .assigned-row { background-color: #d1fae5 !important; } /* Greenish */
                .unassigned-row { background-color: #f3f4f6 !important; } /* Grayish */
                .assigned-row:hover { background-color: #a7f3d0 !important; }
                .unassigned-row:hover { background-color: #e5e7eb !important; }
            </style>
            <table>
                <thead>
                    <tr>
                        <th>Başlık</th>
                        <th>Kullanıcı</th>
                        <th>Durum</th>
                        <th>Oluşturulma</th>
                        <th>Atanan Personel</th>
                        <th>Atama</th>
                    </tr>
                </thead>
                <tbody>
                    ${complaints.map(complaint => {
            const isAssigned = !!complaint.assigned_to;
            const rowClass = isAssigned ? 'assigned-row' : 'unassigned-row';

            // Find assigned staff name
            // Use backend provided name first, fallback to staff lookup
            const assignedName = complaint.assigned_to_name || (complaint.assigned_to
                ? (staff.find(s => s.id == complaint.assigned_to)?.full_name || '-')
                : '-');

            // Apply inline style to ensure green background for assigned tasks
            const rowStyle = isAssigned ? 'background-color: #d1fae5;' : '';

            return `
                        <tr class="${rowClass}" style="${rowStyle}">
                            <td>${complaint.title}</td>
                            <td>${complaint.user_name || '-'}</td>
                            <td><span class="status-badge ${complaint.status}">${getStatusLabel(complaint.status)}</span></td>
                            <td>${formatDate(complaint.created_at)}</td>
                            <td>${assignedName}</td>
                            <td>
                                <div style="display: flex; gap: 8px; align-items: center; max-width: 300px;">
                                    <select id="assign_${complaint.id}" class="form-control" style="flex: 1; padding: 6px 12px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 0.9em; background-color: #fff; cursor: pointer;">
                                        <option value="">${isAssigned ? 'Personel Değiştir' : 'Personel Seçin'}</option>
                                        ${staff.map(s => {
                const selected = s.id == complaint.assigned_to ? 'selected' : '';
                return `<option value="${s.id}" ${selected}>${s.full_name}</option>`;
            }).join('')}
                                    </select>
                                    <button class="btn btn-sm btn-primary" onclick="assignComplaint(${complaint.id}, '${complaint.priority || ''}')" style="display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 6px 12px; height: 34px;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M8.5 11C10.7091 11 12.5 9.20914 12.5 7C12.5 4.79086 10.7091 3 8.5 3C6.29086 3 4.5 4.79086 4.5 7C4.5 9.20914 6.29086 11 8.5 11Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M17 11L19 13L23 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        ${isAssigned ? 'Güncelle' : 'Ata'}
                                    </button>
                                    ${isAssigned ? `
                                    <button class="btn btn-sm btn-danger" onclick="unassignComplaint(${complaint.id})" style="display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 6px 12px; height: 34px;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M6 18L18 6M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                        Kaldır
                                    </button>
                                    ` : ''}
                                </div>
                            </td>
                        </tr>
                    `}).join('')}
                </tbody>
            </table>
            ` : '<p>Şikayet bulunmamaktadır.</p>';

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

async function assignComplaint(complaintId, priority) {
    // Check if priority is set
    if (!priority || priority === 'null' || priority === 'undefined') {
        alert('Lütfen görev ataması yapmadan önce şikayet ve isteğin öncelik durumunu belirleyiniz.');
        return;
    }

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

async function unassignComplaint(complaintId) {
    if (!confirm('Bu görev atamasını kaldırmak istediğinize emin misiniz?')) {
        return;
    }

    try {
        const result = await unassignTask(complaintId);

        if (result.success) {
            alert('Görev ataması başarıyla kaldırıldı!');
            loadAssignTasks();
        } else {
            alert(result.message || 'Görev ataması kaldırılırken bir hata oluştu');
        }
    } catch (error) {
        console.error('Unassign complaint error:', error);
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
    if (!priority) return '-';
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
                        <label for="profile_address">Adres (KKTC)</label>
                        <textarea id="profile_address" rows="3" placeholder="KKTC sınırları içerisindeki açık adresiniz">${profile.address || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label for="profile_role">Rol</label>
                        <input type="text" id="profile_role" value="${getRoleLabel(profile.role)}" disabled>
                    </div>

                    <div class="form-group">
                        <label for="profile_password">Yeni Şifre (Değiştirmek istemiyorsanız boş bırakın)</label>
                        <div style="position: relative;">
                            <input type="password" id="profile_password" minlength="6" style="width: 100%; padding-right: 40px;" autocomplete="new-password">
                            <button type="button" onclick="togglePasswordVisibility('profile_password')" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #666; padding: 5px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="icon_profile_password">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                        <small>En az 6 karakter</small>
                    </div>

                    <div class="form-group">
                        <label for="profile_password_confirm">Yeni Şifre Tekrar</label>
                        <div style="position: relative;">
                            <input type="password" id="profile_password_confirm" minlength="6" style="width: 100%; padding-right: 40px;">
                            <button type="button" onclick="togglePasswordVisibility('profile_password_confirm')" style="position: absolute; right: 5px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #666; padding: 5px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" id="icon_profile_password_confirm">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="form-group">
                        <button type="submit" class="btn btn-primary">Güncelle</button>
                    </div>
                </form>
            </div>
        `;

        document.getElementById('profileForm').addEventListener('submit', async function (e) {
            e.preventDefault();

            const fullName = document.getElementById('profile_full_name').value;
            const phone = document.getElementById('profile_phone').value;
            const address = document.getElementById('profile_address').value;
            const password = document.getElementById('profile_password').value;
            const passwordConfirm = document.getElementById('profile_password_confirm').value;

            if (password && password !== passwordConfirm) {
                alert('Şifreler eşleşmiyor');
                return;
            }

            const updateData = {
                full_name: fullName,
                phone: phone || null,
                address: address || null
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
                        <th>İşlemler</th>
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
                            <td>
                                <div style="display: flex; gap: 5px;">
                                    <button class="btn btn-sm btn-secondary" onclick='openEditUserModal(${JSON.stringify(user).replace(/'/g, "&#39;")})' title="Düzenle">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </button>
                                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})" title="Sil" ${user.id === currentUser.id ? 'disabled' : ''}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </td>
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


// Initialize modals
document.addEventListener('DOMContentLoaded', function () {
    // Only use setupModals for general modal logic, avoid duplicates
    // setupModals() is already called in the upper DOMContentLoaded
    // We just need to setup the specific form listeners here if they aren't covered

    setupNewUserFormListener();
    setupEditUserFormListener();
});

function showNewUserModal() {
    const modal = document.getElementById('newUserModal');
    if (modal) {
        // Reset form
        const form = document.getElementById('newUserForm');
        if (form) form.reset();

        // Show modal using class
        modal.classList.add('show');
        // Clear any inline style that might interfere
        modal.style.display = '';
    } else {
        alert('Kullanıcı ekleme formu bulunamadı (ID: newUserModal).');
    }
}

function setupNewUserFormListener() {
    const newUserForm = document.getElementById('newUserForm');
    if (newUserForm) {
        // Remove old listeners to prevent duplicates (cloning is a clean way)
        const newForm = newUserForm.cloneNode(true);
        newUserForm.parentNode.replaceChild(newForm, newUserForm);

        newForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'İşleniyor...';

            const userData = {
                email: document.getElementById('user_email').value,
                full_name: document.getElementById('user_full_name').value,
                phone: document.getElementById('user_phone').value || '',
                address: document.getElementById('user_address').value || '',
                role: document.getElementById('user_role').value,
                password: document.getElementById('user_password').value
            };

            try {
                // Use create_user.php for admin creation to support role assignment
                const response = await fetch('/api/create_user.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify(userData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('Kullanıcı başarıyla oluşturuldu');
                    document.getElementById('newUserModal').style.display = 'none';
                    loadUsers();
                    newForm.reset();
                } else {
                    alert(result.message || 'Kullanıcı oluşturulurken bir hata oluştu');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Bir hata oluştu: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

function setupEditUserFormListener() {
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        const newForm = editUserForm.cloneNode(true);
        editUserForm.parentNode.replaceChild(newForm, editUserForm);

        newForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.disabled = true;
            submitBtn.textContent = 'Güncelleniyor...';

            const userData = {
                user_id: document.getElementById('edit_user_id').value,
                full_name: document.getElementById('edit_user_full_name').value,
                phone: document.getElementById('edit_user_phone').value || '',
                address: document.getElementById('edit_user_address').value || '',
                role: document.getElementById('edit_user_role').value,
                password: document.getElementById('edit_user_password').value
            };

            try {
                const response = await fetch('/api/update_user_admin.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + localStorage.getItem('token')
                    },
                    body: JSON.stringify(userData)
                });

                const result = await response.json();

                if (result.success) {
                    alert('Kullanıcı başarıyla güncellendi');
                    document.getElementById('editUserModal').style.display = 'none';
                    loadUsers();
                } else {
                    alert(result.message || 'Güncelleme hatası');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Bir hata oluştu: ' + error.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        });
    }
}

// Global functions for inline onclick handlers
window.deleteUser = function (id) {
    if (confirm('Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
        fetch('/api/delete_user.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ user_id: id })
        })
            .then(res => res.json())
            .then(result => {
                if (result.success) {
                    alert('Kullanıcı silindi.');
                    loadUsers();
                } else {
                    alert(result.message || 'Silme işlemi başarısız.');
                }
            })
            .catch(err => {
                console.error(err);
                alert('Bir hata oluştu.');
            });
    }
};

window.openEditUserModal = function (user) {
    const modal = document.getElementById('editUserModal');
    if (modal) {
        document.getElementById('edit_user_id').value = user.id;
        document.getElementById('edit_user_email').value = user.email;
        document.getElementById('edit_user_full_name').value = user.full_name;
        document.getElementById('edit_user_phone').value = user.phone || '';
        document.getElementById('edit_user_address').value = user.address || '';
        document.getElementById('edit_user_role').value = user.role;
        document.getElementById('edit_user_password').value = ''; // Reset password field

        modal.classList.add('show');
        modal.style.display = '';
    }
};


window.showNewUserModal = showNewUserModal;

function getRoleLabel(role) {
    const labels = {
        'citizen': 'Vatandaş',
        'staff': 'Personel',
        'admin': 'Yönetici'
    };
    return labels[role] || role;
}


function deleteComplaint(id) {
    if (confirm('Bu şikayet ve isteği silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        fetch('/api/delete_complaint.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('token')
            },
            body: JSON.stringify({ complaint_id: id })
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    alert('Şikayet başarıyla silindi.');
                    loadView(currentView);
                } else {
                    alert(result.message || 'Silme işlemi başarısız.');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Bir hata oluştu.');
            });
    }
}

function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const icon = document.getElementById('icon_' + inputId);

    if (!input || !icon) return;

    if (input.type === 'password') {
        input.type = 'text';
        icon.innerHTML = `
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
        `;
    } else {
        input.type = 'password';
        icon.innerHTML = `
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
        `;
    }
}
