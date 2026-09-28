import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';

export interface WheelItem {
  label: string;
  value: number;
}

interface WheelPickerProps {
  items: WheelItem[];
  selectedValue: number;
  onValueChange: (val: number) => void;
  itemHeight?: number;
  visibleCount?: number;
  textColor?: string;
  activeColor?: string;
  width?: number;
}

export const WheelPicker: React.FC<WheelPickerProps> = ({
  items,
  selectedValue,
  onValueChange,
  itemHeight = 44,
  visibleCount = 3,
  textColor = '#94a3b8',
  activeColor = '#007aff',
  width = 76,
}) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const isUserInteracting = useRef(false);
  const lastReportedValue = useRef(selectedValue);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef(true);

  const containerHeight = itemHeight * visibleCount;
  const paddingHeight = itemHeight * Math.floor(visibleCount / 2);

  // Keep track of mounted status and clean up timers on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  // Initial scroll position on mount
  useEffect(() => {
    const initialIndex = items.findIndex((it) => it.value === selectedValue);
    if (initialIndex >= 0) {
      const timer = setTimeout(() => {
        if (isMountedRef.current) {
          scrollViewRef.current?.scrollTo({
            y: initialIndex * itemHeight,
            animated: false,
          });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, []);

  // Programmatic scroll when selectedValue changes from external source (e.g. quick preset buttons)
  useEffect(() => {
    if (selectedValue !== lastReportedValue.current && !isUserInteracting.current) {
      lastReportedValue.current = selectedValue;
      const targetIndex = items.findIndex((it) => it.value === selectedValue);
      if (targetIndex >= 0) {
        scrollViewRef.current?.scrollTo({
          y: targetIndex * itemHeight,
          animated: true,
        });
      }
    }
  }, [selectedValue, items, itemHeight]);

  const handleScrollSettled = useCallback(
    (offsetY: number) => {
      isUserInteracting.current = false;
      const index = Math.round(offsetY / itemHeight);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      const target = items[clampedIndex];
      if (target && target.value !== lastReportedValue.current) {
        lastReportedValue.current = target.value;
        onValueChange(target.value);
      }
    },
    [items, itemHeight, onValueChange]
  );

  const handleMomentumScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
      handleScrollSettled(offsetY);
    },
    [handleScrollSettled]
  );

  const handleScrollEndDrag = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      // Synchronously capture offset and velocity before synthetic event is recycled
      const offsetY = e?.nativeEvent?.contentOffset?.y ?? 0;
      const velocityY = Math.abs(e?.nativeEvent?.velocity?.y ?? 0);

      // If finger was released with negligible velocity, momentum scroll will not fire
      if (velocityY < 0.08) {
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
        scrollTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            handleScrollSettled(offsetY);
          }
        }, 60);
      }
    },
    [handleScrollSettled]
  );

  const handleItemPress = (index: number, val: number) => {
    isUserInteracting.current = true;
    lastReportedValue.current = val;
    scrollViewRef.current?.scrollTo({
      y: index * itemHeight,
      animated: true,
    });
    onValueChange(val);

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        isUserInteracting.current = false;
      }
    }, 300);
  };

  return (
    <View style={[styles.container, { height: containerHeight, width }]}>
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled={true}
        contentContainerStyle={{ paddingVertical: paddingHeight }}
        onScrollBeginDrag={() => {
          isUserInteracting.current = true;
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
            scrollTimeoutRef.current = null;
          }
        }}
        onMomentumScrollBegin={() => {
          isUserInteracting.current = true;
        }}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        onScrollEndDrag={handleScrollEndDrag}
      >
        {items.map((item, index) => {
          const isSelected = item.value === selectedValue;
          return (
            <TouchableOpacity
              key={item.value}
              activeOpacity={0.7}
              style={[styles.itemWrap, { height: itemHeight }]}
              onPress={() => handleItemPress(index, item.value)}
            >
              <Text
                style={[
                  styles.itemText,
                  {
                    color: isSelected ? activeColor : textColor,
                    fontSize: isSelected ? 22 : 16,
                    fontFamily: isSelected ? 'Poppins_600SemiBold' : 'Inter_400Regular',
                    opacity: isSelected ? 1 : 0.45,
                    transform: [{ scale: isSelected ? 1.05 : 0.9 }],
                  },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: {
    textAlign: 'center',
  },
});
