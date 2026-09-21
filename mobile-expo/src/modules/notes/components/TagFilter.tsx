import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';

export interface TagFilterProps {
  selectedTag: string;
  onSelectTag: (tag: string) => void;
  availableTags?: string[];
}

const PRESET_TAG_DEFS = [
  { key: 'tagAll', defaultText: 'Все' },
  { key: 'tagStudies', defaultText: 'Учеба' },
  { key: 'tagImportant', defaultText: 'Важное' },
  { key: 'tagPlans', defaultText: 'Планы' },
  { key: 'tagIdeas', defaultText: 'Идеи' },
];

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTag,
  onSelectTag,
  availableTags = [],
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const allTagLabel = t('tagAll');

  const combinedTags = useMemo(() => {
    const presets = PRESET_TAG_DEFS.map((d) => t(d.key));
    const set = new Set(presets);
    for (const tag of availableTags) {
      if (tag.trim()) set.add(tag.trim());
    }
    return Array.from(set);
  }, [availableTags, t]);

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {combinedTags.map((tag) => {
          const isSelected = (tag === allTagLabel && !selectedTag) || selectedTag === tag;
          return (
            <TouchableOpacity
              key={tag}
              onPress={() => onSelectTag(tag === allTagLabel ? '' : tag)}
              accessibilityRole="button"
              accessibilityLabel={t('filterByTag', { tag })}
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
