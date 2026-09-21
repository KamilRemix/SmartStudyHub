import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { makeRedirectUri } from 'expo-auth-session';
import { useTheme } from '../../theme';
import { GoogleLogoIcon } from '../../components/common';
import {
  loginWithEmail,
  resetPassword,
  signInWithGoogleCredential,
  signInWithGooglePopup,
  signInWithGithubCredential,
  signInWithGithubPopup,
} from '../../services/auth';
import { cloudSyncService } from '../../services/cloudSync';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { colors } = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  // Google OAuth Configuration
  // Web: Uses Firebase signInWithGooglePopup() directly for seamless browser authentication.
  // Mobile / Standalone APK: Uses useIdTokenAuthRequest with redirect scheme 'smartstudyhub'.
  //
  // NOTE on Expo Go:
  // In Expo Go, Google blocks authorization with "Доступ заблокирован: ошибка авторизации"
  // (Error 400: redirect_uri_mismatch or disallowed_useragent) because Expo Go runs inside
  // package 'host.exp.exponent' and uses redirect schemes that Google blocks for Web Client IDs.
  // The registered SHA-1 fingerprint belongs to package 'com.smartstudyhub.mobile' for the standalone APK.
  // Standalone builds (APK via EAS Build / expo run:android) properly match package name and SHA-1.
  const [googleRequest, googleResponse, promptGoogleAsync] = Google.useIdTokenAuthRequest({
    clientId: '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com',
    webClientId: '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com',
    androidClientId: '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com',
    iosClientId: '121615915195-kddc512lnra4b2eo2qjnnbuc0sb0pcbh.apps.googleusercontent.com',
    scopes: ['profile', 'email'],
    redirectUri: makeRedirectUri({ scheme: 'smartstudyhub' }),
  });

  useEffect(() => {
    if (googleResponse?.type === 'success') {
      const { id_token } = googleResponse.params;
      if (id_token) {
        setSocialLoading('google');
        signInWithGoogleCredential(id_token)
          .then(async (cred) => {
            if (cred?.user?.uid) {
              await cloudSyncService.syncAll(cred.user.uid);
            }
          })
          .catch((err) => {
            console.warn('[LoginScreen] Firebase Google auth error:', err);
            setError('Ошибка авторизации через Google. Попробуйте снова');
          })
          .finally(() => {
            setSocialLoading(null);
          });
      }
    } else if (googleResponse?.type === 'error') {
      setSocialLoading(null);
      setError('Ошибка входа через Google');
    } else if (googleResponse?.type === 'cancel' || googleResponse?.type === 'dismiss') {
      setSocialLoading(null);
    }
  }, [googleResponse]);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Введите email и пароль');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const cred = await loginWithEmail(email.trim(), password);
      if (cred?.user?.uid) {
        await cloudSyncService.syncAll(cred.user.uid);
      }
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Неверный email или пароль');
      } else if (code === 'auth/too-many-requests') {
        setError('Слишком много попыток. Попробуйте позже');
      } else {
        setError('Ошибка входа. Проверьте подключение');
        console.warn('[LoginScreen] login error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSocialLoading('google');
    if (Platform.OS === 'web') {
      try {
        const cred = await signInWithGooglePopup();
        if (cred?.user?.uid) {
          await cloudSyncService.syncAll(cred.user.uid);
        }
      } catch (e: any) {
        console.warn('[LoginScreen] Google popup error:', e);
        if (e?.code === 'auth/popup-blocked') {
          setError('Всплывающее окно заблокировано браузером. Разрешите всплывающие окна');
        } else if (e?.code === 'auth/account-exists-with-different-credential') {
          setError('Аккаунт с таким email уже существует через другой способ входа');
        } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
          setError('Ошибка входа через Google. Попробуйте снова');
        }
      } finally {
        setSocialLoading(null);
      }
      return;
    }

    try {
      const res = await promptGoogleAsync({
        showInRecents: false,
      });
      if (res?.type !== 'success') {
        setSocialLoading(null);
      }
    } catch (e: any) {
      setSocialLoading(null);
      console.warn('[LoginScreen] Google sign-in prompt error:', e);
      setError('Не удалось открыть окно входа Google. Проверьте подключение');
    }
  };

  const handleGithubSignIn = async () => {
    setError('');
    setSocialLoading('github');
    if (Platform.OS === 'web') {
      try {
        const cred = await signInWithGithubPopup();
        if (cred?.user?.uid) {
          await cloudSyncService.syncAll(cred.user.uid);
        }
      } catch (e: any) {
        console.warn('[LoginScreen] GitHub popup error:', e);
        if (e?.code === 'auth/popup-blocked') {
          setError('Всплывающее окно заблокировано браузером. Разрешите всплывающие окна');
        } else if (e?.code === 'auth/account-exists-with-different-credential') {
          setError('Аккаунт с таким email уже существует через другой способ входа');
        } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
          setError('Ошибка входа через GitHub. Попробуйте снова');
        }
      } finally {
        setSocialLoading(null);
      }
      return;
    }

    try {
      const redirectUri = makeRedirectUri({ scheme: 'smartstudyhub' });
      const clientId = 'Ov23liIcmvQvSH0hOLwR'; // GitHub OAuth App Client ID

      const authUrl =
        `https://github.com/login/oauth/authorize?client_id=${clientId}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&scope=read:user%20user:email`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri, {
        showInRecents: false,
      });

      if (result.type === 'success' && result.url) {
        const parsedUrl = new URL(result.url);
        const errorParam = parsedUrl.searchParams.get('error');
        if (errorParam) {
          if (errorParam !== 'access_denied') {
            setError('Ошибка авторизации через GitHub');
          }
          return;
        }

        const accessToken = parsedUrl.searchParams.get('access_token');
        if (accessToken) {
          const cred = await signInWithGithubCredential(accessToken);
          if (cred?.user?.uid) {
            await cloudSyncService.syncAll(cred.user.uid);
          }
          return;
        }

        const authCode = parsedUrl.searchParams.get('code');
        if (authCode) {
          console.log('[LoginScreen] GitHub auth code received');
        }
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        // Closed by user
      }
    } catch (e: any) {
      console.warn('[LoginScreen] GitHub sign-in error:', e);
      setError('Не удалось завершить вход через GitHub. Проверьте подключение');
    } finally {
      setSocialLoading(null);
    }
  };


  const handleResetPassword = async () => {
    if (!email.trim()) {
      setError('Введите email для сброса пароля');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (e: any) {
      setError('Не удалось отправить письмо');
      console.warn('[LoginScreen] reset error:', e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoRow}>
          <Feather name="book-open" size={40} color={colors.primaryAccent} />
          <Text style={[styles.appName, { color: colors.textColor }]}>SmartStudyHub</Text>
        </View>
        <Text style={[styles.subtitle, { color: colors.textColorSecondary }]}>
          Войдите, чтобы синхронизировать данные
        </Text>

        <View style={styles.form}>
          {/* Social sign-in buttons */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn]}
            onPress={handleGoogleSignIn}
            disabled={socialLoading !== null}
            activeOpacity={0.8}
          >
            {socialLoading === 'google' ? (
              <ActivityIndicator color="#3c4043" />
            ) : (
              <>
                <View style={styles.socialIconWrap}>
                  <GoogleLogoIcon size={20} />
                </View>
                <Text style={[styles.socialBtnText, { color: '#3c4043' }]}>
                  Войти через Google
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialBtn, styles.githubBtn]}
            onPress={handleGithubSignIn}
            disabled={socialLoading !== null}
            activeOpacity={0.8}
          >
            {socialLoading === 'github' ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <View style={styles.socialIconWrap}>
                  <Feather name="github" size={18} color="#ffffff" />
                </View>
                <Text style={[styles.socialBtnText, { color: '#ffffff' }]}>
                  Войти через GitHub
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />
            <Text style={[styles.dividerText, { color: colors.textColorSecondary }]}>
              или через Email
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />
          </View>

          {/* Email */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
            <Feather name="mail" size={18} color={colors.textColorSecondary} />
            <TextInput
              style={[styles.input, { color: colors.textColor }]}
              placeholder="Email"
              placeholderTextColor={colors.textColorSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
            <Feather name="lock" size={18} color={colors.textColorSecondary} />
            <TextInput
              style={[styles.input, { color: colors.textColor }]}
              placeholder="Пароль"
              placeholderTextColor={colors.textColorSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!passwordVisible}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)}>
              <Feather name={passwordVisible ? 'eye-off' : 'eye'} size={18} color={colors.textColorSecondary} />
            </TouchableOpacity>
          </View>

          {/* Error / Success */}
          {error.length > 0 && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}
          {resetSent && (
            <Text style={[styles.successText, { color: colors.success }]}>
              Письмо для сброса пароля отправлено
            </Text>
          )}

          {/* Login button */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primaryAccent }]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Войти</Text>
            )}
          </TouchableOpacity>

          {/* Reset password */}
          <TouchableOpacity onPress={handleResetPassword} disabled={loading} activeOpacity={0.7}>
            <Text style={[styles.linkText, { color: colors.primaryAccent }]}>
              Забыли пароль?
            </Text>
          </TouchableOpacity>

          {/* Register */}
          <TouchableOpacity onPress={onNavigateToRegister} activeOpacity={0.7}>
            <Text style={[styles.linkText, { color: colors.primaryAccent }]}>
              Нет аккаунта? Зарегистрироваться
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'center', marginBottom: 8 },
  appName: { fontFamily: 'Poppins_600SemiBold', fontSize: 24 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, textAlign: 'center', marginBottom: 28 },
  form: { gap: 12 },
  // Social buttons
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    gap: 10,
  },
  googleBtn: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#dadce0',
  },
  githubBtn: {
    backgroundColor: '#24292e',
  },
  socialIconWrap: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  // Inputs
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  input: { flex: 1, fontFamily: 'Inter_400Regular', fontSize: 15, paddingVertical: 0 },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  successText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#ffffff' },
  linkText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 4 },
  divider: { flex: 1, height: 1 },
  dividerText: { fontFamily: 'Inter_400Regular', fontSize: 12 },
});
