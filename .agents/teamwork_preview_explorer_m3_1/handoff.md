# Handoff Report: Notes Module Investigation (Explorer M3-1)

**Author**: Explorer M3-1  
**Target Recipient**: Parent Orchestrator / Worker M3-1  
**Date**: 2026-09-13  
**Status**: Investigation Complete — Ready for Implementation  

---

## 1. Observation

### 1.1 Dependency Verification: `expo-clipboard`
- **File**: `c:\projects\SmartStudyHub\mobile-expo\package.json`
- **Lines 14-32**:
```json
  "dependencies": {
    "@expo-google-fonts/inter": "^0.2.3",
    "@expo-google-fonts/poppins": "^0.2.3",
    "@expo/vector-icons": "^15.0.2",
    "@react-native-async-storage/async-storage": "2.2.0",
    "@react-navigation/bottom-tabs": "^7.2.0",
    "@react-navigation/native": "^7.0.14",
    "@react-navigation/native-stack": "^7.18.10",
    "expo": "~57.0.22",
    "expo-asset": "~57.0.17",
    "expo-clipboard": "~57.0.2",
    "expo-font": "~57.0.4",
    "expo-speech": "~57.0.3",
    "expo-status-bar": "~57.0.1",
    "react": "19.2.3",
    "react-native": "0.86.3",
    "react-native-safe-area-context": "~5.7.0",
    "react-native-screens": "~4.26.0"
  },
```
- **Finding**: `expo-clipboard` is already installed (`~57.0.2`). No additional npm/yarn install command is required.
- **Reference usage in project**: `mobile-expo/src/modules/tools/screens/GenPassScreen.tsx:12`:
  `import * as Clipboard from 'expo-clipboard';` and `await Clipboard.setStringAsync(password);`.

---

### 1.2 Legacy Sorting Parity: `public/notes.js` vs `NotesScreen.tsx`
- **Legacy Web Code** (`public/notes.js:855-856`):
```javascript
const pinned = allNotes.filter(n => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
const others = allNotes.filter(n => !n.pinned).sort((a, b) => b.updatedAt - a.updatedAt);
```
- **Mobile Code** (`mobile-expo/src/modules/notes/NotesScreen.tsx:71-78`):
```typescript
  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.pinned),
    [filteredNotes]
  );
  const otherNotes = useMemo(
    () => filteredNotes.filter((n) => !n.pinned),
    [filteredNotes]
  );
```
- **Finding**: `NotesScreen.tsx` lacks `.sort((a, b) => b.updatedAt - a.updatedAt)`.
- Furthermore, in `handleSaveNote` (`NotesScreen.tsx:141-154`), editing an existing note updates its properties with `updatedAt: now`, but updates `notes` via `.map(...)`, leaving the edited note at its historical position in the array rather than moving it to the top.
- In `handleTogglePin` (`NotesScreen.tsx:80-85`) and `handleToggleChecklistItem` (`NotesScreen.tsx:101-115`), `updatedAt` is updated, but because the array is not sorted, notes remain static in place.

---

### 1.3 Filtering & Tagging Logic
- **Component**: `mobile-expo/src/modules/notes/components/TagFilter.tsx`
  - Defines `PRESET_TAGS = ['Все', 'Учеба', 'Важное', 'Планы', 'Идеи']`.
  - Merges `availableTags` dynamically: `new Set(PRESET_TAGS); for (const t of availableTags) if (t.trim()) set.add(t.trim());`.
  - Tapping `'Все'` sends `''` (empty string) to clear filter.
  - Tapping a specific tag sends that tag name.
- **Filtering**: `NotesScreen.tsx:54-69`:
  - `const matchesTag = !selectedTag || n.tags.includes(selectedTag);`
  - Correctly matches selected tag or shows all notes if no tag is selected.
  - Text search query matches against `n.title`, `n.content`, `n.tags`, and `n.checklist`.
- **Editor Modal**: `mobile-expo/src/modules/notes/components/NoteEditorModal.tsx:280-361`:
  - Renders currently assigned tags as dismissible badges (`#tag` with `x` icon).
  - Renders quick preset chips (`PRESET_TAGS`). Tapping toggles inclusion.
  - Provides custom tag input field with `+` button and keyboard submit (`onSubmitEditing`).
  - Passes `tags: string[]` to `onSave`.
- **Persistence**: `notesStorage.ts`:
  - Serializes `NoteItem[]` to AsyncStorage key `@smartstudy_notes_data`.
  - Loaded notes retain `tags: string[]`.
- **Vulnerability Found**:
  - In `NotesScreen.tsx:46`: `for (const t of n.tags)`
  - In `NotesScreen.tsx:57`: `n.tags.includes(selectedTag)`
  - In `NotesScreen.tsx:64`: `n.tags.some((t) => ...)`
  - If any note stored in AsyncStorage lacks `tags` (e.g., from corrupt data or schema evolution), it throws an unhandled `TypeError: Cannot read properties of undefined (reading 'includes')`. Defensive normalization `(n.tags || [])` is necessary.

---

### 1.4 Clipboard Copy Missing in `NoteCard.tsx`
- **File**: `mobile-expo/src/modules/notes/components/NoteCard.tsx`
- **Lines 56-80**:
```typescript
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={onTogglePin}
            accessibilityRole="button"
            accessibilityLabel={note.pinned ? 'Открепить заметку' : 'Закрепить заметку'}
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
            accessibilityLabel="Удалить заметку"
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={16} color={iconColor} />
          </TouchableOpacity>
        </View>
```
- **Finding**: There is no copy-to-clipboard button.
- User cannot copy note content from the note card.

---

### 1.5 UI Preservation and Emoji Ban
- All components in `mobile-expo/src/modules/notes/` use exclusively:
  - `@expo/vector-icons` (`Feather`).
  - Native `StyleSheet` styles with dynamic theme tokens from `useTheme()`.
  - Zero unicode emojis found in any text strings or icons.
  - Layout (`gridCard` / `listCard`) is responsive and preserves Google Keep aesthetics.

---

## 2. Logic Chain

### 2.1 Sorting Solution
1. **Observation 1.2**: In legacy `public/notes.js`, both pinned and non-pinned note collections are sorted descending by `updatedAt`: `(a, b) => b.updatedAt - a.updatedAt`.
2. **Inference**: In `NotesScreen.tsx`, `pinnedNotes` and `otherNotes` must apply `.sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0))`.
3. **Inference**: In `persistNotes`, sorting the array before persisting ensures that newly created and updated notes are stored in chronologically descending order in AsyncStorage, guaranteeing consistent ordering on subsequent app launches.

### 2.2 Tagging & Filtering Hardening
1. **Observation 1.3**: Tag filtering in `NotesScreen.tsx` and tag management in `NoteEditorModal.tsx` are fully implemented, but direct property accesses on `n.tags` lack fallback protection.
2. **Inference**: Replace `n.tags` with `(n.tags || [])` in `availableTags` loop and in `filteredNotes` conditions. This preserves 100% of existing functionality while immunizing against potential undefined tag errors.

### 2.3 Clipboard Copy Implementation in `NoteCard.tsx`
1. **Observation 1.1 & 1.4**: `expo-clipboard` is installed. `GenPassScreen.tsx` provides proven pattern: `import * as Clipboard from 'expo-clipboard';` and `Clipboard.setStringAsync(text)`.
2. **Inference**: Add 1-click copy button to `styles.actionsRow` in `NoteCard.tsx`:
   - Text formatting:
     - If `title` is present, include it.
     - If `content` is present, include it.
     - If `checklist` is present, include checklist items formatted as `[x] item` or `[ ] item`.
     - Join sections with double newlines `\n\n`.
   - Feedback: Local state `copied` toggles Feather icon from `'copy'` to `'check'` for 2000ms.
   - Styling: Uses existing `styles.iconBtn` (padding: 4) and `iconColor` / `colors.primaryAccent`.
   - Zero emojis: Text strictly adheres to system font; icons are strictly Feather.

---

## 3. Caveats

1. **Clipboard on Web vs Native**: `expo-clipboard` works seamlessly across iOS, Android, and Web in Expo SDK 52/57. No platform-specific conditionals are needed.
2. **Empty Note Copying**: If a note has neither title, content, nor checklist, `handleCopy` should safely no-op without crashing.
3. **Checklist String Formatting**: Standard markdown checklist format (`[x] text` / `[ ] text`) is used to avoid emojis while retaining clarity when pasted into external apps (chat, email, markdown editors).
4. **Scope Limitation**: Cloud Firebase sync is part of Milestone 4 (R4); this milestone focuses exclusively on local business logic, sorting, filtering, tagging, and clipboard copying.

---

## 4. Conclusion & Precise Code Modifications for Worker

The Notes module has an exceptional foundation and requires only three localized edits to achieve 100% parity with legacy SmartStudyHub and meet all project guidelines.

### Target File 1: `mobile-expo/src/modules/notes/NotesScreen.tsx`

#### Edit 1.1: Robust `availableTags` collection
**Lines 43-51**:
```typescript
<<<< BEFORE
  // Collect all available tags
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const n of notes) {
      for (const t of n.tags) {
        set.add(t);
      }
    }
    return Array.from(set);
  }, [notes]);
==== AFTER
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
>>>>
```

#### Edit 1.2: Robust filtering and descending `updatedAt` sorting
**Lines 54-79**:
```typescript
<<<< BEFORE
  // Filter notes by search query and selected tag
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return notes.filter((n) => {
      const matchesTag = !selectedTag || n.tags.includes(selectedTag);
      if (!matchesTag) return false;

      if (!q) return true;

      const titleMatch = n.title.toLowerCase().includes(q);
      const contentMatch = n.content.toLowerCase().includes(q);
      const tagMatch = n.tags.some((t) => t.toLowerCase().includes(q));
      const checklistMatch = n.checklist?.some((c) => c.text.toLowerCase().includes(q));

      return titleMatch || contentMatch || tagMatch || checklistMatch;
    });
  }, [notes, searchQuery, selectedTag]);

  const pinnedNotes = useMemo(
    () => filteredNotes.filter((n) => n.pinned),
    [filteredNotes]
  );
  const otherNotes = useMemo(
    () => filteredNotes.filter((n) => !n.pinned),
    [filteredNotes]
  );
==== AFTER
  // Filter notes by search query and selected tag
  const filteredNotes = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return notes.filter((n) => {
      const tags = n.tags || [];
      const matchesTag = !selectedTag || tags.includes(selectedTag);
      if (!matchesTag) return false;

      if (!q) return true;

      const titleMatch = n.title.toLowerCase().includes(q);
      const contentMatch = n.content.toLowerCase().includes(q);
      const tagMatch = tags.some((t) => t.toLowerCase().includes(q));
      const checklistMatch = n.checklist?.some((c) => c.text.toLowerCase().includes(q));

      return titleMatch || contentMatch || tagMatch || checklistMatch;
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
>>>>
```

#### Edit 1.3: Maintain sorted order on persistence
**Lines 37-40**:
```typescript
<<<< BEFORE
  const persistNotes = async (updated: NoteItem[]) => {
    setNotes(updated);
    await saveNotes(updated);
  };
==== AFTER
  const persistNotes = async (updated: NoteItem[]) => {
    const sorted = [...updated].sort(
      (a, b) =>
        (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
    );
    setNotes(sorted);
    await saveNotes(sorted);
  };
>>>>
```

---

### Target File 2: `mobile-expo/src/modules/notes/components/NoteCard.tsx`

#### Edit 2.1: Add `useState`, `expo-clipboard`, and copy action
**Lines 1-3**:
```typescript
<<<< BEFORE
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
==== AFTER
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
>>>>
```

#### Edit 2.2: Add `handleCopy` implementation and `actionsRow` copy button
**Lines 23-80**:
```typescript
<<<< BEFORE
export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  onPress,
  onTogglePin,
  onDelete,
  onToggleChecklistItem,
}) => {
  const { colors } = useTheme();

  const isCustomColor = Boolean(note.color);
  const cardBg = note.color || colors.componentBackground;
  const titleColor = isCustomColor ? '#ffffff' : colors.textColor;
  const textColor = isCustomColor ? '#e0e0e0' : colors.textColorSecondary;
  const iconColor = isCustomColor ? '#ffffff' : colors.textColorSecondary;

  const checklist = note.checklist || [];
  const previewChecklist = checklist.slice(0, 4);
  const remainingCount = checklist.length - previewChecklist.length;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Заметка ${note.title || 'Без названия'}`}
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
          {note.title || 'Без названия'}
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={onTogglePin}
            accessibilityRole="button"
            accessibilityLabel={note.pinned ? 'Открепить заметку' : 'Закрепить заметку'}
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
            accessibilityLabel="Удалить заметку"
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={16} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>
==== AFTER
export const NoteCard: React.FC<NoteCardProps> = ({
  note,
  viewMode,
  onPress,
  onTogglePin,
  onDelete,
  onToggleChecklistItem,
}) => {
  const { colors } = useTheme();
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
      accessibilityLabel={`Заметка ${note.title || 'Без названия'}`}
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
          {note.title || 'Без названия'}
        </Text>
        <View style={styles.actionsRow}>
          <TouchableOpacity
            onPress={handleCopy}
            accessibilityRole="button"
            accessibilityLabel={copied ? 'Скопировано в буфер обмена' : 'Скопировать текст заметки'}
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
            accessibilityLabel={note.pinned ? 'Открепить заметку' : 'Закрепить заметку'}
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
            accessibilityLabel="Удалить заметку"
            style={styles.iconBtn}
            activeOpacity={0.7}
          >
            <Feather name="trash-2" size={16} color={iconColor} />
          </TouchableOpacity>
        </View>
      </View>
>>>>
```

---

## 5. Verification Method

### 5.1 Static Verification
1. **Typecheck command**:
   ```bash
   cd c:\projects\SmartStudyHub\mobile-expo
   npm run typecheck
   ```
   *Expected result*: Exit code 0, zero diagnostic errors across the entire codebase.

2. **Emoji Audit**:
   Verify zero unicode emojis exist in the modified files:
   ```bash
   Select-String -Path "c:\projects\SmartStudyHub\mobile-expo\src\modules\notes\*.tsx", "c:\projects\SmartStudyHub\mobile-expo\src\modules\notes\components\*.tsx" -Pattern '[\uD83C-\uDBFF\uDC00-\uDFFF]'
   ```
   *Expected result*: Zero matches found.

3. **Layout & Style Diff Audit**:
   Verify `git diff mobile-expo/src/modules/notes/` confirms:
   - Zero modifications to `StyleSheet.create` rules.
   - Zero removals of existing JSX wrapper structures (`card`, `headerRow`, `actionsRow`, `checklistContainer`, `tagsRow`).
   - Only non-destructive addition of `handleCopy` and the copy `TouchableOpacity` button with Feather `'copy'` / `'check'` icon.

### 5.2 Functional Verification
1. **Sorting**:
   - Create Note A, then Note B. Note B appears at the top of the list/grid.
   - Edit Note A: Note A's `updatedAt` updates and Note A immediately jumps to the top of the "ДРУГИЕ" section.
   - Pin Note A: Note A appears in "ЗАКРЕПЛЕННЫЕ".
   - Edit another pinned note: that pinned note immediately moves to the top of "ЗАКРЕПЛЕННЫЕ".
2. **Filtering & Tagging**:
   - Create a note with tag `Экзамен` (custom tag).
   - In `TagFilter`, verify `Экзамен` chip appears dynamically.
   - Tap `Экзамен`: only the tagged note is displayed.
   - Tap `Все`: all notes are displayed again.
   - Search `Экзамен`: matches note via tag search.
3. **Clipboard Copy**:
   - Tap copy icon on a note card.
   - The Feather icon changes to a checkmark for 2 seconds.
   - Paste clipboard into any text editor; verify title, text, and checklist lines are copied cleanly.
