import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { AppHeader } from '../../../components/common/AppHeader';
import { generatePresentationSlides, SlideItem } from '../../../services/aiService';

export const PresentationScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { t, language } = useI18n();

  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(5);
  const [audience, setAudience] = useState('Студенты');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [slides, setSlides] = useState<SlideItem[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const slideCountOptions = [3, 5, 7, 10];
  const audienceOptions = ['Школьники', 'Студенты', 'Широкая аудитория'];

  const handleGenerate = async () => {
    setErrorMessage(null);
    if (!topic.trim()) {
      setErrorMessage('Пожалуйста, введите тему презентации.');
      return;
    }

    setIsLoading(true);
    try {
      const generated = await generatePresentationSlides(
        topic.trim(),
        slideCount,
        audience,
        language
      );
      if (generated && generated.length > 0) {
        setSlides(generated);
        setCurrentSlideIndex(0);
        setErrorMessage(null);
      } else {
        throw new Error('ИИ не смог сгенерировать слайды. Попробуйте еще раз.');
      }
    } catch (err: any) {
      const msg = err?.message || 'Не удалось сгенерировать презентацию. Проверьте интернет или API-ключ.';
      setErrorMessage(msg);
      console.warn('Presentation generation failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCurrentSlide = async () => {
    if (!slides[currentSlideIndex]) return;
    const current = slides[currentSlideIndex];
    const text = `Слайд ${currentSlideIndex + 1}: ${current.title}\n\n${current.points.map((p) => `• ${p}`).join('\n')}${current.notes ? `\n\nЗаметки докладчика: ${current.notes}` : ''}`;
    await Clipboard.setStringAsync(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyAll = async () => {
    if (!slides.length) return;
    const fullText = slides
      .map(
        (s, idx) =>
          `=== Слайд ${idx + 1}: ${s.title} ===\n${s.points.map((p) => `• ${p}`).join('\n')}${s.notes ? `\nЗаметки: ${s.notes}` : ''}`
      )
      .join('\n\n');
    await Clipboard.setStringAsync(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    setSlides([]);
    setCurrentSlideIndex(0);
    setErrorMessage(null);
  };

  const currentSlide = slides[currentSlideIndex];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('presentationTitle')}
        subtitle={slides.length ? `Слайд ${currentSlideIndex + 1} из ${slides.length}` : t('presentationSub')}
        leftAction={{
          icon: 'arrow-left',
          onPress: () => navigation.goBack(),
          accessibilityLabel: 'Back',
        }}
        rightAction={
          slides.length
            ? {
                icon: 'refresh-cw',
                onPress: handleReset,
                accessibilityLabel: 'New Presentation',
              }
            : undefined
        }
      />

      <ScrollView contentContainerStyle={styles.content}>
        {slides.length === 0 ? (
          <View style={styles.formCard}>
            <View style={[styles.iconHero, { backgroundColor: colors.componentBackground }]}>
              <Feather name="monitor" size={32} color={colors.primaryAccent} />
            </View>

            <Text style={[styles.formTitle, { color: colors.textColor }]}>
              Создать презентацию с ИИ
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.textColorSecondary }]}>
              Введите тему, выберите количество слайдов, и SmartStudyAI подготовит структурированные слайды с тезисами и заметками.
            </Text>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={[styles.errorBox, { backgroundColor: colors.componentBackground, borderColor: '#ef4444' }]}>
                <Feather name="alert-circle" size={18} color="#ef4444" />
                <Text style={[styles.errorText, { color: colors.textColor }]}>
                  {errorMessage}
                </Text>
              </View>
            ) : null}

            {/* Loading Banner */}
            {isLoading ? (
              <View style={[styles.loadingBox, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}>
                <ActivityIndicator size="small" color={colors.primaryAccent} />
                <Text style={[styles.loadingBoxText, { color: colors.textColorSecondary }]}>
                  SmartStudyAI генерирует {slideCount} слайдов... Пожалуйста, подождите
                </Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textColor }]}>
                Тема презентации:
              </Text>
              <TextInput
                style={[
                  styles.topicInput,
                  {
                    backgroundColor: colors.componentBackground,
                    color: colors.textColor,
                    borderColor: errorMessage && !topic.trim() ? '#ef4444' : colors.borderColor,
                  },
                ]}
                value={topic}
                onChangeText={(txt) => {
                  setTopic(txt);
                  if (errorMessage) setErrorMessage(null);
                }}
                placeholder="Например: Квантовые компьютеры или Экология 2026"
                placeholderTextColor={colors.textColorSecondary}
                multiline
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textColor }]}>
                Количество слайдов:
              </Text>
              <View style={styles.optionsRow}>
                {slideCountOptions.map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.optionBtn,
                      {
                        backgroundColor:
                          slideCount === count
                            ? colors.primaryAccent
                            : colors.componentBackground,
                        borderColor: colors.borderColor,
                      },
                    ]}
                    onPress={() => setSlideCount(count)}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        {
                          color:
                            slideCount === count ? '#ffffff' : colors.textColor,
                        },
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textColor }]}>
                Целевая аудитория:
              </Text>
              <View style={styles.optionsRow}>
                {audienceOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.optionBtn,
                      {
                        backgroundColor:
                          audience === opt
                            ? colors.primaryAccent
                            : colors.componentBackground,
                        borderColor: colors.borderColor,
                      },
                    ]}
                    onPress={() => setAudience(opt)}
                    disabled={isLoading}
                  >
                    <Text
                      style={[
                        styles.optionBtnText,
                        {
                          color:
                            audience === opt ? '#ffffff' : colors.textColor,
                        },
                      ]}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.generateBtn,
                {
                  backgroundColor:
                    topic.trim().length > 0 && !isLoading
                      ? colors.primaryAccent
                      : colors.borderColor,
                },
              ]}
              onPress={handleGenerate}
              disabled={isLoading}
            >
              {isLoading ? (
                <View style={styles.btnInner}>
                  <ActivityIndicator size="small" color="#ffffff" />
                  <Text style={styles.btnText}>Создание слайдов...</Text>
                </View>
              ) : (
                <View style={styles.btnInner}>
                  <Feather name="zap" size={18} color="#ffffff" />
                  <Text style={styles.btnText}>Сгенерировать презентацию</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.slideViewer}>
            {/* Slide Card */}
            <View
              style={[
                styles.slideCard,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <View style={styles.slideHeader}>
                <View
                  style={[
                    styles.slideBadge,
                    { backgroundColor: colors.primaryAccent },
                  ]}
                >
                  <Text style={styles.slideBadgeText}>
                    Слайд {currentSlideIndex + 1}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.copySlideBtn}
                  onPress={handleCopyCurrentSlide}
                >
                  <Feather
                    name={copied ? 'check' : 'copy'}
                    size={16}
                    color={colors.textColorSecondary}
                  />
                  <Text
                    style={[
                      styles.copyBtnText,
                      { color: colors.textColorSecondary },
                    ]}
                  >
                    {copied ? 'Скопировано' : 'Копировать'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.slideTitle, { color: colors.textColor }]}>
                {currentSlide.title}
              </Text>

              <View style={styles.pointsList}>
                {currentSlide.points.map((point, pIdx) => (
                  <View key={pIdx} style={styles.pointRow}>
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: colors.primaryAccent },
                      ]}
                    />
                    <Text
                      style={[styles.pointText, { color: colors.textColor }]}
                    >
                      {point}
                    </Text>
                  </View>
                ))}
              </View>

              {currentSlide.notes ? (
                <View
                  style={[
                    styles.notesContainer,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <View style={styles.notesHeader}>
                    <Feather
                      name="file-text"
                      size={14}
                      color={colors.primaryAccent}
                    />
                    <Text
                      style={[
                        styles.notesLabel,
                        { color: colors.primaryAccent },
                      ]}
                    >
                      Заметки докладчика
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.notesText,
                      { color: colors.textColorSecondary },
                    ]}
                  >
                    {currentSlide.notes}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Navigation Controls */}
            <View style={styles.navRow}>
              <TouchableOpacity
                style={[
                  styles.navBtn,
                  {
                    backgroundColor: colors.componentBackground,
                    borderColor: colors.borderColor,
                    opacity: currentSlideIndex > 0 ? 1 : 0.4,
                  },
                ]}
                onPress={() =>
                  setCurrentSlideIndex((prev) => Math.max(0, prev - 1))
                }
                disabled={currentSlideIndex === 0}
              >
                <Feather name="chevron-left" size={20} color={colors.textColor} />
                <Text style={[styles.navBtnText, { color: colors.textColor }]}>
                  Назад
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.navBtn,
                  {
                    backgroundColor: colors.componentBackground,
                    borderColor: colors.borderColor,
                    opacity: currentSlideIndex < slides.length - 1 ? 1 : 0.4,
                  },
                ]}
                onPress={() =>
                  setCurrentSlideIndex((prev) =>
                    Math.min(slides.length - 1, prev + 1)
                  )
                }
                disabled={currentSlideIndex === slides.length - 1}
              >
                <Text style={[styles.navBtnText, { color: colors.textColor }]}>
                  Вперёд
                </Text>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={colors.textColor}
                />
              </TouchableOpacity>
            </View>

            {/* Bottom Actions */}
            <TouchableOpacity
              style={[
                styles.copyAllBtn,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
              onPress={handleCopyAll}
            >
              <Feather name="share-2" size={16} color={colors.primaryAccent} />
              <Text
                style={[styles.copyAllText, { color: colors.primaryAccent }]}
              >
                Скопировать всю презентацию в буфер
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  formCard: {
    gap: 16,
  },
  iconHero: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 10,
  },
  formTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    textAlign: 'center',
  },
  formSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  loadingBoxText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  inputGroup: {
    gap: 8,
    marginTop: 8,
  },
  inputLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  topicInput: {
    minHeight: 56,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  optionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  generateBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  btnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btnText: {
    fontFamily: 'Poppins_600SemiBold',
    color: '#ffffff',
    fontSize: 15,
  },
  slideViewer: {
    gap: 16,
  },
  slideCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 14,
  },
  slideHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slideBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  slideBadgeText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  copySlideBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyBtnText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  slideTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  pointsList: {
    gap: 10,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  pointText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  notesContainer: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
    marginTop: 4,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  notesLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  notesText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  navBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  navBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  copyAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  copyAllText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
});
