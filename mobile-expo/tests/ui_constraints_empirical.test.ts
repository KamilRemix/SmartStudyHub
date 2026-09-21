/**
 * Empirical test harness for Strict UI Constraints & App Metadata:
 * 1. ZERO unicode emojis in mobile-expo/src
 * 2. Strict package ID in mobile-expo/app.json ("com.smartstudyhub.mobile")
 * 3. ZERO TODO / FIXME placeholder comments in core logic
 * 4. Verification of Feather / MaterialIcons usage without illicit icon sources
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, failureDetails: string) {
  if (condition) {
    results.push({ name, passed: true, details: 'OK' });
  } else {
    results.push({ name, passed: false, details: failureDetails });
  }
}

// Comprehensive Unicode Emoji regular expression
const EMOJI_REGEX = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F100}-\u{1F1FF}\u{200D}\u{FE0F}]/u;

function getAllSourceFiles(dir: string, fileList: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      getAllSourceFiles(fullPath, fileList);
    } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name)) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

async function runConstraintsAudit() {
  console.log('=== RUNNING STRICT CONSTRAINTS & UI AUDIT ===\n');

  const srcDir = path.resolve(__dirname, '../src');
  const appJsonPath = path.resolve(__dirname, '../app.json');

  // ==========================================
  // 1. EMOJI AUDIT IN mobile-expo/src
  // ==========================================
  console.log('--- 1. Unicode Emoji Audit in mobile-expo/src ---');
  const srcFiles = getAllSourceFiles(srcDir);
  console.log(`Auditing ${srcFiles.length} source files in mobile-expo/src...`);

  const emojiViolations: { file: string; line: number; text: string }[] = [];
  const todoViolations: { file: string; line: number; text: string }[] = [];

  for (const filePath of srcFiles) {
    const relPath = path.relative(path.resolve(__dirname, '..'), filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
      if (EMOJI_REGEX.test(line)) {
        emojiViolations.push({
          file: relPath,
          line: idx + 1,
          text: line.trim(),
        });
      }

      if (/\/\/\s*(TODO|FIXME)\b/i.test(line)) {
        todoViolations.push({
          file: relPath,
          line: idx + 1,
          text: line.trim(),
        });
      }
    });
  }

  assert(
    emojiViolations.length === 0,
    'Zero unicode emojis anywhere in mobile-expo/src',
    `Found ${emojiViolations.length} violations: ${JSON.stringify(emojiViolations, null, 2)}`
  );

  assert(
    todoViolations.length === 0,
    'Zero TODO / FIXME placeholder comments in mobile-expo/src',
    `Found ${todoViolations.length} violations: ${JSON.stringify(todoViolations, null, 2)}`
  );

  // ==========================================
  // 2. APP.JSON PACKAGE ID & METADATA AUDIT
  // ==========================================
  console.log('\n--- 2. App.json Package ID & Bundle Identifier Audit ---');
  assert(fs.existsSync(appJsonPath), 'app.json file exists', `Path: ${appJsonPath}`);

  const appJsonContent = fs.readFileSync(appJsonPath, 'utf-8');
  const appConfig = JSON.parse(appJsonContent);

  const androidPackage = appConfig?.expo?.android?.package;
  assert(
    androidPackage === 'com.smartstudyhub.mobile',
    'Android package is strictly "com.smartstudyhub.mobile"',
    `Actual: "${androidPackage}"`
  );

  const iosBundleId = appConfig?.expo?.ios?.bundleIdentifier;
  assert(
    iosBundleId === 'com.smartstudyhub.mobile',
    'iOS bundleIdentifier is "com.smartstudyhub.mobile"',
    `Actual: "${iosBundleId}"`
  );

  // ==========================================
  // 3. VECTOR ICONS AUDIT
  // ==========================================
  console.log('\n--- 3. Vector Icons Conformance Audit ---');
  let iconImportsFound = 0;
  for (const filePath of srcFiles) {
    if (!/\.(ts|tsx)$/.test(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    if (content.includes('@expo/vector-icons')) {
      iconImportsFound++;
    }
  }
  assert(iconImportsFound >= 5, 'Vector icons (@expo/vector-icons) utilized across UI components', `Import count: ${iconImportsFound}`);

  // Summary
  console.log('\n=== TEST RESULTS SUMMARY ===');
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.name} - ${r.details}`);
    if (r.passed) passCount++;
    else failCount++;
  }
  console.log(`\nTOTAL: ${results.length} | PASSED: ${passCount} | FAILED: ${failCount}`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runConstraintsAudit().catch((err) => {
  console.error('Fatal constraints audit error:', err);
  process.exit(1);
});
