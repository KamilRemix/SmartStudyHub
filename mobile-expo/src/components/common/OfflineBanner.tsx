import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { networkService } from '../../services/network';
import { useTheme } from '../../theme';
import { useI18n } from '../../i18n';

export const OfflineBanner: React.FC = () => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const prevOfflineRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    const unsubscribe = networkService.subscribe((state) => {
      const offline = !state.isConnected || !state.isInternetReachable;

      if (prevOfflineRef.current && !offline) {
        // Just transitioned back online!
        setShowRestored(true);
        setIsOffline(false);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();

        const timer = setTimeout(() => {
          Animated.timing(slideAnim, {
            toValue: -60,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowRestored(false);
          });
        }, 3200);

        return () => clearTimeout(timer);
      } else if (offline) {
        setIsOffline(true);
        setShowRestored(false);
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        setIsOffline(false);
        setShowRestored(false);
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }

      prevOfflineRef.current = offline;
    });

    return unsubscribe;
  }, [slideAnim]);

  if (!isOffline && !showRestored) {
    return null;
  }

  const isSuccess = showRestored && !isOffline;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: Math.max(insets.top, 12),
          transform: [{ translateY: slideAnim }],
        },
      ]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.pill,
          {
            backgroundColor: isSuccess ? colors.success : colors.surfaceSecondary,
            borderColor: isSuccess ? colors.success : colors.borderColor,
          },
        ]}
      >
        <Feather
          name={isSuccess ? 'check-circle' : 'wifi-off'}
          size={14}
          color={isSuccess ? '#ffffff' : colors.warning}
        />
        <Text
          style={[
            styles.text,
            { color: isSuccess ? '#ffffff' : colors.textColor },
          ]}
          numberOfLines={1}
        >
          {isSuccess
            ? (t('onlineRestored') || 'Связь восстановлена • Синхронизация')
            : (t('offlineModeDesc') || 'Автономный режим • Данные сохранены локально')}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
    maxWidth: '92%',
  },
  text: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    flexShrink: 1,
  },
});
