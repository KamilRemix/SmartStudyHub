# Deploy electron-auth.html to Firebase Hosting

So the Electron app can open **https://smartstudyhub-46d44.web.app/electron-auth.html** for Google sign-in, deploy only the auth page as follows.

---

## 1. Install Firebase CLI (once)

In a terminal (PowerShell or Command Prompt):

```bash
npm install -g firebase-tools
```

---

## 2. Log in to Firebase (once)

```bash
firebase login
```

Sign in in the browser with the Google account that owns the **smartstudyhub-46d44** project.

---

## 3. Use the project hosting setup

This repo already has:

- **`public/`** – hosting folder
- **`public/electron-auth.html`** – the auth page
- **`firebase.json`** – `"public": "public"`
- **`.firebaserc`** – default project `smartstudyhub-46d44`

No need to run `firebase init` unless you want to change the project or public folder.

---

## 4. Deploy

From the **project root** (the folder that contains `firebase.json` and `public/`):

```bash
cd c:\Users\Камиль\Downloads\SmartStudyHub-1
firebase deploy
```

When it finishes, you should see something like:

```
Hosting URL: https://smartstudyhub-46d44.web.app
```

---

## 5. Check the auth page

Open in a browser:

**https://smartstudyhub-46d44.web.app/electron-auth.html**

You should see the “Sign in with Google” page. After that, the Electron app’s “Sign in with Google” button will open this URL and sign-in will work.

---

## If you use a different Firebase project

1. Change the project in `.firebaserc` to your project ID, or run:
   ```bash
   firebase use your-project-id
   ```
2. Update the Firebase config inside `public/electron-auth.html` to match that project.
3. In **main.js**, set `AUTH_PAGE_URL` to your hosting URL, e.g.:
   `https://your-project-id.web.app/electron-auth.html`

---

## Redeploy after editing the auth page

After any change to `public/electron-auth.html` (or other files in `public/`), run again:

```bash
firebase deploy
```
