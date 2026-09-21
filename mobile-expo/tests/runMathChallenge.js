const ts = require('typescript');
const fs = require('fs');
const path = require('path');

// Hook .ts extension using TypeScript transpileModule
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

// Run the test suite
try {
  require('./mathLogicChallenge.test.ts');
} catch (err) {
  console.error('Test execution error:', err);
  process.exit(1);
}
