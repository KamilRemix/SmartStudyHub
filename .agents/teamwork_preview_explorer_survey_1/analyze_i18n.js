const fs = require('fs');
const path = require('path');

const filePath = path.resolve('c:/projects/SmartStudyHub/mobile-expo/src/i18n/translations.ts');
let content = fs.readFileSync(filePath, 'utf8');

// remove export type ... and export const translations: ... =
const exportIndex = content.indexOf('export const translations');
if (exportIndex === -1) {
  console.error('translations export not found');
  process.exit(1);
}

// Extract the object part
const objStart = content.indexOf('{', exportIndex);
// Simple evaluation: strip typescript type annotations if needed, or use Function
// Since it's pure JS object literal:
const jsCode = 'return ' + content.slice(objStart).replace(/;\s*$/, '');
let translations;
try {
  translations = new Function(jsCode)();
} catch (e) {
  console.error('Function eval failed:', e.message);
  process.exit(1);
}

const languages = Object.keys(translations);
console.log('Detected languages:', languages);

const keyCounts = {};
for (const lang of languages) {
  keyCounts[lang] = Object.keys(translations[lang]).length;
}
console.log('Key counts per language:', keyCounts);

const ruKeys = new Set(Object.keys(translations['ru'] || {}));
const enKeys = new Set(Object.keys(translations['en'] || {}));

console.log('RU total keys:', ruKeys.size);
console.log('EN total keys:', enKeys.size);

const missingInEn = [];
for (const k of ruKeys) {
  if (!enKeys.has(k)) missingInEn.push(k);
}
console.log('Missing in EN (present in RU):', missingInEn.length, missingInEn);

const missingInRu = [];
for (const k of enKeys) {
  if (!ruKeys.has(k)) missingInRu.push(k);
}
console.log('Missing in RU (present in EN):', missingInRu.length, missingInRu);

// Check other languages
for (const lang of languages) {
  if (lang === 'ru') continue;
  const missing = [];
  const currentKeys = new Set(Object.keys(translations[lang]));
  for (const k of ruKeys) {
    if (!currentKeys.has(k)) missing.push(k);
  }
  console.log(`Language ${lang} missing keys vs RU:`, missing.length);
}
