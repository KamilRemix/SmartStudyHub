/**
 * SmartStudyAI — client module for Tools tab.
 * Uses local database for chat history, personalization settings, and local limits.
 */
(function (global) {
    'use strict';

    // Store the original fetch before any third-party scripts can intercept it
    const initialFetch = typeof window !== 'undefined' ? window.fetch : null;

    function getCleanFetch() {
        try {
            if (initialFetch && initialFetch.toString().includes('[native code]')) {
                return initialFetch;
            }
            if (typeof window !== 'undefined' && window.fetch && window.fetch.toString().includes('[native code]')) {
                return window.fetch;
            }
            if (typeof document !== 'undefined') {
                const iframe = document.createElement('iframe');
                iframe.style.display = 'none';
                iframe.src = 'about:blank';
                document.body.appendChild(iframe);
                const iframeFetch = iframe.contentWindow.fetch;
                return iframeFetch.bind(iframe.contentWindow);
            }
        } catch (e) {
            // Ignore error and fall back to global fetch
        }
        return (typeof window !== 'undefined' ? window.fetch : null) || globalThis.fetch;
    }

    if (typeof process === 'undefined') {
        globalThis.process = { env: {} };
    }

    const AI_CONFIG = {
        PERSONAL_API_KEY_STORAGE: 'smartStudyAI_personalApiKey',
        PING_URL: 'https://www.gstatic.com/generate_204',
        PING_TIMEOUT_MS: 4000,
        DAILY_LIMIT: 30
    };

    class ApiQuotaError extends Error {
        constructor(message) {
            super(message);
            this.name = 'ApiQuotaError';
            this.isQuotaExceeded = true;
        }
    }

    function getQuotaExceededMessage() {
        return t(
            'aiQuotaExceeded',
            'Превышен лимит запросов к Google API. Пожалуйста, подождите немного или проверьте API-ключ.'
        );
    }

    function isQuotaExceededResponse(status, messageText) {
        if (status === 429) return true;
        const msg = (messageText || '').toLowerCase();
        return msg.includes('quota') ||
            msg.includes('resource exhausted') ||
            msg.includes('resource_exhausted') ||
            msg.includes('rate limit') ||
            msg.includes('too many requests');
    }

    async function readApiErrorDetails(res) {
        let errMsg = `API ${res.status}`;
        let errJson = null;
        let bodyText = '';
        try {
            bodyText = await res.text();
        } catch (_) {
            return { errMsg, errJson };
        }
        if (!bodyText) {
            return { errMsg, errJson };
        }
        try {
            errJson = JSON.parse(bodyText);
            if (errJson.error && errJson.error.message) {
                errMsg = errJson.error.message;
            } else if (errJson.error && typeof errJson.error === 'string') {
                errMsg = errJson.error;
            } else {
                errMsg = bodyText;
            }
        } catch (_) {
            errMsg = bodyText;
        }
        return { errMsg, errJson };
    }

    function isQuotaToolResult(result) {
        return !!(result && typeof result.error === 'string' && isQuotaExceededResponse(0, result.error));
    }

    function throwIfQuotaToolResult(result) {
        if (isQuotaToolResult(result)) {
            throw new ApiQuotaError(result.error || getQuotaExceededMessage());
        }
    }

    let chatHistory = [];
    let isSending = false;
    let pendingRetryMessage = null;
    let limitState = { allowed: true, used: 0, limit: AI_CONFIG.DAILY_LIMIT, unlimited: false };
    let currentChatId = null;

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

    async function getFallbackApiKey() {
        let key = '';
        if (window.electronAPI && typeof window.electronAPI.getGeminiApiKey === 'function') {
            try {
                key = await window.electronAPI.getGeminiApiKey();
            } catch (e) {
                console.error('Failed to get Gemini API key via IPC:', e);
            }
        }
        
        if (key && key.trim()) {
            return key.trim();
        }
        return '';
    }

    /**
     * Real network ping
     */
    async function pingNetwork() {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AI_CONFIG.PING_TIMEOUT_MS);
        try {
            const cleanFetch = getCleanFetch();
            const res = await cleanFetch(AI_CONFIG.PING_URL, {
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

    function getFirebaseUser() {
        return window.firebase && window.firebase.auth ? window.firebase.auth().currentUser : null;
    }

    async function syncPersonalizationFromFirebase() {
        const user = getFirebaseUser();
        if (!user) return;
        try {
            const snapshot = await window.firebase.database().ref(`users/${user.uid}/ai_settings/personalization`).once('value');
            const val = snapshot.val();
            if (val !== null) {
                localStorage.setItem('smartStudyAI_personalization', val);
            }
        } catch (e) {
            console.error('Failed to sync personalization from Firebase:', e);
        }
    }

    async function savePersonalizationToFirebase(val) {
        localStorage.setItem('smartStudyAI_personalization', val);
        const user = getFirebaseUser();
        if (!user) return;
        try {
            await window.firebase.database().ref(`users/${user.uid}/ai_settings/personalization`).set(val);
        } catch (e) {
            console.error('Failed to save personalization to Firebase:', e);
        }
    }

    async function syncLimitsFromFirebase() {
        const user = getFirebaseUser();
        if (!user) return;
        try {
            const snapshot = await window.firebase.database().ref(`users/${user.uid}/ai_settings/limits`).once('value');
            const val = snapshot.val();
            if (val) {
                localStorage.setItem('smartStudyAI_freeLimit', JSON.stringify(val));
            }
        } catch (e) {
            console.error('Failed to sync limits from Firebase:', e);
        }
    }

    async function saveLimitsToFirebase(limitObj) {
        const user = getFirebaseUser();
        if (!user) return;
        try {
            await window.firebase.database().ref(`users/${user.uid}/ai_settings/limits`).set(limitObj);
        } catch (e) {
            console.error('Failed to save limits to Firebase:', e);
        }
    }

    function checkFreeLimit() {
        if (hasPersonalApiKey()) {
            return { allowed: true, count: 0, limit: AI_CONFIG.DAILY_LIMIT };
        }
        
        const limitStr = localStorage.getItem('smartStudyAI_freeLimit');
        const today = new Date().toISOString().split('T')[0];
        
        if (limitStr) {
            try {
                const parsed = JSON.parse(limitStr);
                if (parsed.date === today) {
                    return {
                        allowed: parsed.count < AI_CONFIG.DAILY_LIMIT,
                        count: parsed.count,
                        limit: AI_CONFIG.DAILY_LIMIT
                    };
                }
            } catch (e) {}
        }
        
        return { allowed: true, count: 0, limit: AI_CONFIG.DAILY_LIMIT };
    }
    
    async function incrementFreeLimit() {
        if (hasPersonalApiKey()) return;
        const today = new Date().toISOString().split('T')[0];
        const current = checkFreeLimit();
        const nextCount = current.count + 1;
        const limitObj = {
            date: today,
            count: nextCount
        };
        localStorage.setItem('smartStudyAI_freeLimit', JSON.stringify(limitObj));
        await saveLimitsToFirebase(limitObj).catch(() => {});
    }

    async function requestAiResponse(message) {
        // 1. Check personal API key from settings
        const personalKey = getPersonalApiKey();
        if (personalKey) {
            return callPersonalAiApi(message, personalKey);
        }

        // 2. Check fallback keys depending on environment
        const isElectron = !!(window.electronAPI && typeof window.electronAPI.getGeminiApiKey === 'function');
        let fallbackKey = '';

        if (isElectron) {
            fallbackKey = await getFallbackApiKey();
        } else {
            // Web: read directly from environment variable
            fallbackKey = process.env.REACT_APP_GEMINI_API_KEY;
        }

        if (fallbackKey && fallbackKey.trim()) {
            return callPersonalAiApi(message, fallbackKey.trim());
        }

        // 3. Throw authentication error if key is still missing
        if (getFirebaseUser()) {
            throw new Error(t('aiKeyMissing', 'Общий API-ключ недоступен. Пожалуйста, укажите ваш собственный API-ключ Gemini в Настройках.'));
        }

        throw new Error(t('aiAuthRequired', 'Войдите через Google в Настройках, чтобы использовать бесплатные запросы SmartStudyAI, или подключите личный API-ключ.'));
    }

    let gsiTokenClient = null;
    
    function initGSI() {
        if (!gsiTokenClient && window.google?.accounts?.oauth2) {
            gsiTokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com',
                scope: 'https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/documents https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/tasks https://www.googleapis.com/auth/youtube.readonly',
                callback: '' // Defined dynamically
            });
        }
    }

    function refreshGoogleTokenSeamlessly() {
        return new Promise((resolve, reject) => {
            initGSI();
            if (!gsiTokenClient) {
                reject(new Error("GSI library not loaded"));
                return;
            }
            gsiTokenClient.callback = (resp) => {
                if (resp.error !== undefined) {
                    reject(resp);
                } else {
                    localStorage.setItem('google_access_token', resp.access_token);
                    resolve(resp.access_token);
                }
            };
            gsiTokenClient.requestAccessToken({ prompt: '' });
        });
    }

    async function executeToolCall(name, args, apiKey, isRetry = false) {
        const token = localStorage.getItem('google_access_token');
        if (!token && name !== 'search_google') {
            return { error: "User is not logged in with Google. Please link/sign in with Google in Settings to enable this extension." };
        }

        async function checkResponse(res, apiName) {
            if (!res.ok) {
                const { errMsg } = await readApiErrorDetails(res);
                if (isQuotaExceededResponse(res.status, errMsg)) {
                    return { error: getQuotaExceededMessage() };
                }
                if (res.status === 401 || res.status === 403) {
                    throw new Error('AUTH_EXPIRED');
                }
                return { error: `Google ${apiName} API error: ${res.status} - ${errMsg}` };
            }
            return null;
        }

        try {
            if (name === 'search_google') {
                const query = args.query;
                try {
                    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
                    const requestBody = {
                        contents: [{ role: 'user', parts: [{ text: `Find detailed information about: ${query}` }] }],
                        tools: [{ googleSearch: {} }]
                    };
                    const cleanFetch = getCleanFetch();
                    const res = await cleanFetch(url, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    });
                    if (res.ok) {
                        const data = await res.json();
                        const candidate = data.candidates && data.candidates[0];
                        if (candidate && candidate.content && candidate.content.parts) {
                            const textPart = candidate.content.parts.find(p => p.text);
                            const answerText = textPart ? textPart.text : 'No detailed answer found.';
                            return {
                                results: [{
                                    title: `Google Search: ${query}`,
                                    snippet: answerText,
                                    link: `https://www.google.com/search?q=${encodeURIComponent(query)}`
                                }]
                            };
                        }
                    }
                    return {
                        results: [{
                            title: `Google Search: ${query}`,
                            snippet: `Could not fetch native search results. Link: https://www.google.com/search?q=${encodeURIComponent(query)}`,
                            link: `https://www.google.com/search?q=${encodeURIComponent(query)}`
                        }]
                    };
                } catch (e) {
                    return { error: `Failed to execute search: ${e.message}` };
                }
            }

            if (name === 'listGmailMessages') {
                const maxResults = args.maxResults || 10;
                let url = `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}`;
                if (args.q) {
                    url += `&q=${encodeURIComponent(args.q)}`;
                }
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const err = await checkResponse(res, 'Gmail');
                if (err) return err;
                const data = await res.json();
                return {
                    messages: (data.messages || []).map(m => ({ id: m.id, threadId: m.threadId }))
                };
            }

            if (name === 'getGmailMessage') {
                const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${args.id}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const err = await checkResponse(res, 'Gmail');
                if (err) return err;
                const data = await res.json();
                
                const headers = data.payload?.headers || [];
                const subjectHeader = headers.find(h => h.name.toLowerCase() === 'subject');
                const fromHeader = headers.find(h => h.name.toLowerCase() === 'from');
                const dateHeader = headers.find(h => h.name.toLowerCase() === 'date');
                
                let bodyText = "";
                if (data.payload?.parts) {
                    const textPart = data.payload.parts.find(p => p.mimeType === 'text/plain');
                    if (textPart && textPart.body?.data) {
                        bodyText = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    } else if (data.payload.parts[0]?.body?.data) {
                        bodyText = atob(data.payload.parts[0].body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    }
                } else if (data.payload?.body?.data) {
                    bodyText = atob(data.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                }
                
                return {
                    id: data.id,
                    threadId: data.threadId,
                    from: fromHeader ? fromHeader.value : '',
                    subject: subjectHeader ? subjectHeader.value : '',
                    date: dateHeader ? dateHeader.value : '',
                    snippet: data.snippet || '',
                    body: bodyText
                };
            }

            if (name === 'sendGmailEmail') {
                const email = [
                    `To: ${args.to}`,
                    `Subject: ${args.subject}`,
                    'Content-Type: text/plain; charset="UTF-8"',
                    '',
                    args.body
                ].join('\r\n');
                
                const base64Safe = btoa(unescape(encodeURIComponent(email)))
                    .replace(/\+/g, '-')
                    .replace(/\//g, '_')
                    .replace(/=+$/, '');
                    
                const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ raw: base64Safe })
                });
                const err = await checkResponse(res, 'Gmail');
                if (err) return err;
                const data = await res.json();
                return { success: true, messageId: data.id, threadId: data.threadId };
            }

            if (name === 'listDriveFiles') {
                const maxResults = args.maxResults || 10;
                let url = `https://www.googleapis.com/drive/v3/files?maxResults=${maxResults}&fields=files(id,name,mimeType,webViewLink)`;
                if (args.q) {
                    url += `&q=${encodeURIComponent(args.q)}`;
                }
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const err = await checkResponse(res, 'Drive');
                if (err) return err;
                const data = await res.json();
                return { files: data.files || [] };
            }

            if (name === 'createGoogleDoc') {
                const res = await fetch(`https://docs.googleapis.com/v1/documents`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: args.title
                    })
                });
                const err = await checkResponse(res, 'Google Docs');
                if (err) return err;
                const data = await res.json();
                const docId = data.documentId;
                
                if (args.content) {
                    const updateRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            requests: [
                                {
                                    insertText: {
                                        text: args.content,
                                        location: { index: 1 }
                                    }
                                }
                            ]
                        })
                    });
                    const updateErr = await checkResponse(updateRes, 'Google Docs Content Update');
                    if (updateErr) {
                        return { success: true, documentId: docId, title: data.title, contentError: updateErr.error };
                    }
                }
                
                return { success: true, documentId: docId, title: data.title, webViewLink: `https://docs.google.com/document/d/${docId}/edit` };
            }

            if (name === 'getGoogleDoc') {
                const res = await fetch(`https://docs.googleapis.com/v1/documents/${args.documentId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                const err = await checkResponse(res, 'Google Docs');
                if (err) return err;
                const data = await res.json();
                
                let bodyText = "";
                if (data.body && data.body.content) {
                    for (const element of data.body.content) {
                        if (element.paragraph && element.paragraph.elements) {
                            for (const run of element.paragraph.elements) {
                                if (run.textRun && run.textRun.content) {
                                    bodyText += run.textRun.content;
                                }
                            }
                        }
                    }
                }
                
                return { documentId: args.documentId, title: data.title, body: bodyText };
            }

            if (name === 'listKeepNotes') {
                try {
                    const res = await fetch(`https://keep.googleapis.com/v1/notes`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const err = await checkResponse(res, 'Keep');
                    if (err) {
                        console.warn("Direct Keep API access failed. Falling back to local simulation.", err);
                    } else {
                        const data = await res.json();
                        return { notes: data.notes || [] };
                    }
                } catch (e) {
                    console.warn("Direct Google Keep API failed, falling back to local simulation.", e);
                }
                const localNotes = JSON.parse(localStorage.getItem('smartStudyAI_keep_notes') || '[]');
                return { notes: localNotes.slice(0, args.maxResults || 10) };
            }

            if (name === 'createKeepNote') {
                try {
                    const res = await fetch(`https://keep.googleapis.com/v1/notes`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            title: args.title || '',
                            body: { text: { text: args.body } }
                        })
                    });
                    const err = await checkResponse(res, 'Keep');
                    if (err) {
                        console.warn("Direct Keep API access failed. Falling back to local simulation.", err);
                    } else {
                        const data = await res.json();
                        return { success: true, noteId: data.name, title: data.title };
                    }
                } catch (e) {
                    console.warn("Direct Google Keep create failed, falling back to local simulation.", e);
                }
                const localNotes = JSON.parse(localStorage.getItem('smartStudyAI_keep_notes') || '[]');
                const newNote = {
                    name: `notes/mock-${Date.now()}`,
                    title: args.title || 'Untitled',
                    body: { text: { text: args.body } },
                    createTime: new Date().toISOString()
                };
                localNotes.unshift(newNote);
                localStorage.setItem('smartStudyAI_keep_notes', JSON.stringify(localNotes));
                return { success: true, noteId: newNote.name, title: newNote.title, simulated: true };
            }

            if (name === 'listCalendarEvents') {
                const maxResults = args.maxResults || 10;
                const timeMin = encodeURIComponent(new Date().toISOString());
                const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?maxResults=${maxResults}&timeMin=${timeMin}&orderBy=startTime&singleEvents=true`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const err = await checkResponse(res, 'Calendar');
                if (err) return err;
                const data = await res.json();
                return {
                    events: (data.items || []).map(item => ({
                        summary: item.summary,
                        description: item.description || '',
                        start: item.start?.dateTime || item.start?.date || '',
                        end: item.end?.dateTime || item.end?.date || '',
                        link: item.htmlLink || ''
                    }))
                };
            }

            if (name === 'createCalendarEvent') {
                const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        summary: args.summary,
                        description: args.description || 'Created via SmartStudyHub AI Assistant',
                        start: { dateTime: args.startTime },
                        end: { dateTime: args.endTime }
                    })
                });
                const err = await checkResponse(res, 'Calendar');
                if (err) return err;
                const data = await res.json();
                return {
                    success: true,
                    eventId: data.id,
                    link: data.htmlLink || '',
                    summary: data.summary
                };
            }

            if (name === 'listTasks') {
                const maxResults = args.maxResults || 10;
                const res = await fetch(`https://www.googleapis.com/tasks/v1/lists/@default/tasks?maxResults=${maxResults}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const err = await checkResponse(res, 'Tasks');
                if (err) return err;
                const data = await res.json();
                return {
                    tasks: (data.items || []).map(item => ({
                        title: item.title,
                        notes: item.notes || '',
                        due: item.due || '',
                        status: item.status || '',
                        id: item.id
                    }))
                };
            }

            if (name === 'createTask') {
                const res = await fetch(`https://www.googleapis.com/tasks/v1/lists/@default/tasks`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        title: args.title,
                        notes: args.notes || 'Created via SmartStudyHub AI Assistant',
                        due: args.due || undefined
                    })
                });
                const err = await checkResponse(res, 'Tasks');
                if (err) return err;
                const data = await res.json();
                return {
                    success: true,
                    taskId: data.id,
                    title: data.title
                };
            }

            if (name === 'searchYouTube') {
                const query = args.query;
                const maxResults = args.maxResults || 5;
                let url = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query)}&maxResults=${maxResults}&type=video`;
                if (apiKey) {
                    url += `&key=${encodeURIComponent(apiKey)}`;
                }
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const err = await checkResponse(res, 'YouTube');
                if (err) return err;
                const data = await res.json();
                return {
                    videos: (data.items || []).map(item => ({
                        title: item.snippet?.title || '',
                        description: item.snippet?.description || '',
                        videoId: item.id?.videoId || '',
                        videoUrl: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : '',
                        channelTitle: item.snippet?.channelTitle || ''
                    }))
                };
            }

            // Notes Management
            if (name === 'listNotes') {
                if (!window.aiListNotes) return { error: "Notes app is not initialized." };
                return { notes: window.aiListNotes() };
            }
            if (name === 'createNote') {
                if (!window.aiCreateNote) return { error: "Notes app is not initialized." };
                const id = window.aiCreateNote(args.title, args.text, args.color);
                return { success: true, noteId: id };
            }
            if (name === 'updateNote') {
                if (!window.aiUpdateNote) return { error: "Notes app is not initialized." };
                const success = window.aiUpdateNote(args.id, args.title, args.text, args.color);
                return { success: success };
            }
            if (name === 'deleteNote') {
                if (!window.aiDeleteNote) return { error: "Notes app is not initialized." };
                const success = window.aiDeleteNote(args.id);
                return { success: success };
            }

            return { error: `Unknown tool: ${name}` };
        } catch (e) {
            if (e instanceof ApiQuotaError || e.isQuotaExceeded) {
                throw e;
            }
            if (e.message === 'AUTH_EXPIRED' && !isRetry) {
                try {
                    console.log('Token expired, attempting seamless refresh via GSI...');
                    await refreshGoogleTokenSeamlessly();
                    console.log('Refresh successful! Retrying tool call...');
                    return await executeToolCall(name, args, apiKey, true);
                } catch (refreshErr) {
                    console.error('Seamless token refresh failed:', refreshErr);
                    return { error: 'Google API authorization error. Session expired and automatic refresh failed. Please go to Settings, click Sign Out, and sign in with Google again.' };
                }
            }
            console.error(`Error executing tool ${name}:`, e);
            return { error: `Exception during tool execution: ${e.message || e}` };
        }
    }

    async function callPersonalAiApi(message, apiKey) {
        // Models list: gemini-2.0-flash is extremely fast and supported in this project environment
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
        
        // Build contents history
        const contents = [];
        chatHistory.forEach(item => {
            if (item.role === 'user' || item.role === 'assistant') {
                contents.push({
                    role: item.role === 'user' ? 'user' : 'model',
                    parts: [{ text: item.content }]
                });
            }
        });

        // Add current message
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        let loop = true;
        let finalResponseData = null;
        let maxTurns = 5;
        let turn = 0;

        while (loop && turn < maxTurns) {
            turn++;
            const tools = [];
            const functionDeclarations = [
                {
                    name: "search_google",
                    description: "Search Google for real-time information, news, current events, weather, details about movies, TV shows, or any facts not present in your training data.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            query: {
                                type: "STRING",
                                description: "The search query to look up on Google."
                            }
                        },
                        required: ["query"]
                    }
                }
            ];

            const extGmail = localStorage.getItem('smartStudyAI_ext_gmail') === 'true';
            const extDrive = localStorage.getItem('smartStudyAI_ext_drive') === 'true';
            const extDocs = localStorage.getItem('smartStudyAI_ext_docs') === 'true';
            const extKeep = localStorage.getItem('smartStudyAI_ext_keep') === 'true';
            const extCalendar = localStorage.getItem('smartStudyAI_ext_calendar') === 'true';
            const extTasks = localStorage.getItem('smartStudyAI_ext_tasks') === 'true';
            const extYoutube = localStorage.getItem('smartStudyAI_ext_youtube') === 'true';

            if (extGmail) {
                functionDeclarations.push({
                    name: "listGmailMessages",
                    description: "List email messages from the user's Gmail mailbox.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            maxResults: {
                                type: "INTEGER",
                                description: "Maximum number of messages to return. Default is 10."
                            },
                            q: {
                                type: "STRING",
                                description: "Search query query string (same format as in the Gmail search box, e.g., 'from:somebody' or 'subject:important')."
                            }
                        }
                    }
                });
                functionDeclarations.push({
                    name: "getGmailMessage",
                    description: "Get the details and content of a specific Gmail message by its ID.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            id: {
                                type: "STRING",
                                description: "The unique ID of the Gmail message."
                            }
                        },
                        required: ["id"]
                    }
                });
                functionDeclarations.push({
                    name: "sendGmailEmail",
                    description: "Send a plain text email to a recipient.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            to: {
                                type: "STRING",
                                description: "The email address of the recipient."
                            },
                            subject: {
                                type: "STRING",
                                description: "The subject of the email."
                            },
                            body: {
                                type: "STRING",
                                description: "The plain text body content of the email."
                            }
                        },
                        required: ["to", "subject", "body"]
                    }
                });
            }

            if (extDrive) {
                functionDeclarations.push({
                    name: "listDriveFiles",
                    description: "List the user's files and documents stored in Google Drive.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            maxResults: {
                                type: "INTEGER",
                                description: "Maximum number of files to return. Default is 10."
                            },
                            q: {
                                type: "STRING",
                                description: "Query string for filtering files (e.g., name contains 'study' or mimeType = 'application/pdf')."
                            }
                        }
                    }
                });
            }

            if (extDocs) {
                functionDeclarations.push({
                    name: "createGoogleDoc",
                    description: "Create a new document in Google Docs. Returns the documentId.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: {
                                type: "STRING",
                                description: "The title of the new Google Doc."
                            },
                            content: {
                                type: "STRING",
                                description: "Optional content to initially populate the document with."
                            }
                        },
                        required: ["title"]
                    }
                });
                functionDeclarations.push({
                    name: "getGoogleDoc",
                    description: "Read the title and text content of an existing Google Doc by its ID.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            documentId: {
                                type: "STRING",
                                description: "The unique ID of the Google Doc."
                            }
                        },
                        required: ["documentId"]
                    }
                });
            }

            if (extKeep) {
                functionDeclarations.push({
                    name: "listKeepNotes",
                    description: "List the user's notes from Google Keep.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            maxResults: {
                                type: "INTEGER",
                                description: "Maximum number of notes to return. Default is 10."
                            }
                        }
                    }
                });
                functionDeclarations.push({
                    name: "createKeepNote",
                    description: "Create a new note in Google Keep.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: {
                                type: "STRING",
                                description: "The title of the note."
                            },
                            body: {
                                type: "STRING",
                                description: "The text content or body of the note."
                            }
                        },
                        required: ["body"]
                    }
                });
            }

            // Check Notes Extension
            const extNotesCheckbox = document.getElementById('ext-notes');
            if (extNotesCheckbox && extNotesCheckbox.checked) {
                functionDeclarations.push({
                    name: "listNotes",
                    description: "List all user notes stored in the SmartStudyHub Notes application.",
                    parameters: { type: "OBJECT", properties: {} }
                });
                functionDeclarations.push({
                    name: "createNote",
                    description: "Create a new note in the Notes application.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: { type: "STRING", description: "Title of the note." },
                            text: { type: "STRING", description: "Main text content of the note." },
                            color: { type: "STRING", description: "Color of the note in hex. E.g. #202124 (default), #5c2b29 (red), #614a19 (orange), #635d19 (yellow), #345920 (green), #16504b (teal), #2d555e (blue), #1e3a8a (dark blue), #42275e (purple), #5b2245 (pink)." }
                        },
                        required: ["text"]
                    }
                });
                functionDeclarations.push({
                    name: "updateNote",
                    description: "Update an existing note in the Notes application.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            id: { type: "STRING", description: "The ID of the note to update." },
                            title: { type: "STRING", description: "New title of the note." },
                            text: { type: "STRING", description: "New text content of the note." },
                            color: { type: "STRING", description: "New color of the note in hex." }
                        },
                        required: ["id"]
                    }
                });
                functionDeclarations.push({
                    name: "deleteNote",
                    description: "Delete an existing note in the Notes application.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            id: { type: "STRING", description: "The ID of the note to delete." }
                        },
                        required: ["id"]
                    }
                });
            }

            if (extCalendar) {
                functionDeclarations.push({
                    name: "listCalendarEvents",
                    description: "List the user's upcoming Google Calendar events from the primary calendar.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            maxResults: {
                                type: "INTEGER",
                                description: "Maximum number of events to return. Default is 10."
                            }
                        }
                    }
                });
                functionDeclarations.push({
                    name: "createCalendarEvent",
                    description: "Create a new event in the user's primary Google Calendar. All times must be in ISO 8601 string format (e.g. '2026-07-11T15:00:00Z').",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            summary: {
                                type: "STRING",
                                description: "The title or summary of the event."
                            },
                            description: {
                                type: "STRING",
                                description: "The description of the event."
                            },
                            startTime: {
                                type: "STRING",
                                description: "The start date-time in ISO 8601 format (e.g., '2026-07-11T15:00:00Z')."
                            },
                            endTime: {
                                type: "STRING",
                                description: "The end date-time in ISO 8601 format (e.g., '2026-07-11T16:00:00Z')."
                            }
                        },
                        required: ["summary", "startTime", "endTime"]
                    }
                });
            }

            if (extTasks) {
                functionDeclarations.push({
                    name: "listTasks",
                    description: "List the user's active Google Tasks.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            maxResults: {
                                type: "INTEGER",
                                description: "Maximum number of tasks to return. Default is 10."
                            }
                        }
                    }
                });
                functionDeclarations.push({
                    name: "createTask",
                    description: "Create a new task in the user's Google Tasks default list.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            title: {
                                type: "STRING",
                                description: "The title of the task."
                            },
                            notes: {
                                type: "STRING",
                                description: "The description or notes of the task."
                            },
                            due: {
                                type: "STRING",
                                description: "The due date in ISO 8601 format (e.g. '2026-07-11T23:59:59Z')."
                            }
                        },
                        required: ["title"]
                    }
                });
            }

            if (extYoutube) {
                functionDeclarations.push({
                    name: "searchYouTube",
                    description: "Search YouTube for videos, music, tutorials, or educational content. Returns a list of video titles, descriptions, and links.",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            query: {
                                type: "STRING",
                                description: "The search query for YouTube."
                            },
                            maxResults: {
                                type: "INTEGER",
                                description: "Maximum number of video results to return. Default is 5."
                            }
                        },
                        required: ["query"]
                    }
                });
            }

            if (functionDeclarations.length > 0) {
                tools.push({ functionDeclarations });
            }

            const personalization = localStorage.getItem('smartStudyAI_personalization') || '';
            const systemPrompt = `You are SmartStudyAI, a helpful educational assistant for school and university students.
Always stay in character. Speak in the user's language.
${personalization ? 'Here is some information about the student to tailor your responses: ' + personalization : ''}`;

            const requestBody = {
                contents: contents,
                systemInstruction: {
                    parts: [{ text: systemPrompt }]
                }
            };
            if (tools.length > 0) {
                requestBody.tools = tools;
            }

            const cleanFetch = getCleanFetch();
            let res;
            try {
                res = await cleanFetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                });
            } catch (fetchErr) {
                console.error('Gemini API network error:', fetchErr);
                throw new Error(t('aiErrorGeneric', 'Не удалось получить ответ. Попробуйте позже.'));
            }

            if (!res.ok) {
                const { errMsg, errJson } = await readApiErrorDetails(res);
                if (isQuotaExceededResponse(res.status, errMsg)) {
                    throw new ApiQuotaError(getQuotaExceededMessage());
                }
                throw new Error(errMsg || `Gemini API ${res.status}`);
            }

            const data = await res.json();
            const candidate = data.candidates?.[0];
            const content = candidate?.content;
            const parts = content?.parts;
            const groundingMetadata = candidate?.groundingMetadata || null;

            if (!parts || !parts.length) {
                finalResponseData = {
                    text: t('aiEmptyResponse', 'Не удалось получить ответ от модели.'),
                    groundingMetadata: null
                };
                loop = false;
                break;
            }

            const functionCalls = parts.filter(p => p.functionCall);
            if (functionCalls.length > 0) {
                // Ensure model role is explicitly set
                contents.push({
                    role: "model",
                    parts: parts
                });

                const responseParts = [];
                for (const part of functionCalls) {
                    const fc = part.functionCall;
                    
                    // Add beautiful UI badge for API call
                    const dom = getDom();
                    let toolBadge = null;
                    if (dom.messages) {
                        toolBadge = document.createElement('div');
                        toolBadge.className = 'ai-tool-badge loading';
                        let icon = 'api';
                        let text = `Использует ${fc.name}...`;
                        
                        // Badge logic logic updated for all tools
                        if (fc.name === 'search_google') { icon = 'travel_explore'; text = t('aiSearchingGoogle', 'Поиск в Google...'); }
                        else if (fc.name === 'listGmailMessages' || fc.name === 'getGmailMessage') { icon = 'mail'; text = t('aiConnectingGmail', 'Подключение к Gmail...'); }
                        else if (fc.name === 'listDriveFiles' || fc.name === 'getDriveDocument') { icon = 'folder'; text = t('aiConnectingDrive', 'Поиск в Google Drive...'); }
                        else if (fc.name === 'listCalendarEvents' || fc.name === 'createCalendarEvent') { icon = 'calendar_month'; text = t('aiConnectingCalendar', 'Синхронизация календаря...'); }
                        else if (fc.name === 'searchYouTube') { icon = 'youtube_activity'; text = t('aiConnectingYouTube', 'Поиск на YouTube...'); }
                        else if (fc.name === 'listTasks' || fc.name === 'createTask') { icon = 'check_circle'; text = t('aiConnectingTasks', 'Синхронизация задач...'); }
                        else if (['listNotes', 'createNote', 'updateNote', 'deleteNote'].includes(fc.name)) { icon = 'description'; text = t('aiConnectingNotes', 'Работа с Заметками...'); }
                        
                        toolBadge.innerHTML = `<span class="material-symbols-outlined spinning">${icon}</span> <span>${text}</span>`;
                        
                        // Insert badge before typing indicator if it exists
                        const typingInd = dom.messages.querySelector('.ai-typing');
                        if (typingInd) {
                            dom.messages.insertBefore(toolBadge, typingInd);
                        } else {
                            dom.messages.appendChild(toolBadge);
                        }
                        dom.messages.scrollTop = dom.messages.scrollHeight;
                    }

                    const result = await executeToolCall(fc.name, fc.args, apiKey);
                    
                    if (toolBadge) {
                        toolBadge.classList.remove('loading');
                        toolBadge.classList.add('success');
                        toolBadge.innerHTML = `<span class="material-symbols-outlined">check_circle</span> <span>Готово</span>`;
                        setTimeout(() => {
                            toolBadge.style.opacity = '0';
                            setTimeout(() => toolBadge.remove(), 300);
                        }, 1500);
                    }

                    throwIfQuotaToolResult(result);
                    responseParts.push({
                        functionResponse: {
                            name: fc.name,
                            response: result
                        }
                    });
                }

                contents.push({
                    role: "user",
                    parts: responseParts
                });
            } else {
                finalResponseData = {
                    text: parts.map((p) => p.text || '').join('').trim(),
                    groundingMetadata: groundingMetadata
                };
                loop = false;
            }
        }

        if (finalResponseData) {
            return finalResponseData;
        }

        throw new Error("Maximum function calling turns exceeded.");
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

    function appendMessage(role, text, groundingMetadata, extraClass = '') {
        const { messages } = getDom();
        if (!messages || !text) return;

        const bubble = document.createElement('div');
        bubble.className = `ai-msg ai-msg--${role}${extraClass ? ` ${extraClass}` : ''}`;
        
        // Support basic markdown rendering (bold, lists, backticks code) for high-quality responses
        let contentHtml = renderMarkdownSimple(text);
        
        if (role === 'assistant' && groundingMetadata) {
            contentHtml += renderGroundingMetadata(groundingMetadata);
        }
        
        bubble.innerHTML = contentHtml;
        messages.appendChild(bubble);
        scrollMessagesToBottom();
    }

    function renderGroundingMetadata(metadata) {
        if (!metadata) return '';
        
        let html = '';
        const queries = metadata.webSearchQueries || [];
        const chunks = metadata.groundingChunks || [];
        
        if (queries.length > 0 || chunks.length > 0) {
            html += `<div class="ai-grounding-container">`;
            
            // Render search queries used
            if (queries.length > 0) {
                html += `
                    <div class="ai-search-queries">
                        <span class="ai-search-badge">Google Search</span>
                        <span style="font-weight: 500; margin-left: 4px;">${t('aiSearchQueries', 'Поисковый запрос')}:</span>
                        <span style="font-style: italic;">"${escapeHtml(queries.join(', '))}"</span>
                    </div>
                `;
            }
            
            // Render sources
            const webChunks = chunks.filter(c => c.web && c.web.uri);
            if (webChunks.length > 0) {
                html += `
                    <div class="ai-sources-title">
                        <span>${t('aiSources', 'Источники')}:</span>
                    </div>
                    <ul class="ai-sources-list">
                `;
                
                webChunks.forEach((chunk, index) => {
                    const uri = chunk.web.uri;
                    const title = chunk.web.title || uri;
                    let domain = '';
                    try {
                        domain = new URL(uri).hostname.replace('www.', '');
                    } catch (e) {
                        domain = uri;
                    }
                    
                    html += `
                        <li class="ai-source-item">
                            <a href="${escapeHtml(uri)}" target="_blank" class="ai-source-link">
                                <span class="ai-source-index">${index + 1}</span>
                                <span class="ai-source-text">${escapeHtml(title)}</span>
                                <span class="ai-source-domain">(${escapeHtml(domain)})</span>
                            </a>
                        </li>
                    `;
                });
                
                html += `</ul>`;
            }
            
            html += `</div>`;
        }
        
        return html;
    }

    function renderMarkdownSimple(text) {
        // Escaped HTML first to prevent XSS
        let escaped = escapeHtml(text);
        // Bold: **text** -> <strong>text</strong>
        escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic: *text* -> <em>text</em>
        escaped = escaped.replace(/\*(.*?)\*/g, '<em>$1</em>');
        // Inline code: `code` -> <code>code</code>
        escaped = escaped.replace(/`(.*?)`/g, '<code>$1</code>');
        // Markdown Links: [text](url) -> <a href="$2" target="_blank" class="ai-chat-link">$1</a>
        escaped = escaped.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" class="ai-chat-link">$1</a>');
        // Line breaks: \n -> <br>
        escaped = escaped.replace(/\n/g, '<br>');
        return escaped;
    }

    let typingTimer = null;

    function showTypingIndicator() {
        const { messages } = getDom();
        if (!messages) return null;

        const el = document.createElement('div');
        el.className = 'ai-typing';
        el.id = 'ai-typing-indicator';
        el.setAttribute('aria-label', t('aiTyping', 'Печатает'));
        
        el.innerHTML = `
            <div class="ai-typing-dots">
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
                <span class="ai-typing-dot"></span>
            </div>
            <span class="ai-typing-text" style="font-size: 0.82rem; margin-left: 8px; color: var(--text-color); opacity: 0.85;">${t('aiThinking', 'SmartStudyAI думает...')}</span>
        `;
        messages.appendChild(el);
        scrollMessagesToBottom();

        // After 1.5 seconds, update status to indicate Google Search is active
        typingTimer = setTimeout(() => {
            const textEl = el.querySelector('.ai-typing-text');
            if (textEl) {
                textEl.innerHTML = `<span class="material-symbols-outlined" style="font-size: 1rem; vertical-align: middle; margin-right: 4px;">search</span>${t('aiSearchingGoogle', 'Поиск в Google...')}`;
                textEl.style.color = '#007aff';
                textEl.style.fontWeight = '500';
            }
        }, 1500);

        return el;
    }

    function removeTypingIndicator() {
        if (typingTimer) {
            clearTimeout(typingTimer);
            typingTimer = null;
        }
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
            'Вы исчерпали лимит бесплатных запросов на сегодня (30/30). Чтобы общаться без ограничений, укажите свой собственный ключ API в Настройках.'
        );
        appendMessage('system', msg);
        if (limitNotice) {
            limitNotice.textContent = msg;
            limitNotice.classList.remove('hidden');
        }
        setInputLocked(true);
    }

    function showQuotaExceededUI(message) {
        const msg = message || getQuotaExceededMessage();
        const { limitNotice } = getDom();
        appendMessage('system', msg, null, 'ai-msg--quota');
        if (limitNotice) {
            limitNotice.textContent = msg;
            limitNotice.classList.remove('hidden');
        }
        if (typeof showToast === 'function') {
            showToast(msg, 'warning', 8000);
        }
        setInputLocked(false);
    }

    async function refreshLimitState() {
        if (hasPersonalApiKey()) {
            limitState = { allowed: true, unlimited: true, used: 0, limit: AI_CONFIG.DAILY_LIMIT };
            const { limitNotice } = getDom();
            if (limitNotice) limitNotice.classList.add('hidden');
            setInputLocked(false);
            return limitState;
        }

        const current = checkFreeLimit();
        limitState = {
            allowed: current.allowed,
            unlimited: false,
            used: current.count,
            limit: current.limit
        };

        const { limitNotice } = getDom();
        if (!limitState.allowed) {
            showLimitExceededUI();
        } else {
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
            const current = checkFreeLimit();
            if (!current.allowed) {
                showLimitExceededUI();
                isSending = false;
                dom.sendBtn.disabled = true;
                return;
            }
        }

        appendMessage('user', text);
        dom.input.value = '';
        dom.input.style.height = 'auto';

        chatHistory.push({ role: 'user', content: text });
        saveCurrentChat();
        showTypingIndicator();

        try {
            let { text: replyText, groundingMetadata } = await requestAiResponse(text);

            removeTypingIndicator();
            appendMessage('assistant', replyText, groundingMetadata);
            chatHistory.push({ role: 'assistant', content: replyText, groundingMetadata: groundingMetadata });
            saveCurrentChat();
            
            // Only increment limit on successful API call for fallback key
            if (!hasPersonalApiKey()) {
                incrementFreeLimit();
                await refreshLimitState();
            }
        } catch (e) {
            console.error('SmartStudyAI send error:', e);
            removeTypingIndicator();
            if (e instanceof ApiQuotaError || e.isQuotaExceeded) {
                showQuotaExceededUI(e.message);
            } else if (isQuotaExceededResponse(0, e.message || '')) {
                showQuotaExceededUI(getQuotaExceededMessage());
            } else if (e.message === 'AUTH_EXPIRED') {
                appendMessage('system', t('aiAuthExpiredDesc', 'Сессия Google устарела. Пожалуйста, зайдите в Настройки и войдите заново.'));
            } else {
                appendMessage('system', e.message || t('aiErrorGeneric', 'Не удалось получить ответ. Попробуйте позже.'));
            }
        } finally {
            isSending = false;
            dom.sendBtn.disabled = dom.input.disabled;
        }
    }

    function autoResizeTextarea(el) {
        if (!el) return;
        el.style.height = '44px';
        if (el.value.trim() === '') return;
        el.style.height = Math.min(el.scrollHeight, 120) + 'px';
    }

    /* --- Chat History & Multi-Dialog Storage --- */
    function getChats() {
        try {
            const data = localStorage.getItem('smartStudyAI_chats');
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    function saveChats(chats) {
        try {
            localStorage.setItem('smartStudyAI_chats', JSON.stringify(chats));
        } catch (e) {
            console.error('Failed to save chats:', e);
        }
    }

    function loadChatHistory(chatId) {
        const chats = getChats();
        const chat = chats.find(c => c.id === chatId);
        if (chat) {
            currentChatId = chatId;
            chatHistory = chat.history || [];
            localStorage.setItem('smartStudyAI_currentChatId', chatId);
            renderChatHistory();
            refreshLimitState();
        }
    }

    function createNewChat() {
        const chats = getChats();
        const newId = 'chat_' + Date.now();
        const defaultTitle = currentLang === 'ru' ? 'Новый диалог' : 'New Chat';
        const newChat = {
            id: newId,
            title: defaultTitle,
            timestamp: Date.now(),
            history: []
        };
        chats.unshift(newChat);
        saveChats(chats);
        currentChatId = newId;
        chatHistory = [];
        localStorage.setItem('smartStudyAI_currentChatId', newId);
        
        renderChatHistory();
        renderChatsList();
        
        const welcome = t(
            'aiWelcome',
            'Привет! Я SmartStudyAI — ваш помощник по учёбе. Задайте вопрос по любому предмету.'
        );
        appendMessage('assistant', welcome);
        chatHistory.push({ role: 'assistant', content: welcome });
        saveCurrentChat();
    }

    function saveCurrentChat() {
        if (!currentChatId) return;
        const chats = getChats();
        const chatIndex = chats.findIndex(c => c.id === currentChatId);
        if (chatIndex !== -1) {
            chats[chatIndex].history = chatHistory;
            const firstUserMsg = chatHistory.find(m => m.role === 'user');
            if (firstUserMsg && (chats[chatIndex].title === 'Новый диалог' || chats[chatIndex].title === 'New Chat')) {
                chats[chatIndex].title = firstUserMsg.content.slice(0, 22) + (firstUserMsg.content.length > 22 ? '...' : '');
            }
            saveChats(chats);
            renderChatsList();
        }
    }

    function deleteChat(chatId, event) {
        if (event) event.stopPropagation();
        const chats = getChats();
        const filtered = chats.filter(c => c.id !== chatId);
        saveChats(filtered);
        
        if (currentChatId === chatId) {
            if (filtered.length > 0) {
                loadChatHistory(filtered[0].id);
            } else {
                createNewChat();
            }
        } else {
            renderChatsList();
        }
    }

    function renderChatHistory() {
        const { messages } = getDom();
        if (!messages) return;
        messages.innerHTML = '';
        chatHistory.forEach(item => {
            appendMessage(item.role, item.content, item.groundingMetadata);
        });
        scrollMessagesToBottom();
    }

    function renderChatsList() {
        const listContainer = document.getElementById('ai-chats-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';
        
        const chats = getChats();
        chats.forEach(chat => {
            const item = document.createElement('div');
            item.className = `ai-chat-item ${chat.id === currentChatId ? 'active' : ''}`;
            item.innerHTML = `
                <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(chat.title)}</span>
                <button type="button" class="ai-chat-item-delete">✕</button>
            `;
            
            item.addEventListener('click', () => {
                loadChatHistory(chat.id);
                document.getElementById('ai-drawer')?.classList.add('hidden');
            });
            
            const delBtn = item.querySelector('.ai-chat-item-delete');
            delBtn.addEventListener('click', (e) => {
                deleteChat(chat.id, e);
            });
            
            listContainer.appendChild(item);
        });
    }

    /* --- History Drawer & Personalization Handlers --- */
    function setupHistoryDrawer() {
        const drawer = document.getElementById('ai-drawer');
        const toggleBtn = document.getElementById('ai-toggle-history');
        const closeBtn = document.getElementById('ai-drawer-close');
        const newChatBtn = document.getElementById('ai-new-chat-btn');
        
        if (!drawer || !toggleBtn || !closeBtn || !newChatBtn) return;
        
        toggleBtn.addEventListener('click', () => {
            renderChatsList();
            drawer.classList.remove('hidden');
            drawer.setAttribute('aria-hidden', 'false');
        });
        
        closeBtn.addEventListener('click', () => {
            drawer.classList.add('hidden');
            drawer.setAttribute('aria-hidden', 'true');
        });
        
        newChatBtn.addEventListener('click', () => {
            createNewChat();
            drawer.classList.add('hidden');
            drawer.setAttribute('aria-hidden', 'true');
        });
    }

    function setupPersonalization() {
        const modal = document.getElementById('ai-persona-modal');
        const input = document.getElementById('ai-persona-input');
        const keyInput = document.getElementById('ai-api-key-input-local');
        const saveBtn = document.getElementById('ai-persona-save');
        const cancelBtn = document.getElementById('ai-persona-cancel');
        const closeBtn = document.getElementById('ai-persona-close');
        const toggleBtn = document.getElementById('ai-toggle-persona');
        
        if (!modal || !input || !saveBtn || !cancelBtn || !toggleBtn) return;
        
        const closeModal = () => {
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
        };
        
        toggleBtn.addEventListener('click', () => {
            // Close drawer if open
            const drawer = document.getElementById('ai-drawer');
            if (drawer) {
                drawer.classList.add('hidden');
                drawer.setAttribute('aria-hidden', 'true');
            }
            
            input.value = localStorage.getItem('smartStudyAI_personalization') || '';
            if (keyInput) {
                keyInput.value = localStorage.getItem('smartStudyAI_personalApiKey') || '';
            }
            modal.classList.remove('hidden');
            modal.setAttribute('aria-hidden', 'false');
            input.focus();
        });
        
        cancelBtn.addEventListener('click', closeModal);
        closeBtn?.addEventListener('click', closeModal);
        
        saveBtn.addEventListener('click', async () => {
            const personaVal = input.value.trim();
            await savePersonalizationToFirebase(personaVal);
            
            if (keyInput) {
                const newKey = keyInput.value.trim();
                if (newKey) {
                    localStorage.setItem('smartStudyAI_personalApiKey', newKey);
                } else {
                    localStorage.removeItem('smartStudyAI_personalApiKey');
                }
            }
            modal.classList.add('hidden');
            modal.setAttribute('aria-hidden', 'true');
            
            // Refresh limit state immediately so the UI locks/unlocks accordingly
            refreshLimitState();
            
            if (typeof showToast === 'function') {
                showToast(currentLang === 'ru' ? 'Настройки ИИ сохранены!' : 'AI settings saved!', 'success');
            }
        });
    }

    function setupExtensions() {
        const services = ['gmail', 'drive', 'keep', 'calendar', 'tasks', 'youtube', 'docs'];
        services.forEach(service => {
            const checkbox = document.getElementById(`ext-${service}`);
            if (checkbox) {
                const saved = localStorage.getItem(`smartStudyAI_ext_${service}`);
                if (saved !== null) {
                    checkbox.checked = saved === 'true';
                } else {
                    checkbox.checked = false;
                    localStorage.setItem(`smartStudyAI_ext_${service}`, checkbox.checked);
                }
                
                checkbox.addEventListener('change', () => {
                    localStorage.setItem(`smartStudyAI_ext_${service}`, checkbox.checked);
                });
            }
        });
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

        setupHistoryDrawer();
        setupPersonalization();
        setupExtensions();
    }

    function applyAiTranslations() {
        const dom = getDom();
        // Translate placeholders
        document.querySelectorAll('#tools-ai-panel [data-i18n-placeholder]').forEach((el) => {
            const key = el.getAttribute('data-i18n-placeholder');
            if (key) el.placeholder = t(key, el.placeholder);
        });
        // Translate static text elements (like Back button, title, etc.)
        document.querySelectorAll('#tools-ai-panel [data-i18n]').forEach((el) => {
            const key = el.getAttribute('data-i18n');
            if (key) el.textContent = t(key, el.textContent);
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

    function escapeHtml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    async function onPanelOpen() {
        document.body.classList.add('ai-chat-open');
        applyAiTranslations();
        
        // Sync user-specific data from Firebase Realtime Database
        const user = getFirebaseUser();
        if (user) {
            await syncPersonalizationFromFirebase().catch(() => {});
            await syncLimitsFromFirebase().catch(() => {});
        }
        
        // Load active chat or create a new one if list is empty
        const chats = getChats();
        const savedChatId = localStorage.getItem('smartStudyAI_currentChatId');
        
        if (chats.length > 0) {
            const exists = chats.some(c => c.id === savedChatId);
            const activeId = exists ? savedChatId : chats[0].id;
            loadChatHistory(activeId);
        } else {
            createNewChat();
        }

        await refreshLimitState();
        autoResizeTextarea(getDom().input);
    }

    function initAiAssistant(options = {}) {
        if (window.AI_ASSISTANT_ENABLED === false || true) { // Temporarily hardcoded to disabled for RuStore release
            const aiPanelBody = document.querySelector('#tools-ai-panel .panel-body');
            if (aiPanelBody) {
                aiPanelBody.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--text-color-secondary);">AI Assistant temporarily unavailable</div>';
            }
            // Hide trigger buttons if they exist
            document.querySelectorAll('.tool-tile--ai').forEach(el => el.style.display = 'none');
            
            if (options.onBack) {
                document.querySelectorAll('#tools-ai-panel .panel-back').forEach(btn => {
                    btn.addEventListener('click', () => {
                        document.body.classList.remove('ai-chat-open');
                        options.onBack();
                    });
                });
            }
            return { onPanelOpen: () => {}, refreshLimitState: () => {}, sendMessage: () => {}, pingNetwork: () => {} };
        }

        bindChatEvents();
        applyAiTranslations();

        if (options.onBack) {
            document.querySelectorAll('#tools-ai-panel .panel-back').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.body.classList.remove('ai-chat-open');
                    options.onBack();
                });
            });
        }

        return { onPanelOpen, refreshLimitState, sendMessage, pingNetwork };
    }

    global.SmartStudyAI = {
        init: initAiAssistant,
        config: AI_CONFIG,
        hasPersonalApiKey,
        getPersonalApiKey,
        pingNetwork,
        refreshLimitState
    };
})(typeof window !== 'undefined' ? window : globalThis);
