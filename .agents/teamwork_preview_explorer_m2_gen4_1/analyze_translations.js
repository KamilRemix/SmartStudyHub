const fs = require('fs');

// 1. Read public/translations.js
const legacyContent = fs.readFileSync('c:/projects/SmartStudyHub/public/translations.js', 'utf8');

const fn = new Function('window', legacyContent + '\nreturn translations;');
let legacyTranslations;
try {
  legacyTranslations = fn({});
} catch (e) {
  console.error('Error evaluating public/translations.js:', e);
  process.exit(1);
}

const legacyLangs = Object.keys(legacyTranslations);
console.log('Legacy languages count:', legacyLangs.length);
console.log('Legacy languages:', legacyLangs);

// 2. Read mobile-expo/src/i18n/translations.ts
const tsContent = fs.readFileSync('c:/projects/SmartStudyHub/mobile-expo/src/i18n/translations.ts', 'utf8');

// Check emojis
const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu;

const emojisFoundInTs = [];
tsContent.split(/\r?\n/).forEach((line, idx) => {
  const matches = line.match(emojiRegex);
  if (matches) {
    emojisFoundInTs.push({ line: idx + 1, matches, content: line.trim() });
  }
});
console.log('Emojis found in translations.ts:', emojisFoundInTs.length);

const emojisFoundInLegacy = [];
legacyContent.split(/\r?\n/).forEach((line, idx) => {
  const matches = line.match(emojiRegex);
  if (matches) {
    emojisFoundInLegacy.push({ line: idx + 1, matches, content: line.trim() });
  }
});
console.log('Emojis found in public/translations.js:', emojisFoundInLegacy.length);

// Extract translations object from translations.ts
const startIdx = tsContent.indexOf('{');
const endIdx = tsContent.lastIndexOf('};');
const objStr = tsContent.substring(startIdx, endIdx + 1);

let tsTranslations;
try {
  const tsFn = new Function('return (' + objStr + ');');
  tsTranslations = tsFn();
} catch (e) {
  console.error('Error parsing translations.ts object:', e.message);
  process.exit(1);
}

const tsLangs = Object.keys(tsTranslations);
console.log('\nTS languages count:', tsLangs.length);
console.log('TS languages:', tsLangs);

const tsStats = {};
for (const lang of tsLangs) {
  tsStats[lang] = Object.keys(tsTranslations[lang]).length;
}
console.log('TS key counts per language:', tsStats);

// Target languages
const targetLangs = ['ru', 'en', 'uk', 'be', 'kk', 'es', 'de', 'fr', 'zh', 'tr'];

console.log('\n=== DETAILED COMPARISON PER TARGET LANGUAGE ===');
for (const lang of targetLangs) {
  const legacyKeys = new Set(Object.keys(legacyTranslations[lang] || {}));
  const tsKeys = new Set(Object.keys(tsTranslations[lang] || {}));

  const missingInTs = [...legacyKeys].filter(k => !tsKeys.has(k));
  const extraInTs = [...tsKeys].filter(k => !legacyKeys.has(k));

  console.log(`\n--- [${lang}] ---`);
  console.log(`Legacy keys: ${legacyKeys.size}, TS keys: ${tsKeys.size}`);
  console.log(`Missing in TS: ${missingInTs.length}`);
  if (missingInTs.length > 0) {
    console.log(`Sample missing in TS (${Math.min(10, missingInTs.length)}):`, missingInTs.slice(0, 10));
  }
  console.log(`Extra in TS (mobile-specific): ${extraInTs.length}`);
  if (extraInTs.length > 0) {
    console.log(`Sample extra in TS (${Math.min(10, extraInTs.length)}):`, extraInTs.slice(0, 10));
  }
}

// Parity across TS languages
console.log('\n=== PARITY ACROSS ALL TS LANGUAGES ===');
const ruTsKeys = new Set(Object.keys(tsTranslations.ru));
for (const lang of targetLangs) {
  const langKeys = new Set(Object.keys(tsTranslations[lang]));
  const missingVsRu = [...ruTsKeys].filter(k => !langKeys.has(k));
  const extraVsRu = [...langKeys].filter(k => !ruTsKeys.has(k));
  console.log(`Lang [${lang}]: total ${langKeys.size} keys. Missing vs RU: ${missingVsRu.length}, Extra vs RU: ${extraVsRu.length}`);
  if (missingVsRu.length > 0) {
    console.log(`  Missing in [${lang}]:`, missingVsRu);
  }
  if (extraVsRu.length > 0) {
    console.log(`  Extra in [${lang}]:`, extraVsRu);
  }
}
