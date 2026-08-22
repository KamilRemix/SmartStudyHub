/* ============================================================
 *  SmartTranslator — модуль «Переводчик» для SmartStudyHub
 *  Шаг 1: Базовый UI + перевод (MyMemory) + TTS
 *  Шаг 2: Избранное (Firebase + LocalStorage)
 *  Шаг 3: Словарь синонимов (Datamuse)
 *  Шаг 4: OCR-распознавание с камеры (Gemini API)
 * ============================================================ */
const SmartTranslator = (() => {
    'use strict';

    let _initialized = false;
    let _container    = null;

    /* ─── API Key ─── */
    const GEMINI_API_KEY = 'AIzaSyCBX64ItDxwK_coTZGmmIrujDKQzUCckjI'; // TODO: Move to environment variable

    /* ─── Языки ─── */
    const LANGUAGES = [
        { code: 'auto', label: 'Автоопределение' },
        { code: 'ru', label: 'Русский' },
        { code: 'en', label: 'English' },
        { code: 'de', label: 'Deutsch' },
        { code: 'fr', label: 'Français' },
        { code: 'es', label: 'Español' },
        { code: 'ar', label: 'العربية' },
        { code: 'zh', label: '中文' },
        { code: 'ja', label: '日本語' },
        { code: 'ko', label: '한국어' },
        { code: 'tr', label: 'Türkçe' },
        { code: 'it', label: 'Italiano' },
        { code: 'pt', label: 'Português' },
    ];
    /* ─── State ─── */
    let favorites = [];

    /* ================================================================
     *                         INIT
     * ================================================================ */
    function init() {
        _container = document.getElementById('translator-container');
        if (!_container) return;
        if (_initialized) return;
        _initialized = true;

        _container.innerHTML = buildHTML();
        bindEvents();
        loadFavorites();
        renderFavorites();
    }

    /* ================================================================
     *                       HTML BUILDER
     * ================================================================ */
    function buildHTML() {
        const langOptions = (sel, isSource) =>
            LANGUAGES.filter(l => isSource || l.code !== 'auto').map(l =>
                `<option value="${l.code}" ${l.code === sel ? 'selected' : ''}>${l.label}</option>`
            ).join('');

        return `
        <div class="translator-wrap">
            <!-- ═══ LANGUAGE SELECTORS ═══ -->
            <div class="translator-lang-row">
                <select id="translator-lang-from" class="translator-lang-select" aria-label="Source language">
                    ${langOptions('auto', true)}
                </select>

                <button id="translator-swap" class="translator-swap-btn" title="Swap" aria-label="Swap languages">
                    <span class="material-symbols-outlined">swap_horiz</span>
                </button>

                <select id="translator-lang-to" class="translator-lang-select" aria-label="Target language">
                    ${langOptions('ru', false)}
                </select>
            </div>

            <!-- ═══ TEXTAREAS ═══ -->
            <div class="translator-textareas">
                <div class="translator-textarea-box">
                    <textarea id="translator-source" class="translator-textarea" placeholder="Введите текст..." rows="5" spellcheck="true"></textarea>
                    <div class="translator-textarea-toolbar">
                        <button id="translator-tts-src" class="translator-icon-btn" title="Озвучить" aria-label="TTS source">
                            <span class="material-symbols-outlined">volume_up</span>
                        </button>
                        <button id="translator-clear" class="translator-icon-btn" title="Очистить" aria-label="Clear">
                            <span class="material-symbols-outlined">backspace</span>
                        </button>
                        <span id="translator-char-count" class="translator-char-count">0</span>
                    </div>
                </div>

                <div class="translator-textarea-box translator-textarea-box--result">
                    <div class="translator-result-area" id="translator-result-area">
                        <div class="translator-placeholder" id="translator-placeholder">Перевод появится здесь...</div>
                        <div class="translator-result-text" id="translator-result-text"></div>
                        <!-- Translate spinner -->
                        <div class="translator-spinner" id="translator-spinner">
                            <div class="translator-spinner-ring"></div>
                        </div>
                    </div>
                    <div class="translator-textarea-toolbar">
                        <button id="translator-tts-res" class="translator-icon-btn" title="Озвучить" aria-label="TTS result">
                            <span class="material-symbols-outlined">volume_up</span>
                        </button>
                        <button id="translator-copy" class="translator-icon-btn" title="Копировать" aria-label="Copy">
                            <span class="material-symbols-outlined">content_copy</span>
                        </button>
                        <button id="translator-fav-add" class="translator-icon-btn translator-fav-btn" title="В избранное" aria-label="Add to favorites">
                            <span class="material-symbols-outlined">star</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- ═══ SYNONYMS ═══ -->
            <div class="translator-synonyms-section" id="translator-synonyms-section">
                <div class="translator-synonyms-header">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary-accent);">auto_awesome</span>
                    <span>Синонимы</span>
                </div>
                <div class="translator-synonyms-chips" id="translator-synonyms-chips"></div>
            </div>

            <!-- ═══ FAVORITES ═══ -->
            <div class="translator-favorites-section" id="translator-favorites-section">
                <div class="translator-favorites-header">
                    <span class="material-symbols-outlined" style="font-size:18px;color:var(--primary-accent);">bookmark</span>
                    <span>Избранное</span>
                    <span class="translator-fav-count" id="translator-fav-count">0</span>
                </div>
                <div class="translator-favorites-list" id="translator-favorites-list"></div>
                <div class="translator-favorites-empty" id="translator-favorites-empty">
                    <span class="material-symbols-outlined" style="font-size:32px;opacity:0.3;">star_border</span>
                    <p>Сохраняйте переводы, нажав ★</p>
                </div>
            </div>
        </div>`;
    }

    /* ================================================================
     *                       EVENT BINDINGS
     * ================================================================ */
    let translateTimeout = null;

    function bindEvents() {
        const $ = id => _container.querySelector('#' + id);

        /* Remove translate button and enter keydown listener, add debounce input listener */
        $('translator-source').addEventListener('input', () => {
            $('translator-char-count').textContent = $('translator-source').value.length;
            
            // Auto translate debounce
            if (translateTimeout) clearTimeout(translateTimeout);
            translateTimeout = setTimeout(() => {
                doTranslate();
            }, 600); // 600ms delay for auto-translate
        });

        /* Swap languages */
        $('translator-lang-from').addEventListener('change', doTranslate);
        $('translator-lang-to').addEventListener('change', doTranslate);

        /* Swap languages */
        $('translator-swap').addEventListener('click', swapLanguages);

        /* Clear */
        $('translator-clear').addEventListener('click', () => {
            $('translator-source').value = '';
            $('translator-result-text').textContent = '';
            $('translator-placeholder').style.display = '';
            $('translator-char-count').textContent = '0';
            hideSynonyms();
        });

        /* Copy */
        $('translator-copy').addEventListener('click', () => {
            const txt = $('translator-result-text').textContent;
            if (!txt) return;
            navigator.clipboard.writeText(txt).then(() => showToast('Скопировано!')).catch(() => {});
        });

        /* TTS */
        $('translator-tts-src').addEventListener('click', () => {
            speak($('translator-source').value, $('translator-lang-from').value);
        });
        $('translator-tts-res').addEventListener('click', () => {
            speak($('translator-result-text').textContent, $('translator-lang-to').value);
        });

        /* Favorite add */
        $('translator-fav-add').addEventListener('click', addFavorite);
    }

    /* ================================================================
     *  Шаг 1 — ПЕРЕВОД (MyMemory API)
     * ================================================================ */
    async function doTranslate() {
        const $ = id => _container.querySelector('#' + id);
        const text = $('translator-source').value.trim();
        if (!text) return;

        const to   = $('translator-lang-to').value;
        const from = $('translator-lang-from').value === 'auto' ? 'Autodetect' : $('translator-lang-from').value;

        /* Show spinner */
        $('translator-spinner').classList.add('active');
        $('translator-placeholder').style.display = 'none';
        $('translator-result-text').textContent = '';

        try {
            const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${from}|${to}`;
            const res = await fetch(url);
            const data = await res.json();

            let translated = data?.responseData?.translatedText || '';
            
            // Check for empty or invalid translation
            if (!translated || translated.trim() === '' || translated === text) {
                translated = 'Ошибка перевода. Попробуйте другой текст.';
            }
            
            // Check for API error messages
            if (translated.includes('MYMEMORY') || translated.includes('ERROR')) {
                translated = 'Ошибка сервиса перевода. Попробуйте позже.';
            }
            
            $('translator-result-text').textContent = translated;

            /* Synonyms - only if translation is valid */
            if (!translated.includes('Ошибка')) {
                fetchSynonyms(translated, to);
            }
        } catch (err) {
            $('translator-result-text').textContent = 'Ошибка сети. Проверьте подключение.';
            console.error('[Translator]', err);
        } finally {
            $('translator-spinner').classList.remove('active');
        }
    }

    /* ─── Swap ─── */
    function swapLanguages() {
        const $ = id => _container.querySelector('#' + id);
        const fromSel = $('translator-lang-from');
        const toSel   = $('translator-lang-to');
        const tmp     = fromSel.value === 'auto' ? 'en' : fromSel.value; // cannot swap to auto as target
        fromSel.value = toSel.value;
        toSel.value   = tmp;

        /* Also swap text <-> result */
        const resText  = $('translator-result-text').textContent;
        const srcArea  = $('translator-source');
        if (resText) {
            srcArea.value = resText;
            $('translator-char-count').textContent = resText.length;
            doTranslate();
        }

        /* Animate swap icon */
        const btn = $('translator-swap');
        btn.classList.add('spinning');
        setTimeout(() => btn.classList.remove('spinning'), 350);
    }

    /* ================================================================
     *  Шаг 1 — TTS (Web Speech API)
     * ================================================================ */
    function speak(text, langCode) {
        if (!text || !window.speechSynthesis) return;
        window.speechSynthesis.cancel();

        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = langCode;
        utter.rate = 0.95;

        /* Try to pick a matching voice */
        const voices = speechSynthesis.getVoices();
        const match  = voices.find(v => v.lang.startsWith(langCode));
        if (match) utter.voice = match;

        speechSynthesis.speak(utter);
    }

    /* Pre-load voices */
    if (window.speechSynthesis) {
        speechSynthesis.onvoiceschanged = () => speechSynthesis.getVoices();
        speechSynthesis.getVoices();
    }

    /* ================================================================
     *  Шаг 2 — ИЗБРАННОЕ (Firebase + LocalStorage)
     * ================================================================ */
    function getFirestoreFavRef() {
        try {
            const user = firebase?.auth()?.currentUser;
            if (user && firebase.firestore && user.email) {
                return firebase.firestore().collection('users').doc(user.email).collection('translator_favorites');
            }
        } catch (_) {}
        return null;
    }

    async function loadFavorites() {
        /* Try Firebase first */
        const ref = getFirestoreFavRef();
        if (ref) {
            try {
                const snap = await ref.orderBy('timestamp', 'desc').limit(50).get();
                favorites = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                saveFavoritesToLocal();
                renderFavorites();
                return;
            } catch (_) {}
        }
        /* Fallback: localStorage */
        try {
            favorites = JSON.parse(localStorage.getItem('translator_favorites') || '[]');
        } catch (_) {
            favorites = [];
        }
        renderFavorites();
    }

    function saveFavoritesToLocal() {
        localStorage.setItem('translator_favorites', JSON.stringify(favorites));
    }

    async function addFavorite() {
        const $ = id => _container.querySelector('#' + id);
        const src  = $('translator-source').value.trim();
        const res  = $('translator-result-text').textContent.trim();
        
        // More lenient validation - allow adding if there's any content
        if (!src) {
            showToast('Введите текст для перевода');
            return;
        }
        
        if (!res || res === 'Перевод появится здесь...') {
            showToast('Сначала выполните перевод');
            return;
        }

        const from = $('translator-lang-from').value;
        const to   = $('translator-lang-to').value;

        /* Check duplicate - case insensitive */
        if (favorites.some(f => f.source.toLowerCase() === src.toLowerCase() && f.langFrom === from && f.langTo === to)) {
            showToast('Уже в избранном');
            return;
        }

        const entry = {
            source: src,
            result: res,
            langFrom: from,
            langTo: to,
            timestamp: Date.now(),
        };

        /* Firebase */
        const ref = getFirestoreFavRef();
        if (ref) {
            try {
                const doc = await ref.add(entry);
                entry.id = doc.id;
            } catch (e) {
                console.error('Firebase error:', e);
                entry.id = 'local_' + Date.now();
            }
        } else {
            entry.id = 'local_' + Date.now();
        }

        favorites.unshift(entry);
        saveFavoritesToLocal();
        renderFavorites();
        showToast('Добавлено в избранное ★');

        /* Animate star */
        const starBtn = $('translator-fav-add');
        if (starBtn) {
            starBtn.classList.add('fav-pulse');
            setTimeout(() => starBtn.classList.remove('fav-pulse'), 500);
        }
    }

    async function removeFavorite(id) {
        favorites = favorites.filter(f => f.id !== id);
        saveFavoritesToLocal();

        /* Firebase */
        const ref = getFirestoreFavRef();
        if (ref && id && !id.startsWith('local_')) {
            try { await ref.doc(id).delete(); } catch (_) {}
        }
        renderFavorites();
    }

    function useFavorite(fav) {
        const $ = id => _container.querySelector('#' + id);
        $('translator-lang-from').value = fav.langFrom;
        $('translator-lang-to').value   = fav.langTo;
        $('translator-source').value    = fav.source;
        $('translator-result-text').textContent = fav.result;
        $('translator-placeholder').style.display = 'none';
        $('translator-char-count').textContent = fav.source.length;
    }

    function renderFavorites() {
        const $ = id => _container?.querySelector('#' + id);
        if (!$) return;
        const list  = $('translator-favorites-list');
        const empty = $('translator-favorites-empty');
        const count = $('translator-fav-count');
        const section = $('translator-favorites-section');
        if (!list) return;

        count.textContent = favorites.length;

        if (favorites.length === 0) {
            list.innerHTML = '';
            empty.style.display = '';
            return;
        }
        empty.style.display = 'none';

        const labelOf = code => LANGUAGES.find(l => l.code === code)?.label || '';

        list.innerHTML = favorites.map(f => `
            <div class="translator-fav-item" data-id="${f.id}">
                <div class="translator-fav-item-body" title="Нажмите, чтобы подставить">
                    <div class="translator-fav-langs">${labelOf(f.langFrom)} → ${labelOf(f.langTo)}</div>
                    <div class="translator-fav-src">${escapeHtml(f.source)}</div>
                    <div class="translator-fav-res">${escapeHtml(f.result)}</div>
                </div>
                <button class="translator-fav-del" data-fav-id="${f.id}" title="Удалить" aria-label="Delete">
                    <span class="material-symbols-outlined" style="font-size:18px;">close</span>
                </button>
            </div>
        `).join('');

        /* Bind clicks */
        list.querySelectorAll('.translator-fav-item-body').forEach(el => {
            el.addEventListener('click', () => {
                const id = el.parentElement.dataset.id;
                const fav = favorites.find(f => f.id === id);
                if (fav) useFavorite(fav);
            });
        });
        list.querySelectorAll('.translator-fav-del').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                removeFavorite(btn.dataset.favId);
            });
        });
    }

    /* Sync on auth state change */
    try {
        firebase?.auth()?.onAuthStateChanged?.(() => {
            if (_initialized) { loadFavorites(); }
        });
    } catch (_) {}

    /* ================================================================
     *  Шаг 3 — СИНОНИМЫ (Datamuse API)
     * ================================================================ */
    async function fetchSynonyms(text, langCode) {
        hideSynonyms();
        
        if (!text || text.trim() === '') return;
        
        /* Only fetch for short phrases (≤ 3 words) */
        const words = text.trim().split(/\s+/);
        if (words.length > 3) return;
        
        /* Datamuse works best for English - try for English and Russian */
        const shouldFetch = langCode === 'en' || langCode === 'ru';
        if (!shouldFetch) return;

        try {
            const query = encodeURIComponent(text.trim().toLowerCase());
            const res = await fetch(`https://api.datamuse.com/words?rel_syn=${query}&max=8`);
            const data = await res.json();
            if (!data.length) return;
            showSynonyms(data.map(d => d.word));
        } catch (e) {
            console.error('Datamuse error:', e);
        }
    }

    function showSynonyms(syns) {
        const $ = id => _container.querySelector('#' + id);
        const section = $('translator-synonyms-section');
        const chips   = $('translator-synonyms-chips');
        chips.innerHTML = syns.map(s =>
            `<button class="translator-syn-chip">${escapeHtml(s)}</button>`
        ).join('');
        section.classList.add('visible');

        /* Click to paste synonym into result */
        chips.querySelectorAll('.translator-syn-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                $('translator-result-text').textContent = btn.textContent;
                $('translator-placeholder').style.display = 'none';
            });
        });
    }

    function hideSynonyms() {
        const section = _container?.querySelector('#translator-synonyms-section');
        if (section) section.classList.remove('visible');
    }


    /* ================================================================
     *                       UTILITIES
     * ================================================================ */
    function escapeHtml(str) {
        const d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

    function showToast(msg, type = 'info') {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, type);
            return;
        }
        let container = document.getElementById('app-toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'app-toast-container';
            document.body.appendChild(container);
        }
        
        const t = document.createElement('div');
        t.className = 'app-toast';
        t.textContent = msg;
        container.appendChild(t);
        requestAnimationFrame(() => t.classList.add('is-visible'));
        setTimeout(() => {
            t.classList.remove('is-visible');
            setTimeout(() => t.remove(), 350);
        }, 2200);
    }

    /* ─── Public API ─── */
    return { init };
})();
