// Custom Alert and Confirm Modal Functions

/**
 * Custom alert modal
 * @param {string} message - The message to display
 * @param {string} title - Optional title (default: "Sistem Bildirimi")
 * @returns {Promise<void>}
 */
window.customAlert = function (message, title = 'Sistem Bildirimi') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customAlertModal');
        const titleEl = document.getElementById('customAlertTitle');
        const messageEl = document.getElementById('customAlertMessage');
        const okBtn = document.getElementById('customAlertOk');

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.add('show');

        const handleOk = () => {
            modal.classList.remove('show');
            okBtn.removeEventListener('click', handleOk);
            resolve();
        };

        okBtn.addEventListener('click', handleOk);

        // Close on overlay click
        const overlay = modal.querySelector('.custom-modal-overlay');
        const handleOverlay = () => {
            modal.classList.remove('show');
            overlay.removeEventListener('click', handleOverlay);
            resolve();
        };
        overlay.addEventListener('click', handleOverlay, { once: true });

        // Close on Escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                modal.classList.remove('show');
                document.removeEventListener('keydown', handleEscape);
                resolve();
            }
        };
        document.addEventListener('keydown', handleEscape, { once: true });
    });
};

/**
 * Custom confirm modal
 * @param {string} message - The message to display
 * @param {string} title - Optional title (default: "Sistem Bildirimi")
 * @returns {Promise<boolean>} - true if confirmed, false if cancelled
 */
window.customConfirm = function (message, title = 'Sistem Bildirimi') {
    return new Promise((resolve) => {
        const modal = document.getElementById('customConfirmModal');
        const titleEl = document.getElementById('customConfirmTitle');
        const messageEl = document.getElementById('customConfirmMessage');
        const okBtn = document.getElementById('customConfirmOk');
        const cancelBtn = document.getElementById('customConfirmCancel');

        titleEl.textContent = title;
        messageEl.textContent = message;
        modal.classList.add('show');

        const cleanup = () => {
            modal.classList.remove('show');
            okBtn.removeEventListener('click', handleOk);
            cancelBtn.removeEventListener('click', handleCancel);
        };

        const handleOk = () => {
            cleanup();
            resolve(true);
        };

        const handleCancel = () => {
            cleanup();
            resolve(false);
        };

        okBtn.addEventListener('click', handleOk);
        cancelBtn.addEventListener('click', handleCancel);

        // Close on overlay click (treat as cancel)
        const overlay = modal.querySelector('.custom-modal-overlay');
        const handleOverlay = () => {
            cleanup();
            resolve(false);
        };
        overlay.addEventListener('click', handleOverlay, { once: true });

        // Close on Escape key (treat as cancel)
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEscape);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEscape, { once: true });
    });
};

// Override native alert and confirm globally
// Store original functions in case needed
window._nativeAlert = window.alert;
window._nativeConfirm = window.confirm;

// Replace with custom modals
window.alert = function (message) {
    return window.customAlert(message);
};

window.confirm = function (message) {
    return window.customConfirm(message);
};

