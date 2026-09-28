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
import { useTheme } from '../../theme';
import { useI18n } from '../../i18n';
import { GoogleLogoIcon } from '../../components/common';
import {
  loginWithEmail,
  resetPassword,
  signInWithGoogleCredential,
  signInWithGooglePopup,
  signInWithGithubCredential,
  signInWithGithubPopup,
} from '../../services/auth';
import { performGoogleSignIn } from '../../services/googleAuth';
import { cloudSyncService } from '../../services/cloudSync';

WebBrowser.maybeCompleteAuthSession();

interface LoginScreenProps {
  onNavigateToRegister: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onNavigateToRegister }) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'github' | null>(null);
  const [error, setError] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setError(t('authErrorEnterEmailPassword'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const cred = await loginWithEmail(cleanEmail, password);
      if (cred?.user?.uid) {
        await cloudSyncService.syncAll(cred.user.uid);
      }
    } catch (e: any) {
      const code = e?.code || '';
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/wrong-password' ||
        code === 'auth/invalid-credential'
      ) {
        setError(t('authErrorInvalidCredentials'));
      } else if (code === 'auth/invalid-email') {
        setError(t('authErrorInvalidEmail'));
      } else if (code === 'auth/user-disabled') {
        setError(t('authErrorUserDisabled'));
      } else if (code === 'auth/too-many-requests') {
        setError(t('authErrorTooManyRequests'));
      } else if (code === 'auth/network-request-failed') {
        setError(t('authErrorNetworkFailed'));
      } else {
        setError(t('authErrorGeneric') || t('authErrorLoginConnection'));
        console.warn('[LoginScreen] login error:', e);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setSocialLoading('google');
    try {
      const res = await performGoogleSignIn();
      if (res.isExpoGoNotice) {
        setError(t('authGoogleExpoGoNotice'));
      } else if (res.success && res.user?.uid) {
        await cloudSyncService.syncAll(res.user.uid);
      } else if (res.error && res.error !== 'cancelled' && res.error !== 'in_progress') {
        if (res.error === 'play_services_not_available') {
          setError(t('authErrorGooglePlayServices'));
        } else if (res.error === 'auth/popup-blocked') {
          setError(t('authErrorPopupBlocked'));
        } else if (res.error === 'auth/account-exists-with-different-credential') {
          setError(t('authErrorAccountExistsDiff'));
        } else {
          setError(t('authErrorGoogleFailed'));
        }
      }
    } catch (e: any) {
      console.warn('[LoginScreen] Google sign-in error:', e);
      setError(t('authErrorGoogleFailed'));
    } finally {
      setSocialLoading(null);
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
          setError(t('authErrorPopupBlocked'));
        } else if (e?.code === 'auth/account-exists-with-different-credential') {
          setError(t('authErrorAccountExistsDiff'));
        } else if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
          setError(t('authErrorGithubFailed'));
        }
      } finally {
        setSocialLoading(null);
      }
      return;
    }

    // On mobile native, GitHub OAuth code flow requires a backend secret exchange.
    // Gracefully inform mobile users to use Email or Google, or Web for GitHub.
    setSocialLoading(null);
    setError(t('authGithubMobileNotice'));
  };


  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setError(t('authErrorEnterEmailReset'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      await resetPassword(cleanEmail);
      setResetSent(true);
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/invalid-email') {
        setError(t('authErrorInvalidEmail'));
      } else if (code === 'auth/user-not-found') {
        setError(t('authErrorUserNotFound'));
      } else if (code === 'auth/network-request-failed') {
        setError(t('authErrorNetworkFailed'));
      } else if (code === 'auth/too-many-requests') {
        setError(t('authErrorTooManyRequests'));
      } else {
        setError(t('authErrorSendMailFailed'));
        console.warn('[LoginScreen] reset error:', e);
      }
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
          {t('authSubtitleSync')}
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
                  {t('signInWithGoogle')}
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
                  {t('signInWithGithub')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />
            <Text style={[styles.dividerText, { color: colors.textColorSecondary }]}>
              {t('authOrWithEmail')}
            </Text>
            <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />
          </View>

          {/* Email */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
            <Feather name="mail" size={18} color={colors.textColorSecondary} />
            <TextInput
              style={[styles.input, { color: colors.textColor }]}
              placeholder={t('authEmailLabel')}
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
              placeholder={t('genpassAddPwdPlaceholder')}
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
              {t('authPasswordSent')}
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
              <Text style={styles.primaryBtnText}>{t('authTabsSignIn')}</Text>
            )}
          </TouchableOpacity>

          {/* Reset password */}
          <TouchableOpacity onPress={handleResetPassword} disabled={loading} activeOpacity={0.7}>
            <Text style={[styles.linkText, { color: colors.primaryAccent }]}>
              {t('forgotPassword')}
            </Text>
          </TouchableOpacity>

          {/* Register */}
          <TouchableOpacity onPress={onNavigateToRegister} activeOpacity={0.7}>
            <Text style={[styles.linkText, { color: colors.primaryAccent }]}>
              {t('authNoAccountSignUp')}
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
