/* =========================================================
   public/js/calculator.js
   Unit Converter + Currency Converter + Tools Hub Navigation
   Extracted from renderer.js initTools() function.
   Depends on: translations.js, js/ui.js (currentLang, updateToolsTranslations)
   ========================================================= */

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