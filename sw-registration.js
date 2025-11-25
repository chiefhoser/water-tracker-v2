/**
 * Service Worker Registration and Update Management
 * Handles PWA installation, updates, and offline functionality
 */

let registration = null;

// Namespace for SW-related functions to avoid global pollution
window.WaterTrackerSW = {
    showUpdateNotification,
    updateApp,
    dismissUpdate
};

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then((reg) => {
                console.log('ServiceWorker registration successful');
                attachUpdateListeners(reg);
            })
            .catch((err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

function attachUpdateListeners(reg) {
    registration = reg;

    monitorWorker(reg.waiting);
    monitorWorker(reg.installing);

    setInterval(() => {
        reg.update().catch((err) => {
            console.log('ServiceWorker update check failed:', err);
        });
    }, 60000);

    reg.addEventListener('updatefound', () => {
        monitorWorker(reg.installing);
    });

    navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
    });
}

function monitorWorker(worker) {
    if (!worker) return;

    if (worker.state === 'installed') {
        showUpdateNotification();
        return;
    }

    const listener = () => {
        if (worker.state === 'installed') {
            worker.removeEventListener('statechange', listener);
            showUpdateNotification();
        }
    };

    worker.addEventListener('statechange', listener);
}

function showUpdateNotification() {
    if (document.getElementById('update-banner')) return;

    const updateBanner = document.createElement('div');
    updateBanner.id = 'update-banner';
    updateBanner.className = 'update-banner';

    const message = document.createElement('span');
    message.textContent = '🔄 New version available!';
    message.className = 'update-message';

    const updateBtn = document.createElement('button');
    updateBtn.className = 'update-btn';
    updateBtn.textContent = 'Update Now';
    updateBtn.setAttribute('aria-label', 'Update to new version now');
    updateBtn.addEventListener('click', updateApp);

    const laterBtn = document.createElement('button');
    laterBtn.className = 'update-btn-secondary';
    laterBtn.textContent = 'Later';
    laterBtn.setAttribute('aria-label', 'Update later');
    laterBtn.addEventListener('click', dismissUpdate);

    updateBanner.appendChild(message);
    updateBanner.appendChild(updateBtn);
    updateBanner.appendChild(laterBtn);
    document.body.appendChild(updateBanner);
}

function updateApp() {
    const attemptUpdate = (reg) => {
        if (reg && reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }
    };

    if (registration) {
        attemptUpdate(registration);
    } else {
        navigator.serviceWorker.getRegistration().then(attemptUpdate);
    }
}

function dismissUpdate() {
    const banner = document.getElementById('update-banner');
    if (banner) {
        banner.remove();
    }
}

// Handle visibility change for update checks
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && registration) {
        registration.update().catch((err) => {
            console.log('Visibility update check failed:', err);
        });
    }
});
