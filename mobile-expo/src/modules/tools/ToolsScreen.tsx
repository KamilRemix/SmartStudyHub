import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppHeader } from '../../components/common/AppHeader';
import { FeatherIconName, ToolsStackParamList } from '../../navigation/types';
import { useI18n } from '../../i18n';

type ToolsNav = NativeStackNavigationProp<ToolsStackParamList, 'ToolsHome'>;

interface ToolItem {
  id: string;
  titleKey: string;
  subtitleKey: string;
  icon: FeatherIconName;
  screen: keyof ToolsStackParamList;
}

const TOOLS_LIST: ToolItem[] = [
  {
    id: 'ai',
    titleKey: 'aiAssistantTitle',
    subtitleKey: 'aiAssistantSub',
    icon: 'cpu',
    screen: 'AIAssistant',
  },
  {
    id: 'presentation',
    titleKey: 'presentationTitle',
    subtitleKey: 'presentationSub',
    icon: 'monitor',
    screen: 'Presentation',
  },
  {
    id: 'converter',
    titleKey: 'unitConverter',
    subtitleKey: 'converterSub',
    icon: 'sliders',
    screen: 'UnitConverter',
  },
  {
    id: 'currency',
    titleKey: 'currencyConverterTitle',
    subtitleKey: 'currencyConverterSub',
    icon: 'dollar-sign',
    screen: 'CurrencyConverter',
  },
  {
    id: 'translator',
    titleKey: 'translator',
    subtitleKey: 'translatorSub',
    icon: 'globe',
    screen: 'Translator',
  },
  {
    id: 'genpass',
    titleKey: 'genPassTitle',
    subtitleKey: 'genPassSub',
    icon: 'key',
    screen: 'GenPass',
  },
];

export const ToolsScreen: React.FC = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<ToolsNav>();
  const { t } = useI18n();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('tools')}
        subtitle={t('toolsSubtitle')}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {TOOLS_LIST.map((tool) => (
            <TouchableOpacity
              key={tool.id}
              style={[
                styles.card,
                {
                  backgroundColor: colors.componentBackground,
                  borderColor: colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t(tool.titleKey)}
              onPress={() => navigation.navigate(tool.screen)}
            >
              <View style={[styles.iconContainer, { backgroundColor: colors.background }]}>
                <Feather name={tool.icon} size={24} color={colors.primaryAccent} />
              </View>
              <View style={styles.textBlock}>
                <Text style={[styles.cardTitle, { color: colors.textColor }]}>
                  {t(tool.titleKey)}
                </Text>
                <Text style={[styles.cardSubtitle, { color: colors.textColorSecondary }]}>
                  {t(tool.subtitleKey)}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textColorSecondary} />
            </TouchableOpacity>
          ))}
        </View>
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
    gap: 16,
  },
  grid: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    flex: 1,
    gap: 3,
  },
  cardTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },
  cardSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 16,
  },
});
