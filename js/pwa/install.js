// js/pwa/install.js
// Manejo del prompt de instalación PWA.

export class PwaInstall {
    constructor() {
        this.deferredPrompt = null;
        this.isInstalled = false;
        this.init();
    }

    init() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallPrompt();
        });

        window.addEventListener('appinstalled', () => {
            this.isInstalled = true;
            this.deferredPrompt = null;
            this.hideInstallPrompt();
        });
    }

    showInstallPrompt() {
        const banner = document.createElement('div');
        banner.id = 'pwaInstallBanner';
        banner.className = 'pwa-install-banner';
        banner.innerHTML = `
            <div class="pwa-install-content">
                <span class="pwa-install-text">Instala CONTEXTO en tu dispositivo</span>
                <button class="btn btn--primary btn--sm" id="pwaInstallBtn">Instalar</button>
                <button class="btn btn--ghost btn--sm" id="pwaInstallClose">Ahora no</button>
            </div>
        `;

        document.body.appendChild(banner);

        document.getElementById('pwaInstallBtn').addEventListener('click', async () => {
            if (!this.deferredPrompt) return;
            this.deferredPrompt.prompt();
            const { outcome } = await this.deferredPrompt.userChoice;
            if (outcome === 'accepted') {
                window.app?.toast?.success('Aplicación instalada', 'CONTEXTO se ha instalado correctamente.');
            }
            this.deferredPrompt = null;
            this.hideInstallPrompt();
        });

        document.getElementById('pwaInstallClose').addEventListener('click', () => {
            this.hideInstallPrompt();
        });
    }

    hideInstallPrompt() {
        const banner = document.getElementById('pwaInstallBanner');
        if (banner) {
            banner.remove();
        }
    }
}

export const pwaInstall = new PwaInstall();
