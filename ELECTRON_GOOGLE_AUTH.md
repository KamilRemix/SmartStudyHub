# Google Sign-In in the Electron App (Deep Link)

The desktop app uses the same pattern as Discord/VS Code: **open the system browser** to sign in, then **return to the app via a deep link**.

## Flow

1. User clicks **“Sign in with Google”** in the Electron app.
2. The **default system browser** (Chrome, Edge, etc.) opens to the auth page.
3. User signs in with Google on that page (popup works normally in the browser).
4. The auth page redirects to `smartstudyhub://auth?token=...`, which **reopens/focuses the Electron app** and passes the token.
5. The app signs in to Firebase with that token.

No CLIENT_ID or callback server is needed in the app.

## What you need to do

### Host the auth page

The app opens this URL when the user clicks “Sign in with Google”:

- **Default:** `https://studio-9933447149-80d6a.web.app/electron-auth.html`

So you must **host the file `electron-auth.html`** (from this project) at that path.

- **Firebase Hosting:** deploy `electron-auth.html` so it is served at `/electron-auth.html` on your project’s default hosting URL (e.g. `studio-9933447149-80d6a.web.app`).
- **Custom domain:** if you use another domain, change the URL in **main.js** (constant `AUTH_PAGE_URL`) to match, e.g. `https://yourdomain.com/electron-auth.html`, and host the same file there.

### Optional: change the auth URL

If you host the page somewhere else, set that URL in **main.js**:

```js
const AUTH_PAGE_URL = 'https://your-domain.com/electron-auth.html';
```

### First-time protocol (Windows)

The first time a user completes sign-in, the browser may ask “Open SmartStudyHub?” when redirecting to `smartstudyhub://...`. They should choose **Open** so the app receives the token. After that, it usually opens without asking.

## Window behavior

- The **top titlebar** is draggable (`-webkit-app-region: drag`) so you can move the window.
- **Minimize / Maximize / Close** use `-webkit-app-region: no-drag` so the buttons stay clickable.
