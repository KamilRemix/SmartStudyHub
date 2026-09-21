import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../theme';
import { AppHeader } from '../../components/common/AppHeader';
import { NoteItem, NoteViewMode, NoteChecklistItem } from './types';
import { loadNotes, saveNotes } from './notesStorage';
import { TagFilter } from './components/TagFilter';
import { NoteCard } from './components/NoteCard';
import { NoteEditorModal } from './components/NoteEditorModal';
import { notificationService } from '../../services/notificationService';
import { cloudSyncService } from '../../services/cloudSync';
import { useAuth } from '../../context/AuthContext';
import { useI18n } from '../../i18n';

export const NotesScreen: React.FC = () => {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { t } = useI18n();

  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [viewMode, setViewMode] = useState<NoteViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const [activeNoteForEdit, setActiveNoteForEdit] = useState<NoteItem | null>(null);
  const [isEditorVisible, setIsEditorVisible] = useState(false);

  useEffect(() => {
    loadNotes().then((loaded) => {
      const sorted = [...loaded].sort(
        (a, b) =>
          (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
      );
      setNotes(sorted);
    });
  }, []);

  const persistNotes = async (updated: NoteItem[]) => {
    const sorted = [...updated].sort(
      (a, b) =>
        (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
    );
    setNotes(sorted);
    await saveNotes(sorted);
    if (user?.uid) {
      cloudSyncService.syncAll(user.uid).catch(() => {});
    }
  };

  // Collect all available tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      for (const t of n.tags || []) {
        set.add(t);
      }
    }
    return Array.from(set);
  }, [notes]);

  // Filter notes by search query and selected tag
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return notes.filter((n) => {
      const tags = n.tags || [];
      const matchesTag = !selectedTag || tags.includes(selectedTag);
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        tags.some((t) => t.toLowerCase().includes(q));
      return matchesTag && matchesSearch;
    });
  }, [notes, searchQuery, selectedTag]);

  // Sort notes by updatedAt descending (newly updated or created notes on top)
  const pinnedNotes = useMemo(
    () =>
      filteredNotes
        .filter((n) => n.pinned)
        .slice()
        .sort(
          (a, b) =>
            (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
        ),
    [filteredNotes]
  );
  const otherNotes = useMemo(
    () =>
      filteredNotes
        .filter((n) => !n.pinned)
        .slice()
        .sort(
          (a, b) =>
            (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
        ),
    [filteredNotes]
  );

  const handleTogglePin = (noteId: string) => {
    const updated = notes.map((n) =>
      n.id === noteId ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n
    );
    persistNotes(updated);
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(t('noteDeleteConfirm'), t('noteDeleteConfirmMessage'), [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: () => {
          const toDelete = notes.find((n) => n.id === noteId);
          if (toDelete?.notificationId) {
            notificationService.cancelReminder(toDelete.notificationId);
          }
          const updated = notes.filter((n) => n.id !== noteId);
          persistNotes(updated);
        },
      },
    ]);
  };

  const handleToggleChecklistItem = (noteId: string, itemId: string) => {
    const updated = notes.map((n) => {
      if (n.id === noteId && n.checklist) {
        return {
          ...n,
          checklist: n.checklist.map((c) =>
            c.id === itemId ? { ...c, done: !c.done } : c
          ),
          updatedAt: Date.now(),
        };
      }
      return n;
    });
    persistNotes(updated);
  };

  const handleOpenCreate = () => {
    setActiveNoteForEdit(null);
    setIsEditorVisible(true);
  };

  const handleOpenEdit = (note: NoteItem) => {
    setActiveNoteForEdit(note);
    setIsEditorVisible(true);
  };

  const handleSaveNote = async (noteData: {
    id?: string;
    title: string;
    content: string;
    checklist: NoteChecklistItem[];
    tags: string[];
    color: string;
    pinned: boolean;
    images?: string[];
    reminderTimestamp?: number;
  }) => {
    const now = Date.now();
    let notifId: string | undefined = undefined;

    if (noteData.reminderTimestamp && noteData.reminderTimestamp > now) {
      const scheduledId = await notificationService.scheduleReminder(
        noteData.id || `temp_${now}`,
        noteData.title,
        noteData.content,
        new Date(noteData.reminderTimestamp)
      );
      if (scheduledId) notifId = scheduledId;
    }

    let updated: NoteItem[];

    if (noteData.id) {
      // Edit existing
      updated = notes.map((n) =>
        n.id === noteData.id
          ? {
              ...n,
              title: noteData.title,
              content: noteData.content,
              checklist: noteData.checklist,
              tags: noteData.tags,
              color: noteData.color,
              pinned: noteData.pinned,
              images: noteData.images,
              reminderTimestamp: noteData.reminderTimestamp,
              notificationId: notifId !== undefined ? notifId : n.notificationId,
              updatedAt: now,
            }
          : n
      );
    } else {
      // Create new
      const newNote: NoteItem = {
        id: `note_${now}_${Math.random().toString(36).substring(2, 6)}`,
        title: noteData.title,
        content: noteData.content,
        checklist: noteData.checklist,
        tags: noteData.tags,
        color: noteData.color,
        pinned: noteData.pinned,
        images: noteData.images,
        reminderTimestamp: noteData.reminderTimestamp,
        notificationId: notifId,
        createdAt: now,
        updatedAt: now,
      };
      updated = [newNote, ...notes];
    }

    persistNotes(updated);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('notes')}
        subtitle={t('notesCount', { count: String(notes.length) })}
        rightActionSecondary={{
          icon: viewMode === 'grid' ? 'list' : 'grid',
          accessibilityLabel:
            viewMode === 'grid' ? t('switchToList') : t('switchToGrid'),
          onPress: () => setViewMode(viewMode === 'grid' ? 'list' : 'grid'),
        }}
        rightAction={{
          icon: 'plus',
          accessibilityLabel: t('takeANote'),
          onPress: handleOpenCreate,
        }}
      />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: colors.componentBackground,
              borderColor: colors.borderColor,
            },
          ]}
        >
          <Feather name="search" size={16} color={colors.textColorSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.textColor }]}
            placeholder={t('noteSearch')}
            placeholderTextColor={colors.textColorSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {Boolean(searchQuery) && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('clear')}
              style={styles.clearSearchBtn}
            >
              <Feather name="x" size={14} color={colors.textColorSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Horizontal Tag Strip */}
      <TagFilter
        selectedTag={selectedTag}
        onSelectTag={setSelectedTag}
        availableTags={availableTags}
      />

      {/* Notes List / Grid */}
      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Feather name="file-text" size={48} color={colors.textColorSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.textColor }]}>
              {searchQuery || selectedTag ? t('noteNotFound') : t('noteEmptyState')}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textColorSecondary }]}>
              {searchQuery || selectedTag
                ? t('noteNotFoundHint')
                : t('noteEmptyHint')}
            </Text>
            {!searchQuery && !selectedTag && (
              <TouchableOpacity
                onPress={handleOpenCreate}
                style={[styles.emptyCreateBtn, { backgroundColor: colors.primaryAccent }]}
              >
                <Feather name="plus" size={16} color="#ffffff" />
                <Text style={styles.emptyCreateBtnText}>{t('takeANote')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {/* Pinned Section */}
            {pinnedNotes.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Feather name="bookmark" size={14} color={colors.primaryAccent} />
                  <Text
                    style={[styles.sectionHeaderText, { color: colors.textColorSecondary }]}
                  >
                    {t('notePinned').toUpperCase()} ({pinnedNotes.length})
                  </Text>
                </View>
                <View style={viewMode === 'grid' ? styles.gridRow : styles.listColumn}>
                  {pinnedNotes.map((item) => (
                    <NoteCard
                      key={item.id}
                      note={item}
                      viewMode={viewMode}
                      onPress={() => handleOpenEdit(item)}
                      onTogglePin={() => handleTogglePin(item.id)}
                      onDelete={() => handleDeleteNote(item.id)}
                      onToggleChecklistItem={(clId) =>
                        handleToggleChecklistItem(item.id, clId)
                      }
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Others Section */}
            {otherNotes.length > 0 && (
              <View style={styles.section}>
                {pinnedNotes.length > 0 && (
                  <View style={styles.sectionHeader}>
                    <Text
                      style={[
                        styles.sectionHeaderText,
                        { color: colors.textColorSecondary },
                      ]}
                    >
                      {t('noteOthers').toUpperCase()} ({otherNotes.length})
                    </Text>
                  </View>
                )}
                <View style={viewMode === 'grid' ? styles.gridRow : styles.listColumn}>
                  {otherNotes.map((item) => (
                    <NoteCard
                      key={item.id}
                      note={item}
                      viewMode={viewMode}
                      onPress={() => handleOpenEdit(item)}
                      onTogglePin={() => handleTogglePin(item.id)}
                      onDelete={() => handleDeleteNote(item.id)}
                      onToggleChecklistItem={(clId) =>
                        handleToggleChecklistItem(item.id, clId)
                      }
                    />
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Editor Modal */}
      <NoteEditorModal
        visible={isEditorVisible}
        note={activeNoteForEdit}
        onClose={() => setIsEditorVisible(false)}
        onSave={handleSaveNote}
        onDelete={handleDeleteNote}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },
  clearSearchBtn: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  sectionHeaderText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  listColumn: {
    flexDirection: 'column',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 18,
    marginTop: 14,
  },
  emptySubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  emptyCreateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyCreateBtnText: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
  },
});
