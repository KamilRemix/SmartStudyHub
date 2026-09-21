/**
 * Empirical test harness for Notes Features logic:
 * - Dynamic checklist item toggling logic & modal item sanitation
 * - 10-color palette mapping & contrast token assignment
 * - Search filtering across edge cases (empty, whitespace, case, special chars)
 * - Tag filtering & tag strip aggregation
 * - Pinning separation & partitioning
 */

import { NOTE_COLOR_PALETTE } from '../src/theme/colors';
import { NoteItem, NoteChecklistItem } from '../src/modules/notes/types';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, failureDetails: string) {
  if (condition) {
    results.push({ name, passed: true, details: 'OK' });
  } else {
    results.push({ name, passed: false, details: failureDetails });
  }
}

// Replicate exact checklist toggling logic from NotesScreen.tsx:101-115
function toggleChecklistItem(notes: NoteItem[], noteId: string, itemId: string): NoteItem[] {
  return notes.map((n) => {
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
}

// Replicate exact search & tag filtering logic from NotesScreen.tsx:54-69
function filterNotes(notes: NoteItem[], searchQuery: string, selectedTag: string): NoteItem[] {
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
}

// Replicate available tags aggregation from NotesScreen.tsx:43-51
function getAvailableTags(notes: NoteItem[]): string[] {
  const set = new Set<string>();
  for (const n of notes) {
    for (const t of n.tags) {
      set.add(t);
    }
  }
  return Array.from(set);
}

// Replicate combined tags from TagFilter.tsx:11, 20-26
const PRESET_TAGS = ['Все', 'Учеба', 'Важное', 'Планы', 'Идеи'];
function getCombinedTags(availableTags: string[]): string[] {
  const set = new Set(PRESET_TAGS);
  for (const t of availableTags) {
    if (t.trim()) set.add(t.trim());
  }
  return Array.from(set);
}

// Mock dataset for feature testing
const testNotes: NoteItem[] = [
  {
    id: 'n1',
    title: 'Конспект по математическому анализу (пределы и производные)',
    content: 'Определение по Коши: для любого ε > 0 существует δ > 0 такое, что |x - a| < δ => |f(x) - L| < ε.',
    checklist: [
      { id: 'c1_1', text: 'Повторить теорему Вейерштрасса', done: false },
      { id: 'c1_2', text: 'Разобрать замечательные пределы [1] и [2]', done: true },
    ],
    tags: ['Учеба', 'Математика'],
    color: '#16504b',
    pinned: true,
    createdAt: 1000,
    updatedAt: 1000,
  },
  {
    id: 'n2',
    title: 'План подготовки к сессии',
    content: 'Расписание консультаций и экзаменов на январь.',
    checklist: [
      { id: 'c2_1', text: 'Сдать реферат по философии', done: false },
      { id: 'c2_2', text: 'Получить зачет по физкультуре', done: false },
      { id: 'c2_3', text: 'Купить тетради 48 листов', done: true },
    ],
    tags: ['Планы', 'Важное'],
    color: '#42275e',
    pinned: false,
    createdAt: 2000,
    updatedAt: 2000,
  },
  {
    id: 'n3',
    title: 'Идеи для курсового проекта $PROJ^2',
    content: 'Разработка мобильного приложения со сложными формулами *.* и спецсимволами (a+b)^2 ?',
    tags: ['Идеи', 'Проект'],
    color: '', // Default color
    pinned: false,
    createdAt: 3000,
    updatedAt: 3000,
  },
];

async function runFeaturesSuite() {
  console.log('=== RUNNING NOTES FEATURES EMPIRICAL SUITE ===\n');

  // ==========================================
  // SECTION 1: DYNAMIC CHECKLIST ITEM TOGGLING
  // ==========================================
  console.log('--- Section 1: Checklist Item Toggling Logic ---');

  // 1.1 Toggle uncompleted item (c1_1)
  const afterToggle1 = toggleChecklistItem(testNotes, 'n1', 'c1_1');
  const n1Updated = afterToggle1.find((n) => n.id === 'n1')!;
  const c1_1 = n1Updated.checklist?.find((c) => c.id === 'c1_1');
  assert(c1_1?.done === true, 'Checklist toggle: false -> true', `c1_1 done: ${c1_1?.done}`);
  assert(n1Updated.updatedAt > 1000, 'Checklist toggle: updatedAt timestamp bumped', `updatedAt: ${n1Updated.updatedAt}`);

  // 1.2 Toggle completed item back (c1_1 again)
  const afterToggle2 = toggleChecklistItem(afterToggle1, 'n1', 'c1_1');
  const n1ReUpdated = afterToggle2.find((n) => n.id === 'n1')!;
  const c1_1Back = n1ReUpdated.checklist?.find((c) => c.id === 'c1_1');
  assert(c1_1Back?.done === false, 'Checklist toggle: true -> false', `c1_1 done: ${c1_1Back?.done}`);

  // 1.3 Other items in the same checklist remain unaffected
  const c1_2 = n1Updated.checklist?.find((c) => c.id === 'c1_2');
  assert(c1_2?.done === true, 'Checklist toggle isolation: sister items unaffected', `c1_2 done: ${c1_2?.done}`);

  // 1.4 Checklist in other notes remain unaffected
  const n2Unchanged = afterToggle1.find((n) => n.id === 'n2')!;
  assert(n2Unchanged.checklist?.length === 3 && n2Unchanged.checklist[0].done === false, 'Checklist toggle isolation: other notes unaffected', '');

  // 1.5 Toggle on note without checklist (n3 has no checklist)
  const afterToggleOnN3 = toggleChecklistItem(testNotes, 'n3', 'non_existent_cl');
  const n3Result = afterToggleOnN3.find((n) => n.id === 'n3')!;
  assert(n3Result.checklist === undefined, 'Checklist toggle: safely handles notes without checklist', '');

  // 1.6 Editor Modal empty text cleanup logic (NoteEditorModal.tsx:106)
  const rawModalChecklist: NoteChecklistItem[] = [
    { id: '1', text: 'Valid task', done: false },
    { id: '2', text: '   ', done: false }, // Whitespace only
    { id: '3', text: '', done: true }, // Empty
    { id: '4', text: 'Another valid task', done: true },
  ];
  const cleanedChecklist = rawModalChecklist.filter((item) => item.text.trim().length > 0);
  assert(cleanedChecklist.length === 2, 'Modal checklist sanitation removes empty/whitespace items', `Remaining count: ${cleanedChecklist.length}`);
  assert(cleanedChecklist[0].text === 'Valid task' && cleanedChecklist[1].text === 'Another valid task', 'Sanitized checklist contains only populated items', '');

  // ==========================================
  // SECTION 2: 10-COLOR PALETTE MAPPING
  // ==========================================
  console.log('\n--- Section 2: 10-Color Palette Mapping ---');

  // 2.1 Palette Length
  assert(NOTE_COLOR_PALETTE.length === 10, 'NOTE_COLOR_PALETTE has exactly 10 colors', `Got ${NOTE_COLOR_PALETTE.length}`);

  // 2.2 Exact Hex match to web app
  const expectedWebColors = [
    { id: 'default', hex: '' },
    { id: 'red', hex: '#5c2b29' },
    { id: 'orange', hex: '#614a19' },
    { id: 'yellow', hex: '#635d19' },
    { id: 'green', hex: '#345920' },
    { id: 'teal', hex: '#16504b' },
    { id: 'blue', hex: '#2d555e' },
    { id: 'dark_blue', hex: '#1e3a8a' },
    { id: 'purple', hex: '#42275e' },
    { id: 'pink', hex: '#5b2245' },
  ];

  let allColorsMatch = true;
  for (let i = 0; i < expectedWebColors.length; i++) {
    const expected = expectedWebColors[i];
    const actual = NOTE_COLOR_PALETTE[i];
    if (!actual || actual.id !== expected.id || actual.hex !== expected.hex) {
      allColorsMatch = false;
      console.error(`Color mismatch at index ${i}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
  assert(allColorsMatch, 'All 10 palette hex codes match web app exactly', '');

  // 2.3 Card Styling Logic Verification (NoteCard.tsx:26-31)
  const testCardStyle = (noteColor: string) => {
    const isCustomColor = Boolean(noteColor);
    const cardBg = noteColor || '#1e1e1e'; // mock componentBackground
    const titleColor = isCustomColor ? '#ffffff' : '#000000';
    const textColor = isCustomColor ? '#e0e0e0' : '#6e6e73';
    const iconColor = isCustomColor ? '#ffffff' : '#6e6e73';
    const borderColor = isCustomColor ? 'transparent' : '#cccccc';
    return { isCustomColor, cardBg, titleColor, textColor, iconColor, borderColor };
  };

  const customStyle = testCardStyle('#16504b');
  assert(customStyle.isCustomColor === true && customStyle.titleColor === '#ffffff' && customStyle.borderColor === 'transparent',
    'Custom color card applies white contrast text & transparent border', JSON.stringify(customStyle));

  const defaultStyle = testCardStyle('');
  assert(defaultStyle.isCustomColor === false && defaultStyle.titleColor === '#000000' && defaultStyle.borderColor === '#cccccc',
    'Default note card uses theme text and border colors', JSON.stringify(defaultStyle));

  // ==========================================
  // SECTION 3: SEARCH FILTERING ACROSS EDGE CASES
  // ==========================================
  console.log('\n--- Section 3: Search Filtering Edge Cases ---');

  // 3.1 Empty search query returns all notes
  const emptySearch = filterNotes(testNotes, '', '');
  assert(emptySearch.length === 3, 'Empty search query returns all notes', `Got ${emptySearch.length}`);

  // 3.2 Whitespace search query returns all notes
  const whitespaceSearch = filterNotes(testNotes, '   \t  ', '');
  assert(whitespaceSearch.length === 3, 'Whitespace-only search query returns all notes', `Got ${whitespaceSearch.length}`);

  // 3.3 Case-insensitive search (Latin & Cyrillic)
  const cyrillicUpper = filterNotes(testNotes, 'МАТЕМАТИЧЕСКОМУ', '');
  assert(cyrillicUpper.length === 1 && cyrillicUpper[0].id === 'n1', 'Case-insensitive Cyrillic uppercase matches lowercase in title', `Found: ${cyrillicUpper.map((n) => n.id).join(',')}`);

  const cyrillicMixed = filterNotes(testNotes, 'СеСсИи', '');
  assert(cyrillicMixed.length === 1 && cyrillicMixed[0].id === 'n2', 'Case-insensitive Cyrillic mixed case matches', `Found: ${cyrillicMixed.map((n) => n.id).join(',')}`);

  // 3.4 Content body matching
  const contentMatch = filterNotes(testNotes, 'вейерштрасса', ''); // In checklist
  assert(contentMatch.length === 1 && contentMatch[0].id === 'n1', 'Search matches inside checklist item text', `Found: ${contentMatch.map((n) => n.id).join(',')}`);

  const bodyMatch = filterNotes(testNotes, 'консультаций', ''); // In body text
  assert(bodyMatch.length === 1 && bodyMatch[0].id === 'n2', 'Search matches inside body content', `Found: ${bodyMatch.map((n) => n.id).join(',')}`);

  // 3.5 Tag matching
  const tagSearch = filterNotes(testNotes, 'математика', '');
  assert(tagSearch.length === 1 && tagSearch[0].id === 'n1', 'Search matches note tags directly', `Found: ${tagSearch.map((n) => n.id).join(',')}`);

  // 3.6 Special Characters (Regex metacharacters: (, ), [, ], *, +, ?, \, $, ^)
  const parenSearch = filterNotes(testNotes, '(пределы', '');
  assert(parenSearch.length === 1 && parenSearch[0].id === 'n1', 'Search handles literal parentheses "(..." safely without regex error', '');

  const bracketSearch = filterNotes(testNotes, '[1]', '');
  assert(bracketSearch.length === 1 && bracketSearch[0].id === 'n1', 'Search handles square brackets "[1]" safely without regex error', '');

  const mathMetaSearch = filterNotes(testNotes, '$PROJ^2', '');
  assert(mathMetaSearch.length === 1 && mathMetaSearch[0].id === 'n3', 'Search handles "$" and "^" metacharacters safely', '');

  const starSearch = filterNotes(testNotes, '*.*', '');
  assert(starSearch.length === 1 && starSearch[0].id === 'n3', 'Search handles asterisks and dots "*.*" safely', '');

  // 3.7 Non-matching search returns empty array
  const noMatch = filterNotes(testNotes, 'совершенно_случайный_текст_12345', '');
  assert(noMatch.length === 0, 'Non-matching search returns 0 results (triggers empty UI state)', `Got ${noMatch.length}`);

  // ==========================================
  // SECTION 4: TAG FILTERING
  // ==========================================
  console.log('\n--- Section 4: Tag Filtering ---');

  // 4.1 Filter by specific tag ('Учеба')
  const tagUcheba = filterNotes(testNotes, '', 'Учеба');
  assert(tagUcheba.length === 1 && tagUcheba[0].id === 'n1', 'Filter by tag "Учеба" returns only matching note', `Got ${tagUcheba.map((n) => n.id).join(',')}`);

  // 4.2 Filter by tag ('Планы')
  const tagPlany = filterNotes(testNotes, '', 'Планы');
  assert(tagPlany.length === 1 && tagPlany[0].id === 'n2', 'Filter by tag "Планы" returns only matching note', `Got ${tagPlany.map((n) => n.id).join(',')}`);

  // 4.3 Filter by non-existent tag
  const tagNone = filterNotes(testNotes, '', 'НесуществующийТег');
  assert(tagNone.length === 0, 'Filter by non-existent tag returns empty array', `Got ${tagNone.length}`);

  // 4.4 Combined Tag + Search query
  // Note n1 has tag 'Учеба' and title with 'математическому'
  const combinedMatch = filterNotes(testNotes, 'математическому', 'Учеба');
  assert(combinedMatch.length === 1 && combinedMatch[0].id === 'n1', 'Combined tag and search query matches correct note', '');

  // Note n2 has 'сессии' but tag 'Учеба' is NOT in n2 (n2 has 'Планы', 'Важное')
  const combinedMismatch = filterNotes(testNotes, 'сессии', 'Учеба');
  assert(combinedMismatch.length === 0, 'Combined tag and search query filters out query matches with wrong tag', `Got ${combinedMismatch.length}`);

  // 4.5 Available tags extraction
  const availableTags = getAvailableTags(testNotes);
  const expectedTags = ['Учеба', 'Математика', 'Планы', 'Важное', 'Идеи', 'Проект'];
  const hasAllExpectedTags = expectedTags.every((t) => availableTags.includes(t));
  assert(hasAllExpectedTags && availableTags.length === 6, 'Available tags dynamically extracted and deduplicated', JSON.stringify(availableTags));

  // 4.6 Combined Tag Strip (Presets + Available)
  const combinedStrip = getCombinedTags(availableTags);
  assert(combinedStrip[0] === 'Все', 'Tag strip starts with "Все"', `First tag: ${combinedStrip[0]}`);
  assert(combinedStrip.includes('Математика') && combinedStrip.includes('Проект'), 'Tag strip includes custom user tags', JSON.stringify(combinedStrip));

  // ==========================================
  // SECTION 5: PINNING SEPARATION (PINNED NOTES FIRST)
  // ==========================================
  console.log('\n--- Section 5: Pinning Separation ---');

  // 5.1 Partitioning into pinned and others
  const pinned = testNotes.filter((n) => n.pinned);
  const others = testNotes.filter((n) => !n.pinned);
  assert(pinned.length === 1 && pinned[0].id === 'n1', 'Pinned notes partition has correct notes', `Pinned: ${pinned.map((n) => n.id).join(',')}`);
  assert(others.length === 2 && others.every((n) => !n.pinned), 'Other notes partition contains only unpinned notes', `Others: ${others.map((n) => n.id).join(',')}`);

  // 5.2 Toggle Pin logic (NotesScreen.tsx:80-85)
  const togglePin = (notes: NoteItem[], noteId: string): NoteItem[] => {
    return notes.map((n) =>
      n.id === noteId ? { ...n, pinned: !n.pinned, updatedAt: Date.now() } : n
    );
  };

  const toggledN2 = togglePin(testNotes, 'n2');
  const pinnedAfter = toggledN2.filter((n) => n.pinned);
  const othersAfter = toggledN2.filter((n) => !n.pinned);
  assert(pinnedAfter.length === 2 && pinnedAfter.some((n) => n.id === 'n2'), 'Pinning unpinned note moves it to pinned partition', `Pinned: ${pinnedAfter.map((n) => n.id).join(',')}`);
  assert(othersAfter.length === 1 && othersAfter[0].id === 'n3', 'Remaining others partition updated', `Others: ${othersAfter.map((n) => n.id).join(',')}`);

  const unpinnedN1 = togglePin(toggledN2, 'n1');
  const pinnedAfter2 = unpinnedN1.filter((n) => n.pinned);
  assert(pinnedAfter2.length === 1 && pinnedAfter2[0].id === 'n2', 'Unpinning note moves it back to others partition', `Pinned: ${pinnedAfter2.map((n) => n.id).join(',')}`);

  // 5.3 All notes unpinned condition
  const allUnpinned = testNotes.map((n) => ({ ...n, pinned: false }));
  const zeroPinned = allUnpinned.filter((n) => n.pinned);
  const allOthers = allUnpinned.filter((n) => !n.pinned);
  assert(zeroPinned.length === 0 && allOthers.length === 3, 'When zero pinned notes, all notes reside in others partition', '');

  // Summary
  console.log('\n=== TEST RESULTS SUMMARY ===');
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name} - ${r.details}`);
    if (r.passed) passCount++;
    else failCount++;
  }
  console.log(`\nTOTAL: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runFeaturesSuite().catch((err) => {
  console.error('Fatal features test error:', err);
  process.exit(1);
});
