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
  Modal,
  SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../theme';
import { useAuth } from '../../../context/AuthContext';
import { AppHeader } from '../../../components/common/AppHeader';
import { PressableScale } from '../../../components/common/PressableScale';
import { AIAuthGate } from '../components/AIAuthGate';
import { AuthNavigator } from '../../auth/AuthNavigator';
import { performGoogleSignIn } from '../../../services/googleAuth';
import { ToolsStackParamList } from '../../../navigation/types';
import {
  Quiz,
  QuizEvaluation,
  generateQuizFromAI,
  evaluateQuiz,
  evaluateQuizAsync,
  evaluateOpenEndedAnswerWithAI,
  formatQuizForExport,
  formatQuizToHtmlPrintable,
  exportQuizToPdfAsync,
  exportQuizToDocxAsync,
} from '../../../services/quizService';
import { formatLatexToReadable } from '../utils/latexFormatter';

type NavProp = NativeStackNavigationProp<ToolsStackParamList>;

export const QuizGeneratorScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();
  const { user } = useAuth();
  const isRegisteredUser = Boolean(user && !user.isAnonymous && !user.isOfflineDemo);

  // Auth gate modal state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authInitialScreen, setAuthInitialScreen] = useState<'login' | 'register'>('login');
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);

  // Phases: 'setup' | 'playing' | 'results'
  const [phase, setPhase] = useState<'setup' | 'playing' | 'results'>('setup');

  // Setup state
  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(5);
  const [quizType, setQuizType] = useState<'multiple_choice' | 'open_ended' | 'mixed'>('multiple_choice');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [attachedImage, setAttachedImage] = useState<{ uri: string; base64: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStatusText, setGenStatusText] = useState('Подготовка параметров теста...');
  const [genError, setGenError] = useState<string | null>(null);

  // Playing state
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [openInputText, setOpenInputText] = useState('');
  const [showExplanation, setShowExplanation] = useState(false);
  const [isEvaluatingOpen, setIsEvaluatingOpen] = useState(false);
  const [openAnswerEvaluation, setOpenAnswerEvaluation] = useState<{ isCorrect: boolean; feedback: string } | null>(null);
  const [isEvaluatingQuiz, setIsEvaluatingQuiz] = useState(false);

  // Results state
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [copiedExport, setCopiedExport] = useState(false);
  const [exportLoading, setExportLoading] = useState<string | null>(null);
  const [exportBanner, setExportBanner] = useState<string | null>(null);

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

  const handleGoogleSignInFromGate = async () => {
    setIsGoogleSigningIn(true);
    try {
      const res = await performGoogleSignIn();
      if (res?.success && res.user?.uid) {
        setShowAuthModal(false);
      }
    } catch (e) {
      console.warn('[QuizGenerator] Google sign-in gate error:', e);
    } finally {
      setIsGoogleSigningIn(false);
    }
  };

  // Generate Quiz
  const handleGenerate = async () => {
    if (!isRegisteredUser) {
      setAuthInitialScreen('login');
      setShowAuthModal(true);
      return;
    }

    if (!topic.trim() && !attachedImage) {
      setGenError('Пожалуйста, укажите тему или прикрепите фото билета/задач.');
      return;
    }

    setGenError(null);
    setIsGenerating(true);
    setGenStatusText('Анализ параметров темы и подготовка промпта...');

    const timer1 = setTimeout(() => {
      setGenStatusText('Генерация вопросов, вариантов и формул с ИИ...');
    }, 1200);

    const timer2 = setTimeout(() => {
      setGenStatusText('Верификация ключей и составление пояснений...');
    }, 3800);

    try {
      const generated = await generateQuizFromAI({
        topic: topic.trim(),
        questionCount,
        type: quizType,
        difficulty,
        imageBase64: attachedImage?.base64,
      });

      clearTimeout(timer1);
      clearTimeout(timer2);
      setQuiz(generated);
      setCurrentIndex(0);
      setUserAnswers({});
      setSelectedOption(null);
      setOpenInputText('');
      setShowExplanation(false);
      setOpenAnswerEvaluation(null);
      setPhase('playing');
    } catch (err: any) {
      clearTimeout(timer1);
      clearTimeout(timer2);
      setGenError(err?.message || 'Ошибка генерации теста. Пожалуйста, проверьте тему и повторите попытку.');
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

  const handleSubmitOpenEnded = async () => {
    if (!openInputText.trim() || showExplanation || isEvaluatingOpen) return;
    const q = quiz?.questions[currentIndex];
    if (!q) return;

    setIsEvaluatingOpen(true);
    const answer = openInputText.trim();
    setUserAnswers((prev) => ({ ...prev, [q.id]: answer }));

    try {
      const aiEval = await evaluateOpenEndedAnswerWithAI(q, answer);
      setOpenAnswerEvaluation(aiEval);
    } catch (e) {
      setOpenAnswerEvaluation(null);
    } finally {
      setIsEvaluatingOpen(false);
      setShowExplanation(true);
    }
  };

  // Navigation between questions
  const handleNextQuestion = async () => {
    if (!quiz) return;

    if (currentIndex + 1 < quiz.questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setOpenInputText('');
      setShowExplanation(false);
      setOpenAnswerEvaluation(null);
    } else {
      // Finished Quiz -> Evaluate with AI grading for open-ended questions
      setIsEvaluatingQuiz(true);
      try {
        const evalResult = await evaluateQuizAsync(quiz, userAnswers);
        setEvaluation(evalResult);
      } catch (e) {
        const fallbackEval = evaluateQuiz(quiz, userAnswers);
        setEvaluation(fallbackEval);
      } finally {
        setIsEvaluatingQuiz(false);
        setPhase('results');
      }
    }
  };

  // Export Quiz
  const handleExportPdf = async (mode: 'teacher' | 'student') => {
    if (!quiz) return;
    setExportLoading(`pdf_${mode}`);
    try {
      await exportQuizToPdfAsync(quiz, mode);
      setExportBanner('PDF бланк успешно сформирован!');
      setTimeout(() => setExportBanner(null), 3000);
    } catch (err: any) {
      console.warn('Export PDF error:', err);
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportDocx = async (mode: 'teacher' | 'student') => {
    if (!quiz) return;
    setExportLoading(`docx_${mode}`);
    try {
      await exportQuizToDocxAsync(quiz, mode);
      setExportBanner('Word (.doc) документ успешно сохранен!');
      setTimeout(() => setExportBanner(null), 3000);
    } catch (err: any) {
      console.warn('Export DOCX error:', err);
    } finally {
      setExportLoading(null);
    }
  };

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

  const handleShareHtmlExport = async (mode: 'teacher' | 'student') => {
    if (!quiz) return;
    const html = formatQuizToHtmlPrintable(quiz, mode);
    try {
      await Share.share({
        message: html,
        title: `${quiz.title} (Бланк печати / PDF)`,
      });
    } catch (err) {
      console.warn('Share HTML error:', err);
    }
  };

  // Navigate to AI Assistant to discuss missed questions
  const handleDiscussWithAI = () => {
    if (!evaluation || !quiz) return;
    const wrongQuestions = evaluation.detailedResults
      .filter((r) => !r.isCorrect)
      .map(
        (r, i) =>
          `${i + 1}. Вопрос: "${r.question.question}". Мой ответ: "${r.userAnswer || 'нет ответа'}". Правильный: "${r.question.correctAnswer}". Пояснение[...]
      )
      .join('\n\n');

    const prompt = `Привет! Я прошел тест "${quiz.title}" и набрал ${evaluation.score} из ${evaluation.total}. Помоги разобрать мои ошибки и о�[...]`;

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
        !isRegisteredUser ? (
          <AIAuthGate
            onOpenAuth={(mode) => {
              setAuthInitialScreen(mode || 'login');
              setShowAuthModal(true);
            }}
            onGoogleSignIn={handleGoogleSignInFromGate}
            isGoogleLoading={isGoogleSigningIn}
          />
        ) : (
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
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={styles.errorText}>{genError}</Text>
                </View>
              </View>
            )}

            {/* Generate Button or Active Generation Progress Card */}
            {isGenerating ? (
              <View
                style={[
                  styles.generatingCard,
                  {
                    backgroundColor: colors.componentBackground,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <View
                  style={[
                    styles.generatingIconCircle,
                    { backgroundColor: colors.primaryAccent + '18' },
                  ]}
                >
                  <ActivityIndicator size="large" color={colors.primaryAccent} />
                </View>

                <Text style={[styles.generatingTitle, { color: colors.textColor }]}>
                  ИИ составляет тест...
                </Text>
                <Text style={[styles.generatingSubtitle, { color: colors.textColorSecondary }]}>
                  Тема: «{topic.trim() || 'По материалам фото'}»
                </Text>

                {/* Real-time Stage Status */}
                <View
                  style={[
                    styles.activeStatusBox,
                    {
                      backgroundColor: colors.background,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <ActivityIndicator size="small" color={colors.primaryAccent} />
                  <Text style={[styles.activeStatusText, { color: colors.textColor }]}>
                    {genStatusText}
                  </Text>
                </View>

                <View
                  style={[
                    styles.generatingNote,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.borderColor,
                    },
                  ]}
                >
                  <Feather name="info" size={13} color={colors.primaryAccent} />
                  <Text style={[styles.generatingNoteText, { color: colors.textColorSecondary }]}>
                    Нейросеть генерирует уникальные вопросы, ключи и формулы LaTeX. В случае высокой нагрузки автомат[...]
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={handleGenerate}
                activeOpacity={0.8}
              >
                <Feather name="zap" size={18} color="#ffffff" />
                <Text style={styles.primaryBtnText}>Сгенерировать тест с ИИ</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )
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
                      placeholder="Введите ваш ответ своими словами..."
                      placeholderTextColor={colors.textColorSecondary}
                      value={openInputText}
                      onChangeText={setOpenInputText}
                      editable={!showExplanation && !isEvaluatingOpen}
                    />

                    {isEvaluatingOpen && (
                      <View style={styles.evaluatingOpenRow}>
                        <ActivityIndicator size="small" color={colors.primaryAccent} />
                        <Text style={[styles.evaluatingOpenText, { color: colors.textColorSecondary }]}>
                          ИИ проверяет смысл ответа...
                        </Text>
                      </View>
                    )}

                    {!showExplanation && !isEvaluatingOpen && (
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
                        <Text style={styles.openSubmitText}>Проверить ответ с ИИ</Text>
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
                    {/* Semantic grading verdict for open-ended questions */}
                    {openAnswerEvaluation && (
                      <View
                        style={[
                          styles.aiVerdictCard,
                          {
                            backgroundColor: openAnswerEvaluation.isCorrect
                              ? 'rgba(34, 197, 94, 0.12)'
                              : 'rgba(239, 68, 68, 0.12)',
                            borderColor: openAnswerEvaluation.isCorrect ? '#22c55e' : '#ef4444',
                          },
                        ]}
                      >
                        <View style={styles.aiVerdictHeader}>
                          <Feather
                            name={openAnswerEvaluation.isCorrect ? 'check-circle' : 'alert-circle'}
                            size={14}
                            color={openAnswerEvaluation.isCorrect ? '#22c55e' : '#ef4444'}
                          />
                          <Text
                            style={[
                              styles.aiVerdictTitle,
                              { color: openAnswerEvaluation.isCorrect ? '#22c55e' : '#ef4444' },
                            ]}
                          >
                            {openAnswerEvaluation.isCorrect
                              ? 'Смысл ответа верный (зачтено)'
                              : 'Ответ не совсем точен'}
                          </Text>
                        </View>
                        <Text style={[styles.aiVerdictBody, { color: colors.textColor }]}>
                          {openAnswerEvaluation.feedback}
                        </Text>
                      </View>
                    )}

                    <View style={styles.explanationHeader}>
                      <Feather name="info" size={15} color={colors.primaryAccent} />
                      <Text
                        style={[styles.explanationTitle, { color: colors.textColor }]}
                      >
                        Эталонный ответ:{' '}
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
                      disabled={isEvaluatingQuiz}
                      activeOpacity={0.8}
                    >
                      {isEvaluatingQuiz ? (
                        <ActivityIndicator size="small" color="#ffffff" />
                      ) : (
                        <>
                          <Text style={styles.nextBtnText}>
                            {currentIndex + 1 < quiz.questions.length
                              ? 'Следующий вопрос'
                              : 'Посмотреть результаты'}
                          </Text>
                          <Feather name="arrow-right" size={16} color="#ffffff" />
                        </>
                      )}
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

          {/* Quick PDF & Word Export Bar */}
          <View
            style={[
              styles.quickExportCard,
              {
                backgroundColor: colors.componentBackground,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <Text style={[styles.quickExportTitle, { color: colors.textColor }]}>
              Скачать тест
            </Text>
            <View style={styles.quickExportRow}>
              <TouchableOpacity
                style={[
                  styles.quickExportBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={() => handleExportPdf('teacher')}
                activeOpacity={0.7}
              >
                {exportLoading === 'pdf_teacher' ? (
                  <ActivityIndicator size="small" color={colors.primaryAccent} />
                ) : (
                  <>
                    <Feather name="file-text" size={15} color={colors.primaryAccent} />
                    <Text style={[styles.quickExportBtnText, { color: colors.textColor }]}>
                      Скачать в PDF
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.quickExportBtn,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderColor,
                  },
                ]}
                onPress={() => handleExportDocx('teacher')}
                activeOpacity={0.7}
              >
                {exportLoading === 'docx_teacher' ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <>
                    <Feather name="file" size={15} color="#2563eb" />
                    <Text style={[styles.quickExportBtnText, { color: colors.textColor }]}>
                      В Word (.doc)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {exportBanner && (
              <View style={styles.exportSuccessPill}>
                <Feather name="check" size={12} color="#22c55e" />
                <Text style={styles.exportSuccessPillText}>{exportBanner}</Text>
              </View>
            )}
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
                Все форматы экспорта (PDF, Word, печать)
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
              Скачайте файл в формате PDF, Word (.doc) или скопируйте бланк:
            </Text>

            {/* Teacher Mode */}
            <View style={[styles.exportOption, { borderColor: colors.borderColor }]}>
              <View style={{ flex: 1, marginBottom: 8 }}>
                <Text style={[styles.exportOptionName, { color: colors.textColor }]}>
                  Вариант для преподавателя
                </Text>
                <Text style={[styles.exportOptionSub, { color: colors.textColorSecondary }]}>
                  Вопросы + ключи ответов, темы и подробные пояснения
                </Text>
              </View>
              <View style={styles.exportBtnGroup}>
                <TouchableOpacity
                  style={[styles.actionExportBtn, { backgroundColor: colors.background, borderColor: colors.borderColor }]}
                  onPress={() => handleExportPdf('teacher')}
                  accessibilityLabel="Скачать в PDF"
                >
                  {exportLoading === 'pdf_teacher' ? (
                    <ActivityIndicator size="small" color={colors.primaryAccent} />
                  ) : (
                    <>
                      <Feather name="file-text" size={13} color={colors.primaryAccent} />
                      <Text style={[styles.actionExportText, { color: colors.textColor }]}>PDF</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionExportBtn, { backgroundColor: colors.background, borderColor: colors.borderColor }]}
                  onPress={() => handleExportDocx('teacher')}
                  accessibilityLabel="Скачать в Word"
                >
                  {exportLoading === 'docx_teacher' ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <>
                      <Feather name="file" size={13} color="#2563eb" />
                      <Text style={[styles.actionExportText, { color: colors.textColor }]}>Word</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.background }]}
                  onPress={() => handleCopyExport('teacher')}
                  accessibilityLabel="Скопировать"
                >
                  <Feather name="copy" size={13} color={colors.textColor} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.background }]}
                  onPress={() => handleShareHtmlExport('teacher')}
                  accessibilityLabel="Печать"
                >
                  <Feather name="printer" size={13} color={colors.primaryAccent} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.primaryAccent }]}
                  onPress={() => handleShareExport('teacher')}
                  accessibilityLabel="Поделиться"
                >
                  <Feather name="share-2" size={13} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Student Mode */}
            <View style={[styles.exportOption, { borderColor: colors.borderColor }]}>
              <View style={{ flex: 1, marginBottom: 8 }}>
                <Text style={[styles.exportOptionName, { color: colors.textColor }]}>
                  Бланк для учеников
                </Text>
                <Text style={[styles.exportOptionSub, { color: colors.textColorSecondary }]}>
                  Чистые задания для самостоятельного решения или контрольной
                </Text>
              </View>
              <View style={styles.exportBtnGroup}>
                <TouchableOpacity
                  style={[styles.actionExportBtn, { backgroundColor: colors.background, borderColor: colors.borderColor }]}
                  onPress={() => handleExportPdf('student')}
                  accessibilityLabel="Скачать в PDF"
                >
                  {exportLoading === 'pdf_student' ? (
                    <ActivityIndicator size="small" color={colors.primaryAccent} />
                  ) : (
                    <>
                      <Feather name="file-text" size={13} color={colors.primaryAccent} />
                      <Text style={[styles.actionExportText, { color: colors.textColor }]}>PDF</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionExportBtn, { backgroundColor: colors.background, borderColor: colors.borderColor }]}
                  onPress={() => handleExportDocx('student')}
                  accessibilityLabel="Скачать в Word"
                >
                  {exportLoading === 'docx_student' ? (
                    <ActivityIndicator size="small" color="#2563eb" />
                  ) : (
                    <>
                      <Feather name="file" size={13} color="#2563eb" />
                      <Text style={[styles.actionExportText, { color: colors.textColor }]}>Word</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.background }]}
                  onPress={() => handleCopyExport('student')}
                  accessibilityLabel="Скопировать"
                >
                  <Feather name="copy" size={13} color={colors.textColor} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.background }]}
                  onPress={() => handleShareHtmlExport('student')}
                  accessibilityLabel="Печать"
                >
                  <Feather name="printer" size={13} color={colors.primaryAccent} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.smallBtn, { backgroundColor: colors.primaryAccent }]}
                  onPress={() => handleShareExport('student')}
                  accessibilityLabel="Поделиться"
                >
                  <Feather name="share-2" size={13} color="#ffffff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Export formats explanation */}
            <View style={[styles.exportHintBox, { backgroundColor: colors.background }]}>
              <Feather name="info" size={12} color={colors.primaryAccent} />
              <Text style={[styles.exportHintText, { color: colors.textColorSecondary }]}>
                PDF и Word (.doc) скачиваются на устройство и поддерживают открытие в Word, Google Docs и печать.
              </Text>
            </View>

            {copiedExport && (
              <Text style={styles.copiedBanner}>Тест успешно скопирован в буфер обмена!</Text>
            )}
            {exportBanner && (
              <Text style={[styles.copiedBanner, { backgroundColor: '#22c55e22', color: '#22c55e' }]}>
                {exportBanner}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Auth Modal (Login / Register) */}
      <Modal
        visible={showAuthModal && !isRegisteredUser}
        animationType="slide"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <SafeAreaView style={[styles.authModalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.authModalHeader, { borderBottomColor: colors.borderColor }]}>
            <PressableScale
              style={[styles.authModalCloseBtn, { backgroundColor: colors.componentBackground }]}
              onPress={() => setShowAuthModal(false)}
              accessibilityLabel="Закрыть"
            >
              <Feather name="x" size={20} color={colors.textColor} />
            </PressableScale>
            <Text style={[styles.authModalTitle, { color: colors.textColor }]}>
              {authInitialScreen === 'register' ? 'Регистрация' : 'Вход в аккаунт'}
            </Text>
            <View style={{ width: 36 }} />
          </View>
          <AuthNavigator initialScreen={authInitialScreen} />
        </SafeAreaView>
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
  exportHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
    marginTop: 4,
  },
  exportHintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  generatingCard: {
    padding: 24,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    gap: 12,
  },
  generatingIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  generatingTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  generatingSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 8,
  },
  stepsList: {
    width: '100%',
    gap: 12,
    paddingVertical: 8,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    color: '#ffffff',
    fontSize: 10,
    fontFamily: 'Poppins_600SemiBold',
    fontWeight: '700',
  },
  stepText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    flex: 1,
  },
  generatingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
    width: '100%',
  },
  generatingNoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 15,
    flex: 1,
  },
  evaluatingOpenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  evaluatingOpenText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  aiVerdictCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  aiVerdictHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aiVerdictTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  aiVerdictBody: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  quickExportCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
  },
  quickExportTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
  quickExportRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickExportBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickExportBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  exportSuccessPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#22c55e15',
    alignSelf: 'flex-start',
  },
  exportSuccessPillText: {
    color: '#22c55e',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  actionExportBtn: {
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  actionExportText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  activeStatusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
  },
  activeStatusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    flex: 1,
  },
  authModalContainer: {
    flex: 1,
  },
  authModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  authModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authModalTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
});
