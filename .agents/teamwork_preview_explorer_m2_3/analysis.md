# Comprehensive Analysis: Notes Module (SmartStudyHub Mobile Expo)

## 1. Executive Summary

The Notes module provides a Google Keep-style notes and task management workspace tailored for students. It supports rich note cards with title, markdown/plain text content, dynamic checklist items with completion toggling, 10-color background tinting from the official web palette, multi-tag categorization, live search filtering across all note content, note pinning with prioritized section sorting, responsive view switching between a 2-column grid and 1-column list, and offline persistence backed by `@react-native-async-storage/async-storage` under key `@smartstudy_notes_data`.

The existing implementation in `c:\projects\SmartStudyHub\mobile-expo\src\modules\notes\NotesScreen.tsx` is currently a static UI placeholder without interactive state or storage. This document provides the complete technical blueprint, data schema, component breakdown, storage contracts, and implementation plan for the Milestone 2 Notes module.

---

## 2. Requirements & Specification Matrix

| # | Requirement | Specification | Source | Status in Mobile Expo |
|---|---|---|---|---|
| **R1** | Notes CRUD | Full Create, Read, Update, Delete with `title`, `content`, `createdAt`, `updatedAt` | `PROJECT.md` #16, `ORIGINAL_REQUEST.md` R3 | Placeholder in `NotesScreen.tsx` |
| **R2** | Dynamic Checklists | Interactive checklist items `{ id, text, done }`, toggle completion, add new items, delete items, preview on card | `PROJECT.md` #17, `public/notes.js:756-789` | Needs Implementation |
| **R3** | 10-Color Palette | Exact 10 web palette hex values (Default + 9 colors) with high-contrast text rendering | `PROJECT.md` #18, `src/theme/colors.ts:61-72` | Palette defined in `colors.ts`, UI needed |
| **R4** | Live Search & Tag Filter | Live text search across title, content, and checklist text; horizontal tag strip with preset and custom tags | `PROJECT.md` #19, `public/notes.js:840-853` | Static tag chips, no search state |
| **R5** | Pinning & View Mode | Pinning to "Pinned" top section; 2-column grid and 1-column list toggle | `PROJECT.md` #20, `public/notes.js:321-333` | Static header button, no state |
| **R6** | AsyncStorage Persistence | Full offline storage under `@smartstudy_notes_data` with safe JSON serialization | `PROJECT.md` #21 & Storage Schema | Key not yet integrated in notes |
| **R7** | Zero Emoji Ban | 100% Vector icons using Feather from `@expo/vector-icons`; zero unicode emojis in UI code | `PROJECT.md` #6, `AGENTS.md` | Verified rule compliance required |
| **R8** | Quality & Stubs | Zero `// TODO` or `// FIXME` comments in core logic; genuine implementation | `ORIGINAL_REQUEST.md` | To be enforced during build |

---

## 3. Web Implementation Dissection

Investigation of `c:\projects\SmartStudyHub\public\notes.js`, `public\index.html`, and `public\style.css` reveals the authoritative behavior and data contracts of the web application:

### 3.1 Data Structures in Web (`public/notes.js:806-817`)
```javascript
const newNote = {
    id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
    title: string,
    text: string,
    checklist: Array<{ text: string, checked: boolean }> | null,
    image: string | null,
    reminder: number | null,
    reminderFired: boolean,
    color: string,          // hex color or empty string
    pinned: boolean,
    createdAt: number,
    updatedAt: number
};
```

### 3.2 10-Color Palette in Web (`public/index.html:477-486, 545-554`)
The web application uses the following exact 10 color definitions:
1. **Default**: `""` (card uses standard surface/card theme background)
2. **Red**: `#5c2b29`
3. **Orange**: `#614a19`
4. **Yellow**: `#635d19`
5. **Green**: `#345920`
6. **Teal**: `#16504b`
7. **Blue**: `#2d555e`
8. **Dark Blue**: `#1e3a8a`
9. **Purple**: `#42275e`
10. **Pink**: `#5b2245`

In `mobile-expo/src/theme/colors.ts` (lines 61-72), `NOTE_COLOR_PALETTE` exactly mirrors this 10-color array.

### 3.3 Pinning & Section Separation (`public/notes.js:855-874`)
- Notes are split into two arrays:
  - `pinned`: `allNotes.filter(n => n.pinned).sort((a, b) => b.updatedAt - a.updatedAt)`
  - `others`: `allNotes.filter(n => !n.pinned).sort((a, b) => b.updatedAt - a.updatedAt)`
- When pinned notes exist, a "Pinned" section header is shown above `pinnedGrid`.
- When both pinned and others exist, an "Others" section header is displayed.
- When no notes are pinned, all notes render in the primary grid without the "Others" label.

### 3.4 Checklist Mechanics (`public/notes.js:758-789`)
- Each row contains a checkbox, input text, and delete button.
- Pressing Enter in an item automatically appends a new empty item and shifts focus.
- On card preview (`makeCard`, line 942): up to 5 checklist items are rendered with checkbox indicators. If more than 5 items exist, a "+N еще" badge is displayed. Completed items have `opacity: 0.55` and `text-decoration: line-through`.

### 3.5 Layout Toggle (`public/notes.js:323-333`)
- `isGridView` boolean: toggles between multi-column grid layout and single-column list layout (`.notes-list-view`).
- Search filtering runs simultaneously against `title`, `text`, and any `checklist[i].text`.

---

## 4. Current Mobile Expo Assessment

### 4.1 Existing Files
1. **`c:\projects\SmartStudyHub\mobile-expo\src\modules\notes\NotesScreen.tsx`**:
   - Contains a static mock layout with `AppHeader`, a dummy search bar, static tag chips `['Все', 'Учеба', 'Важное', 'Планы', 'Идеи']`, and an empty-state illustration.
   - Header action buttons (`plus` and `grid`) have empty callbacks `() => {}`.
   - No state hooks, no storage calls, no checklist renderer, no modal editor.
2. **`c:\projects\SmartStudyHub\mobile-expo\src\modules\notes\index.ts`**:
   - Exports `* from './NotesScreen'`.
3. **`c:\projects\SmartStudyHub\mobile-expo\src\theme\colors.ts`**:
   - Exports `NOTE_COLOR_PALETTE` with the 10 note colors.
4. **`c:\projects\SmartStudyHub\mobile-expo\src\components\common\AppHeader.tsx`**:
   - Reusable header supporting `leftAction`, `rightAction`, and `rightActionSecondary` with Feather vector icons.

### 4.2 Gaps Identified
- Missing `types.ts` for note item definitions, checklist items, and filter states.
- Missing persistence service (`notesStorage.ts`) using `@react-native-async-storage/async-storage`.
- Missing `NoteCard.tsx` component with 2-column grid vs 1-column list styling and color background application.
- Missing `NoteEditorModal.tsx` for creating/editing notes, checklists, tags, colors, and pin status.
- Missing interactive `ColorPicker.tsx` component.
- Missing interactive `TagFilter.tsx` component with dynamic tag extraction.

---

## 5. Technical Architecture & Component Design

### 5.1 Data Model & Types (`src/modules/notes/types.ts`)

```typescript
export interface NoteChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface NoteItem {
  id: string;
  title: string;
  content: string; // Body text
  checklist?: NoteChecklistItem[];
  tags: string[];
  color: string;   // Empty string for default, or one of NOTE_COLOR_PALETTE hexes
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NoteViewMode = 'grid' | 'list';

export interface NotesFilterOptions {
  searchQuery: string;
  selectedTag: string; // 'Все' or specific tag
}
```

### 5.2 Offline Storage Engine (`src/modules/notes/notesStorage.ts`)
- **Key**: `@smartstudy_notes_data` (matching `STORAGE_KEYS.NOTES` in `PROJECT.md:91`).
- **Initial Seed Data**: If storage is empty upon initial launch, provide 2 helpful onboarding notes (one introducing the notes editor & 10-color palette, and one with a study checklist) so the user experiences immediate interactivity without looking at a blank screen.
- **Operations**:
  ```typescript
  export async function loadNotes(): Promise<NoteItem[]>
  export async function saveNotes(notes: NoteItem[]): Promise<void>
  export async function addNote(noteData: Omit<NoteItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<NoteItem>
  export async function updateNote(id: string, updates: Partial<Omit<NoteItem, 'id' | 'createdAt'>>): Promise<NoteItem | null>
  export async function deleteNote(id: string): Promise<boolean>
  export async function togglePinNote(id: string): Promise<NoteItem | null>
  export async function toggleChecklistItem(noteId: string, itemId: string): Promise<NoteItem | null>
  ```

### 5.3 Dynamic Checklists Subsystem
- **Editor Experience**:
  - In `NoteEditorModal`, each checklist item is an editable row:
    - Checkbox toggle button (`Feather` icon `check-square` vs `square`).
    - `TextInput` for editing the item text.
    - Delete button (`Feather` icon `trash-2` or `x`).
  - "+ Добавить пункт" button to append a new item.
  - Submitting or pressing Return in the input automatically adds the next item.
- **Card Preview**:
  - Displays up to 4-5 items with small square / check-square icons.
  - Checked items show line-through formatting and dimmed text opacity.
  - If more items exist: renders `+N еще` badge.

### 5.4 10-Color Palette System & Card Contrast
- **Palette Items**:
  1. Default (`""`): Uses `colors.componentBackground` and `colors.borderColor`.
  2. Red: `#5c2b29`
  3. Orange: `#614a19`
  4. Yellow: `#635d19`
  5. Green: `#345920`
  6. Teal: `#16504b`
  7. Blue: `#2d555e`
  8. Dark Blue: `#1e3a8a`
  9. Purple: `#42275e`
  10. Pink: `#5b2245`
- **Contrast Management**:
  - If `note.color` is non-empty, the card applies `backgroundColor: note.color`.
  - Because all 9 web palette tints are deep tones, text colors must automatically adapt to high-contrast white tokens:
    - Title: `#FFFFFF`
    - Body / Checklist: `rgba(255, 255, 255, 0.92)`
    - Secondary / Tags / Borders: `rgba(255, 255, 255, 0.65)`
  - If `note.color` is empty (default), standard dynamic theme tokens are used: `colors.textColor`, `colors.textColorSecondary`, `colors.borderColor`.

### 5.5 Live Search & Dynamic Tag Filtering
- **Live Search**:
  - Filter function normalizes search query `const q = searchQuery.trim().toLowerCase()`.
  - Condition:
    ```typescript
    (note.title.toLowerCase().includes(q) ||
     note.content.toLowerCase().includes(q) ||
     (note.checklist || []).some(item => item.text.toLowerCase().includes(q)) ||
     note.tags.some(tag => tag.toLowerCase().includes(q)))
    ```
- **Tag Filtering**:
  - Base preset tags: `['Все', 'Учеба', 'Важное', 'Планы', 'Идеи']`.
  - Dynamic discovery: Extract all distinct tags from all existing notes and union with presets.
  - When a tag is active (e.g., `'Учеба'`), only notes containing that tag are displayed.

### 5.6 Pinning & View Mode
- **Pinning**:
  - Tapping the bookmark icon toggles `note.pinned`.
  - List partitions into:
    - Pinned: `notes.filter(n => n.pinned).sort((a,b) => b.updatedAt - a.updatedAt)`
    - Others: `notes.filter(n => !n.pinned).sort((a,b) => b.updatedAt - a.updatedAt)`
- **View Mode**:
  - Controlled by header icon toggle (`Feather` name `grid` when in list mode, `list` when in grid mode).
  - Persisted in state (defaults to `'grid'`).
  - **Grid**: `width: '48.5%'`, 2 columns, wrapping `ScrollView`.
  - **List**: `width: '100%'`, 1 column.

### 5.7 Component Hierarchy
```
NotesScreen
├── AppHeader (Title: "Заметки", rightAction: "+", rightActionSecondary: "grid/list")
├── SearchBar (TextInput, Feather 'search', clear Feather 'x')
├── TagFilter (Horizontal ScrollView, Tag Chips)
├── ScrollView (Content Area)
│   ├── PinnedSection (Label: "Закрепленные", 2-col Grid or 1-col List)
│   │   └── NoteCard[]
│   ├── OthersSection (Label: "Другие", 2-col Grid or 1-col List)
│   │   └── NoteCard[]
│   └── EmptyState (Feather 'file-text', message if no notes found)
└── NoteEditorModal (Modal)
    ├── ModalHeader (Close 'x', Pin 'bookmark', Delete 'trash-2', Save 'check')
    ├── TitleInput
    ├── ContentInput
    ├── ChecklistEditor (Checklist items, add button, checkboxes, remove)
    ├── TagSelector (Toggle tags or add custom tag)
    └── ColorPicker (10 color circles)
```

---

## 6. Strict Iconography & Zero Emoji Compliance

Every visual element must use vector icons from `@expo/vector-icons` (`Feather`).
| Purpose | Icon Library | Name |
|---|---|---|
| Create Note | `Feather` | `plus` |
| View Toggle | `Feather` | `grid` / `list` |
| Search | `Feather` | `search` |
| Clear / Close | `Feather` | `x` |
| Pin / Pinned | `Feather` | `bookmark` |
| Unchecked Item | `Feather` | `square` |
| Checked Item | `Feather` | `check-square` |
| Delete Note / Item | `Feather` | `trash-2` |
| Edit | `Feather` | `edit-2` |
| Tag | `Feather` | `tag` |
| Empty State | `Feather` | `file-text` |
| Save / Confirm | `Feather` | `check` |

**Zero Emoji Verification**:
No emoji unicode characters are permitted in code, strings, tooltips, or comments. All tests must verify 0 emoji occurrences.

---

## 7. Storage Key Verification

- Key name: `@smartstudy_notes_data`
- Interface:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

export const NOTES_STORAGE_KEY = '@smartstudy_notes_data';
```
Tested against `PROJECT.md:91`: `NOTES: '@smartstudy_notes_data'`.

---

## 8. Summary of Files to Implement in Milestone 2

1. `mobile-expo/src/modules/notes/types.ts`
2. `mobile-expo/src/modules/notes/notesStorage.ts`
3. `mobile-expo/src/modules/notes/ColorPicker.tsx`
4. `mobile-expo/src/modules/notes/TagFilter.tsx`
5. `mobile-expo/src/modules/notes/NoteCard.tsx`
6. `mobile-expo/src/modules/notes/NoteEditorModal.tsx`
7. `mobile-expo/src/modules/notes/NotesScreen.tsx` (Refactor from placeholder to full interactive module)
8. `mobile-expo/src/modules/notes/index.ts`
9. `mobile-expo/tests/notesStorage.test.ts` (Automated tests for CRUD, filtering, persistence)
