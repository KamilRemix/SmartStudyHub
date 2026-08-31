<div align="center">

<br>

# 🎓 SmartStudyHub

**Your all-in-one AI-powered study companion and productivity suite.**

[![GitHub Stars](https://img.shields.io/github/stars/KamilRemix/SmartStudyHub?style=social)](https://github.com/KamilRemix/SmartStudyHub/stargazers)
[![Release](https://img.shields.io/github/v/release/KamilRemix/SmartStudyHub?color=blue&label=release)](https://github.com/KamilRemix/SmartStudyHub/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-orange?logo=firebase&logoColor=white)](https://firebase.google.com/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0-blueviolet?logo=google&logoColor=white)](https://deepmind.google/technologies/gemini/)
[![Platform](https://img.shields.io/badge/Platform-Web%20%7C%20Windows-lightgrey?logo=windows)](https://github.com/KamilRemix/SmartStudyHub/releases)

<br>

**[🌐 Open Web App](https://studio-9933447149-80d6a.web.app)** · **[📥 Download for Windows](https://github.com/KamilRemix/SmartStudyHub/releases)** · **[🐛 Report Bug](https://github.com/KamilRemix/SmartStudyHub/issues)**

<br>

</div>

---

## ✨ What is SmartStudyHub?

SmartStudyHub is a **modern, beautifully designed study companion** that brings together everything a student needs in one place. Built as a **Progressive Web App** with an optional **desktop client (Electron)**, it works seamlessly in any browser and syncs your data across all your devices via Firebase.

> Designed for students who want **one beautiful place** to study smarter, track grades, take notes, and get AI help — all for free.

---

## 🚀 Core Features

### 🤖 SmartStudyAI — AI Chat Assistant
- Powered by **Google Gemini 2.0 Flash**
- Full **multi-turn conversations** with persistent chat history
- **Google Workspace integration**: Gmail, Drive, Calendar, Google Tasks, YouTube — all controllable via natural language in the chat
- Real-time tool badges show what the AI is doing (*Searching Google...*, *Reading Gmail...*)
- Bring your own **personal Gemini API key** to remove daily limits
- **Personalization prompt** — teach the AI how you like your answers

### 📝 Smart Notes (Google Keep style)
- **Masonry grid layout** just like Google Keep
- **9 color themes** per note
- **Pin notes** to keep important ones at the top
- **Checklist mode** — create to-do lists inside notes
- **Live search** across all notes
- **Grid / List view** toggle
- Full **modal editor** for editing notes
- AI can create, read, update and delete your notes via chat
- Real-time **Firebase sync** — access notes from any device

### 📊 Grade Calculator & Tracker
- Track grades across **multiple subjects**
- Supports **5-point (RU/CIS)** and **4.0 GPA (US)** systems
- **"What-If?" Calculator** — find out what grade you need to hit your target
- Custom **grade threshold** configuration
- Cloud-synced per user account

### 🔢 Scientific Calculator
- Full math functions: sin, cos, tan, log, √, π, factorial and more
- Clean keyboard-style interface
- **Fraction Calculator** included for precise fraction arithmetic

### 🔄 Unit Converter
- Length, mass, temperature and more
- Fast, offline-capable

### 💱 Currency Converter
- **Live exchange rates** from a public API
- 30+ world currencies
- Visual popular-rates cards

### 🔑 Password Generator
- Cryptographically secure random passwords
- Customizable length, character sets
- Live **entropy score** and estimated crack time

---

## 🌍 Supported Languages — 11 Total

| 🇬🇧 English | 🇷🇺 Русский | 🇺🇦 Українська | 🇧🇾 Беларуская | 🇰🇿 Қазақша |
|:---:|:---:|:---:|:---:|:---:|
| 🇪🇸 Español | 🇩🇪 Deutsch | 🇫🇷 Français | 🇨🇳 中文 | 🇹🇷 Türkçe |
| 🇸🇦 العربية | | | | |

Every screen, button, and placeholder is fully translated — including the AI assistant panel, notes interface, settings, and calculator.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML5, CSS3, JavaScript (no framework) |
| **Icons** | Feather Icons + Google Material Symbols |
| **Authentication** | Firebase Auth — Google & GitHub OAuth |
| **Database** | Firebase Realtime Database |
| **Hosting** | Firebase Hosting |
| **AI Engine** | Google Gemini 2.0 Flash |
| **Token Refresh** | Google Identity Services (GIS) — silent, seamless |
| **Desktop** | Electron (Windows installer via NSIS) |
| **Build** | Custom Node.js build script |

---

## 📦 Getting Started

### Option 1 — Use the Web App

Simply open **[studio-9933447149-80d6a.web.app](https://studio-9933447149-80d6a.web.app)** in any modern browser. No installation required.

### Option 2 — Download Desktop App (Windows)

Download `SmartStudyHub-Setup.exe` from the **[Releases page](https://github.com/KamilRemix/SmartStudyHub/releases)** and run the installer.

### Option 3 — Run Locally

```bash
# 1. Clone the repository
git clone https://github.com/KamilRemix/SmartStudyHub.git
cd SmartStudyHub

# 2. Install dependencies
npm install

# 3. Create a .env file with your Gemini API key
echo REACT_APP_GEMINI_API_KEY=your_key_here > .env

# 4. Build the web app
node build-web.js

# 5. Serve locally
npx http-server dist -p 5000

# OR run the desktop app
npm start
```

### Building the Desktop App

```bash
npm run build
# Output: dist/SmartStudyHub-Setup-*.exe
```

---

## 📁 Project Structure

```
SmartStudyHub/
├── public/                    # Source web app files
│   ├── index.html             # Main app HTML (single-page)
│   ├── style.css              # All styles — layout, components, animations
│   ├── renderer.js            # Core app logic: auth, routing, i18n, tools
│   ├── ai-assistant.js        # AI chat engine + Google API tool handlers
│   ├── notes.js               # Notes CRUD + Firebase realtime sync
│   ├── translations.js        # All 11-language translation strings
│   ├── google-icons/          # Google service PNG icons (Gmail, Drive, etc.)
│   └── material-symbols/      # Offline Material Symbols font (woff2)
├── dist/                      # Production build output (git-ignored)
├── main.js                    # Electron main process
├── preload.js                 # Electron preload (context bridge)
├── electron-auth.html         # OAuth redirect page for desktop auth flow
├── build-web.js               # Build script (injects API key into dist/)
├── firebase.json              # Firebase Hosting config
├── package.json               # npm / Electron Builder config
└── LICENSE                    # MIT License
```

---

## 🔐 Privacy & Security

- **API keys stored locally** — your Gemini API key is saved in `localStorage`, never sent to any server.
- **OAuth tokens** are managed silently via Google Identity Services — no passwords involved.
- **Notes and grades** are isolated per user in Firebase under their unique UID.
- The app uses **HTTPS everywhere** via Firebase Hosting.

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are very welcome!

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'feat: add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

<div align="center">

Made with ❤️ by **[KamilRemix](https://github.com/KamilRemix)**

⭐ **Star this repo** if SmartStudyHub helped you study smarter!

</div>
