const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\mithil\\.gemini\\antigravity-ide\\brain\\d5ef6920-c0e0-4a3b-ad06-9f83a48b037f\\.system_generated\\tasks\\task-107.log';

if (fs.existsSync(logPath)) {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Total log lines: ${lines.length}`);
  const matchingLines = lines.filter(line => line.includes('/institutions') || line.includes('Institution'));
  console.log('--- MATCHING LINES FOR INSTITUTIONS ---');
  console.log(matchingLines.slice(-30).join('\n'));
} else {
  console.log('Backend log not found at path:', logPath);
}
