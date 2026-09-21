const ts = require('typescript');
const fs = require('fs');

require.extensions['.ts'] = function (module, filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const result = ts.transpileModule(content, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  });
  module._compile(result.outputText, filename);
};

try {
  require('./adversarialStressHarness.ts');
} catch (err) {
  console.error('Adversarial execution error:', err);
  process.exit(1);
}
