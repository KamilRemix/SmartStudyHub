import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Switch,
  Pressable,
  Animated,
  PanResponder,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { PressableScale } from '../../../components/common/PressableScale';
import {
  AIPersonalization,
  getPersonalization,
  savePersonalization,
  DEFAULT_PERSONALIZATION,
} from '../../../services/aiPersonalizationService';

interface PersonalizationModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved?: (settings: AIPersonalization) => void;
}

interface ToneOption {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  desc: string;
  instruction: string;
}

const TONE_OPTIONS: ToneOption[] = [
  {
    id: 'concise',
    label: 'Лаконичный',
    icon: 'zap',
    desc: 'Кратко и по существу, без лишней воды',
    instruction: 'Отвечай кратко, емко и сразу по существу без лишних вступлений.',
  },
  {
    id: 'academic',
    label: 'Академический',
    icon: 'book-open',
    desc: 'Строгие формулы, доказательства и теория',
    instruction: 'Объясняй глубоко, со строгими академическими доказательствами и формулами.',
  },
  {
    id: 'intuitive',
    label: 'Наглядный',
    icon: 'compass',
    desc: 'Простые жизненные аналогии и примеры',
    instruction: 'Объясняй сложный материал простыми словами и наглядными жизненными аналогиями.',
  },
  {
    id: 'mentor',
    label: 'Наставник',
    icon: 'user-check',
    desc: 'Задает наводящие вопросы и развивает логику',
    instruction: 'Действуй как чуткий ментор: задавай наводящие вопросы и учи рассуждать самостоятельно.',
  },
];

interface FormatOption {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  instruction: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  {
    id: 'latex',
    label: 'Формулы LaTeX',
    icon: 'code',
    instruction: 'Всегда оформляй математические формулы через LaTeX ($...$ и $$...$$).',
  },
  {
    id: 'steps',
    label: 'Пошаговый план',
    icon: 'list',
    instruction: 'Разбивай любое решение на четкие пронумерованные шаги с проверкой каждого этапа.',
  },
  {
    id: 'summary',
    label: 'Резюме и вывод',
    icon: 'check-circle',
    instruction: 'В конце каждого ответа добавляй краткий итоговый вывод и ключевые тезисы.',
  },
];

interface StudyPreset {
  id: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  instruction: string;
}

const STUDY_PRESETS: StudyPreset[] = [
  {
    id: 'school',
    label: 'Школьник (5–11 класс)',
    icon: 'award',
    instruction: 'Я учусь в школе. Объясняй темы понятным школьнику языком в рамках школьной программы.',
  },
  {
    id: 'student',
    label: 'Студент вуза',
    icon: 'briefcase',
    instruction: 'Я студент университета. Ориентируйся на вузовский уровень, строгую терминологию и практику.',
  },
  {
    id: 'exam',
    label: 'ОГЭ / ЕГЭ / Сессия',
    icon: 'check-square',
    instruction: 'Помогай готовиться к экзаменам: выделяй критерии оценивания, частые ошибки и формулы.',
  },
  {
    id: 'coder',
    label: 'Программист',
    icon: 'terminal',
    instruction: 'Пиши чистый код с подробными комментариями на русском к каждой важной строке.',
  },
];

export const PersonalizationModal: React.FC<PersonalizationModalProps> = ({
  visible,
  onClose,
  onSaved,
}) => {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<AIPersonalization>(DEFAULT_PERSONALIZATION);
  const [isSaving, setIsSaving] = useState(false);

  // Swipe-to-dismiss gesture state (1:1 tracking with Apple spring physics)
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      loadCurrent();
      translateY.setValue(0);
    }
  }, [visible]);

  const loadCurrent = async () => {
    const data = await getPersonalization();
    setSettings(data);
  };

  const handleSave = async () => {
    setIsSaving(true);
    await savePersonalization(settings);
    setIsSaving(false);
    if (onSaved) {
      onSaved(settings);
    }
    onClose();
  };

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

  // Append or toggle preset text inside the instructions field
  const togglePresetInstruction = (snippet: string) => {
    const current = settings.instructions.trim();
    if (current.includes(snippet)) {
      // Remove snippet cleanly
      const updated = current
        .replace(snippet, '')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
      setSettings((s) => ({ ...s, instructions: updated }));
    } else {
      // Append snippet
      const updated = current ? `${current}\n${snippet}` : snippet;
      setSettings((s) => ({ ...s, instructions: updated }));
    }
  };

  const isSnippetActive = (snippet: string) => {
    return settings.instructions.includes(snippet);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        {/* Backdrop tap to dismiss */}
        <Pressable
          style={styles.backdropDismissArea}
          onPress={onClose}
          accessibilityLabel="Закрыть персонализацию"
        />

        <Animated.View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
              transform: [{ translateY }],
            },
          ]}
        >
          {/* Top handle bar with direct swipe-to-dismiss tracking */}
          <View {...panResponder.panHandlers} style={styles.handleWrap}>
            <View style={[styles.handleBar, { backgroundColor: colors.borderColor }]} />
          </View>

          {/* Header */}
          <View
            {...panResponder.panHandlers}
            style={[styles.header, { borderBottomColor: colors.borderColor }]}
          >
            <View style={styles.headerTitleRow}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primaryAccent + '18' }]}>
                <Feather name="sliders" size={17} color={colors.primaryAccent} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textColor }]}>
                  Персонализация ИИ
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textColorSecondary }]}>
                  Стиль, тон и постоянный академический контекст
                </Text>
              </View>
            </View>

            <PressableScale
              onPress={onClose}
              style={[styles.closeBtn, { backgroundColor: colors.surface }]}
              accessibilityLabel="Закрыть"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Feather name="x" size={17} color={colors.textColorSecondary} />
            </PressableScale>
          </View>

          <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
            {/* Master Toggle Card */}
            <View
              style={[
                styles.masterCard,
                {
                  backgroundColor: settings.enabled ? colors.primaryAccent + '0C' : colors.surface,
                  borderColor: settings.enabled ? colors.primaryAccent + '30' : colors.borderColor,
                },
              ]}
            >
              <View style={styles.masterCardInfo}>
                <View style={styles.masterCardTitleRow}>
                  <Text style={[styles.masterCardTitle, { color: colors.textColor }]}>
                    Учитывать контекст в диалогах
                  </Text>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: settings.enabled
                          ? colors.primaryAccent + '20'
                          : colors.borderColor + '60',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        { color: settings.enabled ? colors.primaryAccent : colors.textColorSecondary },
                      ]}
                    >
                      {settings.enabled ? 'Активно' : 'Отключено'}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.masterCardDesc, { color: colors.textColorSecondary }]}>
                  ИИ будет помнить ваши правила, роль и предпочтения в каждом ответе
                </Text>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={(val) => setSettings((s) => ({ ...s, enabled: val }))}
                trackColor={{ false: colors.borderColor, true: colors.primaryAccent }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Section: Tone of Voice */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="message-circle" size={14} color={colors.primaryAccent} />
                <Text style={[styles.sectionHeading, { color: colors.textColor }]}>
                  Стиль общения
                </Text>
              </View>
              <View style={styles.chipsGrid}>
                {TONE_OPTIONS.map((tone) => {
                  const active = isSnippetActive(tone.instruction);
                  return (
                    <PressableScale
                      key={tone.id}
                      style={[
                        styles.toneCard,
                        {
                          backgroundColor: active ? colors.primaryAccent + '15' : colors.surface,
                          borderColor: active ? colors.primaryAccent : colors.borderColor,
                        },
                      ]}
                      onPress={() => togglePresetInstruction(tone.instruction)}
                    >
                      <View style={styles.toneCardTop}>
                        <View
                          style={[
                            styles.toneIconWrap,
                            {
                              backgroundColor: active
                                ? colors.primaryAccent + '25'
                                : colors.componentBackground,
                            },
                          ]}
                        >
                          <Feather
                            name={tone.icon}
                            size={14}
                            color={active ? colors.primaryAccent : colors.textColorSecondary}
                          />
                        </View>
                        {active && (
                          <Feather name="check" size={13} color={colors.primaryAccent} />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.toneCardTitle,
                          { color: active ? colors.primaryAccent : colors.textColor },
                        ]}
                      >
                        {tone.label}
                      </Text>
                      <Text
                        style={[styles.toneCardDesc, { color: colors.textColorSecondary }]}
                        numberOfLines={2}
                      >
                        {tone.desc}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* Section: Formatting Options */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="align-left" size={14} color={colors.primaryAccent} />
                <Text style={[styles.sectionHeading, { color: colors.textColor }]}>
                  Оформление ответов
                </Text>
              </View>
              <View style={styles.formatRow}>
                {FORMAT_OPTIONS.map((fmt) => {
                  const active = isSnippetActive(fmt.instruction);
                  return (
                    <PressableScale
                      key={fmt.id}
                      style={[
                        styles.formatPill,
                        {
                          backgroundColor: active ? colors.primaryAccent + '18' : colors.surface,
                          borderColor: active ? colors.primaryAccent : colors.borderColor,
                        },
                      ]}
                      onPress={() => togglePresetInstruction(fmt.instruction)}
                    >
                      <Feather
                        name={fmt.icon}
                        size={13}
                        color={active ? colors.primaryAccent : colors.textColorSecondary}
                      />
                      <Text
                        style={[
                          styles.formatPillText,
                          { color: active ? colors.primaryAccent : colors.textColor },
                        ]}
                      >
                        {fmt.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* Section: Academic Profiles */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeaderRow}>
                <Feather name="user" size={14} color={colors.primaryAccent} />
                <Text style={[styles.sectionHeading, { color: colors.textColor }]}>
                  Академический профиль
                </Text>
              </View>
              <View style={styles.presetsWrap}>
                {STUDY_PRESETS.map((preset) => {
                  const active = isSnippetActive(preset.instruction);
                  return (
                    <PressableScale
                      key={preset.id}
                      style={[
                        styles.presetChip,
                        {
                          backgroundColor: active ? colors.primaryAccent + '15' : colors.surface,
                          borderColor: active ? colors.primaryAccent : colors.borderColor,
                        },
                      ]}
                      onPress={() => togglePresetInstruction(preset.instruction)}
                    >
                      <Feather
                        name={preset.icon}
                        size={13}
                        color={active ? colors.primaryAccent : colors.textColorSecondary}
                      />
                      <Text
                        style={[
                          styles.presetChipText,
                          { color: active ? colors.primaryAccent : colors.textColor },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </PressableScale>
                  );
                })}
              </View>
            </View>

            {/* Section: Custom Instructions Text Input */}
            <View style={styles.sectionWrap}>
              <View style={styles.inputHeaderRow}>
                <View style={styles.sectionHeaderRow}>
                  <Feather name="edit-3" size={14} color={colors.primaryAccent} />
                  <Text style={[styles.sectionHeading, { color: colors.textColor }]}>
                    Собственные инструкции
                  </Text>
                </View>
                {settings.instructions.length > 0 && (
                  <PressableScale
                    onPress={() => setSettings((s) => ({ ...s, instructions: '' }))}
                    style={styles.clearBtn}
                  >
                    <Feather name="trash-2" size={12} color={colors.textColorSecondary} />
                    <Text style={[styles.clearBtnText, { color: colors.textColorSecondary }]}>
                      Очистить
                    </Text>
                  </PressableScale>
                )}
              </View>
              <View
                style={[
                  styles.textAreaWrap,
                  { backgroundColor: colors.surface, borderColor: colors.borderColor },
                ]}
              >
                <TextInput
                  style={[styles.textArea, { color: colors.textColor }]}
                  placeholder="Опишите ваши особые пожелания к ответам ИИ (например: отвечай на русском, выделяй главные мысли жирным, проверяй ответы на ошибки)..."
                  placeholderTextColor={colors.textColorSecondary}
                  value={settings.instructions}
                  onChangeText={(text) => setSettings((s) => ({ ...s, instructions: text }))}
                  multiline
                  numberOfLines={5}
                  maxLength={1500}
                />
                <View style={styles.charCounterWrap}>
                  <Text style={[styles.charCounterText, { color: colors.textColorSecondary }]}>
                    {settings.instructions.length} / 1500
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer Save Button */}
          <View style={[styles.footer, { borderTopColor: colors.borderColor }]}>
            <PressableScale
              style={[styles.saveButton, { backgroundColor: colors.primaryAccent }]}
              onPress={handleSave}
              disabled={isSaving}
            >
              <Feather name="check" size={18} color="#ffffff" />
              <Text style={styles.saveButtonText}>
                {isSaving ? 'Сохранение...' : 'Применить настройки'}
              </Text>
            </PressableScale>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.54)',
    justifyContent: 'flex-end',
  },
  backdropDismissArea: {
    flex: 1,
  },
  modalContent: {
    maxHeight: '90%',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 20,
  },
  handleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
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
  scrollBody: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 18,
  },
  masterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  masterCardInfo: {
    flex: 1,
    paddingRight: 10,
  },
  masterCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  masterCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  statusPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
  },
  masterCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 16,
  },
  sectionWrap: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  sectionHeading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toneCard: {
    width: '48.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 4,
  },
  toneCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  toneIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneCardTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },
  toneCardDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
  },
  formatRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  formatPillText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  presetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  inputHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  clearBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  textAreaWrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  textArea: {
    minHeight: 88,
    maxHeight: 160,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
    textAlignVertical: 'top',
    padding: 0,
  },
  charCounterWrap: {
    alignItems: 'flex-end',
    marginTop: 6,
  },
  charCounterText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
  },
  footer: {
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  saveButton: {
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});
