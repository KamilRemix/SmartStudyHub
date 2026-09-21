import React from 'react';
import { StyleSheet, Platform, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { useTheme } from '../theme';
import { useI18n } from '../i18n';
import { RootTabParamList, TAB_ICONS } from './types';
import { CalculatorScreen } from '../modules/calculator';
import { GradesScreen } from '../modules/grades';
import { NotesScreen } from '../modules/notes';
import { ToolsStackNavigator } from '../modules/tools/ToolsStackNavigator';
import { SettingsScreen } from '../modules/settings';

const Tab = createBottomTabNavigator<RootTabParamList>();

export const BottomTabNavigator: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';

  const tabHeight = Platform.OS === 'ios'
    ? 86
    : isWeb
    ? 72
    : 66 + (insets.bottom > 0 ? insets.bottom : 0);

  const activePillBg = isDark
    ? 'rgba(0, 229, 255, 0.16)'
    : 'rgba(0, 122, 255, 0.12)';

  const dividerColor = isDark
    ? 'rgba(255, 255, 255, 0.08)'
    : '#e2e8f0';

  return (
    <Tab.Navigator
      initialRouteName="Calculator"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          const iconName = TAB_ICONS[route.name];
          const iconColor = focused ? colors.primaryAccent : '#64748b';
          return (
            <View
              style={[
                styles.iconContainer,
                focused && [styles.iconPill, { backgroundColor: activePillBg }],
              ]}
            >
              <Feather name={iconName} size={focused ? 20 : 19} color={iconColor} />
            </View>
          );
        },
        tabBarActiveTintColor: colors.primaryAccent,
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: colors.componentBackground,
          borderTopColor: dividerColor,
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: isWeb ? 6 : (insets.bottom > 0 ? insets.bottom : 6),
          paddingTop: 5,
          elevation: 10,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: isDark ? 0.35 : 0.06,
          shadowRadius: 10,
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: -0.35,
          marginTop: 1,
          lineHeight: 13,
        },
        tabBarLabelPosition: 'below-icon',
        tabBarHideOnKeyboard: true,
      })}
    >
      <Tab.Screen
        name="Calculator"
        component={CalculatorScreen}
        options={{
          tabBarLabel: t('calculator'),
        }}
      />
      <Tab.Screen
        name="Grades"
        component={GradesScreen}
        options={{
          tabBarLabel: t('tabGrades') || t('grades'),
        }}
      />
      <Tab.Screen
        name="Notes"
        component={NotesScreen}
        options={{
          tabBarLabel: t('notes'),
        }}
      />
      <Tab.Screen
        name="Tools"
        component={ToolsStackNavigator}
        options={{
          tabBarLabel: t('tools'),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          tabBarLabel: t('settings'),
        }}
      />
    </Tab.Navigator>
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    height: 26,
    minWidth: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconPill: {
    paddingHorizontal: 6,
  },
});
