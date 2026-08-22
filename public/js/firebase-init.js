/* =========================================================
   public/js/firebase-init.js
   Firebase Initialization — SmartStudyHub
   Exports: window.firebaseApp, window.auth, window.database
   ========================================================= */

(function () {
    'use strict';

    var firebaseConfig = {
        apiKey: "AIzaSyDSgNxVrCXDGIrA-yZzAAYuWKtC13BmJLY",
        authDomain: "studio-9933447149-80d6a.firebaseapp.com",
        databaseURL: "https://studio-9933447149-80d6a-default-rtdb.firebaseio.com",
        projectId: "studio-9933447149-80d6a",
        storageBucket: "studio-9933447149-80d6a.firebasestorage.app",
        messagingSenderId: "121615915195",
        appId: "1:121615915195:web:f2eb26c4c23530ef8e719e",
        measurementId: "G-F02D7YK7S3"
    };

    window.firebaseConfig = firebaseConfig;

    if (typeof firebase === 'undefined') {
        console.warn('[firebase-init] Firebase SDK not loaded yet.');
        return;
    }

    try {
        if (!firebase.apps.length) {
            window.firebaseApp = firebase.initializeApp(firebaseConfig);
        } else {
            window.firebaseApp = firebase.app();
        }

        window.auth = firebase.auth();
        window.firebaseAuth = window.auth;

        if (firebase.database) {
            window.database = firebase.database();
        }
    } catch (e) {
        console.warn('[firebase-init] Firebase initialization warning:', e);
    }

    if (typeof VKIDSDK !== 'undefined') {
        try {
            VKIDSDK.Config.init({
                app: 54715318,
                redirectUrl: "https://studio-9933447149-80d6a.web.app",
                responseMode: VKIDSDK.Config.ResponseMode.Callback
            });
        } catch (e) {
            console.warn('[firebase-init] VKIDSDK init warning:', e);
        }
    }

    console.log('[firebase-init] Firebase initialized for project:', firebaseConfig.projectId);
}());