const fs = require('fs');
const html = fs.readFileSync('public/index.html', 'utf8');
const regex = /data-i18n(-placeholder)?=\"([^\"]+)\"/g;
let match;
const keys = new Set();
while ((match = regex.exec(html)) !== null) {
    keys.add(match[2]);
}
console.log('Total HTML i18n keys:', keys.size);

const js = fs.readFileSync('public/translations.js', 'utf8');
const missingKeys = [];
for (const key of keys) {
    if (!js.includes(key + ':') && !js.includes('\'' + key + '\':') && !js.includes('\"' + key + '\":')) {
        missingKeys.push(key);
    }
}
console.log('Missing keys in translations.js:', missingKeys);

const langs = ['en', 'ru', 'uk', 'be', 'kk', 'es', 'de', 'fr', 'zh', 'tr', 'ar'];
let totalMissing = 0;
// Check if any keys are missing in any language in translations.js
const translationsRegex = /([a-zA-Z0-9_]+)\s*:\s*\{([^}]+)\}/g;
let transMatch;
while ((transMatch = translationsRegex.exec(js)) !== null) {
    const key = transMatch[1];
    const dictStr = transMatch[2];
    langs.forEach(lang => {
        if (!dictStr.includes(lang + ':')) {
            console.log(`Key ${key} missing language ${lang}`);
            totalMissing++;
        }
    });
}
console.log('Total missing language translations:', totalMissing);
