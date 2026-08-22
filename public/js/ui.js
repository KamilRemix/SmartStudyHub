/* =========================================================
   public/js/ui.js
   UI Module - SmartStudyHub
   Contains: Tab navigation, theme management, language/translations,
   splash screen, desktop download modal.
   Depends on: translations.js (window.translations),
               js/auth.js (updateAuthUI)
   ========================================================= */

const tabMap = {
    'calculator-tab': 'calculator-page',
    'grades-tab': 'grades-page',
    'tools-tab': 'tools-page'
};

function switchToTab(tabId) {
    try {
        document.body.classList.remove('ai-chat-open');
        const pageId = tabMap[tabId];
        if (!pageId) return;

        document.querySelectorAll('.nav-tab').forEach((t) => t.classList.remove('active'));
        const tab = document.getElementById(tabId);
        if (tab) tab.classList.add('active');

        document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));
        const targetPage = document.getElementById(pageId);
        if (targetPage) targetPage.classList.add('active');

        if (pageId === 'tools-page') {
            try {
                if (typeof initTools === 'function') initTools();
            } catch (e) {
                console.warn('initTools failed', e);
            }
        }
    } catch (e) {
        console.warn('[ui] switchToTab error:', e);
    }
}

function switchToGradesTab() {
    switchToTab('grades-tab');
}

function initTabNavigation() {
    try {
        document.querySelectorAll('.nav-tab').forEach((tab) => {
            tab.addEventListener('click', () => switchToTab(tab.id));
        });
    } catch (e) {
        console.warn('[ui] initTabNavigation error:', e);
    }
}

/* ========= GLOBAL FUNCTIONS ========= */

// --- THEME MANAGEMENT ---
function setTheme(theme) {
    try {
        if (theme === 'dark') {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.remove('dark-theme');
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light');
        }
        const settingsComp = document.querySelector('settings-component');
        if (settingsComp && typeof settingsComp.updateThemeButtons === 'function') {
            settingsComp.updateThemeButtons();
        }
    } catch (e) {
        console.warn('[ui] setTheme error:', e);
    }
}

// --- LANGUAGE & TRANSLATION ---
let currentLang = 'en'; // Default language
window.currentLang = currentLang;

function getInitialUserLanguage() {
    try {
        const savedLang = localStorage.getItem('language');
        if (savedLang && typeof translations !== 'undefined' && translations[savedLang]) {
            return savedLang;
        }

        const browserLang = navigator.language || navigator.userLanguage || 'en';
        const normalizedLang = String(browserLang).toLowerCase().split(/[-_]/)[0];
        if (typeof translations !== 'undefined' && translations[normalizedLang]) {
            return normalizedLang;
        }
        return 'en';
    } catch (e) {
        return 'en';
    }
}

// Desktop app modal helpers are defined later; declare here so we can safely call them
function syncDesktopDownloadLangSelector() {
    try {
        const langSelect = document.getElementById('desktop-lang-select');
        if (!langSelect) return;
        if (langSelect.value !== currentLang) {
            langSelect.value = currentLang;
        }
    } catch (e) {
        console.warn('[ui] syncDesktopDownloadLangSelector error:', e);
    }
}

function setLanguage(lang) {
    try {
        if (typeof translations === 'undefined' || !translations[lang]) return;
        currentLang = lang;
        window.currentLang = lang;
        localStorage.setItem('language', lang);
        document.documentElement.lang = lang;
        syncDesktopDownloadLangSelector();
        updateTranslations();
        if (typeof updateAuthUI === 'function') {
            updateAuthUI();
        }
    } catch (e) {
        console.warn('[ui] setLanguage error:', e);
    }
}

function updateTranslations() {
    try {
        if (typeof updateAuthDialogTexts === 'function') {
            try { updateAuthDialogTexts(); } catch (e) {}
        }
        if (typeof translations === 'undefined') return;
        const t = translations[currentLang] || translations['en'] || {};
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.dataset.i18n;
            const val = t[key];
            if (val !== undefined) el.textContent = val;
        });
        // Update placeholder attributes
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
            const key = el.dataset.i18nPlaceholder;
            const val = t[key];
            if (val !== undefined) el.placeholder = val;
        });
        // Update shadow DOM translations
        document.querySelectorAll('smart-calculator, grade-average-calculator, settings-component').forEach(component => {
            if (component.shadowRoot) {
                component.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
                    const key = el.dataset.i18n;
                    const translation = t[key];
                    if (translation) {
                        el.textContent = translation;
                    }
                });
            }
        });
        // Re-update strategy text when language changes
        const gradeAvgCalc = document.querySelector('grade-average-calculator');
        if (gradeAvgCalc && typeof gradeAvgCalc.updateStrategy === 'function') {
            gradeAvgCalc.updateStrategy();
        }
        // Update Tools specific texts (select options, buttons, badges)
        try { updateToolsTranslations(); } catch (e) { /* non-fatal */ }
    } catch (e) {
        console.warn('[ui] updateTranslations error:', e);
    }
}

function updateToolsTranslations() {
    try {
        if (typeof translations === 'undefined') return;
        const currentTranslations = translations[currentLang] || translations['en'] || {};

        // converter type options
        const convType = document.getElementById('conv-type');
        if (convType) {
            const map = { length: 'length', mass: 'mass', temp: 'temperature' };
            Array.from(convType.options).forEach(opt => {
                const key = map[opt.value] || opt.value;
                opt.textContent = currentTranslations[key] || opt.textContent;
            });
        }
        // placeholder for input and result label
        const convValueEl = document.getElementById('conv-value');
        if (convValueEl) {
            convValueEl.placeholder = currentTranslations['valuePlaceholder'] || '';
        }
        const resultLabel = document.querySelector('#tools-converter-panel .result-label');
        if (resultLabel) resultLabel.textContent = currentTranslations['result'] || resultLabel.textContent;
        
        // Currency element translations
        const extraLabelsLocal = {
            currencyConverterTitle: { en: 'Currency Converter', ru: 'Конвертер валют', uk: 'Конвертер валют', be: 'Канвэртар валют', kk: 'Валюта түрлендіргіші', es: 'Conversor de divisas', de: 'Währungsrechner', fr: 'Convertisseur de devises', zh: '货币兑换器', tr: 'Döviz Çevirici', ar: 'محول العملات' },
            currencyConverterSub: { en: 'Convert between world currencies', ru: 'Конвертируйте мировые валюты', uk: 'Конвертуйте світові валюти', be: 'Канвертуйце сусветныя валюты', kk: 'Әлемдік валюталарды түрлендіру', es: 'Convierte entre divisas del mundo', de: 'Zwischen Weltwährungen umrechnen', fr: 'Convertir entre devises mondiales', zh: '在世界货币之间进行兑换', tr: 'Dünya para birimleri arasında çeviri yapın', ar: 'التحويل بين العملات العالمية' },
            popularRates: { en: 'Popular Rates', ru: 'Популярные курсы', uk: 'Популярні курси', be: 'Папулярныя курсы', kk: 'Танымал бағамдар', es: 'Tasas populares', de: 'Beliebte Kurse', fr: 'Taux populaires', zh: '热门汇率', tr: 'Popüler Kurlar', ar: 'أسعار شائعة' },
            lastUpdate: { en: 'Last update', ru: 'Последнее обновление', uk: 'Останнє оновлення', be: 'Апошняе абнаўленне', kk: 'Соңғы жаңарту', es: 'Última actualización', de: 'Letzte Aktualisierung', fr: 'Dernière mise à jour', zh: '最后更新', tr: 'Son güncelleme', ar: 'آخر تحديث' }
        };

        const tTitle = document.querySelector('[data-i18n="currencyConverterTitle"]');
        if (tTitle) {
            tTitle.textContent = (extraLabelsLocal.currencyConverterTitle[currentLang] || extraLabelsLocal.currencyConverterTitle.en);
        }
        const tSub = document.querySelector('[data-i18n="currencyConverterSub"]');
        if (tSub) {
            tSub.textContent = (extraLabelsLocal.currencyConverterSub[currentLang] || extraLabelsLocal.currencyConverterSub.en);
        }
        const tPop = document.querySelector('[data-i18n="popularRates"]');
        if (tPop) {
            tPop.textContent = (extraLabelsLocal.popularRates[currentLang] || extraLabelsLocal.popularRates.en);
        }

        const refreshBtnSpan = document.querySelector('#currency-refresh span');
        if (refreshBtnSpan) {
            refreshBtnSpan.textContent = currentTranslations['refresh'] || 'Refresh';
        }
        // badges (offline texts)
        document.querySelectorAll('.tool-card').forEach(card => {
            const badge = card.querySelector('.card-badge');
            if (badge) {
                // by default clear
                if (!navigator.onLine) {
                    badge.classList.add('card-badge--offline');
                    badge.textContent = currentTranslations['offline'] || 'Offline';
                } else {
                    badge.classList.remove('card-badge--offline');
                    badge.textContent = '';
                }
            }
        });
        if (typeof window.updateGenPassTranslations === 'function') {
            try { window.updateGenPassTranslations(); } catch(e) { console.warn(e); }
        }
    } catch (e) {
        console.warn('[ui] updateToolsTranslations error:', e);
    }
}

// --- DESKTOP APP DOWNLOAD MODAL ---

const DESKTOP_APP_VERSION = '1.1.0';
const DESKTOP_APP_DOWNLOAD_URL = 'https://github.com/KamilRemix/SmartStudyHub/releases/latest';

function initDesktopDownloadModal() {
    initWebDownloadHub();
}

function initWebDownloadHub() {
    try {
        // Check if running inside Electron or Capacitor native app
        const isElectron = typeof window.electronAPI !== 'undefined' && window.electronAPI.isElectron;
        const isCapacitor = typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();

        if (isElectron || isCapacitor) {
            document.body.classList.add(isElectron ? 'is-electron' : 'is-native-app');
            return; // Hides all .web-download-trigger elements in CSS
        }

        const modal = document.getElementById('download-hub-modal') || document.getElementById('desktop-app-modal');
        if (!modal) return;

        // Attach click listeners to all triggers with class .web-download-trigger or ID #download-desktop-btn
        const triggers = document.querySelectorAll('.web-download-trigger, #download-desktop-btn, #web-download-tab, #tile-download');
        triggers.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                modal.classList.add('active');
                document.body.classList.add('desktop-modal-open');
            });
        });

        const closeBtns = modal.querySelectorAll('[data-hub-close], [data-close], .download-hub-close');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                modal.classList.remove('active');
                document.body.classList.remove('desktop-modal-open');
            });
        });

        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                modal.classList.remove('active');
                document.body.classList.remove('desktop-modal-open');
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                modal.classList.remove('active');
                document.body.classList.remove('desktop-modal-open');
            }
        });

        // Dynamically fetch latest release assets from GitHub API
        fetchLatestReleaseAssets();
    } catch (e) {
        console.warn('[ui] initWebDownloadHub error:', e);
    }
}

async function fetchLatestReleaseAssets() {
    try {
        const response = await fetch('https://api.github.com/repos/KamilRemix/SmartStudyHub/releases/latest');
        if (!response.ok) return;

        const data = await response.json();
        const tag = data.tag_name;

        const tagEl = document.getElementById('hub-release-tag');
        if (tagEl && tag) tagEl.textContent = tag;

        const exeAsset = data.assets && data.assets.find(a => a.name.endsWith('.exe'));
        const apkAsset = data.assets && data.assets.find(a => a.name.endsWith('.apk'));

        if (exeAsset) {
            const winBtn = document.getElementById('hub-win-download-btn');
            if (winBtn) {
                winBtn.href = exeAsset.browser_download_url;
                const subtext = winBtn.querySelector('.btn-subtext');
                const sizeMb = (exeAsset.size / (1024 * 1024)).toFixed(1);
                if (subtext) subtext.textContent = `Setup .exe (${sizeMb} МБ) • Win 10/11`;
            }
        }

        if (apkAsset) {
            const apkBtn = document.getElementById('hub-apk-download-btn');
            if (apkBtn) {
                apkBtn.href = apkAsset.browser_download_url;
                const subtext = apkBtn.querySelector('.btn-subtext');
                const sizeMb = (apkAsset.size / (1024 * 1024)).toFixed(1);
                if (subtext) subtext.textContent = `Release .apk (${sizeMb} МБ) • Android 7+`;
            }

            const qrImg = document.getElementById('hub-apk-qr-img');
            if (qrImg) {
                qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(apkAsset.browser_download_url)}&color=ffffff&bgcolor=1e293b`;
            }
        }
    } catch (err) {
        console.warn('[WebDownloadHub] Could not fetch GitHub release details:', err);
    }
}

// --- SAFE SPLASH SCREEN DISMISSAL ---
function hideSplashScreen() {
    try {
        const splash = document.getElementById('app-splash-screen')
            || document.querySelector('.splash-screen')
            || document.querySelector('.loading-screen');
        if (splash) {
            splash.classList.add('fade-out');
            splash.style.opacity = '0';
            splash.style.transition = 'opacity 0.4s ease';
            setTimeout(() => {
                try { splash.remove(); } catch (e) {}
            }, 400);
        }
    } catch (e) {
        console.warn('[ui] hideSplashScreen error:', e);
    }
}

// Export on window for global access across modules
window.tabMap = tabMap;
window.switchToTab = switchToTab;
window.switchToGradesTab = switchToGradesTab;
window.initTabNavigation = initTabNavigation;
window.setTheme = setTheme;
window.getInitialUserLanguage = getInitialUserLanguage;
window.setLanguage = setLanguage;
window.updateTranslations = updateTranslations;
window.updateToolsTranslations = updateToolsTranslations;
window.initDesktopDownloadModal = initDesktopDownloadModal;
window.initWebDownloadHub = initWebDownloadHub;
window.fetchLatestReleaseAssets = fetchLatestReleaseAssets;
window.hideSplashScreen = hideSplashScreen;

// Unconditional fallback auto-dismiss in ui.js
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        hideSplashScreen();
    }, 800);
});
