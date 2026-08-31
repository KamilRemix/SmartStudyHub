/* =========================================================
   public/js/auth.js
   Authentication Module - SmartStudyHub
   Contains: Firebase auth state, sign-in/out, account linking,
   auth dialogs, toast notifications, provider helpers.
   Depends on: translations.js (window.translations),
               js/firebase-init.js (window.firebase),
               js/ui.js (window.currentLang, updateTranslations)
   ========================================================= */

/* ========= ELECTRON DETECTION (hide "Download for PC" in desktop app) ========= */
if (typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().indexOf(' electron/') > -1) {
  document.body.classList.add('is-electron');
}

/* ========= FIREBASE AUTHENTICATION ========= */

let firebaseAuth = null;
let currentUser = null;
/** GitHub profile from last signInWithPopup (login, name, …) */
let lastOAuthProfile = null;

function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/** Label for settings UI — never shows literal "null". */
function getUserDisplayLabel(user, oauthProfile) {
    if (!user) return '';

    const profile = oauthProfile || lastOAuthProfile;
    if (profile) {
        const fromProfile = profile.name || profile.login || profile.screen_name || profile.screenName;
        if (fromProfile) return fromProfile;
    }

    if (user.displayName) return user.displayName;

    const providers = user.providerData || [];
    const github = providers.find((p) => p.providerId === 'github.com');
    if (github) {
        if (github.displayName) return github.displayName;
        if (github.email) return github.email;
    }
    for (const p of providers) {
        if (p.displayName) return p.displayName;
        if (p.email) return p.email;
    }

    if (user.email) return user.email;
    if (user.phoneNumber) return user.phoneNumber;
    return user.uid ? `User ${user.uid.slice(0, 8)}` : 'User';
}

async function syncUserProfileFromProviders(user, oauthProfile) {
    if (!user || user.displayName) return user;

    const label = getUserDisplayLabel(user, oauthProfile);
    if (!label || label.startsWith('User ')) return user;

    try {
        await user.updateProfile({ displayName: label });
        await user.reload();
        return firebaseAuth.currentUser || user;
    } catch (e) {
        console.warn('Could not update displayName:', e);
        return user;
    }
}


function loadGradesForCurrentUser() {
    if (!currentUser) return Promise.resolve();

    return customElements.whenDefined('grade-average-calculator').then(() => {
        const gradeCalc = document.querySelector('grade-average-calculator');
        if (!gradeCalc || typeof gradeCalc.loadFromDatabase !== 'function') {
            return Promise.resolve();
        }

        // We do not await currentUser.getIdToken(true) here anymore because if it fails,
        // it breaks the chain and grades never load. loadFromDatabase does it internally anyway.
        return gradeCalc.loadFromDatabase()
            .then(() => switchToGradesTab())
            .catch((err) => {
                console.error('Failed to load grades after sign-in:', err);
            });
    });
}

async function handleSignedInUser(user, signInResult) {
    lastOAuthProfile = signInResult?.additionalUserInfo?.profile || null;

    if (signInResult?.credential && (signInResult.credential.providerId === 'google.com' || signInResult.credential.signInMethod === 'google.com') && signInResult.credential.accessToken) {
        localStorage.setItem('google_access_token', signInResult.credential.accessToken);
    }

    try {
        await user.reload();
    } catch (e) {
        console.warn('user.reload failed:', e);
    }

    currentUser = firebaseAuth.currentUser || user;
    currentUser = await syncUserProfileFromProviders(currentUser, lastOAuthProfile);
    updateAuthUI();
    updateTranslations();
    await loadGradesForCurrentUser();
}

async function finalizeSignIn(signInResult) {
    const user = signInResult?.user || firebaseAuth?.currentUser;
    if (!user) return;
    await handleSignedInUser(user, signInResult);
}

const VK_AUTH_ENABLED = false; // Temporarily disabled for everyone
const CIS_COUNTRY_CODES = new Set(['RU', 'BY', 'KZ', 'AM', 'AZ', 'KG', 'MD', 'TJ', 'TM', 'UZ']);

let cachedUserRegionProviders = null;

async function getAvailableAuthProviders() {
    if (cachedUserRegionProviders) return cachedUserRegionProviders;

    const baseProviders = ['google.com', 'github.com'];
    let showVk = false;

    if (VK_AUTH_ENABLED) {
        let ipCountry = '';
        try {
            const res = await fetch('https://get.geojs.io/v1/ip/country.json');
            const data = await res.json();
            ipCountry = data.country;
        } catch (e) {
            console.warn('Failed to fetch IP country:', e);
        }
        const isCisIp = ipCountry ? CIS_COUNTRY_CODES.has(ipCountry.toUpperCase()) : false;

        // 1. Android (APK)
        if (window.Capacitor && window.Capacitor.isNativePlatform()) {
            try {
                const AppChannel = window.Capacitor.Plugins?.AppChannel;
                if (AppChannel) {
                    const deviceInfo = await AppChannel.getDeviceInfo();
                    if (deviceInfo.installer === 'ru.vk.store') {
                        showVk = true;
                    } else {
                        const simCountry = (deviceInfo.simCountry || '').toUpperCase();
                        const isCisSim = simCountry ? CIS_COUNTRY_CODES.has(simCountry) : false;
                        const isSystemRu = (deviceInfo.systemLanguage || '').toLowerCase().startsWith('ru');
                        if (isCisSim || isCisIp || isSystemRu) {
                            showVk = true;
                        }
                    }
                } else {
                    if (isCisIp || (navigator.language || '').toLowerCase().startsWith('ru')) showVk = true;
                }
            } catch (e) {
                console.warn('Capacitor AppChannel error:', e);
                if (isCisIp || (navigator.language || '').toLowerCase().startsWith('ru')) showVk = true;
            }
        } 
        // 2. Web & 3. Windows (EXE)
        else {
            const isLangRu = (navigator.language || '').toLowerCase().startsWith('ru');
            if (isCisIp || isLangRu) {
                showVk = true;
            }
        }

        if (showVk) {
            baseProviders.push('oidc.vk-id');
        }
    }

    cachedUserRegionProviders = baseProviders;
    return cachedUserRegionProviders;
}

function getLinkedProviders(user) {
    const ids = new Set((user?.providerData || []).map((p) => p.providerId));
    return {
        hasGoogle: ids.has('google.com'),
        hasGithub: ids.has('github.com'),
        hasVk: ids.has('oidc.vk-id'),
        count: ids.size,
        ids,
    };
}

let pendingLinkProviderId = null;
let pendingConflictProviderId = null;
let authActionInFlight = false;

const AUTH_CONFLICT_CODES = [
    'auth/credential-already-in-use',
    'auth/email-already-in-use',
    'auth/account-exists-with-different-credential',
];

const IGNORABLE_AUTH_ERRORS = [
    'auth/cancelled-popup-request',
    'auth/popup-closed-by-user',
];

function t(key) {
    const lang = (typeof currentLang !== 'undefined' ? currentLang : window.currentLang) || window.currentLanguage || 'ru';
    const dict = (typeof translations !== 'undefined' ? translations : window.translations) || {};
    return (dict[lang] && dict[lang][key]) || (dict.ru && dict.ru[key]) || (dict.en && dict.en[key]) || key;
}

function tpl(key, vars = {}) {
    let text = t(key);
    Object.keys(vars).forEach((name) => {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'gi'), vars[name]);
    });
    return text;
}

function getProviderLabel(providerId) {
    if (providerId === 'oidc.vk-id') return t('providerVk');
    if (providerId === 'github.com') return t('providerGithub');
    if (providerId === 'google.com') return t('providerGoogle');
    if (providerId === 'password' || providerId === 'email') return t('providerEmail') || 'Email / Пароль';
    return providerId;
}

function getProviderCssClass(providerId) {
    if (providerId === 'oidc.vk-id') return 'vk';
    if (providerId === 'github.com') return 'github';
    if (providerId === 'password' || providerId === 'email') return 'email';
    return 'google';
}

function getProviderButtonClass(providerId) {
    if (providerId === 'oidc.vk-id') return 'vk-signin-btn';
    if (providerId === 'github.com') return 'github-signin-btn';
    return 'google-signin-btn';
}

function getLinkButtonId(providerId) {
    if (providerId === 'oidc.vk-id') return 'link-vk-btn';
    if (providerId === 'github.com') return 'link-github-btn';
    return 'link-google-btn';
}

function getSignInButtonId(providerId) {
    if (providerId === 'oidc.vk-id') return 'vk-signin-btn';
    if (providerId === 'github.com') return 'github-signin-btn';
    return 'google-signin-btn';
}

function getLinkLabelKey(providerId) {
    if (providerId === 'oidc.vk-id') return 'linkVkToProfile';
    if (providerId === 'github.com') return 'linkGithubToProfile';
    return 'linkGoogleToProfile';
}

function getSignInLabelKey(providerId) {
    if (providerId === 'oidc.vk-id') return 'signInWithVk';
    if (providerId === 'github.com') return 'signInWithGithub';
    return 'signInWithGoogle';
}

function getCurrentProviderId(user) {
    if (!user?.providerData?.length) return 'google.com';
    return user.providerData[0].providerId;
}

function createAuthProvider(providerId) {
    if (providerId === 'oidc.vk-id') {
        const provider = new firebase.auth.OAuthProvider('oidc.vk-id');
        provider.setCustomParameters({
            prompt: 'login'
        });
        return provider;
    }
    if (providerId === 'github.com') {
        const provider = new firebase.auth.GithubAuthProvider();
        provider.addScope('read:user');
        provider.setCustomParameters({
            prompt: 'consent',
            allow_signup: 'true'
        });
        return provider;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    return provider;
}

function isIgnorableAuthError(error) {
    return Boolean(error && IGNORABLE_AUTH_ERRORS.includes(error.code));
}

function materialIcon(name, extraClasses = '') {
    const classes = ['material-symbols-outlined', extraClasses].filter(Boolean).join(' ');
    return `<span class="${classes}">${name}</span>`;
}

function getProviderIconSvg(providerId, iconClass = 'auth-flow-icon-svg') {
    if (providerId === 'password' || providerId === 'email') {
        return `<svg class="${iconClass}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>`;
    }
    if (providerId === 'oidc.vk-id') {
        return `<svg class="${iconClass}" viewBox="0 0 24 24" aria-hidden="true"><path fill="#0077FF" d="M15.684 0H8.316C2.692 0 0 2.692 0 8.316v7.368C0 21.308 2.692 24 8.316 24h7.368C21.308 24 24 21.308 24 15.684V8.316C24 2.692 21.308 0 15.684 0zm3.692 17.129h-1.644c-.624 0-.816-.496-1.936-1.616-1.024-1.008-1.472-1.136-1.728-1.136-.368 0-.48.104-.48.608v1.44c0 .4-.128.656-1.184.656-1.744 0-3.68-1.056-5.04-3.024-2.048-2.928-2.608-5.12-2.608-5.568 0-.24.096-.464.56-.464h1.644c.416 0 .576.192.736.64.8 2.32 2.144 4.352 2.688 4.352.208 0 .304-.096.304-.624V9.825c-.064-1.12-.656-1.216-.656-1.616 0-.192.16-.384.416-.384h2.576c.352 0 .48.176.48.592v3.184c0 .352.16.48.272.48.208 0 .384-.128.768-.512 1.184-1.328 2.032-3.376 2.032-3.376.112-.24.288-.384.704-.384h1.644c.496 0 .608.256.496.608-.208.976-2.256 3.872-2.256 3.872-.192.304-.272.448 0 .8.192.256.848.832 1.28 1.328.784.896 1.392 1.648 1.552 2.176.176.496-.08.752-.576.752z"/></svg>`;
    }
    if (providerId === 'github.com') {
        return `<svg class="${iconClass}" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`;
    }
    return `<svg class="${iconClass}" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`;
}


function paintAuthFlowDiagram(containerId, fromProviderId, toProviderId, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const isConflict = Boolean(options.conflict);
    const fromClass = options.fromClass || 'auth-flow-node--current';
    const toClass = isConflict ? 'auth-flow-node--conflict' : 'auth-flow-node--target';

    container.innerHTML = `
        <div class="auth-flow-track">
            <div class="auth-flow-node ${fromClass}">
                <div class="auth-flow-icon auth-flow-icon--${getProviderCssClass(fromProviderId)}">
                    ${getProviderIconSvg(fromProviderId)}
                </div>
                <span class="auth-flow-label">${escapeHtml(getProviderLabel(fromProviderId))}</span>
                <span class="auth-flow-badge">${escapeHtml(t('authFlowNow'))}</span>
            </div>
            <div class="auth-flow-arrow" aria-hidden="true">
                <span class="auth-flow-arrow-line"></span>
                <span class="auth-flow-arrow-head">➜</span>
            </div>
            <div class="auth-flow-node ${toClass}">
                <div class="auth-flow-icon auth-flow-icon--${getProviderCssClass(toProviderId)}">
                    ${getProviderIconSvg(toProviderId)}
                </div>
                <span class="auth-flow-label">${escapeHtml(getProviderLabel(toProviderId))}</span>
                <span class="auth-flow-badge">${escapeHtml(t('authFlowConnect'))}</span>
            </div>
        </div>`;
    container.setAttribute('aria-hidden', 'false');
}

function setAuthButtonLoading(button, loading) {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    button.setAttribute('aria-busy', loading ? 'true' : 'false');
}

let authActionTimeout = null;

function runAuthAction(button, actionFn) {
    if (authActionInFlight) return Promise.resolve();
    authActionInFlight = true;
    setAuthButtonLoading(button, true);

    if (authActionTimeout) clearTimeout(authActionTimeout);
    authActionTimeout = setTimeout(() => {
        authActionInFlight = false;
        setAuthButtonLoading(button, false);
        console.warn('[Auth] Auth action timed out and was forcefully unlocked.');
    }, 60000);

    return Promise.resolve()
        .then(actionFn)
        .catch((error) => {
            if (isIgnorableAuthError(error)) return;
            throw error;
        })
        .finally(() => {
            authActionInFlight = false;
            setAuthButtonLoading(button, false);
            if (authActionTimeout) clearTimeout(authActionTimeout);
        });
}

function setDialogOpen(modalId, isOpen) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.toggle('open', isOpen);
    modal.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    const anyOpen = document.querySelector('.app-dialog-modal.open');
    document.body.classList.toggle('app-dialog-open', Boolean(anyOpen));
}

let genericDialogResolver = null;

function getGenericDialogElements() {
    return {
        modal: document.getElementById('app-generic-modal'),
        title: document.getElementById('app-generic-modal-title'),
        body: document.getElementById('app-generic-modal-body'),
        input: document.getElementById('app-generic-modal-input'),
        accept: document.getElementById('app-generic-modal-accept'),
        cancel: document.getElementById('app-generic-modal-cancel'),
    };
}

function closeAppGenericModal(result = false) {
    const { modal } = getGenericDialogElements();
    if (!modal || !modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    const anyOpen = document.querySelector('.app-dialog-modal.open');
    document.body.classList.toggle('app-dialog-open', Boolean(anyOpen));
    if (genericDialogResolver) {
        genericDialogResolver(result);
        genericDialogResolver = null;
    }
}

function openAppDialog({
    title = '',
    message = '',
    showInput = false,
    placeholder = '',
    inputValue = '',
    acceptLabel = t('accountErrorOk') || 'OK',
    cancelLabel = t('cancel') || 'Cancel',
    showCancel = false,
    acceptValue = true,
    cancelValue = false,
}) {
    const { modal, title: titleEl, body, input, accept, cancel } = getGenericDialogElements();
    if (!modal || !titleEl || !body || !accept || !cancel) {
        return Promise.resolve(false);
    }

    titleEl.textContent = title;
    body.textContent = message;

    if (showInput && input) {
        input.style.display = 'block';
        input.value = inputValue;
        input.placeholder = placeholder;
        setTimeout(() => {
            input.focus();
            input.select();
        }, 0);
    } else if (input) {
        input.style.display = 'none';
        input.value = '';
    }

    accept.textContent = acceptLabel;
    cancel.textContent = cancelLabel;
    cancel.style.display = showCancel ? 'inline-flex' : 'none';

    const cleanup = () => {
        accept.onclick = null;
        cancel.onclick = null;
        if (input) {
            input.onkeydown = null;
        }
    };

    genericDialogResolver = null;
    return new Promise((resolve) => {
        genericDialogResolver = resolve;

        accept.onclick = () => {
            const value = showInput && input ? input.value : acceptValue;
            cleanup();
            closeAppGenericModal(value);
        };

        cancel.onclick = () => {
            cleanup();
            closeAppGenericModal(cancelValue);
        };

        if (input) {
            input.onkeydown = (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    accept.click();
                } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancel.click();
                }
            };
        }

        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('app-dialog-open');
    });
}

function showAppAlert(message, title = t('accountErrorModalTitle') || 'Notice') {
    return openAppDialog({
        title,
        message,
        showInput: false,
        showCancel: false,
        acceptLabel: t('accountErrorOk') || 'OK',
    });
}

function showAppConfirm(message, title = t('accountConflictModalTitle') || 'Confirm', confirmLabel = t('apply') || 'OK') {
    return openAppDialog({
        title,
        message,
        showInput: false,
        showCancel: true,
        acceptLabel: confirmLabel,
        cancelLabel: t('cancel') || 'Cancel',
        acceptValue: true,
        cancelValue: false,
    });
}

function showAppPrompt(message, title = t('simulateGrade') || 'Input', placeholder = '') {
    return openAppDialog({
        title,
        message,
        showInput: true,
        placeholder,
        showCancel: true,
        acceptLabel: t('apply') || 'Apply',
        cancelLabel: t('cancel') || 'Cancel',
        acceptValue: null,
        cancelValue: null,
    });
};

function showToast(message, type = 'info', durationMs = 3000) {
    const container = document.getElementById('app-toast-container');
    if (!container || !message) return;

    let iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    if (type === 'success') {
        iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
    } else if (type === 'error') {
        iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    } else if (type === 'warning') {
        iconSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    }

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
        <span class="app-toast-icon" aria-hidden="true">${iconSvg}</span>
        <span class="app-toast-message">${message}</span>
    `;
    container.appendChild(toast);

    requestAnimationFrame(() => {
        requestAnimationFrame(() => toast.classList.add('is-visible'));
    });

    const hide = () => {
        toast.classList.remove('is-visible');
        toast.classList.add('is-hiding');
        setTimeout(() => toast.remove(), 360);
    };

    const timer = setTimeout(hide, durationMs);
    toast.addEventListener('click', () => {
        clearTimeout(timer);
        hide();
    });
}
window.showToast = showToast;

function updateAuthDialogTexts() {
    const linkTitle = document.getElementById('account-link-modal-title');
    const linkMsg = document.getElementById('account-link-message');
    const linkConfirm = document.getElementById('account-link-confirm-btn');
    const linkCancel = document.getElementById('account-link-cancel-btn');
    if (linkTitle) linkTitle.textContent = t('accountLinkModalTitle');
    if (linkMsg && pendingLinkProviderId) {
        linkMsg.textContent = tpl('accountLinkMergeQuestion', {
            provider: getProviderLabel(pendingLinkProviderId),
        });
    }
    if (linkConfirm) linkConfirm.textContent = t('accountLinkMergeYes');
    if (linkCancel) linkCancel.textContent = t('accountLinkMergeNo');

    const conflictTitle = document.getElementById('account-conflict-modal-title');
    const conflictMsg = document.getElementById('account-conflict-message');
    const conflictSwitch = document.getElementById('account-conflict-switch-btn');
    const conflictStay = document.getElementById('account-conflict-cancel-btn');
    if (conflictTitle) conflictTitle.textContent = t('accountConflictModalTitle');
    if (conflictMsg && pendingConflictProviderId) {
        conflictMsg.textContent = tpl('accountConflictMessage', {
            provider: getProviderLabel(pendingConflictProviderId),
        });
    }
    if (conflictSwitch) conflictSwitch.textContent = t('accountConflictSwitch');
    if (conflictStay) conflictStay.textContent = t('accountConflictStay');

    const errorTitle = document.getElementById('account-error-modal-title');
    const errorOk = document.getElementById('account-error-ok-btn');
    if (errorTitle) errorTitle.textContent = t('accountErrorModalTitle');
    if (errorOk) errorOk.textContent = t('accountErrorOk');

    if (pendingLinkProviderId && currentUser) {
        paintAuthFlowDiagram('account-link-flow', getCurrentProviderId(currentUser), pendingLinkProviderId);
    }
    if (pendingConflictProviderId && currentUser) {
        paintAuthFlowDiagram('account-conflict-flow', getCurrentProviderId(currentUser), pendingConflictProviderId, {
            conflict: true,
        });
    }
}

function openAccountLinkModal(providerId) {
    pendingLinkProviderId = providerId;
    if (currentUser) {
        paintAuthFlowDiagram('account-link-flow', getCurrentProviderId(currentUser), providerId);
    }
    updateAuthDialogTexts();
    setDialogOpen('account-link-modal', true);
}

function closeAccountLinkModal() {
    setDialogOpen('account-link-modal', false);
    pendingLinkProviderId = null;
}

function openAccountConflictModal(providerId) {
    pendingConflictProviderId = providerId;
    if (currentUser) {
        paintAuthFlowDiagram('account-conflict-flow', getCurrentProviderId(currentUser), providerId, {
            conflict: true,
        });
    }
    updateAuthDialogTexts();
    setDialogOpen('account-conflict-modal', true);
}

function closeAccountConflictModal() {
    setDialogOpen('account-conflict-modal', false);
    pendingConflictProviderId = null;
}

function openAccountErrorModal(message) {
    const errorMsg = document.getElementById('account-error-message');
    if (errorMsg) errorMsg.textContent = message || t('accountLinkError');
    updateAuthDialogTexts();
    setDialogOpen('account-error-modal', true);
}

function closeAccountErrorModal() {
    setDialogOpen('account-error-modal', false);
}

function closeTopAuthDialog() {
    if (document.getElementById('app-generic-modal')?.classList.contains('open')) {
        closeAppGenericModal(false);
        return;
    }
    if (document.getElementById('account-error-modal')?.classList.contains('open')) {
        closeAccountErrorModal();
        return;
    }
    if (document.getElementById('account-conflict-modal')?.classList.contains('open')) {
        closeAccountConflictModal();
        return;
    }
    if (document.getElementById('account-link-modal')?.classList.contains('open')) {
        closeAccountLinkModal();
    }
}

function buildProviderActionButton(providerId, mode) {
    const isLink = mode === 'link';
    const btnClass = getProviderButtonClass(providerId);
    const btnId = isLink ? getLinkButtonId(providerId) : getSignInButtonId(providerId);
    const label = escapeHtml(t(isLink ? getLinkLabelKey(providerId) : getSignInLabelKey(providerId)));
    return `
        <button class="${btnClass} auth-action-btn" id="${btnId}" type="button" data-provider="${providerId}">
            ${getProviderIconSvg(providerId, 'auth-btn-icon-svg')}
            <span class="auth-btn-label">${label}</span>
        </button>`;
}

function buildLinkedProviderRow(providerId, canUnlink) {
    const unlinkBtn = canUnlink
        ? `<button type="button" class="unlink-provider-btn auth-action-btn" data-unlink-provider="${providerId}">${escapeHtml(t('unlinkProvider'))}</button>`
        : '';
    return `
        <div class="linked-provider-row">
            <div class="linked-provider-info">
                <span class="linked-provider-icon linked-provider-icon--${getProviderCssClass(providerId)}">
                    ${getProviderIconSvg(providerId, 'linked-provider-icon-svg')}
                </span>
                <span class="linked-provider-name">${escapeHtml(getProviderLabel(providerId))}</span>
            </div>
            ${unlinkBtn}
        </div>`;
}

let currentAuthTab = 'signin';
let lastTypedEmail = '';

function getFirebaseErrorMessage(error) {
    if (!error) return t('authErrorGeneric');
    const code = error.code || '';
    switch (code) {
        case 'auth/invalid-email':
            return t('authErrorInvalidEmail');
        case 'auth/user-disabled':
            return t('authErrorUserDisabled');
        case 'auth/user-not-found':
            return t('authErrorUserNotFound');
        case 'auth/wrong-password':
            return t('authErrorWrongPassword');
        case 'auth/invalid-credential':
        case 'auth/invalid-login-credentials':
            return t('authErrorInvalidCredential');
        case 'auth/email-already-in-use':
            return t('authErrorEmailAlreadyInUse');
        case 'auth/weak-password':
            return t('authErrorWeakPassword');
        case 'auth/operation-not-allowed':
            return t('authErrorOperationNotAllowed');
        case 'auth/too-many-requests':
            return t('authErrorTooManyRequests');
        case 'auth/network-request-failed':
            return t('authErrorNetworkFailed');
        case 'auth/missing-email':
        case 'auth/missing-password':
            return t('authErrorEmptyFields');
        default:
            return error.message || t('authErrorGeneric');
    }
}

function showAuthFormFeedback(message, type = 'error') {
    const settingsComponent = document.querySelector('settings-component');
    if (!settingsComponent || !settingsComponent.shadowRoot) return;
    const feedbackEl = settingsComponent.shadowRoot.querySelector('#auth-form-feedback');
    if (!feedbackEl) return;
    feedbackEl.textContent = message;
    feedbackEl.className = `auth-form-feedback auth-form-feedback--${type}`;
    feedbackEl.style.display = 'block';
}

function clearAuthFormFeedback() {
    const settingsComponent = document.querySelector('settings-component');
    if (!settingsComponent || !settingsComponent.shadowRoot) return;
    const feedbackEl = settingsComponent.shadowRoot.querySelector('#auth-form-feedback');
    if (!feedbackEl) return;
    feedbackEl.textContent = '';
    feedbackEl.style.display = 'none';
}

async function handleEmailSignIn(email, password, submitBtn) {
    if (!email || !password) {
        showToast(t('authErrorEmptyFields'), 'warning', 3000);
        showAuthFormFeedback(t('authErrorEmptyFields'), 'error');
        return;
    }

    return runAuthAction(submitBtn, async () => {
        try {
            clearAuthFormFeedback();
            const authInstance = firebaseAuth || window.auth || (window.firebase && window.firebase.auth ? window.firebase.auth() : null);
            const userCredential = await (window.signInWithEmailAndPassword
                ? window.signInWithEmailAndPassword(authInstance, email.trim(), password)
                : authInstance.signInWithEmailAndPassword(email.trim(), password));

            const user = userCredential.user || authInstance.currentUser;
            const userName = getUserDisplayLabel(user);
            showToast(tpl('authWelcomeUser', { name: userName }), 'success', 3000);
            await finalizeSignIn(userCredential);
        } catch (error) {
            console.error('[Auth] Email sign in error:', error);
            const msg = getFirebaseErrorMessage(error);
            showAuthFormFeedback(msg, 'error');
            showToast(msg, 'error', 3500);
        }
    });
}

async function handleEmailSignUp(email, password, confirmPassword, submitBtn) {
    if (!email || !password) {
        showToast(t('authErrorEmptyFields'), 'warning', 3000);
        showAuthFormFeedback(t('authErrorEmptyFields'), 'error');
        return;
    }

    if (password.length < 6) {
        showToast(t('authErrorWeakPassword'), 'warning', 3000);
        showAuthFormFeedback(t('authErrorWeakPassword'), 'error');
        return;
    }

    if (confirmPassword !== undefined && password !== confirmPassword) {
        showToast(t('authErrorPasswordMismatch'), 'warning', 3000);
        showAuthFormFeedback(t('authErrorPasswordMismatch'), 'error');
        return;
    }

    return runAuthAction(submitBtn, async () => {
        try {
            clearAuthFormFeedback();
            const authInstance = firebaseAuth || window.auth || (window.firebase && window.firebase.auth ? window.firebase.auth() : null);
            const userCredential = await (window.createUserWithEmailAndPassword
                ? window.createUserWithEmailAndPassword(authInstance, email.trim(), password)
                : authInstance.createUserWithEmailAndPassword(email.trim(), password));

            const user = userCredential.user || authInstance.currentUser;
            if (user && !user.displayName) {
                const defaultName = email.split('@')[0];
                try {
                    await user.updateProfile({ displayName: defaultName });
                    await user.reload();
                } catch (e) {
                    console.warn('[Auth] Error setting default displayName:', e);
                }
            }

            showToast(t('authSignUpSuccess'), 'success', 3000);
            await finalizeSignIn(userCredential);
        } catch (error) {
            console.error('[Auth] Email sign up error:', error);
            const msg = getFirebaseErrorMessage(error);
            showAuthFormFeedback(msg, 'error');
            showToast(msg, 'error', 3500);
        }
    });
}

async function handleForgotPassword(initialEmail = '') {
    const promptText = t('authResetPasswordPrompt') || 'Введите ваш Email для сброса пароля:';
    const email = await showAppPrompt(promptText, t('authResetPasswordTitle') || 'Сброс пароля', initialEmail || '');
    if (!email) return;

    try {
        const authInstance = firebaseAuth || window.auth || (window.firebase && window.firebase.auth ? window.firebase.auth() : null);
        if (window.sendPasswordResetEmail) {
            await window.sendPasswordResetEmail(authInstance, email.trim());
        } else if (authInstance && typeof authInstance.sendPasswordResetEmail === 'function') {
            await authInstance.sendPasswordResetEmail(email.trim());
        }
        showToast(t('authResetEmailSent'), 'success', 4000);
    } catch (error) {
        console.error('[Auth] Password reset error:', error);
        const msg = getFirebaseErrorMessage(error);
        showToast(msg, 'error', 3500);
    }
}

function renderAuthFormHtml(availableProviders, currentTab = 'signin') {
    const isSignIn = currentTab === 'signin';
    const emailLabel = escapeHtml(t('authEmailLabel') || 'Email');
    const passwordLabel = escapeHtml(t('authPasswordLabel') || 'Пароль');
    const confirmPasswordLabel = escapeHtml(t('authConfirmPasswordLabel') || 'Повторите пароль');
    const emailPlaceholder = escapeHtml(t('authEmailPlaceholder') || 'name@example.com');
    const passwordPlaceholder = escapeHtml(t('authPasswordPlaceholder') || 'Минимум 6 символов');
    const confirmPasswordPlaceholder = escapeHtml(t('authConfirmPasswordPlaceholder') || 'Повторите ваш пароль');
    const forgotPasswordText = escapeHtml(t('authForgotPasswordLink') || 'Забыли пароль?');
    const submitText = escapeHtml(t(isSignIn ? 'authSignInBtn' : 'authSignUpBtn') || (isSignIn ? 'Войти' : 'Создать аккаунт'));
    const orContinueWith = escapeHtml(t('authOrContinueWith') || 'или через соцсети');
    const tabSignInText = escapeHtml(t('authTabsSignIn') || 'Вход');
    const tabSignUpText = escapeHtml(t('authTabsSignUp') || 'Регистрация');

    const socialButtonsHtml = availableProviders.map((id) => buildProviderActionButton(id, 'signin')).join('');

    return `
        <div class="auth-box">
            <!-- Tabs Switcher -->
            <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
                <button type="button" class="auth-tab-btn ${isSignIn ? 'active' : ''}" id="auth-tab-signin" data-auth-tab="signin" role="tab" aria-selected="${isSignIn}">
                    <svg class="auth-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                        <polyline points="10 17 15 12 10 7"></polyline>
                        <line x1="15" y1="12" x2="3" y2="12"></line>
                    </svg>
                    <span>${tabSignInText}</span>
                </button>
                <button type="button" class="auth-tab-btn ${!isSignIn ? 'active' : ''}" id="auth-tab-signup" data-auth-tab="signup" role="tab" aria-selected="${!isSignIn}">
                    <svg class="auth-tab-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="23" y1="11" x2="17" y2="11"></line>
                    </svg>
                    <span>${tabSignUpText}</span>
                </button>
            </div>

            <!-- Email & Password Form -->
            <form id="auth-email-form" class="auth-email-form" novalidate autocomplete="on">
                <div id="auth-form-feedback" class="auth-form-feedback" style="display: none;" role="alert"></div>

                <!-- Email Input -->
                <div class="auth-input-group">
                    <label for="auth-email-input" class="auth-input-label">${emailLabel}</label>
                    <div class="auth-input-wrapper">
                        <span class="auth-input-icon" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        </span>
                        <input type="email" id="auth-email-input" name="email" class="auth-text-input" placeholder="${emailPlaceholder}" autocomplete="username" inputmode="email" required />
                    </div>
                </div>

                <!-- Password Input -->
                <div class="auth-input-group">
                    <div class="auth-label-row">
                        <label for="auth-password-input" class="auth-input-label">${passwordLabel}</label>
                        ${isSignIn ? `<button type="button" class="auth-forgot-link" id="auth-forgot-btn">${forgotPasswordText}</button>` : ''}
                    </div>
                    <div class="auth-input-wrapper">
                        <span class="auth-input-icon" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </span>
                        <input type="password" id="auth-password-input" name="password" class="auth-text-input" placeholder="${passwordPlaceholder}" autocomplete="${isSignIn ? 'current-password' : 'new-password'}" required />
                        <button type="button" class="auth-toggle-pwd-btn" id="auth-toggle-pwd" aria-label="Toggle password visibility" title="Показать/скрыть пароль">
                            <svg class="pwd-eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            <svg class="pwd-eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        </button>
                    </div>
                </div>

                <!-- Confirm Password (Registration Only) -->
                ${!isSignIn ? `
                <div class="auth-input-group auth-confirm-password-group" id="auth-confirm-password-group">
                    <label for="auth-confirm-password-input" class="auth-input-label">${confirmPasswordLabel}</label>
                    <div class="auth-input-wrapper">
                        <span class="auth-input-icon" aria-hidden="true">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </span>
                        <input type="password" id="auth-confirm-password-input" name="confirm-password" class="auth-text-input" placeholder="${confirmPasswordPlaceholder}" autocomplete="new-password" required />
                        <button type="button" class="auth-toggle-pwd-btn" id="auth-toggle-confirm-pwd" aria-label="Toggle password visibility" title="Показать/скрыть пароль">
                            <svg class="pwd-eye-open" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            <svg class="pwd-eye-closed" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: none;"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        </button>
                    </div>
                </div>` : ''}

                <!-- Primary Submit Button -->
                <button type="submit" class="auth-submit-btn" id="auth-submit-btn">
                    <span class="auth-submit-text">${submitText}</span>
                    <svg class="auth-submit-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
            </form>

            <!-- Social Providers Divider -->
            ${socialButtonsHtml ? `
            <div class="auth-divider">
                <span class="auth-divider-line"></span>
                <span class="auth-divider-text">${orContinueWith}</span>
                <span class="auth-divider-line"></span>
            </div>

            <!-- Social Buttons Stack -->
            <div class="auth-social-stack">
                ${socialButtonsHtml}
            </div>` : ''}
        </div>
    `;
}

function bindAuthContentActions(authContent) {
    // 1. Auth tabs switcher
    authContent.querySelectorAll('[data-auth-tab]').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
            const tab = tabBtn.getAttribute('data-auth-tab');
            if (tab && tab !== currentAuthTab) {
                const emailInput = authContent.querySelector('#auth-email-input');
                if (emailInput && emailInput.value) {
                    lastTypedEmail = emailInput.value;
                }
                currentAuthTab = tab;
                updateAuthUI();
                const newEmailInput = authContent.querySelector('#auth-email-input');
                if (newEmailInput && lastTypedEmail) {
                    newEmailInput.value = lastTypedEmail;
                }
            }
        });
    });

    // 2. Password visibility toggles
    const setupPwdToggle = (toggleBtnId, inputId) => {
        const toggleBtn = authContent.querySelector('#' + toggleBtnId);
        const input = authContent.querySelector('#' + inputId);
        if (toggleBtn && input) {
            toggleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const isPwd = input.type === 'password';
                input.type = isPwd ? 'text' : 'password';
                const eyeOpen = toggleBtn.querySelector('.pwd-eye-open');
                const eyeClosed = toggleBtn.querySelector('.pwd-eye-closed');
                if (eyeOpen && eyeClosed) {
                    eyeOpen.style.display = isPwd ? 'none' : 'block';
                    eyeClosed.style.display = isPwd ? 'block' : 'none';
                }
            });
        }
    };
    setupPwdToggle('auth-toggle-pwd', 'auth-password-input');
    setupPwdToggle('auth-toggle-confirm-pwd', 'auth-confirm-password-input');

    // 3. Forgot password button
    const forgotBtn = authContent.querySelector('#auth-forgot-btn');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const emailInput = authContent.querySelector('#auth-email-input');
            handleForgotPassword(emailInput ? emailInput.value : '');
        });
    }

    // 4. Form submission
    const form = authContent.querySelector('#auth-email-form');
    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            if (authActionInFlight) return;

            const emailInput = authContent.querySelector('#auth-email-input');
            const passwordInput = authContent.querySelector('#auth-password-input');
            const confirmInput = authContent.querySelector('#auth-confirm-password-input');
            const submitBtn = authContent.querySelector('#auth-submit-btn');

            const email = emailInput ? emailInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value : '';
            const confirmPassword = confirmInput ? confirmInput.value : undefined;

            if (currentAuthTab === 'signup') {
                handleEmailSignUp(email, password, confirmPassword, submitBtn);
            } else {
                handleEmailSignIn(email, password, submitBtn);
            }
        });
    }

    // 5. Social providers
    authContent.querySelectorAll('[data-provider]').forEach((btn) => {
        const providerId = btn.getAttribute('data-provider');
        if (!providerId) return;
        if (btn.id.startsWith('link-')) {
            btn.addEventListener('click', () => {
                if (authActionInFlight) return;
                window.requestAccountLink(providerId, btn);
            });
        } else {
            btn.addEventListener('click', () => window.signInWithProvider(providerId, btn));
        }
    });

    // 6. Unlink buttons
    authContent.querySelectorAll('[data-unlink-provider]').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (authActionInFlight) return;
            window.unlinkAuthProvider(btn.getAttribute('data-unlink-provider'), btn);
        });
    });

    // 7. Sign out button
    const signoutBtn = authContent.querySelector('#signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', window.signOutUser);
    }
}

window.handleEmailSignIn = handleEmailSignIn;
window.handleEmailSignUp = handleEmailSignUp;
window.handleForgotPassword = handleForgotPassword;

window.requestAccountLink = (providerId) => {
    if (!currentUser || !firebaseAuth) return;
    if (authActionInFlight) return;

    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.isElectron) {
        showToast(t('accountLinkElectronUnsupported'), 'warning', 3000);
        return;
    }

    const linked = getLinkedProviders(currentUser);
    if (linked.ids.has(providerId)) return;

    openAccountLinkModal(providerId);
};

window.performAccountLink = () => {
    const providerId = pendingLinkProviderId;
    if (!providerId || !currentUser) return;

    const confirmBtn = document.getElementById('account-link-confirm-btn');
    const provider = createAuthProvider(providerId);

    runAuthAction(confirmBtn, () =>
        currentUser.linkWithPopup(provider)
            .then(async (result) => {
                console.log('Account linked:', result);
                closeAccountLinkModal();
                await currentUser.reload();
                currentUser = firebaseAuth.currentUser;
                updateAuthUI();
                updateTranslations();
                showToast(t('accountLinkSuccess'), 'success', 3000);
            })
            .catch((error) => {
                console.error('Account link error:', error);
                if (isIgnorableAuthError(error)) return;
                closeAccountLinkModal();
                if (AUTH_CONFLICT_CODES.includes(error.code)) {
                    openAccountConflictModal(providerId);
                    return;
                }
                if (error.code === 'auth/provider-already-linked') {
                    showToast(t('accountLinkProviderAlreadyLinked'), 'info', 3000);
                    return;
                }
                openAccountErrorModal(error.message || t('accountLinkError'));
            })
    );
};

window.unlinkAuthProvider = (providerId, button) => {
    if (!currentUser || !firebaseAuth || !providerId) return;

    const providers = currentUser.providerData || [];
    if (providers.length < 2) {
        showToast(t('accountUnlinkNeedOne'), 'warning', 3000);
        return;
    }

    runAuthAction(button, () =>
        currentUser.unlink(providerId)
            .then(async () => {
                await currentUser.reload();
                currentUser = firebaseAuth.currentUser;
                updateAuthUI();
                updateTranslations();
                showToast(t('accountUnlinkSuccess'), 'success', 3000);
            })
            .catch((error) => {
                console.error('Unlink error:', error);
                if (isIgnorableAuthError(error)) return;
                showToast(error.message || t('accountLinkError'), 'error', 3000);
            })
    );
};

window.switchToConflictAccount = () => {
    const providerId = pendingConflictProviderId;
    if (!providerId || !firebaseAuth) return;

    const switchBtn = document.getElementById('account-conflict-switch-btn');
    runAuthAction(switchBtn, async () => {
        closeAccountConflictModal();
        const gradeCalc = document.querySelector('grade-average-calculator');
        if (gradeCalc && currentUser && typeof gradeCalc.saveToDatabase === 'function') {
            gradeCalc.saveToDatabase();
        }
        await firebaseAuth.signOut();
        const signInBtn = document.getElementById(getSignInButtonId(providerId));
        await window.signInWithProvider(providerId, signInBtn);
    }).catch((error) => {
        if (isIgnorableAuthError(error)) return;
        console.error('Switch account error:', error);
        showToast(t('accountLinkError'), 'error', 3000);
    });
};

window.signInWithProvider = (providerId, triggerOrRetry = 0) => {
    const retryCount = typeof triggerOrRetry === 'number' ? triggerOrRetry : 0;
    const button = triggerOrRetry instanceof HTMLElement ? triggerOrRetry : null;

    if (providerId === 'oidc.vk-id' || providerId === 'vk') {
        return window.signInWithVk(button);
    }

    if (!firebase || !firebase.apps.length) {
        if (retryCount < 5) {
            setTimeout(() => window.signInWithProvider(providerId, retryCount + 1), 100);
        } else {
            showToast(t('accountLinkError'), 'error', 3000);
        }
        return Promise.resolve();
    }

    if (!firebaseAuth) {
        firebaseAuth = firebase.auth();
    }

    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.isElectron) {
        if (providerId === 'google.com') {
            window.electronAPI.send('google-signin');
        } else if (providerId === 'github.com') {
            window.electronAPI.send('github-signin');
        } else if (providerId === 'oidc.vk-id' || providerId === 'vk') {
            return window.signInWithVk(button);
        } else {
            showToast(t('accountLinkElectronUnsupported'), 'warning', 3000);
        }
        return Promise.resolve();
    }

    // Native Capacitor auth is skipped to use Web SDK for the correct Firebase project


    const provider = createAuthProvider(providerId);
    return runAuthAction(button, () =>
        firebaseAuth.signInWithPopup(provider)
            .then((result) => finalizeSignIn(result))
            .catch((error) => {
                console.error('Sign-in error:', error);
                if (isIgnorableAuthError(error)) return;
                showToast(error.message || t('accountLinkError'), 'error', 3000);
            })
    );
};

function initAuthDialogs() {
    const linkModal = document.getElementById('account-link-modal');
    const conflictModal = document.getElementById('account-conflict-modal');
    const errorModal = document.getElementById('account-error-modal');

    document.getElementById('account-link-confirm-btn')
        ?.addEventListener('click', window.performAccountLink);
    document.getElementById('account-link-cancel-btn')
        ?.addEventListener('click', closeAccountLinkModal);

    document.getElementById('account-conflict-switch-btn')
        ?.addEventListener('click', window.switchToConflictAccount);
    document.getElementById('account-conflict-cancel-btn')
        ?.addEventListener('click', closeAccountConflictModal);

    document.getElementById('account-error-ok-btn')
        ?.addEventListener('click', closeAccountErrorModal);

    document.querySelectorAll('[data-dialog-close]').forEach((btn) => {
        btn.addEventListener('click', () => {
            const target = btn.getAttribute('data-dialog-close');
            if (target === 'account-link') closeAccountLinkModal();
            else if (target === 'account-conflict') closeAccountConflictModal();
            else if (target === 'account-error') closeAccountErrorModal();
            else if (target === 'app-generic') closeAppGenericModal(false);
        });
    });

    [linkModal, conflictModal, errorModal].forEach((modal) => {
        if (!modal) return;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                if (modal.id === 'account-link-modal') closeAccountLinkModal();
                else if (modal.id === 'account-conflict-modal') closeAccountConflictModal();
                else if (modal.id === 'account-error-modal') closeAccountErrorModal();
            }
        });
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && document.querySelector('.app-dialog-modal.open')) {
            closeTopAuthDialog();
        }
    });

    updateAuthDialogTexts();
}

if (window.firebase && window.firebase.auth) {
    firebaseAuth = window.firebase.auth();

    firebaseAuth.onAuthStateChanged((user) => {
        const savedVK = localStorage.getItem('ssh_vk_user');
        if (savedVK) {
            try {
                const vkUser = JSON.parse(savedVK);
                if (vkUser && vkUser.uid) {
                    currentUser = vkUser;
                    window.currentUser = vkUser;
                    updateAuthUI();
                    updateTranslations();
                    const gradeCalc = document.querySelector('grade-average-calculator');
                    if (gradeCalc && typeof gradeCalc.loadFromDatabase === 'function') {
                        gradeCalc.loadFromDatabase();
                    }
                    return;
                }
            } catch (e) {}
        }

        currentUser = user;
        if (!user) {
            lastOAuthProfile = null;
            updateAuthUI();
            updateTranslations();
            return;
        }

        updateAuthUI();
        updateTranslations();
        handleSignedInUser(user, null);
    });

    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        setTimeout(() => {
            const FirebaseAuthentication = window.Capacitor.Plugins?.FirebaseAuthentication;
            if (FirebaseAuthentication && typeof FirebaseAuthentication.getIdToken === 'function') {
                FirebaseAuthentication.getIdToken().then(async (result) => {
                    if (result && result.token && !firebaseAuth.currentUser) {
                        try {
                            const credential = firebase.auth.GoogleAuthProvider.credential(result.token);
                            await firebaseAuth.signInWithCredential(credential);
                            console.log('✅ [Auth] Restored native Google Auth session into JS Firebase Auth SDK!');
                        } catch (e) {
                            console.warn('[Auth] Native auth restore warning:', e.message);
                        }
                    }
                }).catch((err) => console.warn('[Auth] Native auth restore info:', err?.message || err));
            }
        }, 500);
    }
}

async function updateAuthUI() {
    const settingsComponent = document.querySelector('settings-component');
    if (!settingsComponent || !settingsComponent.shadowRoot) return;
    
    const authContent = settingsComponent.shadowRoot.querySelector('#auth-content');
    if (!authContent) return;

    const availableProviders = await getAvailableAuthProviders();

    if (currentUser) {
        const signOutText = t('signOut') || 'Выйти';
        const userLabel = escapeHtml(getUserDisplayLabel(currentUser));
        const email = escapeHtml(currentUser.email || '');
        const photo = currentUser.photoURL;
        const providerId = (currentUser.providerData && currentUser.providerData[0]?.providerId) || (currentUser.email ? 'password' : 'google.com');
        const providerName = getProviderLabel(providerId);

        const avatarHtml = photo
            ? `<img src="${photo}" alt="Avatar" style="width: 52px; height: 52px; border-radius: 50%; object-fit: cover; border: 2px solid var(--primary-accent); margin: 0 auto 0.75rem; display: block;" onerror="this.style.display='none'">`
            : `<div style="width: 52px; height: 52px; border-radius: 50%; background: var(--primary-accent); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.35rem; font-weight: 700; margin: 0 auto 0.75rem;">${(userLabel[0] || 'U').toUpperCase()}</div>`;

        authContent.innerHTML = `
            <div class="user-info" style="text-align: center; padding: 1.5rem 1rem; border-radius: 12px; margin-bottom: 1rem; background: var(--component-background); border: 1px solid color-mix(in srgb, var(--primary-accent) 30%, transparent);">
                ${avatarHtml}
                <p style="margin: 0 0 0.25rem; font-size: 1.1rem; color: var(--text-color); font-weight: 600;">
                    ${userLabel}
                </p>
                ${email ? `<p style="margin: 0 0 0.6rem; font-size: 0.85rem; color: var(--text-color-secondary);">${email}</p>` : ''}
                <div style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 20px; background: color-mix(in srgb, var(--primary-accent) 15%, transparent); font-size: 0.8rem; color: var(--primary-accent); font-weight: 600;">
                    ${getProviderIconSvg(providerId, 'provider-badge-icon')}
                    <span>${providerName}</span>
                </div>
            </div>
            <button class="signout-btn" id="signout-btn" data-i18n="signOut" style="width: 100%; padding: 12px 20px; font-size: 0.95rem; font-weight: 600; cursor: pointer; border-radius: 10px; border: 1.5px solid var(--primary-accent); background: transparent; color: var(--primary-accent); transition: all 0.3s ease;">
                ${signOutText}
            </button>`;

        bindAuthContentActions(authContent);
    } else {
        authContent.innerHTML = renderAuthFormHtml(availableProviders, currentAuthTab);
        bindAuthContentActions(authContent);
    }
}

window.signInWithGoogle = (button) => window.signInWithProvider('google.com', button);
window.signInWithGithub = (button) => window.signInWithProvider('github.com', button);
const VK_AUTH_CONFIG = {
    appId: 54715318,
    serviceToken: '11f86b0611f86b0611f86b066312ba88b0111f811f86b067b82724c736aafcecbd0b20b',
    getRedirectUri() {
        if (window.location.protocol === 'https:') {
            return window.location.origin;
        }
        return 'https://studio-9933447149-80d6a.web.app';
    }
};

function generateRandomString(length = 48) {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
    let result = '';
    const values = new Uint8Array(length);
    if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(values);
        for (let i = 0; i < length; i++) {
            result += charset[values[i] % charset.length];
        }
    } else {
        for (let i = 0; i < length; i++) {
            result += charset[Math.floor(Math.random() * charset.length)];
        }
    }
    return result;
}

async function generateCodeChallenge(verifier) {
    if (window.crypto && window.crypto.subtle && window.crypto.subtle.digest) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(verifier);
            const digest = await window.crypto.subtle.digest('SHA-256', data);
            const bytes = new Uint8Array(digest);
            let binary = '';
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary)
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');
        } catch (e) {
            console.warn('[VK Auth] generateCodeChallenge error:', e);
        }
    }
    return verifier;
}

function getVKCookie(name) {
    try {
        const match = document.cookie.match(new RegExp('(?:^|; )vkid_sdk:' + name + '=([^;]*)'));
        return match ? decodeURIComponent(match[1]) : '';
    } catch(e) {
        return '';
    }
}

// Exchange authorization code for VK ID tokens via PKCE endpoint
async function exchangeVKCodeForToken(code, deviceId, codeVerifier, state) {
    const redirectUri = VK_AUTH_CONFIG.getRedirectUri();
    const verifier = codeVerifier || localStorage.getItem('vk_code_verifier') || getVKCookie('codeVerifier') || '';
    
    const bodyParams = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: String(VK_AUTH_CONFIG.appId),
        redirect_uri: redirectUri,
        code: code
    });
    if (deviceId) bodyParams.set('device_id', deviceId);
    if (verifier) bodyParams.set('code_verifier', verifier);
    if (state) bodyParams.set('state', state);

    const response = await fetch('https://id.vk.com/oauth2/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: bodyParams.toString()
    });

    const data = await response.json();
    if (data.error) {
        throw new Error(data.error_description || data.error);
    }
    return data; // { access_token, id_token, user_id, email, phone, expires_in }
}

// Fetch user profile from VK API via JSONP
function fetchVKUserProfile(userId, accessToken) {
    if (!userId) return Promise.resolve(null);
    return new Promise((resolve) => {
        const callbackName = 'vk_jsonp_cb_' + Date.now() + '_' + Math.floor(Math.random() * 100000);
        const script = document.createElement('script');
        const token = accessToken || VK_AUTH_CONFIG.serviceToken;
        script.src = `https://api.vk.com/method/users.get?user_ids=${encodeURIComponent(userId)}&fields=photo_200,first_name,last_name&access_token=${encodeURIComponent(token)}&v=5.131&callback=${callbackName}`;
        
        const cleanup = () => {
            try { delete window[callbackName]; } catch(e) {}
            if (script.parentNode) script.parentNode.removeChild(script);
        };

        const timer = setTimeout(() => {
            cleanup();
            resolve(null);
        }, 6000);

        window[callbackName] = (data) => {
            clearTimeout(timer);
            cleanup();
            if (data && data.response && data.response[0]) {
                resolve(data.response[0]);
            } else {
                console.warn('[VK API] users.get warning:', data);
                resolve(null);
            }
        };

        script.onerror = () => {
            clearTimeout(timer);
            cleanup();
            resolve(null);
        };

        document.head.appendChild(script);
    });
}

// Build a VK user object (without establishing session) — used for postMessage in popup flow
async function buildVKUserObject(userId, email, accessToken, initialProfile) {
    if (!userId) return null;
    let profile = initialProfile || null;
    if (!profile || !profile.first_name) {
        try { profile = await fetchVKUserProfile(userId, accessToken); } catch (e) {}
    }
    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || `Пользователь VK (${userId})`;
    const photoURL = profile?.photo_200 || profile?.avatar || '';
    const userEmail = email || (profile?.email ? profile.email : `id${userId}@vk.com`);
    return {
        uid: 'vk_' + userId,
        id: userId,
        displayName,
        email: userEmail,
        photoURL,
        isAnonymous: false,
        providerData: [{ providerId: 'oidc.vk-id', uid: 'vk_' + userId, displayName, email: userEmail, photoURL }]
    };
}

// Establish authenticated VK user session in the app
async function establishVKSession(userId, email, accessToken, initialProfile) {
    if (!userId) {
        console.error('[VK Auth] Cannot establish session: userId is required.');
        showToast('Не удалось получить данные аккаунта VK.', 'error', 3000);
        return;
    }

    let profile = initialProfile || null;
    if (!profile || !profile.first_name) {
        try {
            profile = await fetchVKUserProfile(userId, accessToken);
        } catch (e) {
            console.warn('[VK Auth] Could not fetch profile via JSONP:', e);
        }
    }

    const firstName = profile?.first_name || '';
    const lastName = profile?.last_name || '';
    const displayName = `${firstName} ${lastName}`.trim() || `Пользователь VK (${userId})`;
    const photoURL = profile?.photo_200 || profile?.avatar || '';
    const userEmail = email || (profile?.email ? profile.email : `id${userId}@vk.com`);

    const vkUser = {
        uid: 'vk_' + userId,
        id: userId,
        displayName: displayName,
        email: userEmail,
        photoURL: photoURL,
        isAnonymous: false,
        providerData: [{
            providerId: 'oidc.vk-id',
            uid: 'vk_' + userId,
            displayName: displayName,
            email: userEmail,
            photoURL: photoURL
        }]
    };

    localStorage.setItem('ssh_vk_user', JSON.stringify(vkUser));
    currentUser = vkUser;
    window.currentUser = vkUser;

    // Background anonymous sign-in to Firebase to satisfy Firestore rules if needed
    if (window.firebase && window.firebase.auth && !firebaseAuth?.currentUser) {
        try {
            await firebaseAuth.signInAnonymously();
            console.log('✅ [VK Auth] Background Firebase anonymous session active for Firestore.');
        } catch (e) {
            console.warn('[VK Auth] Background Firebase session info:', e.message);
        }
    }

    // Load user data into calculators and notes
    const gradeCalc = document.querySelector('grade-average-calculator');
    if (gradeCalc && typeof gradeCalc.loadFromDatabase === 'function') {
        gradeCalc.loadFromDatabase();
    }

    updateAuthUI();
    updateTranslations();
    showToast(`Добро пожаловать, ${displayName}!`, 'success', 3000);
}

function formatAuthError(err) {
    if (!err) return 'Неизвестная ошибка';
    if (typeof err === 'string') return err;
    if (err.error_description) return err.error_description;
    if (err.error) return typeof err.error === 'string' ? err.error : JSON.stringify(err.error);
    if (err.message) return err.message;
    if (err.detail) return err.detail;
    try { return JSON.stringify(err); } catch(e) { return String(err); }
}

function initVKConfig() {
    if (typeof VKIDSDK === 'undefined') return;
    const redirectUri = VK_AUTH_CONFIG.getRedirectUri();
    const verifier = localStorage.getItem('vk_code_verifier') || generateRandomString(64);
    localStorage.setItem('vk_code_verifier', verifier);

    try {
        document.cookie = 'vkid_sdk:codeVerifier=' + encodeURIComponent(verifier) + '; path=/; max-age=3600; SameSite=Lax';
    } catch(e) {}

    try {
        VKIDSDK.Config.init({
            app: VK_AUTH_CONFIG.appId,
            redirectUrl: redirectUri,
            codeVerifier: verifier,
            scope: 'email',
            mode: VKIDSDK.ConfigAuthMode ? VKIDSDK.ConfigAuthMode.Redirect : 'redirect'
        });
    } catch (e) {
        console.warn('[VK Auth] Config.init error:', e);
    }
}

// VK Sign-in Trigger — official VK ID SDK Auth flow
window.signInWithVk = function(button) {
    return runAuthAction(button, async () => {
        if (typeof VKIDSDK === 'undefined') {
            showToast('VK SDK не загружен. Проверьте интернет-соединение.', 'error', 3000);
            return;
        }

        initVKConfig();

        try {
            await VKIDSDK.Auth.login();
        } catch (err) {
            console.error('[VK Auth] Auth.login error:', err);
            showToast('Ошибка авторизации VK: ' + formatAuthError(err), 'error', 3500);
        }
    });
};

async function initVKAuth() {
    // 1. Restore VK session from localStorage first if not already authenticated
    const savedVK = localStorage.getItem('ssh_vk_user');
    if (savedVK && (!firebaseAuth || !firebaseAuth.currentUser)) {
        try {
            const parsed = JSON.parse(savedVK);
            if (parsed && parsed.uid) {
                currentUser = parsed;
                window.currentUser = parsed;
                updateAuthUI();
                const gradeCalc = document.querySelector('grade-average-calculator');
                if (gradeCalc && typeof gradeCalc.loadFromDatabase === 'function') {
                    gradeCalc.loadFromDatabase();
                }
            }
        } catch (e) {
            console.warn('[VK Auth] restore warning:', e);
        }
    }

    initVKConfig();

    // 2. Check if redirected back with VK ID search params (?code=... or ?payload=... or ?error=...)
    if (window.location.search && (
        window.location.search.includes('code=') ||
        window.location.search.includes('payload=') ||
        window.location.search.includes('error=')
    )) {
        const searchParams = new URLSearchParams(window.location.search);
        const payload = searchParams.get('payload');
        const code = searchParams.get('code');
        const deviceId = searchParams.get('device_id');
        const state = searchParams.get('state');
        const error = searchParams.get('error_description') || searchParams.get('error');

        // Clean query string immediately so refresh doesn't replay stale codes
        try { history.replaceState(null, '', window.location.pathname + window.location.hash); } catch (e) {}

        // If user is already authenticated, no need to re-process or show errors
        if (currentUser && currentUser.uid) {
            return;
        }

        if (error) {
            showToast('Ошибка VK ID: ' + error, 'warning', 3500);
            return;
        }

        // Priority 1: Handle payload directly (from FloatingOneTap / OneTap redirect)
        if (payload) {
            try {
                const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
                const token = parsed.token || parsed.access_token;
                const user = parsed.user || {};
                const uid = user.id || parsed.user_id || parsed.uuid || parsed.id;
                if (uid) {
                    await establishVKSession(uid, user.email || parsed.email, token, user);
                    return;
                }
            } catch (e) {
                console.warn('[VK Auth] Payload parsing error:', e);
            }
        }

        // Priority 2: Exchange authorization code if provided
        if (code) {
            const verifier = localStorage.getItem('vk_code_verifier') || getVKCookie('codeVerifier') || '';
            const savedState = state || localStorage.getItem('vk_auth_state') || undefined;

            try {
                let tokenData = null;
                try {
                    if (typeof VKIDSDK !== 'undefined' && typeof VKIDSDK.Auth?.exchangeCode === 'function') {
                        tokenData = await VKIDSDK.Auth.exchangeCode(code, deviceId);
                    }
                } catch (sdkErr) {
                    console.warn('[VK Auth] SDK exchangeCode fallback to direct endpoint:', sdkErr);
                }

                if (!tokenData || (!tokenData.access_token && !tokenData.token)) {
                    tokenData = await exchangeVKCodeForToken(code, deviceId, verifier, savedState);
                }

                if (tokenData && (tokenData.access_token || tokenData.token)) {
                    const token = tokenData.access_token || tokenData.token;
                    let userProfile = null;
                    try {
                        if (typeof VKIDSDK !== 'undefined' && typeof VKIDSDK.Auth?.userInfo === 'function') {
                            const info = await VKIDSDK.Auth.userInfo(token);
                            userProfile = info?.user || info;
                        }
                    } catch (e) {
                        console.warn('[VK Auth] userInfo fetch warning:', e);
                    }
                    const uid = tokenData.user_id || userProfile?.id;
                    await establishVKSession(uid, tokenData.email || userProfile?.email, token, userProfile);
                    return;
                }
            } catch (err) {
                console.error('[VK Auth] Redirect code exchange error:', err);
                if (!currentUser || !currentUser.uid) {
                    showToast('Ошибка авторизации VK: ' + formatAuthError(err), 'error', 3500);
                }
            }
        }
    }

    // 3. Check for legacy VK OAuth hash (#access_token=...&user_id=...)
    if (window.location.hash && window.location.hash.includes('access_token') && window.location.hash.includes('user_id')) {
        const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const accessToken = params.get('access_token');
        const userId = params.get('user_id');
        const email = params.get('email');
        if (userId) {
            try { history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) {}
            await establishVKSession(userId, email, accessToken);
            return;
        }
    }
}

// Run VK auth check on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVKAuth);
} else {
    initVKAuth();
}

window.getCurrentUser = () => currentUser;
window.fetchVKUserProfile = fetchVKUserProfile;
window.establishVKSession = establishVKSession;

window.signOutUser = () => {
    const gradeCalc = document.querySelector('grade-average-calculator');
    if (gradeCalc && currentUser) {
        gradeCalc.saveToDatabase();
    }

    const wasVK = currentUser && currentUser.uid && String(currentUser.uid).startsWith('vk_');
    localStorage.removeItem('ssh_vk_user');
    localStorage.removeItem('google_access_token');

    if (wasVK) {
        currentUser = null;
        window.currentUser = null;
        if (gradeCalc) {
            gradeCalc.subjects = {};
            gradeCalc.render();
        }
        updateAuthUI();
        showToast(t('signOutSuccess') || 'Вы вышли из аккаунта', 'info', 2500);
        return;
    }

    if (firebaseAuth && firebaseAuth.currentUser) {
        firebaseAuth.signOut()
            .then(() => {
                currentUser = null;
                window.currentUser = null;
                if (gradeCalc) {
                    gradeCalc.subjects = {};
                    gradeCalc.render();
                }
                updateAuthUI();
                showToast(t('signOutSuccess') || 'Вы вышли из аккаунта', 'info', 2500);
            })
            .catch(error => {
                console.error('Sign-out error:', error);
            });
    } else {
        currentUser = null;
        window.currentUser = null;
        if (gradeCalc) {
            gradeCalc.subjects = {};
            gradeCalc.render();
        }
        updateAuthUI();
        showToast(t('signOutSuccess') || 'Вы вышли из аккаунта', 'info', 2500);
    }
};
