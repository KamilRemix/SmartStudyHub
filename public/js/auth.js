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

const CIS_COUNTRY_CODES = new Set(['RU', 'BY', 'KZ', 'AM', 'AZ', 'KG', 'MD', 'TJ', 'TM', 'UZ']);

let cachedUserRegionProviders = null;

async function getAvailableAuthProviders() {
    if (cachedUserRegionProviders) return cachedUserRegionProviders;

    const baseProviders = ['google.com', 'github.com'];
    let showVk = false;

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
    return providerId;
}

function getProviderCssClass(providerId) {
    if (providerId === 'oidc.vk-id') return 'vk';
    if (providerId === 'github.com') return 'github';
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

function bindAuthContentActions(authContent) {
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

    authContent.querySelectorAll('[data-unlink-provider]').forEach((btn) => {
        btn.addEventListener('click', () => {
            if (authActionInFlight) return;
            window.unlinkAuthProvider(btn.getAttribute('data-unlink-provider'), btn);
        });
    });

    const signoutBtn = authContent.querySelector('#signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', window.signOutUser);
    }
}

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
        const providerId = (currentUser.providerData && currentUser.providerData[0]?.providerId) || 'google.com';
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
        authContent.innerHTML = `
            <div class="auth-signin-stack" style="display: flex; flex-direction: column; gap: 12px;">
                ${availableProviders.map((id) => buildProviderActionButton(id, 'signin')).join('')}
            </div>`;
        bindAuthContentActions(authContent);
    }
}

window.signInWithGoogle = (button) => window.signInWithProvider('google.com', button);
window.signInWithGithub = (button) => window.signInWithProvider('github.com', button);
const VK_AUTH_CONFIG = {
    appId: 54715318,
    serviceToken: '11f86b0611f86b0611f86b066312ba88b0111f811f86b067b82724c736aafcecbd0b20b',
    getRedirectUri() {
        // VK ID strictly requires a public HTTPS domain registered in the VK Dashboard.
        // It rejects 'localhost' and 'http://'.
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol !== 'https:') {
            return 'https://studio-9933447149-80d6a.web.app';
        }
        return window.location.origin;
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
    
    const params = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: String(VK_AUTH_CONFIG.appId),
        code: code,
        redirect_uri: redirectUri
    });
    if (deviceId) params.set('device_id', deviceId);
    if (verifier) params.set('code_verifier', verifier);
    if (state) params.set('state', state);

    const response = await fetch('https://id.vk.com/oauth2/auth', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
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
            console.warn('[VK Auth] Profile fetch error:', e);
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

// VK Sign-in Trigger — uses native VK ID FloatingOneTap (no popup windows)
window.signInWithVk = function(button) {
    return runAuthAction(button, async () => {
        if (typeof VKIDSDK === 'undefined') {
            showToast('VK SDK не загружен. Проверьте интернет-соединение.', 'error', 3000);
            return;
        }

        VKIDSDK.Config.init({
            app: VK_AUTH_CONFIG.appId,
            redirectUrl: VK_AUTH_CONFIG.getRedirectUri()
        });

        // Use FloatingOneTap which renders a beautiful native VK modal in the SAME window
        const floating = new VKIDSDK.FloatingOneTap();
        
        floating.render({
            appName: 'SmartStudyHub',
            showAlternativeLogin: 0,
            displayMode: 'default'
        })
        .on(VKIDSDK.WidgetEvents.SUCCESS, async (payload) => {
            try {
                const uid = payload.user?.id || payload.user_id || payload.uuid || payload.id;
                if (uid && payload.token) {
                    await establishVKSession(uid, payload.user?.email, payload.token, payload.user);
                } else {
                    throw new Error("Неверный формат ответа от VK");
                }
            } catch (err) {
                console.error('[VK Auth] Widget success handling error:', err);
                showToast('Ошибка авторизации VK: ' + err.message, 'error', 3500);
            }
        })
        .on(VKIDSDK.WidgetEvents.ERROR, (error) => {
            console.warn('[VK Auth] Widget error:', error);
            const errMsg = error?.detail || error?.message || '';
            // Ignore user cancellation errors
            if (!errMsg.includes('User cancel')) {
                showToast('Ошибка авторизации VK' + (errMsg ? ': ' + errMsg : ''), 'warning', 3000);
            }
        });
    });
};

async function initVKAuth() {
    // Check for legacy VK OAuth hash (#access_token=...&user_id=...)
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

    // Restore VK session from localStorage if not already authenticated
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
