import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { PressableScale } from '../../../components/common/PressableScale';
import { GoogleLogoIcon } from '../../../components/common/GoogleLogoIcon';

interface AIAuthGateProps {
  onOpenAuth: (mode?: 'login' | 'register') => void;
  onGoogleSignIn?: () => void;
  isGoogleLoading?: boolean;
}

export const AIAuthGate: React.FC<AIAuthGateProps> = ({
  onOpenAuth,
  onGoogleSignIn,
  isGoogleLoading = false,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Icon Shield Badge */}
      <View
        style={[
          styles.iconBadge,
          {
            backgroundColor: colors.primaryAccent + '15',
            borderColor: colors.primaryAccent + '30',
          },
        ]}
      >
        <Feather name="shield" size={38} color={colors.primaryAccent} />
      </View>

      {/* Status Pill */}
      <View
        style={[
          styles.statusPill,
          {
            backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : 'rgba(239, 68, 68, 0.10)',
            borderColor: isDark ? 'rgba(239, 68, 68, 0.35)' : 'rgba(239, 68, 68, 0.25)',
          },
        ]}
      >
        <Feather name="lock" size={12} color={colors.error || '#ef4444'} />
        <Text style={[styles.statusPillText, { color: colors.error || '#ef4444' }]}>
          Вход не выполнен
        </Text>
      </View>

      {/* Main Title & Subtitle */}
      <Text style={[styles.title, { color: colors.textColor }]}>
        Вход в аккаунт обязателен
      </Text>
      <Text style={[styles.subtitle, { color: colors.textColorSecondary }]}>
        Нейросеть SmartStudy AI доступна только для пользователей с учетной записью Google или Email.
      </Text>

      {/* Feature cards list */}
      <View
        style={[
          styles.featuresCard,
          {
            backgroundColor: colors.componentBackground,
            borderColor: colors.borderColor,
          },
        ]}
      >
        <View style={styles.featureRow}>
          <View
            style={[
              styles.featureIconWrap,
              { backgroundColor: colors.primaryAccent + '14' },
            ]}
          >
            <Feather name="cloud" size={17} color={colors.primaryAccent} />
          </View>
          <View style={styles.featureTextWrap}>
            <Text style={[styles.featureTitle, { color: colors.textColor }]}>
              Облачная синхронизация
            </Text>
            <Text style={[styles.featureDesc, { color: colors.textColorSecondary }]}>
              История диалогов, решенные задачи и конспекты сохраняются на всех ваших устройствах.
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />

        <View style={styles.featureRow}>
          <View
            style={[
              styles.featureIconWrap,
              { backgroundColor: colors.primaryAccent + '14' },
            ]}
          >
            <Feather name="cpu" size={17} color={colors.primaryAccent} />
          </View>
          <View style={styles.featureTextWrap}>
            <Text style={[styles.featureTitle, { color: colors.textColor }]}>
              Персональный ИИ-ассистент
            </Text>
            <Text style={[styles.featureDesc, { color: colors.textColorSecondary }]}>
              Адаптация под школьную программу, ВУЗ или подготовку к экзаменам ОГЭ/ЕГЭ.
            </Text>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.borderColor }]} />

        <View style={styles.featureRow}>
          <View
            style={[
              styles.featureIconWrap,
              { backgroundColor: colors.primaryAccent + '14' },
            ]}
          >
            <Feather name="mail" size={17} color={colors.primaryAccent} />
          </View>
          <View style={styles.featureTextWrap}>
            <Text style={[styles.featureTitle, { color: colors.textColor }]}>
              Обычная почта или Google
            </Text>
            <Text style={[styles.featureDesc, { color: colors.textColorSecondary }]}>
              Вход без спама и рекламы. Почта используется только для авторизации и восстановления доступа.
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {/* Google sign in button if handler provided */}
        {onGoogleSignIn && (
          <PressableScale
            style={[
              styles.btn,
              styles.googleBtn,
              {
                backgroundColor: isDark ? '#ffffff' : '#ffffff',
                borderColor: '#dadce0',
              },
            ]}
            onPress={onGoogleSignIn}
            disabled={isGoogleLoading}
            accessibilityLabel="Войти через Google"
          >
            <View style={styles.googleIconBox}>
              <GoogleLogoIcon size={18} />
            </View>
            <Text style={styles.googleBtnText}>Войти через Google</Text>
          </PressableScale>
        )}

        {/* Email sign in button */}
        <PressableScale
          style={[
            styles.btn,
            styles.emailBtn,
            { backgroundColor: colors.primaryAccent },
          ]}
          onPress={() => onOpenAuth('login')}
          accessibilityLabel="Войти по Email или паролю"
        >
          <Feather name="mail" size={18} color="#ffffff" style={styles.btnIcon} />
          <Text style={styles.emailBtnText}>Войти по Email / Паролю</Text>
        </PressableScale>

        {/* Register button */}
        <PressableScale
          style={[
            styles.btn,
            styles.registerBtn,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
          onPress={() => onOpenAuth('register')}
          accessibilityLabel="Создать новый аккаунт"
        >
          <Feather name="user-plus" size={16} color={colors.textColor} style={styles.btnIcon} />
          <Text style={[styles.registerBtnText, { color: colors.textColor }]}>
            Создать новый аккаунт
          </Text>
        </PressableScale>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 22,
    paddingTop: 36,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.2,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    fontFamily: 'Inter_400Regular',
    marginBottom: 26,
    paddingHorizontal: 10,
  },
  featuresCard: {
    width: '100%',
    borderRadius: 18,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  featureIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 17,
    fontFamily: 'Inter_400Regular',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  actionsContainer: {
    width: '100%',
    gap: 10,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  btnIcon: {
    marginRight: 8,
  },
  googleBtn: {
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIconBox: {
    marginRight: 10,
  },
  googleBtnText: {
    color: '#3c4043',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  emailBtn: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  emailBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
  registerBtn: {
    borderWidth: 1,
  },
  registerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter_600SemiBold',
  },
});
