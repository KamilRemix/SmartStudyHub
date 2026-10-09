import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { ToolsStackParamList } from '../../../navigation/types';

interface ChatQuizCardProps {
  title?: string;
  questionCount?: number;
  difficulty?: string;
}

type NavProp = NativeStackNavigationProp<ToolsStackParamList>;

export const ChatQuizCard: React.FC<ChatQuizCardProps> = ({
  title,
  questionCount,
  difficulty,
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation<NavProp>();

  const handleStartQuiz = () => {
    navigation.navigate('QuizGenerator');
  };

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
          <Text style={styles.title}>{title || 'Интерактивный тест'}</Text>
          <Text style={styles.meta}>
            {questionCount ? `${questionCount} вопросов • ` : ''}
            Сложность: {difficulty || 'Стандартная'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.startBtn, { backgroundColor: colors.primaryAccent }]}
        onPress={handleStartQuiz}
        activeOpacity={0.8}
      >
        <Text style={styles.startBtnText}>Пройти интерактивный тест</Text>
        <Feather name="arrow-right" size={16} color="#ffffff" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    gap: 12,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    fontSize: 14,
  },
  meta: {
    color: '#c7d2fe',
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },
  startBtn: {
    height: 40,
    borderRadius: 10,
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
});
