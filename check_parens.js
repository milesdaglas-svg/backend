const fs = require('fs');
const content = fs.readFileSync('./public/terminal.js', 'utf8');
const lines = content.split('\n');

let open = 0;

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
      if (open < 0) {
        console.log(`Line ${i+1}: Too many closing parens`);
        console.log(line);
        process.exit(1);
      }
    }
  }
}

console.log('Final open count:', open);
if (open > 0) {
  console.log('Missing', open, 'closing paren(s)');
  // Find the last opening paren
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    let inStr = false, inTpl = false, strChar = '';
    let lineOpen = 0;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (!inStr && c === '`') inTpl = !inTpl;
      if (!inTpl && (c === '"' || c === "'")) {
        if (inStr && c === strChar) inStr = false;
        else if (!inStr) { inStr = true; strChar = c; }
      }
      if (!inStr && !inTpl) {
        if (c === '(') lineOpen++;
        else if (c === ')') lineOpen--;
      }
    }
    if (lineOpen > 0) {
      console.log('Last unclosed paren likely on line', i+1, ':', line.trim());
      break;
    }
  }
}
