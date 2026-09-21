import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { NoteItem, NoteViewMode } from '../types';

export interface NoteCardProps {
  note: NoteItem;
  viewMode: NoteViewMode;
  onPress: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
  onToggleChecklistItem?: (itemId: string) => void;
}

export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  onPress,
  onTogglePin,
  onDelete,
  onToggleChecklistItem,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  const isCustomColor = Boolean(note.color);
  const cardBg = note.color || colors.componentBackground;
  const titleColor = isCustomColor ? '#ffffff' : colors.textColor;
  const textColor = isCustomColor ? '#e0e0e0' : colors.textColorSecondary;
  const iconColor = isCustomColor ? '#ffffff' : colors.textColorSecondary;

  const checklist = note.checklist || [];
  const previewChecklist = checklist.slice(0, 4);
  const remainingCount = checklist.length - previewChecklist.length;

  const handleCopy = async () => {
    const parts: string[] = [];
    if (note.title) parts.push(note.title);
    if (note.content) parts.push(note.content);
    if (note.checklist && note.checklist.length > 0) {
      parts.push(
        note.checklist
          .map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`)
          .join('\n')
      );
    }
    const fullText = parts.join('\n\n');
    if (fullText) {
      await Clipboard.setStringAsync(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('noteA11y', { title: note.title || t('untitledNote') })}
      activeOpacity={0.8}
      style={[
        styles.card,
        viewMode === 'grid' ? styles.gridCard : styles.listCard,
        {
          backgroundColor: cardBg,
          borderColor: isCustomColor ? 'transparent' : colors.borderColor,
        },
      ]}
    >
      {/* Header with Title & Pin */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: titleColor }]} numberOfLines={2}>
          {note.title || t('untitledNote')}
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel={copied ? t('copiedToClipboard') : t('copyNoteText')}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Feather
              name={copied ? 'check' : 'copy'}
              size={16}
              color={copied ? colors.primaryAccent : iconColor}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onTogglePin}
            accessibilityRole="button"
            accessibilityLabel={note.pinned ? t('unpinNote') : t('pinNote')}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Feather
              name="bookmark"
              size={16}
              color={note.pinned ? colors.primaryAccent : iconColor}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onDelete}
            accessibilityRole="button"
            accessibilityLabel={t('deleteNote')}
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={16} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Body Content */}
      {Boolean(note.content) && (
        <Text style={[styles.content, { color: textColor }]} numberOfLines={viewMode === 'grid' ? 4 : 3}>
          {note.content}
        </Text>
      )}

      {/* Checklist Preview */}
      {previewChecklist.length > 0 && (
        <View style={styles.checklistContainer}>
          {previewChecklist.map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onToggleChecklistItem && onToggleChecklistItem(item.id)}
              style={styles.checkItemRow}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: item.done }}
              accessibilityLabel={t('checklistItemA11y', { text: item.text })}
            >
              <Feather
                name={item.done ? 'check-square' : 'square'}
                size={14}
                color={item.done ? colors.primaryAccent : iconColor}
              />
              <Text
                style={[
                  styles.checkItemText,
                  {
                    color: textColor,
                    textDecorationLine: item.done ? 'line-through' : 'none',
                    opacity: item.done ? 0.7 : 1,
                  },
                ]}
                numberOfLines={1}
              >
                {item.text}
              </Text>
            </TouchableOpacity>
          ))}
          {remainingCount > 0 && (
            <Text style={[styles.moreText, { color: iconColor }]}>
              {t('andMoreItems', { count: remainingCount })}
            </Text>
          )}
        </View>
      )}

      {/* Images Preview */}
      {note.images && note.images.length > 0 && (
        <View style={styles.cardImagesRow}>
          {note.images.slice(0, 3).map((imgUri, idx) => (
            <Image key={idx} source={{ uri: imgUri }} style={styles.cardThumbnail} />
          ))}
          {note.images.length > 3 && (
            <View style={[styles.moreImagesBadge, { backgroundColor: isCustomColor ? 'rgba(255,255,255,0.2)' : colors.surfaceSecondary }]}>
              <Text style={[styles.moreImagesText, { color: iconColor }]}>
                +{note.images.length - 3}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Reminder Badge */}
      {Boolean(note.reminderTimestamp) && (
        <View style={[styles.reminderBadge, { backgroundColor: isCustomColor ? 'rgba(255,255,255,0.2)' : colors.surfaceSecondary }]}>
          <Feather name="bell" size={12} color={iconColor} />
          <Text style={[styles.reminderText, { color: iconColor }]}>
            {new Date(note.reminderTimestamp!).toLocaleDateString([], { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      )}

      {/* Tags Row */}
      {note.tags && note.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {note.tags.slice(0, 3).map((tag, idx) => (
            <View
              key={idx}
              style={[
                styles.tagBadge,
                {
                  backgroundColor: isCustomColor
                    ? 'rgba(255,255,255,0.2)'
                    : colors.surfaceSecondary,
                },
              ]}
            >
              <Text style={[styles.tagText, { color: isCustomColor ? '#ffffff' : colors.textColorSecondary }]}>
                #{tag}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  gridCard: {
    width: '48.5%',
  },
  listCard: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    flex: 1,
    marginRight: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconBtn: {
    padding: 4,
  },
  content: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  checklistContainer: {
    marginTop: 4,
    marginBottom: 6,
    gap: 4,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  checkItemText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    flex: 1,
  },
  moreText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 2,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 6,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
  },
  cardImagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: 6,
  },
  cardThumbnail: {
    width: 38,
    height: 38,
    borderRadius: 6,
  },
  moreImagesBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreImagesText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },
  reminderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    marginVertical: 4,
  },
  reminderText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
});
