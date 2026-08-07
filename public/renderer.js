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

const tabMap = {
    'calculator-tab': 'calculator-page',
    'grades-tab': 'grades-page',
    'tools-tab': 'tools-page'
};

function switchToTab(tabId) {
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
        try { initTools(); } catch (e) { console.warn('initTools failed', e); }
    }
}

function switchToGradesTab() {
    switchToTab('grades-tab');
}

function initTabNavigation() {
    document.querySelectorAll('.nav-tab').forEach((tab) => {
        tab.addEventListener('click', () => switchToTab(tab.id));
    });
}

function loadGradesForCurrentUser(retryCount = 0) {
    if (!currentUser) return Promise.resolve();

    const gradeCalc = document.querySelector('grade-average-calculator');
    if (!gradeCalc || typeof gradeCalc.loadFromDatabase !== 'function') {
        if (retryCount < 30) {
            return new Promise((resolve) => {
                setTimeout(() => resolve(loadGradesForCurrentUser(retryCount + 1)), 50);
            });
        }
        return Promise.resolve();
    }

    return currentUser
        .getIdToken(true)
        .then(() => gradeCalc.loadFromDatabase())
        .then(() => switchToGradesTab())
        .catch((err) => {
            console.error('Failed to load grades after sign-in:', err);
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

const AUTH_PROVIDER_IDS = ['google.com', 'github.com'];

function getLinkedProviders(user) {
    const ids = new Set((user?.providerData || []).map((p) => p.providerId));
    return {
        hasGoogle: ids.has('google.com'),
        hasGithub: ids.has('github.com'),
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
    return translations[currentLang][key] || translations.en[key] || key;
}

function tpl(key, vars = {}) {
    let text = t(key);
    Object.keys(vars).forEach((name) => {
        text = text.replace(new RegExp(`\\{${name}\\}`, 'gi'), vars[name]);
    });
    return text;
}

function getProviderLabel(providerId) {
    if (providerId === 'github.com') return t('providerGithub');
    if (providerId === 'google.com') return t('providerGoogle');
    return providerId;
}

function getProviderCssClass(providerId) {
    if (providerId === 'github.com') return 'github';
    return 'google';
}

function getProviderButtonClass(providerId) {
    if (providerId === 'github.com') return 'github-signin-btn';
    return 'google-signin-btn';
}

function getLinkButtonId(providerId) {
    if (providerId === 'github.com') return 'link-github-btn';
    return 'link-google-btn';
}

function getSignInButtonId(providerId) {
    if (providerId === 'github.com') return 'github-signin-btn';
    return 'google-signin-btn';
}

function getLinkLabelKey(providerId) {
    if (providerId === 'github.com') return 'linkGithubToProfile';
    return 'linkGoogleToProfile';
}

function getSignInLabelKey(providerId) {
    if (providerId === 'github.com') return 'signInWithGithub';
    return 'signInWithGoogle';
}

function getCurrentProviderId(user) {
    if (!user?.providerData?.length) return 'google.com';
    return user.providerData[0].providerId;
}

function createAuthProvider(providerId) {
    if (providerId === 'github.com') {
        const provider = new firebase.auth.GithubAuthProvider();
        provider.addScope('read:user');
        return provider;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/gmail.modify');
    provider.addScope('https://www.googleapis.com/auth/drive.file');
    provider.addScope('https://www.googleapis.com/auth/documents');
    provider.addScope('https://www.googleapis.com/auth/calendar');
    provider.addScope('https://www.googleapis.com/auth/tasks');
    provider.addScope('https://www.googleapis.com/auth/youtube.readonly');
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

function runAuthAction(button, actionFn) {
    if (authActionInFlight) return Promise.resolve();
    authActionInFlight = true;
    setAuthButtonLoading(button, true);

    return Promise.resolve()
        .then(actionFn)
        .catch((error) => {
            if (isIgnorableAuthError(error)) return;
            throw error;
        })
        .finally(() => {
            authActionInFlight = false;
            setAuthButtonLoading(button, false);
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

    const toast = document.createElement('div');
    toast.className = `app-toast app-toast--${type}`;
    toast.setAttribute('role', 'status');
    toast.innerHTML = `
        <span class="app-toast-icon" aria-hidden="true">${type === 'success' ? '✓' : type === 'error' ? '!' : type === 'warning' ? '!' : 'i'}</span>
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
        } else {
            showToast(t('accountLinkElectronUnsupported'), 'warning', 3000);
        }
        return Promise.resolve();
    }

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
}

function updateAuthUI() {
    const settingsComponent = document.querySelector('settings-component');
    if (!settingsComponent || !settingsComponent.shadowRoot) return;
    
    const authContent = settingsComponent.shadowRoot.querySelector('#auth-content');
    if (!authContent) return;

    if (currentUser) {
        const signOutText = translations[currentLang]['signOut'] || 'Sign Out';
        const userLabel = escapeHtml(getUserDisplayLabel(currentUser));
        const linked = getLinkedProviders(currentUser);
        const providerRows = (currentUser.providerData || []);
        const canUnlink = providerRows.length >= 2;

        const linkedListHtml = providerRows.length
            ? `<p class="accounts-linked-intro">${escapeHtml(t('accountsLinkedIntro'))}</p>
               <div class="linked-providers-list">
                   ${providerRows.map((p) => buildLinkedProviderRow(p.providerId, canUnlink)).join('')}
               </div>`
            : '';

        const linkButtonsHtml = AUTH_PROVIDER_IDS
            .filter((id) => !linked.ids.has(id))
            .map((id) => buildProviderActionButton(id, 'link'))
            .join('');

        authContent.innerHTML = `
            <div class="user-info" style="text-align: center; padding: 1.5rem 1rem 1rem;">
                <p style="margin: 0; font-size: 1rem; color: var(--text-color); font-weight: 500;">
                    ${userLabel}
                </p>
            </div>
            ${linkedListHtml}
            <div class="auth-provider-actions" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 1rem;">
                ${linkButtonsHtml}
            </div>
            <button class="signout-btn" id="signout-btn" data-i18n="signOut" style="font-size: 0.9rem; padding: 8px 16px; width: 100%;">
                ${signOutText}
            </button>`;

        bindAuthContentActions(authContent);
    } else {
        authContent.innerHTML = `
            <div class="auth-signin-stack" style="display: flex; flex-direction: column; gap: 10px;">
                ${AUTH_PROVIDER_IDS.map((id) => buildProviderActionButton(id, 'signin')).join('')}
            </div>`;
        bindAuthContentActions(authContent);
    }
}

window.signInWithGoogle = (button) => window.signInWithProvider('google.com', button);
window.signInWithGithub = (button) => window.signInWithProvider('github.com', button);

window.signOutUser = () => {
    if (!firebaseAuth) return;

    const gradeCalc = document.querySelector('grade-average-calculator');
    if (gradeCalc && currentUser) {
        gradeCalc.saveToDatabase();
    }

    firebaseAuth.signOut()
        .then(() => {
            // Clear local data on logout
            localStorage.removeItem('google_access_token');
            if (gradeCalc) {
                gradeCalc.subjects = {};
                gradeCalc.render();
            }
        })
        .catch(error => {
            console.error('Sign-out error:', error);
        });
};

// Yandex integration removed: no geolocation-based hiding needed

/* ========= GLOBAL FUNCTIONS ========= */

// --- THEME MANAGEMENT ---
function setTheme(theme) {
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
    if (settingsComp && settingsComp.updateThemeButtons) {
        settingsComp.updateThemeButtons();
    }
}

// --- LANGUAGE & TRANSLATION ---
let currentLang = 'en'; // Default language

function getInitialUserLanguage() {
    const savedLang = localStorage.getItem('language');
    if (savedLang && translations[savedLang]) {
        return savedLang;
    }

    const browserLang = navigator.language || navigator.userLanguage || 'en';
    const normalizedLang = String(browserLang).toLowerCase().split(/[-_]/)[0];
    return translations[normalizedLang] ? normalizedLang : 'en';
}

// Desktop app modal helpers are defined later; declare here so we can safely call them
function syncDesktopDownloadLangSelector() {
    const langSelect = document.getElementById('desktop-lang-select');
    if (!langSelect) return;
    if (langSelect.value !== currentLang) {
        langSelect.value = currentLang;
    }
}

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    syncDesktopDownloadLangSelector();
    updateTranslations();
    updateAuthUI();
}

function updateTranslations() {
    updateAuthDialogTexts();
    const t = translations[currentLang] || translations['en'];
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
    if (gradeAvgCalc && gradeAvgCalc.updateStrategy) {
        gradeAvgCalc.updateStrategy();
    }
    // Update Tools specific texts (select options, buttons, badges)
    try { updateToolsTranslations(); } catch (e) { /* non-fatal */ }
}

function updateToolsTranslations() {
    // converter type options
    const convType = document.getElementById('conv-type');
    if (convType) {
        const map = { length: 'length', mass: 'mass', temp: 'temperature' };
        Array.from(convType.options).forEach(opt => {
            const key = map[opt.value] || opt.value;
            opt.textContent = translations[currentLang][key] || opt.textContent;
        });
    }
    // placeholder for input and result label
    const convValueEl = document.getElementById('conv-value');
    if (convValueEl) {
        convValueEl.placeholder = translations[currentLang]['valuePlaceholder'] || '';
    }
    const resultLabel = document.querySelector('#tools-converter-panel .result-label');
    if (resultLabel) resultLabel.textContent = translations[currentLang]['result'] || resultLabel.textContent;
    
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
        refreshBtnSpan.textContent = translations[currentLang]['refresh'] || 'Refresh';
    }
    // badges (offline texts)
    document.querySelectorAll('.tool-card').forEach(card => {
        const badge = card.querySelector('.card-badge');
        if (badge) {
            // by default clear
            if (!navigator.onLine) {
                badge.classList.add('card-badge--offline');
                badge.textContent = translations[currentLang]['offline'] || 'Offline';
            } else {
                badge.classList.remove('card-badge--offline');
                badge.textContent = '';
            }
        }
    });
    if (window.updateGenPassTranslations) {
        try { window.updateGenPassTranslations(); } catch(e) { console.warn(e); }
    }
}

// --- DESKTOP APP DOWNLOAD MODAL ---

const DESKTOP_APP_VERSION = '1.1.0';
const DESKTOP_APP_DOWNLOAD_URL = 'https://github.com/KamilRemix/SmartStudyHub/releases/latest';

function initDesktopDownloadModal() {
    initWebDownloadHub();
}

function initWebDownloadHub() {
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


/* ========= WEB COMPONENTS ========= */

// --- TOOLS Initialization (tiles: Settings, Unit Converter, Currency) ---
function initTools() {
    if (window.toolsInitialized) return;
    window.toolsInitialized = true;

    // Unit converter setup
    const convType = document.getElementById('conv-type');
    const convFrom = document.getElementById('conv-from');
    const convTo = document.getElementById('conv-to');
    const convValue = document.getElementById('conv-value');
    const convResult = document.getElementById('conv-result');
    const convSwap = document.getElementById('conv-swap');

    function populateUnits() {
        if (!convType || !convFrom || !convTo) return;
        const type = convType.value;
        convFrom.innerHTML = '';
        convTo.innerHTML = '';
        let opts = [];
        if (type === 'length') opts = [
            {v:'km',t:'km'}, {v:'m',t:'m'}, {v:'cm',t:'cm'}, {v:'mm',t:'mm'},
            {v:'mi',t:'mi'}, {v:'yd',t:'yd'}, {v:'ft',t:'ft'}, {v:'in',t:'in'}
        ];
        else if (type === 'mass') opts = [
            {v:'t',t:'t'}, {v:'kg',t:'kg'}, {v:'g',t:'g'}, {v:'mg',t:'mg'}, {v:'lb',t:'lb'}, {v:'oz',t:'oz'}
        ];
        else if (type === 'temp') opts = [ {v:'c',t:'°C'}, {v:'f',t:'°F'}, {v:'k',t:'K'} ];
        opts.forEach(o => {
            const a = document.createElement('option'); a.value = o.v; a.textContent = o.t; convFrom.appendChild(a);
            const b = document.createElement('option'); b.value = o.v; b.textContent = o.t; convTo.appendChild(b);
        });
    }

    function doConvert() {
        if (!convValue || !convFrom || !convTo || !convResult) return;
        const v = parseFloat(convValue.value);
        if (isNaN(v)) {
            convResult.textContent = '0.0000';
            return;
        }
        const from = convFrom.value;
        const to = convTo.value;
        const type = convType ? convType.value : 'length';
        let out = v;
        if (from === to) out = v;
        // length: convert everything to meters then to target
        const toMeters = {
            km: 1000, m:1, cm:0.01, mm:0.001, mi:1609.344, yd:0.9144, ft:0.3048, in:0.0254
        };
        if (type === 'length' && toMeters[from] && toMeters[to]) {
            out = v * (toMeters[from] / toMeters[to]);
        }
        // mass: convert via kilograms
        const toKg = { t:1000, kg:1, g:0.001, mg:0.000001, lb:0.45359237, oz:0.028349523125 };
        if (type === 'mass' && toKg[from] && toKg[to]) {
            out = v * (toKg[from] / toKg[to]);
        }
        // temperature conversions
        if (type === 'temp') {
            if (from === to) out = v;
            else if (from === 'c' && to === 'f') out = (v * 9/5) + 32;
            else if (from === 'f' && to === 'c') out = (v - 32) * 5/9;
            else if (from === 'c' && to === 'k') out = v + 273.15;
            else if (from === 'k' && to === 'c') out = v - 273.15;
            else if (from === 'f' && to === 'k') out = (v - 32) * 5/9 + 273.15;
            else if (from === 'k' && to === 'f') out = (v - 273.15) * 9/5 + 32;
        }

        const toText = convTo.options[convTo.selectedIndex]?.textContent || '';
        convResult.textContent = out === null ? '' : `${out.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })} ${toText}`;
    }

    if (convType) convType.addEventListener('change', () => { populateUnits(); doConvert(); });
    if (convFrom) convFrom.addEventListener('change', doConvert);
    if (convTo) convTo.addEventListener('change', doConvert);
    if (convValue) convValue.addEventListener('input', doConvert);
    if (convSwap) {
        convSwap.addEventListener('click', () => {
            if (!convFrom || !convTo) return;
            const temp = convFrom.value;
            convFrom.value = convTo.value;
            convTo.value = temp;
            doConvert();
            convSwap.style.transform = 'rotate(180deg)';
            setTimeout(() => {
                convSwap.style.transform = '';
            }, 300);
        });
    }
    populateUnits(); doConvert();

    // Currency card & converter
    const currencyRatesEl = document.getElementById('currency-rates');
    const currencyMsg = document.getElementById('currency-message');
    const currencyBtn = document.getElementById('currency-refresh');
    const currencyLastUpdateEl = document.getElementById('currency-last-update');
    
    const currAmountEl = document.getElementById('curr-amount');
    const currFromEl = document.getElementById('curr-from');
    const currToEl = document.getElementById('curr-to');
    const currResultEl = document.getElementById('curr-result');
    const currSwapEl = document.getElementById('curr-swap');

    const SUPPORTED_CURRENCIES = [
        { code: 'USD', name: 'US Dollar', symbol: '$' },
        { code: 'EUR', name: 'Euro', symbol: '€' },
        { code: 'RUB', name: 'Russian Ruble', symbol: '₽' },
        { code: 'CNY', name: 'Chinese Yuan', symbol: '¥' },
        { code: 'KZT', name: 'Kazakhstani Tenge', symbol: '₸' },
        { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br' },
        { code: 'GBP', name: 'British Pound', symbol: '£' },
        { code: 'JPY', name: 'Japanese Yen', symbol: '¥' },
        { code: 'TRY', name: 'Turkish Lira', symbol: '₺' },
        { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ' }
    ];

    let currentRates = null;

    function populateCurrencyDropdowns() {
        if (!currFromEl || !currToEl || currFromEl.options.length > 0) return;

        SUPPORTED_CURRENCIES.forEach(c => {
            const opt1 = document.createElement('option');
            opt1.value = c.code;
            opt1.textContent = `${c.code} (${c.name})`;
            currFromEl.appendChild(opt1);

            const opt2 = document.createElement('option');
            opt2.value = c.code;
            opt2.textContent = `${c.code} (${c.name})`;
            currToEl.appendChild(opt2);
        });

        currFromEl.value = 'USD';
        currToEl.value = 'RUB';
    }

    function recalculateCurrency() {
        if (!currAmountEl || !currFromEl || !currToEl || !currResultEl) return;
        const amount = parseFloat(currAmountEl.value);
        if (isNaN(amount) || amount <= 0) {
            currResultEl.textContent = '0.0000';
            return;
        }

        if (!currentRates) {
            currResultEl.textContent = translations[currentLang]?.offline || 'Offline';
            return;
        }

        const from = currFromEl.value;
        const to = currToEl.value;
        
        const rateFrom = currentRates[from];
        const rateTo = currentRates[to];

        if (rateFrom && rateTo) {
            const resultVal = (amount / rateFrom) * rateTo;
            const targetCurrency = SUPPORTED_CURRENCIES.find(c => c.code === to);
            const symbol = targetCurrency ? targetCurrency.symbol : '';
            currResultEl.textContent = `${resultVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ${symbol || to}`;
        }
    }

    function showCurrencyMessage(text, isError = false) {
        if (!currencyMsg) return;
        currencyMsg.style.display = text ? 'block' : 'none';
        currencyMsg.textContent = text;
        currencyMsg.className = isError ? 'currency-error-text' : 'currency-info-text';
    }

    function displayPopularRates() {
        if (!currencyRatesEl || !currentRates) return;
        currencyRatesEl.innerHTML = '';

        const grid = document.createElement('div');
        grid.className = 'currency-rates-grid';

        const pairsToShow = [
            { from: 'USD', to: 'RUB' },
            { from: 'EUR', to: 'RUB' },
            { from: 'CNY', to: 'RUB' },
            { from: 'EUR', to: 'USD' },
            { from: 'USD', to: 'KZT' },
            { from: 'USD', to: 'BYN' }
        ];

        pairsToShow.forEach(pair => {
            const rateFrom = currentRates[pair.from];
            const rateTo = currentRates[pair.to];
            if (rateFrom && rateTo) {
                const val = (1 / rateFrom) * rateTo;
                const card = document.createElement('div');
                card.className = 'currency-rate-item';
                card.innerHTML = `
                    <div class="currency-rate-pair">${pair.from} / ${pair.to}</div>
                    <div class="currency-rate-value">${val.toFixed(2)}</div>
                `;
                grid.appendChild(card);
            }
        });

        currencyRatesEl.appendChild(grid);
    }

    async function loadCurrency() {
        populateCurrencyDropdowns();
        showCurrencyMessage('');
        
        if (currencyRatesEl) {
            currencyRatesEl.innerHTML = '<div style="text-align: center; padding: 20px;" class="converter-sub">Loading rates...</div>';
        }

        try {
            const res = await fetch('https://open.er-api.com/v6/latest/USD');
            if (!res.ok) throw new Error('API fetch failed');
            const data = await res.json();
            
            if (data && data.rates) {
                currentRates = data.rates;
                localStorage.setItem('cachedRates', JSON.stringify({
                    rates: currentRates,
                    time: Date.now()
                }));
                
                if (currencyLastUpdateEl) {
                    const dateStr = new Date(data.time_last_update_unix * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const updateLabel = currentLang === 'ru' ? 'Последнее обновление' : 'Last update';
                    currencyLastUpdateEl.textContent = `${updateLabel}: ${dateStr}`;
                }
                
                showCurrencyMessage('');
                displayPopularRates();
                recalculateCurrency();
            } else {
                throw new Error('Invalid data format');
            }
        } catch (e) {
            console.error('Failed to load currency rates:', e);
            
            const cached = localStorage.getItem('cachedRates');
            if (cached) {
                try {
                    const parsed = JSON.parse(cached);
                    currentRates = parsed.rates;
                    const dateStr = new Date(parsed.time).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                    
                    if (currencyLastUpdateEl) {
                        currencyLastUpdateEl.textContent = translations[currentLang]?.offline || 'Offline';
                    }
                    
                    showCurrencyMessage(
                        currentLang === 'ru' 
                            ? `Показаны сохранённые курсы от ${dateStr}` 
                            : `Displaying cached rates from ${dateStr}`, 
                        false
                    );
                    displayPopularRates();
                    recalculateCurrency();
                    return;
                } catch (_) {}
            }
            
            if (currencyRatesEl) {
                currencyRatesEl.innerHTML = '';
                const errorBlock = document.createElement('div');
                errorBlock.className = 'currency-error-block';
                errorBlock.innerHTML = `
                    <div class="currency-error-icon"><span class="material-symbols-outlined" style="font-size: 2rem;">warning</span></div>
                    <div class="currency-error-text">
                        ${currentLang === 'ru' 
                            ? 'Не удалось загрузить курсы валют. Возможно, сервер временно недоступен или отсутствует интернет-соединение.' 
                            : 'Failed to load currency rates. The server might be unavailable or device is offline.'}
                    </div>
                    <button class="currency-error-btn" id="currency-refresh-from-error" style="margin-top: 8px;">
                        ${translations[currentLang]?.refresh || 'Refresh'}
                    </button>
                `;
                currencyRatesEl.appendChild(errorBlock);
                
                const errorRefreshBtn = errorBlock.querySelector('#currency-refresh-from-error');
                if (errorRefreshBtn) {
                    errorRefreshBtn.addEventListener('click', loadCurrency);
                }
            }
            if (currencyLastUpdateEl) {
                currencyLastUpdateEl.textContent = 'Connection failed';
            }
        }
    }

    if (currAmountEl) currAmountEl.addEventListener('input', recalculateCurrency);
    if (currFromEl) currFromEl.addEventListener('change', recalculateCurrency);
    if (currToEl) currToEl.addEventListener('change', recalculateCurrency);
    if (currSwapEl) {
        currSwapEl.addEventListener('click', () => {
            if (!currFromEl || !currToEl) return;
            const temp = currFromEl.value;
            currFromEl.value = currToEl.value;
            currToEl.value = temp;
            recalculateCurrency();
            currSwapEl.style.transform = 'rotate(180deg)';
            setTimeout(() => {
                currSwapEl.style.transform = '';
            }, 300);
        });
    }

    if (currencyBtn) currencyBtn.addEventListener('click', loadCurrency);
    loadCurrency();

    window.addEventListener('online', () => {
        updateToolsTranslations();
        loadCurrency();
    });
    window.addEventListener('offline', () => {
        updateToolsTranslations();
    });

    // Hub <-> Panel navigation
    const toolsHub = document.getElementById('tools-hub');
    const panelSettings = document.getElementById('tools-settings-panel');
    const panelConverter = document.getElementById('tools-converter-panel');
    const panelCurrency = document.getElementById('tools-currency-panel');
    const panelAi = document.getElementById('tools-ai-panel');
    const panelTranslator = document.getElementById('tools-translator-panel');
    const panelGenpass = document.getElementById('tools-genpass-panel');

    let aiAssistantApi = null;
    if (typeof SmartStudyAI !== 'undefined') {
        aiAssistantApi = SmartStudyAI.init({
            onBack: () => showHub()
        });
    }

    function showHub() {
        if (toolsHub) toolsHub.classList.remove('hidden');
        [panelSettings, panelConverter, panelCurrency, panelAi, panelTranslator, panelGenpass].forEach(p => p && p.classList.add('hidden'));
        updateToolsTranslations();
    }

    function openPanel(name) {
        if (toolsHub) toolsHub.classList.add('hidden');
        [panelSettings, panelConverter, panelCurrency, panelAi, panelTranslator, panelGenpass].forEach(p => p && p.classList.add('hidden'));
        if (name === 'settings' && panelSettings) panelSettings.classList.remove('hidden');
        if (name === 'converter' && panelConverter) panelConverter.classList.remove('hidden');
        if (name === 'currency' && panelCurrency) panelCurrency.classList.remove('hidden');
        if (name === 'ai' && panelAi) {
            panelAi.classList.remove('hidden');
            aiAssistantApi?.onPanelOpen?.();
        }
        if (name === 'translator' && panelTranslator) {
            panelTranslator.classList.remove('hidden');
            if (typeof SmartTranslator !== 'undefined') SmartTranslator.init();
        }
        if (name === 'genpass' && panelGenpass) {
            panelGenpass.classList.remove('hidden');
        }
        updateToolsTranslations();
        // trigger currency load when opening currency panel
        if (name === 'currency') loadCurrency();
        // ensure conversion recalculation
        if (name === 'converter') doConvert && doConvert();
    }

    document.getElementById('tile-settings')?.addEventListener('click', () => openPanel('settings'));
    document.getElementById('tile-converter')?.addEventListener('click', () => openPanel('converter'));
    document.getElementById('tile-currency')?.addEventListener('click', () => openPanel('currency'));
    document.getElementById('tile-ai')?.addEventListener('click', () => openPanel('ai'));
    document.getElementById('tile-translator')?.addEventListener('click', () => openPanel('translator'));
    document.getElementById('tile-genpass')?.addEventListener('click', () => openPanel('genpass'));

    document.querySelectorAll('.panel-back').forEach(btn => btn.addEventListener('click', () => showHub()));

    // start with hub visible
    showHub();
}

// --- 1. SETTINGS COMPONENT ---
class SettingsComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.renderComponent();
    }
    
    renderComponent() {
        this.shadowRoot.innerHTML = `
            <link rel="stylesheet" href="material-symbols/outlined.css">
            <style>
                .material-symbols-outlined {
                    font-size: 24px;
                    line-height: 1;
                    display: inline-block;
                    white-space: nowrap;
                    vertical-align: middle;
                    -webkit-font-smoothing: antialiased;
                    font-feature-settings: "liga";
                    font-variation-settings: "FILL" 0, "wght" 400, "GRAD" 0, "opsz" 24;
                }
                .settings-container { max-width: 500px; margin: 0 auto; padding: 2.5rem; }
                .setting-section { margin-bottom: 2.5rem; }
                .setting-section:last-child { margin-bottom: 0; }
                h3 { margin: 0 0 1.5rem 0; font-size: 1.5rem; font-weight: 700; color: var(--text-color); border-bottom: 2px solid var(--primary-accent); padding-bottom: 1rem; text-shadow: 0 0 5px var(--glow-color-primary); }
                .switcher { display: flex; gap: 1rem; border-radius: 12px; background: var(--background-color); padding: 0.5rem; }
                .switcher button { flex-grow: 1; padding: 1rem; border: none; border-radius: 8px; background: transparent; color: var(--text-color-secondary); font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
                .switcher button.active { background: var(--primary-accent); color: #fff; box-shadow: 0 0 15px var(--glow-color-primary); }
                
                /* Language Dropdown Button */
                .language-button {
                    background: var(--component-background);
                    border: 1px solid color-mix(in srgb, var(--primary-accent) 60%, transparent);
                    border-radius: 12px;
                    padding: 1rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    min-width: 180px;
                    box-sizing: border-box;
                    font-size: 1rem;
                    font-weight: 600;
                    color: var(--text-color);
                    outline: none;
                    box-shadow: 0 6px 16px var(--shadow-color-lift);
                }
                .language-button:hover { 
                    background-color: color-mix(in srgb, var(--component-background) 80%, var(--background-color)); 
                    transform: translateY(-2px);
                    box-shadow: 0 4px 15px var(--glow-color-primary);
                }
                .language-button .arrow { 
                    font-size: 1.2rem; 
                    color: var(--primary-accent); 
                    transition: transform 0.3s ease;
                }
                .language-button.open .arrow { 
                    transform: rotate(180deg);
                }
                .language-dropdown-wrapper { position: relative; }
                /* Language Dropdown Menu */
                .language-dropdown-menu {
                    position: absolute; /* Floating behavior */
                    top: 100%;
                    left: 0;
                    width: 100%;
                    background: color-mix(in srgb, var(--component-background) 70%, var(--background-color));
                    border-radius: 12px;
                    box-shadow: 0 8px 20px var(--shadow-color-deep);
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(-10px);
                    transition: all 0.3s ease;
                    z-index: 2000;
                    padding: 1rem;
                    box-sizing: border-box; /* Ensures padding is included in width */
                    margin-top: 0.5rem; /* Space between button and menu */
                    list-style: none;
                    margin: 0;
                    border: 1px solid color-mix(in srgb, var(--primary-accent) 60%, transparent);
                    max-height: 220px;
                    overflow-y: auto;
                    overscroll-behavior: contain;
                }
                .language-dropdown-menu.open {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }
                .language-dropdown-menu::-webkit-scrollbar {
                    width: 8px;
                }
                .language-dropdown-menu::-webkit-scrollbar-track {
                    background: transparent;
                }
                .language-dropdown-menu::-webkit-scrollbar-thumb {
                    background: color-mix(in srgb, var(--primary-accent) 55%, rgba(0,0,0,0.18));
                    border-radius: 999px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .language-bottom-sheet h3 {
                    margin: 0 0 1.5rem 0;
                    text-align: center;
                }
                .language-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                    overflow-y: auto;
                    max-height: 220px;
                    flex-grow: 1;
                    scrollbar-width: thin;
                    scrollbar-color: color-mix(in srgb, var(--primary-accent) 55%, rgba(0,0,0,0.18)) transparent;
                }
                .language-list::-webkit-scrollbar {
                    width: 8px;
                }
                .language-list::-webkit-scrollbar-track {
                    background: transparent;
                }
                .language-list::-webkit-scrollbar-thumb {
                    background: color-mix(in srgb, var(--primary-accent) 55%, rgba(0,0,0,0.18));
                    border-radius: 999px;
                    border: 2px solid transparent;
                    background-clip: content-box;
                }
                .language-list-item {
                    padding: 1.2rem 1rem;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: background-color 0.3s;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid transparent;
                }
                .language-list-item:hover { 
                    background-color: color-mix(in srgb, var(--background-color) 85%, var(--primary-accent));
                    border-color: color-mix(in srgb, var(--primary-accent) 60%, transparent);
                }
                .language-list-item.active {
                    background-color: var(--primary-accent);
                    color: white;
                    border-color: color-mix(in srgb, var(--primary-accent) 80%, white);
                }
                .language-list-item.active .check-mark {
                    display: block;
                }
                .check-mark { display: none; }
                .sheet-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background: rgba(0,0,0,0.6);
                    backdrop-filter: blur(5px);
                    z-index: 1999;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.4s;
                }
                .sheet-backdrop.open {
                    opacity: 1;
                    pointer-events: auto;
                }

                /* Unified Sign-In Button Styles */
                .auth-section { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid color-mix(in srgb, var(--primary-accent) 10%, transparent); display: flex; flex-direction: column; gap: 10px; }
                .google-signin-btn, .github-signin-btn {
                    width: 100%;
                    padding: 12px 20px;
                    border: 1px solid #d0d0d0;
                    background: #ffffff;
                    color: var(--text-color);
                    border-radius: 10px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.18s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    box-shadow: 0 2px 6px rgba(0,0,0,0.06);
                    font-family: 'Poppins', sans-serif;
                    position: relative;
                    overflow: visible;
                }
                .google-signin-btn:hover, .github-signin-btn:hover {
                    transform: translateY(-1px);
                    box-shadow: 0 6px 16px rgba(0,0,0,0.08);
                }
                .google-signin-btn:active, .github-signin-btn:active { transform: translateY(0); }

                /* Icon on the left, centered label */
                .auth-btn-icon-svg { position: absolute; left: 14px; width: 20px; height: 20px; flex-shrink: 0; }
                .auth-btn-label { display: block; width: 100%; text-align: center; }

                .accounts-linked-intro {
                    margin: 0 0 0.65rem;
                    font-size: 0.8rem;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.05em;
                    color: var(--text-color-secondary);
                    text-align: left;
                }
                .linked-providers-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                .linked-provider-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                    padding: 0.65rem 0.75rem;
                    border-radius: 10px;
                    border: 1px solid color-mix(in srgb, var(--primary-accent) 35%, transparent);
                    background: color-mix(in srgb, var(--primary-accent) 6%, var(--component-background));
                }
                .linked-provider-info {
                    display: flex;
                    align-items: center;
                    gap: 0.6rem;
                    min-width: 0;
                }
                .linked-provider-icon {
                    width: 36px;
                    height: 36px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex-shrink: 0;
                }
                .linked-provider-icon--google { background: #fff; }
                .linked-provider-icon--github {
                    background: linear-gradient(135deg, #1f1f1f, #333);
                    color: #e8e8e8;
                }
                .linked-provider-icon--apple {
                    background: linear-gradient(135deg, #FF2E00, #DD0000);
                    color: #fff;
                }
                .linked-provider-icon-svg { width: 18px; height: 18px; }
                .linked-provider-name {
                    font-size: 0.9rem;
                    font-weight: 600;
                    color: var(--text-color);
                }
                .unlink-provider-btn {
                    flex-shrink: 0;
                    padding: 0.4rem 0.75rem;
                    border-radius: 8px;
                    border: 1px solid color-mix(in srgb, var(--secondary-accent) 50%, transparent);
                    background: transparent;
                    color: var(--text-color-secondary);
                    font-size: 0.78rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    font-family: 'Poppins', sans-serif;
                }
                .unlink-provider-btn:hover {
                    color: var(--text-color);
                    border-color: var(--secondary-accent);
                    box-shadow: 0 0 12px var(--glow-color-secondary);
                }

                .auth-action-btn { position: relative; }
                .auth-action-btn.is-loading {
                    pointer-events: none;
                    opacity: 0.88;
                }
                .auth-action-btn.is-loading svg,
                .auth-action-btn.is-loading span {
                    visibility: hidden;
                }
                .google-signin-btn.is-loading::after,
                .github-signin-btn.is-loading::after,
                .apple-signin-btn.is-loading::after,
                .unlink-provider-btn.is-loading::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    margin: auto;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2px solid color-mix(in srgb, var(--primary-accent) 25%, transparent);
                    border-top-color: var(--primary-accent);
                    animation: auth-btn-spin 0.7s linear infinite;
                }
                @keyframes auth-btn-spin {
                    to { transform: rotate(360deg); }
                }

                .accounts-linked-note {
                    margin: 0;
                    padding: 0.75rem 1rem;
                    font-size: 0.85rem;
                    line-height: 1.45;
                    text-align: center;
                    color: var(--text-color-secondary);
                    border-radius: 10px;
                    border: 1px solid color-mix(in srgb, var(--primary-accent) 40%, transparent);
                    background: color-mix(in srgb, var(--primary-accent) 8%, var(--component-background));
                    box-shadow: 0 0 12px color-mix(in srgb, var(--primary-accent) 18%, transparent);
                }
                
                .user-info { 
                    background: var(--background-color); 
                    padding: 1.5rem; 
                    border-radius: 10px; 
                    margin-bottom: 1rem;
                    border: 1px solid var(--primary-accent);
                    color: var(--text-color);
                }
                .user-info p { margin: 0.5rem 0; font-size: 0.95rem; }
                .user-info strong { color: var(--primary-accent); }
                
                .signout-btn { 
                    width: 100%; 
                    padding: 10px 20px; 
                    background: transparent;
                    color: var(--primary-accent); 
                    border: 2px solid var(--primary-accent);
                    border-radius: 8px; 
                    font-size: 0.95rem; 
                    font-weight: 600; 
                    cursor: pointer; 
                    transition: all 0.3s ease;
                }
                .signout-btn:hover { 
                    background: var(--primary-accent);
                    color: white;
                }

                /* AI Extensions section styling */
                .extensions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.25rem;
                    background: var(--component-background);
                    padding: 1.5rem;
                    border-radius: 16px;
                    border: 1px solid color-mix(in srgb, var(--primary-accent) 20%, transparent);
                    box-shadow: 0 8px 24px var(--shadow-color-lift);
                    margin-top: 0.5rem;
                }
                .extension-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                    padding-bottom: 1.25rem;
                    border-bottom: 1px solid color-mix(in srgb, var(--text-color) 10%, transparent);
                }
                .extension-row:last-child {
                    padding-bottom: 0;
                    border-bottom: none;
                }
                .extension-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-grow: 1;
                }
                .extension-icon {
                    width: 44px;
                    height: 44px;
                    border-radius: 10px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid color-mix(in srgb, var(--primary-accent) 15%, transparent);
                    flex-shrink: 0;
                    transition: all 0.3s ease;
                }
                .extension-row:hover .extension-icon {
                    transform: scale(1.08);
                    border-color: var(--primary-accent);
                    box-shadow: 0 0 10px color-mix(in srgb, var(--primary-accent) 30%, transparent);
                }
                .extension-icon-symbol {
                    font-size: 26px !important;
                    width: 1em;
                    height: 1em;
                    line-height: 1;
                    overflow: hidden;
                    flex-shrink: 0;
                    transition: transform 0.3s ease;
                }
                .gmail-icon { color: #EA4335; }
                .drive-icon { color: #0F9D58; }
                .docs-icon { color: #4285F4; }
                .keep-icon { color: #F4B400; }
                .calendar-icon { color: #4285F4; }
                .tasks-icon { color: #4285F4; }
                .youtube-icon { color: #FF0000; }
                .extension-row:hover .extension-icon-symbol {
                    transform: scale(1.15);
                }
                .extension-text {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                .extension-title {
                    font-size: 1.05rem;
                    font-weight: 600;
                    color: var(--text-color);
                }
                .extension-desc {
                    font-size: 0.82rem;
                    color: var(--text-color-secondary);
                    line-height: 1.3;
                }
                .premium-switch {
                    position: relative;
                    display: inline-block;
                    width: 46px;
                    height: 26px;
                    flex-shrink: 0;
                }
                .premium-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                .premium-switch .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: color-mix(in srgb, var(--text-color) 20%, transparent);
                    transition: .3s;
                    border-radius: 34px;
                }
                .premium-switch .slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 3px;
                    bottom: 3px;
                    background-color: white;
                    transition: .3s;
                    border-radius: 50%;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                }
                .premium-switch input:checked + .slider {
                    background-color: var(--primary-accent);
                }
                .premium-switch input:checked + .slider:before {
                    transform: translateX(20px);
                }
                .premium-switch input:focus + .slider {
                    box-shadow: 0 0 1px var(--primary-accent);
                }
            </style>
            <div class="settings-container">
                <h2 data-i18n="settings">Настройки</h2>
                <div class="setting-section">
                    <h3 data-i18n="theme">Тема</h3>
                    <div class="switcher theme-switcher">
                         <button id="theme-light" data-i18n="light">Светлая</button>
                         <button id="theme-dark" data-i18n="dark">Темная</button>
                    </div>
                </div>
                <div class="setting-section">
                    <h3 data-i18n="language">Язык</h3>
                    <div class="language-dropdown-wrapper">
                        <button class="language-button" id="language-selector">
                            <span id="current-language-name">Русский</span>
                            <span class="arrow">▼</span>
                        </button>
                        <ul class="language-dropdown-menu" id="language-list">
                            <!-- Language items will be injected here -->
                        </ul>
                    </div>
                </div>
                <div class="setting-section">
                    <h3 data-i18n="gradingSystem">Grading System</h3>
                    <div class="switcher grading-switcher">
                         <button id="grading-5-point" data-i18n="5Point">5-Point (RU)</button>
                         <button id="grading-us-letter" data-i18n="letterGrades">Letter Grades (US)</button>
                    </div>
                </div>
                <div class="auth-section" id="auth-container">
                    <h3 style="font-size: 1.2rem; border: none; padding-bottom: 0.5rem;">Authentication</h3>
                    <div id="auth-content"></div>
                </div>
            </div>
        `;
        this.setupTheme();
        this.setupLang();
        this.setupGradingSystem();
        updateAuthUI(); // Initial call to set auth state
    }
    
    connectedCallback() {
        this.renderComponent();
        updateTranslations();
        this.updateThemeButtons();
    }
    
    setupTheme() { 
        const lightBtn = this.shadowRoot.querySelector('#theme-light'); 
        const darkBtn = this.shadowRoot.querySelector('#theme-dark'); 
        lightBtn.addEventListener('click', () => { setTheme('light'); this.updateThemeButtons(); }); 
        darkBtn.addEventListener('click', () => { setTheme('dark'); this.updateThemeButtons(); }); 
        this.updateThemeButtons(); 
    }
    
    updateThemeButtons() { 
        const isDark = document.body.classList.contains('dark-theme'); 
        this.shadowRoot.querySelector('#theme-dark').classList.toggle('active', isDark); 
        this.shadowRoot.querySelector('#theme-light').classList.toggle('active', !isDark); 
    }
    
    setupLang() {
        this.langSelector = this.shadowRoot.querySelector('#language-selector');
        this.langList = this.shadowRoot.querySelector('#language-list');
        
        this.langSelector.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent click from bubbling to document
            this._toggleLangMenu();
        });
        
        // Close dropdown if clicking outside of it
        document.addEventListener('click', () => this._toggleLangMenu(false));
        
        this.populateLanguageList();
        this.updateLangUI();
    }
    
    _toggleLangMenu(forceState) {
        const isOpen = typeof forceState === 'boolean'
            ? forceState
            : !this.langList.classList.contains('open');
        this.langList.classList.toggle('open', isOpen);
        this.langSelector.classList.toggle('open', isOpen);
    }

    populateLanguageList() {
        this.langList.innerHTML = '';
        for (const langCode in translations) {
            const langName = translations[langCode].languageName;
            const li = document.createElement('li');
            li.className = 'language-list-item';
            li.dataset.lang = langCode;
            li.innerHTML = `
                <span>${langName}</span>
                <span class="check-mark">✓</span>
            `;
            li.addEventListener('click', () => {
                setLanguage(langCode);
                this.updateLangUI();
                this._toggleLangMenu(false);
            });
            this.langList.appendChild(li);
        }
    }

    updateLangUI() {
        // Update the main button text
        const currentLangName = translations[currentLang].languageName;
        this.shadowRoot.querySelector('#current-language-name').textContent = currentLangName;

        // Update active item in the list
        this.shadowRoot.querySelectorAll('.language-list-item').forEach(item => {
            item.classList.toggle('active', item.dataset.lang === currentLang);
        });
    }

    updateLangButtons() {
        this.updateLangUI();
    }

    setupGradingSystem() {
        const fivePointBtn = this.shadowRoot.querySelector('#grading-5-point');
        const usLetterBtn = this.shadowRoot.querySelector('#grading-us-letter');
        const gradeCalc = document.querySelector('grade-average-calculator');

        fivePointBtn.addEventListener('click', () => {
            if (gradeCalc) {
                gradeCalc.setGradingSystem('5-point');
                this.updateGradingSystemButtons();
            }
        });
        usLetterBtn.addEventListener('click', () => {
            if (gradeCalc) {
                gradeCalc.setGradingSystem('us-letter');
                this.updateGradingSystemButtons();
            }
        });
        this.updateGradingSystemButtons();
    }

    updateGradingSystemButtons() {
        const gradeCalc = document.querySelector('grade-average-calculator');
        if (!gradeCalc) return;

        const isUS = gradeCalc.gradingSystem === 'us-letter';
        this.shadowRoot.querySelector('#grading-us-letter').classList.toggle('active', isUS);
        this.shadowRoot.querySelector('#grading-5-point').classList.toggle('active', !isUS);
    }
}
customElements.define('settings-component', SettingsComponent);


// --- 2. SMART CALCULATOR (DUAL MODE) ---
class SmartCalculator extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.isFractionMode = false;
        this.shadowRoot.innerHTML = `
            <style>
                /* General Container */
                .calculator-container { background: var(--component-background); border-radius: 20px; padding: 1rem; box-shadow: 0 10px 40px var(--shadow-color-deep); border: 1px solid var(--shadow-color-lift); }
                .calc-header { display: flex; justify-content: space-between; align-items: center; padding: 0 1rem 1rem 1rem; }
                .calc-header h2 { margin: 0; font-size: 1.8rem; }
                #mode-toggle { background: none; border: none; cursor: pointer; color: var(--text-color); padding: 0.5rem; }
                #mode-toggle svg { width: 28px; height: 28px; } 
                .calc-view { display: none; } 
                .calc-view.active { display: block; animation:-fade-in 0.3s; } 
                @keyframes-fade-in{from{opacity:0}to{opacity:1}}

                /* Standard Calculator */
                #display { width: 100%; border: none; background: var(--background-color); color: var(--text-color); font-size: clamp(2rem, 8vw, 3.5rem); font-weight: 700; text-align: right; padding: 1rem; border-radius: 12px; margin-bottom: 1rem; box-sizing: border-box; }
                #display:focus { outline: 2px solid var(--primary-accent); }
                #result-display { text-align: right; color: var(--text-color-secondary); font-size: 1.5rem; height: 30px; margin-bottom: 0.5rem; padding-right: 1rem; }
                #buttons-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; }
                .calc-button { height: 65px; border-radius: 15px; border: none; font-size: 1.5rem; font-weight: 600; cursor: pointer; background: var(--background-color); color: var(--text-color); transition: all 0.2s; box-shadow: 0 4px 8px var(--shadow-color-lift); }
                .calc-button:hover { transform: translateY(-2px); box-shadow: 0 6px 12px var(--shadow-color-deep); }
                .calc-button.operator { color: var(--primary-accent); font-size: 1.8rem; }
                .calc-button.clear { color: var(--secondary-accent); }
                .calc-button.equals { grid-column: span 4; background: var(--primary-accent); color: white; box-shadow: 0 4px 15px var(--glow-color-primary); }

                /* Fraction Calculator */
                .fraction-calc-body { padding: 1rem; display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
                .fraction-input-area { display: flex; align-items: center; justify-content: center; gap: 1rem; flex-wrap: wrap; }
                .fraction-input { display: flex; align-items: center; gap: 0.5rem; }
                .fraction-input input { background: var(--background-color); color: var(--text-color); border: 1px solid var(--shadow-color-lift); border-radius: 8px; text-align: center; font-size: 1.5rem; font-weight: 600; }
                .fraction-input input.whole { width: 50px; }
                .fraction-part { display: flex; flex-direction: column; align-items: center; }
                .fraction-part input { width: 60px; }
                .fraction-part span { background: var(--text-color); height: 2px; width: 60px; margin: 2px 0; }
                .op-selector { display: flex; gap: 0.5rem; }
                .op-selector button { font-size: 2rem; width: 50px; height: 50px; border-radius: 50%; border:none; background: var(--background-color); color: var(--primary-accent); }
                .op-selector button.selected { background: var(--primary-accent); color: white; }
                #fraction-calculate-btn { width: 100%; max-width: 300px; padding: 1rem; font-size: 1.5rem; background: var(--primary-accent); color: white; border-radius: 12px; border: none; box-shadow: 0 4px 15px var(--glow-color-primary); }
                #fraction-result-area { margin-top: 1rem; text-align: center; }
                #fraction-result { font-size: 2.5rem; font-weight: 700; }
                #decimal-result { font-size: 1.2rem; color: var(--text-color-secondary); }
                #steps-output { margin-top: 1rem; text-align: left; background: var(--background-color); padding: 0.75rem; border-radius: 8px; max-height: 180px; overflow: auto; font-size: 0.95rem; color: var(--text-color); border: 1px solid var(--shadow-color-lift); }
            </style>

            <div class="calculator-container">
                <div class="calc-header">
                    <h2 data-i18n="calculator">Калькулятор</h2>
                    <button id="mode-toggle"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h18M3 6h18M3 18h18"/></svg></button>
                </div>

                <!-- Standard Calculator View -->
                <div id="standard-view" class="calc-view active">
                    <div id="result-display"></div>
                    <input type="text" id="display" placeholder="0">
                    <div id="buttons-grid">
                        <button class="calc-button clear">C</button><button class="calc-button operator">(</button><button class="calc-button operator">)</button><button class="calc-button operator">÷</button>
                        <button class="calc-button">7</button><button class="calc-button">8</button><button class="calc-button">9</button><button class="calc-button operator">×</button>
                        <button class="calc-button">4</button><button class="calc-button">5</button><button class="calc-button">6</button><button class="calc-button operator">-</button>
                        <button class="calc-button">1</button><button class="calc-button">2</button><button class="calc-button">3</button><button class="calc-button operator">+</button>
                        <button class="calc-button" id="backspace">⌫</button><button class="calc-button">0</button><button class="calc-button">.</button><button class="calc-button operator">%</button>
                        <button class="calc-button equals">=</button>
                    </div>
                </div>

                <!-- Fraction Calculator View -->
                <div id="fraction-view" class="calc-view">
                    <div class="fraction-calc-body">
                        <div class="fraction-input-area">
                            <!-- First Fraction -->
                            <div class="fraction-input">
                                <input type="number" class="whole" id="w1" placeholder="">
                                <div class="fraction-part">
                                    <input type="number" id="n1" placeholder="">
                                    <span></span>
                                    <input type="number" id="d1" placeholder="">
                                </div>
                            </div>
                            <!-- Operator -->
                            <div class="op-selector">
                               <button data-op="+">+</button><button data-op="-">-</button><button data-op="*">×</button><button data-op="/">÷</button>
                            </div>
                            <!-- Second Fraction -->
                             <div class="fraction-input">
                                <input type="number" class="whole" id="w2" placeholder="">
                                <div class="fraction-part">
                                    <input type="number" id="n2" placeholder="">
                                    <span></span>
                                    <input type="number" id="d2" placeholder="">
                                </div>
                            </div>
                        </div>
                        <button id="fraction-calculate-btn">=</button>
                        <div id="fraction-result-area">
                            <div id="fraction-result"></div>
                            <div id="decimal-result"></div>
                            <div id="steps-output"></div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    connectedCallback() {
        this.standardView = this.shadowRoot.querySelector('#standard-view');
        this.fractionView = this.shadowRoot.querySelector('#fraction-view');
        this.shadowRoot.querySelector('#mode-toggle').addEventListener('click', () => this.toggleMode());
        
        // Standard Calc Init
        this.display = this.shadowRoot.querySelector('#display');
        this.resultDisplay = this.shadowRoot.querySelector('#result-display');
        this.shadowRoot.querySelector('#buttons-grid').addEventListener('click', e => this.handleButton(e));
        this.display.addEventListener('keydown', e => this.handleKeyboard(e));
        this.display.addEventListener('input', () => this.evaluate());

        // Fraction Calc Init
        this.opSelector = this.shadowRoot.querySelector('.op-selector');
        this.opSelector.addEventListener('click', e => this.selectOperator(e));
        this.shadowRoot.querySelector('#fraction-calculate-btn').addEventListener('click', () => this.calculateFraction());
    }

    toggleMode(){
        this.isFractionMode = !this.isFractionMode;
        this.standardView.classList.toggle('active', !this.isFractionMode);
        this.fractionView.classList.toggle('active', this.isFractionMode);
        const h2 = this.shadowRoot.querySelector('h2');
        if (this.isFractionMode) {
            h2.dataset.i18n = 'fractionCalculator';
        } else {
            h2.dataset.i18n = 'calculator';
        }
        h2.textContent = translations[currentLang][h2.dataset.i18n] || h2.dataset.i18n;
    }

    // --- Standard Calc Logic ---
    handleButton(e){if(e.target.tagName!=='BUTTON')return;this.display.focus();const t=e.target,n=t.textContent;t.classList.contains("clear")?(this.display.value="",this.resultDisplay.textContent=""):"backspace"===t.id?this.display.value=this.display.value.slice(0,-1):t.classList.contains("equals")?(this.display.value=this.resultDisplay.textContent,this.resultDisplay.textContent=""):(()=>{const e=this.display.selectionStart,t=this.display.value;this.display.value=t.slice(0,e)+n+t.slice(e),this.display.selectionStart=this.display.selectionEnd=e+1})(),this.evaluate()}
    handleKeyboard(e){const t=/^[0-9\.\+\-\*/\(\)%]$/;"Enter"===e.key?(e.preventDefault(),this.display.value=this.resultDisplay.textContent,this.resultDisplay.textContent=""):setTimeout(()=>this.evaluate(),0),t.test(e.key)||e.ctrlKey||e.metaKey||e.key.includes("Arrow")||e.key.includes("Backspace")||e.preventDefault()}
    evaluate(){let e=this.display.value;if(!e)return void(this.resultDisplay.textContent="");e=e.replace(/×/g,"*").replace(/÷/g,"/");try{const t=new Function("return "+e)();"number"==typeof t&&Number.isFinite(t)?this.resultDisplay.textContent=parseFloat(t.toPrecision(12)):this.resultDisplay.textContent=""}catch(e){this.resultDisplay.textContent=""}}
    
    // --- Fraction Calc Logic ---
    selectOperator(e){if(e.target.tagName!=='BUTTON')return;this.opSelector.querySelectorAll('button').forEach(e=>e.classList.remove("selected")),e.target.classList.add("selected"),this.selectedOp=e.target.dataset.op}

    _gcd(e,t){return t?this._gcd(t,e%t):e}
    _lcm(a,b){return Math.abs(a*b)/this._gcd(a,b)}

    generateFractionSteps(w1,n1,d1,w2,n2,d2,op){
        const num1 = w1*d1 + n1;
        const num2 = w2*d2 + n2;

        const fraction = (num, den) => `<div style="display: inline-flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; margin: 0 0.2rem;"><div style="font-size: 1.8rem; font-weight: 700; min-width: 45px; height: 1.8rem; display: flex; align-items: center; justify-content: center;">${num}</div><div style="border-top: 2px solid currentColor; width: 100%;"></div><div style="font-size: 1.8rem; font-weight: 700; min-width: 45px; height: 1.8rem; display: flex; align-items: center; justify-content: center;">${den}</div></div>`;

        let html = `<div style="background: rgba(0,122,255,0.08); border-left: 4px solid var(--primary-accent); border-radius: 8px; padding: 1.2rem; font-size: 1.1rem; display: flex; align-items: center; flex-wrap: wrap; gap: 0.3rem;">`;

        if(op === '+' || op === '-'){
            const lcm = this._lcm(d1,d2);
            const m1 = lcm / d1;
            const m2 = lcm / d2;
            const num1New = num1 * m1;
            const num2New = num2 * m2;
            const resNum = op === '+' ? num1New + num2New : num1New - num2New;
            const g = Math.abs(this._gcd(Math.abs(resNum), lcm));
            const reducedNum = resNum / g;
            const reducedDen = lcm / g;
            
            html += `
                ${fraction(num1, d1)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">${op}</span>
                ${fraction(num2, d2)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">=</span>
                ${fraction(num1New, lcm)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">${op}</span>
                ${fraction(num2New, lcm)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">=</span>
                ${fraction(resNum, lcm)}
                ${g > 1 ? `
                    <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">=</span>
                    ${fraction(reducedNum, reducedDen)}
                ` : ''}
            `;
        } else if(op === '*'){
            const resNum = num1 * num2;
            const resDen = d1 * d2;
            const g = Math.abs(this._gcd(Math.abs(resNum), resDen));
            const reducedNum = resNum / g;
            const reducedDen = resDen / g;
            
            html += `
                ${fraction(num1, d1)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">×</span>
                ${fraction(num2, d2)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">=</span>
                ${fraction(resNum, resDen)}
                ${g > 1 ? `
                    <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">=</span>
                    ${fraction(reducedNum, reducedDen)}
                ` : ''}
            `;
        } else if(op === '/'){
            const resNum = num1 * d2;
            const resDen = d1 * num2;
            const g = Math.abs(this._gcd(Math.abs(resNum), Math.abs(resDen)));
            const reducedNum = resNum / g;
            const reducedDen = Math.abs(resDen) / g;
            
            html += `
                ${fraction(num1, d1)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">÷</span>
                ${fraction(num2, d2)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">=</span>
                ${fraction(num1, d1)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">×</span>
                ${fraction(d2, num2)}
                <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">=</span>
                ${fraction(resNum, Math.abs(resDen))}
                ${g > 1 ? `
                    <span style="font-size: 1.6rem; font-weight: 600; color: var(--primary-accent); margin: 0 0.2rem;">=</span>
                    ${fraction(reducedNum, reducedDen)}
                ` : ''}
            `;
        }

        html += `</div>`;
        return html;
    }

    calculateFraction(){
        const w1El = this.shadowRoot.querySelector("#w1");
        const n1El = this.shadowRoot.querySelector("#n1");
        const d1El = this.shadowRoot.querySelector("#d1");
        const w2El = this.shadowRoot.querySelector("#w2");
        const n2El = this.shadowRoot.querySelector("#n2");
        const d2El = this.shadowRoot.querySelector("#d2");

        const stepsOut = this.shadowRoot.querySelector('#steps-output');
        if(!this.selectedOp || !d1El.value || !d2El.value){
            if(stepsOut) stepsOut.innerHTML = '';
            return;
        }

        const w1 = parseInt(w1El.value) || 0;
        const n1 = parseInt(n1El.value) || 0;
        const d1 = parseInt(d1El.value);
        const w2 = parseInt(w2El.value) || 0;
        const n2 = parseInt(n2El.value) || 0;
        const d2 = parseInt(d2El.value);

        if(d1 === 0 || d2 === 0) return;

        const num1 = w1 * d1 + n1;
        const num2 = w2 * d2 + n2;

        let resNum = 0, resDen = 1;
        switch(this.selectedOp){
            case '+': resNum = num1 * (this._lcm(d1,d2)/d1) + num2 * (this._lcm(d1,d2)/d2); resDen = this._lcm(d1,d2); break;
            case '-': resNum = num1 * (this._lcm(d1,d2)/d1) - num2 * (this._lcm(d1,d2)/d2); resDen = this._lcm(d1,d2); break;
            case '*': resNum = num1 * num2; resDen = d1 * d2; break;
            case '/': resNum = num1 * d2; resDen = d1 * num2; break;
        }

        if(resDen === 0) return;

        const g = Math.abs(this._gcd(Math.abs(resNum), Math.abs(resDen)));
        const reducedNum = g > 1 ? resNum / g : resNum;
        const reducedDen = g > 1 ? resDen / g : resDen;

        const whole = Math.trunc(reducedNum / reducedDen);
        const rem = Math.abs(reducedNum % reducedDen);

        let displayStr = '';
        if(rem === 0){
            displayStr = `${whole}`;
        } else if(whole === 0){
            displayStr = `${reducedNum}/${reducedDen}`;
        } else {
            displayStr = `${whole} <sup>${rem}</sup>/<sub>${reducedDen}</sub>`;
        }

        this.shadowRoot.querySelector("#fraction-result").innerHTML = displayStr;
        this.shadowRoot.querySelector("#decimal-result").textContent = `≈ ${(resNum / resDen).toFixed(4)}`;

        if(stepsOut) stepsOut.innerHTML = this.generateFractionSteps(w1,n1,d1,w2,n2,d2,this.selectedOp);
    }
}
customElements.define('smart-calculator', SmartCalculator);


// --- 3. GRADE AVERAGE CALCULATOR COMPONENT ---
class GradeAverageCalculator extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.subjects = {};
        this.quickCalcGrades = []; // Separate array for local-only quick calculation
        
        this.gradingSystem = '5-point'; // '5-point' or 'us-letter'
        this.gradeMap = { 'A': 4, 'B': 3, 'C': 2, 'D': 1, 'F': 0 };

        this.thresholds = {
            '5-point': { 5: 4.50, 4: 3.50, 3: 2.50 },
            'us-letter': { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'F': 0 }
        };
        this.targetGrade = 5;

        this.currentSubject = '__QUICK_CALC__'; // Special key for quick calc mode
        this.simulatedGrade = null;
        this.render();
    }
    
    // This listener is no longer needed here, handled globally
    // setupAuthListener() {}
    
    saveToDatabase() {
        if (!currentUser || !window.firebase || !window.firebase.database) return;
        const uid = currentUser.uid;

        const subjectsToSave = { ...this.subjects };
        delete subjectsToSave['__QUICK_CALC__'];

        const dataToSave = {
            subjects: subjectsToSave,
            settings: {
                gradingSystem: this.gradingSystem,
                thresholds: this.thresholds
            }
        };

        const userRef = window.firebase.database().ref(`users/${uid}`);
        const save = () => userRef.set(dataToSave)
            .then(() => console.log('✅ Data saved to Firebase.'))
            .catch((e) => console.error('❌ Error saving data:', e));

        if (typeof currentUser.getIdToken === 'function') {
            currentUser.getIdToken(true).then(save).catch(save);
        } else {
            save();
        }
    }

    setGradingSystem(system) {
        if (system === this.gradingSystem) return;
        this.gradingSystem = system;
        this.saveToDatabase();
        this.update();
        // Also update the settings component buttons
        const settingsComp = document.querySelector('settings-component');
        if (settingsComp) {
            settingsComp.updateGradingSystemButtons();
        }
    }
    
    addGradeToSubject(subjectName, grade) {
        const gradeToAdd = this.gradingSystem === '5-point' ? Number(grade) : grade;
        if (subjectName === '__QUICK_CALC__') {
            this.quickCalcGrades.push(gradeToAdd);
        } else {
            if (!this.subjects[subjectName]) {
                this.subjects[subjectName] = [];
            }
            this.subjects[subjectName].push(gradeToAdd);
            this.saveToDatabase();
        }
        this.update();
    }
    
    deleteSubject(subjectName) {
        if (subjectName === '__QUICK_CALC__') return; // Cannot delete quick calc
        delete this.subjects[subjectName];
        if (this.currentSubject === subjectName) {
            this.currentSubject = '__QUICK_CALC__'; // Fallback to quick calc
        }
        this.saveToDatabase();
        this.update();
    }
    
    calculateAverageForSubject(subjectName) {
        const grades = (subjectName === '__QUICK_CALC__') ? this.quickCalcGrades : this.subjects[subjectName];
        if (!grades || grades.length === 0) return 0;

        if (this.gradingSystem === '5-point') {
            return (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2);
        } else { // us-letter
            const totalPoints = grades.reduce((acc, grade) => acc + (this.gradeMap[grade] || 0), 0);
            return (totalPoints / grades.length).toFixed(2);
        }
    }
    
    calculateGlobalAverage() {
        const allGrades = Object.values(this.subjects).flat();
        if (allGrades.length === 0) return 0;
        return (allGrades.reduce((a, b) => a + b, 0) / allGrades.length).toFixed(2);
    }

    render() {
        this.shadowRoot.innerHTML = `
            <style>
                .grades-body { 
                    background: var(--component-background); 
                    border-radius: 20px; 
                    padding: 2.5rem; 
                    box-shadow: 0 10px 30px var(--shadow-color-deep); 
                    border: 1px solid var(--primary-accent); 
                }
                h2 { margin: 0 0 2rem 0; text-shadow: 0 0 5px var(--glow-color-primary); }

                /* TABS */
                .tabs {
                    display: flex;
                    justify-content: center;
                    gap: 0.5rem;
                    padding: 0;
                    margin-bottom: 2rem;
                    border-bottom: 2px solid var(--shadow-color-lift);
                }
                .tab-btn { 
                    background: none; 
                    border: none; 
                    padding: 0.8rem 0.75rem; 
                    color: var(--text-color-secondary); 
                    font-size: 0.95rem; 
                    font-weight: 600; 
                    cursor: pointer; 
                    border-bottom: 3px solid transparent;
                    transition: all 0.3s;
                    white-space: nowrap;
                }
                .tab-btn.active { 
                    color: var(--primary-accent); 
                    border-bottom-color: var(--primary-accent);
                }
                .tab-btn:hover { color: var(--text-color); }

                /* TAB CONTENT */
                .tab-content { display: none; }
                .tab-content.active { display: block; animation: fadeIn 0.3s; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

                /* INPUT TAB */
                #result-container { 
                    background: var(--background-color); 
                    border-radius: 12px; 
                    padding: 2rem; 
                    margin-bottom: 2rem; 
                    border: 1px solid var(--shadow-color-lift);
                    text-align: center;
                }
                #result-label { 
                    color: var(--text-color-secondary); 
                    font-size: 1.1rem; 
                    font-weight: 600; 
                    margin-bottom: 0.8rem;
                }
                #result { 
                    color: var(--primary-accent); 
                    font-size: 4rem; 
                    font-weight: 700; 
                    min-height: 60px; 
                    line-height: 60px;
                    text-shadow: 0 0 10px var(--glow-color-primary);
                }

                /* PROGRESS BAR */
                .progress-wrapper {
                    margin: 1.5rem 0;
                    text-align: center;
                }
                .progress-bar {
                    width: 100%;
                    height: 12px;
                    background: var(--background-color);
                    border-radius: 12px;
                    overflow: hidden;
                    border: 1px solid var(--shadow-color-lift);
                    margin: 0.5rem 0;
                }
                .progress-fill {
                    height: 100%;
                    background: linear-gradient(90deg, var(--primary-accent), var(--secondary-accent));
                    width: 0%;
                    transition: width 0.3s;
                    box-shadow: 0 0 10px var(--glow-color-primary);
                }
                .progress-text { 
                    font-size: 0.9rem; 
                    color: var(--text-color-secondary); 
                    margin-top: 0.5rem;
                }

                #grades-list { 
                    list-style: none; 
                    padding: 0; 
                    margin: 2rem 0; 
                    display: flex; 
                    flex-wrap: wrap; 
                    gap: 12px; 
                    justify-content: center; 
                    min-height: 40px; 
                }
                #grades-list li { 
                    position: relative;
                    background: var(--background-color); 
                    color: var(--text-color); 
                    padding: 0.75rem 2.5rem 0.75rem 1.5rem; 
                    border-radius: 30px; 
                    font-weight: 700; 
                    font-size: 1.2rem; 
                    border: 1px solid var(--shadow-color-lift); 
                    box-shadow: 0 2px 5px var(--shadow-color-lift); 
                    animation: slideIn 0.2s;
                    display: flex;
                    align-items: center;
                }
                .delete-grade-btn {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    width: 24px;
                    height: 24px;
                    background: #ff5c5c;
                    color: white;
                    border: none;
                    border-radius: 50%;
                    cursor: pointer;
                    font-weight: bold;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                    line-height: 1;
                    opacity: 0.7;
                    transition: opacity 0.2s, background 0.2s;
                }
                .delete-grade-btn:hover {
                    background: #ff3b3b;
                    opacity: 1;
                }
                @keyframes slideIn { from { transform: scale(0.8); opacity: 0; } to { transform: scale(1); opacity: 1; } }

                .controls { 
                    display: grid; 
                    grid-template-columns: repeat(3, 1fr); 
                    gap: 1rem; 
                    margin-bottom: 1rem;
                }
                .controls button { 
                    height: 70px; 
                    border-radius: 50px; 
                    border: none; 
                    font-size: 1.8rem; 
                    font-weight: 600; 
                    cursor: pointer; 
                    background: var(--component-background); 
                    color: var(--text-color); 
                    transition: all 0.2s; 
                    box-shadow: 0 4px 10px var(--shadow-color-lift); 
                }
                .controls button:hover { 
                    transform: translateY(-4px); 
                    box-shadow: 0 8px 15px var(--shadow-color-deep); 
                }
                .controls button.action { 
                    background-color: var(--secondary-accent); 
                    color: white; 
                    font-size: 2rem; 
                    box-shadow: 0 4px 15px var(--glow-color-secondary); 
                }
                #clear-grades { 
                    grid-column: span 3; 
                    background: var(--primary-accent); 
                    box-shadow: 0 4px 15px var(--glow-color-primary); 
                    color: white; 
                }

                /* STRATEGY TAB */
                .strategy-section {
                    background: var(--background-color);
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--shadow-color-lift);
                }
                .strategy-section h3 {
                    margin: 0 0 1rem 0;
                    color: var(--primary-accent);
                    font-size: 1.1rem;
                }
                .strategy-box {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .strategy-box label {
                    min-width: 120px;
                    font-weight: 600;
                    color: var(--text-color);
                }
                #target-select {
                    background: var(--component-background);
                    color: var(--text-color);
                    padding: 0.5rem 1rem;
                    border-radius: 8px;
                    border: 1px solid var(--primary-accent);
                    font-family: inherit;
                    font-weight: 600;
                    cursor: pointer;
                }

                #strategy-verdict {
                    background: var(--component-background);
                    padding: 1rem;
                    border-radius: 12px;
                    font-weight: 600;
                    font-size: 1rem;
                    color: var(--primary-accent);
                    min-height: 2em;
                    line-height: 1.5;
                    border-left: 4px solid var(--primary-accent);
                }

                .strategy-variants {
                    display: flex;
                    flex-direction: column;
                    gap: 0.8rem;
                }
                .variant-item {
                    background: var(--component-background);
                    padding: 1rem;
                    border-radius: 8px;
                    border: 1px solid var(--shadow-color-lift);
                    font-size: 0.95rem;
                }
                .variant-item strong { color: var(--primary-accent); }

                /* THRESHOLDS TAB */
                .threshold-group {
                    background: var(--background-color);
                    border-radius: 12px;
                    padding: 1.5rem;
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--shadow-color-lift);
                }
                .threshold-group h3 {
                    margin: 0 0 1rem 0;
                    color: var(--text-color);
                    font-weight: 700;
                }
                .threshold-input-row {
                    display: grid;
                    grid-template-columns: 2fr 80px auto;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                .threshold-input-row label {
                    font-weight: 600;
                    color: var(--text-color);
                }
                .threshold-input-row span {
                    color: var(--text-color-secondary);
                    font-size: 0.9rem;
                    white-space: nowrap;
                }
                .threshold-input-row input {
                    background: rgba(255, 255, 255, 0.04);
                    color: var(--text-color);
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    border-radius: 8px;
                    padding: 0.5rem;
                    width: 100%;
                    box-sizing: border-box;
                    text-align: center;
                    font-weight: 600;
                    font-family: inherit;
                    transition: all 0.3s;
                }
                .threshold-input-row input:focus {
                    outline: none;
                    border-color: var(--primary-accent);
                    box-shadow: 0 0 8px var(--glow-color-primary);
                }
                .save-thresholds {
                    width: 100%;
                    background: linear-gradient(135deg, var(--primary-accent), #005eff);
                    color: white;
                    border: none;
                    padding: 0.9rem 1.5rem;
                    border-radius: 12px;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    margin-top: 1.2rem;
                    box-shadow: 0 4px 15px var(--glow-color-primary);
                    transition: all 0.3s ease;
                }
                .save-thresholds:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px var(--glow-color-primary);
                }
                .save-thresholds:active {
                    transform: translateY(0);
                }

                #subject-input {
                    flex: 1;
                    padding: 0.8rem 1.2rem;
                    border-radius: 12px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    background: rgba(255, 255, 255, 0.04);
                    color: var(--text-color);
                    font-family: inherit;
                    font-size: 1rem;
                    outline: none;
                    transition: all 0.3s ease;
                }
                #subject-input:focus {
                    border-color: var(--primary-accent);
                    box-shadow: 0 0 10px var(--glow-color-primary);
                    background: rgba(255, 255, 255, 0.08);
                }
                #add-subject-btn {
                    padding: 0.8rem 1.8rem;
                    border-radius: 12px;
                    border: none;
                    background: linear-gradient(135deg, var(--primary-accent), #005eff);
                    color: white;
                    font-weight: 700;
                    font-size: 1rem;
                    cursor: pointer;
                    box-shadow: 0 4px 15px var(--glow-color-primary);
                    transition: all 0.3s ease;
                }
                #add-subject-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px var(--glow-color-primary);
                }
                #add-subject-btn:active {
                    transform: translateY(0);
                }
                .threshold-note {
                    font-size: 0.85rem;
                    color: var(--text-color-secondary);
                    margin-top: 1rem;
                    font-style: italic;
                }

                /* ======= MOBILE ADAPTATION (GRADES CARD) ======= */
                @media (max-width: 480px) {
                    .grades-body {
                        padding: 1.5rem 1.25rem 1.75rem;
                        border-radius: 18px;
                    }

                    h2 {
                        font-size: 1.6rem;
                        margin-bottom: 1.4rem;
                    }

                    .tabs {
                        gap: 0.25rem;
                        margin-bottom: 1.5rem;
                        overflow-x: auto;
                        padding-bottom: 0.4rem;
                        scrollbar-width: none;
                    }

                    .tabs::-webkit-scrollbar {
                        display: none;
                    }

                    .tab-btn {
                        padding: 0.5rem 0.7rem;
                        font-size: 0.85rem;
                        flex: 1 0 auto;
                        white-space: nowrap;
                    }

                    #result-container {
                        padding: 1.4rem 1.1rem;
                        margin-bottom: 1.4rem;
                    }

                    #result {
                        font-size: 2.6rem;
                        line-height: 1.1;
                        min-height: 0;
                    }

                    .controls {
                        grid-template-columns: repeat(3, minmax(0, 1fr));
                        gap: 0.75rem;
                        margin-bottom: 0.75rem;
                    }

                    .controls button {
                        height: 58px;
                        font-size: 1.5rem;
                    }

                    #grades-list {
                        margin: 1.5rem 0;
                    }

                    #grades-list li {
                        padding: 0.6rem 2.2rem 0.6rem 1.2rem;
                        font-size: 1.05rem;
                    }

                    .strategy-section,
                    .threshold-group {
                        padding: 1.25rem 1rem;
                    }

                    .threshold-input-row {
                        flex-wrap: wrap;
                        gap: 0.6rem;
                    }

                    .threshold-input-row label {
                        min-width: 0;
                    }

                    #subject-select {
                        max-width: 100%;
                    }

                    #subjects-list {
                        margin: 1.5rem 0;
                    }

                    .add-subject-row {
                        display: flex;
                        gap: 0.5rem;
                        margin-bottom: 1rem;
                        width: 100%;
                        box-sizing: border-box;
                        align-items: center;
                    }

                    @media (max-width: 480px) {
                        .add-subject-row {
                            gap: 0.4rem;
                        }
                        #subject-input {
                            font-size: 0.9rem;
                            padding: 0.65rem;
                        }
                        #add-subject-btn {
                            padding: 0.65rem 0.9rem;
                            font-size: 0.9rem;
                        }
                    }
                }
            </style>

            <div class="grades-body">
                <h2 data-i18n="grades">Средний балл</h2>

                <div class="tabs">
                    <button class="tab-btn active" data-tab="subjects" data-i18n="subjects">Предметы</button>
                    <button class="tab-btn" data-tab="input" data-i18n="tabGrades">Оценки</button>
                    <button class="tab-btn" data-tab="strategy" data-i18n="tabStrategy">Стратегия</button>
                    <button class="tab-btn" data-tab="thresholds" data-i18n="tabThresholds">Пороги</button>
                </div>

                <!-- SUBJECTS TAB (NEW) -->
                <div id="subjects" class="tab-content active">
                    <div style="text-align: center; padding: 1rem 0.5rem;">
                        <h3 data-i18n="subjects">Мои предметы</h3>
                        <div id="subjects-list" style="margin: 1.5rem 0; display: grid; gap: 1rem;"></div>
                        <div class="add-subject-row">
                            <input type="text" id="subject-input" placeholder="Название" data-i18n="subjectName" style="flex: 1; min-width: 0; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--primary-accent); background: var(--component-background); color: var(--text-color); font-family: inherit; box-sizing: border-box;">
                            <button id="add-subject-btn" data-i18n="create" style="flex-shrink: 0; padding: 0.8rem 1.2rem; background: var(--primary-accent); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; white-space: nowrap; transition: opacity 0.2s;">Создать</button>
                        </div>
                    </div>
                </div>

                <!-- INPUT TAB -->
                <div id="input" class="tab-content">
                    <div style="text-align: center; margin-bottom: 1.5rem;">
                        <select id="subject-select" style="padding: 0.8rem; border-radius: 8px; border: 1px solid var(--primary-accent); background: var(--component-background); color: var(--text-color); font-family: inherit; font-weight: 600; cursor: pointer; width: 100%; max-width: 300px;">
                            <option value="">-- Выбери предмет --</option>
                        </select>
                    </div>
                    
                    <div id="result-container">
                        <div id="result-label" data-i18n="averageScore">Текущий средний балл</div>
                        <div id="result">0.00</div>
                        <div class="progress-wrapper">
                            <div class="progress-bar">
                                <div class="progress-fill"></div>
                            </div>
                            <div class="progress-text" id="progress-text"></div>
                        </div>
                    </div>

                    <ul id="grades-list"></ul>
                    <div class="controls" id="grade-controls">
                        <!-- Grade buttons are now dynamically rendered -->
                    </div>
                    <div style="display: flex; gap: 1rem; margin-top: 1.5rem; justify-content: center;">
                        <button id="what-if-btn" style="padding: 0.8rem 2rem; background: var(--primary-accent); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; transition: all 0.3s;" data-i18n="whatIf">Что если?</button>
                    </div>
                </div>

                <!-- STRATEGY TAB -->
                <div id="strategy" class="tab-content">
                    <div class="strategy-section">
                        <h3 data-i18n="chooseTarget">Выбери целевую оценку:</h3>
                        <div class="strategy-box">
                            <label data-i18n="wantToGet">Хочу получить:</label>
                            <select id="target-select">
                                <!-- Options are now dynamically rendered -->
                            </select>
                        </div>
                    </div>

                    <div class="strategy-section">
                        <h3 data-i18n="result">Результат:</h3>
                        <div id="strategy-verdict">Введи оценки на вкладке "Оценки"</div>
                    </div>

                    <div class="strategy-section" id="variants-section" style="display: none;">
                        <h3 data-i18n="possibleVariants">Возможные варианты:</h3>
                        <div class="strategy-variants" id="strategy-variants"></div>
                    </div>
                </div>

                <!-- THRESHOLDS TAB -->
                <div id="thresholds" class="tab-content">
                    <div class="threshold-group">
                        <h3 data-i18n="thresholdsTitle"><span class="material-symbols-outlined" style="vertical-align: middle; margin-right: 4px;">bar_chart</span> Установи пороги для оценок</h3>
                        <p style="color: var(--text-color-secondary); font-size: 0.9rem; margin: 0 0 1rem 0;" data-i18n="thresholdsDesc">
                            Укажи, с какого среднего балла выставляется каждая оценка в твоей школе.
                        </p>
                        
                        <div class="threshold-input-row">
                            <label data-i18n="thresholdLabel5">Пятёрка (5):</label>
                            <input type="number" id="threshold-5" step="0.01" min="0" max="5" placeholder="4.50">
                            <span style="color: var(--text-color-secondary);" data-i18n="andAbove">и выше</span>
                        </div>
                        
                        <div class="threshold-input-row">
                            <label data-i18n="thresholdLabel4">Четвёрка (4):</label>
                            <input type="number" id="threshold-4" step="0.01" min="0" max="5" placeholder="3.50">
                            <span style="color: var(--text-color-secondary);" data-i18n="andAbove">и выше</span>
                        </div>
                        
                        <div class="threshold-input-row">
                            <label data-i18n="thresholdLabel3">Тройка (3):</label>
                            <input type="number" id="threshold-3" step="0.01" min="0" max="5" placeholder="2.50">
                            <span style="color: var(--text-color-secondary);" data-i18n="andAbove">и выше</span>
                        </div>

                        <button class="save-thresholds" data-i18n="saveThresholds"><span class="material-symbols-outlined" style="font-size: 1.1rem; vertical-align: middle; margin-right: 6px;">save</span>Сохранить пороги</button>
                        <p class="threshold-note" data-i18n="thresholdsNote">
                            <span class="material-symbols-outlined" style="font-size: 1.1rem; vertical-align: middle; margin-right: 4px;">lightbulb</span> Стандартные пороги: 5.0 → 4.5, 4.0 → 3.5, 3.0 → 2.5<br>
                            Измени их в соответствии с правилами твоей школы!
                        </p>
                    </div>
                </div>
            </div>
        `;
        this.initEvents();
        this.update();
    }

    initEvents() {
        // TABS
        this.shadowRoot.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.shadowRoot.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                this.shadowRoot.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                e.target.classList.add('active');
                const tabId = e.target.dataset.tab;
                this.shadowRoot.querySelector(`#${tabId}`).classList.add('active');
                if (tabId === 'subjects') this.renderSubjectsTab();
                if (tabId === 'input') this.renderInputTab();
                if (tabId === 'strategy') this.updateStrategy();
                if (tabId === 'thresholds') this.renderThresholds();
            });
        });

        // SUBJECTS TAB - Add Subject Button
        const addSubjectBtn = this.shadowRoot.querySelector('#add-subject-btn');
        if (addSubjectBtn) {
            addSubjectBtn.addEventListener('click', () => {
                const input = this.shadowRoot.querySelector('#subject-input');
                const subjectName = input.value.trim();
                if (subjectName) {
                    if (!this.subjects[subjectName]) {
                        this.subjects[subjectName] = [];
                        this.saveToDatabase();
                        input.value = '';
                        this.update(); // Use general update to refresh all UI
                    }
                }
            });
        }

        // SUBJECT SELECT in Input Tab
        const subjectSelect = this.shadowRoot.querySelector('#subject-select');
        if (subjectSelect) {
            subjectSelect.addEventListener('change', (e) => {
                this.currentSubject = e.target.value || '__QUICK_CALC__';
                this.simulatedGrade = null;
                this.update();
            });
        }

        // Use event delegation for all controls
        const controls = this.shadowRoot.querySelector('#grade-controls');
        if (controls) {
            controls.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                if (!btn) return;

                if (btn.dataset.grade) {
                    if (this.simulatedGrade !== null) {
                        showAppAlert('💡 Нажми "Применить" или "Отмена"', '');
                        return;
                    }
                    this.addGradeToSubject(this.currentSubject, btn.dataset.grade);
                } else if (btn.id === 'backspace') {
                    const isQuickCalc = this.currentSubject === '__QUICK_CALC__';
                    let gradeArray = isQuickCalc ? this.quickCalcGrades : this.subjects[this.currentSubject];
                    if (!gradeArray) return;

                    if (this.simulatedGrade !== null) {
                        this.simulatedGrade = null;
                    } else {
                        gradeArray.pop();
                    }
                    if (!isQuickCalc) this.saveToDatabase();
                    this.update();
                } else if (btn.id === 'clear-grades') {
                    const isQuickCalc = this.currentSubject === '__QUICK_CALC__';
                    let gradeArray = isQuickCalc ? this.quickCalcGrades : this.subjects[this.currentSubject];
                    if (!gradeArray) return;
                    
                    gradeArray.length = 0;
                    this.simulatedGrade = null;
                    if (!isQuickCalc) this.saveToDatabase();
                    this.update();
                }
            });
        }

        // Event delegation for deleting individual grades
        const gradesList = this.shadowRoot.querySelector('#grades-list');
        gradesList.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-grade-btn');
            if (deleteBtn) {
                const index = parseInt(deleteBtn.dataset.index, 10);
                const grades = (this.currentSubject === '__QUICK_CALC__') ? this.quickCalcGrades : this.subjects[this.currentSubject];
                
                if (grades && !isNaN(index) && grades[index]) {
                    const grade = grades[index];
                    const confirmText = (translations[currentLang]['deleteGradeConfirm'] || "Delete grade {grade}?").replace('{grade}', grade);
                    showAppConfirm(confirmText, '').then((confirmed) => {
                        if (!confirmed) return;
                        grades.splice(index, 1);
                        if (this.currentSubject !== '__QUICK_CALC__') {
                            this.saveToDatabase();
                        }
                        this.update();
                    });
                }
            }
        });

        // WHAT IF Button - Simulator
        const whatIfBtn = this.shadowRoot.querySelector('#what-if-btn');
        if (whatIfBtn) {
            whatIfBtn.addEventListener('click', () => {
                if (!this.currentSubject) {
                    showAppAlert('⚠️ Выбери предмет!', '');
                    return;
                }
                this.showSimulator();
            });
        }

        // STRATEGY
        const targetSelect = this.shadowRoot.querySelector('#target-select');
        if (targetSelect) {
            targetSelect.addEventListener('change', (e) => {
                this.targetGrade = this.gradingSystem === '5-point' ? parseInt(e.target.value) : e.target.value;
                this.updateStrategy();
            });
        }


        // THRESHOLDS
        const thresholdGroup = this.shadowRoot.querySelector('#thresholds .threshold-group');
        if (thresholdGroup) {
            thresholdGroup.addEventListener('click', (e) => {
                if (!e.target.classList.contains('save-thresholds')) return;

                if (this.gradingSystem === '5-point') {
                    const t5 = parseFloat(this.shadowRoot.querySelector('#threshold-5').value);
                    const t4 = parseFloat(this.shadowRoot.querySelector('#threshold-4').value);
                    const t3 = parseFloat(this.shadowRoot.querySelector('#threshold-3').value);

                    if (!isNaN(t5) && !isNaN(t4) && !isNaN(t3)) {
                        this.thresholds['5-point'] = { 5: t5, 4: t4, 3: t3 };
                        this.saveToDatabase();
                        showToast(t('thresholdsSaved'), 'success', 2800);
                        this.updateStrategy();
                    }
                } else { // us-letter
                    const tA = parseInt(this.shadowRoot.querySelector('#threshold-A').value);
                    const tB = parseInt(this.shadowRoot.querySelector('#threshold-B').value);
                    const tC = parseInt(this.shadowRoot.querySelector('#threshold-C').value);
                    const tD = parseInt(this.shadowRoot.querySelector('#threshold-D').value);

                    if (!isNaN(tA) && !isNaN(tB) && !isNaN(tC) && !isNaN(tD)) {
                        this.thresholds['us-letter'] = { A: tA, B: tB, C: tC, D: tD, F: 0 };
                        this.saveToDatabase();
                        showToast(t('thresholdsSaved'), 'success', 2800);
                        this.updateStrategy();
                    }
                }
            });
        }
    }
    
    renderSubjectsTab() {
        const subjectsList = this.shadowRoot.querySelector('#subjects-list');
        subjectsList.innerHTML = '';
        
        const avgLabel = this.gradingSystem === '5-point' 
            ? (translations[currentLang]['averageScore'] || 'Average Score')
            : (translations[currentLang]['gpa'] || 'GPA');

        Object.keys(this.subjects).forEach(subjectName => {
            const avg = this.calculateAverageForSubject(subjectName);
            const subjectCard = document.createElement('div');
            subjectCard.style.cssText = `
                background: var(--component-background);
                padding: 1rem;
                border-radius: 12px;
                border: 1px solid var(--primary-accent);
                display: flex;
                justify-content: space-between;
                align-items: center;
            `;
            subjectCard.innerHTML = `
                <div style="text-align: left;">
                    <div style="font-weight: 600; color: var(--text-color); margin-bottom: 0.3rem;">${subjectName}</div>
                    <div style="color: var(--text-color-secondary); font-size: 0.9rem;">${avgLabel}: <strong style="color: var(--primary-accent);">${avg}</strong> (${this.subjects[subjectName].length} оценок)</div>
                </div>
                <button id="delete-${subjectName}" style="padding: 0.5rem 1rem; background: #ff6b6b; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">✕</button>
            `;
            subjectsList.appendChild(subjectCard);
            
            const deleteBtn = subjectCard.querySelector(`#delete-${subjectName}`);
            deleteBtn.addEventListener('click', () => {
                const confirmText = `Удалить ${subjectName}?`;
                showAppConfirm(confirmText, '').then((confirmed) => {
                    if (confirmed) {
                        this.deleteSubject(subjectName);
                    }
                });
            });
        });
    }
    
    renderInputTab() {
        const subjectSelect = this.shadowRoot.querySelector('#subject-select');
        const resultLabel = this.shadowRoot.querySelector('#result-label');

        if (this.gradingSystem === '5-point') {
            resultLabel.setAttribute('data-i18n', 'averageScore');
        } else {
            resultLabel.setAttribute('data-i18n', 'gpa');
        }

        subjectSelect.innerHTML = ''; // Clear previous options

        // Add Quick Calc as the first option
        const quickCalcOption = document.createElement('option');
        quickCalcOption.value = '__QUICK_CALC__';
        quickCalcOption.textContent = 'Быстрый подсчет (локально)';
        subjectSelect.appendChild(quickCalcOption);

        Object.keys(this.subjects).forEach(subjectName => {
            const option = document.createElement('option');
            option.value = subjectName;
            option.textContent = subjectName;
            subjectSelect.appendChild(option);
        });
        
        // Set selected option
        subjectSelect.value = this.currentSubject;
    }
    
    async showSimulator() {
        const promptText = this.gradingSystem === '5-point' 
            ? 'Какую оценку добавить для симуляции? (1-5)'
            : 'Which grade would you like to simulate? (A, B, C, D, F)';
        
        const gradeInput = await showAppPrompt(promptText, t('simulateGrade') || 'Simulate Grade');
        if (gradeInput === null || gradeInput === undefined) return;

        let grade;
        if (this.gradingSystem === '5-point') {
            grade = parseInt(gradeInput);
            if (isNaN(grade) || grade < 1 || grade > 5) {
                await showAppAlert('⚠️ Введи число от 1 до 5', '');
                return;
            }
        } else {
            grade = gradeInput.toUpperCase();
            if (!['A', 'B', 'C', 'D', 'F'].includes(grade)) {
                await showAppAlert('⚠️ Please enter a valid letter grade (A, B, C, D, or F)', '');
                return;
            }
        }
        
        this.simulatedGrade = grade;
        this.update();
        
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7);
            display: flex; justify-content: center; align-items: center;
            z-index: 10000;
        `;
        
        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--component-background);
            padding: 2rem; border-radius: 20px; text-align: center;
            max-width: 400px; border: 2px solid var(--primary-accent);
        `;
        
        const oldAvg = this.calculateAverageForSubject(this.currentSubject);
        const newAvg = this.calculateAverage(); // Recalculates with the simulated grade

        const extraSimulatorLabels = {
            ifAdd: {
                en: 'If you add the grade {grade} to {subject}:',
                ru: 'Если вы добавите оценку {grade} по предмету {subject}:',
                uk: 'Якщо ви додасте оцінку {grade} з предмета {subject}:',
                be: 'Калі вы дадасце адзнаку {grade} па прадмеце {subject}:',
                kk: 'Егер сіз {subject} пәніне {grade} бағасын қоссаңыз:',
                es: 'Si agregas la calificación {grade} a {subject}:',
                de: 'Wenn Sie die Note {grade} zu {subject} hinzufügen:',
                fr: 'Si vous ajoutez la note {grade} à {subject} :',
                zh: '如果向 {subject} 添加成绩 {grade}：',
                tr: 'Eğer {subject} dersine {grade} notunu eklerseniz:',
                ar: 'إذا أضفت الدرجة {grade} إلى {subject}:'
            },
            currentSimulated: {
                en: 'Current: {current} → Simulated: {simulated}',
                ru: 'Текущий: {current} → Прогноз: {simulated}',
                uk: 'Поточний: {current} → Прогноз: {simulated}',
                be: 'Бягучы: {current} → Прагноз: {simulated}',
                kk: 'Ағымдағы: {current} → Болжамды: {simulated}',
                es: 'Actual: {current} → Simulado: {simulated}',
                de: 'Aktuell: {current} → Simuliert: {simulated}',
                fr: 'Actuel : {current} → Simulé : {simulated}',
                zh: '当前：{current} → 模拟：{simulated}',
                tr: 'Mevcut: {current} → Simüle: {simulated}',
                ar: 'الحالي: {current} ← المحاكاة: {simulated}'
            },
            quickCalc: {
                en: 'Quick Calc',
                ru: 'Быстрый подсчет',
                uk: 'Швидкий підрахунок',
                be: 'Хуткі падлік',
                kk: 'Тез есептеу',
                es: 'Cálculo rápido',
                de: 'Schnellrechnung',
                fr: 'Calcul rapide',
                zh: '快速计算',
                tr: 'Hızlı Hesaplama',
                ar: 'حساب سريع'
            }
        };

        const titleText = translations[currentLang]?.whatIf || 'What If?';
        const applyText = translations[currentLang]?.apply || 'Apply';
        const cancelText = translations[currentLang]?.cancel || 'Cancel';
        
        const subjLabel = this.currentSubject === '__QUICK_CALC__' 
            ? (extraSimulatorLabels.quickCalc[currentLang] || extraSimulatorLabels.quickCalc.en)
            : this.currentSubject;

        const bodyTemplate = (extraSimulatorLabels.ifAdd[currentLang] || extraSimulatorLabels.ifAdd.en)
            .replace('{grade}', grade)
            .replace('{subject}', subjLabel);

        const resultTemplate = (extraSimulatorLabels.currentSimulated[currentLang] || extraSimulatorLabels.currentSimulated.en)
            .replace('{current}', oldAvg)
            .replace('{simulated}', newAvg);

        content.innerHTML = `
            <h2 style="color: var(--primary-accent); margin: 0 0 1rem 0;">${titleText}</h2>
            <p style="color: var(--text-color); margin: 0 0 0.5rem 0;">${bodyTemplate}</p>
            <p style="font-size: 1.5rem; color: var(--primary-accent); font-weight: 700; margin: 1rem 0;">
                ${resultTemplate}
            </p>
            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button id="apply-sim" style="flex: 1; padding: 0.8rem; background: var(--primary-accent); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">${applyText}</button>
                <button id="cancel-sim" style="flex: 1; padding: 0.8rem; background: #999; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">${cancelText}</button>
            </div>
        `;
        
        modal.appendChild(content);
        document.body.appendChild(modal);
        
        document.querySelector('#apply-sim').addEventListener('click', () => {
            this.addGradeToSubject(this.currentSubject, grade);
            this.simulatedGrade = null;
            document.body.removeChild(modal);
        });
        
        document.querySelector('#cancel-sim').addEventListener('click', () => {
            this.simulatedGrade = null;
            this.update();
            document.body.removeChild(modal);
        });
    }

    renderControls() {
        const controls = this.shadowRoot.querySelector('#grade-controls');
        let buttonsHTML = '';
        if (this.gradingSystem === '5-point') {
            buttonsHTML = `
                <button data-grade="1">1</button><button data-grade="2">2</button><button data-grade="3">3</button>
                <button data-grade="4">4</button><button data-grade="5">5</button>
                <button class="action" id="backspace">&#9003;</button>
                <button class="action" id="clear-grades" data-i18n="clear">Очистить</button>
            `;
        } else { // us-letter
            buttonsHTML = `
                <button data-grade="A">A</button><button data-grade="B">B</button><button data-grade="C">C</button>
                <button data-grade="D">D</button><button data-grade="F">F</button>
                <button class="action" id="backspace">&#9003;</button>
                <button class="action" id="clear-grades" data-i18n="clear">Очистить</button>
            `;
        }
        controls.innerHTML = buttonsHTML;
        
        // Render target select options
        const targetSelect = this.shadowRoot.querySelector('#target-select');
        let optionsHTML = '';
        if (this.gradingSystem === '5-point') {
            optionsHTML = `
                <option value="5" data-i18n="grade5"></option>
                <option value="4" data-i18n="grade4"></option>
                <option value="3" data-i18n="grade3"></option>
            `;
            this.targetGrade = 5;
        } else { // us-letter
            optionsHTML = `
                <option value="A" data-i18n="gradeA"></option>
                <option value="B" data-i18n="gradeB"></option>
                <option value="C" data-i18n="gradeC"></option>
                <option value="D" data-i18n="gradeD"></option>
            `;
            this.targetGrade = 'A';
        }
        targetSelect.innerHTML = optionsHTML;
        targetSelect.value = this.targetGrade;
    }

    renderThresholds() {
        const container = this.shadowRoot.querySelector('#thresholds .threshold-group');
        let thresholdsHTML = '';
        if (this.gradingSystem === '5-point') {
            thresholdsHTML = `
                <h3 data-i18n="thresholdsTitle"></h3>
                <p style="color: var(--text-color-secondary); font-size: 0.9rem; margin: 0 0 1rem 0;" data-i18n="thresholdsDesc"></p>
                <div class="threshold-input-row">
                    <label data-i18n="thresholdLabel5"></label>
                    <input type="number" id="threshold-5" step="0.01" min="0" max="5" value="${this.thresholds['5-point'][5]}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <div class="threshold-input-row">
                    <label data-i18n="thresholdLabel4"></label>
                    <input type="number" id="threshold-4" step="0.01" min="0" max="5" value="${this.thresholds['5-point'][4]}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <div class="threshold-input-row">
                    <label data-i18n="thresholdLabel3"></label>
                    <input type="number" id="threshold-3" step="0.01" min="0" max="5" value="${this.thresholds['5-point'][3]}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <button class="save-thresholds" data-i18n="saveThresholds"></button>
            `;
        } else { // us-letter
            thresholdsHTML = `
                <h3 data-i18n="thresholdsTitleUs"></h3>
                <p style="color: var(--text-color-secondary); font-size: 0.9rem; margin: 0 0 1rem 0;" data-i18n="thresholdsDescUs"></p>
                <div class="threshold-input-row">
                    <label data-i18n="thresholdLabelA"></label>
                    <input type="number" id="threshold-A" step="1" min="0" max="100" value="${this.thresholds['us-letter']['A']}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <div class="threshold-input-row">
                    <label data-i18n="thresholdLabelB"></label>
                    <input type="number" id="threshold-B" step="1" min="0" max="100" value="${this.thresholds['us-letter']['B']}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <div class="threshold-input-row">
                    <label data-i18n="thresholdLabelC"></label>
                    <input type="number" id="threshold-C" step="1" min="0" max="100" value="${this.thresholds['us-letter']['C']}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <div class="threshold-input-row">
                    <label data-i18n="thresholdLabelD"></label>
                    <input type="number" id="threshold-D" step="1" min="0" max="100" value="${this.thresholds['us-letter']['D']}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <button class="save-thresholds" data-i18n="saveThresholds"></button>
            `;
        }
        container.innerHTML = thresholdsHTML;
        // Ensure translated text appears after re-rendering this section
        updateTranslations();
    }

    loadThresholds() {
        this.shadowRoot.querySelector('#threshold-5').value = this.thresholds[5];
        this.shadowRoot.querySelector('#threshold-4').value = this.thresholds[4];
        this.shadowRoot.querySelector('#threshold-3').value = this.thresholds[3];
    }

    update() {
        // Central update function to keep all UI parts in sync
        this.renderControls(); // Render buttons and other controls based on system
        this.renderSubjectsTab();
        this.renderInputTab();
        this.renderGrades();
        const avg = this.currentSubject ? this.calculateAverageForSubject(this.currentSubject) : 0;
        this.updateProgressBar(avg);
        this.updateStrategy();
        this.renderThresholds();
        updateTranslations(); // Call global translation update
    }

    renderGrades() {
        const list = this.shadowRoot.querySelector('#grades-list');
        const resultDiv = this.shadowRoot.querySelector('#result');
        list.innerHTML = '';
        
        const grades = (this.currentSubject === '__QUICK_CALC__') ? this.quickCalcGrades : this.subjects[this.currentSubject];

        if (!grades) {
            list.innerHTML = '<li style="color: var(--text-color-secondary);">Выбери предмет →</li>';
            if (resultDiv) resultDiv.textContent = '0.00';
            return;
        }
        
        grades.forEach((grade, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${grade}</span>
                <button class="delete-grade-btn" data-index="${index}">×</button>
            `;
            list.appendChild(li);
        });
        
        if (this.simulatedGrade !== null) {
            const li = document.createElement('li');
            li.textContent = this.simulatedGrade;
            li.style.cssText = `
                background: rgba(255, 193, 7, 0.3);
                border: 2px dashed var(--primary-accent);
                padding-left: 1.5rem; 
                padding-right: 1.5rem;
            `;
            list.appendChild(li);
        }
        
        const avg = this.calculateAverage();
        if (resultDiv) resultDiv.textContent = avg;
    }

    calculateAverage() {
        const grades = (this.currentSubject === '__QUICK_CALC__') ? this.quickCalcGrades : this.subjects[this.currentSubject];
        if (!grades || grades.length === 0) return 0;
        
        let allGrades = [...grades];
        if (this.simulatedGrade !== null) {
            allGrades.push(this.simulatedGrade);
        }
        if (allGrades.length === 0) return 0;
        
        if (this.gradingSystem === '5-point') {
            const total = allGrades.reduce((a, b) => a + b, 0);
            return (total / allGrades.length).toFixed(2);
        } else { // us-letter
            const totalPoints = allGrades.reduce((acc, grade) => acc + (this.gradeMap[grade] || 0), 0);
            return (totalPoints / allGrades.length).toFixed(2);
        }
    }

    updateProgressBar(avg) {
        const fill = this.shadowRoot.querySelector('.progress-fill');
        const text = this.shadowRoot.querySelector('#progress-text');
        const max = this.gradingSystem === '5-point' ? 5 : 4;
        const percent = Math.min((avg / max) * 100, 100);
        fill.style.width = percent + '%';
        text.textContent = `${avg} / ${max.toFixed(1)}`;
    }

    updateStrategy() {
        if (this.gradingSystem === '5-point') {
            this.updateStrategy5Point();
        } else {
            this.updateStrategyUS();
        }
    }

    updateStrategy5Point() {
        const verdictDiv = this.shadowRoot.querySelector('#strategy-verdict');
        const variantsDiv = this.shadowRoot.querySelector('#variants-section');
        const targetThreshold = this.thresholds['5-point'][this.targetGrade];

        const grades = (this.currentSubject === '__QUICK_CALC__') ? this.quickCalcGrades : this.subjects[this.currentSubject];

        if (!grades || grades.length === 0) {
            verdictDiv.innerHTML = translations[currentLang]['enterGradesTab'] || "📌 Введи оценки на вкладке <strong>Оценки</strong>";
            variantsDiv.style.display = 'none';
            return;
        }

        const avg = this.calculateAverageForSubject(this.currentSubject);

        if (avg >= targetThreshold) {
            const text = translations[currentLang]['goalAchieved'] || "✅ Отлично! Ты уже имеешь среднее {avg}, что соответствует оценке {grade}. Главное — не испортить!";
            verdictDiv.innerHTML = text.replace('{avg}', avg).replace('{grade}', this.targetGrade);
            variantsDiv.style.display = 'none';
            return;
        }

        const allFives = [...grades];
        let fivesNeeded = 0;
        const limit = 20;

        for (let i = 0; i < limit; i++) {
            allFives.push(5);
            fivesNeeded++;
            const newAvg = allFives.reduce((a, b) => a + b, 0) / allFives.length;
            if (newAvg >= targetThreshold) break;
        }

        const newAvgFives = allFives.reduce((a, b) => a + b, 0) / allFives.length;
        const needText = translations[currentLang]['needFives'] || "📚 Нужно ещё {count} пятёрок, чтобы балл стал {avg}";
        verdictDiv.innerHTML = needText.replace('{count}', fivesNeeded).replace('{avg}', newAvgFives.toFixed(2));
        
        const variants = [];
        let mixedGrades = [...grades];
        let fours = 0, fives = 0;
        for (let i = 0; i < limit && mixedGrades.reduce((a, b) => a + b, 0) / mixedGrades.length < targetThreshold; i++) {
            if (i % 2 === 0) { mixedGrades.push(5); fives++; }
            else { mixedGrades.push(4); fours++; }
        }
        if (mixedGrades.reduce((a, b) => a + b, 0) / mixedGrades.length >= targetThreshold) {
            const mixAvg = mixedGrades.reduce((a, b) => a + b, 0) / mixedGrades.length;
            const mixText = translations[currentLang]['variantMixed'] || "📌 <strong>Смешанно:</strong> {fives} пятёрок и {fours} четвёрок → средний балл {avg}";
            variants.push(mixText.replace('{fives}', fives).replace('{fours}', fours).replace('{avg}', mixAvg.toFixed(2)));
        }

        if (grades.some(g => g < 4)) {
            const improved = [...grades].sort();
            const lowestIdx = improved.findIndex(g => g < 4);
            if (lowestIdx >= 0) {
                improved[lowestIdx] = 5;
                const impAvg = improved.reduce((a, b) => a + b, 0) / improved.length;
                if (impAvg >= targetThreshold) {
                    const fixText = translations[currentLang]['variantFix'] || "🎯 <strong>Исправление:</strong> замени одну плохую оценку на 5 → средний балл {avg}";
                    variants.push(fixText.replace('{avg}', impAvg.toFixed(2)));
                }
            }
        }

        if (variants.length > 0) {
            const varTitle = translations[currentLang]['possibleVariants'] || "Возможные варианты:";
            variantsDiv.innerHTML = '<h3>' + varTitle + '</h3><div class="strategy-variants">' + 
                variants.map(v => `<div class="variant-item">${v}</div>`).join('') + 
                '</div>';
            variantsDiv.style.display = 'block';
        } else {
            variantsDiv.style.display = 'none';
        }
    }

    updateStrategyUS() {
        const verdictDiv = this.shadowRoot.querySelector('#strategy-verdict');
        const variantsDiv = this.shadowRoot.querySelector('#variants-section');
        const targetGPA = this.gradeMap[this.targetGrade] || 4.0;
        const grades = (this.currentSubject === '__QUICK_CALC__') ? this.quickCalcGrades : this.subjects[this.currentSubject];

        if (!grades || grades.length === 0) {
            verdictDiv.innerHTML = translations[currentLang]['enterGradesTabUs'] || "📌 Enter grades in the 'Grades' tab to see a strategy.";
            variantsDiv.style.display = 'none';
            return;
        }

        const currentGPA = parseFloat(this.calculateAverageForSubject(this.currentSubject));

        if (currentGPA >= targetGPA) {
            const text = (translations[currentLang]['goalAchievedUs'] || "✅ Excellent! Your current GPA is {gpa}, which already meets your goal of a {grade} ({targetGpa}). Keep it up!")
                .replace('{gpa}', currentGPA.toFixed(2))
                .replace('{grade}', this.targetGrade)
                .replace('{targetGpa}', targetGPA.toFixed(1));
            verdictDiv.innerHTML = text;
            variantsDiv.style.display = 'none';
            return;
        }

        let gradesNeeded = 0;
        let newGrades = [...grades];
        const limit = 20;

        for (let i = 0; i < limit; i++) {
            newGrades.push('A');
            gradesNeeded++;
            const newPoints = newGrades.reduce((acc, g) => acc + this.gradeMap[g], 0);
            const newGPA = newPoints / newGrades.length;
            if (newGPA >= targetGPA) break;
        }
        
        const finalGPA = newGrades.reduce((acc, g) => acc + this.gradeMap[g], 0) / newGrades.length;
        
        const text = (translations[currentLang]['needAs'] || "📚 To reach a {grade} ({targetGpa} GPA), you need approximately <strong>{count} more 'A's</strong>. This would bring your GPA to {newGpa}.")
            .replace('{grade}', this.targetGrade)
            .replace('{targetGpa}', targetGPA.toFixed(1))
            .replace('{count}', gradesNeeded)
            .replace('{newGpa}', finalGPA.toFixed(2));
        verdictDiv.innerHTML = text;
        
        variantsDiv.style.display = 'none'; // For now, no variants for US system
    }

    loadFromDatabase() {
        this.quickCalcGrades = []; // Reset local quick calc on load
        if (!currentUser) {
            this.subjects = {};
            this.currentSubject = '__QUICK_CALC__';
            this.update();
            return Promise.resolve();
        }

        const uid = currentUser.uid;
        const userRef = window.firebase.database().ref(`users/${uid}`);

        const fetchData = () => userRef.once('value')
            .then((snapshot) => {
                const data = snapshot.val() || {};
                const subjects = data.subjects || {};
                
                this.gradingSystem = (data.settings && data.settings.gradingSystem) || '5-point';

                const defaultThresholds = {
                    '5-point': { 5: 4.50, 4: 3.50, 3: 2.50 },
                    'us-letter': { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'F': 0 }
                };
                
                // Merge loaded thresholds with defaults to ensure all keys exist
                const loadedThresholds = (data.settings && data.settings.thresholds) || {};
                this.thresholds = {
                    '5-point': { ...defaultThresholds['5-point'], ...loadedThresholds['5-point'] },
                    'us-letter': { ...defaultThresholds['us-letter'], ...loadedThresholds['us-letter'] }
                };

                this.subjects = subjects;

                console.log('✅ Loaded data from Firebase.');

                const subjectKeys = Object.keys(this.subjects);
                if (subjectKeys.length > 0 && subjectKeys.length <= 2) {
                    this.currentSubject = subjectKeys[subjectKeys.length - 1];
                } else {
                    this.currentSubject = '__QUICK_CALC__';
                }
                this.update();
                 // Also update the settings component buttons
                const settingsComp = document.querySelector('settings-component');
                if (settingsComp) {
                    settingsComp.updateGradingSystemButtons();
                }
            })
            .catch(error => {
                console.error('❌ Error loading from Firebase:', error);
                this.subjects = {};
                this.currentSubject = '__QUICK_CALC__';
                this.update();
            });

        if (typeof currentUser.getIdToken === 'function') {
            return currentUser.getIdToken(true).then(fetchData).catch(fetchData);
        }
        return fetchData();
    }

    syncGrades() {
        this.saveToDatabase();
    }
}
customElements.define('grade-average-calculator', GradeAverageCalculator);

// --- MAIN APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const initialLang = getInitialUserLanguage();
    setTheme(savedTheme);
    setLanguage(initialLang);

    setTimeout(() => {
        updateTranslations();
    }, 50);

    initDesktopDownloadModal();
    initAuthDialogs();

    // ----- Electron: custom titlebar (minimize, maximize, close) -----
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.isElectron) {
        const minimizeBtn = document.querySelector('.titlebar-minimize');
        const maximizeBtn = document.querySelector('.titlebar-maximize');
        const closeBtn = document.querySelector('.titlebar-close');
        if (minimizeBtn) minimizeBtn.addEventListener('click', () => window.electronAPI.send('window-minimize'));
        if (maximizeBtn) maximizeBtn.addEventListener('click', () => window.electronAPI.send('window-maximize'));
        if (closeBtn) closeBtn.addEventListener('click', () => window.electronAPI.send('window-close'));

        // OAuth result from main process (system browser + deep link)
        window.electronAPI.onGoogleSigninResult((err, token, provider, googleAccessToken) => {
            if (err) {
                console.error('OAuth sign-in (desktop):', err);
                openAccountErrorModal('Sign-in failed: ' + err);
                return;
            }
            if (!token || !firebaseAuth) return;
            if (provider === 'google' && googleAccessToken) {
                localStorage.setItem('google_access_token', googleAccessToken);
            }
            const authProvider = provider === 'github' ? 'github' : 'google';
            const credential = authProvider === 'github'
                ? firebase.auth.GithubAuthProvider.credential(token)
                : firebase.auth.GoogleAuthProvider.credential(token);
            firebaseAuth.signInWithCredential(credential)
                .then((result) => {
                    console.log('Sign-in success (desktop).');
                    if (provider === 'google' && googleAccessToken) {
                        localStorage.setItem('google_access_token', googleAccessToken);
                    }
                    return finalizeSignIn(result);
                })
                .catch((e) => {
                    console.error(e);
                    openAccountErrorModal('Sign-in failed: ' + (e && e.message ? e.message : e));
                });
        });
    }

    initTabNavigation();

    feather.replace();
    updateTranslations();

    // ─── Auto-Updater UI (Electron) ────────────────────────────────
    initElectronAutoUpdater();

    // ─── Auto-Updater (Android / Capacitor) ────────────────────────
    if (typeof initAndroidUpdater === 'function') {
        initAndroidUpdater();
    }
});

/* ========= ELECTRON AUTO-UPDATER UI ========= */

function initElectronAutoUpdater() {
    if (typeof window.electronAPI === 'undefined' || !window.electronAPI.isElectron) return;

    const modal = document.getElementById('update-modal');
    if (!modal) return;

    const closeBtn = modal.querySelector('.update-modal-close');
    const title = modal.querySelector('.update-modal-title');
    const changelog = modal.querySelector('.update-modal-changelog');
    const btnPrimary = modal.querySelector('.update-modal-btn-primary');
    const btnSecondary = modal.querySelector('.update-modal-btn-secondary');
    const progressContainer = modal.querySelector('.update-modal-progress-container');
    const progressBar = modal.querySelector('.update-modal-progress-bar');
    const progressText = modal.querySelector('.update-modal-progress-text');

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    // Click outside to close
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.classList.remove('active');
    });

    // Listen for update-available from main process
    window.electronAPI.onUpdateAvailable((info) => {
        console.log('[Updater UI] Update available:', info.version);

        // Store info for later download
        window.electronAPI.send('update-info-received', info);

        // Populate modal
        if (title) title.textContent = '🎉 Доступно обновление ' + info.version;
        if (changelog) {
            const changelogHtml = (info.changelog || 'Нет описания')
                .replace(/\n/g, '<br>')
                .replace(/^## (.+)$/gm, '<strong>$1</strong>')
                .replace(/^- (.+)$/gm, '• $1');
            changelog.innerHTML = '<div class="update-changelog-content">' + changelogHtml + '</div>';
        }

        if (progressContainer) progressContainer.style.display = 'none';

        if (btnPrimary) {
            btnPrimary.textContent = '⬇️ Скачать и установить';
            btnPrimary.style.display = '';
            btnPrimary.onclick = () => {
                // Start background download
                btnPrimary.style.display = 'none';
                if (progressContainer) progressContainer.style.display = '';
                if (progressText) progressText.textContent = 'Скачивание...';
                if (progressBar) progressBar.style.width = '0%';

                window.electronAPI.startUpdateDownload().catch((err) => {
                    console.error('[Updater UI] Download error:', err);
                    if (progressText) progressText.textContent = 'Ошибка: ' + (err.message || err);
                    btnPrimary.textContent = '🔄 Повторить';
                    btnPrimary.style.display = '';
                });
            };
        }

        if (btnSecondary) {
            btnSecondary.textContent = 'Позже';
            btnSecondary.style.display = '';
            btnSecondary.onclick = () => {
                modal.classList.remove('active');
            };
        }

        modal.classList.add('active');
    });

    // Listen for download completion
    window.electronAPI.onUpdateDownloaded((info) => {
        console.log('[Updater UI] Update downloaded:', info.path);

        if (progressBar) progressBar.style.width = '100%';
        if (progressText) progressText.textContent = 'Загрузка завершена!';

        if (btnPrimary) {
            btnPrimary.textContent = '🚀 Установить и перезапустить';
            btnPrimary.style.display = '';
            btnPrimary.onclick = () => {
                btnPrimary.disabled = true;
                btnPrimary.textContent = 'Установка...';
                window.electronAPI.applyUpdate();
            };
        }

        if (btnSecondary) {
            btnSecondary.textContent = 'Позже';
            btnSecondary.style.display = '';
        }
    });

    // Listen for errors
    window.electronAPI.onUpdateError((info) => {
        console.error('[Updater UI] Update error:', info.error);
        if (progressText) progressText.textContent = 'Ошибка: ' + info.error;
        if (progressBar) progressBar.style.width = '0%';
        if (btnPrimary) {
            btnPrimary.textContent = '🔄 Повторить';
            btnPrimary.style.display = '';
        }
    });

    // Listen for rollback detection
    window.electronAPI.onRollbackDetected((info) => {
        console.warn('[Updater UI] Rollback detected:', info.message);

        if (title) title.textContent = '⚠️ Проблема после обновления';
        if (changelog) {
            changelog.innerHTML = '<p>' + info.message +
                '</p><p style="margin-top:8px;font-size:0.85em;opacity:0.7;">Пожалуйста, скачайте предыдущую версию из GitHub Releases или обратитесь в поддержку.</p>';
        }
        if (progressContainer) progressContainer.style.display = 'none';

        if (btnPrimary) {
            btnPrimary.textContent = 'Открыть GitHub Releases';
            btnPrimary.style.display = '';
            btnPrimary.onclick = () => {
                window.electronAPI.openExternal('https://github.com/KamilRemix/SmartStudyHub/releases');
                modal.classList.remove('active');
            };
        }
        if (btnSecondary) {
            btnSecondary.textContent = 'Закрыть';
            btnSecondary.style.display = '';
            btnSecondary.onclick = () => modal.classList.remove('active');
        }

        modal.classList.add('active');
    });
}

