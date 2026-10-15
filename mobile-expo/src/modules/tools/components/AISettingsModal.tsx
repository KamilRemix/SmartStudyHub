import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  Switch,
  Pressable,
  Platform,
  Alert,
  Animated,
  PanResponder,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { PressableScale } from '../../../components/common/PressableScale';
import { AIProviderId, AI_PROVIDERS } from '../../../services/aiMultiProviderService';

interface AISettingsModalProps {
  visible: boolean;
  onClose: () => void;
  selectedProvider: AIProviderId;
  onOpenModelSelector: () => void;
  onOpenPersonalization: () => void;
  hasActivePersonalization: boolean;
  webSearchEnabled: boolean;
  onToggleWebSearch: (enabled: boolean) => void;
  onClearAllSessions: () => void;
  totalSessionsCount: number;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({
  visible,
  onClose,
  selectedProvider,
  onOpenModelSelector,
  onOpenPersonalization,
  hasActivePersonalization,
  webSearchEnabled,
  onToggleWebSearch,
  onClearAllSessions,
  totalSessionsCount,
}) => {
  const { colors, isDark } = useTheme();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        return gesture.dy > 5 && Math.abs(gesture.dy) > Math.abs(gesture.dx);
      },
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 90 || gesture.vy > 0.4) {
          Animated.timing(translateY, {
            toValue: 500,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            tension: 90,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const selectedProviderInfo =
    AI_PROVIDERS.find((p) => p.id === selectedProvider) || AI_PROVIDERS[0];

  const handleClearConfirm = () => {
    onClearAllSessions();
    setShowClearConfirm(false);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        {/* Backdrop tap to dismiss */}
        <Pressable
          style={styles.backdropDismissArea}
          onPress={onClose}
          accessibilityLabel="Закрыть настройки"
        />

        <Animated.View
          style={[
            styles.sheetCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Top handle bar */}
          <View {...panResponder.panHandlers} style={styles.handleWrap}>
            <View style={[styles.handleBar, { backgroundColor: colors.borderColor }]} />
          </View>

          {/* Header */}
          <View
            {...panResponder.panHandlers}
            style={[styles.header, { borderBottomColor: colors.borderColor }]}
          >
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.iconBadge,
                  { backgroundColor: colors.primaryAccent + '18' },
                ]}
              >
                <Feather name="settings" size={18} color={colors.primaryAccent} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textColor }]}>
                  Настройки ассистента
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textColorSecondary }]}>
                  Параметры моделей, персонализация и данные
                </Text>
              </View>
            </View>

            <PressableScale
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              accessibilityLabel="Закрыть"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={18} color={colors.textColorSecondary} />
            </PressableScale>
          </View>

          {/* Settings list content */}
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* ── Section: AI & Prompts ── */}
            <Text style={[styles.sectionHeading, { color: colors.textColorSecondary }]}>
              ИНТЕЛЛЕКТ И СТИЛЬ ОТВЕТОВ
            </Text>

            <View
              style={[
                styles.groupContainer,
                { backgroundColor: colors.surface, borderColor: colors.borderColor },
              ]}
            >
              {/* Personalization item */}
              <PressableScale
                style={styles.settingItem}
                onPress={() => {
                  onClose();
                  setTimeout(onOpenPersonalization, 260);
                }}
              >
                <View
                  style={[
                    styles.itemIconBox,
                    { backgroundColor: colors.primaryAccent + '15' },
                  ]}
                >
                  <Feather name="user-check" size={16} color={colors.primaryAccent} />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                    Персонализация ИИ
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textColorSecondary }]}>
                    Роль, класс/курс, формат объяснений
                  </Text>
                </View>
                <View style={styles.itemRightWrap}>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: hasActivePersonalization
                          ? colors.primaryAccent + '18'
                          : colors.componentBackground,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        {
                          color: hasActivePersonalization
                            ? colors.primaryAccent
                            : colors.textColorSecondary,
                        },
                      ]}
                    >
                      {hasActivePersonalization ? 'Настроено' : 'Стандарт'}
                    </Text>
                  </View>
                  <Feather name="chevron-right" size={16} color={colors.textColorSecondary} />
                </View>
              </PressableScale>

              <View style={[styles.itemDivider, { backgroundColor: colors.borderColor }]} />

              {/* Default Model Item */}
              <PressableScale
                style={styles.settingItem}
                onPress={() => {
                  onClose();
                  setTimeout(onOpenModelSelector, 260);
                }}
              >
                <View
                  style={[
                    styles.itemIconBox,
                    { backgroundColor: colors.primaryAccent + '15' },
                  ]}
                >
                  <Feather name="cpu" size={16} color={colors.primaryAccent} />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                    Модель по умолчанию
                  </Text>
                  <Text
                    style={[styles.itemSub, { color: colors.textColorSecondary }]}
                    numberOfLines={1}
                  >
                    {selectedProviderInfo.name}
                  </Text>
                </View>
                <View style={styles.itemRightWrap}>
                  <Feather name="chevron-right" size={16} color={colors.textColorSecondary} />
                </View>
              </PressableScale>
            </View>

            {/* ── Section: Features ── */}
            <Text style={[styles.sectionHeading, { color: colors.textColorSecondary }]}>
              ФУНКЦИИ И СЕТЬ
            </Text>

            <View
              style={[
                styles.groupContainer,
                { backgroundColor: colors.surface, borderColor: colors.borderColor },
              ]}
            >
              {/* Web search toggle */}
              <View style={styles.settingItem}>
                <View
                  style={[
                    styles.itemIconBox,
                    { backgroundColor: colors.primaryAccent + '15' },
                  ]}
                >
                  <Feather name="globe" size={16} color={colors.primaryAccent} />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                    Поиск в интернете
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textColorSecondary }]}>
                    Использовать свежие данные и статьи
                  </Text>
                </View>
                <Switch
                  value={webSearchEnabled}
                  onValueChange={onToggleWebSearch}
                  trackColor={{
                    false: isDark ? '#334155' : '#cbd5e1',
                    true: colors.primaryAccent,
                  }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={[styles.itemDivider, { backgroundColor: colors.borderColor }]} />

              {/* Academic profile context info */}
              <View style={styles.settingItem}>
                <View
                  style={[
                    styles.itemIconBox,
                    { backgroundColor: colors.primaryAccent + '15' },
                  ]}
                >
                  <Feather name="book-open" size={16} color={colors.primaryAccent} />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemTitle, { color: colors.textColor }]}>
                    Академический профиль
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textColorSecondary }]}>
                    Авто-учет учебных предметов и оценок
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: colors.primaryAccent + '18' },
                  ]}
                >
                  <Text style={[styles.statusPillText, { color: colors.primaryAccent }]}>
                    Активен
                  </Text>
                </View>
              </View>
            </View>

            {/* ── Section: Data & Storage ── */}
            <Text style={[styles.sectionHeading, { color: colors.textColorSecondary }]}>
              ДАННЫЕ И ИСТОРИЯ
            </Text>

            <View
              style={[
                styles.groupContainer,
                { backgroundColor: colors.surface, borderColor: colors.borderColor },
              ]}
            >
              <PressableScale
                style={styles.settingItem}
                onPress={() => setShowClearConfirm(true)}
              >
                <View style={[styles.itemIconBox, { backgroundColor: '#EF444415' }]}>
                  <Feather name="trash-2" size={16} color="#EF4444" />
                </View>
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemTitle, { color: '#EF4444' }]}>
                    Очистить историю диалогов
                  </Text>
                  <Text style={[styles.itemSub, { color: colors.textColorSecondary }]}>
                    Всего чатов: {totalSessionsCount}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.textColorSecondary} />
              </PressableScale>
            </View>

            {/* Confirm Clear Alert Card */}
            {showClearConfirm && (
              <View
                style={[
                  styles.confirmCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: '#EF444460',
                  },
                ]}
              >
                <View style={styles.confirmHeader}>
                  <Feather name="alert-triangle" size={18} color="#EF4444" />
                  <Text style={[styles.confirmTitle, { color: colors.textColor }]}>
                    Удалить все чаты?
                  </Text>
                </View>
                <Text style={[styles.confirmText, { color: colors.textColorSecondary }]}>
                  Все сохраненные сообщения и темы будут безвозвратно удалены с устройства.
                </Text>
                <View style={styles.confirmBtnRow}>
                  <PressableScale
                    style={[
                      styles.confirmBtn,
                      { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
                    ]}
                    onPress={() => setShowClearConfirm(false)}
                  >
                    <Text style={[styles.confirmBtnText, { color: colors.textColor }]}>
                      Отмена
                    </Text>
                  </PressableScale>
                  <PressableScale
                    style={[styles.confirmBtn, { backgroundColor: '#EF4444' }]}
                    onPress={handleClearConfirm}
                  >
                    <Text style={[styles.confirmBtnText, { color: '#FFFFFF' }]}>
                      Удалить
                    </Text>
                  </PressableScale>
                </View>
              </View>
            )}

            {/* Footer / About info */}
            <View style={styles.aboutFooter}>
              <Text style={[styles.aboutText, { color: colors.textColorSecondary }]}>
                SmartStudy AI Engine • Версия 1.4.1
              </Text>
              <Text style={[styles.aboutSub, { color: colors.textColorSecondary }]}>
                Многоуровневый отказоустойчивый каскад моделей
              </Text>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  sheetCard: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    overflow: 'hidden',
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  headerSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: 18,
    gap: 10,
  },
  sectionHeading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.6,
    marginTop: 8,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  groupContainer: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    gap: 12,
  },
  itemIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemTextWrap: {
    flex: 1,
  },
  itemTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  itemSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginTop: 2,
  },
  itemRightWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemDivider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 60,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  confirmCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 6,
    gap: 10,
  },
  confirmHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },
  confirmText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  confirmBtnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  confirmBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  aboutFooter: {
    alignItems: 'center',
    marginTop: 18,
    marginBottom: 8,
    gap: 4,
  },
  aboutText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  aboutSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
});
