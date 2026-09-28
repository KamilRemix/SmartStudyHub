import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile,
  signInWithCredential,
  signInAnonymously,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  User,
  UserCredential,
} from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ref, set, get, update, onValue, off, DatabaseReference } from 'firebase/database';
import { auth, database } from './firebase';

export type { User };

const OFFLINE_USER_KEY = '@ssh_offline_user';

export interface LocalOfflineUser {
  uid: string;
  displayName: string;
  email: string;
  isAnonymous: boolean;
  emailVerified: boolean;
  isOfflineDemo: boolean;
}

export const OFFLINE_DEMO_USER: LocalOfflineUser = {
  uid: 'offline_guest_user',
  displayName: 'Гость (Офлайн)',
  email: 'guest@smartstudyhub.local',
  isAnonymous: true,
  emailVerified: false,
  isOfflineDemo: true,
};

export const getOfflineUser = async (): Promise<LocalOfflineUser | null> => {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const clearOfflineUser = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(OFFLINE_USER_KEY);
  } catch (e) {
    console.warn('[auth] clearOfflineUser error:', e);
  }
};

// ===== Email Auth =====

export const registerWithEmail = (
  email: string,
  password: string
): Promise<UserCredential> => {
  return createUserWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
};

export const loginWithEmail = (
  email: string,
  password: string
): Promise<UserCredential> => {
  return signInWithEmailAndPassword(auth, email.trim().toLowerCase(), password);
};

export const USER_DATA_STORAGE_KEYS = [
  '@smartstudy_grades_data',
  '@ssh_grades_data',
  '@smartstudy_notes_data',
  '@ssh_notes',
  '@ssh_password_vault',
  '@smartstudy_calc_history',
  '@ssh_calc_history',
  '@ssh_user_settings',
  '@ssh_last_sync_timestamp',
  OFFLINE_USER_KEY,
];

export const clearAllLocalUserData = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove(USER_DATA_STORAGE_KEYS);
  } catch (e) {
    console.warn('[auth] clearAllLocalUserData error:', e);
  }
};

export const logout = async (): Promise<void> => {
  await clearAllLocalUserData();
  try {
    const { googleSignOutNative } = await import('./googleAuth');
    await googleSignOutNative();
  } catch (e) {
    console.warn('[auth] googleSignOutNative error:', e);
  }
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('[auth] signOut error:', e);
  }
};

export const resetPassword = (email: string): Promise<void> => {
  return sendPasswordResetEmail(auth, email.trim().toLowerCase());
};

export const updateUserProfile = (
  displayName: string
): Promise<void> => {
  const user = auth.currentUser;
  if (!user) return Promise.reject(new Error('Not authenticated'));
  return updateProfile(user, { displayName });
};

export const subscribeToAuthChanges = (
  callback: (user: any | null) => void
): (() => void) => {
  let isMounted = true;
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      await clearOfflineUser();
      if (isMounted) callback(firebaseUser);
    } else {
      const offlineUser = await getOfflineUser();
      if (isMounted) callback(offlineUser);
    }
  });

  if (!auth.currentUser) {
    getOfflineUser().then((offlineUser) => {
      if (isMounted && !auth.currentUser && offlineUser) {
        callback(offlineUser);
      }
    });
  }

  return () => {
    isMounted = false;
    unsubscribe();
  };
};

// ===== Guest / Demo Auth (Online Anonymous or Offline Fallback) =====

export const loginAsGuest = async (): Promise<UserCredential | { user: LocalOfflineUser }> => {
  try {
    const cred = await signInAnonymously(auth);
    await clearOfflineUser();
    return cred;
  } catch (err) {
    console.warn('[auth] signInAnonymously failed, falling back to local offline demo session:', err);
    await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(OFFLINE_DEMO_USER));
    return { user: OFFLINE_DEMO_USER };
  }
};

export const loginOfflineDemo = async (): Promise<{ user: LocalOfflineUser }> => {
  await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify(OFFLINE_DEMO_USER));
  return { user: OFFLINE_DEMO_USER };
};

// ===== Google Sign-In (credential-based for Expo & popup for Web) =====

export const signInWithGoogleCredential = async (idToken: string): Promise<UserCredential> => {
  await clearOfflineUser();
  const credential = GoogleAuthProvider.credential(idToken);
  return signInWithCredential(auth, credential);
};

export const signInWithGooglePopup = async (): Promise<UserCredential> => {
  await clearOfflineUser();
  const provider = new GoogleAuthProvider();
  provider.addScope('profile');
  provider.addScope('email');
  provider.setCustomParameters({ prompt: 'select_account' });
  return signInWithPopup(auth, provider);
};

// ===== GitHub Sign-In (credential-based for Expo & popup for Web) =====

export const signInWithGithubCredential = async (accessToken: string): Promise<UserCredential> => {
  await clearOfflineUser();
  const credential = GithubAuthProvider.credential(accessToken);
  return signInWithCredential(auth, credential);
};

export const signInWithGithubPopup = async (): Promise<UserCredential> => {
  await clearOfflineUser();
  const provider = new GithubAuthProvider();
  provider.addScope('read:user');
  provider.addScope('user:email');
  return signInWithPopup(auth, provider);
};

// ===== Firebase Realtime Database =====

export const getUserRef = (uid: string): DatabaseReference => {
  return ref(database, `users/${uid}`);
};

export const saveUserData = async (uid: string, path: string, data: any): Promise<void> => {
  const dataRef = ref(database, `users/${uid}/${path}`);
  await set(dataRef, data);
};

export const getUserData = async (uid: string, path: string): Promise<any> => {
  const dataRef = ref(database, `users/${uid}/${path}`);
  const snapshot = await get(dataRef);
  return snapshot.exists() ? snapshot.val() : null;
};

export const updateUserData = async (uid: string, path: string, data: Record<string, any>): Promise<void> => {
  const dataRef = ref(database, `users/${uid}/${path}`);
  await update(dataRef, data);
};

export const subscribeToUserData = (
  uid: string,
  path: string,
  callback: (data: any) => void
): (() => void) => {
  const dataRef = ref(database, `users/${uid}/${path}`);
  onValue(dataRef, (snapshot) => {
    callback(snapshot.exists() ? snapshot.val() : null);
  });
  return () => off(dataRef);
};

// ===== Sync helpers (grades, notes, settings) =====

export const syncGradesToCloud = async (uid: string, grades: any): Promise<void> => {
  await saveUserData(uid, 'grades', {
    data: grades,
    updatedAt: Date.now(),
  });
};

export const syncNotesToCloud = async (uid: string, notes: any): Promise<void> => {
  await saveUserData(uid, 'notes', {
    data: notes,
    updatedAt: Date.now(),
  });
};

export const syncSettingsToCloud = async (uid: string, settings: any): Promise<void> => {
  await saveUserData(uid, 'settings', {
    data: settings,
    updatedAt: Date.now(),
  });
};

export const getCloudGrades = async (uid: string): Promise<any> => {
  return getUserData(uid, 'grades');
};

export const getCloudNotes = async (uid: string): Promise<any> => {
  return getUserData(uid, 'notes');
};

export const getCloudSettings = async (uid: string): Promise<any> => {
  return getUserData(uid, 'settings');
};
