import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Share,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../theme';
import { AppHeader } from '../../../components/common/AppHeader';
import { ToolsStackParamList } from '../../../navigation/types';
import {
  Quiz,
  QuizEvaluation,
  generateQuizFromAI,
  evaluateQuiz,
  formatQuizForExport,
} from '../../../services/quizService';
import { formatLatexToReadable } from '../utils/latexFormatter';

type NavProp = NativeStackNavigationProp<ToolsStackParamList>;

export const QuizGeneratorScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();

  // Phases: 'setup' | 'playing' | 'results'
  const [phase, setPhase] = useState<'setup' | 'playing' | 'results'>('setup');

  // Setup state
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [quizType, setQuizType] = useState<'multiple_choice' | 'open_ended' | 'mixed'>('multiple_choice');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [attachedImage, setAttachedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  // Playing state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [openInputText, setOpenInputText] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);

  // Results state
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);

  // Handlers for image attachment in quiz
  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        setAttachedImage({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64,
        });
      }
    } catch (e) {
      console.warn('Image pick error:', e);
    }
  };

  const handleLaunchCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]?.base64) {
        setAttachedImage({
          uri: result.assets[0].uri,
          base64: result.assets[0].base64,
        });
      }
    } catch (e) {
      console.warn('Camera error:', e);
    }
  };

  // Generate Quiz
  const handleGenerate = async () => {
    if (!topic.trim() && !attachedImage) {
      setGenError('Пожалуйста, укажите тему или прикрепите фото билета/задач.');
      return;
    }

    setGenError(null);
    setIsGenerating(true);

    try {
      const generated = await generateQuizFromAI({
        topic: topic.trim(),
        questionCount,
        type: quizType,
        difficulty,
        imageBase64: attachedImage?.base64,
      });

      setQuiz(generated);
      setCurrentIndex(0);
      setUserAnswers({});
      setSelectedOption(null);
      setOpenInputText('');
      setShowExplanation(false);
      setPhase('playing');
    } catch (err: any) {
      setGenError(err?.message || 'Ошибка генерации теста. Попробуйте еще раз.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Submit Answer for Current Question
  const handleSelectOption = (opt: string) => {
    if (showExplanation) return;
    setSelectedOption(opt);
    setShowExplanation(true);

    const q = quiz?.questions[currentIndex];
    if (q) {
      setUserAnswers((prev) => ({ ...prev, [q.id]: opt }));
    }
  };

  const handleSubmitOpenEnded = () => {
    if (!openInputText.trim() || showExplanation) return;
    setShowExplanation(true);

    const q = quiz?.questions[currentIndex];
    if (q) {
      setUserAnswers((prev) => ({ ...prev, [q.id]: openInputText.trim() }));
    }
  };

  // Navigation between questions
  const handleNextQuestion = () => {
    if (!quiz) return;

    if (currentIndex + 1 < quiz.questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setOpenInputText('');
      setShowExplanation(false);
    } else {
      // Finished Quiz -> Evaluate
      const evalResult = evaluateQuiz(quiz, userAnswers);
      setEvaluation(evalResult);
      setPhase('results');
    }
  };

  // Export Quiz
  const handleShareExport = async (mode: 'teacher' | 'student') => {
    if (!quiz) return;
    const text = formatQuizForExport(quiz, mode);
    try {
      await Share.share({ message: text });
    } catch (err) {
      console.warn('Share error:', err);
    }
  };

  const handleCopyExport = async (mode: 'teacher' | 'student') => {
    if (!quiz) return;
    const text = formatQuizForExport(quiz, mode);
    await Clipboard.setStringAsync(text);
    setCopiedExport(true);
    setTimeout(() => setCopiedExport(false), 2000);
  };

  // Navigate to AI Assistant to discuss missed questions
  const handleDiscussWithAI = () => {
    if (!evaluation || !quiz) return;
    const wrongQuestions = evaluation.detailedResults
      .filter((r) => !r.isCorrect)
      .map(
        (r, i) =>
          `${i + 1}. Вопрос: "${r.question.question}". Мой ответ: "${r.userAnswer || 'нет ответа'}". Правильный: "${r.question.correctAnswer}". Пояснение: "${r.question.explanation}"`
      )
      .join('\n\n');

    const prompt = `Привет! Я прошел тест "${quiz.title}" и набрал ${evaluation.score} из ${evaluation.total}. Помоги разобрать мои ошибки и объясни детально, почему мои ответы неверны:\n\n${wrongQuestions}`;

    navigation.navigate('AIAssistant');
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Тесты и квизы"
        subtitle={
          phase === 'playing' && quiz
            ? `Вопрос ${currentIndex + 1} из ${quiz.questions.length}`
            : phase === 'results'
            ? 'Результаты тестирования'
            : 'Генератор интерактивных тестов'
        }
        leftAction={{
          icon: 'arrow-left',
          onPress: () => {
            if (phase === 'playing' || phase === 'results') {
              setPhase('setup');
            } else {
              navigation.goBack();
            }
          },
          accessibilityLabel: 'Back',
        }}
        rightAction={
          phase === 'results'
            ? {
                icon: 'share-2',
                onPress: () => setExportModalVisible(true),
                accessibilityLabel: 'Export Test',
              }
            : undefined
        }
      />

      {/* PHASE 1: SETUP */}
      {phase === 'setup' && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textColor }]}>
              Тема или учебный материал
            </Text>
            <TextInput
              style={[
                styles.topicInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.borderColor,
                  color: colors.textColor,
                },
              ]}
              placeholder="Например: Законы Ньютона, Квадратные уравнения, Python структуры данных..."
              placeholderTextColor={colors.textColorSecondary}
              value={topic}
              onChangeText={setTopic}
              multiline
              numberOfLines={3}
            />

            {/* Photo Attachment */}
            <View style={styles.attachRow}>
              <TouchableOpacity
                style={[
                  styles.attachBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={handleLaunchCamera}
                activeOpacity={0.7}
              >
                <Feather name="camera" size={16} color={colors.primaryAccent} />
                <Text style={[styles.attachText, { color: colors.textColor }]}>Снять фото</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.attachBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={handlePickImage}
                activeOpacity={0.7}
              >
                <Feather name="image" size={16} color={colors.primaryAccent} />
                <Text style={[styles.attachText, { color: colors.textColor }]}>Из галереи</Text>
              </TouchableOpacity>
            </View>

            {attachedImage && (
              <View style={[styles.imagePreviewWrap, { borderColor: colors.borderColor }]}>
                <Image source={{ uri: attachedImage.uri }} style={styles.attachedThumbnail} />
                <View style={styles.attachedInfo}>
                  <Text style={[styles.attachedName, { color: colors.textColor }]}>
                    Фото материала прикреплено
                  </Text>
                  <Text style={[styles.attachedDesc, { color: colors.textColorSecondary }]}>
                    ИИ распознает формулы и задания с фото
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setAttachedImage(null)}
                  style={styles.removeImageBtn}
                >
                  <Feather name="x" size={16} color={colors.textColorSecondary} />
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Question Count */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textColor }]}>
              Количество вопросов
            </Text>
            <View style={styles.chipsRow}>
              {[3, 5, 10, 15].map((cnt) => (
                <TouchableOpacity
                  key={cnt}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        questionCount === cnt ? colors.primaryAccent : colors.background,
                      borderColor:
                        questionCount === cnt ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                  onPress={() => setQuestionCount(cnt)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: questionCount === cnt ? '#ffffff' : colors.textColor },
                    ]}
                  >
                    {cnt} вопросов
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Question Type */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textColor }]}>Формат ответов</Text>
            <View style={styles.chipsRow}>
              {[
                { id: 'multiple_choice', label: 'Тест (4 варианта)' },
                { id: 'open_ended', label: 'Свой ввод (открытый)' },
                { id: 'mixed', label: 'Смешанный' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        quizType === item.id ? colors.primaryAccent : colors.background,
                      borderColor:
                        quizType === item.id ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                  onPress={() => setQuizType(item.id as any)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: quizType === item.id ? '#ffffff' : colors.textColor },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Difficulty */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textColor }]}>Сложность</Text>
            <View style={styles.chipsRow}>
              {[
                { id: 'easy', label: 'Базовый' },
                { id: 'medium', label: 'Средний' },
                { id: 'hard', label: 'Олимпиадный / Экзамен' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor:
                        difficulty === item.id ? colors.primaryAccent : colors.background,
                      borderColor:
                        difficulty === item.id ? colors.primaryAccent : colors.borderColor,
                    },
                  ]}
                  onPress={() => setDifficulty(item.id as any)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: difficulty === item.id ? '#ffffff' : colors.textColor },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {genError && (
            <View style={styles.errorBox}>
              <Feather name="alert-triangle" size={16} color="#ef4444" />
              <Text style={styles.errorText}>{genError}</Text>
            </View>
          )}

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primaryAccent }]}
            onPress={handleGenerate}
            disabled={isGenerating}
            activeOpacity={0.8}
          >
            {isGenerating ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <>
                <Feather name="zap" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Сгенерировать тест с ИИ</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* PHASE 2: PLAYING */}
      {phase === 'playing' && quiz && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Progress Bar */}
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBarTrack,
                { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
              ]}
            >
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.primaryAccent,
                    width: `${((currentIndex + 1) / quiz.questions.length) * 100}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textColorSecondary }]}>
              {currentIndex + 1} / {quiz.questions.length}
            </Text>
          </View>

          {/* Current Question Card */}
          {(() => {
            const currentQ = quiz.questions[currentIndex];
            const formattedQuestion = formatLatexToReadable(currentQ.question);

            return (
              <View
                style={[
                  styles.questionCard,
                  {
                    backgroundColor: colors.componentBackground,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <View style={styles.topicBadge}>
                  <Text style={[styles.topicBadgeText, { color: colors.primaryAccent }]}>
                    {currentQ.topic}
                  </Text>
                </View>

                <Text style={[styles.questionText, { color: colors.textColor }]}>
                  {formattedQuestion}
                </Text>

                {/* Multiple Choice Options */}
                {currentQ.type === 'multiple_choice' && currentQ.options ? (
                  <View style={styles.optionsList}>
                    {currentQ.options.map((opt, oIdx) => {
                      const letter = String.fromCharCode(65 + oIdx);
                      const isChosen = selectedOption === opt;
                      const isCorrect =
                        opt.trim().toLowerCase() === currentQ.correctAnswer.trim().toLowerCase();

                      let borderColor = colors.borderColor;
                      let bg = colors.background;
                      let textColor = colors.textColor;

                      if (showExplanation) {
                        if (isCorrect) {
                          borderColor = '#22c55e';
                          bg = '#14532d33';
                          textColor = '#4ade80';
                        } else if (isChosen) {
                          borderColor = '#ef4444';
                          bg = '#7f1d1d33';
                          textColor = '#f87171';
                        }
                      } else if (isChosen) {
                        borderColor = colors.primaryAccent;
                        bg = colors.primaryAccent + '15';
                      }

                      return (
                        <TouchableOpacity
                          key={oIdx}
                          style={[
                            styles.optionCard,
                            {
                              backgroundColor: bg,
                              borderColor,
                            },
                          ]}
                          onPress={() => handleSelectOption(opt)}
                          disabled={showExplanation}
                          activeOpacity={0.7}
                        >
                          <View
                            style={[
                              styles.letterCircle,
                              {
                                backgroundColor: isChosen
                                  ? colors.primaryAccent
                                  : colors.componentBackground,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.letterText,
                                { color: isChosen ? '#ffffff' : colors.textColorSecondary },
                              ]}
                            >
                              {letter}
                            </Text>
                          </View>
                          <Text style={[styles.optionText, { color: textColor }]}>
                            {formatLatexToReadable(opt)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  /* Open-Ended Input */
                  <View style={styles.openInputWrap}>
                    <TextInput
                      style={[
                        styles.openInput,
                        {
                          backgroundColor: colors.background,
                          borderColor: colors.borderColor,
                          color: colors.textColor,
                        },
                      ]}
                      placeholder="Введите ваш ответ (число, формулу или термин)..."
                      placeholderTextColor={colors.textColorSecondary}
                      value={openInputText}
                      onChangeText={setOpenInputText}
                      editable={!showExplanation}
                    />
                    {!showExplanation && (
                      <TouchableOpacity
                        style={[
                          styles.openSubmitBtn,
                          {
                            backgroundColor: openInputText.trim()
                              ? colors.primaryAccent
                              : colors.borderColor,
                          },
                        ]}
                        onPress={handleSubmitOpenEnded}
                        disabled={!openInputText.trim()}
                      >
                        <Text style={styles.openSubmitText}>Проверить ответ</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Explanation Card */}
                {showExplanation && (
                  <View
                    style={[
                      styles.explanationBox,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.borderColor,
                      },
                    ]}
                  >
                    <View style={styles.explanationHeader}>
                      <Feather name="info" size={15} color={colors.primaryAccent} />
                      <Text
                        style={[styles.explanationTitle, { color: colors.textColor }]}
                      >
                        Правильный ответ:{' '}
                        <Text style={{ color: '#22c55e' }}>{currentQ.correctAnswer}</Text>
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.explanationBody,
                        { color: colors.textColorSecondary },
                      ]}
                    >
                      {formatLatexToReadable(currentQ.explanation)}
                    </Text>

                    <TouchableOpacity
                      style={[styles.nextBtn, { backgroundColor: colors.primaryAccent }]}
                      onPress={handleNextQuestion}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.nextBtnText}>
                        {currentIndex + 1 < quiz.questions.length
                          ? 'Следующий вопрос'
                          : 'Посмотреть результаты'}
                      </Text>
                      <Feather name="arrow-right" size={16} color="#ffffff" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })()}
        </ScrollView>
      )}

      {/* PHASE 3: RESULTS */}
      {phase === 'results' && evaluation && quiz && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Score Header Card */}
          <View
            style={[
              styles.resultsHeaderCard,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View
              style={[
                styles.scoreCircle,
                {
                  borderColor:
                    evaluation.percentage >= 70
                      ? '#22c55e'
                      : evaluation.percentage >= 40
                      ? '#eab308'
                      : '#ef4444',
                },
              ]}
            >
              <Text style={[styles.scoreNumber, { color: colors.textColor }]}>
                {evaluation.score}/{evaluation.total}
              </Text>
              <Text
                style={[
                  styles.scorePercent,
                  {
                    color:
                      evaluation.percentage >= 70
                        ? '#22c55e'
                        : evaluation.percentage >= 40
                        ? '#eab308'
                        : '#ef4444',
                  },
                ]}
              >
                {evaluation.percentage}%
              </Text>
            </View>

            <Text style={[styles.resultsTitle, { color: colors.textColor }]}>
              {evaluation.percentage >= 80
                ? 'Превосходный результат!'
                : evaluation.percentage >= 50
                ? 'Хорошая работа, есть что закрепить!'
                : 'Нужно повторить материал'}
            </Text>
            <Text style={[styles.resultsSub, { color: colors.textColorSecondary }]}>
              Тест: {quiz.title}
            </Text>
          </View>

          {/* AI Knowledge Diagnostic: Strong & Weak Areas */}
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.cardTitle, { color: colors.textColor }]}>
              AI-Анализ знаний по темам
            </Text>

            {/* Strong Topics */}
            {evaluation.strongTopics.length > 0 && (
              <View style={[styles.topicBlock, { borderColor: '#22c55e' }]}>
                <View style={styles.topicRowTitle}>
                  <Feather name="check-circle" size={14} color="#22c55e" />
                  <Text style={[styles.topicLabel, { color: '#22c55e' }]}>Сильные стороны:</Text>
                </View>
                {evaluation.strongTopics.map((top, idx) => (
                  <Text key={idx} style={[styles.topicItem, { color: colors.textColor }]}>
                    • {top}
                  </Text>
                ))}
              </View>
            )}

            {/* Weak Topics */}
            {evaluation.weakTopics.length > 0 && (
              <View style={[styles.topicBlock, { borderColor: '#ef4444' }]}>
                <View style={styles.topicRowTitle}>
                  <Feather name="alert-circle" size={14} color="#ef4444" />
                  <Text style={[styles.topicLabel, { color: '#ef4444' }]}>
                    Слабые стороны (требуют внимания):
                  </Text>
                </View>
                {evaluation.weakTopics.map((top, idx) => (
                  <Text key={idx} style={[styles.topicItem, { color: colors.textColor }]}>
                    • {top}
                  </Text>
                ))}
              </View>
            )}

            {/* Recommendations */}
            <View style={styles.recommendationBox}>
              <Feather name="compass" size={15} color={colors.primaryAccent} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.recommendationTitle, { color: colors.textColor }]}>
                  Советы по подготовке:
                </Text>
                {evaluation.recommendations.map((rec, idx) => (
                  <Text
                    key={idx}
                    style={[styles.recommendationText, { color: colors.textColorSecondary }]}
                  >
                    {rec}
                  </Text>
                ))}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsBlock}>
            {evaluation.score < evaluation.total && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={handleDiscussWithAI}
                activeOpacity={0.8}
              >
                <Feather name="message-square" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Разобрать ошибки с ИИ</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
              onPress={() => setExportModalVisible(true)}
              activeOpacity={0.7}
            >
              <Feather name="share-2" size={16} color={colors.textColor} />
              <Text style={[styles.secondaryBtnText, { color: colors.textColor }]}>
                Экспорт теста (для учителя / печати)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryBtn,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
              onPress={() => setPhase('setup')}
              activeOpacity={0.7}
            >
              <Feather name="plus-circle" size={16} color={colors.textColor} />
              <Text style={[styles.secondaryBtnText, { color: colors.textColor }]}>
                Создать новый тест
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      {/* EXPORT MODAL */}
      {exportModalVisible && quiz && (
        <View style={styles.exportModalOverlay}>
          <View
            style={[
              styles.exportModalCard,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View style={styles.exportModalHeader}>
              <Text style={[styles.exportModalTitle, { color: colors.textColor }]}>
                Экспорт теста
              </Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}>
                <Feather name="x" size={20} color={colors.textColorSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.exportModalDesc, { color: colors.textColorSecondary }]}>
              Выберите формат бланка для распечатки или отправки ученикам:
            </Text>

            {/* Teacher Mode */}
            <View style={styles.exportOption}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportOptionName, { color: colors.textColor }]}>
                  Вариант для учителя
                </Text>
                <Text style={[styles.exportOptionSub, { color: colors.textColorSecondary }]}>
                  Вопросы + ключи ответов и пояснения в конце
                </Text>
              </View>
              <View style={styles.exportBtnGroup}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.background }]}
                  onPress={() => handleCopyExport('teacher')}
                >
                  <Feather name="copy" size={13} color={colors.textColor} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.primaryAccent }]}
                  onPress={() => handleShareExport('teacher')}
                >
                  <Feather name="share" size={13} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Student Mode */}
            <View style={styles.exportOption}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.exportOptionName, { color: colors.textColor }]}>
                  Бланк для учеников
                </Text>
                <Text style={[styles.exportOptionSub, { color: colors.textColorSecondary }]}>
                  Только задания и варианты без ответов
                </Text>
              </View>
              <View style={styles.exportBtnGroup}>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.background }]}
                  onPress={() => handleCopyExport('student')}
                >
                  <Feather name="copy" size={13} color={colors.textColor} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.primaryAccent }]}
                  onPress={() => handleShareExport('student')}
                >
                  <Feather name="share" size={13} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {copiedExport && (
              <Text style={styles.copiedBanner}>Тест успешно скопирован в буфер обмена!</Text>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  topicInput: {
    minHeight: 80,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
    textAlignVertical: 'top',
  },
  attachRow: {
    flexDirection: 'row',
    gap: 10,
  },
  attachBtn: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  attachText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  imagePreviewWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  attachedThumbnail: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  attachedInfo: {
    flex: 1,
    gap: 2,
  },
  attachedName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  attachedDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  removeImageBtn: {
    padding: 6,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#ef444422',
  },
  errorText: {
    color: '#ef4444',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  primaryBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  secondaryBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  questionCard: {
    padding: 18,
    borderRadius: 18,
    borderWidth: 1,
    gap: 16,
  },
  topicBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#6366f115',
  },
  topicBadgeText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11,
  },
  questionText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
    lineHeight: 24,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  letterCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  letterText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  optionText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  openInputWrap: {
    gap: 10,
  },
  openInput: {
    height: 48,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  openSubmitBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openSubmitText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  explanationBox: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginTop: 6,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  explanationTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  explanationBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
  },
  nextBtn: {
    height: 44,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  nextBtnText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  resultsHeaderCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 8,
  },
  scoreCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  scoreNumber: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
  },
  scorePercent: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  resultsTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
  },
  resultsSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  topicBlock: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  topicRowTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topicLabel: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  topicItem: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    marginLeft: 6,
  },
  recommendationBox: {
    flexDirection: 'row',
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#6366f115',
  },
  recommendationTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  recommendationText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  actionsBlock: {
    gap: 10,
  },
  exportModalOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  exportModalCard: {
    width: '100%',
    maxWidth: 400,
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    gap: 16,
  },
  exportModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exportModalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  exportModalDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#374151',
    gap: 10,
  },
  exportOptionName: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  exportOptionSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
  },
  exportBtnGroup: {
    flexDirection: 'row',
    gap: 6,
  },
  smallBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copiedBanner: {
    color: '#22c55e',
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
});
