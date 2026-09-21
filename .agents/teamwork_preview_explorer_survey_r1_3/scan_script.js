const fs = require('fs');
const path = require('path');

const files = [
  'mobile-expo/src/modules/notes/NotesScreen.tsx',
  'mobile-expo/src/modules/notes/components/ColorPicker.tsx',
  'mobile-expo/src/modules/notes/components/NoteCard.tsx',
  'mobile-expo/src/modules/notes/components/NoteEditorModal.tsx',
  'mobile-expo/src/modules/notes/components/TagFilter.tsx',
  'mobile-expo/src/modules/settings/SettingsScreen.tsx',
  'mobile-expo/src/modules/auth/LoginScreen.tsx',
  'mobile-expo/src/modules/auth/RegisterScreen.tsx',
  'mobile-expo/src/modules/auth/AuthNavigator.tsx'
];

const cyrillicRegex = /[\u0400-\u04FF]/;

for (const file of files) {
  const fullPath = path.resolve('c:/projects/SmartStudyHub', file);
  if (!fs.existsSync(fullPath)) {
    console.log('NOT FOUND: ' + file);
    continue;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const lines = content.split('\n');
  console.log('\n========================================');
  console.log('FILE: ' + file);
  console.log('========================================');
  let matchCount = 0;
  lines.forEach((line, idx) => {
    if (cyrillicRegex.test(line)) {
      matchCount++;
      console.log(`[L${idx + 1}] ${line.trim()}`);
    }
  });
  console.log(`Total Cyrillic lines in ${file}: ${matchCount}`);
}
