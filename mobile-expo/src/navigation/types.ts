import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

export type ToolsStackParamList = {
  ToolsHome: undefined;
  AIAssistant: undefined;
  QuizGenerator: undefined;
  UnitConverter: undefined;
  CurrencyConverter: undefined;
  Translator: undefined;
  GenPass: undefined;
};

export type RootTabParamList = {
  Calculator: undefined;
  Grades: undefined;
  Notes: undefined;
  Tools: NavigatorScreenParams<ToolsStackParamList>;
  Settings: undefined;
};

export type RootTabScreenProps<T extends keyof RootTabParamList> = BottomTabScreenProps<
  RootTabParamList,
  T
>;

export type ToolsStackScreenProps<T extends keyof ToolsStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<ToolsStackParamList, T>,
  BottomTabScreenProps<RootTabParamList>
>;

export type FeatherIconName = keyof typeof Feather.glyphMap;

export const TAB_ICONS: Record<keyof RootTabParamList, FeatherIconName> = {
  Calculator: 'cpu',
  Grades: 'bar-chart-2',
  Notes: 'file-text',
  Tools: 'grid',
  Settings: 'settings',
};

export const TAB_LABELS_RU: Record<keyof RootTabParamList, string> = {
  Calculator: 'Калькулятор',
  Grades: 'Средний балл',
  Notes: 'Заметки',
  Tools: 'Инструменты',
  Settings: 'Настройки',
};

export const TAB_LABELS_EN: Record<keyof RootTabParamList, string> = {
  Calculator: 'Calculator',
  Grades: 'Grades',
  Notes: 'Notes',
  Tools: 'Tools',
  Settings: 'Settings',
};
