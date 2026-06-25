/**
 * SmartStudyAI — client module for Tools tab.
 * Server-side limits via Firebase Cloud Functions; personal API key bypasses limits.
 */
(function (global) {
    'use strict';

    const AI_CONFIG = {
        PERSONAL_API_KEY_STORAGE: 'smartStudyAI_personalApiKey',
        LIMITS_ENDPOINT: 'https://us-central1-smartstudyhub-46d44.cloudfunctions.net/checkAiLimit',
        CHAT_ENDPOINT: 'https://us-central1-smartstudyhub-46d44.cloudfunctions.net/aiChat',
        PING_URL: 'https://www.gstatic.com/generate_204',
        PING_TIMEOUT_MS: 4000,
        DAILY_LIMIT: 15
    };

    let chatHistory = [];
    let isSending = false;
    let pendingRetryMessage = null;
    let limitState = { allowed: true, used: 0, limit: AI_CONFIG.DAILY_LIMIT, unlimited: false };

    function t(key, fallback) {
        const lang = typeof currentLang !== 'undefined' ? currentLang : 'ru';
        const dict = typeof translations !== 'undefined' ? translations[lang] : null;
        return (dict && dict[key]) || fallback || key;
    }

    function getPersonalApiKey() {
        try {
            const key = localStorage.getItem(AI_CONFIG.PERSONAL_API_KEY_STORAGE);
            return key && key.trim() ? key.trim() : null;
        } catch (e) {
            return null;
        }
    }

    function hasPersonalApiKey() {
        return !!getPersonalApiKey();
    }

    function getUserId() {
        const user = typeof currentUser !== 'undefined' ? currentUser : null;
        return user && user.uid ? user.uid : null;
    }

    async function getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        const user = typeof currentUser !== 'undefined' ? currentUser : null;
        if (user) {
            try {
                const token = await user.getIdToken();
                if (token) headers.Authorization = `Bearer ${token}`;
            } catch (e) {
                console.warn('SmartStudyAI: could not get ID token', e);
            }
        }
        return headers;
    }

    /**
     * Real ping — do NOT use navigator.onLine (unreliable in Android WebView).
     */
    async function pingNetwork() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AI_CONFIG.PING_TIMEOUT_MS);
        try {
            const res = await fetch(AI_CONFIG.PING_URL, {
                method: 'GET',
                cache: 'no-store',
                mode: 'no-cors',
                signal: controller.signal
            });
            clearTimeout(timer);
            return res.type === 'opaque' || res.ok;
        } catch (e) {
            clearTimeout(timer);
            return false;
        }
    }

    /**
     * Simulates / proxies server limit check tied to Firebase Auth UID.
     * Production: Cloud Function validates token + counts in Firestore (server UTC midnight reset).
     */
    async function checkServerLimits(userId) {
        if (hasPersonalApiKey()) {
            return { allowed: true, unlimited: true, used: 0, limit: AI_CONFIG.DAILY_LIMIT };
        }

        if (!userId) {
            return {
                allowed: false,
                used: AI_CONFIG.DAILY_LIMIT,
                limit: AI_CONFIG.DAILY_LIMIT,
                reason: 'auth_required'
            };
        }

        try {
            const headers = await getAuthHeaders();
            const res = await fetch(AI_CONFIG.LIMITS_ENDPOINT, {
                method: 'POST',
                headers,
                body: JSON.stringify({ userId })
            });
            if (res.ok) {
                const data = await res.json();
                return normalizeLimitResponse(data);
            }
        } catch (e) {
            console.warn('SmartStudyAI: limits endpoint unavailable, using dev simulation', e);
        }

        return simulateServerLimitCheck(userId);
    }

    function normalizeLimitResponse(data) {
        const limit = data.limit ?? AI_CONFIG.DAILY_LIMIT;
        const used = data.used ?? data.count ?? 0;
        const allowed = data.allowed !== undefined
            ? data.allowed
            : (data.unlimited === true || used < limit);
        return {
            allowed,
            unlimited: !!data.unlimited,
            used,
            limit,
            resetsAt: data.resetsAt || null
        };
    }

    /**
     * Dev-only stub mimicking Cloud Function response shape.
     * Replace with deployed function — never store authoritative counts client-side.
     */
    async function simulateServerLimitCheck(userId) {
        await new Promise((r) => setTimeout(r, 280));
        return {
            allowed: true,
            unlimited: false,
            used: 0,
            limit: AI_CONFIG.DAILY_LIMIT,
            resetsAt: getNextUtcMidnightIso(),
            _simulated: true,
            userId
        };
    }

    function getNextUtcMidnightIso() {
        const now = new Date();
        const next = new Date(Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + 1,
            0, 0, 0, 0
        ));
        return next.toISOString();
    }

    async function requestAiResponse(message) {
        const personalKey = getPersonalApiKey();
        if (personalKey) {
            return callPersonalAiApi(message, personalKey);
        }

        const headers = await getAuthHeaders();
        const res = await fetch(AI_CONFIG.CHAT_ENDPOINT, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message,
                history: chatHistory.slice(-10)
            })
        });

        if (!res.ok) {
            throw new Error(`AI chat HTTP ${res.status}`);
        }

        const data = await res.json();
        return data.reply || data.text || data.message || '';
    }

    async function callPersonalAiApi(message, apiKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: message }]
                }]
            })
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => '');
            throw new Error(errText || `Gemini API ${res.status}`);
        }

        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts;
        if (parts && parts.length) {
            return parts.map((p) => p.text || '').join('').trim();
        }
        return t('aiEmptyResponse', 'Не удалось получить ответ от модели.');
    }

    function getDom() {
        return {
            panel: document.getElementById('tools-ai-panel'),
            messages: document.getElementById('ai-chat-messages'),
            input: document.getElementById('ai-chat-input'),
            sendBtn: document.getElementById('ai-chat-send'),
            offlineToast: document.getElementById('ai-offline-toast'),
            offlineRetry: document.getElementById('ai-offline-retry'),
            limitNotice: document.getElementById('ai-limit-notice')
        };
    }

    function scrollMessagesToBottom() {
        const { messages } = getDom();
        if (!messages) return;
        requestAnimationFrame(() => {
            messages.scrollTop = messages.scrollHeight;
        });
    }

    function appendMessage(role, text) {
        const { messages } = getDom();
        if (!messages || !text) return;

        const bubble = document.createElement('div');
        bubble.className = `ai-msg ai-msg--${role}`;
        bubble.textContent = text;
        messages.appendChild(bubble);
        scrollMessagesToBottom();
    }

    function showTypingIndicator() {
        const { messages } = getDom();
        if (!messages) return null;

        const el = document.createElement('div');
        el.className = 'ai-typing';
        el.id = 'ai-typing-indicator';
        el.setAttribute('aria-label', t('aiTyping', 'Печатает'));
        el.innerHTML = '<span class="ai-typing-dot"></span><span class="ai-typing-dot"></span><span class="ai-typing-dot"></span>';
        messages.appendChild(el);
        scrollMessagesToBottom();
        return el;
    }

    function removeTypingIndicator() {
        document.getElementById('ai-typing-indicator')?.remove();
    }

    function setInputLocked(locked) {
        const { input, sendBtn } = getDom();
        if (input) {
            input.disabled = locked;
            input.setAttribute('aria-disabled', locked ? 'true' : 'false');
        }
        if (sendBtn) sendBtn.disabled = locked || isSending;
    }

    function showOfflineToast(show) {
        const { offlineToast } = getDom();
        if (!offlineToast) return;
        offlineToast.classList.toggle('hidden', !show);
    }

    function showLimitExceededUI() {
        const { limitNotice } = getDom();
        const msg = t(
            'aiLimitExceeded',
            'Превышен серверный лимит бесплатных запросов на сегодня (15/15). Сброс счётчика произойдёт в 00:00 по серверному времени. Для полного безлимита вы можете подключить личный API-ключ в Настройках'
        );
        appendMessage('system', msg);
        if (limitNotice) {
            limitNotice.textContent = msg;
            limitNotice.classList.remove('hidden');
        }
        setInputLocked(true);
    }

    async function refreshLimitState() {
        if (hasPersonalApiKey()) {
            limitState = { allowed: true, unlimited: true, used: 0, limit: AI_CONFIG.DAILY_LIMIT };
            const { limitNotice } = getDom();
            if (limitNotice) limitNotice.classList.add('hidden');
            setInputLocked(false);
            return limitState;
        }

        const userId = getUserId();
        limitState = await checkServerLimits(userId);

        if (!limitState.allowed && !limitState.unlimited) {
            if (limitState.reason === 'auth_required') {
                const authMsg = t(
                    'aiAuthRequired',
                    'Войдите через Google в Настройках, чтобы использовать бесплатные запросы SmartStudyAI, или подключите личный API-ключ.'
                );
                appendMessage('system', authMsg);
                if (limitNotice) {
                    limitNotice.textContent = authMsg;
                    limitNotice.classList.remove('hidden');
                }
                setInputLocked(true);
            } else {
                showLimitExceededUI();
            }
        } else {
            const { limitNotice } = getDom();
            if (limitNotice) limitNotice.classList.add('hidden');
            if (!isSending) setInputLocked(false);
        }

        return limitState;
    }

    async function sendMessage(rawText) {
        const text = (rawText || '').trim();
        if (!text || isSending) return;

        const dom = getDom();
        if (!dom.input || !dom.sendBtn) return;

        isSending = true;
        dom.sendBtn.disabled = true;
        pendingRetryMessage = null;
        showOfflineToast(false);

        const online = await pingNetwork();
        if (!online) {
            pendingRetryMessage = text;
            showOfflineToast(true);
            isSending = false;
            dom.sendBtn.disabled = dom.input.disabled;
            return;
        }

        if (!hasPersonalApiKey()) {
            const userId = getUserId();
            limitState = await checkServerLimits(userId);
            if (!limitState.allowed && !limitState.unlimited) {
                if (limitState.reason === 'auth_required') {
                    appendMessage('system', t(
                        'aiAuthRequired',
                        'Войдите через Google в Настройках, чтобы использовать бесплатные запросы SmartStudyAI, или подключите личный API-ключ.'
                    ));
                } else {
                    showLimitExceededUI();
                }
                isSending = false;
                dom.sendBtn.disabled = true;
                return;
            }
        }

        appendMessage('user', text);
        dom.input.value = '';
        dom.input.style.height = 'auto';

        chatHistory.push({ role: 'user', content: text });
        showTypingIndicator();

        try {
            let reply = await requestAiResponse(text);

            if (!reply && !hasPersonalApiKey()) {
                reply = t(
                    'aiPreviewReply',
                    'SmartStudyAI скоро будет доступен на сервере. Ваше сообщение принято. Подключите личный API-ключ в Настройках для полноценной работы уже сейчас.'
                );
            }

            removeTypingIndicator();
            appendMessage('assistant', reply);
            chatHistory.push({ role: 'assistant', content: reply });
        } catch (e) {
            console.error('SmartStudyAI send error:', e);
            removeTypingIndicator();
            appendMessage('system', t('aiErrorGeneric', 'Не удалось получить ответ. Попробуйте позже.'));
        } finally {
            isSending = false;
            dom.sendBtn.disabled = dom.input.disabled;
        }
    }

    function autoResizeTextarea(el) {
        if (!el) return;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }

    function bindChatEvents() {
        const dom = getDom();
        if (!dom.input || !dom.sendBtn) return;

        dom.sendBtn.addEventListener('click', () => sendMessage(dom.input.value));

        dom.input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage(dom.input.value);
            }
        });

        dom.input.addEventListener('input', () => autoResizeTextarea(dom.input));

        dom.offlineRetry?.addEventListener('click', () => {
            showOfflineToast(false);
            if (pendingRetryMessage) {
                const msg = pendingRetryMessage;
                pendingRetryMessage = null;
                sendMessage(msg);
            } else {
                pingNetwork().then((ok) => {
                    if (!ok) showOfflineToast(true);
                });
            }
        });
    }

    function applyAiTranslations() {
        const dom = getDom();
        document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = t(key, el.placeholder);
        });
        if (dom.offlineRetry) {
            dom.offlineRetry.textContent = t('aiRetry', 'Повторить попытку');
        }
        const offlineText = document.querySelector('.ai-offline-text');
        if (offlineText) {
            offlineText.textContent = t(
                'aiOfflineMessage',
                'Соединение потеряно. Проверьте Wi-Fi или мобильный интернет'
            );
        }
    }

    function resetChatView() {
        const dom = getDom();
        if (dom.messages) dom.messages.innerHTML = '';
        if (dom.input) {
            dom.input.value = '';
            dom.input.style.height = 'auto';
        }
        showOfflineToast(false);
        pendingRetryMessage = null;
        isSending = false;
        chatHistory = [];
    }

    async function onPanelOpen() {
        applyAiTranslations();
        resetChatView();

        const welcome = t(
            'aiWelcome',
            'Привет! Я SmartStudyAI — ваш помощник по учёбе. Задайте вопрос по любому предмету.'
        );
        appendMessage('assistant', welcome);
        chatHistory.push({ role: 'assistant', content: welcome });

        await refreshLimitState();
        autoResizeTextarea(getDom().input);
    }

    function initAiAssistant(options = {}) {
        bindChatEvents();
        applyAiTranslations();

        if (options.onBack) {
            document.querySelector('#tools-ai-panel .ai-chat-back')?.addEventListener('click', options.onBack);
        }

        return { onPanelOpen, refreshLimitState, sendMessage, pingNetwork, checkServerLimits };
    }

    global.SmartStudyAI = {
        init: initAiAssistant,
        config: AI_CONFIG,
        hasPersonalApiKey,
        getPersonalApiKey,
        pingNetwork,
        checkServerLimits
    };
})(typeof window !== 'undefined' ? window : globalThis);
