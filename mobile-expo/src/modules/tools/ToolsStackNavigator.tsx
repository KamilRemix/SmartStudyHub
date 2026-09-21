import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ToolsStackParamList } from '../../navigation/types';
import { ToolsScreen } from './ToolsScreen';
import { UnitConverterScreen } from './screens/UnitConverterScreen';
import { CurrencyConverterScreen } from './screens/CurrencyConverterScreen';
import { TranslatorScreen } from './screens/TranslatorScreen';
import { GenPassScreen } from './screens/GenPassScreen';

const Stack = createNativeStackNavigator<ToolsStackParamList>();

export const ToolsStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="ToolsHome"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="ToolsHome" component={ToolsScreen} />
      <Stack.Screen name="UnitConverter" component={UnitConverterScreen} />
      <Stack.Screen name="CurrencyConverter" component={CurrencyConverterScreen} />
      <Stack.Screen name="Translator" component={TranslatorScreen} />
      <Stack.Screen name="GenPass" component={GenPassScreen} />
    </Stack.Navigator>
  );
};
