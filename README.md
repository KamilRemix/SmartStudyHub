<div align="center">

<img src="public/icons/icon-192.png" alt="SmartStudyHub Logo" width="100" height="100">

# 🎓 SmartStudyHub

**Your all-in-one AI-powered study companion.**

[![GitHub Stars](https://img.shields.io/github/stars/KamilRemix/SmartStudyHub?style=social)](https://github.com/KamilRemix/SmartStudyHub)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Made with Firebase](https://img.shields.io/badge/Made%20with-Firebase-orange?logo=firebase)](https://firebase.google.com/)
[![Powered by Gemini](https://img.shields.io/badge/Powered%20by-Gemini%20AI-blueviolet?logo=google)](https://deepmind.google/technologies/gemini/)

[🌐 Live Demo](https://smartstudyhub.web.app) · [🐛 Report Bug](https://github.com/KamilRemix/SmartStudyHub/issues) · [✨ Request Feature](https://github.com/KamilRemix/SmartStudyHub/issues)

</div>

---

## ✨ Overview

SmartStudyHub is a **beautiful, full-featured study companion** built as a Progressive Web App (PWA). It combines a smart grade calculator, AI assistant, unit & currency converter, and a full-featured notes system — all synced to your Google account via Firebase.

> Designed for students who want one beautiful place to manage everything school-related.

---

## 🚀 Features

### 🤖 SmartStudyAI Assistant
- Powered by **Google Gemini 2.0 Flash**
- **Multi-turn chat** with persistent history per session
- **Google Services integration**: Gmail, Drive, Calendar, Tasks, YouTube — all controllable via natural language
- Smart tool badges show real-time API activity (e.g. *Searching Google...*)
- **Seamless silent token refresh** via Google Identity Services (GSI)
- Bring your own **personal Gemini API key** to remove daily limits
- Full personalization prompt ("About me") for customized AI behavior

### 📊 Grade Calculator
- Track grades across multiple subjects
- **GPA & 5-point** grading systems
- **"What if?"** scenario calculator — see what grades you need
- Grade thresholds customization
- Cloud sync with Firebase Realtime Database

### 📝 Notes (Google Keep style)
- **Masonry grid layout** just like Google Keep
- Color-coded notes with 9 color options
- **Pin important notes** to the top
- **Inline note editor** with modal popup
- **Checklist notes** with checkbox items
- Real-time search across all notes
- **Grid / List view** toggle
- Synced to Firebase — accessible from any device
- **AI can manage your notes** via chat (create, read, update, delete)

### 🔢 Calculators
- **Scientific Calculator** with full math functions
- **Fraction Calculator** for precise fraction arithmetic

### 🔄 Unit Converter
- Length, mass, temperature conversions
- Clean, fast, offline-capable

### 💱 Currency Converter
- Live exchange rates
- Support for dozens of world currencies
- Visual popular rates cards

---

## 🌍 Supported Languages

SmartStudyHub is fully translated into **11 languages**:

| 🇬🇧 English | 🇷🇺 Русский | 🇺🇦 Українська | 🇧🇾 Беларуская |
|---|---|---|---|
| 🇰🇿 Қазақша | 🇪🇸 Español | 🇩🇪 Deutsch | 🇫🇷 Français |
| 🇨🇳 中文 | 🇹🇷 Türkçe | 🇸🇦 العربية | |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Vanilla HTML, CSS, JavaScript |
| **Icons** | Feather Icons + Google Material Symbols |
| **Auth** | Firebase Authentication (Google + GitHub OAuth) |
| **Database** | Firebase Realtime Database |
| **AI** | Google Gemini 2.0 Flash API |
| **Token Refresh** | Google Identity Services (GSI) |
| **Hosting** | Firebase Hosting |
| **Desktop** | Electron (optional wrapper) |

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+
- A Firebase project
- A Google Gemini API key ([Get one here](https://aistudio.google.com/))

### Installation

```bash
# Clone the repository
git clone https://github.com/KamilRemix/SmartStudyHub.git
cd SmartStudyHub

# Install dependencies
npm install

# Build the web app
node build-web.js

# Serve locally
npx http-server dist -p 5000
```

### Environment Setup

Create a `.env` file or set the `REACT_APP_GEMINI_API_KEY` environment variable with your Gemini API key. The build script (`build-web.js`) will inject it automatically into the `dist/` folder.

### Firebase Configuration

Edit `firebase.json` and replace the Firebase config in `public/index.html` with your own Firebase project credentials.

---

## 📁 Project Structure

```
SmartStudyHub/
├── public/
│   ├── index.html          # Main app HTML
│   ├── style.css           # Global styles + component styles
│   ├── renderer.js         # Core app logic, auth, i18n
│   ├── ai-assistant.js     # AI chat + Google API tools
│   ├── notes.js            # Notes CRUD + Firebase sync
│   ├── translations.js     # All 11-language translations
│   ├── converter.js        # Unit & currency converter logic
│   ├── google-icons/       # Google service PNG icons
│   └── material-symbols/   # Offline Material Symbols font
├── build-web.js            # Build script (injects API key)
├── dist/                   # Production build output
├── main.js                 # Electron main process
├── preload.js              # Electron preload script
└── firebase.json           # Firebase hosting config
```

---

## 🔐 Privacy & Security

- **Your API keys are stored locally** in `localStorage` — never sent to any server.
- **OAuth tokens** are managed silently via Google Identity Services — no password ever touches the app.
- **Notes and grades** are stored in your personal Firebase account — isolated per user UID.

---

## 🤝 Contributing

Contributions are welcome! Please open an issue first to discuss what you'd like to change.

```bash
# Fork the repo, then create a branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m 'Add amazing feature'

# Push and open a PR
git push origin feature/amazing-feature
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<div align="center">

Made with ❤️ by [KamilRemix](https://github.com/KamilRemix)

⭐ **Star this repo** if SmartStudyHub helped you study smarter!

</div>
