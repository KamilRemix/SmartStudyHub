import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { PressableScale } from '../../../components/common/PressableScale';

export interface CreateQuizModalParams {
  topic: string;
  questionCount: number;
  type: 'multiple_choice' | 'open_ended' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
}

interface CreateQuizModalProps {
  visible: boolean;
  onClose: () => void;
  onGenerate: (params: CreateQuizModalParams) => Promise<void>;
  isLoading?: boolean;
}

export const CreateQuizModal: React.FC<CreateQuizModalProps> = ({
  visible,
  onClose,
  onGenerate,
  isLoading = false,
}) => {
  const { colors, isDark } = useTheme();

  const [topic, setTopic] = useState('');
  const [questionCount, setQuestionCount] = useState<number>(3);
  const [quizType, setQuizType] = useState<'multiple_choice' | 'open_ended' | 'mixed'>('multiple_choice');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!topic.trim()) {
      setError('Пожалуйста, укажите тему для тестирования.');
      return;
    }
    setError(null);
    try {
      await onGenerate({
        topic: topic.trim(),
        questionCount,
        type: quizType,
        difficulty,
      });
      setTopic('');
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Не удалось создать тест. Попробуйте еще раз.');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
          accessibilityLabel="Закрыть"
        />

        <View
          style={[
            styles.sheetCard,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handle,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)' },
              ]}
            />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View
                style={[
                  styles.headerIconWrap,
                  { backgroundColor: colors.primaryAccent + '18' },
                ]}
              >
                <Feather name="check-circle" size={18} color={colors.primaryAccent} />
              </View>
              <View>
                <Text style={[styles.headerTitle, { color: colors.textColor }]}>
                  Создать интерактивный тест
                </Text>
                <Text style={[styles.headerSubtitle, { color: colors.textColorSecondary }]}>
                  ИИ сформирует тест прямо в диалоге с мгновенной проверкой
                </Text>
              </View>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Feather name="x" size={20} color={colors.textColorSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Topic Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textColor }]}>
                Тема или раздел
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.borderColor,
                    color: colors.textColor,
                  },
                ]}
                placeholder="Например: Законы термодинамики, Революция 1917, Present Perfect..."
                placeholderTextColor={colors.textColorSecondary}
                value={topic}
                onChangeText={(t) => {
                  setTopic(t);
                  if (error) setError(null);
                }}
              />
            </View>

            {/* Questions count */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textColor }]}>
                Количество вопросов
              </Text>
              <View style={styles.chipsRow}>
                {[3, 5, 10].map((cnt) => (
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
                      {cnt} вопроса
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quiz Type */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textColor }]}>
                Формат заданий
              </Text>
              <View style={styles.chipsRow}>
                {[
                  { id: 'multiple_choice', label: 'Тест' },
                  { id: 'open_ended', label: 'Свой ввод' },
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
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textColor }]}>
                Уровень сложности
              </Text>
              <View style={styles.chipsRow}>
                {[
                  { id: 'easy', label: 'Базовый' },
                  { id: 'medium', label: 'Средний' },
                  { id: 'hard', label: 'Сложный / Экзамен' },
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

            {error && (
              <View style={styles.errorBox}>
                <Feather name="alert-circle" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Submit button */}
            <PressableScale
              style={[
                styles.submitBtn,
                {
                  backgroundColor: colors.primaryAccent,
                  opacity: isLoading ? 0.7 : 1,
                },
              ]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Feather name="zap" size={16} color="#ffffff" />
                  <Text style={styles.submitBtnText}>Сгенерировать тест в чате</Text>
                </>
              )}
            </PressableScale>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  handleWrap: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150, 150, 150, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingTop: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  textInput: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
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
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#ef444415',
  },
  errorText: {
    color: '#ef4444',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  submitBtn: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitBtnText: {
    color: '#ffffff',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});
