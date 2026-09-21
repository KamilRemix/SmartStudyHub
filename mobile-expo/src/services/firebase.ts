import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
  // @ts-ignore React Native persistence is exported in RN build of firebase/auth
  getReactNativePersistence,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyDSgNxVrCXDGIrA-yZzAAYuWKtC13BmJLY',
  authDomain: 'studio-9933447149-80d6a.firebaseapp.com',
  databaseURL: 'https://studio-9933447149-80d6a-default-rtdb.firebaseio.com',
  projectId: 'studio-9933447149-80d6a',
  storageBucket: 'studio-9933447149-80d6a.firebasestorage.app',
  messagingSenderId: '121615915195',
  appId: '1:121615915195:web:f2eb26c4c23530ef8e719e',
  measurementId: 'G-F02D7YK7S3',
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

import { Platform } from 'react-native';

let authInstance: Auth;
if (Platform.OS === 'web') {
  authInstance = getAuth(app);
} else {
  try {
    authInstance = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    authInstance = getAuth(app);
  }
}

export const firebaseApp: FirebaseApp = app;
export const auth: Auth = authInstance;
export const firestore: Firestore = getFirestore(app);
export const database: Database = getDatabase(app);

