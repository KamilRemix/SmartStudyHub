/**
 * SmartStudyHub — Android Auto-Updater
 * 
 * Checks GitHub Releases API for new versions, shows a changelog modal,
 * downloads the APK to the app cache, and opens the system PackageInstaller
 * via a Capacitor plugin (InAppUpdatePlugin) using FileProvider content:// URIs.
 * 
 * Security (Store & Policy compliant):
 * - Uses standard Android Intent & FileProvider content:// URIs
 * - Standard Android PackageInstaller UI — user manually confirms install
 * - No silent/hidden code modifications or installations
 * - Files stored in app-private cache directory only
 */

const ANDROID_UPDATER_CONFIG = {
    GITHUB_OWNER: 'KamilRemix',
    GITHUB_REPO: 'SmartStudyHub',
    CURRENT_VERSION: '1.0.0',
    CHECK_INTERVAL_MS: 4 * 60 * 60 * 1000, // Check every 4 hours
    LAST_CHECK_KEY: 'ssh_android_update_last_check',
    DISMISSED_VERSION_KEY: 'ssh_android_update_dismissed',
    STABILITY_KEY: 'ssh_android_update_stability',
    STABILITY_TIMEOUT_MS: 30000, // 30 seconds to consider launch stable
};

/**
 * Compare two semver version strings (e.g. "1.2.3" vs "1.3.0").
 * Returns: 1 if a > b, -1 if a < b, 0 if equal.
 */
function androidCompareVersions(a, b) {
    const pa = a.replace(/^v/, '').split('.').map(Number);
    const pb = b.replace(/^v/, '').split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

/**
 * Check if we are running inside a Capacitor Android WebView.
 */
function isCapacitorAndroid() {
    return typeof window !== 'undefined'
        && window.Capacitor
        && window.Capacitor.isNativePlatform
        && window.Capacitor.isNativePlatform()
        && window.Capacitor.getPlatform
        && window.Capacitor.getPlatform() === 'android';
}

/**
 * Monitor app stability after an update.
 * If the app survives STABILITY_TIMEOUT_MS without crashing,
 * we mark the update as stable.
 */
function androidMonitorStability() {
    const stabilityData = localStorage.getItem(ANDROID_UPDATER_CONFIG.STABILITY_KEY);
    if (!stabilityData) return;

    try {
        const data = JSON.parse(stabilityData);
        if (data.status === 'pending') {
            // App just launched after an update — start stability timer
            const launchCount = (data.launchCount || 0) + 1;
            localStorage.setItem(ANDROID_UPDATER_CONFIG.STABILITY_KEY, JSON.stringify({
                ...data,
                status: 'monitoring',
                launchCount: launchCount,
                lastLaunch: Date.now()
            }));

            // If crashed 3+ times consecutively, show warning
            if (launchCount >= 3) {
                setTimeout(() => {
                    androidShowStabilityWarning(data.version);
                }, 2000);
                return;
            }

            // After 30 seconds of stable running, mark as stable
            setTimeout(() => {
                localStorage.setItem(ANDROID_UPDATER_CONFIG.STABILITY_KEY, JSON.stringify({
                    ...data,
                    status: 'stable',
                    launchCount: 0
                }));
                console.log('[AndroidUpdater] Update confirmed stable after', ANDROID_UPDATER_CONFIG.STABILITY_TIMEOUT_MS, 'ms');
            }, ANDROID_UPDATER_CONFIG.STABILITY_TIMEOUT_MS);
        } else if (data.status === 'monitoring') {
            // App crashed during monitoring — increment counter
            localStorage.setItem(ANDROID_UPDATER_CONFIG.STABILITY_KEY, JSON.stringify({
                ...data,
                status: 'pending' // Reset to pending for next launch
            }));
        }
    } catch (e) {
        console.error('[AndroidUpdater] Stability check error:', e);
        localStorage.removeItem(ANDROID_UPDATER_CONFIG.STABILITY_KEY);
    }
}

/**
 * Show a warning if the app keeps crashing after update.
 */
function androidShowStabilityWarning(version) {
    const modal = document.getElementById('update-modal');
    if (!modal) return;

    const title = modal.querySelector('.update-modal-title');
    const body = modal.querySelector('.update-modal-changelog');
    const btnPrimary = modal.querySelector('.update-modal-btn-primary');
    const btnSecondary = modal.querySelector('.update-modal-btn-secondary');
    const progress = modal.querySelector('.update-modal-progress-container');

    if (title) title.textContent = 'Ошибка обновления';
    if (body) body.innerHTML = '<p>Приложение нестабильно после обновления до версии <strong>' + version + '</strong>. ' +
        'Пожалуйста, попробуйте переустановить приложение или свяжитесь с нами через GitHub Issues.</p>';
    if (btnPrimary) {
        btnPrimary.textContent = 'Открыть GitHub Issues';
        btnPrimary.onclick = () => {
            window.open('https://github.com/KamilRemix/SmartStudyHub/issues', '_blank');
            modal.classList.remove('active');
        };
        btnPrimary.style.display = '';
    }
    if (btnSecondary) {
        btnSecondary.textContent = 'Закрыть';
        btnSecondary.onclick = () => {
            modal.classList.remove('active');
            localStorage.removeItem(ANDROID_UPDATER_CONFIG.STABILITY_KEY);
        };
        btnSecondary.style.display = '';
    }
    if (progress) progress.style.display = 'none';

    modal.classList.add('active');
}

/**
 * Check for updates by querying GitHub Releases API.
 */
async function androidCheckForUpdates() {
    if (!isCapacitorAndroid()) return;
    if (window.INSTALLATION_CHANNEL === 'RU_STORE') {
        console.log('[AndroidUpdater] Disabled for RU_STORE channel');
        return;
    }

    let currentVersion = ANDROID_UPDATER_CONFIG.CURRENT_VERSION;
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            const info = await window.Capacitor.Plugins.App.getInfo();
            if (info && info.version) {
                currentVersion = info.version;
            }
        }
    } catch (e) {
        console.warn('[AndroidUpdater] Error fetching App info:', e);
    }

    // Throttle: don't check too frequently
    const lastCheck = parseInt(localStorage.getItem(ANDROID_UPDATER_CONFIG.LAST_CHECK_KEY) || '0', 10);
    if (Date.now() - lastCheck < ANDROID_UPDATER_CONFIG.CHECK_INTERVAL_MS) {
        console.log('[AndroidUpdater] Skipping check — too recent');
        return;
    }

    try {
        const apiUrl = `https://api.github.com/repos/${ANDROID_UPDATER_CONFIG.GITHUB_OWNER}/${ANDROID_UPDATER_CONFIG.GITHUB_REPO}/releases/latest`;
        const response = await fetch(apiUrl, {
            headers: { 'Accept': 'application/vnd.github.v3+json' }
        });

        if (!response.ok) {
            console.warn('[AndroidUpdater] GitHub API returned', response.status);
            return;
        }

        const release = await response.json();
        localStorage.setItem(ANDROID_UPDATER_CONFIG.LAST_CHECK_KEY, String(Date.now()));

        const remoteVersion = release.tag_name;
        if (androidCompareVersions(remoteVersion, currentVersion) <= 0) {
            console.log('[AndroidUpdater] Already on latest version:', currentVersion);
            return;
        }

        // Check if user dismissed this version
        if (localStorage.getItem(ANDROID_UPDATER_CONFIG.DISMISSED_VERSION_KEY) === remoteVersion) {
            console.log('[AndroidUpdater] Version', remoteVersion, 'was dismissed by user');
            return;
        }

        // Find the .apk asset
        const apkAsset = release.assets.find(a => a.name.endsWith('.apk'));
        if (!apkAsset) {
            console.warn('[AndroidUpdater] No .apk asset found in release', remoteVersion);
            return;
        }

        // Show update modal
        androidShowUpdateModal(release, apkAsset);

    } catch (err) {
        console.error('[AndroidUpdater] Check failed:', err);
    }
}

/**
 * Show the update available modal with changelog.
 */
function androidShowUpdateModal(release, apkAsset) {
    const modal = document.getElementById('update-modal');
    if (!modal) return;

    const title = modal.querySelector('.update-modal-title');
    const body = modal.querySelector('.update-modal-changelog');
    const btnPrimary = modal.querySelector('.update-modal-btn-primary');
    const btnSecondary = modal.querySelector('.update-modal-btn-secondary');
    const progress = modal.querySelector('.update-modal-progress-container');

    if (title) title.textContent = 'Доступно обновление ' + release.tag_name;
    if (body) {
        // Convert markdown body to simple HTML
        const changelog = (release.body || 'Нет описания').replace(/\n/g, '<br>');
        body.innerHTML = '<div class="update-changelog-content">' + changelog + '</div>';
    }
    if (progress) progress.style.display = 'none';

    if (btnPrimary) {
        btnPrimary.textContent = 'Скачать и установить';
        btnPrimary.style.display = '';
        btnPrimary.onclick = () => {
            androidDownloadAndInstall(release.tag_name, apkAsset, modal);
        };
    }
    if (btnSecondary) {
        btnSecondary.textContent = 'Позже';
        btnSecondary.style.display = '';
        btnSecondary.onclick = () => {
            localStorage.setItem(ANDROID_UPDATER_CONFIG.DISMISSED_VERSION_KEY, release.tag_name);
            modal.classList.remove('active');
        };
    }

    modal.classList.add('active');
}

/**
 * Download APK and trigger system installer.
 */
async function androidDownloadAndInstall(version, apkAsset, modal) {
    const btnPrimary = modal.querySelector('.update-modal-btn-primary');
    const progress = modal.querySelector('.update-modal-progress-container');
    const progressBar = modal.querySelector('.update-modal-progress-bar');
    const progressText = modal.querySelector('.update-modal-progress-text');

    if (btnPrimary) btnPrimary.style.display = 'none';
    if (progress) progress.style.display = '';
    if (progressText) progressText.textContent = 'Скачивание...';
    if (progressBar) progressBar.style.width = '0%';

    try {
        // Download APK with progress tracking
        const response = await fetch(apkAsset.browser_download_url);
        if (!response.ok) throw new Error('Download failed: HTTP ' + response.status);

        const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
        const reader = response.body.getReader();
        const chunks = [];
        let receivedBytes = 0;

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            receivedBytes += value.length;

            if (contentLength > 0 && progressBar && progressText) {
                const pct = Math.round((receivedBytes / contentLength) * 100);
                progressBar.style.width = pct + '%';
                progressText.textContent = 'Скачивание... ' + pct + '%';
            }
        }

        const blob = new Blob(chunks, { type: 'application/vnd.android.package-archive' });

        if (progressText) progressText.textContent = 'Сохранение...';
        if (progressBar) progressBar.style.width = '100%';

        // Save APK to app cache using Capacitor Filesystem
        const { Filesystem, Directory } = await import('@capacitor/filesystem');
        const fileName = 'SmartStudyHub-update.apk';

        // Convert blob to base64
        const base64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });

        // Write to cache directory
        await Filesystem.writeFile({
            path: 'updates/' + fileName,
            data: base64,
            directory: Directory.Cache
        });

        // Get the real file path
        const fileInfo = await Filesystem.getUri({
            path: 'updates/' + fileName,
            directory: Directory.Cache
        });

        // Extract native file path from URI
        let nativePath = fileInfo.uri;
        if (nativePath.startsWith('file://')) {
            nativePath = nativePath.substring(7);
        }

        // Mark update as pending for stability monitoring
        localStorage.setItem(ANDROID_UPDATER_CONFIG.STABILITY_KEY, JSON.stringify({
            status: 'pending',
            version: version,
            timestamp: Date.now(),
            launchCount: 0
        }));

        if (progressText) progressText.textContent = 'Запуск установщика...';

        // Launch system installer via Capacitor plugin
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.InAppUpdate) {
            await window.Capacitor.Plugins.InAppUpdate.installApk({ path: nativePath });
        } else {
            throw new Error('InAppUpdate plugin not available');
        }

        modal.classList.remove('active');

    } catch (err) {
        console.error('[AndroidUpdater] Download/install failed:', err);
        if (progressText) progressText.textContent = 'Ошибка: ' + err.message;
        if (progressBar) progressBar.style.width = '0%';
        if (btnPrimary) {
            btnPrimary.textContent = 'Повторить';
            btnPrimary.style.display = '';
        }
    }
}

/**
 * Initialize the Android auto-updater.
 * Called from the main renderer on DOMContentLoaded.
 */
function initAndroidUpdater() {
    // Disabled per user request
    return;
}
