import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
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
  const flatListRef = useRef<FlatList>(null);
  const isScrollingRef = useRef(false);

  const containerHeight = itemHeight * visibleCount;
  const paddingHeight = itemHeight * Math.floor(visibleCount / 2);

  const selectedIndex = items.findIndex((it) => it.value === selectedValue);

  // Scroll to selected value on mount or external update (when not actively dragging)
  useEffect(() => {
    if (!isScrollingRef.current && selectedIndex >= 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: selectedIndex * itemHeight,
          animated: false,
        });
      }, 50);
    }
  }, [selectedValue, selectedIndex, itemHeight]);

  const handleScrollEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      isScrollingRef.current = false;
      const offsetY = e.nativeEvent.contentOffset.y;
      const index = Math.round(offsetY / itemHeight);
      const clampedIndex = Math.max(0, Math.min(items.length - 1, index));
      if (items[clampedIndex] && items[clampedIndex].value !== selectedValue) {
        onValueChange(items[clampedIndex].value);
      }
    },
    [items, itemHeight, selectedValue, onValueChange]
  );

  const handleItemPress = (index: number, val: number) => {
    flatListRef.current?.scrollToOffset({
      offset: index * itemHeight,
      animated: true,
    });
    onValueChange(val);
  };

  return (
    <View style={[styles.container, { height: containerHeight, width }]}>
      <FlatList
        ref={flatListRef}
        data={items}
        keyExtractor={(item) => String(item.value)}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        bounces={false}
        onScrollBeginDrag={() => {
          isScrollingRef.current = true;
        }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={(e) => {
          // If momentum scroll doesn't fire (short drag)
          setTimeout(() => {
            if (isScrollingRef.current) {
              handleScrollEnd(e);
            }
          }, 80);
        }}
        getItemLayout={(_, index) => ({
          length: itemHeight,
          offset: itemHeight * index,
          index,
        })}
        initialScrollIndex={selectedIndex >= 0 ? selectedIndex : 0}
        ListHeaderComponent={<View style={{ height: paddingHeight }} />}
        ListFooterComponent={<View style={{ height: paddingHeight }} />}
        renderItem={({ item, index }) => {
          const isSelected = item.value === selectedValue;
          return (
            <TouchableOpacity
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
        }}
      />
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
