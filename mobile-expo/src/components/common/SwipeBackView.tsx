import React, { useRef } from 'react';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_EDGE_WIDTH = 70; // Active edge width in px (standard iOS edge threshold)
const DISMISS_DISTANCE_THRESHOLD = 95; // Pixels dragged to trigger exit
const FLING_VELOCITY_THRESHOLD = 0.35; // Momentum velocity to exit

export interface SwipeBackViewProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onSwipeBack?: () => void;
  edgeWidth?: number;
  disabled?: boolean;
}

/**
 * iOS-style edge swipe-to-go-back gesture wrapper.
 * Enables 1:1 direct finger tracking with natural spring physics
 * inspired by Emil Kowalski and Apple Human Interface Guidelines.
 */
export const SwipeBackView: React.FC<SwipeBackViewProps> = ({
  children,
  style,
  onSwipeBack,
  edgeWidth = SWIPE_EDGE_WIDTH,
  disabled = false,
}) => {
  const navigation = useNavigation();
  const translateX = useRef(new Animated.Value(0)).current;
  const isDismissing = useRef(false);

  const handleDismiss = () => {
    if (isDismissing.current) return;
    isDismissing.current = true;

    Animated.timing(translateX, {
      toValue: SCREEN_WIDTH,
      duration: 160,
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
      onMoveShouldSetPanResponder: (_, gesture) => {
        if (disabled || isDismissing.current) return false;
        // Check if gesture started at the left edge and is dragging right horizontally
        return (
          gesture.x0 <= edgeWidth &&
          gesture.dx > 12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.4
        );
      },
      onPanResponderGrant: () => {
        translateX.stopAnimation();
      },
      onPanResponderMove: (_, gesture) => {
        if (isDismissing.current) return;
        if (gesture.dx > 0) {
          translateX.setValue(gesture.dx);
        }
      },
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

  // Backdrop dimming opacity while sliding
  const backdropOpacity = translateX.interpolate({
    inputRange: [0, SCREEN_WIDTH],
    outputRange: [0.08, 0],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.rootContainer} {...panResponder.panHandlers}>
      {/* Optional subtle backdrop shade */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.contentContainer,
          style,
          {
            transform: [{ translateX }],
          },
        ]}
      >
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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
  },
  contentContainer: {
    flex: 1,
  },
});
