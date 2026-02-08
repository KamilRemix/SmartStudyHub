/* ========= FIREBASE AUTHENTICATION ========= */

let firebaseAuth = null;
let currentUser = null;

if (window.firebase && window.firebase.auth) {
    firebaseAuth = window.firebase.auth();
    // Use the recommended onAuthStateChanged observer
    firebaseAuth.onAuthStateChanged((user) => {
        currentUser = user;
        updateAuthUI();
        updateTranslations();
        
        // If user is logged in, load their data and switch to grades tab
        if (user) {
            const gradeCalc = document.querySelector('grade-average-calculator');
            if (gradeCalc) {
                gradeCalc.loadFromDatabase().then(() => {
                    // Switch to the grades tab after data is loaded
                    const tabs = document.querySelectorAll('.nav-tab');
                    const pages = document.querySelectorAll('.page');
                    const tabMap = { 'calculator-tab': 'calculator-page', 'grades-tab': 'grades-page', 'settings-tab': 'settings-page' };

                    tabs.forEach(t => t.classList.remove('active'));
                    document.getElementById('grades-tab').classList.add('active');

                    pages.forEach(p => p.classList.remove('active'));
                    document.getElementById('grades-page').classList.add('active');
                });
            }
        }
    });
}

function updateAuthUI() {
    const settingsComponent = document.querySelector('settings-component');
    if (!settingsComponent || !settingsComponent.shadowRoot) return;
    
    const authContent = settingsComponent.shadowRoot.querySelector('#auth-content');
    if (!authContent) return;

    if (currentUser) {
        // User is signed in
        const signOutText = translations[currentLang]['signOut'] || 'Sign Out';
        authContent.innerHTML = `
            <div class="user-info" style="text-align: center; padding: 2rem 1rem;">
                <p style="margin: 0 0 1.5rem 0; font-size: 1rem; color: var(--text-color); font-weight: 500;">
                    ${currentUser.email}
                </p>
                <button class="signout-btn" id="signout-btn" data-i18n="signOut" style="font-size: 0.9rem; padding: 8px 16px; width: 100%;">
                    ${signOutText}
                </button>
            </div>`;
        
        const signoutBtn = authContent.querySelector('#signout-btn');
        if (signoutBtn) {
            signoutBtn.addEventListener('click', window.signOutUser);
        }
    } else {
        // User is signed out
        const googleText = translations[currentLang]['signInWithGoogle'] || 'Sign in with Google';
        authContent.innerHTML = `
            <div style="display: flex; flex-direction: column; gap: 10px;">
                <button class="google-signin-btn" id="google-signin-btn">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"></path>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"></path>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"></path>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"></path>
                    </svg>
                    ${googleText}
                </button>
                 <button class="github-signin-btn" id="github-signin-btn" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"></path>
                    </svg>
                    Sign in with GitHub
                </button>
            </div>
        `;
        
        const googleSigninBtn = authContent.querySelector('#google-signin-btn');
        if (googleSigninBtn) {
            googleSigninBtn.addEventListener('click', window.signInWithGoogle);
        }
    }
}


window.signInWithGoogle = (retryCount = 0) => {
    console.log('Attempting login...');
    if (!firebase || !firebase.apps.length) {
        if (retryCount < 5) {
            setTimeout(() => window.signInWithGoogle(retryCount + 1), 100);
        } else {
            alert('Firebase is not ready. Please try again in a moment.');
        }
        return;
    }
    
    if (!firebaseAuth) {
        firebaseAuth = firebase.auth();
    }

    const provider = new firebase.auth.GoogleAuthProvider();
    firebaseAuth.signInWithPopup(provider)
        .then(result => {
            console.log('Success');
            console.log('Sign-in success:', result);
        })
        .catch(error => {
            console.error(error);
            console.error('Sign-in error:', error);
            alert('Sign-in failed: ' + error.message);
        });
};

window.signOutUser = () => {
    if (!firebaseAuth) return;

    const gradeCalc = document.querySelector('grade-average-calculator');
    if (gradeCalc && currentUser) {
        gradeCalc.saveToDatabase();
    }

    firebaseAuth.signOut()
        .then(() => {
            // Clear local data on logout
            if (gradeCalc) {
                gradeCalc.subjects = {};
                gradeCalc.render();
            }
        })
        .catch(error => {
            console.error('Sign-out error:', error);
        });
};

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
    updateAuthUI();
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
    // Re-update strategy text when language changes
    const gradeAvgCalc = document.querySelector('grade-average-calculator');
    if (gradeAvgCalc && gradeAvgCalc.updateStrategy) {
        gradeAvgCalc.updateStrategy();
    }
}


/* ========= WEB COMPONENTS ========= */

// --- 1. SETTINGS COMPONENT ---
class SettingsComponent extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.renderComponent();
    }
    
    renderComponent() {
        this.shadowRoot.innerHTML = `
            <style>
                .settings-container { max-width: 500px; margin: 0 auto; background: var(--component-background); border-radius: 20px; padding: 2.5rem; box-shadow: 0 10px 30px var(--shadow-color-deep); border: 1px solid var(--primary-accent); }
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
                }
                .language-dropdown-menu.open {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
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
                    flex-grow: 1;
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

                /* Google Sign-In Button Styles */
                .auth-section { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid var(--primary-accent); display: flex; flex-direction: column; gap: 10px; }
                .google-signin-btn { 
                    width: 100%; 
                    padding: 12px 20px; 
                    border: none; 
                    background: white;
                    color: #3c4043; 
                    border-radius: 10px; 
                    font-size: 1rem; 
                    font-weight: 600; 
                    cursor: pointer; 
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                    font-family: 'Poppins', sans-serif;
                }
                .google-signin-btn:hover { 
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                }
                .google-signin-btn:active { transform: translateY(0); }
                .google-signin-btn svg { width: 20px; height: 20px; flex-shrink: 0; }
                
                /* GitHub Sign-In Button Styles */
                .github-signin-btn { 
                    width: 100%; 
                    padding: 12px 20px; 
                    border: 2px solid #333333; 
                    background: linear-gradient(135deg, #1f1f1f 0%, #333333 100%);
                    color: white; 
                    border-radius: 10px; 
                    font-size: 1rem; 
                    font-weight: 600; 
                    cursor: pointer; 
                    transition: all 0.3s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    box-shadow: 0 4px 12px rgba(31, 31, 31, 0.4);
                    font-family: 'Poppins', sans-serif;
                    opacity: 0.5;
                    pointer-events: none;
                }
                .github-signin-btn:hover { 
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px rgba(31, 31, 31, 0.6);
                    border-color: #555555;
                }
                .github-signin-btn:active { transform: translateY(0); }
                .github-signin-btn svg { width: 20px; height: 20px; }
                
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
        delete subjectsToSave['__QUICK_CALC__']; // We don't save the local quick calculator

        const dataToSave = {
            subjects: subjectsToSave,
            settings: {
                gradingSystem: this.gradingSystem,
                thresholds: this.thresholds
            }
        };

        window.firebase.database().ref(`users/${uid}`).set(dataToSave)
            .then(() => console.log('✅ Data saved to Firebase.'))
            .catch(e => console.error('❌ Error saving data:', e));
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
                .tabs { display: flex; justify-content: space-between; padding: 0; margin-bottom: 2rem; border-bottom: 2px solid var(--shadow-color-lift); }
                .tab-btn { 
                    background: none; 
                    border: none; 
                    padding: 0.8rem 1rem; 
                    color: var(--text-color-secondary); 
                    font-size: 1rem; 
                    font-weight: 600; 
                    cursor: pointer; 
                    border-bottom: 3px solid transparent;
                    transition: all 0.3s;
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
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    margin-bottom: 0.8rem;
                }
                .threshold-input-row label {
                    min-width: 60px;
                    font-weight: 600;
                }
                .threshold-input-row input {
                    background: var(--component-background);
                    color: var(--text-color);
                    border: 1px solid var(--primary-accent);
                    border-radius: 8px;
                    padding: 0.5rem;
                    width: 80px;
                    text-align: center;
                    font-weight: 600;
                    font-family: inherit;
                }
                .threshold-input-row input:focus {
                    outline: none;
                    box-shadow: 0 0 8px var(--glow-color-primary);
                }
                .save-thresholds {
                    background: var(--primary-accent);
                    color: white;
                    border: none;
                    padding: 0.75rem 1.5rem;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    margin-top: 1rem;
                    box-shadow: 0 4px 15px var(--glow-color-primary);
                    transition: all 0.2s;
                }
                .save-thresholds:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px var(--glow-color-primary);
                }
                .threshold-note {
                    font-size: 0.85rem;
                    color: var(--text-color-secondary);
                    margin-top: 1rem;
                    font-style: italic;
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
                    <div style="text-align: center; padding: 1.5rem;">
                        <h3 data-i18n="subjects">Мои предметы</h3>
                        <div id="subjects-list" style="margin: 2rem 0; display: grid; gap: 1rem;"></div>
                        <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
                            <input type="text" id="subject-input" placeholder="Название" data-i18n="subjectName" style="flex: 1; padding: 0.8rem; border-radius: 8px; border: 1px solid var(--primary-accent); background: var(--component-background); color: var(--text-color); font-family: inherit;">
                            <button id="add-subject-btn" data-i18n="create">Создать</button>
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
                        <h3 data-i18n="thresholdsTitle">📊 Установи пороги для оценок</h3>
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

                        <button class="save-thresholds" data-i18n="saveThresholds">💾 Сохранить пороги</button>
                        <p class="threshold-note" data-i18n="thresholdsNote">
                            💡 Стандартные пороги: 5.0 → 4.5, 4.0 → 3.5, 3.0 → 2.5<br>
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
                        alert('💡 Нажми "Применить" или "Отмена"');
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
                    if (confirm(confirmText)) {
                        grades.splice(index, 1);
                        if (this.currentSubject !== '__QUICK_CALC__') {
                            this.saveToDatabase();
                        }
                        this.update();
                    }
                }
            }
        });

        // WHAT IF Button - Simulator
        const whatIfBtn = this.shadowRoot.querySelector('#what-if-btn');
        if (whatIfBtn) {
            whatIfBtn.addEventListener('click', () => {
                if (!this.currentSubject) {
                    alert('⚠️ Выбери предмет!');
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
                        alert('✅ Пороги сохранены!');
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
                        alert('✅ Thresholds Saved!');
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
                if (confirm(`Удалить ${subjectName}?`)) {
                    this.deleteSubject(subjectName);
                }
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
    
    showSimulator() {
        const promptText = this.gradingSystem === '5-point' 
            ? 'Какую оценку добавить для симуляции? (1-5)'
            : 'Which grade would you like to simulate? (A, B, C, D, F)';
        
        const gradeInput = prompt(promptText);
        if (gradeInput === null) return;

        let grade;
        if (this.gradingSystem === '5-point') {
            grade = parseInt(gradeInput);
            if (isNaN(grade) || grade < 1 || grade > 5) {
                alert('⚠️ Введи число от 1 до 5');
                return;
            }
        } else {
            grade = gradeInput.toUpperCase();
            if (!['A', 'B', 'C', 'D', 'F'].includes(grade)) {
                alert('⚠️ Please enter a valid letter grade (A, B, C, D, or F)');
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

        content.innerHTML = `
            <h2 style="color: var(--primary-accent); margin: 0 0 1rem 0;">What If?</h2>
            <p style="color: var(--text-color); margin: 0 0 0.5rem 0;">If you add the grade <strong>${grade}</strong> to <strong>${this.currentSubject === '__QUICK_CALC__' ? 'Quick Calc' : this.currentSubject}</strong>:</p>
            <p style="font-size: 1.5rem; color: var(--primary-accent); font-weight: 700; margin: 1rem 0;">
                Current: ${oldAvg} → Simulated: ${newAvg}
            </p>
            <div style="display: flex; gap: 1rem; margin-top: 2rem;">
                <button id="apply-sim" style="flex: 1; padding: 0.8rem; background: var(--primary-accent); color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">Apply</button>
                <button id="cancel-sim" style="flex: 1; padding: 0.8rem; background: #999; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer;">Cancel</button>
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
                    <label>Grade A:</label>
                    <input type="number" id="threshold-A" step="1" min="0" max="100" value="${this.thresholds['us-letter']['A']}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <div class="threshold-input-row">
                    <label>Grade B:</label>
                    <input type="number" id="threshold-B" step="1" min="0" max="100" value="${this.thresholds['us-letter']['B']}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <div class="threshold-input-row">
                    <label>Grade C:</label>
                    <input type="number" id="threshold-C" step="1" min="0" max="100" value="${this.thresholds['us-letter']['C']}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <div class="threshold-input-row">
                    <label>Grade D:</label>
                    <input type="number" id="threshold-D" step="1" min="0" max="100" value="${this.thresholds['us-letter']['D']}">
                    <span style="color: var(--text-color-secondary);" data-i18n="andAbove"></span>
                </div>
                <button class="save-thresholds" data-i18n="saveThresholds"></button>
            `;
        }
        container.innerHTML = thresholdsHTML;
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

        return userRef.once('value')
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
    }

    syncGrades() {
        this.saveToDatabase();
    }
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
