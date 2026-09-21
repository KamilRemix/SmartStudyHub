const fs = require('fs');
const path = require('path');

const srcDir = path.resolve('c:/projects/SmartStudyHub/mobile-expo/src');

function getAllFiles(dir, exts = ['.ts', '.tsx']) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(fullPath, exts));
    } else {
      if (exts.includes(path.extname(fullPath))) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const allFiles = getAllFiles(srcDir);

// Check useI18n usage
const i18nUsage = [];
allFiles.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const hasUseI18n = content.includes('useI18n');
  const hasTCall = /\bt\(/.test(content);
  const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
  i18nUsage.push({ file: relPath, hasUseI18n, hasTCall });
});

console.log('--- i18n Hook Usage ---');
const componentsWithoutI18n = i18nUsage.filter(u => u.file.endsWith('.tsx') && !u.hasUseI18n);
console.log('TSX components NOT importing useI18n (' + componentsWithoutI18n.length + ' files):');
componentsWithoutI18n.forEach(c => console.log(' ', c.file));

// Now scan for potential hardcoded strings in JSX text, like >Some String<
const hardcodedTexts = [];
const jsxTextRegex = />([^<>{}\n]+)</g;

allFiles.forEach(file => {
  if (file.endsWith('translations.ts')) return;
  const content = fs.readFileSync(file, 'utf8');
  const relPath = path.relative(srcDir, file).replace(/\\/g, '/');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let match;
    while ((match = jsxTextRegex.exec(line)) !== null) {
      const text = match[1].trim();
      // Filter out punctuation, numbers, symbols
      if (text.length > 1 && !/^[0-9\s.,/:;+\-*=><()[\]{}!|#%&^@$_~`'"\\]+$/.test(text)) {
        hardcodedTexts.push({
          file: relPath,
          line: idx + 1,
          text: text
        });
      }
    }
  });
});

console.log('\nTotal JSX raw texts found:', hardcodedTexts.length);
const byFileText = {};
hardcodedTexts.forEach(h => {
  if (!byFileText[h.file]) byFileText[h.file] = [];
  byFileText[h.file].push(h);
});

for (const [file, list] of Object.entries(byFileText)) {
  console.log(`\n=== ${file} (${list.length}) ===`);
  list.forEach(item => console.log(`  L${item.line}: "${item.text}"`));
}
