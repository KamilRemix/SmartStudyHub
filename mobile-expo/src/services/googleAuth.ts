import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { signInWithGoogleCredential, signInWithGooglePopup } from './auth';

export const isExpoGo =
  Constants?.executionEnvironment === ExecutionEnvironment.StoreClient ||
  (Constants as any)?.appOwnership === 'expo';

const WEB_CLIENT_ID = '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com';

let GoogleSigninModule: typeof import('@react-native-google-signin/google-signin') | null = null;
let isConfigured = false;

// Dynamically load GoogleSignin only on native platforms outside Expo Go
if (Platform.OS !== 'web' && !isExpoGo) {
  try {
    GoogleSigninModule = require('@react-native-google-signin/google-signin');
    if (GoogleSigninModule?.GoogleSignin) {
      GoogleSigninModule.GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        offlineAccess: false,
        scopes: ['profile', 'email'],
      });
      isConfigured = true;
    }
  } catch (e) {
    console.warn('[googleAuth] Native GoogleSignin module unavailable:', e);
  }
}

export interface GoogleSignInResult {
  success: boolean;
  user?: any;
  error?: string;
  isExpoGoNotice?: boolean;
}

/**
 * Performs Google One-Tap Sign-In via Google Play Services in native standalone APK,
 * or Firebase popup on Web.
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
  if (isExpoGo || !GoogleSigninModule?.GoogleSignin) {
    return {
      success: false,
      isExpoGoNotice: true,
      error: 'expo_go_native_required',
    };
  }

  // 3. Standalone Android / iOS APK (Native Google Play Services One-Tap)
  try {
    if (!isConfigured) {
      GoogleSigninModule.GoogleSignin.configure({
        webClientId: WEB_CLIENT_ID,
        offlineAccess: false,
        scopes: ['profile', 'email'],
      });
      isConfigured = true;
    }

    await GoogleSigninModule.GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const response = await GoogleSigninModule.GoogleSignin.signIn();
    // @react-native-google-signin v16 returns data structure:
    // response.data?.idToken (or response.idToken depending on version)
    const idToken = (response as any)?.data?.idToken || (response as any)?.idToken;

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
