const fs = require('fs');
const content = fs.readFileSync('./public/terminal.js', 'utf8');
const lines = content.split('\n');

let open = 0;
let prev = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let inStr = false;
  let inTpl = false;
  let strChar = '';
  let escape = false;
  
  for (let j = 0; j < line.length; j++) {
    const c = line[j];
    
    if (escape) { escape = false; continue; }
    if (c === '\\' && inStr) { escape = true; continue; }
    
    if (!inStr && c === '`') { inTpl = !inTpl; continue; }
    
    if (!inTpl && (c === '"' || c === "'")) {
      if (inStr && c === strChar) inStr = false;
      else if (!inStr) { inStr = true; strChar = c; }
      continue;
    }
    
    if (!inStr && !inTpl) {
      if (c === '(') open++;
      if (c === ')') open--;
    }
  }
  
  if (open !== prev) {
    console.log(`Line ${String(i+1).padStart(3)}: Balance=${String(open).padStart(2)} ${open > prev ? '+' : ''}  ${line.trim().substring(0, 70)}`);
    prev = open;
  }
}

console.log('\nFinal balance:', open);
