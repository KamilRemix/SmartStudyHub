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

        // Ensure robust local session persistence across reloads
        if (typeof window.auth.setPersistence === 'function' && firebase.auth.Auth && firebase.auth.Auth.Persistence) {
            window.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(function (err) {
                console.warn('[firebase-init] Persistence setting warning:', err);
            });
        }

        if (firebase.database) {
            window.database = firebase.database();
        }
    } catch (e) {
        console.warn('[firebase-init] Firebase initialization warning:', e);
    }

    // Modular v10+ function compatibility signatures
    window.createUserWithEmailAndPassword = function (authInstance, email, password) {
        var a = authInstance || window.auth || (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);
        if (!a || typeof a.createUserWithEmailAndPassword !== 'function') {
            return Promise.reject(new Error('Firebase Auth is not ready.'));
        }
        return a.createUserWithEmailAndPassword(email, password);
    };

    window.signInWithEmailAndPassword = function (authInstance, email, password) {
        var a = authInstance || window.auth || (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);
        if (!a || typeof a.signInWithEmailAndPassword !== 'function') {
            return Promise.reject(new Error('Firebase Auth is not ready.'));
        }
        return a.signInWithEmailAndPassword(email, password);
    };

    window.sendPasswordResetEmail = function (authInstance, email) {
        var a = authInstance || window.auth || (typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null);
        if (!a || typeof a.sendPasswordResetEmail !== 'function') {
            return Promise.reject(new Error('Firebase Auth is not ready.'));
        }
        return a.sendPasswordResetEmail(email);
    };

    console.log('[firebase-init] Firebase initialized for project:', firebaseConfig.projectId);
}());