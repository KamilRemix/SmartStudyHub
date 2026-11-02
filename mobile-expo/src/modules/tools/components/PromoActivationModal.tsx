import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ActivityIndicator,
  Linking,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../theme';
import { PressableScale } from '../../../components/common/PressableScale';
import { aiUsageService } from '../../../services/aiUsageService';
import { redeemPromoCode } from '../../../services/promoCodeService';

interface PromoActivationModalProps {
  visible: boolean;
  onClose: () => void;
  uid: string | null;
  initialCode?: string;
  onSuccess?: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COMMUNITY_TELEGRAM_URL = 'https://t.me/smartstudyhub';

export const PromoActivationModal: React.FC<PromoActivationModalProps> = ({
  visible,
  onClose,
  uid,
  initialCode = '',
  onSuccess,
}) => {
  const { colors, isDark } = useTheme();

  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [summary, setSummary] = useState<{
    text: { remaining: number; max: number };
    vision: { remaining: number; max: number };
    quiz: { remaining: number; max: number };
    isPro: boolean;
    expiresAt?: string;
  } | null>(null);

  // Animation values
  const translateY = React.useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (initialCode) {
        setCode(initialCode);
      }
      setStatusMessage(null);
      loadUsageSummary();

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          bounciness: 4,
          speed: 14,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: SCREEN_HEIGHT,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, initialCode]);

  const loadUsageSummary = async () => {
    const data = await aiUsageService.getRemainingSummary();
    setSummary(data);
  };

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
          overlayOpacity.setValue(Math.max(0, 1 - gesture.dy / (SCREEN_HEIGHT * 0.4)));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 0.6) {
          handleClose();
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              bounciness: 4,
              speed: 14,
              useNativeDriver: true,
            }),
            Animated.timing(overlayOpacity, {
              toValue: 1,
              duration: 150,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  const handlePaste = async () => {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setCode(text.trim());
    }
  };

  const handleActivate = async () => {
    if (!code.trim()) {
      setStatusMessage({ text: 'Введите код активации', isError: true });
      return;
    }
    if (!uid) {
      setStatusMessage({ text: 'Войдите в аккаунт для активации', isError: true });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    const res = await redeemPromoCode(code, uid);
    setLoading(false);

    if (res.success) {
      setStatusMessage({ text: res.message, isError: false });
      await loadUsageSummary();
      if (onSuccess) onSuccess();
    } else {
      setStatusMessage({ text: res.message, isError: true });
    }
  };

  const handleOpenCommunity = () => {
    Linking.openURL(COMMUNITY_TELEGRAM_URL).catch(() => {});
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalRoot}>
        {/* Backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: overlayOpacity }]}>
          <PressableScale style={StyleSheet.absoluteFill} onPress={handleClose}>
            <View style={StyleSheet.absoluteFill} />
          </PressableScale>
        </Animated.View>

        {/* Sheet Content */}
        <Animated.View
          style={[
            styles.sheetContainer,
            {
              backgroundColor: colors.componentBackground || (isDark ? '#161B26' : '#FFFFFF'),
              borderColor: colors.borderColor,
              transform: [{ translateY }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Handle bar */}
          <View style={styles.handleBarWrap}>
            <View style={[styles.handleBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' }]} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textColor }]}>
                {summary?.isPro ? 'SmartStudy PRO активен' : 'Лимиты и партнерский доступ'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textColorSecondary }]}>
                {summary?.isPro
                  ? 'Вам доступны расширенные квоты Fair Use'
                  : 'Ежедневные квоты обновляются каждые 24 часа'}
              </Text>
            </View>
            <PressableScale style={styles.closeBtn} onPress={handleClose}>
              <Feather name="x" size={20} color={colors.textColorSecondary} />
            </PressableScale>
          </View>

          {/* Current Limits Status Cards */}
          <View style={styles.limitsGrid}>
            <View style={[styles.limitCard, { backgroundColor: isDark ? '#1C2230' : '#F4F6F9', borderColor: colors.borderColor }]}>
              <Feather name="message-square" size={16} color={colors.primaryAccent} />
              <Text style={[styles.limitLabel, { color: colors.textColorSecondary }]}>Текст</Text>
              <Text style={[styles.limitValue, { color: colors.textColor }]}>
                {summary ? `${summary.text.remaining}/${summary.text.max}` : '...'}
              </Text>
            </View>

            <View style={[styles.limitCard, { backgroundColor: isDark ? '#1C2230' : '#F4F6F9', borderColor: colors.borderColor }]}>
              <Feather name="camera" size={16} color="#10B981" />
              <Text style={[styles.limitLabel, { color: colors.textColorSecondary }]}>Фото</Text>
              <Text style={[styles.limitValue, { color: colors.textColor }]}>
                {summary ? `${summary.vision.remaining}/${summary.vision.max}` : '...'}
              </Text>
            </View>

            <View style={[styles.limitCard, { backgroundColor: isDark ? '#1C2230' : '#F4F6F9', borderColor: colors.borderColor }]}>
              <Feather name="check-circle" size={16} color="#8B5CF6" />
              <Text style={[styles.limitLabel, { color: colors.textColorSecondary }]}>Квизы</Text>
              <Text style={[styles.limitValue, { color: colors.textColor }]}>
                {summary ? `${summary.quiz.remaining}/${summary.quiz.max}` : '...'}
              </Text>
            </View>
          </View>

          {/* Code Input Section */}
          <View style={styles.inputSection}>
            <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
              Активация кода доступа
            </Text>

            <View style={[styles.inputWrapper, { backgroundColor: isDark ? '#121620' : '#F8FAFC', borderColor: colors.borderColor }]}>
              <Feather name="key" size={16} color={colors.textColorSecondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.textColor }]}
                placeholder="SSH-XXXX-XXXX"
                placeholderTextColor={colors.textColorSecondary}
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              {code.length > 0 ? (
                <PressableScale onPress={() => setCode('')} style={styles.clearBtn}>
                  <Feather name="x-circle" size={16} color={colors.textColorSecondary} />
                </PressableScale>
              ) : (
                <PressableScale onPress={handlePaste} style={styles.pasteBtn}>
                  <Text style={[styles.pasteBtnText, { color: colors.primaryAccent }]}>Вставить</Text>
                </PressableScale>
              )}
            </View>

            {statusMessage && (
              <View
                style={[
                  styles.statusBox,
                  {
                    backgroundColor: statusMessage.isError
                      ? isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEE2E2'
                      : isDark ? 'rgba(16, 185, 129, 0.15)' : '#D1FAE5',
                  },
                ]}
              >
                <Feather
                  name={statusMessage.isError ? 'alert-circle' : 'check'}
                  size={14}
                  color={statusMessage.isError ? '#EF4444' : '#10B981'}
                />
                <Text
                  style={[
                    styles.statusText,
                    { color: statusMessage.isError ? '#EF4444' : '#10B981' },
                  ]}
                >
                  {statusMessage.text}
                </Text>
              </View>
            )}

            <PressableScale
              style={[
                styles.activateButton,
                { backgroundColor: colors.primaryAccent },
                loading && { opacity: 0.7 },
              ]}
              onPress={handleActivate}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.activateButtonText}>Активировать доступ</Text>
              )}
            </PressableScale>
          </View>

          {/* Neutral Community Info Section (Fully RuStore compliant) */}
          <PressableScale
            style={[styles.communityCard, { backgroundColor: isDark ? '#1C2230' : '#F4F6F9' }]}
            onPress={handleOpenCommunity}
          >
            <View style={styles.communityIconWrap}>
              <Feather name="send" size={18} color={colors.primaryAccent} />
            </View>
            <View style={styles.communityTextWrap}>
              <Text style={[styles.communityTitle, { color: colors.textColor }]}>
                Наше Telegram-сообщество
              </Text>
              <Text style={[styles.communitySubtitle, { color: colors.textColorSecondary }]}>
                Новости, партнерские ключи и поддержка участников
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textColorSecondary} />
          </PressableScale>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheetContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  handleBarWrap: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 44,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Inter',
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: 'Inter',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
  },
  limitsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  limitCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  limitLabel: {
    fontSize: 12,
    marginTop: 6,
    fontFamily: 'Inter',
  },
  limitValue: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
    fontFamily: 'Inter',
  },
  inputSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Inter',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter',
    letterSpacing: 0.5,
  },
  clearBtn: {
    padding: 6,
  },
  pasteBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  pasteBtnText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    gap: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: 'Inter',
    flex: 1,
  },
  activateButton: {
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  activateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  communityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    gap: 12,
  },
  communityIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityTextWrap: {
    flex: 1,
  },
  communityTitle: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
  communitySubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'Inter',
  },
});
