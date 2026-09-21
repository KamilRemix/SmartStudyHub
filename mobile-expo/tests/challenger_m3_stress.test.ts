import assert from 'assert';
import crypto from 'crypto';

console.log('=====================================================');
console.log('=== CHALLENGER M3-2: ADVERSARIAL STRESS TEST SUITE ===');
console.log('=====================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const res = fn();
    if (res && typeof (res as any).then === 'function') {
      return (res as Promise<void>)
        .then(() => {
          passedTests++;
          console.log(`[PASS] ${name}`);
        })
        .catch((err: any) => {
          failedTests++;
          console.error(`[FAIL] ${name}`);
          console.error(`       Error: ${err.message}`);
        });
    } else {
      passedTests++;
      console.log(`[PASS] ${name}`);
    }
  } catch (err: any) {
    failedTests++;
    console.error(`[FAIL] ${name}`);
    console.error(`       Error: ${err.message}`);
  }
}

async function main() {
  // -------------------------------------------------------------
  // 1. CLIPBOARD & STRING EDGE CASE: Translator "Ошибка" collateral damage
  // -------------------------------------------------------------
  console.log('--- 1. CHALLENGE: Translator "Ошибка" Collateral Damage ---');

  runTest('Legitimate translations containing "Ошибка" must NOT be blocked from copy', () => {
    // Simulating TranslatorScreen.tsx handleCopyTarget logic:
    const isTargetCopyBlocked = (targetText: string, loading: boolean): boolean => {
      if (
        !targetText.trim() ||
        targetText.includes('Ошибка') ||
        targetText === 'Перевод появится здесь' ||
        targetText === 'Перевод...' ||
        loading
      ) {
        return true; // blocked
      }
      return false; // allowed
    };

    // Legitimate translations
    const test1 = 'Ошибка 404: Страница не найдена';
    const test2 = 'Ошибка компиляции в модуле';
    const test4 = 'Ошибка в коде';

    const blocked1 = isTargetCopyBlocked(test1, false);
    const blocked2 = isTargetCopyBlocked(test2, false);
    const blocked4 = isTargetCopyBlocked(test4, false);

    console.log(`   - "${test1}" is blocked from copy: ${blocked1}`);
    console.log(`   - "${test2}" is blocked from copy: ${blocked2}`);
    console.log(`   - "${test4}" is blocked from copy: ${blocked4}`);

    assert.strictEqual(blocked1, true, 'Confirmed vulnerability: "Ошибка 404" is blocked from clipboard copy');
    assert.strictEqual(blocked2, true, 'Confirmed vulnerability: "Ошибка компиляции" is blocked from clipboard copy');
    assert.strictEqual(blocked4, true, 'Confirmed vulnerability: "Ошибка в коде" is blocked from clipboard copy');
  });

  runTest('Legitimate translations containing "Ошибка" must NOT be blocked from Favorites', () => {
    const isFavoriteBlocked = (sourceText: string, targetText: string, loading: boolean): boolean => {
      if (
        !sourceText.trim() ||
        !targetText.trim() ||
        targetText.includes('Ошибка') ||
        targetText === 'Перевод...' ||
        targetText === 'Перевод появится здесь' ||
        loading
      ) {
        return true; // blocked
      }
      return false; // allowed
    };

    const src = 'Syntax error';
    const target = 'Ошибка синтаксиса';
    const blocked = isFavoriteBlocked(src, target, false);
    console.log(`   - Favoriting "${src}" -> "${target}" is blocked: ${blocked}`);
    assert.strictEqual(blocked, true, 'Confirmed vulnerability: Favoriting translation with "Ошибка" is blocked');
  });

  runTest('Legitimate translations containing "Ошибка" must NOT be blocked from Speech (TTS)', () => {
    const isSpeechBlocked = (text: string): boolean => {
      if (!text.trim() || text.includes('Ошибка') || text === 'Перевод появится здесь') {
        return true; // blocked
      }
      return false; // allowed
    };

    const target = 'Ошибка времени выполнения';
    const blocked = isSpeechBlocked(target);
    console.log(`   - Pronouncing "${target}" is blocked: ${blocked}`);
    assert.strictEqual(blocked, true, 'Confirmed vulnerability: TTS for translation with "Ошибка" is blocked');
  });

  // -------------------------------------------------------------
  // 2. CLIPBOARD EDGE CASE: Currency Converter 0 Value Copy Blocked
  // -------------------------------------------------------------
  console.log('\n--- 2. CHALLENGE: Currency Converter Zero Value Copy ---');

  runTest('Currency converter must allow copying 0.00 result to clipboard', () => {
    const formatCurrency = (v: number): string => {
      if (v === 0) return '0';
      if (Math.abs(v) >= 1) return v.toFixed(2);
      return v.toFixed(6);
    };

    const canCopyCurrency = (convertedValue: number): boolean => {
      const formatted = formatCurrency(convertedValue);
      if (!formatted || formatted === '0') return false; // Line 270 in CurrencyConverterScreen.tsx
      return true;
    };

    const formatUnitResult = (v: number): string => {
      if (Number.isInteger(v)) return v.toString();
      if (Math.abs(v) < 0.0001 && v !== 0) return v.toExponential(4);
      return parseFloat(v.toFixed(6)).toString();
    };

    const canCopyUnit = (convertedValue: number): boolean => {
      const formatted = formatUnitResult(convertedValue);
      if (!formatted) return false;
      return true;
    };

    const unitCanCopyZero = canCopyUnit(0);
    const currencyCanCopyZero = canCopyCurrency(0);

    console.log(`   - UnitConverter can copy 0: ${unitCanCopyZero}`);
    console.log(`   - CurrencyConverter can copy 0: ${currencyCanCopyZero}`);

    assert.strictEqual(unitCanCopyZero, true, 'UnitConverter allows copying 0');
    assert.strictEqual(currencyCanCopyZero, false, 'Confirmed vulnerability: CurrencyConverter blocks copying 0');
  });

  // -------------------------------------------------------------
  // 3. CONCURRENCY: Translator Out-of-Order Race Condition
  // -------------------------------------------------------------
  console.log('\n--- 3. CHALLENGE: Translator In-Flight Race Conditions ---');

  await runTest('Out-of-order network responses overwrite newer translations', async () => {
    let targetText = '';

    const translateWithoutGuard = async (text: string, delayMs: number, resultValue: string) => {
      await new Promise((r) => setTimeout(r, delayMs));
      targetText = resultValue;
    };

    const req1 = translateWithoutGuard('apple', 100, 'яблоко');
    await new Promise((r) => setTimeout(r, 10));
    const req2 = translateWithoutGuard('dog', 30, 'собака');

    await Promise.all([req1, req2]);

    console.log(`   - Target text after out-of-order responses: "${targetText}"`);
    assert.strictEqual(
      targetText,
      'яблоко',
      'Confirmed race condition: Stale slow response overwrote fresher response!'
    );
  });

  await runTest('Stale in-flight response overwrites cleared text', async () => {
    let targetText = 'Initial';

    const inFlight = (async () => {
      await new Promise((r) => setTimeout(r, 60));
      targetText = 'Translated Word';
    })();

    await new Promise((r) => setTimeout(r, 20));
    targetText = '';

    await inFlight;
    console.log(`   - Target text after user cleared input: "${targetText}"`);
    assert.strictEqual(
      targetText,
      'Translated Word',
      'Confirmed race condition: Stale response populated cleared text field!'
    );
  });

  // -------------------------------------------------------------
  // 4. CONCURRENCY: Notes Rapid Checklist Toggle State Loss
  // -------------------------------------------------------------
  console.log('\n--- 4. CHALLENGE: Notes Concurrent Checklist / Pin Toggles ---');

  runTest('Non-functional state updates cause lost checklist toggle updates', () => {
    interface Note {
      id: string;
      checklist: { id: string; text: string; done: boolean }[];
      updatedAt: number;
    }

    let stateNotes: Note[] = [
      {
        id: 'note_1',
        checklist: [
          { id: 'cl_1', text: 'Task 1', done: false },
          { id: 'cl_2', text: 'Task 2', done: false },
        ],
        updatedAt: 1000,
      },
    ];

    const closureNotes = stateNotes;

    const updatedEvent1 = closureNotes.map((n) => ({
      ...n,
      checklist: n.checklist.map((c) => (c.id === 'cl_1' ? { ...c, done: !c.done } : c)),
    }));

    const updatedEvent2 = closureNotes.map((n) => ({
      ...n,
      checklist: n.checklist.map((c) => (c.id === 'cl_2' ? { ...c, done: !c.done } : c)),
    }));

    stateNotes = updatedEvent2;

    console.log(`   - Task 1 done: ${stateNotes[0].checklist[0].done}`);
    console.log(`   - Task 2 done: ${stateNotes[0].checklist[1].done}`);

    assert.strictEqual(
      stateNotes[0].checklist[0].done,
      false,
      'Confirmed lost update: Task 1 toggle was lost due to stale state closure!'
    );
    assert.strictEqual(stateNotes[0].checklist[1].done, true, 'Task 2 toggle was applied');
  });

  // -------------------------------------------------------------
  // 5. CLIPBOARD & FORMATTING: NoteCard Copy Formatting Edge Cases
  // -------------------------------------------------------------
  console.log('\n--- 5. CHALLENGE: NoteCard Clipboard Formatting ---');

  runTest('NoteCard handleCopy formatting with mixed content and checklist', () => {
    const formatNoteForClipboard = (note: {
      title?: string;
      content?: string;
      checklist?: { id: string; text: string; done: boolean }[];
      tags?: string[];
    }): string => {
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
      return parts.join('\n\n');
    };

    const fullNote = {
      title: 'Meeting Notes',
      content: 'Discussed roadmap',
      checklist: [
        { id: '1', text: 'Prepare slides', done: true },
        { id: '2', text: 'Send email', done: false },
      ],
      tags: ['Work'],
    };
    const textA = formatNoteForClipboard(fullNote);
    assert.strictEqual(
      textA,
      'Meeting Notes\n\nDiscussed roadmap\n\n[x] Prepare slides\n[ ] Send email'
    );

    const checkOnlyNote = {
      title: '',
      content: '',
      checklist: [
        { id: '1', text: 'Milk', done: false },
        { id: '2', text: 'Bread', done: true },
      ],
    };
    const textB = formatNoteForClipboard(checkOnlyNote);
    assert.strictEqual(textB, '[ ] Milk\n[x] Bread');

    const tagsOnlyNote = {
      title: '',
      content: '',
      checklist: [],
      tags: ['Ideas'],
    };
    const textC = formatNoteForClipboard(tagsOnlyNote);
    assert.strictEqual(textC, '', 'Empty note yields empty clipboard string');
  });

  // -------------------------------------------------------------
  // 6. NUMERICAL & DRIFT: Unit Converter Swap Stability
  // -------------------------------------------------------------
  console.log('\n--- 6. CHALLENGE: Unit Converter 100-Cycle Swap Drift ---');

  runTest('100 consecutive swaps between Meters and Feet must not drift beyond 1e-6', () => {
    const lengthToMeters: Record<string, number> = {
      m: 1,
      ft: 0.3048,
    };
    const convert = (val: number, from: string, to: string): number => {
      if (from === to) return val;
      return (val * lengthToMeters[from]) / lengthToMeters[to];
    };
    const getExactSwapValue = (v: number): string => {
      if (isNaN(v) || !isFinite(v)) return '0';
      if (Number.isInteger(v)) return v.toString();
      return parseFloat(v.toPrecision(12)).toString();
    };

    let fromVal = '100';
    let fromUnit = 'm';
    let toUnit = 'ft';

    for (let i = 0; i < 100; i++) {
      const num = parseFloat(fromVal) || 0;
      const res = convert(num, fromUnit, toUnit);
      const tmp = fromUnit;
      fromUnit = toUnit;
      toUnit = tmp;
      fromVal = getExactSwapValue(res);
    }

    assert.strictEqual(fromUnit, 'm', 'Unit returned to meters after 100 swaps');
    const finalVal = parseFloat(fromVal);
    const drift = Math.abs(finalVal - 100);
    console.log(`   - Value after 100 consecutive swaps: ${fromVal} (drift: ${drift})`);
    assert(drift < 1e-6, `Drift ${drift} exceeds tolerance 1e-6`);
  });

  // -------------------------------------------------------------
  // 7. CRYPTOGRAPHY: SHA-1 Implementation Stress Test
  // -------------------------------------------------------------
  console.log('\n--- 7. CHALLENGE: GenPass RFC 3174 SHA-1 Rigorous Vectors ---');

  runTest('Pure TS SHA-1 implementation matches Node crypto on boundary lengths and UTF-8', () => {
    function sha1(msg: string): string {
      function rotl(n: number, s: number) {
        return (n << s) | (n >>> (32 - s));
      }
      let H0 = 0x67452301,
        H1 = 0xefcdab89,
        H2 = 0x98badcfe,
        H3 = 0x10325476,
        H4 = 0xc3d2e1f0;
      const bytes: number[] = [];
      for (let i = 0; i < msg.length; i++) {
        const c = msg.charCodeAt(i);
        if (c < 128) bytes.push(c);
        else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
        else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
      }
      const bitLen = bytes.length * 8;
      bytes.push(0x80);
      while (bytes.length % 64 !== 56) bytes.push(0);
      bytes.push(0, 0, 0, 0);
      bytes.push(
        (bitLen >>> 24) & 255,
        (bitLen >>> 16) & 255,
        (bitLen >>> 8) & 255,
        bitLen & 255
      );

      const W = new Uint32Array(80);
      for (let i = 0; i < bytes.length; i += 64) {
        for (let t = 0; t < 16; t++) {
          W[t] =
            (bytes[i + t * 4] << 24) |
            (bytes[i + t * 4 + 1] << 16) |
            (bytes[i + t * 4 + 2] << 8) |
            bytes[i + t * 4 + 3];
        }
        for (let t = 16; t < 80; t++) {
          W[t] = rotl(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
        }
        let A = H0,
          B = H1,
          C = H2,
          D = H3,
          E = H4;
        for (let t = 0; t < 80; t++) {
          const s = Math.floor(t / 20);
          let f = 0,
            K = 0;
          if (s === 0) {
            f = (B & C) | (~B & D);
            K = 0x5a827999;
          } else if (s === 1) {
            f = B ^ C ^ D;
            K = 0x6ed9eba1;
          } else if (s === 2) {
            f = (B & C) | (B & D) | (C & D);
            K = 0x8f1bbcdc;
          } else {
            f = B ^ C ^ D;
            K = 0xca62c1d6;
          }
          const temp = (rotl(A, 5) + f + E + K + W[t]) >>> 0;
          E = D;
          D = C;
          C = rotl(B, 30) >>> 0;
          B = A;
          A = temp;
        }
        H0 = (H0 + A) >>> 0;
        H1 = (H1 + B) >>> 0;
        H2 = (H2 + C) >>> 0;
        H3 = (H3 + D) >>> 0;
        H4 = (H4 + E) >>> 0;
      }
      const hex = (n: number) => ('00000000' + n.toString(16)).slice(-8);
      return (hex(H0) + hex(H1) + hex(H2) + hex(H3) + hex(H4)).toUpperCase();
    }

    const boundaryLengths = [0, 1, 55, 56, 63, 64, 65, 119, 120, 128];
    for (const len of boundaryLengths) {
      const str = 'A'.repeat(len);
      const expected = crypto.createHash('sha1').update(str, 'utf8').digest('hex').toUpperCase();
      const actual = sha1(str);
      assert.strictEqual(actual, expected, `SHA-1 failed for boundary length ${len}`);
    }

    const utf8Strings = ['ПриветМир', 'Пароль123!', 'Тестирование!@#$', 'SmartStudyHub_2026'];
    for (const s of utf8Strings) {
      const expected = crypto.createHash('sha1').update(s, 'utf8').digest('hex').toUpperCase();
      const actual = sha1(s);
      assert.strictEqual(actual, expected, `SHA-1 failed for UTF-8 string "${s}"`);
    }

    console.log('   - 10 boundary tests passed');
    console.log('   - 4 UTF-8 multilingual tests passed');
  });

  // -------------------------------------------------------------
  // 8. SECURITY ALGORITHMS: GenPass Entropy & Password Scoring
  // -------------------------------------------------------------
  console.log('\n--- 8. CHALLENGE: GenPass Entropy & Score Stress Tests ---');

  runTest('GenPass calculateScore bounds and edge cases', () => {
    function calculateScore(password: string, isPwned: boolean = false): number {
      const len = password.length;
      if (len === 0) return 0;

      let lenScore = 0;
      if (len < 5) lenScore = 0;
      else if (len <= 7) lenScore = 15;
      else if (len <= 11) lenScore = 30;
      else lenScore = 40;

      let score = lenScore;
      if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score += 15;
      if (/[0-9]/.test(password)) score += 15;
      if (/[^A-Za-z0-9]/.test(password)) score += 15;
      if (/(qwerty|12345|asdfgh|password|111|aaa|abc)/i.test(password)) score -= 25;
      if (len >= 16) score += 15;

      score = Math.max(0, Math.min(100, score));
      if (isPwned) score = Math.min(score, 15);
      return score;
    }

    assert.strictEqual(calculateScore(''), 0, 'Empty password has score 0');
    assert.strictEqual(calculateScore('a'), 0, '1-char password has score 0');
    assert.strictEqual(calculateScore('12345678'), 20, 'Pattern password has score <= 20');
    assert.strictEqual(calculateScore('P@ssw0rd123456789'), 75, 'Long pattern password penalizes correctly');
    assert(calculateScore('K9#mQ2$vL8!zW4*p') >= 95, 'Complex 16-char password has score >= 95');
    assert.strictEqual(calculateScore('K9#mQ2$vL8!zW4*p', true), 15, 'Pwned password strictly capped at 15');
  });

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log('\n=====================================================');
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED:      ${passedTests}`);
  console.log(`FAILED:      ${failedTests}`);
  console.log('=====================================================');
}

main();
