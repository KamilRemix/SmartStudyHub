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
console.log('Total files scanned in src:', allFiles.length);

// 1. Cyrillic scanner (excluding translations.ts)
const cyrillicMatches = [];
const cyrillicRegex = /[а-яёА-ЯЁ]/;

allFiles.forEach(file => {
  if (file.endsWith('translations.ts')) return;
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    // Ignore pure comments
    if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }
    if (cyrillicRegex.test(line)) {
      cyrillicMatches.push({
        file: path.relative(srcDir, file).replace(/\\/g, '/'),
        line: idx + 1,
        content: trimmed
      });
    }
  });
});

console.log('Total lines with Cyrillic outside translations.ts:', cyrillicMatches.length);

const byFile = {};
cyrillicMatches.forEach(m => {
  if (!byFile[m.file]) byFile[m.file] = [];
  byFile[m.file].push(m);
});

for (const [file, matches] of Object.entries(byFile)) {
  console.log(`\n--- ${file} (${matches.length} matches) ---`);
  matches.forEach(m => {
    console.log(`  Line ${m.line}: ${m.content}`);
  });
}
