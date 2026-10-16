import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme/useTheme';
import { ToolsStackParamList } from '../../../navigation/types';
import {
  Quiz,
  QuizEvaluation,
  evaluateQuizAsync,
  evaluateOpenEndedAnswerWithAI,
  exportQuizToPdfAsync,
  exportQuizToDocxAsync,
} from '../../../services/quizService';
import { formatLatexToReadable } from '../utils/latexFormatter';

export interface ChatQuizCardProps {
  title?: string;
  questionCount?: number;
  difficulty?: string;
  quiz?: Quiz;
}

type NavProp = NativeStackNavigationProp<ToolsStackParamList>;

export const ChatQuizCard: React.FC<ChatQuizCardProps> = ({
  title,
  questionCount,
  difficulty,
  quiz,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();

  // Interactive runner state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [openInputText, setOpenInputText] = useState('');
  const [isCheckingOpenAnswer, setIsCheckingOpenAnswer] = useState(false);
  const [openAnswerFeedback, setOpenAnswerFeedback] = useState<{
    isCorrect: boolean;
    feedback: string;
  } | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isEvaluatingFullQuiz, setIsEvaluatingFullQuiz] = useState(false);
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  const effectiveQuiz: Quiz | null = quiz || null;
  const questionsCount = effectiveQuiz?.questions?.length || questionCount || 5;
  const displayTitle = effectiveQuiz?.title || title || 'Интерактивный тест';
  const displayDiff = effectiveQuiz?.difficulty || difficulty || 'medium';

  const diffLabel =
    displayDiff === 'easy'
      ? 'Базовый'
      : displayDiff === 'hard'
      ? 'Олимпиадный / Экзамен'
      : 'Средний';

  const handleOpenFullscreen = () => {
    navigation.navigate('QuizGenerator');
  };

  const handleStartInChat = () => {
    if (!effectiveQuiz || !effectiveQuiz.questions || effectiveQuiz.questions.length === 0) {
      handleOpenFullscreen();
      return;
    }
    setIsPlaying(true);
    setCurrentIndex(0);
    setUserAnswers({});
    setSelectedOption(null);
    setOpenInputText('');
    setOpenAnswerFeedback(null);
    setShowExplanation(false);
    setIsFinished(false);
    setEvaluation(null);
  };

  const currentQ = effectiveQuiz?.questions?.[currentIndex];

  // Option selection
  const handleSelectOption = (opt: string) => {
    if (showExplanation || !currentQ) return;
    setSelectedOption(opt);
    setShowExplanation(true);
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: opt }));
  };

  // Open-ended submission with AI grading
  const handleSubmitOpenAnswer = async () => {
    if (!openInputText.trim() || showExplanation || isCheckingOpenAnswer || !currentQ) return;

    setIsCheckingOpenAnswer(true);
    const text = openInputText.trim();
    setUserAnswers((prev) => ({ ...prev, [currentQ.id]: text }));

    try {
      const result = await evaluateOpenEndedAnswerWithAI(currentQ, text);
      setOpenAnswerFeedback(result);
    } catch {
      setOpenAnswerFeedback({
        isCorrect: text.toLowerCase().includes(currentQ.correctAnswer.toLowerCase()),
        feedback: 'Ответ проверен.',
      });
    } finally {
      setIsCheckingOpenAnswer(false);
      setShowExplanation(true);
    }
  };

  // Next Question / Finish
  const handleNextQuestion = async () => {
    if (!effectiveQuiz) return;

    if (currentIndex + 1 < effectiveQuiz.questions.length) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setOpenInputText('');
      setOpenAnswerFeedback(null);
      setShowExplanation(false);
    } else {
      // Evaluate full test
      setIsEvaluatingFullQuiz(true);
      try {
        const result = await evaluateQuizAsync(effectiveQuiz, userAnswers);
        setEvaluation(result);
      } catch {
        // Fallback
        const fallback = await evaluateQuizAsync(effectiveQuiz, userAnswers);
        setEvaluation(fallback);
      } finally {
        setIsEvaluatingFullQuiz(false);
        setIsFinished(true);
        setIsPlaying(false);
      }
    }
  };

  // Export handlers
  const handleExportPdf = async () => {
    if (!effectiveQuiz) return;
    setExportStatus('Формируем PDF...');
    try {
      await exportQuizToPdfAsync(effectiveQuiz, 'student');
      setExportStatus('PDF готов');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (e: any) {
      setExportStatus('Ошибка экспорта');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  const handleExportDocx = async () => {
    if (!effectiveQuiz) return;
    setExportStatus('Формируем Word (.doc)...');
    try {
      await exportQuizToDocxAsync(effectiveQuiz, 'student');
      setExportStatus('Word документ сохранен');
      setTimeout(() => setExportStatus(null), 3000);
    } catch (e: any) {
      setExportStatus('Ошибка экспорта');
      setTimeout(() => setExportStatus(null), 3000);
    }
  };

  // 1. FINISHED RESULTS STATE
  if (isFinished && evaluation) {
    const isSuccess = evaluation.percentage >= 60;
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: isSuccess ? '#22c55e' : '#f59e0b',
          },
        ]}
      >
        <View style={styles.topRow}>
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: isSuccess ? 'rgba(34, 197, 94, 0.2)' : 'rgba(245, 158, 11, 0.2)' },
            ]}
          >
            <Feather
              name={isSuccess ? 'award' : 'alert-circle'}
              size={20}
              color={isSuccess ? '#22c55e' : '#f59e0b'}
            />
          </View>
          <View style={styles.infoCol}>
            <Text style={[styles.title, { color: colors.textColor }]}>Результаты тестирования</Text>
            <Text style={[styles.meta, { color: colors.textColorSecondary }]}>
              {displayTitle} • {evaluation.score} из {evaluation.total} ({evaluation.percentage}%)
            </Text>
          </View>
        </View>

        {/* Score pill */}
        <View
          style={[
            styles.scoreCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Text style={[styles.scoreBigText, { color: isSuccess ? '#22c55e' : '#f59e0b' }]}>
            {evaluation.percentage}%
          </Text>
          <Text style={[styles.scoreDesc, { color: colors.textColor }]}>
            {isSuccess
              ? 'Отличный результат! Материал успешно усвоен.'
              : 'Рекомендуется повторить ключевые темы раздела.'}
          </Text>
        </View>

        {/* Recommendations */}
        {evaluation.recommendations.length > 0 && (
          <View style={styles.recContainer}>
            {evaluation.recommendations.map((rec, rIdx) => (
              <Text key={`rec-${rIdx}`} style={[styles.recText, { color: colors.textColorSecondary }]}>
                • {rec}
              </Text>
            ))}
          </View>
        )}

        {/* Export status */}
        {exportStatus && (
          <Text style={[styles.statusText, { color: colors.primaryAccent }]}>{exportStatus}</Text>
        )}

        {/* Actions */}
        <View style={styles.exportRow}>
          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}
            onPress={handleExportPdf}
            activeOpacity={0.7}
          >
            <Feather name="file-text" size={14} color={colors.primaryAccent} />
            <Text style={[styles.exportBtnText, { color: colors.textColor }]}>PDF</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.componentBackground, borderColor: colors.borderColor }]}
            onPress={handleExportDocx}
            activeOpacity={0.7}
          >
            <Feather name="file" size={14} color={colors.primaryAccent} />
            <Text style={[styles.exportBtnText, { color: colors.textColor }]}>Word</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.exportBtn, { backgroundColor: colors.primaryAccent, borderColor: colors.primaryAccent }]}
            onPress={handleStartInChat}
            activeOpacity={0.7}
          >
            <Feather name="rotate-ccw" size={14} color="#ffffff" />
            <Text style={[styles.exportBtnText, { color: '#ffffff' }]}>Заново</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 2. ACTIVE QUESTION PLAYING STATE
  if (isPlaying && currentQ) {
    const isMultiple = currentQ.type === 'multiple_choice';
    const isAnswered = showExplanation;
    const isLastQuestion = currentIndex + 1 >= (effectiveQuiz?.questions?.length || 0);

    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderColor,
          },
        ]}
      >
        {/* Header Progress */}
        <View style={styles.runnerHeader}>
          <View style={styles.badgeRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.componentBackground }]}>
              <Text style={[styles.stepBadgeText, { color: colors.primaryAccent }]}>
                Вопрос {currentIndex + 1} из {questionsCount}
              </Text>
            </View>
            <Text style={[styles.topicPill, { color: colors.textColorSecondary }]}>
              {currentQ.topic || diffLabel}
            </Text>
          </View>
          <TouchableOpacity onPress={() => setIsPlaying(false)} activeOpacity={0.7}>
            <Feather name="x" size={18} color={colors.textColorSecondary} />
          </TouchableOpacity>
        </View>

        {/* Question Text */}
        <Text style={[styles.questionText, { color: colors.textColor }]}>
          {formatLatexToReadable(currentQ.question)}
        </Text>

        {/* Multiple Choice Options */}
        {isMultiple && currentQ.options && (
          <View style={styles.optionsList}>
            {currentQ.options.map((opt, oIdx) => {
              const letter = String.fromCharCode(65 + oIdx);
              const isSelected = selectedOption === opt;
              const isCorrectOpt = opt.toLowerCase() === currentQ.correctAnswer.toLowerCase();

              let optBg = colors.componentBackground;
              let optBorder = colors.borderColor;
              let optTextColor = colors.textColor;

              if (isAnswered) {
                if (isCorrectOpt) {
                  optBg = 'rgba(34, 197, 94, 0.15)';
                  optBorder = '#22c55e';
                  optTextColor = '#22c55e';
                } else if (isSelected && !isCorrectOpt) {
                  optBg = 'rgba(239, 68, 68, 0.15)';
                  optBorder = '#ef4444';
                  optTextColor = '#ef4444';
                }
              } else if (isSelected) {
                optBorder = colors.primaryAccent;
              }

              return (
                <TouchableOpacity
                  key={`opt-${oIdx}`}
                  style={[styles.optionItem, { backgroundColor: optBg, borderColor: optBorder }]}
                  onPress={() => handleSelectOption(opt)}
                  disabled={isAnswered}
                  activeOpacity={0.75}
                >
                  <View style={[styles.optionLetterBox, { borderColor: optBorder }]}>
                    <Text style={[styles.optionLetterText, { color: optTextColor }]}>{letter}</Text>
                  </View>
                  <Text style={[styles.optionText, { color: optTextColor }]}>
                    {formatLatexToReadable(opt)}
                  </Text>
                  {isAnswered && isCorrectOpt && (
                    <Feather name="check" size={16} color="#22c55e" />
                  )}
                  {isAnswered && isSelected && !isCorrectOpt && (
                    <Feather name="x" size={16} color="#ef4444" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Open-ended Question Input */}
        {!isMultiple && (
          <View style={styles.openInputContainer}>
            <TextInput
              style={[
                styles.openTextInput,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                  color: colors.textColor,
                },
              ]}
              placeholder="Напишите ответ своими словами..."
              placeholderTextColor={colors.textColorSecondary}
              value={openInputText}
              onChangeText={setOpenInputText}
              editable={!isAnswered && !isCheckingOpenAnswer}
              multiline
            />
            {!isAnswered && (
              <TouchableOpacity
                style={[
                  styles.checkAnswerBtn,
                  {
                    backgroundColor: colors.primaryAccent,
                    opacity: !openInputText.trim() || isCheckingOpenAnswer ? 0.6 : 1,
                  },
                ]}
                onPress={handleSubmitOpenAnswer}
                disabled={!openInputText.trim() || isCheckingOpenAnswer}
                activeOpacity={0.8}
              >
                {isCheckingOpenAnswer ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <>
                    <Feather name="check-circle" size={15} color="#ffffff" />
                    <Text style={styles.checkAnswerBtnText}>Проверить с помощью ИИ</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Explanation & AI Feedback */}
        {isAnswered && (
          <View
            style={[
              styles.explanationBox,
              {
                backgroundColor: colors.componentBackground,
                borderColor: openAnswerFeedback
                  ? openAnswerFeedback.isCorrect
                    ? '#22c55e'
                    : '#f59e0b'
                  : colors.borderColor,
              },
            ]}
          >
            {openAnswerFeedback && (
              <View style={styles.feedbackRow}>
                <Feather
                  name={openAnswerFeedback.isCorrect ? 'check-circle' : 'alert-circle'}
                  size={15}
                  color={openAnswerFeedback.isCorrect ? '#22c55e' : '#f59e0b'}
                />
                <Text
                  style={[
                    styles.feedbackTitle,
                    { color: openAnswerFeedback.isCorrect ? '#22c55e' : '#f59e0b' },
                  ]}
                >
                  {openAnswerFeedback.isCorrect ? 'Ответ зачтен!' : 'Ответ не совсем точный'}
                </Text>
              </View>
            )}
            {openAnswerFeedback?.feedback ? (
              <Text style={[styles.feedbackSub, { color: colors.textColorSecondary }]}>
                {openAnswerFeedback.feedback}
              </Text>
            ) : null}

            <Text style={[styles.expLabel, { color: colors.primaryAccent }]}>
              Правильный ответ: {currentQ.correctAnswer}
            </Text>
            {currentQ.explanation ? (
              <Text style={[styles.expText, { color: colors.textColorSecondary }]}>
                {formatLatexToReadable(currentQ.explanation)}
              </Text>
            ) : null}
          </View>
        )}

        {/* Bottom Navigation */}
        {isAnswered && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: colors.primaryAccent }]}
            onPress={handleNextQuestion}
            disabled={isEvaluatingFullQuiz}
            activeOpacity={0.8}
          >
            {isEvaluatingFullQuiz ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {isLastQuestion ? 'Завершить тест и показать итог' : 'Следующий вопрос'}
                </Text>
                <Feather name={isLastQuestion ? 'award' : 'arrow-right'} size={16} color="#ffffff" />
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // 3. INITIAL PREVIEW CARD STATE (Inside Chat)
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#1e1b4b',
          borderColor: '#4338ca',
        },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Feather name="check-circle" size={18} color="#c7d2fe" />
        </View>
        <View style={styles.infoCol}>
          <Text style={styles.title}>{displayTitle}</Text>
          <Text style={styles.meta}>
            {questionsCount} вопросов • Сложность: {diffLabel}
          </Text>
        </View>
      </View>

      {effectiveQuiz?.description ? (
        <Text style={styles.descText} numberOfLines={2}>
          {effectiveQuiz.description}
        </Text>
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.startBtn, { backgroundColor: colors.primaryAccent }]}
          onPress={effectiveQuiz ? handleStartInChat : handleOpenFullscreen}
          activeOpacity={0.8}
        >
          <Feather name="play" size={15} color="#ffffff" />
          <Text style={styles.startBtnText}>Пройти тест прямо в чате</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fullscreenBtn}
          onPress={handleOpenFullscreen}
          activeOpacity={0.7}
        >
          <Feather name="maximize-2" size={15} color="#c7d2fe" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3730a3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  meta: {
    color: '#c7d2fe',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  descText: {
    color: '#e0e7ff',
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  startBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startBtnText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  fullscreenBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  runnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    fontSize: 11,
    fontFamily: 'Poppins_600SemiBold',
  },
  topicPill: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  questionText: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    lineHeight: 22,
  },
  optionsList: {
    gap: 8,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 11,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  optionLetterBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLetterText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
  optionText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  openInputContainer: {
    gap: 8,
  },
  openTextInput: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  checkAnswerBtn: {
    height: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  checkAnswerBtnText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  explanationBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 4,
  },
  feedbackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  feedbackTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  feedbackSub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  expLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginTop: 4,
  },
  expText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
  },
  nextBtn: {
    height: 42,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  nextBtnText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },
  scoreCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 4,
  },
  scoreBigText: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 32,
    lineHeight: 40,
  },
  scoreDesc: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    textAlign: 'center',
  },
  recContainer: {
    gap: 4,
  },
  recText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 17,
  },
  statusText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    textAlign: 'center',
  },
  exportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exportBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  exportBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 12,
  },
});
