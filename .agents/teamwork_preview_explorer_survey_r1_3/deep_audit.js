const fs = require('fs');
const path = require('path');

const transPath = path.resolve('c:/projects/SmartStudyHub/mobile-expo/src/i18n/translations.ts');
const transContent = fs.readFileSync(transPath, 'utf8');

// Parse languages
const langs = ['ru', 'en', 'uk', 'be', 'kk', 'es', 'de', 'fr', 'zh', 'tr'];
const dicts = {};

for (const lang of langs) {
  dicts[lang] = {};
  const startMarker = `"${lang}": {`;
  const startIdx = transContent.indexOf(startMarker);
  if (startIdx === -1) {
    console.warn(`Language ${lang} not found`);
    continue;
  }
  // Find closing brace for this language block
  // We can look for the next language marker or the end
  let endIdx = transContent.length;
  for (const nextLang of langs) {
    if (nextLang === lang) continue;
    const nextMarker = `"${nextLang}": {`;
    const nIdx = transContent.indexOf(nextMarker, startIdx + startMarker.length);
    if (nIdx !== -1 && nIdx < endIdx) {
      endIdx = nIdx;
    }
  }
  const block = transContent.substring(startIdx + startMarker.length, endIdx);
  const regex = /"([^"\n]+)":\s*"((?:\\.|[^"\\])*)"/g;
  let m;
  while ((m = regex.exec(block)) !== null) {
    dicts[lang][m[1]] = m[2];
  }
  console.log(`Parsed ${lang}: ${Object.keys(dicts[lang]).length} keys`);
}

// Check coverage of existing keys across all 10 languages
console.log('\n--- Missing keys in any language ---');
const allKeys = Object.keys(dicts['ru']);
const missingReport = {};
for (const key of allKeys) {
  for (const lang of langs) {
    if (!dicts[lang][key]) {
      if (!missingReport[key]) missingReport[key] = [];
      missingReport[key].push(lang);
    }
  }
}

const missingKeysList = Object.keys(missingReport);
console.log(`Total keys with missing translations in at least one language: ${missingKeysList.length}`);
for (const k of missingKeysList) {
  console.log(`Key "${k}" missing in: ${missingReport[k].join(', ')} (RU: "${dicts['ru'][k]}")`);
}

// Now list existing keys in RU that might already match some of the strings in Auth/Notes/Settings
console.log('\n--- Existing Auth keys in RU & EN ---');
for (const [k, v] of Object.entries(dicts['ru'])) {
  if (/auth|login|sign|register|password|email/i.test(k)) {
    console.log(`  ${k}: RU="${v}" | EN="${dicts['en']?.[k] || '[MISSING]'}"`);
  }
}

console.log('\n--- Existing Notes keys in RU & EN ---');
for (const [k, v] of Object.entries(dicts['ru'])) {
  if (/note|tag|checklist|pin|search|delete|edit|save|color/i.test(k)) {
    console.log(`  ${k}: RU="${v}" | EN="${dicts['en']?.[k] || '[MISSING]'}"`);
  }
}
