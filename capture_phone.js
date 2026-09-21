const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const adb = "C:\\Users\\samsu\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Google.PlatformTools_Microsoft.Winget.Source_8wekyb3d8bbwe\\platform-tools\\adb.exe";
const target = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, 'phone_screen.png');

try {
  const buf = execSync(`"${adb}" exec-out screencap -p`, { maxBuffer: 50 * 1024 * 1024 });
  fs.writeFileSync(target, buf);
  console.log('SUCCESS: Saved ' + buf.length + ' bytes to ' + target);
} catch (e) {
  console.error('ERROR capturing screen:', e.message);
  process.exit(1);
}
