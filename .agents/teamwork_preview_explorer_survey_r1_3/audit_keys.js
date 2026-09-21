const fs = require('fs');
const path = require('path');

const content = fs.readFileSync(path.resolve('c:/projects/SmartStudyHub/mobile-expo/src/i18n/translations.ts'), 'utf8');

// Regex to extract all top-level language blocks
const langRegex = /"([a-z]{2})":\s*\{/g;
let match;
const langOffsets = [];
while ((match = langRegex.exec(content)) !== null) {
  langOffsets.push({ lang: match[1], index: match.index + match[0].length });
}

console.log('Detected languages:', langOffsets.map(l => l.lang));

// Function to extract keys from a language block slice
function extractKeysAndVals(blockStr) {
  const result = {};
  const kvRegex = /"([^"]+)":\s*"((?:[^"\\]|\\.)*)"/g;
  let kv;
  while ((kv = kvRegex.exec(blockStr)) !== null) {
    result[kv[1]] = kv[2];
  }
  return result;
}

// Slice each language
const langDicts = {};
for (let i = 0; i < langOffsets.length; i++) {
  const current = langOffsets[i];
  const nextIndex = i + 1 < langOffsets.length ? langOffsets[i + 1].index - 10 : content.lastIndexOf('}');
  const slice = content.substring(current.index, nextIndex);
  langDicts[current.lang] = extractKeysAndVals(slice);
}

for (const lang of Object.keys(langDicts)) {
  console.log(`Language ${lang} has ${Object.keys(langDicts[lang]).length} keys`);
}

// Check notes and auth keys in ru
const ruKeys = langDicts['ru'] || {};
const enKeys = langDicts['en'] || {};

console.log('\n--- Checking existing keys relevant to Notes ---');
const noteRelated = Object.keys(ruKeys).filter(k => /note|tag|check|color|photo|image|remind/i.test(k));
console.log(noteRelated.map(k => `  "${k}": RU="${ruKeys[k]}" | EN="${enKeys[k]}"`).join('\n'));

console.log('\n--- Checking existing keys relevant to Auth ---');
const authRelated = Object.keys(ruKeys).filter(k => /auth|login|register|sign|pass|email|user|creat/i.test(k));
console.log(authRelated.map(k => `  "${k}": RU="${ruKeys[k]}" | EN="${enKeys[k]}"`).join('\n'));

console.log('\n--- Checking existing keys relevant to Settings ---');
const settingsRelated = Object.keys(ruKeys).filter(k => /setting|theme|account|lang|network|sync/i.test(k));
console.log(settingsRelated.map(k => `  "${k}": RU="${ruKeys[k]}" | EN="${enKeys[k]}"`).join('\n'));
