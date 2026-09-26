import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../../theme';
import { useI18n } from '../../../i18n';
import { NoteItem, NoteChecklistItem } from '../types';
import { ColorPicker } from './ColorPicker';

export interface NoteEditorModalProps {
  visible: boolean;
  note: NoteItem | null;
  onClose: () => void;
  onSave: (noteData: {
    id?: string;
    title: string;
    content: string;
    checklist: NoteChecklistItem[];
    tags: string[];
    color: string;
    pinned: boolean;
    images?: string[];
    reminderTimestamp?: number;
  }) => void;
  onDelete?: (id: string) => void;
}

const PRESET_TAG_KEYS: { key: string; defaultText: string }[] = [
  { key: 'tagStudies', defaultText: 'Учеба' },
  { key: 'tagImportant', defaultText: 'Важное' },
  { key: 'tagPlans', defaultText: 'Планы' },
  { key: 'tagIdeas', defaultText: 'Идеи' },
];

export const NoteEditorModal: React.FC<NoteEditorModalProps> = ({
  visible,
  note,
  onClose,
  onSave,
  onDelete,
}) => {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [checklist, setChecklist] = useState<NoteChecklistItem[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [color, setColor] = useState('');
  const [pinned, setPinned] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [reminderTimestamp, setReminderTimestamp] = useState<number | undefined>(undefined);
  const [newTagInput, setNewTagInput] = useState('');

  // Reminder picker modal state
  const [isReminderPickerVisible, setIsReminderPickerVisible] = useState(false);
  const [selectedDayOffset, setSelectedDayOffset] = useState(0); // 0 = today, 1 = tomorrow, 2 = day after tomorrow, 7 = week
  const [selectedHour, setSelectedHour] = useState(18);
  const [selectedMinute, setSelectedMinute] = useState(0);

  useEffect(() => {
    if (note) {
      setTitle(note.title);
      setContent(note.content);
      setChecklist(note.checklist ? [...note.checklist] : []);
      setTags(note.tags ? [...note.tags] : []);
      setColor(note.color || '');
      setPinned(note.pinned || false);
      setImages(note.images ? [...note.images] : []);
      setReminderTimestamp(note.reminderTimestamp);
      if (note.reminderTimestamp) {
        const d = new Date(note.reminderTimestamp);
        setSelectedHour(d.getHours());
        setSelectedMinute(Math.floor(d.getMinutes() / 5) * 5);
      }
    } else {
      setTitle('');
      setContent('');
      setChecklist([]);
      setTags([]);
      setColor('');
      setPinned(false);
      setImages([]);
      setReminderTimestamp(undefined);
      setSelectedDayOffset(0);
      setSelectedHour(18);
      setSelectedMinute(0);
    }
    setNewTagInput('');
    setIsReminderPickerVisible(false);
  }, [note, visible]);

  const formattedReminder = useMemo(() => {
    if (!reminderTimestamp) return null;
    const d = new Date(reminderTimestamp);
    const now = new Date();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow =
      d.getDate() === tomorrow.getDate() &&
      d.getMonth() === tomorrow.getMonth() &&
      d.getFullYear() === tomorrow.getFullYear();

    if (isToday) {
      return t('reminderFormattedToday', { time: timeStr });
    }
    if (isTomorrow) {
      return t('reminderFormattedTomorrow', { time: timeStr });
    }
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}, ${timeStr}`;
  }, [reminderTimestamp, t]);

  const handleQuickPreset = (type: '1h' | 'todayEvening' | 'tomorrowMorning') => {
    const now = new Date();
    if (type === '1h') {
      setReminderTimestamp(now.getTime() + 3600 * 1000);
    } else if (type === 'todayEvening') {
      const d = new Date(now);
      if (d.getHours() >= 18) {
        d.setDate(d.getDate() + 1);
      }
      d.setHours(18, 0, 0, 0);
      setReminderTimestamp(d.getTime());
    } else if (type === 'tomorrowMorning') {
      const d = new Date(now);
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      setReminderTimestamp(d.getTime());
    }
    setIsReminderPickerVisible(false);
  };

  const handleConfirmCustomReminder = () => {
    const target = new Date();
    target.setDate(target.getDate() + selectedDayOffset);
    target.setHours(selectedHour, selectedMinute, 0, 0);
    if (target.getTime() <= Date.now()) {
      target.setDate(target.getDate() + 1);
    }
    setReminderTimestamp(target.getTime());
    setIsReminderPickerVisible(false);
  };

  const handleClearReminder = () => {
    setReminderTimestamp(undefined);
  };

  const handleAddChecklistItem = () => {
    const newItem: NoteChecklistItem = {
      id: `cl_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      text: '',
      done: false,
    };
    setChecklist([...checklist, newItem]);
  };

  const handleUpdateChecklistItem = (id: string, text: string) => {
    setChecklist(checklist.map((item) => (item.id === id ? { ...item, text } : item)));
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklist(checklist.map((item) => (item.id === id ? { ...item, done: !item.done } : item)));
  };

  const handleDeleteChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id));
  };

  const handleAddTag = (tagToAdd: string) => {
    const clean = tagToAdd.trim();
    if (clean && !tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        setImages((prev) => [...prev, res.assets[0].uri]);
      }
    } catch (e) {
      console.warn('[NoteEditorModal] ImagePicker error:', e);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const cleanChecklist = checklist.filter((item) => item.text.trim().length > 0);
    onSave({
      id: note?.id,
      title: title.trim(),
      content: content.trim(),
      checklist: cleanChecklist,
      tags,
      color,
      pinned,
      images,
      reminderTimestamp,
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              backgroundColor: colors.componentBackground,
              borderBottomColor: colors.borderColor,
            },
          ]}
        >
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel={t('cancelEdit')}
            style={styles.headerBtn}
          >
            <Feather name="x" size={22} color={colors.textColor} />
          </TouchableOpacity>

          <Text style={[styles.headerTitle, { color: colors.textColor }]}>
            {note ? t('editNote') : t('newNote')}
          </Text>

          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setPinned(!pinned)}
              accessibilityRole="button"
              accessibilityLabel={pinned ? t('unpinNote') : t('pinNote')}
              style={styles.headerBtn}
            >
              <Feather
                name="bookmark"
                size={20}
                color={pinned ? colors.primaryAccent : colors.textColorSecondary}
              />
            </TouchableOpacity>

            {note && onDelete && (
              <TouchableOpacity
                onPress={() => {
                  onDelete(note.id);
                  onClose();
                }}
                accessibilityRole="button"
                accessibilityLabel={t('deleteNote')}
                style={styles.headerBtn}
              >
                <Feather name="trash-2" size={20} color={colors.secondaryAccent} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleSave}
              accessibilityRole="button"
              accessibilityLabel={t('saveNote')}
              style={[styles.saveHeaderBtn, { backgroundColor: colors.primaryAccent }]}
            >
              <Feather name="check" size={18} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Color Picker Row */}
          <View style={styles.colorSection}>
            <Text style={[styles.sectionLabel, { color: colors.textColorSecondary }]}>
              {t('noteBackgroundColor')}
            </Text>
            <ColorPicker selectedColor={color} onSelectColor={setColor} />
          </View>

          {/* Title Input */}
          <TextInput
            style={[styles.titleInput, { color: colors.textColor }]}
            placeholder={t('noteTitlePlaceholder')}
            placeholderTextColor={colors.textColorSecondary}
            value={title}
            onChangeText={setTitle}
            multiline={false}
          />

          {/* Content Body Input */}
          <TextInput
            style={[styles.contentInput, { color: colors.textColor }]}
            placeholder={t('noteContentPlaceholder')}
            placeholderTextColor={colors.textColorSecondary}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          {/* Photo Attachments */}
          <View style={styles.attachmentBar}>
            <TouchableOpacity
              style={[styles.attachBtn, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor }]}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              <Feather name="image" size={16} color={colors.primaryAccent} />
              <Text style={[styles.attachBtnText, { color: colors.textColor }]}>
                {t('addPhoto')}
              </Text>
            </TouchableOpacity>

            {/* Reminder trigger */}
            <View style={styles.reminderTriggers}>
              {reminderTimestamp ? (
                <TouchableOpacity
                  style={[
                    styles.reminderChipActive,
                    {
                      backgroundColor: colors.primaryAccent + '18',
                      borderColor: colors.primaryAccent,
                    },
                  ]}
                  onPress={() => setIsReminderPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="bell" size={13} color={colors.primaryAccent} />
                  <Text
                    style={[
                      styles.reminderChipTextActive,
                      { color: colors.primaryAccent },
                    ]}
                  >
                    {formattedReminder}
                  </Text>
                  <TouchableOpacity
                    onPress={handleClearReminder}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Feather name="x" size={13} color={colors.primaryAccent} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.attachBtn,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor },
                  ]}
                  onPress={() => setIsReminderPickerVisible(true)}
                  activeOpacity={0.7}
                >
                  <Feather name="bell" size={15} color={colors.primaryAccent} />
                  <Text style={[styles.attachBtnText, { color: colors.textColor }]}>
                    {t('reminderButtonLabel')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Attached Images Carousel */}
          {images.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
              {images.map((uri, idx) => (
                <View key={idx} style={styles.imageThumbnailWrap}>
                  <Image source={{ uri }} style={styles.imageThumbnail} />
                  <TouchableOpacity
                    style={styles.imageDeleteBtn}
                    onPress={() => handleRemoveImage(idx)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Feather name="x" size={12} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Checklist Section */}
          <View style={styles.sectionDivider}>
            <View style={styles.checklistHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
                {t('checklist')}
              </Text>
              <TouchableOpacity
                onPress={handleAddChecklistItem}
                style={[styles.addCheckItemBtn, { backgroundColor: colors.surfaceSecondary }]}
                activeOpacity={0.7}
              >
                <Feather name="plus" size={14} color={colors.primaryAccent} />
                <Text style={[styles.addCheckItemText, { color: colors.primaryAccent }]}>
                  {t('addChecklistItem')}
                </Text>
              </TouchableOpacity>
            </View>

            {checklist.map((item) => (
              <View key={item.id} style={styles.checkItemRow}>
                <TouchableOpacity
                  onPress={() => handleToggleChecklistItem(item.id)}
                  style={styles.checkToggle}
                >
                  <Feather
                    name={item.done ? 'check-square' : 'square'}
                    size={20}
                    color={item.done ? colors.primaryAccent : colors.textColorSecondary}
                  />
                </TouchableOpacity>

                <TextInput
                  style={[
                    styles.checkInput,
                    {
                      color: colors.textColor,
                      textDecorationLine: item.done ? 'line-through' : 'none',
                      opacity: item.done ? 0.6 : 1,
                    },
                  ]}
                  placeholder={t('checklistItemPlaceholder')}
                  placeholderTextColor={colors.textColorSecondary}
                  value={item.text}
                  onChangeText={(text) => handleUpdateChecklistItem(item.id, text)}
                />

                <TouchableOpacity
                  onPress={() => handleDeleteChecklistItem(item.id)}
                  style={styles.checkDeleteBtn}
                >
                  <Feather name="x" size={16} color={colors.textColorSecondary} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Tags Section */}
          <View style={styles.sectionDivider}>
            <Text style={[styles.sectionTitle, { color: colors.textColor }]}>
              {t('tags')}
            </Text>

            {/* Current Tags */}
            <View style={styles.tagsContainer}>
              {tags.map((tag) => (
                <View
                  key={tag}
                  style={[styles.tagBadge, { backgroundColor: colors.surfaceSecondary }]}
                >
                  <Text style={[styles.tagText, { color: colors.primaryAccent }]}>
                    #{tag}
                  </Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={styles.tagCloseBtn}>
                    <Feather name="x" size={12} color={colors.textColorSecondary} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsRow}>
              {PRESET_TAG_KEYS.map((pt) => {
                const tagLabel = t(pt.key) || pt.defaultText;
                const isAdded = tags.includes(tagLabel);
                return (
                  <TouchableOpacity
                    key={pt.key}
                    onPress={() => (isAdded ? handleRemoveTag(tagLabel) : handleAddTag(tagLabel))}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: isAdded
                          ? colors.primaryAccent + '20'
                          : colors.componentBackground,
                        borderColor: isAdded ? colors.primaryAccent : colors.borderColor,
                      },
                    ]}
                  >
                    {isAdded ? (
                      <Feather name="check" size={10} color={colors.primaryAccent} />
                    ) : (
                      <Feather name="plus" size={10} color={colors.textColorSecondary} />
                    )}
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: isAdded ? colors.primaryAccent : colors.textColorSecondary },
                      ]}
                    >
                      {tagLabel}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Custom Tag Input */}
            <View style={styles.customTagRow}>
              <TextInput
                style={[
                  styles.customTagInput,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    color: colors.textColor,
                    borderColor: colors.borderColor,
                  },
                ]}
                placeholder={t('customTagPlaceholder')}
                placeholderTextColor={colors.textColorSecondary}
                value={newTagInput}
                onChangeText={setNewTagInput}
                onSubmitEditing={() => handleAddTag(newTagInput)}
              />
              <TouchableOpacity
                onPress={() => handleAddTag(newTagInput)}
                style={[styles.addTagBtn, { backgroundColor: colors.primaryAccent }]}
              >
                <Feather name="plus" size={16} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Reminder Picker Modal */}
      <Modal
        visible={isReminderPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReminderPickerVisible(false)}
      >
        <View style={styles.pickerOverlay}>
          <View
            style={[
              styles.pickerCard,
              { backgroundColor: colors.componentBackground, borderColor: colors.borderColor },
            ]}
          >
            {/* Header */}
            <View style={styles.pickerHeader}>
              <View style={styles.pickerHeaderLeft}>
                <Feather name="bell" size={18} color={colors.primaryAccent} />
                <Text style={[styles.pickerTitle, { color: colors.textColor }]}>
                  {t('reminderSetTitle')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsReminderPickerVisible(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Feather name="x" size={20} color={colors.textColorSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.pickerPresetRow}>
              <TouchableOpacity
                style={[styles.pickerPresetChip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor }]}
                onPress={() => handleQuickPreset('1h')}
              >
                <Feather name="clock" size={13} color={colors.primaryAccent} />
                <Text style={[styles.pickerPresetText, { color: colors.textColor }]}>
                  {t('reminderIn1Hour')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerPresetChip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor }]}
                onPress={() => handleQuickPreset('todayEvening')}
              >
                <Feather name="sunset" size={13} color={colors.primaryAccent} />
                <Text style={[styles.pickerPresetText, { color: colors.textColor }]}>
                  {t('reminderTodayEvening')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerPresetChip, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor }]}
                onPress={() => handleQuickPreset('tomorrowMorning')}
              >
                <Feather name="sunrise" size={13} color={colors.primaryAccent} />
                <Text style={[styles.pickerPresetText, { color: colors.textColor }]}>
                  {t('reminderTomorrowMorning')}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.pickerDivider, { backgroundColor: colors.borderColor }]} />

            {/* Custom Date Selector */}
            <Text style={[styles.pickerSectionLabel, { color: colors.textColorSecondary }]}>
              {t('reminderDateLabel')}
            </Text>
            <View style={styles.pickerDaysRow}>
              {[
                { offset: 0, label: t('reminderDayToday') },
                { offset: 1, label: t('reminderDayTomorrow') },
                { offset: 2, label: t('reminderDayAfterTomorrow') },
                { offset: 7, label: t('reminderDayInAWeek') },
              ].map((item) => {
                const isSelected = selectedDayOffset === item.offset;
                return (
                  <TouchableOpacity
                    key={item.offset}
                    style={[
                      styles.pickerDayChip,
                      {
                        backgroundColor: isSelected ? colors.primaryAccent : colors.surfaceSecondary,
                        borderColor: isSelected ? colors.primaryAccent : colors.borderColor,
                      },
                    ]}
                    onPress={() => setSelectedDayOffset(item.offset)}
                  >
                    <Text
                      style={[
                        styles.pickerDayChipText,
                        { color: isSelected ? '#ffffff' : colors.textColor },
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Time Section */}
            <Text style={[styles.pickerSectionLabel, { color: colors.textColorSecondary, marginTop: 12 }]}>
              {t('reminderTimeLabel')}
            </Text>

            {/* Quick Time Slots */}
            <View style={styles.pickerQuickTimeRow}>
              {[
                { h: 9, m: 0, label: '09:00' },
                { h: 12, m: 0, label: '12:00' },
                { h: 15, m: 0, label: '15:00' },
                { h: 18, m: 0, label: '18:00' },
                { h: 21, m: 0, label: '21:00' },
              ].map((slot) => {
                const isMatch = selectedHour === slot.h && selectedMinute === slot.m;
                return (
                  <TouchableOpacity
                    key={slot.label}
                    style={[
                      styles.pickerTimeSlot,
                      {
                        backgroundColor: isMatch ? colors.primaryAccent + '22' : colors.surfaceSecondary,
                        borderColor: isMatch ? colors.primaryAccent : colors.borderColor,
                      },
                    ]}
                    onPress={() => {
                      setSelectedHour(slot.h);
                      setSelectedMinute(slot.m);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerTimeSlotText,
                        { color: isMatch ? colors.primaryAccent : colors.textColor },
                      ]}
                    >
                      {slot.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Tumbler / Steppers for Hour & Minute */}
            <View style={styles.tumblerContainer}>
              {/* Hours Tumbler */}
              <View style={styles.tumblerCol}>
                <Text style={[styles.tumblerHeader, { color: colors.textColorSecondary }]}>
                  {t('reminderHourLabel')}
                </Text>
                <View style={[styles.tumblerBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor }]}>
                  <TouchableOpacity
                    style={styles.tumblerBtn}
                    onPress={() => setSelectedHour((prev) => (prev > 0 ? prev - 1 : 23))}
                  >
                    <Feather name="minus" size={16} color={colors.textColor} />
                  </TouchableOpacity>
                  <Text style={[styles.tumblerValue, { color: colors.textColor }]}>
                    {String(selectedHour).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.tumblerBtn}
                    onPress={() => setSelectedHour((prev) => (prev < 23 ? prev + 1 : 0))}
                  >
                    <Feather name="plus" size={16} color={colors.textColor} />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.tumblerColon, { color: colors.textColor }]}>:</Text>

              {/* Minutes Tumbler */}
              <View style={styles.tumblerCol}>
                <Text style={[styles.tumblerHeader, { color: colors.textColorSecondary }]}>
                  {t('reminderMinuteLabel')}
                </Text>
                <View style={[styles.tumblerBox, { backgroundColor: colors.surfaceSecondary, borderColor: colors.borderColor }]}>
                  <TouchableOpacity
                    style={styles.tumblerBtn}
                    onPress={() => setSelectedMinute((prev) => (prev >= 5 ? prev - 5 : 55))}
                  >
                    <Feather name="minus" size={16} color={colors.textColor} />
                  </TouchableOpacity>
                  <Text style={[styles.tumblerValue, { color: colors.textColor }]}>
                    {String(selectedMinute).padStart(2, '0')}
                  </Text>
                  <TouchableOpacity
                    style={styles.tumblerBtn}
                    onPress={() => setSelectedMinute((prev) => (prev <= 50 ? prev + 5 : 0))}
                  >
                    <Feather name="plus" size={16} color={colors.textColor} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Push Notification Notice */}
            <View style={[styles.pickerNotice, { backgroundColor: colors.surfaceSecondary }]}>
              <Feather name="info" size={14} color={colors.primaryAccent} />
              <Text style={[styles.pickerNoticeText, { color: colors.textColorSecondary }]}>
                {t('reminderNoticeApk')}
              </Text>
            </View>

            {/* Actions */}
            <View style={styles.pickerActionRow}>
              <TouchableOpacity
                style={[styles.pickerCancelBtn, { borderColor: colors.borderColor }]}
                onPress={() => setIsReminderPickerVisible(false)}
              >
                <Text style={[styles.pickerCancelText, { color: colors.textColorSecondary }]}>
                  {t('reminderCancelBtn')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.pickerConfirmBtn, { backgroundColor: colors.primaryAccent }]}
                onPress={handleConfirmCustomReminder}
              >
                <Feather name="check" size={16} color="#ffffff" />
                <Text style={styles.pickerConfirmText}>{t('reminderConfirmBtn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 48 : 20,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBtn: {
    padding: 6,
  },
  saveHeaderBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  colorSection: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginBottom: 4,
  },
  titleInput: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 22,
    paddingVertical: 8,
    marginBottom: 8,
  },
  contentInput: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
    marginBottom: 16,
  },
  sectionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150,150,150,0.2)',
    paddingTop: 16,
    marginBottom: 16,
  },
  checklistHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    marginBottom: 10,
  },
  addCheckItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addCheckItemText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  checkItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  checkToggle: {
    padding: 2,
  },
  checkInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    paddingVertical: 4,
  },
  checkDeleteBtn: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  tagText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  tagCloseBtn: {
    padding: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  customTagInput: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  addTagBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    gap: 8,
  },
  attachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  attachBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  reminderTriggers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  reminderChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  reminderChipTextActive: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  imageScroll: {
    marginVertical: 8,
  },
  imageThumbnailWrap: {
    position: 'relative',
    marginRight: 10,
  },
  imageThumbnail: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  imageDeleteBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Reminder Picker Modal Styles
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  pickerCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  pickerHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pickerTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 16,
  },
  pickerPresetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  pickerPresetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerPresetText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  pickerDivider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 12,
  },
  pickerSectionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    marginBottom: 8,
  },
  pickerDaysRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pickerDayChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerDayChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  pickerQuickTimeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  pickerTimeSlot: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  pickerTimeSlotText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  tumblerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 10,
  },
  tumblerCol: {
    alignItems: 'center',
  },
  tumblerHeader: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    marginBottom: 4,
  },
  tumblerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 4,
    gap: 8,
  },
  tumblerBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tumblerValue: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    minWidth: 32,
    textAlign: 'center',
  },
  tumblerColon: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 24,
    marginTop: 14,
  },
  pickerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    marginTop: 8,
    marginBottom: 16,
  },
  pickerNoticeText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    flex: 1,
  },
  pickerActionRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  pickerCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  pickerCancelText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
  pickerConfirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pickerConfirmText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
    color: '#ffffff',
  },
});
