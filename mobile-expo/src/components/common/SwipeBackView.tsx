import React, { useRef, useEffect } from 'react';
import {
  Animated,
  Dimensions,
  PanResponder,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { ToolsScreen } from '../../modules/tools/ToolsScreen';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_EDGE_WIDTH = 80; // Active edge width in px (generous edge threshold for all screen sizes)
const DISMISS_DISTANCE_THRESHOLD = 95; // Pixels dragged to trigger exit
const FLING_VELOCITY_THRESHOLD = 0.35; // Momentum velocity to exit

export interface SwipeBackViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onSwipeBack?: () => void;
  edgeWidth?: number;
  disabled?: boolean;
  underlay?: React.ReactNode;
}

/**
 * iOS-style edge swipe-to-go-back gesture wrapper with live underlay preview.
 * - Smooth 60fps entrance animation on mount with zero native fragment flash.
 * - Captures touches in the capture phase so vertical ScrollViews/FlatLists never hijack the swipe.
 * - Displays the underlying screen (ToolsScreen) with Apple-grade parallax and dimming.
 * - Spring physics inspired by Emil Kowalski (bounciness: 4, speed: 14).
 */
export const SwipeBackView: React.FC<SwipeBackViewProps> = ({
  children,
  style,
  onSwipeBack,
  edgeWidth = SWIPE_EDGE_WIDTH,
  disabled = false,
  underlay,
}) => {
  const navigation = useNavigation();
  const { colors } = useTheme();

  // Start at SCREEN_WIDTH for a seamless native-feeling entrance
  const translateX = useRef(new Animated.Value(SCREEN_WIDTH)).current;
  const isDismissing = useRef(false);

  useEffect(() => {
    // Smooth iOS-style slide in on mount
    Animated.timing(translateX, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [translateX]);

  const handleDismiss = () => {
    if (isDismissing.current) return;
    isDismissing.current = true;

    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      if (onSwipeBack) {
        onSwipeBack();
      } else {
        navigation.goBack();
      }
    });
  };

  const handleCancel = () => {
    Animated.spring(translateX, {
      toValue: 0,
      bounciness: 4,
      speed: 14,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,

      // CAPTURE PHASE: intercept horizontal drag from the edge BEFORE child ScrollView steals it!
      onMoveShouldSetPanResponderCapture: (_, gesture) => {
        if (disabled || isDismissing.current) return false;
        // Finger must have started within the left edge zone
        if (gesture.x0 > edgeWidth) return false;

        // Must be moving to the right, and horizontal distance must dominate vertical
        const isDraggingRight = gesture.dx > 6;
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);

        return isDraggingRight && isHorizontal;
      },

      // BUBBLE PHASE: fallback
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (disabled || isDismissing.current) return false;
        if (gesture.x0 > edgeWidth) return false;

        const isDraggingRight = gesture.dx > 6;
        const isHorizontal = Math.abs(gesture.dx) > Math.abs(gesture.dy);

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

      // Prevent child ScrollView from stealing the responder once swipe has started
      onPanResponderTerminationRequest: () => false,

      onPanResponderRelease: (_, gesture) => {
        if (isDismissing.current) return;
        if (gesture.dx > DISMISS_DISTANCE_THRESHOLD || gesture.vx > FLING_VELOCITY_THRESHOLD) {
          handleDismiss();
        } else {
          handleCancel();
        }
      },

      onPanResponderTerminate: () => {
        if (!isDismissing.current) {
          handleCancel();
        }
      },
    })
  ).current;

  // Parallax translation for the underlay: shifts from -28% width to 0
  const underlayTranslateX = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [-SCREEN_WIDTH * 0.28, 0],
    extrapolate: 'clamp',
  });

  // Dimmer over the underlay that fades out as the user reveals it
  const dimmerOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0.22, 0],
    extrapolate: 'clamp',
  });

  return (
    <View
      style={[styles.rootContainer, { backgroundColor: colors.background }]}
      {...panResponder.panHandlers}
    >
      {/* Underlying screen (ToolsScreen) with iOS-style parallax */}
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.underlayContainer,
          {
            transform: [{ translateX: underlayTranslateX }],
          },
        ]}
      >
        {underlay !== undefined ? underlay : <ToolsScreen />}
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: '#000000',
              opacity: dimmerOpacity,
            },
          ]}
        />
      </Animated.View>

      {/* Top sliding content */}
      <Animated.View
        style={[
          styles.contentContainer,
          { backgroundColor: colors.background },
          style,
          {
            transform: [{ translateX }],
          },
        ]}
      >
        {/* Left edge shadow / border for visual depth on both iOS and Android */}
        <View style={styles.leftShadow} pointerEvents="none" />
        {children}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  rootContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  underlayContainer: {
    overflow: 'hidden',
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  leftShadow: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    zIndex: 9999,
    shadowColor: '#000000',
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
});
