import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { signInWithGoogleCredential, signInWithGooglePopup } from './auth';

export const isExpoGo =
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any)?.appOwnership === 'expo';

const WEB_CLIENT_ID = '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com';

let GoogleSigninModule: typeof import('@react-native-google-signin/google-signin') | null = null;
let isConfigured = false;
let configurePromise: Promise<boolean> | null = null;

/**
 * Lazily and reliably initializes GoogleSignin native module.
 * Ensures configure() is executed and awaited when the native host activity is ready.
 */
export async function ensureConfigured(): Promise<boolean> {
  if (Platform.OS === 'web' || isExpoGo) return false;

  if (!GoogleSigninModule) {
    try {
      GoogleSigninModule = require('@react-native-google-signin/google-signin');
    } catch (e) {
      console.warn('[googleAuth] Native GoogleSignin module unavailable:', e);
      return false;
    }
  }

  if (!GoogleSigninModule?.GoogleSignin) {
    return false;
  }

  if (isConfigured) {
    return true;
  }

  if (!configurePromise) {
    configurePromise = (async () => {
      try {
        GoogleSigninModule!.GoogleSignin.configure({
          webClientId: WEB_CLIENT_ID,
          offlineAccess: false,
          scopes: ['profile', 'email'],
        });
        isConfigured = true;
        return true;
      } catch (e) {
        console.warn('[googleAuth] Native GoogleSignin configure error:', e);
        configurePromise = null;
        return false;
      }
    })();
  }

  return configurePromise;
}

// Background pre-initialization on native platforms so client is warm
if (Platform.OS !== 'web' && !isExpoGo) {
  ensureConfigured().catch((e) => {
    console.warn('[googleAuth] Initial background configuration deferred:', e);
  });
}

export interface GoogleSignInResult {
  success: boolean;
  user?: any;
  error?: string;
  isExpoGoNotice?: boolean;
}

/**
 * Performs Google One-Tap Sign-In via Google Play Services in native standalone APK,
 * or Firebase popup on Web. Includes automatic retry for transient first-attempt failures.
 */
export async function performGoogleSignIn(): Promise<GoogleSignInResult> {
  // 1. Web environment
  if (Platform.OS === 'web') {
    try {
      const cred = await signInWithGooglePopup();
      return { success: true, user: cred.user };
    } catch (e: any) {
      console.warn('[googleAuth] Web Google sign-in failed:', e);
      return { success: false, error: e?.code || e?.message || 'Web Google sign-in failed' };
    }
  }

  // 2. Expo Go notice (native Google Play Services SDK is not bundled in Expo Go)
  if (isExpoGo) {
    return {
      success: false,
      isExpoGoNotice: true,
      error: 'expo_go_native_required',
    };
  }

  // 3. Standalone Android / iOS APK (Native Google Play Services One-Tap)
  try {
    const ready = await ensureConfigured();
    if (!ready || !GoogleSigninModule?.GoogleSignin) {
      return {
        success: false,
        isExpoGoNotice: true,
        error: 'expo_go_native_required',
      };
    }

    await GoogleSigninModule.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    let response: any = null;
    try {
      response = await GoogleSigninModule.GoogleSignin.signIn();
    } catch (firstErr: any) {
      const statusCodes = GoogleSigninModule?.statusCodes;
      // If user explicitly cancelled, do not retry
      if (statusCodes && firstErr?.code === statusCodes.SIGN_IN_CANCELLED) {
        return { success: false, error: 'cancelled' };
      }
      if (statusCodes && firstErr?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return { success: false, error: 'play_services_not_available' };
      }

      console.warn(
        `[googleAuth] First attempt encountered transient state (${firstErr?.code || firstErr?.message}), resetting session and retrying automatically...`
      );

      // Reset stale or stuck session state
      try {
        await GoogleSigninModule.GoogleSignin.signOut();
      } catch (signOutErr) {
        console.warn('[googleAuth] Pre-retry signOut error:', signOutErr);
      }

      // Re-verify Play Services and retry signIn once
      await GoogleSigninModule.GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });

      response = await GoogleSigninModule.GoogleSignin.signIn();
    }

    // Check for cancelled response (e.g. in v16 response structure)
    if (response?.type === 'cancelled') {
      return { success: false, error: 'cancelled' };
    }

    // @react-native-google-signin v16 returns data structure:
    // response.data?.idToken (or response.idToken depending on version)
    const idToken = response?.data?.idToken || response?.idToken;

    if (!idToken) {
      return { success: false, error: 'No ID token received from Google Play Services' };
    }

    const cred = await signInWithGoogleCredential(idToken);
    return { success: true, user: cred.user };
  } catch (err: any) {
    const statusCodes = GoogleSigninModule?.statusCodes;
    if (statusCodes && err?.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'cancelled' };
    }
    if (statusCodes && err?.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'in_progress' };
    }
    if (statusCodes && err?.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'play_services_not_available' };
    }
    console.warn('[googleAuth] Native Google Sign-In error:', err);
    return { success: false, error: err?.message || 'Google sign-in failed' };
  }
}

/**
 * Signs out from Google Play Services on native Android/iOS
 * so that next login prompts the account chooser instead of auto-logging into previous account.
 */
export async function googleSignOutNative(): Promise<void> {
  if (Platform.OS !== 'web' && !isExpoGo) {
    try {
      const ready = await ensureConfigured();
      if (ready && GoogleSigninModule?.GoogleSignin) {
        await GoogleSigninModule.GoogleSignin.signOut();
        console.log('[googleAuth] Successfully signed out of native Google Play Services');
      }
    } catch (e) {
      console.warn('[googleAuth] Native Google SignOut error:', e);
    }
  }
}

