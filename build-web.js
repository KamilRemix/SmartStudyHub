const fs = require('fs');
const path = require('path');

// 1. Load .env
let apiKey = '';
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    const match = envContent.match(/REACT_APP_GEMINI_API_KEY\s*=\s*(.*)/);
    if (match && match[1]) {
        apiKey = match[1].replace(/[\r\n\s'"]/g, '');
    }
}

apiKey = process.env.REACT_APP_GEMINI_API_KEY || apiKey || '';

if (!apiKey) {
    console.warn('⚠️ Warning: REACT_APP_GEMINI_API_KEY not found. Proceeding with static web build.');
}

// 2. Create/clean dist directory
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// 3. Copy all files from public/ to dist/
const publicDir = path.join(__dirname, 'public');
function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (let entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}
copyDir(publicDir, distDir);

// 4. Modify dist/ai-assistant.js to embed the API key
const aiAssistantPath = path.join(distDir, 'ai-assistant.js');
if (fs.existsSync(aiAssistantPath)) {
    let content = fs.readFileSync(aiAssistantPath, 'utf8');
    
    // Replace process.env.REACT_APP_GEMINI_API_KEY with the hardcoded string
    const target = 'process.env.REACT_APP_GEMINI_API_KEY';
    if (content.includes(target)) {
        content = content.replace(target, `'${apiKey}'`);
        fs.writeFileSync(aiAssistantPath, content, 'utf8');
        console.log('✅ Statically injected REACT_APP_GEMINI_API_KEY into dist/ai-assistant.js');
    } else {
        console.warn('⚠️ Warning: process.env.REACT_APP_GEMINI_API_KEY placeholder not found in ai-assistant.js');
    }
} else {
    console.error('❌ Error: dist/ai-assistant.js not found');
    process.exit(1);
}

console.log('🎉 Web build completed successfully! Output is in the /dist folder.');
