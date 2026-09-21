import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppHeader } from '../../components/common/AppHeader';
import { useAuth } from '../../context/AuthContext';
import { logout } from '../../services/auth';
import { AuthNavigator } from '../auth/AuthNavigator';
import { useI18n, SupportedLanguage } from '../../i18n';

// ─── Connectivity Hook ─────────────────────────────────────────────────────────
function useIsOnline(): { isOnline: boolean; checking: boolean; recheck: () => void } {
  const [isOnline, setIsOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);
    try {
      const ctrl = new AbortController();
      const id = setTimeout(() => ctrl.abort(), 4000);
      await fetch('https://www.google.com/generate_204', { method: 'HEAD', signal: ctrl.signal });
      clearTimeout(id);
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return { isOnline, checking, recheck: check };
}

// ─── NetworkStatusCard ─────────────────────────────────────────────────────────
const NetworkStatusCard: React.FC<{ colors: any; t: (key: string) => string }> = ({ colors, t }) => {
  const { isOnline, checking, recheck } = useIsOnline();
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (checking) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 0.5, duration: 600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
  }, [checking, pulseAnim]);

  const dotColor = checking ? colors.warning : isOnline ? colors.success : colors.error;
  const iconName: 'wifi' | 'wifi-off' = isOnline ? 'wifi' : 'wifi-off';
  const statusTitle = checking
    ? (t('networkChecking') || 'Checking connection...')
    : isOnline
    ? (t('networkOnline') || 'Connected to Internet')
    : (t('networkOffline') || 'No Internet connection');
  const statusSub = isOnline
    ? (t('networkOnlineDesc') || 'All features available')
    : (t('networkOfflineDesc') || 'Cloud sync, online translation and currency rates require internet');

  const featuresNeedingNet = [
    t('networkFeatureSync') || 'Cloud data sync',
    t('networkFeatureTranslate') || 'Online translation',
    t('networkFeatureCurrency') || 'Currency rates',
    t('networkFeatureAuth') || 'Social sign-in',
  ];

  return (
    <>
      <View style={networkStyles.sectionHeader}>
        <Text style={[networkStyles.sectionTitle, { color: colors.textColorSecondary }]}>
          {t('networkSection') || 'Connection'}
        </Text>
      </View>

      <View style={[networkStyles.card, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
        {/* Status Row */}
        <View style={[networkStyles.row, networkStyles.borderBottom, { borderBottomColor: colors.borderColor }]}>
          <View style={networkStyles.rowLeft}>
            <View style={[networkStyles.iconWrap, { backgroundColor: dotColor + '18' }]}>
              <Feather name={iconName} size={20} color={dotColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[networkStyles.itemTitle, { color: colors.textColor }]}>{statusTitle}</Text>
              <Text style={[networkStyles.itemSubtitle, { color: colors.textColorSecondary }]} numberOfLines={2}>
                {statusSub}
              </Text>
            </View>
          </View>

          {/* Animated status dot + recheck */}
          <TouchableOpacity onPress={recheck} activeOpacity={0.7} style={networkStyles.dotWrap}>
            <Animated.View style={[networkStyles.dot, { backgroundColor: dotColor, opacity: pulseAnim }]} />
          </TouchableOpacity>
        </View>

        {/* Internet-required features */}
        {!isOnline && (
          <View style={networkStyles.featuresRow}>
            <Text style={[networkStyles.featuresLabel, { color: colors.textColorSecondary }]}>
              {t('networkRequiresInternet') || 'Requires internet:'}
            </Text>
            {featuresNeedingNet.map((feat, i) => (
              <View key={i} style={networkStyles.featItem}>
                <Feather name="alert-circle" size={13} color={colors.warning} />
                <Text style={[networkStyles.featText, { color: colors.textColorSecondary }]}>{feat}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </>
  );
};

const networkStyles = StyleSheet.create({
  sectionHeader: { paddingHorizontal: 4, paddingTop: 20, paddingBottom: 6 },
  sectionTitle: { fontSize: 12, fontFamily: 'Inter_600SemiBold', letterSpacing: 0.8, textTransform: 'uppercase' },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  borderBottom: { borderBottomWidth: StyleSheet.hairlineWidth },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  itemTitle: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  itemSubtitle: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2, lineHeight: 16 },
  dotWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  featuresRow: { paddingHorizontal: 16, paddingBottom: 14 },
  featuresLabel: { fontSize: 11, fontFamily: 'Inter_500Medium', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  featItem: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  featText: { fontSize: 13, fontFamily: 'Inter_400Regular' },
});



export const SettingsScreen: React.FC = () => {
  const { colors, theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading } = useAuth();
  const { language, setLanguage, t, supportedLanguages } = useI18n();
  const [showAuth, setShowAuth] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleSelectLanguage = async (code: string) => {
    await setLanguage(code as SupportedLanguage);
    setLangModalVisible(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch (e) {
      console.warn('[Settings] logout error:', e);
    } finally {
      setLoggingOut(false);
    }
  };

  const currentLangLabel =
    supportedLanguages.find((l) => l.code === language)?.nativeName || 'Русский (RU)';

  if (showAuth && !isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <AppHeader
          title={t('accountTitle')}
          subtitle={t('authSubtitle')}
          leftAction={{ icon: 'arrow-left', accessibilityLabel: t('back'), onPress: () => setShowAuth(false) }}
        />
        <AuthNavigator />
      </View>
    );
  }

  const isGuestUser = user?.isAnonymous || user?.isOfflineDemo;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('settings')}
        subtitle={t('settingsSubtitle')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Section: Account */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textColorSecondary }]}>
            {t('accountSection')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          {isLoading ? (
            <View style={[styles.row, { justifyContent: 'center' }]}>
              <ActivityIndicator color={colors.primaryAccent} />
            </View>
          ) : isAuthenticated && user ? (
            <>
              <View style={[styles.row, styles.borderBottom, { borderBottomColor: colors.borderColor }]}>
                <View style={styles.rowLeft}>
                  <View style={[styles.avatarCircle, { backgroundColor: colors.primaryAccent + '20' }]}>
                    <Feather name="user" size={22} color={colors.primaryAccent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                      {user.displayName || (isGuestUser ? t('guest') : t('user'))}
                    </Text>
                    <Text style={[styles.itemSubtitle, { color: colors.textColorSecondary }]}>
                      {isGuestUser ? t('guestAccess') : (user.email || t('authorized'))}
                    </Text>
                  </View>
                </View>
                {isGuestUser && (
                  <View style={[styles.badge, { backgroundColor: colors.primaryAccent + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.primaryAccent }]}>{t('guest')}</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={styles.row}
                onPress={handleLogout}
                disabled={loggingOut}
                activeOpacity={0.7}
              >
                <View style={styles.rowLeft}>
                  <Feather name="log-out" size={18} color={colors.error} />
                  <Text style={[styles.itemTitle, { color: colors.error }]}>{t('signOutAccount')}</Text>
                </View>
                {loggingOut && <ActivityIndicator size="small" color={colors.error} />}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={styles.row} onPress={() => setShowAuth(true)} activeOpacity={0.7}>
              <View style={styles.rowLeft}>
                <Feather name="log-in" size={18} color={colors.primaryAccent} />
                <View>
                  <Text style={[styles.itemTitle, { color: colors.primaryAccent }]}>{t('signInAccount')}</Text>
                  <Text style={[styles.itemSubtitle, { color: colors.textColorSecondary }]}>
                    {t('forDataSync')}
                  </Text>
                </View>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textColorSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Section: Language Selector */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textColorSecondary }]}>
            {t('languageInterface')}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
          <TouchableOpacity
            style={styles.row}
            onPress={() => setLangModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeft}>
              <Feather name="globe" size={20} color={colors.primaryAccent} />
              <View>
                <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                  {t('appLanguage')}
                </Text>
                <Text style={[styles.itemSubtitle, { color: colors.textColorSecondary }]}>
                  {currentLangLabel}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textColorSecondary} />
          </TouchableOpacity>
        </View>

        {/* Section: Appearance */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textColorSecondary }]}>
            {t('appearance')}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather
                name={theme === 'dark' ? 'moon' : 'sun'}
                size={20}
                color={colors.primaryAccent}
              />
              <View>
                <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                  {t('themeTitle')}
                </Text>
                <Text style={[styles.itemSubtitle, { color: colors.textColorSecondary }]}>
                  {theme === 'dark' ? t('darkThemeActive') : t('lightThemeActive')}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={toggleTheme}
              style={[
                styles.themeToggleButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t('toggleThemeA11y')}
            >
              <Feather
                name={theme === 'dark' ? 'sun' : 'moon'}
                size={16}
                color={colors.textColor}
              />
              <Text style={[styles.toggleButtonText, { color: colors.textColor }]}>
                {theme === 'dark' ? t('light') : t('dark')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Connection */}
        <NetworkStatusCard colors={colors} t={t} />

        {/* Section: Application Info */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.textColorSecondary }]}>
            {t('aboutApp')}
          </Text>
        </View>

        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Feather name="info" size={18} color={colors.textColorSecondary} />
              <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                {t('buildVersion')}
              </Text>
            </View>
            <Text style={[styles.itemValue, { color: colors.textColorSecondary }]}>
              v1.0.2
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Language Selection Modal */}
      <Modal
        visible={langModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textColor }]}>
                {t('selectLanguage')}
              </Text>
              <TouchableOpacity
                onPress={() => setLangModalVisible(false)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Feather name="x" size={20} color={colors.textColorSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.langList}>
              {supportedLanguages.map((lang) => {
                const isSelected = lang.code === language;
                return (
                  <TouchableOpacity
                    key={lang.code}
                    style={[
                      styles.langOption,
                      isSelected && { backgroundColor: colors.primaryAccent + '15' },
                    ]}
                    onPress={() => handleSelectLanguage(lang.code)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.langInfo}>
                      <Text
                        style={[
                          styles.langNative,
                          {
                            color: isSelected ? colors.primaryAccent : colors.textColor,
                            fontFamily: isSelected ? 'Poppins_600SemiBold' : 'Inter_400Regular',
                          },
                        ]}
                      >
                        {lang.nativeName}
                      </Text>
                      <Text style={[styles.langCode, { color: colors.textColorSecondary }]}>
                        {lang.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Feather name="check" size={18} color={colors.primaryAccent} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  borderBottom: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  itemTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  itemSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  itemValue: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  themeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
  },
  toggleButtonText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    width: '100%',
    maxHeight: '75%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
  },
  langList: {
    maxHeight: 380,
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
  },
  langInfo: {
    flex: 1,
  },
  langNative: {
    fontSize: 15,
  },
  langCode: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
});

