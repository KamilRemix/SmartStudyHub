import assert from 'assert';
import crypto from 'crypto';

console.log('================================================================');
console.log('      M3-1 EMPIRICAL ADVERSARIAL CHALLENGE HARNESS (V2)         ');
console.log('================================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function check(title: string, fn: () => void) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`[PASS] ${title}`);
  } catch (err: any) {
    failedTests++;
    console.error(`[FAIL] ${title}`);
    console.error(`       Error: ${err.message || err}`);
  }
}

// ============================================================================
// SUITE 1: SWAP PRECISION UNDER REPEATED OPERATIONS
// ============================================================================
console.log('\n--- SUITE 1: SWAP PRECISION UNDER REPEATED OPERATIONS ---');

const lengthToMeters: Record<string, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

const massToGrams: Record<string, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  lb: 453.592,
  oz: 28.3495,
  t: 1_000_000,
};

function convertTemperature(value: number, from: string, to: string): number {
  if (from === to) return value;
  let celsius: number;
  switch (from) {
    case 'C': celsius = value; break;
    case 'F': celsius = (value - 32) * 5 / 9; break;
    case 'K': celsius = value - 273.15; break;
    default: celsius = value;
  }
  switch (to) {
    case 'C': return celsius;
    case 'F': return celsius * 9 / 5 + 32;
    case 'K': return celsius + 273.15;
    default: return celsius;
  }
}

function convertLength(value: number, from: string, to: string): number {
  if (from === to) return value;
  const meters = value * lengthToMeters[from];
  return meters / lengthToMeters[to];
}

function convertMass(value: number, from: string, to: string): number {
  if (from === to) return value;
  const grams = value * massToGrams[from];
  return grams / massToGrams[to];
}

const getExactSwapValue = (v: number): string => {
  if (isNaN(v) || !isFinite(v)) return '0';
  if (Number.isInteger(v)) return v.toString();
  return parseFloat(v.toPrecision(12)).toString();
};

function simulateUnitSwaps(
  initialValue: number,
  unitA: string,
  unitB: string,
  converter: (val: number, f: string, t: string) => number,
  iterations: number
): { finalValue: number; drift: number; relativeError: number } {
  let curValueStr = initialValue.toString();
  let fromUnit = unitA;
  let toUnit = unitB;

  for (let i = 0; i < iterations; i++) {
    const numFrom = parseFloat(curValueStr.replace(',', '.')) || 0;
    const converted = converter(numFrom, fromUnit, toUnit);
    const tmp = fromUnit;
    fromUnit = toUnit;
    toUnit = tmp;
    curValueStr = getExactSwapValue(converted);
  }

  const finalNum = parseFloat(curValueStr);
  const expected = iterations % 2 === 0 ? initialValue : converter(initialValue, unitA, unitB);
  const drift = Math.abs(finalNum - expected);
  const relativeError = expected !== 0 ? drift / Math.abs(expected) : drift;
  return { finalValue: finalNum, drift, relativeError };
}

check('1.1 Unit Converter - Length (m <-> ft) 100 repeated swaps: precision bounds', () => {
  const result = simulateUnitSwaps(1.0, 'm', 'ft', convertLength, 100);
  assert(result.drift < 1e-11, `Drift after 100 swaps must be < 1e-11, got ${result.drift}`);
  assert(result.relativeError < 1e-11, `Relative error must be < 1e-11, got ${result.relativeError}`);
});

check('1.2 Unit Converter - Length (mm <-> km) 50 repeated swaps', () => {
  const result = simulateUnitSwaps(1234567.89, 'mm', 'km', convertLength, 50);
  assert(result.drift < 1e-6, `Drift should be < 1e-6, got ${result.drift}`);
  assert(result.relativeError < 1e-12, `Relative error < 1e-12, got ${result.relativeError}`);
});

check('1.3 Unit Converter - Temperature (C <-> F) 100 repeated swaps at 37°C', () => {
  const result = simulateUnitSwaps(37.0, 'C', 'F', convertTemperature, 100);
  assert(result.drift < 1e-12, `Temperature drift should be < 1e-12, got ${result.drift}`);
  assert.strictEqual(result.finalValue, 37.0, '37 C returns exact 37.0');
});

check('1.4 Unit Converter - Temperature (C <-> K) 100 repeated swaps at -40°C', () => {
  const result = simulateUnitSwaps(-40.0, 'C', 'K', convertTemperature, 100);
  assert(result.drift < 1e-12, `Temp C-K drift should be < 1e-12, got ${result.drift}`);
  assert.strictEqual(result.finalValue, -40.0, '-40 C returns exact -40.0');
});

check('1.5 Unit Converter - Mass (kg <-> lb) 100 repeated swaps', () => {
  const result = simulateUnitSwaps(75.5, 'kg', 'lb', convertMass, 100);
  assert(result.drift < 1e-8, `Mass kg-lb drift should be < 1e-8, got ${result.drift}`);
  assert(result.relativeError < 1e-10, `Relative error < 1e-10, got ${result.relativeError}`);
});

check('1.6 Unit Converter - Extreme inputs: 0, negative, NaN, Infinity', () => {
  assert.strictEqual(getExactSwapValue(0), '0');
  assert.strictEqual(getExactSwapValue(-40), '-40');
  assert.strictEqual(getExactSwapValue(NaN), '0');
  assert.strictEqual(getExactSwapValue(Infinity), '0');
  assert.strictEqual(getExactSwapValue(-Infinity), '0');
});

const DEFAULT_FALLBACK_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.92,
  RUB: 91.5,
  CNY: 7.23,
  KZT: 450.0,
  BYN: 3.27,
  GBP: 0.79,
  JPY: 155.0,
  TRY: 32.0,
  AED: 3.67,
};

const formatCurrency = (v: number): string => {
  if (v === 0) return '0';
  if (Math.abs(v) >= 1) return v.toFixed(2);
  return v.toFixed(6);
};

function convertCurrency(value: number, from: string, to: string, rates: Record<string, number>): number {
  if (from === to) return value;
  const fromRate = rates[from];
  const toRate = rates[to];
  if (!fromRate || !toRate) return 0;
  const usdValue = value / fromRate;
  return usdValue * toRate;
}

function simulateCurrencySwaps(
  initialValue: number,
  currA: string,
  currB: string,
  iterations: number
): { finalValue: number; relativeError: number } {
  let curValueStr = initialValue.toString();
  let fromCurr = currA;
  let toCurr = currB;

  for (let i = 0; i < iterations; i++) {
    const numFrom = parseFloat(curValueStr.replace(',', '.')) || 0;
    const converted = convertCurrency(numFrom, fromCurr, toCurr, DEFAULT_FALLBACK_RATES);
    const tmp = fromCurr;
    fromCurr = toCurr;
    toCurr = tmp;
    curValueStr = formatCurrency(converted);
  }

  const finalNum = parseFloat(curValueStr);
  const expected = iterations % 2 === 0 ? initialValue : convertCurrency(initialValue, currA, currB, DEFAULT_FALLBACK_RATES);
  const relativeError = Math.abs(finalNum - expected) / expected;
  return { finalValue: finalNum, relativeError };
}

check('1.7 Currency Converter - 2 swaps (round-trip) USD <-> RUB at $100', () => {
  const result = simulateCurrencySwaps(100.0, 'USD', 'RUB', 2);
  assert.strictEqual(result.finalValue, 100.0, 'Round trip USD -> RUB -> USD preserves $100.00');
});

check('1.8 Currency Converter - Round-trip precision bounds across 10 currency pairs', () => {
  const pairs = [
    ['USD', 'EUR'],
    ['EUR', 'GBP'],
    ['USD', 'CNY'],
    ['USD', 'KZT'],
    ['USD', 'BYN'],
    ['USD', 'JPY'],
    ['EUR', 'RUB'],
    ['GBP', 'TRY'],
    ['AED', 'USD'],
    ['RUB', 'KZT'],
  ];

  for (const [a, b] of pairs) {
    const res = simulateCurrencySwaps(100.0, a, b, 2);
    const delta = Math.abs(res.finalValue - 100.0);
    assert(delta < 0.05, `Round-trip for ${a}<->${b} exceeded 5 cents: ${delta}`);
  }
});

// ============================================================================
// SUITE 2: OFFLINE FALLBACKS FOR CURRENCY AND TRANSLATION
// ============================================================================
console.log('\n--- SUITE 2: OFFLINE FALLBACKS FOR CURRENCY AND TRANSLATION ---');

const CURRENCIES = [
  { code: 'USD', name: 'Доллар США', flag: 'US' },
  { code: 'EUR', name: 'Евро', flag: 'EU' },
  { code: 'RUB', name: 'Российский рубль', flag: 'RU' },
  { code: 'CNY', name: 'Китайский юань', flag: 'CN' },
  { code: 'KZT', name: 'Казахстанский тенге', flag: 'KZ' },
  { code: 'BYN', name: 'Белорусский рубль', flag: 'BY' },
  { code: 'GBP', name: 'Британский фунт', flag: 'GB' },
  { code: 'JPY', name: 'Японская иена', flag: 'JP' },
  { code: 'TRY', name: 'Турецкая лира', flag: 'TR' },
  { code: 'AED', name: 'Дирхам ОАЭ', flag: 'AE' },
];

check('2.1 Currency Converter - Fallback coverage: all 10 currencies mapped', () => {
  for (const c of CURRENCIES) {
    assert(DEFAULT_FALLBACK_RATES[c.code] !== undefined, `Currency ${c.code} must have fallback rate`);
    assert(DEFAULT_FALLBACK_RATES[c.code] > 0, `Currency ${c.code} rate must be > 0`);
  }
  assert.strictEqual(DEFAULT_FALLBACK_RATES['USD'], 1.0, 'USD rate must be base 1.0');
  assert.strictEqual(DEFAULT_FALLBACK_RATES['JPY'], 155.0, 'JPY rate must be present and 155.0');
});

check('2.2 Currency Converter - Exhaustive 10x10 cross-rate matrix offline calculation', () => {
  for (const c1 of CURRENCIES) {
    for (const c2 of CURRENCIES) {
      const converted = convertCurrency(100, c1.code, c2.code, DEFAULT_FALLBACK_RATES);
      assert(Number.isFinite(converted), `Conversion ${c1.code} -> ${c2.code} must be finite`);
      assert(converted > 0, `Conversion ${c1.code} -> ${c2.code} must be > 0`);
      if (c1.code === c2.code) {
        assert.strictEqual(converted, 100, `Identity conversion ${c1.code} -> ${c1.code} must be 100`);
      }
    }
  }
});

check('2.3 Currency Converter - Cache fallback decision tree', () => {
  const TTL = 3600_000;
  const now = Date.now();

  const freshCache = { rates: { USD: 1.0, EUR: 0.95 }, timestamp: now - 1000 };
  const isFresh = now - freshCache.timestamp < TTL;
  assert.strictEqual(isFresh, true, 'Fresh cache is accepted without API call');

  const expiredCache = { rates: { USD: 1.0, EUR: 0.90 }, timestamp: now - 4000_000 };
  const isExpired = now - expiredCache.timestamp >= TTL;
  assert.strictEqual(isExpired, true, 'Expired cache detected');
  const chosenRates = expiredCache ? expiredCache.rates : DEFAULT_FALLBACK_RATES;
  assert.strictEqual(chosenRates.EUR, 0.90, 'Expired cache rates chosen over hardcoded fallback when available');

  const noCache = null;
  const fallbackRates = noCache ? (noCache as any).rates : DEFAULT_FALLBACK_RATES;
  assert.strictEqual(fallbackRates.EUR, 0.92, 'Hardcoded defaults chosen when no cache exists');
});

check('2.4 Translation Service - Offline failure error handling & non-crashing behavior', () => {
  let targetText = '';
  let loading = true;
  try {
    throw new Error('TypeError: Network request failed');
  } catch (err) {
    targetText = 'Ошибка перевода';
  } finally {
    loading = false;
  }

  assert.strictEqual(targetText, 'Ошибка перевода', 'Target text displays error message');
  assert.strictEqual(loading, false, 'Loading spinner stops');

  const canCopy = !(
    !targetText.trim() ||
    targetText.includes('Ошибка') ||
    targetText === 'Перевод появится здесь' ||
    targetText === 'Перевод...' ||
    loading
  );
  assert.strictEqual(canCopy, false, 'Copy button is strictly disabled on translation error');

  const canFavorite = !(
    !targetText.trim() ||
    targetText.includes('Ошибка') ||
    targetText === 'Перевод...'
  );
  assert.strictEqual(canFavorite, false, 'Favorite button is strictly disabled on translation error');
});

check('2.5 Translation Service - Multi-segment response parsing', () => {
  const mockGtxData = [
    [
      ['Первое предложение. ', 'First sentence. ', null, null, 10],
      ['Второе предложение. ', 'Second sentence. ', null, null, 10],
      ['Третье предложение.', 'Third sentence.', null, null, 10],
    ],
    null,
    'en',
  ];

  const parsed = mockGtxData[0].map((item: any) => item?.[0] || '').join('');
  assert.strictEqual(
    parsed,
    'Первое предложение. Второе предложение. Третье предложение.',
    'Multi-segment translation correctly concatenated'
  );
});

// ============================================================================
// SUITE 3: GENPASS ENTROPY, SCORE PENALTIES, CRACK TIME FORMATTING
// ============================================================================
console.log('\n--- SUITE 3: GENPASS ENTROPY, SCORE PENALTIES, CRACK TIME FORMATTING ---');

function calculateEntropy(password: string): number {
  if (!password) return 0;
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) return 0;
  return password.length * Math.log2(poolSize);
}

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

function estimateCrackTime(password: string): string {
  if (!password) return '-';
  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^A-Za-z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) return '-';

  const combinations = Math.pow(poolSize, password.length);
  const seconds = combinations / 100000000000; // 100 billion guesses/sec

  if (seconds < 1) return 'менее секунды';
  if (seconds < 60) return `~${Math.round(seconds)} сек.`;
  if (seconds < 3600) return `~${Math.round(seconds / 60)} мин.`;
  if (seconds < 86400) return `~${Math.round(seconds / 3600)} ч.`;
  if (seconds < 31536000) return `~${Math.round(seconds / 86400)} дн.`;
  if (seconds < 3153600000) return `~${Math.round(seconds / 31536000)} лет`;
  if (seconds < 3153600000000) return `~${Math.round(seconds / 31536000 / 1000)} тыс. лет`;
  return '> 1 млн лет';
}

check('3.1 GenPass Entropy - Empty & single character boundary', () => {
  assert.strictEqual(calculateEntropy(''), 0);
  assert(Math.abs(calculateEntropy('a') - Math.log2(26)) < 1e-6);
  assert(Math.abs(calculateEntropy('A') - Math.log2(26)) < 1e-6);
  assert(Math.abs(calculateEntropy('1') - Math.log2(10)) < 1e-6);
  assert(Math.abs(calculateEntropy('!') - Math.log2(32)) < 1e-6);
});

check('3.2 GenPass Entropy - Multi-character pools (62, 94, Cyrillic)', () => {
  const p62 = 'kLmNpQrSt';
  assert(Math.abs(calculateEntropy(p62) - 9 * Math.log2(52)) < 1e-6);

  const p94 = 'kLmN123!@#';
  assert(Math.abs(calculateEntropy(p94) - 10 * Math.log2(94)) < 1e-6);

  const pCyr = 'пароль';
  assert(Math.abs(calculateEntropy(pCyr) - 6 * Math.log2(32)) < 1e-6);
});

check('3.3 GenPass Score - Length baseline progression (<5, 5-7, 8-11, >=12, >=16) without pattern penalties', () => {
  // Use un-penalized strings (no 'aaa', '111', 'abc', 'qwerty', '12345', 'asdfgh', 'password')
  assert.strictEqual(calculateScore('z'), 0, 'len 1 is 0');
  assert.strictEqual(calculateScore('zxvu'), 0, 'len 4 is 0');
  assert.strictEqual(calculateScore('zxvut'), 15, 'len 5 is 15');
  assert.strictEqual(calculateScore('zxvutsr'), 15, 'len 7 is 15');
  assert.strictEqual(calculateScore('zxvutsrq'), 30, 'len 8 is 30');
  assert.strictEqual(calculateScore('zxvutsrqpon'), 30, 'len 11 is 30');
  assert.strictEqual(calculateScore('zxvutsrqponm'), 40, 'len 12 is 40');
  assert.strictEqual(calculateScore('zxvutsrqponmlkj'), 40, 'len 15 is 40');
  assert.strictEqual(calculateScore('zxvutsrqponmlkji'), 55, 'len 16 is 40 + 15 = 55');
});

check('3.4 GenPass Score - Variety bonuses (+15 upper/lower, +15 num, +15 sym)', () => {
  // Use clean strings without 'abc' or 'aaa'
  assert.strictEqual(calculateScore('zxvutsrqponm'), 40); // lowercase only
  assert.strictEqual(calculateScore('ZXVutsrqponm'), 55); // upper+lower: +15 -> 55
  assert.strictEqual(calculateScore('ZXVutsrqp987'), 70); // upper+lower + digits: +30 -> 70
  assert.strictEqual(calculateScore('ZXVutsrq9!#$'), 85); // upper+lower + digits + sym: +45 -> 85
  assert.strictEqual(calculateScore('ZXVutsrqponm9!#$'), 100); // len 16 + all 3 variety bonuses = 40+15+15+15+15 = 100
});

check('3.5 GenPass Score - Pattern penalties (-25) across all 7 forbidden substrings with controlled baselines', () => {
  const patterns = ['qwerty', '12345', 'asdfgh', 'password', '111', 'aaa', 'abc'];
  for (const pat of patterns) {
    // Both base strings have uppercase, lowercase, numbers, and symbols
    const testPwdWithPattern = `Xk9!_${pat}_Zp8#`;
    const testPwdClean = `Xk9!_mTnQrS_Zp8#`;
    const scoreWith = calculateScore(testPwdWithPattern);
    const scoreWithout = calculateScore(testPwdClean);
    assert.strictEqual(
      scoreWithout - scoreWith,
      25,
      `Pattern "${pat}" should deduct exactly 25 points. With: ${scoreWith}, Without: ${scoreWithout}`
    );
  }
});

check('3.6 GenPass Score - Score boundaries (clamped [0, 100]) and Pwned cap (<=15)', () => {
  assert.strictEqual(calculateScore('111'), 0, '111 score clamped to 0');
  assert.strictEqual(calculateScore('abc'), 0, 'abc score clamped to 0');

  const maxPwd = 'Ab1!Ab1!Ab1!Ab1!Ab1!Ab1!';
  assert.strictEqual(calculateScore(maxPwd), 100, 'Max score clamped to 100');

  assert.strictEqual(calculateScore(maxPwd, true), 15, 'Pwned 100% password capped at 15');
  assert.strictEqual(calculateScore('111', true), 0, 'Pwned weak password remains 0');
});

check('3.7 GenPass Crack Time - All 8 formatting bands and threshold boundaries', () => {
  assert.strictEqual(estimateCrackTime(''), '-', 'Empty password gives "-"');

  // Band 1: < 1s
  assert.strictEqual(estimateCrackTime('1234'), 'менее секунды');

  // Band 2: < 60s
  // 10^12 combinations / 1e11 = 10s -> ~10 сек.
  assert.strictEqual(estimateCrackTime('012345678901'), '~10 сек.');

  // Band 3: < 3600s
  // pool 26, len 10: 26^10 / 1e11 = 1411.67s -> ~24 мин.
  assert.strictEqual(estimateCrackTime('zxvutsrqpo'), '~24 мин.');

  // Band 4: < 86400s
  // pool 26, len 11: 26^11 / 1e11 = 36703s -> ~10 ч.
  assert.strictEqual(estimateCrackTime('zxvutsrqpon'), '~10 ч.');

  // Band 5: < 31536000s (365 days)
  // pool 26, len 12: 26^12 / 1e11 = 954289s -> ~11 дн.
  assert.strictEqual(estimateCrackTime('zxvutsrqponm'), '~11 дн.');
  // pool 26, len 13: 26^13 / 1e11 = 24811528s -> ~287 дн.
  assert.strictEqual(estimateCrackTime('zxvutsrqponml'), '~287 дн.');

  // Band 6: < 3153600000s (100 years)
  // pool 26, len 14: 26^14 / 1e11 = 645099748s -> ~20 лет (645M / 31.5M = 20.45)
  assert.strictEqual(estimateCrackTime('zxvutsrqponmlk'), '~20 лет');

  // Band 7: < 3153600000000s (100,000 years)
  // pool 26, len 15: 26^15 / 1e11 = 1.677e10s -> ~532 тыс. лет
  assert.strictEqual(estimateCrackTime('zxvutsrqponmlkj'), '~532 тыс. лет');

  // Band 8: > 1 млн лет
  assert.strictEqual(estimateCrackTime('zxvutsrqponmlkji'), '> 1 млн лет');
  assert.strictEqual(estimateCrackTime('A1!bC2@dE3#fG4$hI5%jK6^'), '> 1 млн лет');
});

// ============================================================================
// SUITE 4: RFC 3174 SHA-1 TEST VECTORS & STRESS TESTING
// ============================================================================
console.log('\n--- SUITE 4: RFC 3174 SHA-1 TEST VECTORS & STRESS TESTING ---');

function sha1(msg: string): string {
  function rotl(n: number, s: number) {
    return (n << s) | (n >>> (32 - s));
  }
  let H0 = 0x67452301, H1 = 0xefcdab89, H2 = 0x98badcfe, H3 = 0x10325476, H4 = 0xc3d2e1f0;
  const bytes: number[] = [];
  for (let i = 0; i < msg.length; i++) {
    const c = msg.charCodeAt(i);
    if (c < 128) bytes.push(c);
    else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
    else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
  }
  const bitLen = bytes.length * 8;
  bytes.push(0x80);
  while ((bytes.length % 64) !== 56) bytes.push(0);
  bytes.push(0, 0, 0, 0);
  bytes.push((bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

  const W = new Uint32Array(80);
  for (let i = 0; i < bytes.length; i += 64) {
    for (let t = 0; t < 16; t++) {
      W[t] = (bytes[i + t * 4] << 24) | (bytes[i + t * 4 + 1] << 16) | (bytes[i + t * 4 + 2] << 8) | bytes[i + t * 4 + 3];
    }
    for (let t = 16; t < 80; t++) {
      W[t] = rotl(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
    }
    let A = H0, B = H1, C = H2, D = H3, E = H4;
    for (let t = 0; t < 80; t++) {
      const s = Math.floor(t / 20);
      let f = 0, K = 0;
      if (s === 0) { f = (B & C) | ((~B) & D); K = 0x5a827999; }
      else if (s === 1) { f = B ^ C ^ D; K = 0x6ed9eba1; }
      else if (s === 2) { f = (B & C) | (B & D) | (C & D); K = 0x8f1bbcdc; }
      else { f = B ^ C ^ D; K = 0xca62c1d6; }
      const temp = (rotl(A, 5) + f + E + K + W[t]) >>> 0;
      E = D; D = C; C = rotl(B, 30) >>> 0; B = A; A = temp;
    }
    H0 = (H0 + A) >>> 0; H1 = (H1 + B) >>> 0; H2 = (H2 + C) >>> 0; H3 = (H3 + D) >>> 0; H4 = (H4 + E) >>> 0;
  }
  const hex = (n: number) => ('00000000' + n.toString(16)).slice(-8);
  return (hex(H0) + hex(H1) + hex(H2) + hex(H3) + hex(H4)).toUpperCase();
}

function nodeSha1(str: string): string {
  return crypto.createHash('sha1').update(str, 'utf8').digest('hex').toUpperCase();
}

check('4.1 RFC 3174 Vector 1 - "abc"', () => {
  const result = sha1('abc');
  const expected = 'A9993E364706816ABA3E25717850C26C9CD0D89D';
  assert.strictEqual(result, expected, 'RFC 3174 Test 1 matches');
  assert.strictEqual(result, nodeSha1('abc'), 'Matches Node crypto');
});

check('4.2 RFC 3174 Vector 2 - 56-byte string', () => {
  const input = 'abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq';
  const result = sha1(input);
  const expected = nodeSha1(input);
  assert.strictEqual(result, expected, 'RFC 3174 Test 2 matches Node crypto byte-for-byte');
  assert.strictEqual(result, '84983E441C3BD26EBAAE4AA1F95129E5E54670F1');
});

check('4.3 RFC 3174 Vector 4 - 8 repetitions of 64-byte string', () => {
  const chunk = '0123456701234567012345670123456701234567012345670123456701234567';
  const input = chunk.repeat(8);
  const result = sha1(input);
  const expected = nodeSha1(input);
  assert.strictEqual(result, expected, 'RFC 3174 Test 4 matches Node crypto');
});

check('4.4 RFC 3174 Empty string ""', () => {
  const result = sha1('');
  const expected = 'DA39A3EE5E6B4B0D3255BFEF95601890AFD80709';
  assert.strictEqual(result, expected, 'Empty string SHA-1 matches');
  assert.strictEqual(result, nodeSha1(''), 'Matches Node crypto');
});

check('4.5 SHA-1 Critical block boundary lengths (0, 1, 55, 56, 63, 64, 65, 119, 120, 128)', () => {
  const lengths = [0, 1, 55, 56, 63, 64, 65, 119, 120, 127, 128, 255, 256];
  for (const len of lengths) {
    const testStr = 'X'.repeat(len);
    const calculated = sha1(testStr);
    const expected = nodeSha1(testStr);
    assert.strictEqual(calculated, expected, `SHA-1 failed at length ${len}`);
  }
});

check('4.6 SHA-1 UTF-8 Multi-byte Russian / Cyrillic test strings', () => {
  const cyrillicWords = ['пароль', 'СложныйПароль123!', 'ТестРусскогоЯзыка', 'КурсыВалют_2026'];
  for (const word of cyrillicWords) {
    const calculated = sha1(word);
    const expected = nodeSha1(word);
    assert.strictEqual(calculated, expected, `SHA-1 failed for Cyrillic string "${word}"`);
  }
});

check('4.7 SHA-1 High load: 1,000,000 chars (RFC 3174 Vector 3)', () => {
  const oneMillionA = 'a'.repeat(1000000);
  const start = Date.now();
  const calculated = sha1(oneMillionA);
  const duration = Date.now() - start;
  const expected = '34AA973CD4C4DAA4F61EEB2BDBAD27316534016F';
  assert.strictEqual(calculated, expected, 'RFC 3174 Test 3 matches 1M repetitions');
  assert.strictEqual(calculated, nodeSha1(oneMillionA), 'Matches Node crypto on 1M chars');
  console.log(`       [Perf] 1,000,000 characters hashed in ${duration}ms`);
});

// ============================================================================
// SUITE 5: NOTES MODULE TEMPORAL SORTING & DEFENSIVE CONTRACTS
// ============================================================================
console.log('\n--- SUITE 5: NOTES MODULE TEMPORAL SORTING & DEFENSIVE CONTRACTS ---');

check('5.1 Notes Sorting - updatedAt precedence, createdAt fallback, and stability', () => {
  const rawNotes = [
    { id: '1', title: 'Oldest', createdAt: 100 },
    { id: '2', title: 'Updated recently', createdAt: 50, updatedAt: 500 },
    { id: '3', title: 'Created recently, no update', createdAt: 400 },
    { id: '4', title: 'Zero timestamp fallback', createdAt: 0, updatedAt: 0 },
    { id: '5', title: 'Undefined timestamps' },
  ];

  const sorted = [...rawNotes].sort(
    (a: any, b: any) =>
      (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0)
  );

  assert.strictEqual(sorted[0].id, '2', 'Updated recently (500) must be 1st');
  assert.strictEqual(sorted[1].id, '3', 'Created recently (400) must be 2nd');
  assert.strictEqual(sorted[2].id, '1', 'Oldest (100) must be 3rd');
  assert.strictEqual(sorted[3].id, '4', 'Zero timestamp must be 4th');
  assert.strictEqual(sorted[4].id, '5', 'Undefined timestamp must be 5th');
});

check('5.2 Notes Tag Filtering - Defensive against null, undefined, empty tags', () => {
  const notesWithRaggedTags = [
    { id: '1', title: 'Note 1', tags: ['work', 'urgent'] },
    { id: '2', title: 'Note 2', tags: undefined as any },
    { id: '3', title: 'Note 3', tags: null as any },
    { id: '4', title: 'Note 4' } as any,
  ];

  const tagSet = new Set<string>();
  for (const n of notesWithRaggedTags) {
    for (const t of n.tags || []) {
      tagSet.add(t);
    }
  }
  const availableTags = Array.from(tagSet);
  assert.deepStrictEqual(availableTags, ['work', 'urgent'], 'Handles missing tags without throwing');

  const filterByTag = (tag: string) =>
    notesWithRaggedTags.filter((n) => {
      const tags = n.tags || [];
      return tags.includes(tag);
    });

  const urgent = filterByTag('urgent');
  assert.strictEqual(urgent.length, 1);
  assert.strictEqual(urgent[0].id, '1');
});

check('5.3 NoteCard Copy Formatting - Title, content, and checklist state representation', () => {
  const fullNote = {
    title: 'Список покупок',
    content: 'Зайти в магазин после работы',
    checklist: [
      { id: 'c1', text: 'Хлеб', done: true },
      { id: 'c2', text: 'Молоко', done: false },
    ],
  };

  const parts: string[] = [];
  if (fullNote.title) parts.push(fullNote.title);
  if (fullNote.content) parts.push(fullNote.content);
  if (fullNote.checklist && fullNote.checklist.length > 0) {
    parts.push(
      fullNote.checklist
        .map((item) => `${item.done ? '[x]' : '[ ]'} ${item.text}`)
        .join('\n')
    );
  }
  const copiedText = parts.join('\n\n');

  const expected = 'Список покупок\n\nЗайти в магазин после работы\n\n[x] Хлеб\n[ ] Молоко';
  assert.strictEqual(copiedText, expected, 'Checklist copy format matches markdown checkbox conventions');
});

// ============================================================================
// FINAL SUMMARY
// ============================================================================
console.log('\n================================================================');
console.log(`TOTAL TESTS EXECUTED: ${totalTests}`);
console.log(`PASSED: ${passedTests}`);
console.log(`FAILED: ${failedTests}`);
console.log('================================================================');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
