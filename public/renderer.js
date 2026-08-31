/* =========================================================
   public/renderer.js
   Main Dispatcher + Web Components - SmartStudyHub
   
   This file contains:
   - Web Components: SettingsComponent, SmartCalculator, GradeAverageCalculator
   - DOMContentLoaded dispatcher (delegates to public/js/ modules)
   - Electron auto-updater UI

   Business logic has been extracted to public/js/ modules:
   - js/firebase-init.js  Firebase initialization
   - js/auth.js           Authentication layer
   - js/ui.js             UI: tabs, theme, language, splash, modals
   - js/calculator.js     Unit converter + currency + tools hub
   - js/notes.js          Notes module adapter
   - js/translator.js     Translator module adapter
   - js/genpass.js        Password generator adapter
   ========================================================= */

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

                /* Unified Sign-In & Auth Styles */
                .auth-section { margin-top: 2rem; padding-top: 2rem; border-top: 1px solid color-mix(in srgb, var(--primary-accent) 10%, transparent); display: flex; flex-direction: column; gap: 14px; }
                
                .auth-box {
                    display: flex;
                    flex-direction: column;
                    gap: 1.15rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .auth-tabs {
                    display: flex;
                    background: color-mix(in srgb, var(--component-background) 70%, var(--background-color));
                    padding: 4px;
                    border-radius: 12px;
                    border: 1px solid color-mix(in srgb, var(--primary-accent) 20%, transparent);
                    gap: 4px;
                }

                .auth-tab-btn {
                    flex: 1;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    padding: 10px 14px;
                    background: transparent;
                    border: none;
                    border-radius: 8px;
                    color: var(--text-color-secondary);
                    font-size: 0.92rem;
                    font-weight: 600;
                    font-family: inherit;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                }

                .auth-tab-btn:hover {
                    color: var(--text-color);
                    background: color-mix(in srgb, var(--text-color) 6%, transparent);
                }

                .auth-tab-btn.active {
                    background: var(--primary-accent);
                    color: #ffffff;
                    box-shadow: 0 4px 14px var(--glow-color-primary);
                }

                .auth-tab-icon {
                    flex-shrink: 0;
                }

                .auth-email-form {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .auth-form-feedback {
                    padding: 0.75rem 1rem;
                    border-radius: 10px;
                    font-size: 0.85rem;
                    line-height: 1.4;
                    font-weight: 500;
                    box-sizing: border-box;
                    animation: auth-fade-in 0.25s ease-out;
                }

                .auth-form-feedback--error {
                    background: color-mix(in srgb, #ff4c4c 12%, transparent);
                    border: 1px solid color-mix(in srgb, #ff4c4c 45%, transparent);
                    color: #ff5252;
                }

                .auth-form-feedback--success {
                    background: color-mix(in srgb, #00e676 12%, transparent);
                    border: 1px solid color-mix(in srgb, #00e676 45%, transparent);
                    color: #00e676;
                }

                @keyframes auth-fade-in {
                    from { opacity: 0; transform: translateY(-4px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .auth-input-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.4rem;
                    width: 100%;
                    box-sizing: border-box;
                }

                .auth-label-row {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }

                .auth-input-label {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: var(--text-color);
                }

                .auth-forgot-link {
                    background: none;
                    border: none;
                    padding: 0;
                    font-size: 0.8rem;
                    color: var(--primary-accent);
                    cursor: pointer;
                    font-family: inherit;
                    font-weight: 500;
                    transition: opacity 0.2s;
                }

                .auth-forgot-link:hover {
                    text-decoration: underline;
                    opacity: 0.85;
                }

                .auth-input-wrapper {
                    position: relative;
                    display: flex;
                    align-items: center;
                    width: 100%;
                    box-sizing: border-box;
                }

                .auth-input-icon {
                    position: absolute;
                    left: 14px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: var(--text-color-secondary);
                    pointer-events: none;
                    z-index: 1;
                }

                .auth-text-input {
                    width: 100%;
                    padding: 12px 42px 12px 42px;
                    border-radius: 10px;
                    border: 1.5px solid color-mix(in srgb, var(--text-color) 15%, transparent);
                    background: color-mix(in srgb, var(--component-background) 80%, var(--background-color));
                    color: var(--text-color);
                    font-size: 0.95rem;
                    font-family: inherit;
                    box-sizing: border-box;
                    transition: all 0.2s ease;
                    outline: none;
                }

                .auth-text-input:focus {
                    border-color: var(--primary-accent);
                    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-accent) 20%, transparent);
                }

                .auth-text-input::placeholder {
                    color: var(--text-color-secondary);
                    opacity: 0.7;
                }

                .auth-toggle-pwd-btn {
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-50%);
                    background: none;
                    border: none;
                    color: var(--text-color-secondary);
                    cursor: pointer;
                    padding: 6px;
                    border-radius: 6px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: color 0.2s, background-color 0.2s;
                }

                .auth-toggle-pwd-btn:hover {
                    color: var(--text-color);
                    background: color-mix(in srgb, var(--text-color) 8%, transparent);
                }

                .auth-submit-btn {
                    width: 100%;
                    padding: 13px 20px;
                    border: none;
                    border-radius: 10px;
                    background: linear-gradient(135deg, var(--primary-accent), color-mix(in srgb, var(--primary-accent) 80%, #0056cc));
                    color: #ffffff;
                    font-size: 1rem;
                    font-weight: 600;
                    font-family: inherit;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    box-shadow: 0 4px 16px var(--glow-color-primary);
                    transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                    margin-top: 0.25rem;
                    position: relative;
                }

                .auth-submit-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px var(--glow-color-primary);
                    filter: brightness(1.05);
                }

                .auth-submit-btn:active {
                    transform: translateY(0);
                }

                .auth-submit-btn.is-loading {
                    pointer-events: none;
                    opacity: 0.88;
                }

                .auth-submit-btn.is-loading > * {
                    visibility: hidden;
                }

                .auth-submit-btn.is-loading::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    margin: auto;
                    width: 22px;
                    height: 22px;
                    border-radius: 50%;
                    border: 2.5px solid rgba(255, 255, 255, 0.3);
                    border-top-color: #ffffff;
                    animation: auth-btn-spin 0.7s linear infinite;
                }

                .auth-divider {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin: 0.25rem 0;
                    width: 100%;
                }

                .auth-divider-line {
                    flex: 1;
                    height: 1px;
                    background: color-mix(in srgb, var(--text-color) 12%, transparent);
                }

                .auth-divider-text {
                    font-size: 0.8rem;
                    font-weight: 500;
                    color: var(--text-color-secondary);
                }

                .auth-social-stack {
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    width: 100%;
                }

                .google-signin-btn, .github-signin-btn, .vk-signin-btn {
                    width: 100%;
                    padding: 12px 20px;
                    border-radius: 10px;
                    font-size: 1rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 12px;
                    font-family: 'Poppins', sans-serif;
                    position: relative;
                    overflow: visible;
                    box-sizing: border-box;
                }

                .google-signin-btn {
                    border: 1px solid #dadce0;
                    background: #ffffff;
                    color: #3c4043;
                    box-shadow: 0 1px 3px rgba(60,64,67,0.3), 0 2px 6px 2px rgba(60,64,67,0.15);
                }
                .google-signin-btn:hover {
                    background: #f8f9fa;
                    box-shadow: 0 2px 6px rgba(60,64,67,0.3), 0 3px 10px 3px rgba(60,64,67,0.15);
                    border-color: #d2e3fc;
                    transform: translateY(-2px);
                }

                .github-signin-btn {
                    border: none;
                    background: #24292e;
                    color: #ffffff;
                    box-shadow: 0 2px 8px rgba(36, 41, 46, 0.3);
                }
                .github-signin-btn:hover {
                    background: #000000;
                    box-shadow: 0 4px 12px rgba(36, 41, 46, 0.45);
                    transform: translateY(-2px);
                }
                .github-signin-btn .auth-btn-icon-svg path {
                    fill: #ffffff;
                }

                .vk-signin-btn {
                    border: none;
                    background: #0077FF;
                    color: #ffffff;
                    box-shadow: 0 2px 10px rgba(0, 119, 255, 0.3);
                }
                .vk-signin-btn:hover {
                    background: #0056cc;
                    box-shadow: 0 4px 16px rgba(0, 119, 255, 0.45);
                    transform: translateY(-2px);
                }
                .vk-signin-btn .auth-btn-icon-svg path {
                    fill: #ffffff;
                }

                .google-signin-btn:active, .github-signin-btn:active, .vk-signin-btn:active { transform: translateY(0); }

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
                .linked-provider-icon--vk {
                    background: linear-gradient(135deg, #0077FF, #0055C4);
                    color: #fff;
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
                .vk-signin-btn.is-loading::after,
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
    
    connectedCallback() {
        if (currentUser) {
            this.loadFromDatabase();
        }
    }
    
    async saveToDatabase() {
        if (!currentUser || !window.firebase) return Promise.resolve();

        const subjectsToSave = { ...this.subjects };
        delete subjectsToSave['__QUICK_CALC__'];

        const dataToSave = {
            subjects: subjectsToSave,
            settings: {
                gradingSystem: this.gradingSystem,
                thresholds: this.thresholds
            }
        };

        const uid = currentUser.uid;
        const email = (currentUser.email || '').toLowerCase().trim();
        const sanitizedEmail = email ? email.replace(/\./g, '_') : null;

        // 0. Instant local storage cache backup by UID so data is NEVER lost even before server confirms
        if (uid) {
            try {
                localStorage.setItem('ssh_grades_' + uid, JSON.stringify(dataToSave));
            } catch (e) {}
        }

        // 1. Save to Realtime Database (by UID and by Sanitized Email)
        if (window.firebase.database) {
            try {
                if (uid) {
                    await window.firebase.database().ref(`users/${uid}`).set(dataToSave);
                }
                if (sanitizedEmail) {
                    await window.firebase.database().ref(`users_by_email/${sanitizedEmail}`).set(dataToSave);
                }
                console.log('✅ [Grades] Saved to Realtime DB.');
            } catch (e) {
                console.error('❌ Error saving to Realtime DB:', e);
            }
        }

        // 2. Save to Firestore (by Email and UID)
        if (window.firebase.firestore) {
            try {
                if (email) {
                    await window.firebase.firestore().collection('users').doc(email).set(dataToSave, { merge: true });
                }
                if (uid) {
                    await window.firebase.firestore().collection('users').doc(uid).set(dataToSave, { merge: true });
                }
                console.log('✅ [Grades] Saved to Firestore.');
            } catch (e) {
                console.warn('ℹ️ Firestore save info:', e.message);
            }
        }
    }

    setGradingSystem(system) {
        if (system === this.gradingSystem) return;
        this.gradingSystem = system;
        this.convertGradesToSystem(system);
        this.simulatedGrade = null;
        this.saveToDatabase();
        this.update();
        // Also update the settings component buttons
        const settingsComp = document.querySelector('settings-component');
        if (settingsComp) {
            settingsComp.updateGradingSystemButtons();
        }
    }

    convertGradesToSystem(targetSystem) {
        const numToLetter = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F' };
        const letterToNum = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };

        const convertGrade = (g) => {
            if (targetSystem === 'us-letter') {
                if (typeof g === 'number' || (!isNaN(Number(g)) && String(g).trim() !== '')) {
                    const n = Math.round(Number(g));
                    return numToLetter[n] || (n >= 5 ? 'A' : n === 4 ? 'B' : n === 3 ? 'C' : n === 2 ? 'D' : 'F');
                }
                const upper = String(g).toUpperCase();
                return this.gradeMap[upper] !== undefined ? upper : 'A';
            } else { // 5-point
                const upper = String(g).toUpperCase();
                if (letterToNum[upper] !== undefined) {
                    return letterToNum[upper];
                }
                const n = Number(g);
                return isNaN(n) ? 5 : Math.max(1, Math.min(5, Math.round(n)));
            }
        };

        if (Array.isArray(this.quickCalcGrades)) {
            this.quickCalcGrades = this.quickCalcGrades.map(convertGrade);
        }
        if (this.subjects && typeof this.subjects === 'object') {
            Object.keys(this.subjects).forEach(subj => {
                if (Array.isArray(this.subjects[subj])) {
                    this.subjects[subj] = this.subjects[subj].map(convertGrade);
                }
            });
        }
    }
    
    addGradeToSubject(subjectName, grade) {
        const numToLetter = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F' };
        const letterToNum = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
        let gradeToAdd = grade;

        if (this.gradingSystem === '5-point') {
            const upper = String(grade).toUpperCase();
            if (letterToNum[upper] !== undefined) {
                gradeToAdd = letterToNum[upper];
            } else {
                const n = Number(grade);
                gradeToAdd = isNaN(n) ? 5 : Math.max(1, Math.min(5, Math.round(n)));
            }
        } else { // us-letter
            if (typeof grade === 'number' || (!isNaN(Number(grade)) && String(grade).trim() !== '')) {
                const n = Math.round(Number(grade));
                gradeToAdd = numToLetter[n] || (n >= 5 ? 'A' : n === 4 ? 'B' : n === 3 ? 'C' : n === 2 ? 'D' : 'F');
            } else {
                const upper = String(grade).toUpperCase();
                gradeToAdd = this.gradeMap[upper] !== undefined ? upper : 'A';
            }
        }

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
        if (!grades || grades.length === 0) return '0.00';

        const letterToNum = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
        const numToLetter = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F' };

        if (this.gradingSystem === '5-point') {
            const nums = grades.map(g => {
                const upper = String(g).toUpperCase();
                if (letterToNum[upper] !== undefined) return letterToNum[upper];
                const n = Number(g);
                return isNaN(n) ? null : n;
            }).filter(n => n !== null);
            if (nums.length === 0) return '0.00';
            return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
        } else { // us-letter
            const totalPoints = grades.reduce((acc, g) => {
                let letter = g;
                if (typeof g === 'number' || (!isNaN(Number(g)) && String(g).trim() !== '')) {
                    letter = numToLetter[Math.round(Number(g))] || 'F';
                }
                const pts = this.gradeMap[String(letter).toUpperCase()];
                return acc + (pts !== undefined ? pts : 0);
            }, 0);
            return (totalPoints / grades.length).toFixed(2);
        }
    }
    
    calculateGlobalAverage() {
        const allGrades = Object.values(this.subjects).flat();
        if (allGrades.length === 0) return '0.00';
        const letterToNum = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
        const numToLetter = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F' };

        if (this.gradingSystem === '5-point') {
            const nums = allGrades.map(g => {
                const upper = String(g).toUpperCase();
                if (letterToNum[upper] !== undefined) return letterToNum[upper];
                const n = Number(g);
                return isNaN(n) ? null : n;
            }).filter(n => n !== null);
            if (nums.length === 0) return '0.00';
            return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
        } else {
            const totalPoints = allGrades.reduce((acc, g) => {
                let letter = g;
                if (typeof g === 'number' || (!isNaN(Number(g)) && String(g).trim() !== '')) {
                    letter = numToLetter[Math.round(Number(g))] || 'F';
                }
                const pts = this.gradeMap[String(letter).toUpperCase()];
                return acc + (pts !== undefined ? pts : 0);
            }, 0);
            return (totalPoints / allGrades.length).toFixed(2);
        }
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
                /* Horizontal Scrollable Subjects Panel */
                .subjects-bar-container {
                    position: relative;
                    width: 100%;
                    margin: 0 0 1.25rem 0;
                }
                .subjects-scroll-track {
                    display: flex;
                    align-items: center;
                    gap: 0.65rem;
                    overflow-x: auto;
                    overflow-y: hidden;
                    padding: 0.4rem 0.2rem 0.75rem;
                    scroll-behavior: smooth;
                    -webkit-overflow-scrolling: touch;
                    scrollbar-width: thin;
                    scrollbar-color: color-mix(in srgb, var(--primary-accent) 40%, transparent) transparent;
                    cursor: grab;
                    user-select: none;
                    -webkit-user-select: none;
                }
                .subjects-scroll-track.is-dragging {
                    cursor: grabbing;
                    scroll-behavior: auto;
                }
                .subjects-scroll-track::-webkit-scrollbar {
                    height: 4px;
                }
                .subjects-scroll-track::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.03);
                    border-radius: 999px;
                }
                .subjects-scroll-track::-webkit-scrollbar-thumb {
                    background: color-mix(in srgb, var(--primary-accent) 45%, transparent);
                    border-radius: 999px;
                }
                .subjects-scroll-track::-webkit-scrollbar-thumb:hover {
                    background: var(--primary-accent);
                }
                .subject-chip {
                    flex-shrink: 0;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.55rem;
                    padding: 0.65rem 1.15rem;
                    border-radius: 12px;
                    background: var(--component-background);
                    border: 1px solid color-mix(in srgb, var(--primary-accent) 35%, transparent);
                    color: var(--text-color);
                    font-family: inherit;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    transition: transform 0.2s cubic-bezier(0.25, 0.8, 0.25, 1), background 0.2s, border-color 0.2s, box-shadow 0.2s;
                    white-space: nowrap;
                    box-shadow: 0 3px 10px var(--shadow-color-lift);
                    outline: none;
                }
                .subject-chip:hover {
                    border-color: var(--primary-accent);
                    transform: translateY(-2px);
                    box-shadow: 0 6px 16px color-mix(in srgb, var(--primary-accent) 25%, transparent);
                }
                .subject-chip.active {
                    background: linear-gradient(135deg, var(--primary-accent), #005eff);
                    color: #ffffff;
                    border-color: transparent;
                    box-shadow: 0 4px 18px var(--glow-color-primary);
                    transform: translateY(-2px);
                }
                .subject-chip-icon {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 16px;
                    height: 16px;
                    flex-shrink: 0;
                }
                .subject-chip-icon svg {
                    width: 15px;
                    height: 15px;
                    stroke: currentColor;
                    fill: none;
                    display: block;
                }
                .subject-chip-title {
                    white-space: nowrap;
                }
                .subject-chip-badge {
                    font-size: 0.75rem;
                    font-weight: 700;
                    padding: 1px 7px;
                    border-radius: 999px;
                    background: color-mix(in srgb, var(--primary-accent) 18%, transparent);
                    color: var(--primary-accent);
                    line-height: 1.3;
                }
                .subject-chip.active .subject-chip-badge {
                    background: rgba(255, 255, 255, 0.25);
                    color: #ffffff;
                }

                /* Target Grade Selector (Cards / Segmented) */
                .target-grade-selector {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
                    gap: 0.75rem;
                    margin-bottom: 0.5rem;
                }
                .target-grade-card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem 0.5rem;
                    border-radius: 14px;
                    background: var(--component-background);
                    border: 1.5px solid color-mix(in srgb, var(--primary-accent) 35%, transparent);
                    color: var(--text-color);
                    cursor: pointer;
                    transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
                    box-shadow: 0 4px 12px var(--shadow-color-lift);
                    user-select: none;
                }
                .target-grade-card:hover {
                    border-color: var(--primary-accent);
                    transform: translateY(-3px);
                    box-shadow: 0 6px 18px color-mix(in srgb, var(--primary-accent) 30%, transparent);
                }
                .target-grade-card.active {
                    background: linear-gradient(135deg, var(--primary-accent), #005eff);
                    color: #ffffff;
                    border-color: transparent;
                    box-shadow: 0 8px 24px var(--glow-color-primary);
                    transform: translateY(-2px) scale(1.02);
                }
                .target-grade-val {
                    font-size: 1.7rem;
                    font-weight: 800;
                    line-height: 1;
                    margin-bottom: 0.35rem;
                }
                .target-grade-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    opacity: 0.85;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                    text-align: center;
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
                    <div class="subjects-bar-container">
                        <div class="subjects-scroll-track" id="subjects-scroll-track" role="tablist" aria-label="Subjects">
                            <!-- Dynamically populated subject chips -->
                        </div>
                        <select id="subject-select" style="display: none;">
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
                        <div class="target-grade-selector" id="target-grade-selector"></div>
                        <select id="target-select" style="display: none;"></select>
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

        // DRAG-TO-SCROLL FOR SUBJECTS PANEL
        const scrollTrack = this.shadowRoot.querySelector('#subjects-scroll-track');
        if (scrollTrack) {
            let isDown = false;
            let startX = 0;
            let scrollLeft = 0;
            let hasDragged = false;

            scrollTrack.addEventListener('mousedown', (e) => {
                isDown = true;
                hasDragged = false;
                scrollTrack.classList.add('is-dragging');
                startX = e.pageX - scrollTrack.offsetLeft;
                scrollLeft = scrollTrack.scrollLeft;
            });

            scrollTrack.addEventListener('mouseleave', () => {
                isDown = false;
                scrollTrack.classList.remove('is-dragging');
            });

            scrollTrack.addEventListener('mouseup', () => {
                isDown = false;
                scrollTrack.classList.remove('is-dragging');
            });

            scrollTrack.addEventListener('mousemove', (e) => {
                if (!isDown) return;
                e.preventDefault();
                const x = e.pageX - scrollTrack.offsetLeft;
                const walk = (x - startX) * 1.5;
                if (Math.abs(walk) > 4) {
                    hasDragged = true;
                }
                scrollTrack.scrollLeft = scrollLeft - walk;
            });

            scrollTrack.addEventListener('wheel', (e) => {
                if (e.deltaY !== 0) {
                    e.preventDefault();
                    scrollTrack.scrollLeft += e.deltaY;
                }
            }, { passive: false });

            this._hasDragged = () => hasDragged;
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
                
                if (grades && !isNaN(index) && grades[index] !== undefined) {
                    grades.splice(index, 1);
                    if (this.currentSubject !== '__QUICK_CALC__') {
                        this.saveToDatabase();
                    }
                    this.update();
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
                this.deleteSubject(subjectName);
            });
        });
    }
    
    renderInputTab() {
        const subjectSelect = this.shadowRoot.querySelector('#subject-select');
        const scrollTrack = this.shadowRoot.querySelector('#subjects-scroll-track');
        const resultLabel = this.shadowRoot.querySelector('#result-label');

        if (this.gradingSystem === '5-point') {
            resultLabel.setAttribute('data-i18n', 'averageScore');
        } else {
            resultLabel.setAttribute('data-i18n', 'gpa');
        }

        subjectSelect.innerHTML = '';
        if (scrollTrack) scrollTrack.innerHTML = '';

        const quickCalcText = (translations[currentLang]?.quickCalc || 'Быстрый подсчет (локально)');

        // 1. Quick Calc option (hidden select + chip)
        const quickCalcOption = document.createElement('option');
        quickCalcOption.value = '__QUICK_CALC__';
        quickCalcOption.textContent = quickCalcText;
        subjectSelect.appendChild(quickCalcOption);

        if (scrollTrack) {
            const isQuick = this.currentSubject === '__QUICK_CALC__';
            const quickChip = document.createElement('button');
            quickChip.type = 'button';
            quickChip.className = `subject-chip ${isQuick ? 'active' : ''}`;
            quickChip.dataset.value = '__QUICK_CALC__';
            quickChip.setAttribute('role', 'tab');
            quickChip.setAttribute('aria-selected', isQuick ? 'true' : 'false');
            
            const flashSvg = `<svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
            
            quickChip.innerHTML = `
                <span class="subject-chip-icon">${flashSvg}</span>
                <span class="subject-chip-title">${quickCalcText}</span>
                <span class="subject-chip-badge">${this.quickCalcGrades.length}</span>
            `;
            quickChip.addEventListener('click', () => {
                if (this._hasDragged && this._hasDragged()) return;
                this.selectSubject('__QUICK_CALC__');
            });
            scrollTrack.appendChild(quickChip);
        }

        // 2. Custom user subjects
        const bookSvg = `<svg viewBox="0 0 24 24" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;

        Object.keys(this.subjects).forEach(subjectName => {
            const option = document.createElement('option');
            option.value = subjectName;
            option.textContent = subjectName;
            subjectSelect.appendChild(option);

            if (scrollTrack) {
                const isActive = this.currentSubject === subjectName;
                const gradesCount = (this.subjects[subjectName] || []).length;
                const chip = document.createElement('button');
                chip.type = 'button';
                chip.className = `subject-chip ${isActive ? 'active' : ''}`;
                chip.dataset.value = subjectName;
                chip.setAttribute('role', 'tab');
                chip.setAttribute('aria-selected', isActive ? 'true' : 'false');
                chip.innerHTML = `
                    <span class="subject-chip-icon">${bookSvg}</span>
                    <span class="subject-chip-title">${subjectName}</span>
                    <span class="subject-chip-badge">${gradesCount}</span>
                `;
                chip.addEventListener('click', () => {
                    if (this._hasDragged && this._hasDragged()) return;
                    this.selectSubject(subjectName);
                });
                scrollTrack.appendChild(chip);
            }
        });

        // Set selected option
        subjectSelect.value = this.currentSubject;

        // Smoothly scroll active chip into view
        if (scrollTrack) {
            const activeChip = scrollTrack.querySelector('.subject-chip.active');
            if (activeChip) {
                setTimeout(() => {
                    activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                }, 50);
            }
        }
    }

    selectSubject(subjectName) {
        this.currentSubject = subjectName || '__QUICK_CALC__';
        this.simulatedGrade = null;
        this.update();
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
        
        // Render target select options and custom target cards
        const targetSelect = this.shadowRoot.querySelector('#target-select');
        const targetContainer = this.shadowRoot.querySelector('#target-grade-selector');
        let optionsHTML = '';
        if (targetContainer) targetContainer.innerHTML = '';

        if (this.gradingSystem === '5-point') {
            optionsHTML = `
                <option value="5" data-i18n="grade5">5</option>
                <option value="4" data-i18n="grade4">4</option>
                <option value="3" data-i18n="grade3">3</option>
            `;
            if (!this.targetGrade || typeof this.targetGrade === 'string') {
                this.targetGrade = 5;
            }

            const targets = [
                { val: 5, label: (translations[currentLang]?.grade5 || 'Пятёрка') },
                { val: 4, label: (translations[currentLang]?.grade4 || 'Четвёрка') },
                { val: 3, label: (translations[currentLang]?.grade3 || 'Тройка') }
            ];

            if (targetContainer) {
                targets.forEach(t => {
                    const card = document.createElement('div');
                    card.className = `target-grade-card ${this.targetGrade === t.val ? 'active' : ''}`;
                    card.innerHTML = `
                        <span class="target-grade-val">${t.val}</span>
                        <span class="target-grade-label">${t.label}</span>
                    `;
                    card.addEventListener('click', () => {
                        this.targetGrade = t.val;
                        if (targetSelect) targetSelect.value = t.val;
                        targetContainer.querySelectorAll('.target-grade-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        this.updateStrategy();
                    });
                    targetContainer.appendChild(card);
                });
            }
        } else { // us-letter
            optionsHTML = `
                <option value="A" data-i18n="gradeA">A</option>
                <option value="B" data-i18n="gradeB">B</option>
                <option value="C" data-i18n="gradeC">C</option>
                <option value="D" data-i18n="gradeD">D</option>
            `;
            if (!this.targetGrade || typeof this.targetGrade === 'number') {
                this.targetGrade = 'A';
            }

            const targets = [
                { val: 'A', label: 'GPA 4.0' },
                { val: 'B', label: 'GPA 3.0' },
                { val: 'C', label: 'GPA 2.0' },
                { val: 'D', label: 'GPA 1.0' }
            ];

            if (targetContainer) {
                targets.forEach(t => {
                    const card = document.createElement('div');
                    card.className = `target-grade-card ${this.targetGrade === t.val ? 'active' : ''}`;
                    card.innerHTML = `
                        <span class="target-grade-val">${t.val}</span>
                        <span class="target-grade-label">${t.label}</span>
                    `;
                    card.addEventListener('click', () => {
                        this.targetGrade = t.val;
                        if (targetSelect) targetSelect.value = t.val;
                        targetContainer.querySelectorAll('.target-grade-card').forEach(c => c.classList.remove('active'));
                        card.classList.add('active');
                        this.updateStrategy();
                    });
                    targetContainer.appendChild(card);
                });
            }
        }
        if (targetSelect) {
            targetSelect.innerHTML = optionsHTML;
            targetSelect.value = this.targetGrade;
        }
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
        if (!grades || (grades.length === 0 && this.simulatedGrade === null)) return '0.00';
        
        let allGrades = [...grades];
        if (this.simulatedGrade !== null) {
            allGrades.push(this.simulatedGrade);
        }
        if (allGrades.length === 0) return '0.00';
        
        const letterToNum = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
        const numToLetter = { 5: 'A', 4: 'B', 3: 'C', 2: 'D', 1: 'F' };

        if (this.gradingSystem === '5-point') {
            const nums = allGrades.map(g => {
                const upper = String(g).toUpperCase();
                if (letterToNum[upper] !== undefined) return letterToNum[upper];
                const n = Number(g);
                return isNaN(n) ? null : n;
            }).filter(n => n !== null);
            if (nums.length === 0) return '0.00';
            return (nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2);
        } else { // us-letter
            const totalPoints = allGrades.reduce((acc, g) => {
                let letter = g;
                if (typeof g === 'number' || (!isNaN(Number(g)) && String(g).trim() !== '')) {
                    letter = numToLetter[Math.round(Number(g))] || 'F';
                }
                const pts = this.gradeMap[String(letter).toUpperCase()];
                return acc + (pts !== undefined ? pts : 0);
            }, 0);
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
        if (!currentUser || !window.firebase) {
            this.subjects = {};
            this.currentSubject = '__QUICK_CALC__';
            this.update();
            return Promise.resolve();
        }

        const uid = currentUser.uid;
        const email = (currentUser.email || '').toLowerCase().trim();
        const sanitizedEmail = email ? email.replace(/\./g, '_') : null;

        const applyData = (data) => {
            if (data && data.subjects && Object.keys(data.subjects).length > 0) {
                this.gradingSystem = (data.settings && data.settings.gradingSystem) || '5-point';

                const defaultThresholds = {
                    '5-point': { 5: 4.50, 4: 3.50, 3: 2.50 },
                    'us-letter': { 'A': 90, 'B': 80, 'C': 70, 'D': 60, 'F': 0 }
                };
                
                const loadedThresholds = (data.settings && data.settings.thresholds) || {};
                this.thresholds = {
                    '5-point': { ...defaultThresholds['5-point'], ...loadedThresholds['5-point'] },
                    'us-letter': { ...defaultThresholds['us-letter'], ...loadedThresholds['us-letter'] }
                };

                this.subjects = data.subjects;

                const subjectKeys = Object.keys(this.subjects);
                if (subjectKeys.length > 0 && (!this.currentSubject || !this.subjects[this.currentSubject] || this.currentSubject === '__QUICK_CALC__')) {
                    this.currentSubject = subjectKeys[0];
                }
                this.update();
                const settingsComp = document.querySelector('settings-component');
                if (settingsComp) {
                    settingsComp.updateGradingSystemButtons();
                }
                return true;
            }
            return false;
        };

        // 0. Instant load from local cache by UID
        if (uid) {
            try {
                const cached = localStorage.getItem('ssh_grades_' + uid);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    applyData(parsed);
                    console.log('✅ [Grades] Loaded immediately from local cache');
                }
            } catch (e) {}
        }

        // 1. Realtime Database listener by UID
        if (window.firebase.database && uid) {
            if (this._databaseRef) this._databaseRef.off('value');
            this._databaseRef = window.firebase.database().ref(`users/${uid}`);
            this._databaseRef.on('value', (snapshot) => {
                const data = snapshot.val();
                if (data && applyData(data)) {
                    console.log('✅ [Grades] Loaded from Realtime DB (UID)');
                } else if (sanitizedEmail) {
                    // Fallback to Realtime DB by Email
                    window.firebase.database().ref(`users_by_email/${sanitizedEmail}`).once('value').then((snap) => {
                        const emailData = snap.val();
                        if (emailData) {
                            console.log('✅ [Grades] Loaded from Realtime DB (Email)');
                            applyData(emailData);
                        }
                    }).catch(() => {});
                }
            }, (err) => console.warn('Realtime DB listener info:', err));
        }

        // 2. Firestore listener by UID and by Email
        if (window.firebase.firestore) {
            if (this._unsubscribeFirestoreUid) this._unsubscribeFirestoreUid();
            if (uid) {
                this._unsubscribeFirestoreUid = window.firebase.firestore().collection('users').doc(uid)
                    .onSnapshot((docSnap) => {
                        if (docSnap.exists) {
                            console.log('✅ [Grades] Loaded from Firestore (UID)');
                            applyData(docSnap.data());
                        }
                    }, (err) => console.warn('Firestore UID listener info:', err?.message || err));
            }

            if (this._unsubscribeFirestore) this._unsubscribeFirestore();
            if (email) {
                this._unsubscribeFirestore = window.firebase.firestore().collection('users').doc(email)
                    .onSnapshot((docSnap) => {
                        if (docSnap.exists) {
                            console.log('✅ [Grades] Loaded from Firestore (Email)');
                            applyData(docSnap.data());
                        }
                    }, (err) => console.warn('Firestore Email listener info:', err?.message || err));
            }
        }

        if (typeof currentUser.getIdToken === 'function') {
            return currentUser.getIdToken(true).catch(() => {});
        }
        return Promise.resolve();
    }

    syncGrades() {
        this.saveToDatabase();
    }
}
customElements.define('grade-average-calculator', GradeAverageCalculator);


// --- MAIN APP INITIALIZATION ---
document.addEventListener('DOMContentLoaded', function() {
    // Hide native Capacitor splash screen
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SplashScreen) {
        try { window.Capacitor.Plugins.SplashScreen.hide(); } catch (e) {}
    }

    try {
        // Apply saved theme and language (functions from ui.js)
        var savedTheme = localStorage.getItem('theme') || 'dark';
        var initialLang = typeof getInitialUserLanguage === 'function' ? getInitialUserLanguage() : 'en';
        if (typeof setTheme === 'function') setTheme(savedTheme);
        if (typeof setLanguage === 'function') setLanguage(initialLang);
    } catch (e) {
        console.warn('[renderer] Theme/Language init warning:', e);
    }

    setTimeout(function() {
        try {
            if (typeof updateTranslations === 'function') updateTranslations();
        } catch (e) {
            console.warn('[renderer] updateTranslations warning:', e);
        }
    }, 50);

    // Initialize desktop download modal and auth dialogs (functions from ui.js + auth.js)
    try {
        if (typeof initDesktopDownloadModal === 'function') initDesktopDownloadModal();
    } catch (e) {
        console.warn('[renderer] initDesktopDownloadModal warning:', e);
    }
    try {
        if (typeof initAuthDialogs === 'function') initAuthDialogs();
    } catch (e) {
        console.warn('[renderer] initAuthDialogs warning:', e);
    }

    // Electron: custom titlebar + OAuth result handler
    if (typeof window.electronAPI !== 'undefined' && window.electronAPI.isElectron) {
        try {
            var minimizeBtn = document.querySelector('.titlebar-minimize');
            var maximizeBtn = document.querySelector('.titlebar-maximize');
            var closeBtn = document.querySelector('.titlebar-close');
            if (minimizeBtn) minimizeBtn.addEventListener('click', function() { window.electronAPI.send('window-minimize'); });
            if (maximizeBtn) maximizeBtn.addEventListener('click', function() { window.electronAPI.send('window-maximize'); });
            if (closeBtn) closeBtn.addEventListener('click', function() { window.electronAPI.send('window-close'); });

            window.electronAPI.onGoogleSigninResult(function(err, token, provider, googleAccessToken) {
                if (err) { console.error('OAuth sign-in (desktop):', err); openAccountErrorModal('Sign-in failed: ' + err); return; }
                if (!token || !firebaseAuth) return;
                if (provider === 'google' && googleAccessToken) localStorage.setItem('google_access_token', googleAccessToken);
                var credential;
                if (provider === 'vk' || provider === 'oidc.vk-id') {
                    var vkProvider = new firebase.auth.OAuthProvider('oidc.vk-id');
                    credential = vkProvider.credential({ idToken: token });
                } else if (provider === 'github') {
                    credential = firebase.auth.GithubAuthProvider.credential(token);
                } else {
                    credential = firebase.auth.GoogleAuthProvider.credential(token);
                }
                firebaseAuth.signInWithCredential(credential)
                    .then(function(result) {
                        console.log('Sign-in success (desktop).');
                        if (provider === 'google' && googleAccessToken) localStorage.setItem('google_access_token', googleAccessToken);
                        return finalizeSignIn(result);
                    })
                    .catch(function(e) {
                        console.error(e);
                        openAccountErrorModal('Sign-in failed: ' + (e && e.message ? e.message : e));
                    });
            });
        } catch (e) {
            console.warn('[renderer] Electron titlebar init warning:', e);
        }
    }

    // Tab navigation (function from ui.js)
    try {
        if (typeof initTabNavigation === 'function') initTabNavigation();
    } catch (e) {
        console.warn('[renderer] initTabNavigation warning:', e);
    }

    // Feather icons
    if (typeof feather !== 'undefined') {
        try { feather.replace(); } catch (e) { console.warn('feather.replace() failed:', e); }
    }

    try {
        if (typeof updateTranslations === 'function') updateTranslations();
    } catch (e) {
        console.warn('[renderer] second updateTranslations warning:', e);
    }

    // Hide splash screen safely
    try {
        if (typeof hideSplashScreen === 'function') {
            setTimeout(hideSplashScreen, 600);
        } else {
            setTimeout(function() {
                try {
                    var splash = document.getElementById('app-splash-screen')
                        || document.querySelector('.splash-screen')
                        || document.querySelector('.loading-screen');
                    if (splash) {
                        splash.classList.add('fade-out');
                        splash.style.opacity = '0';
                        splash.style.transition = 'opacity 0.4s ease';
                        setTimeout(function() {
                            try { splash.remove(); } catch (e) {}
                        }, 400);
                    }
                } catch (e) {
                    console.warn('[renderer] Splash remove error:', e);
                }
            }, 600);
        }
    } catch (e) {
        console.warn('[renderer] Splash dismissal setup error:', e);
    }

    // Capacitor Android: back button + channel detection
    if (typeof window.Capacitor !== 'undefined' && window.Capacitor.isNativePlatform()) {
        try {
            var App = window.Capacitor.Plugins.App;
            if (App) {
                App.addListener('backButton', function() {
                    var openModal = document.querySelector('.modal.active');
                    if (openModal) { openModal.classList.remove('active'); return; }
                    if (document.body.classList.contains('ai-chat-open')) { document.body.classList.remove('ai-chat-open'); return; }
                    var activePanel = document.querySelector('.tool-panel:not(.hidden)');
                    if (activePanel) {
                        activePanel.classList.add('hidden');
                        var toolsHub = document.getElementById('tools-hub');
                        if (toolsHub) toolsHub.classList.remove('hidden');
                        return;
                    }
                    var activeTabEl = document.querySelector('.nav-tab.active');
                    var activeTab = activeTabEl ? (activeTabEl.dataset.tab || 'tools') : 'tools';
                    if (activeTab !== 'tools') {
                        var toolsTab = document.querySelector('.nav-tab[data-tab="tools"]');
                        if (toolsTab) toolsTab.click();
                        return;
                    }
                    App.minimizeApp();
                });
            }

            var AppChannel = window.Capacitor.Plugins.AppChannel;
            if (AppChannel) {
                AppChannel.getInstaller().then(function(res) {
                    var installer = (res && res.installer) || 'UNKNOWN';
                    var forceRuStore = localStorage.getItem('FORCE_RUSTORE') === '1';
                    if (installer.includes('ru.vk.store') || forceRuStore) {
                        window.INSTALLATION_CHANNEL = 'RU_STORE';
                        document.body.classList.add('rustore-mode');
                        document.body.classList.remove('global-mode');
                    } else {
                        window.INSTALLATION_CHANNEL = 'GLOBAL';
                        document.body.classList.add('global-mode');
                        document.body.classList.remove('rustore-mode');
                    }
                    console.log('[AppChannel] Detected channel:', window.INSTALLATION_CHANNEL, '(', installer, ')');
                }).catch(function(e) {
                    window.INSTALLATION_CHANNEL = 'GLOBAL';
                    document.body.classList.add('global-mode');
                    console.error('[AppChannel] Error detecting channel', e);
                });
            } else {
                window.INSTALLATION_CHANNEL = 'GLOBAL';
                document.body.classList.add('global-mode');
            }
        } catch (e) {
            console.warn('[renderer] Capacitor platform init warning:', e);
        }
    } else {
        window.INSTALLATION_CHANNEL = 'GLOBAL';
        document.body.classList.add('global-mode');
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

