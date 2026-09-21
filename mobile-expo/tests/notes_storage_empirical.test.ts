/**
 * Empirical test harness for Notes Storage contract
 * Tests load/save, seed data initialization, corruption recovery, and schema validation
 */

// Step 1: In-memory AsyncStorage polyfill for Node execution
const store = new Map<string, string>();
(globalThis as any).window = {
  localStorage: {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  },
};

import { loadNotes, saveNotes, NOTES_STORAGE_KEY, SEED_NOTES } from '../src/modules/notes/notesStorage';
import { NoteItem } from '../src/modules/notes/types';

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

async function runStorageSuite() {
  console.log('=== RUNNING NOTES STORAGE EMPIRICAL SUITE ===\n');

  // Test 1: Seed Notes Contract Verification
  try {
    assert(Array.isArray(SEED_NOTES) && SEED_NOTES.length >= 2, 'SEED_NOTES is populated array', `Length: ${SEED_NOTES.length}`);
    
    let allSeedsValid = true;
    let seedError = '';
    for (const note of SEED_NOTES) {
      if (typeof note.id !== 'string' || !note.id) { allSeedsValid = false; seedError = 'Invalid seed id'; }
      if (typeof note.title !== 'string') { allSeedsValid = false; seedError = 'Invalid seed title'; }
      if (typeof note.content !== 'string') { allSeedsValid = false; seedError = 'Invalid seed content'; }
      if (!Array.isArray(note.tags)) { allSeedsValid = false; seedError = 'Seed tags is not array'; }
      if (typeof note.color !== 'string') { allSeedsValid = false; seedError = 'Seed color is not string'; }
      if (typeof note.pinned !== 'boolean') { allSeedsValid = false; seedError = 'Seed pinned is not boolean'; }
      if (typeof note.createdAt !== 'number') { allSeedsValid = false; seedError = 'Seed createdAt is not number'; }
      if (typeof note.updatedAt !== 'number') { allSeedsValid = false; seedError = 'Seed updatedAt is not number'; }
      if (note.checklist) {
        if (!Array.isArray(note.checklist)) { allSeedsValid = false; seedError = 'Seed checklist is not array'; }
        for (const cl of note.checklist) {
          if (!cl.id || typeof cl.text !== 'string' || typeof cl.done !== 'boolean') {
            allSeedsValid = false;
            seedError = `Invalid checklist item: ${JSON.stringify(cl)}`;
          }
        }
      }
    }
    assert(allSeedsValid, 'Seed notes schema integrity', seedError || 'All seed items valid');
  } catch (err: any) {
    assert(false, 'Seed notes schema check', err.message);
  }

  // Test 2: Cold Start Initialization (empty storage)
  try {
    store.clear();
    const loaded = await loadNotes();
    const storedRaw = store.get(NOTES_STORAGE_KEY);

    assert(Array.isArray(loaded) && loaded.length === SEED_NOTES.length, 'Cold start returns SEED_NOTES', `Got ${loaded.length} notes`);
    assert(storedRaw !== null && storedRaw !== undefined, 'Cold start persists SEED_NOTES to storage', `Stored raw: ${storedRaw}`);
    
    const parsedStored = JSON.parse(storedRaw!);
    assert(parsedStored.length === SEED_NOTES.length, 'Persisted data matches SEED_NOTES length', `Got ${parsedStored.length}`);
  } catch (err: any) {
    assert(false, 'Cold start initialization', err.message);
  }

  // Test 3: Save and Load Round-trip
  try {
    const customNotes: NoteItem[] = [
      {
        id: 'test_note_1',
        title: 'Учебный конспект по физике',
        content: 'Законы Ньютона и термодинамика',
        tags: ['Физика', 'Сессия', 'Экзамен'],
        color: '#16504b',
        pinned: true,
        createdAt: 1710000000000,
        updatedAt: 1710005000000,
        checklist: [
          { id: 'item_1', text: 'Первый закон', done: true },
          { id: 'item_2', text: 'Второй закон', done: true },
          { id: 'item_3', text: 'Третий закон', done: false },
        ],
      },
      {
        id: 'test_note_2',
        title: 'Список литературы',
        content: '1. Савельев\n2. Сивухин',
        tags: ['Книги'],
        color: '#345920',
        pinned: false,
        createdAt: 1710010000000,
        updatedAt: 1710010000000,
      },
    ];

    await saveNotes(customNotes);
    const reloaded = await loadNotes();

    assert(reloaded.length === 2, 'Round-trip preserved note count', `Expected 2, got ${reloaded.length}`);
    assert(reloaded[0].id === 'test_note_1' && reloaded[0].pinned === true, 'Round-trip preserved note 1 fields', JSON.stringify(reloaded[0]));
    assert(reloaded[0].checklist?.length === 3, 'Round-trip preserved checklist items', `Checklist items: ${reloaded[0].checklist?.length}`);
    assert(reloaded[0].checklist?.[0].done === true && reloaded[0].checklist?.[2].done === false, 'Round-trip preserved checklist item completion states', '');
    assert(reloaded[1].id === 'test_note_2' && reloaded[1].color === '#345920', 'Round-trip preserved note 2 fields', JSON.stringify(reloaded[1]));
  } catch (err: any) {
    assert(false, 'Save and load round-trip', err.message);
  }

  // Test 4: Corruption Resilience (malformed JSON syntax)
  try {
    store.set(NOTES_STORAGE_KEY, '{"this is corrupted json...:');
    const loaded = await loadNotes();
    assert(Array.isArray(loaded) && loaded.length === 0, 'Corrupted JSON returns empty array fallback', `Got ${JSON.stringify(loaded)}`);
  } catch (err: any) {
    assert(false, 'Corrupted JSON recovery', err.message);
  }

  // Test 5: Non-Array JSON Payload (e.g. object, number)
  try {
    store.set(NOTES_STORAGE_KEY, JSON.stringify({ error: 'not an array' }));
    const loadedFromObj = await loadNotes();
    assert(Array.isArray(loadedFromObj) && loadedFromObj.length === SEED_NOTES.length, 'Object payload resets to SEED_NOTES', `Got ${loadedFromObj.length}`);

    store.set(NOTES_STORAGE_KEY, '99999');
    const loadedFromNum = await loadNotes();
    assert(Array.isArray(loadedFromNum) && loadedFromNum.length === SEED_NOTES.length, 'Number payload resets to SEED_NOTES', `Got ${loadedFromNum.length}`);
  } catch (err: any) {
    assert(false, 'Non-array JSON payload recovery', err.message);
  }

  // Test 6: Empty String in storage
  try {
    store.set(NOTES_STORAGE_KEY, '');
    const loadedEmpty = await loadNotes();
    assert(Array.isArray(loadedEmpty) && loadedEmpty.length === SEED_NOTES.length, 'Empty string in storage triggers seed initialization', `Got ${loadedEmpty.length}`);
  } catch (err: any) {
    assert(false, 'Empty string storage recovery', err.message);
  }

  // Test 7: Schema Validation / Resilience to corrupt items in array
  try {
    const corruptArray = [
      null,
      { id: 'valid_id', title: 'Good note', content: 'text', tags: ['tag1'], color: '', pinned: false, createdAt: 1, updatedAt: 1 },
      { id: 'partial_bad' }, // Missing tags, title, content
      42,
    ];
    store.set(NOTES_STORAGE_KEY, JSON.stringify(corruptArray));
    const loadedCorrupt = await loadNotes();
    
    // Check what loadNotes returns
    console.log('[Observation] Corrupt items array test output length:', loadedCorrupt.length);
    const hasCorruptElements = loadedCorrupt.some((item: any) => item === null || typeof item !== 'object' || !Array.isArray(item.tags));
    assert(Array.isArray(loadedCorrupt), 'loadNotes returns array even with corrupt elements', `Length: ${loadedCorrupt.length}`);
    if (hasCorruptElements) {
      console.log('[Observation/Caveat] loadNotes does not filter corrupt elements within array (schema validation gap at item level).');
    }
  } catch (err: any) {
    assert(false, 'Schema validation stress-test', err.message);
  }

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

runStorageSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
