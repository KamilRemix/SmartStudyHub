import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';

export interface TagFilterProps {
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  availableTags?: string[];
}

const PRESET_TAGS = ['Все', 'Учеба', 'Важное', 'Планы', 'Идеи'];

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTag,
  onSelectTag,
  availableTags = [],
}) => {
  const { colors } = useTheme();

  const combinedTags = useMemo(() => {
    const set = new Set(PRESET_TAGS);
    for (const t of availableTags) {
      if (t.trim()) set.add(t.trim());
    }
    return Array.from(set);
  }, [availableTags]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {combinedTags.map((tag) => {
          const isSelected = (tag === 'Все' && !selectedTag) || selectedTag === tag;
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => onSelectTag(tag === 'Все' ? '' : tag)}
              accessibilityRole="button"
              accessibilityLabel={`Фильтр по тегу ${tag}`}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.primaryAccent
                    : colors.componentBackground,
                  borderColor: isSelected ? colors.primaryAccent : colors.borderColor,
                },
              ]}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: isSelected ? '#ffffff' : colors.textColorSecondary },
                ]}
              >
                {tag}
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
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
});
