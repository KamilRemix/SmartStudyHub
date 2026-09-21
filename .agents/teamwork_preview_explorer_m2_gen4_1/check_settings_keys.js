const fs = require('fs');

const tsContent = fs.readFileSync('c:/projects/SmartStudyHub/mobile-expo/src/i18n/translations.ts', 'utf8');
const startIdx = tsContent.indexOf('{');
const endIdx = tsContent.lastIndexOf('};');
const objStr = tsContent.substring(startIdx, endIdx + 1);
const translations = new Function('return (' + objStr + ');')();

const ru = translations.ru;
console.log('RU total keys:', Object.keys(ru).length);

// Check existing keys related to settings, appearance, auth, theme, etc.
const candidateKeywords = [
  'setting', 'theme', 'light', 'dark', 'lang', 'account', 'sign', 'sync',
  'cloud', 'version', 'offline', 'online', 'guest', 'select', 'appear', 'about'
];

const matchingKeys = Object.keys(ru).filter(k => 
  candidateKeywords.some(kw => k.toLowerCase().includes(kw))
);

console.log('Matching existing keys in RU:');
matchingKeys.forEach(k => {
  console.log(`  ${k}: "${ru[k]}"`);
});
