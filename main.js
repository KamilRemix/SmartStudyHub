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
}

// --- LANGUAGE & TRANSLATION ---
let currentLang = 'ru'; // Default language

function setLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('language', lang);
    document.documentElement.lang = lang;
    updateTranslations();
}

function updateTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.dataset.i18n;
        el.textContent = translations[currentLang][key] || key;
    });
    // Update shadow DOM translations
    document.querySelectorAll('smart-calculator, grade-average-calculator, settings-component').forEach(component => {
        if (component.shadowRoot) {
            component.shadowRoot.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.dataset.i18n;
                const translation = translations[currentLang][key];
                if (translation) {
                    el.textContent = translation;
                }
            });
        }
    });
}


/* ========= WEB COMPONENTS ========= */

// --- 1. SETTINGS COMPONENT ---
class SettingsComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                .settings-container { max-width: 500px; margin: 0 auto; background: var(--component-background); border-radius: 20px; padding: 2.5rem; box-shadow: 0 10px 30px var(--shadow-color-deep); border: 1px solid var(--primary-accent); }
                .setting-section { margin-bottom: 2.5rem; }
                .setting-section:last-child { margin-bottom: 0; }
                h3 { margin: 0 0 1.5rem 0; font-size: 1.5rem; font-weight: 700; color: var(--text-color); border-bottom: 2px solid var(--primary-accent); padding-bottom: 1rem; text-shadow: 0 0 5px var(--glow-color-primary); }
                .switcher { display: flex; gap: 1rem; border-radius: 12px; background: var(--background-color); padding: 0.5rem; }
                .switcher button { flex-grow: 1; padding: 1rem; border: none; border-radius: 8px; background: transparent; color: var(--text-color-secondary); font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.3s ease; }
                .switcher button.active { background: var(--primary-accent); color: #fff; box-shadow: 0 0 15px var(--glow-color-primary); }
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
                    <div class="switcher lang-switcher">
                        <button id="lang-ru">RU</button><button id="lang-en">EN</button><button id="lang-uk">UK</button><button id="lang-kk">KK</button>
                    </div>
                </div>
            </div>
        `;
    }
    connectedCallback() { this.setupTheme(); this.setupLang(); }
    setupTheme() { const lightBtn = this.shadowRoot.querySelector('#theme-light'); const darkBtn = this.shadowRoot.querySelector('#theme-dark'); lightBtn.addEventListener('click', () => { setTheme('light'); this.updateThemeButtons(); }); darkBtn.addEventListener('click', () => { setTheme('dark'); this.updateThemeButtons(); }); this.updateThemeButtons(); }
    updateThemeButtons() { const isDark = document.body.classList.contains('dark-theme'); this.shadowRoot.querySelector('#theme-dark').classList.toggle('active', isDark); this.shadowRoot.querySelector('#theme-light').classList.toggle('active', !isDark); }
    setupLang() { const langSwitcher = this.shadowRoot.querySelector('.lang-switcher'); langSwitcher.addEventListener('click', (e) => { if (e.target.tagName === 'BUTTON') { const lang = e.target.id.split('-')[1]; setLanguage(lang); this.updateLangButtons(); } }); this.updateLangButtons(); }
    updateLangButtons() { this.shadowRoot.querySelectorAll('.lang-switcher button').forEach(btn => btn.classList.remove('active')); const activeBtn = this.shadowRoot.querySelector(`#lang-${currentLang}`); if (activeBtn) { activeBtn.classList.add('active'); } }
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
        this.shadowRoot.querySelector('h2').textContent = this.isFractionMode ? 'Калькулятор Дробей' : 'Калькулятор';
    }

    // --- Standard Calc Logic ---
    handleButton(e){if(e.target.tagName!=='BUTTON')return;this.display.focus();const t=e.target,n=t.textContent;t.classList.contains("clear")?(this.display.value="",this.resultDisplay.textContent=""):"backspace"===t.id?this.display.value=this.display.value.slice(0,-1):t.classList.contains("equals")?(this.display.value=this.resultDisplay.textContent,this.resultDisplay.textContent=""):(()=>{const e=this.display.selectionStart,t=this.display.value;this.display.value=t.slice(0,e)+n+t.slice(e),this.display.selectionStart=this.display.selectionEnd=e+1})(),this.evaluate()}
    handleKeyboard(e){const t=/^[0-9\.\+\-\*/\(\)%]$/;"Enter"===e.key?(e.preventDefault(),this.display.value=this.resultDisplay.textContent,this.resultDisplay.textContent=""):setTimeout(()=>this.evaluate(),0),t.test(e.key)||e.ctrlKey||e.metaKey||e.key.includes("Arrow")||e.key.includes("Backspace")||e.preventDefault()}
    evaluate(){let e=this.display.value;if(!e)return void(this.resultDisplay.textContent="");e=e.replace(/×/g,"*").replace(/÷/g,"/");try{const t=new Function("return "+e)();"number"==typeof t&&Number.isFinite(t)?this.resultDisplay.textContent=parseFloat(t.toPrecision(12)):this.resultDisplay.textContent=""}catch(e){this.resultDisplay.textContent=""}}
    
    // --- Fraction Calc Logic ---
    selectOperator(e){if(e.target.tagName!=='BUTTON')return;this.opSelector.querySelectorAll('button').forEach(e=>e.classList.remove("selected")),e.target.classList.add("selected"),this.selectedOp=e.target.dataset.op}
    _gcd(e,t){return t?this._gcd(t,e%t):e}
    calculateFraction(){const e=this.shadowRoot.querySelector("#w1"),t=this.shadowRoot.querySelector("#n1"),n=this.shadowRoot.querySelector("#d1"),o=this.shadowRoot.querySelector("#w2"),r=this.shadowRoot.querySelector("#n2"),i=this.shadowRoot.querySelector("#d2");if(!this.selectedOp||!n.value||!i.value)return;const l=parseInt(e.value)||0,s=parseInt(t.value)||0,a=parseInt(n.value),c=parseInt(o.value)||0,u=parseInt(r.value)||0,d=parseInt(i.value);if(0===a||0===d)return;let h=[l*a+s,a],p=[c*d+u,d],q=null;switch(this.selectedOp){case"+":q=[h[0]*p[1]+p[0]*h[1],h[1]*p[1]];break;case"-":q=[h[0]*p[1]-p[0]*h[1],h[1]*p[1]];break;case"*":q=[h[0]*p[0],h[1]*p[1]];break;case"/":q=[h[0]*p[1],h[1]*p[0]]}if(q){const[e,t]=q;if(0===t)return;const n=this._gcd(Math.abs(e),Math.abs(t)),o=e/n,r=t/n,i=Math.trunc(o/r),l=o%r,s=r;let a="";a=0===l?`${i}`:0===i?`${l}/${s}`:`${i} <sup>${l}</sup>/<sub>${s}</sub>`,this.shadowRoot.querySelector("#fraction-result").innerHTML=a,this.shadowRoot.querySelector("#decimal-result").textContent=`≈ ${(o/s).toFixed(4)}`}}
}
customElements.define('smart-calculator', SmartCalculator);


// --- 3. GRADE AVERAGE CALCULATOR COMPONENT ---
class GradeAverageCalculator extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.shadowRoot.innerHTML = `
            <style>
                .grades-body { background: var(--component-background); border-radius: 20px; padding: 2.5rem; text-align: center; box-shadow: 0 10px 30px var(--shadow-color-deep); border: 1px solid var(--primary-accent); }
                #result-container { background: var(--background-color); border-radius: 12px; padding: 1.5rem; margin-bottom: 2rem; border: 1px solid var(--shadow-color-lift); }
                #result-label { color: var(--text-color-secondary); font-size: 1.2rem; font-weight: 600; }
                #result { color: var(--text-color); font-size: 4rem; font-weight: 700; min-height: 60px; line-height: 60px; }
                #grades-list { list-style: none; padding: 0; margin: 2rem 0; display: flex; flex-wrap: wrap; gap: 12px; justify-content: center; min-height: 40px; }
                #grades-list li { background: var(--background-color); color: var(--text-color); padding: 0.75rem 1.5rem; border-radius: 30px; font-weight: 700; font-size: 1.2rem; border: 1px solid var(--shadow-color-lift); box-shadow: 0 2px 5px var(--shadow-color-lift); }
                .controls { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
                .controls button { height: 70px; border-radius: 50px; border: none; font-size: 1.8rem; font-weight: 600; cursor: pointer; background: var(--component-background); color: var(--text-color); transition: all 0.2s; box-shadow: 0 4px 10px var(--shadow-color-lift); }
                 .controls button:hover { transform: translateY(-4px); box-shadow: 0 8px 15px var(--shadow-color-deep); }
                .controls button.action { background-color: var(--secondary-accent); color: white; font-size: 2rem; box-shadow: 0 4px 15px var(--glow-color-secondary); }
                #clear-grades { grid-column: span 3; background: var(--primary-accent); box-shadow: 0 4px 15px var(--glow-color-primary); color: white; }
            </style>
            <div class="grades-body">
                <h2 data-i18n="grades">Средний балл</h2>
                <div id="result-container">
                    <div id="result-label" data-i18n="averageScore">Средний балл</div>
                    <div id="result">0.00</div>
                </div>
                <ul id="grades-list"></ul>
                <div class="controls">
                    <button>1</button><button>2</button><button>3</button>
                    <button>4</button><button>5</button>
                    <button class="action" id="backspace">&#9003;</button>
                    <button class="action" id="clear-grades" data-i18n="clear">Очистить</button>
                </div>
            </div>
        `;
        this.grades = [];
        this.resultDiv = this.shadowRoot.querySelector('#result');
        this.gradesList = this.shadowRoot.querySelector('#grades-list');
        this.shadowRoot.querySelector('.controls').addEventListener('click', this.handleButtonClick.bind(this));
    }

    handleButtonClick(e) { const btn = e.target; if (btn.tagName !== 'BUTTON') return; if (btn.id === 'backspace') { this.grades.pop(); } else if (btn.id === 'clear-grades') { this.grades = []; } else if (!isNaN(parseInt(btn.textContent))) { this.grades.push(parseInt(btn.textContent)); } this.update(); }
    update() { this.renderGrades(); this.calculateAverage(); }
    renderGrades() { this.gradesList.innerHTML = ''; this.grades.forEach(grade => { const li = document.createElement('li'); li.textContent = grade; this.gradesList.appendChild(li); }); }
    calculateAverage() { if (this.grades.length === 0) { this.resultDiv.textContent = '0.00'; return; } const average = this.grades.reduce((a, b) => a + b, 0) / this.grades.length; this.resultDiv.textContent = average.toFixed(2); }
}
customElements.define('grade-average-calculator', GradeAverageCalculator);


// --- MAIN APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const savedLang = localStorage.getItem('language') || 'ru';
    setTheme(savedTheme);
    setLanguage(savedLang);

    const tabs = document.querySelectorAll('.nav-tab');
    const pages = document.querySelectorAll('.page');
    const tabMap = { 'calculator-tab': 'calculator-page', 'grades-tab': 'grades-page', 'settings-tab': 'settings-page' };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const pageId = tabMap[tab.id];
            pages.forEach(p => p.classList.remove('active'));
            document.getElementById(pageId).classList.add('active');
        });
    });
    
    feather.replace();
    updateTranslations();
});
