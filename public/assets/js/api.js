// API_BASE_URL HTML'de global olarak tanımlanıyor
// Her fonksiyonda kendi API değişkenini kullan
function getAPIUrl() {
    return (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : (window.location.origin + '/api'));
}

function createComplaint(complaintData, photos = null) {
    const formData = new FormData();

    Object.keys(complaintData).forEach(key => {
        if (complaintData[key] !== null && complaintData[key] !== '') {
            formData.append(key, complaintData[key]);
        }
    });

    if (photos && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
            formData.append('photos[]', photos[i]);
        }
    }

    return fetch(getAPIUrl() + '/create_complaint.php', {
        method: 'POST',
        credentials: 'same-origin',
        body: formData
    })
        .then(response => response.json());
}

function listComplaints(filters = {}) {
    const params = new URLSearchParams();

    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);

    const url = getAPIUrl() + '/list_complaints.php' + (params.toString() ? '?' + params.toString() : '');

    console.log('Fetching complaints from:', url);

    return fetch(url, {
        method: 'GET',
        credentials: 'same-origin'
    })
        .then(response => {
            console.log('List complaints response status:', response.status);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('List complaints data:', data);
            return data;
        })
        .catch(error => {
            console.error('List complaints error:', error);
            return { success: false, message: 'Veri yüklenirken bir hata oluştu: ' + error.message, data: { complaints: [], pagination: { page: 1, limit: 20, total: 0, total_pages: 0 } } };
        });
}

function getComplaint(id) {
    return fetch(getAPIUrl() + '/get_complaint.php?id=' + id + '&t=' + new Date().getTime(), {
        method: 'GET',
        credentials: 'same-origin'
    })
        .then(response => response.json());
}

function updateComplaintStatus(complaintId, status) {
    return fetch(getAPIUrl() + '/update_complaint_status.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ complaint_id: complaintId, status })
    })
        .then(response => response.json());
}

function assignTask(complaintId, assignedTo) {
    return fetch(getAPIUrl() + '/assign_task.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({ complaint_id: complaintId, assigned_to: assignedTo })
    })
        .then(response => response.json());
}

function addComment(complaintId, commentText, isInternal = false) {
    return fetch(getAPIUrl() + '/add_comment.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            complaint_id: complaintId,
            comment_text: commentText,
            is_internal: isInternal
        })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .catch(error => {
            console.error('Add comment API error:', error);
            throw error;
        });
}

function listStaff() {
    return fetch(getAPIUrl() + '/list_staff.php', {
        method: 'GET',
        credentials: 'same-origin'
    })
        .then(response => response.json());
}

function updateComplaint(complaintId, data) {
    return fetch(getAPIUrl() + '/update_complaint.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            complaint_id: complaintId,
            ...data
        })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .catch(error => {
            console.error('Update complaint API error:', error);
            throw error;
        });
}

function deleteComment(commentId) {
    return fetch(getAPIUrl() + '/delete_comment.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            comment_id: commentId
        })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .catch(error => {
            console.error('Delete comment API error:', error);
            throw error;
        });
}

function updateComment(commentId, commentText) {
    return fetch(getAPIUrl() + '/update_comment.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify({
            comment_id: commentId,
            comment_text: commentText
        })
    })
        .then(response => {
            if (!response.ok) {
                return response.json().then(err => {
                    throw new Error(err.message || `HTTP error! status: ${response.status}`);
                });
            }
            return response.json();
        })
        .catch(error => {
            console.error('Update comment API error:', error);
            throw error;
        });
}

function getProfile() {
    return fetch(getAPIUrl() + '/get_profile.php', {
        method: 'GET',
        credentials: 'same-origin'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('Get profile error:', error);
            return { success: false, message: 'Profil yüklenirken bir hata oluştu: ' + error.message };
        });
}

function updateProfile(profileData) {
    return fetch(getAPIUrl() + '/update_profile.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(profileData)
    })
        .then(response => response.json());
}

function createUser(userData) {
    return fetch(getAPIUrl() + '/create_user.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(userData)
    })
        .then(response => response.json());
}

function listAllUsers(filters = {}) {
    const params = new URLSearchParams();
    if (filters.role) params.append('role', filters.role);
    if (filters.search) params.append('search', filters.search);

    // Add timestamp to prevent caching
    const url = getAPIUrl() + '/list_all_users.php' + (params.toString() ? '?' + params.toString() + '&' : '?') + 't=' + new Date().getTime();

    return fetch(url, {
        method: 'GET',
        credentials: 'same-origin'
    })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .catch(error => {
            console.error('List all users error:', error);
            return { success: false, message: 'Kullanıcılar yüklenirken bir hata oluştu: ' + error.message, data: [] };
        });
}

