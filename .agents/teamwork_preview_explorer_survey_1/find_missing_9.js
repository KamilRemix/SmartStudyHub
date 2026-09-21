const fs = require('fs');
const path = require('path');

const filePath = path.resolve('c:/projects/SmartStudyHub/mobile-expo/src/i18n/translations.ts');
let content = fs.readFileSync(filePath, 'utf8');

const exportIndex = content.indexOf('export const translations');
const objStart = content.indexOf('{', exportIndex);
const jsCode = 'return ' + content.slice(objStart).replace(/;\s*$/, '');
const translations = new Function(jsCode)();

const ruKeys = Object.keys(translations['ru']);
const ukKeys = new Set(Object.keys(translations['uk']));
const missingInUk = ruKeys.filter(k => !ukKeys.has(k));
console.log('Keys in RU/EN but missing in UK (and others):', missingInUk);
for (const k of missingInUk) {
  console.log(`Key: ${k} -> RU: "${translations['ru'][k]}" | EN: "${translations['en'][k]}"`);
}
