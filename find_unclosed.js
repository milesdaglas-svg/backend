const fs = require('fs');
const content = fs.readFileSync('./public/terminal.js', 'utf8');
const lines = content.split('\n');

const stack = [];
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
      if (c === '(') {
        stack.push({line: i+1, col: j, char: '('});
        open++;
      }
      if (c === ')') {
        if (stack.length > 0) stack.pop();
        else console.log(`Line ${i+1}: Extra closing paren`);
        open--;
      }
    }
  }
}

console.log('Unclosed parens:', stack.length);
stack.slice(0, 5).forEach(s => {
  const lineContent = lines[s.line-1].trim().substring(0, 60);
  console.log(`  Line ${s.line}, col ${s.col}: ${lineContent}...`);
});
