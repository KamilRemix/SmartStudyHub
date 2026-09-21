import React, { useState } from 'react';
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
import { useTheme } from '../../theme';
import { registerWithEmail, updateUserProfile } from '../../services/auth';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({ onNavigateToLogin }) => {
  const { colors } = useTheme();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Заполните все поля');
      return;
    }
    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await registerWithEmail(email.trim(), password);
      await updateUserProfile(name.trim());
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('Этот email уже зарегистрирован');
      } else if (code === 'auth/invalid-email') {
        setError('Неверный формат email');
      } else if (code === 'auth/weak-password') {
        setError('Пароль слишком простой');
      } else {
        setError('Ошибка регистрации. Проверьте подключение');
        console.warn('[RegisterScreen] register error:', e);
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
          <Feather name="user-plus" size={36} color={colors.primaryAccent} />
        </View>
        <Text style={[styles.title, { color: colors.textColor }]}>Создать аккаунт</Text>
        <Text style={[styles.subtitle, { color: colors.textColorSecondary }]}>
          Для синхронизации данных между устройствами
        </Text>

        <View style={styles.form}>
          {/* Name */}
          <View style={[styles.inputWrapper, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
            <Feather name="user" size={18} color={colors.textColorSecondary} />
            <TextInput
              style={[styles.input, { color: colors.textColor }]}
              placeholder="Имя"
              placeholderTextColor={colors.textColorSecondary}
              value={name}
              onChangeText={setName}
              autoCorrect={false}
            />
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
              placeholder="Пароль (минимум 6 символов)"
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

          {error.length > 0 && (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          )}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primaryAccent }]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryBtnText}>Зарегистрироваться</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onNavigateToLogin} activeOpacity={0.7}>
            <Text style={[styles.linkText, { color: colors.primaryAccent }]}>
              Уже есть аккаунт? Войти
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
  logoRow: { alignItems: 'center', marginBottom: 12 },
  title: { fontFamily: 'Poppins_600SemiBold', fontSize: 22, textAlign: 'center' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center', marginBottom: 28, marginTop: 4 },
  form: { gap: 14 },
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
  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { fontFamily: 'Poppins_600SemiBold', fontSize: 15, color: '#ffffff' },
  linkText: { fontFamily: 'Inter_400Regular', fontSize: 13, textAlign: 'center' },
});
