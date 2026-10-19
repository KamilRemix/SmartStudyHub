import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  BackHandler,
  Easing,
} from 'react-native';
import {
  useNavigation,
  NavigationContext,
  NavigationRouteContext,
} from '@react-navigation/native';
import { useTheme } from '../../theme';
import { ToolsStackParamList } from '../../navigation/types';
import { ToolsScreen } from './ToolsScreen';
import { AIAssistantScreen } from './screens/AIAssistantScreen';
import { QuizGeneratorScreen } from './screens/QuizGeneratorScreen';
import { UnitConverterScreen } from './screens/UnitConverterScreen';
import { CurrencyConverterScreen } from './screens/CurrencyConverterScreen';
import { TranslatorScreen } from './screens/TranslatorScreen';
import { GenPassScreen } from './screens/GenPassScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_EDGE_WIDTH = 80;
const DISMISS_DISTANCE_THRESHOLD = 95;
const FLING_VELOCITY_THRESHOLD = 0.35;

const SCREEN_COMPONENTS: Record<keyof ToolsStackParamList, React.ComponentType<any>> = {
  ToolsHome: ToolsScreen,
  AIAssistant: AIAssistantScreen,
  QuizGenerator: QuizGeneratorScreen,
  UnitConverter: UnitConverterScreen,
  CurrencyConverter: CurrencyConverterScreen,
  Translator: TranslatorScreen,
  GenPass: GenPassScreen,
};

interface StackItem {
  key: string;
  name: keyof ToolsStackParamList;
  params?: any;
}

export const ToolsStackNavigator: React.FC = () => {
  const { colors } = useTheme();
  const parentNav = useNavigation<any>();

  const [stack, setStack] = useState<StackItem[]>([]);
  const stackRef = useRef<StackItem[]>([]);
  stackRef.current = stack;

  const translateX = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);

  const popScreen = useCallback(() => {
    if (stackRef.current.length === 0 || isDismissing.current) return;
    isDismissing.current = true;

    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setStack((prev) => prev.slice(0, -1));
      isDismissing.current = false;
      translateX.setValue(0);
    });
  }, [translateX]);

  const popToTop = useCallback(() => {
    if (stackRef.current.length === 0 || isDismissing.current) return;
    isDismissing.current = true;

    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setStack([]);
      isDismissing.current = false;
      translateX.setValue(0);
    });
  }, [translateX]);

  const pushScreen = useCallback(
    (name: keyof ToolsStackParamList, params?: any) => {
      if (name === 'ToolsHome') {
        popToTop();
        return;
      }
      const key = `${name}-${Date.now()}`;
      isDismissing.current = false;
      translateX.setValue(SCREEN_WIDTH);
      setStack((prev) => [...prev, { key, name, params }]);

      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [popToTop, translateX]
  );

  // Android hardware back button integration
  useEffect(() => {
    const onBackPress = () => {
      if (stackRef.current.length > 0) {
        popScreen();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => sub.remove();
  }, [popScreen]);

  // iOS-style gesture responder to swipe back to ToolsHome
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onStartShouldSetPanResponderCapture: () => false,

        onMoveShouldSetPanResponderCapture: (_, gesture) => {
          if (isDismissing.current || stackRef.current.length === 0) return false;
          // In AI Assistant, edge swipe opens the chat history drawer instead of closing the tool
          if (stackRef.current[stackRef.current.length - 1]?.name === 'AIAssistant') return false;
          if (gesture.x0 > SWIPE_EDGE_WIDTH) return false;
          const isDraggingRight = gesture.dx > 6;
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
          return isDraggingRight && isHorizontal;
        },

        onMoveShouldSetPanResponder: (_, gesture) => {
          if (isDismissing.current || stackRef.current.length === 0) return false;
          if (stackRef.current[stackRef.current.length - 1]?.name === 'AIAssistant') return false;
          if (gesture.x0 > SWIPE_EDGE_WIDTH) return false;
          const isDraggingRight = gesture.dx > 6;
          const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.2;
          return isDraggingRight && isHorizontal;
        },

        onPanResponderGrant: () => {
          translateX.stopAnimation();
        },

        onPanResponderMove: (_, gesture) => {
          if (isDismissing.current) return;
          if (gesture.dx > 0) {
            translateX.setValue(gesture.dx);
          } else {
            translateX.setValue(0);
          }
        },

        onPanResponderTerminationRequest: () => false,

        onPanResponderRelease: (_, gesture) => {
          if (isDismissing.current) return;
          if (gesture.dx > DISMISS_DISTANCE_THRESHOLD || gesture.vx > FLING_VELOCITY_THRESHOLD) {
            popScreen();
          } else {
            Animated.spring(translateX, {
              toValue: 0,
              bounciness: 4,
              speed: 14,
              useNativeDriver: true,
            }).start();
          }
        },

        onPanResponderTerminate: () => {
          if (!isDismissing.current) {
            Animated.spring(translateX, {
              toValue: 0,
              bounciness: 4,
              speed: 14,
              useNativeDriver: true,
            }).start();
          }
        },
      }),
    [popScreen, translateX]
  );

  const currentItem = stack[stack.length - 1];

  // Navigation prop exposed to ToolsScreen
  const toolsHomeNav = useMemo(
    () => ({
      ...parentNav,
      navigate: (screenOrOptions: any, params?: any) => {
        const screenName = typeof screenOrOptions === 'string' ? screenOrOptions : screenOrOptions?.name;
        const screenParams = typeof screenOrOptions === 'object' ? screenOrOptions?.params : params;
        if (screenName && screenName in SCREEN_COMPONENTS && screenName !== 'ToolsHome') {
          pushScreen(screenName as keyof ToolsStackParamList, screenParams);
        } else {
          parentNav.navigate(screenOrOptions, params);
        }
      },
      goBack: () => {
        if (parentNav.canGoBack?.()) {
          parentNav.goBack();
        }
      },
      canGoBack: () => parentNav.canGoBack?.() ?? false,
    }),
    [parentNav, pushScreen]
  );

  // Navigation prop exposed to active tool screen
  const activeToolNav = useMemo(
    () => ({
      ...parentNav,
      navigate: (screenOrOptions: any, params?: any) => {
        const screenName = typeof screenOrOptions === 'string' ? screenOrOptions : screenOrOptions?.name;
        const screenParams = typeof screenOrOptions === 'object' ? screenOrOptions?.params : params;
        if (screenName && screenName in SCREEN_COMPONENTS) {
          if (screenName === 'ToolsHome') {
            popToTop();
          } else {
            pushScreen(screenName as keyof ToolsStackParamList, screenParams);
          }
        } else {
          parentNav.navigate(screenOrOptions, params);
        }
      },
      goBack: () => {
        popScreen();
      },
      canGoBack: () => true,
    }),
    [parentNav, popScreen, popToTop, pushScreen]
  );

  const activeRoute = useMemo(
    () => ({
      key: currentItem ? currentItem.key : 'ToolsHome',
      name: currentItem ? currentItem.name : 'ToolsHome',
      params: currentItem ? currentItem.params : undefined,
    }),
    [currentItem]
  );

  // Parallax translation for the underlay ToolsScreen (-22% -> 0)
  const underlayTranslateX = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [-SCREEN_WIDTH * 0.22, 0],
    extrapolate: 'clamp',
  });

  // Dimmer overlay that fades out as user swipes the tool away
  const dimmerOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0.28, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Permanent Base Layer: ToolsScreen */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            transform: stack.length > 0 ? [{ translateX: underlayTranslateX }] : [],
          },
        ]}
      >
        <NavigationContext.Provider value={toolsHomeNav as any}>
          <NavigationRouteContext.Provider value={{ key: 'ToolsHome', name: 'ToolsHome' } as any}>
            <ToolsScreen />
          </NavigationRouteContext.Provider>
        </NavigationContext.Provider>
        {stack.length > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: '#000000',
                opacity: dimmerOpacity,
              },
            ]}
          />
        )}
      </Animated.View>

      {/* Active Tool Screen Layer with iOS Swipe Gesture */}
      {currentItem && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.activeContainer,
            {
              backgroundColor: colors.background,
              transform: [{ translateX }],
            },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Subtle Left Edge Shadow for depth */}
          <View style={styles.leftShadow} pointerEvents="none" />
          <NavigationContext.Provider value={activeToolNav as any}>
            <NavigationRouteContext.Provider value={activeRoute as any}>
              {React.createElement(SCREEN_COMPONENTS[currentItem.name])}
            </NavigationRouteContext.Provider>
          </NavigationContext.Provider>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  activeContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  leftShadow: {
    position: 'absolute',
    left: -12,
    top: 0,
    bottom: 0,
    width: 12,
    shadowColor: '#000000',
    shadowOffset: { width: -3, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
});
