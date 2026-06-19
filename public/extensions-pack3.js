/* =========================================
   EXTENSION PACK 3 — PRODUCTIVITY TOOLS
   Tools that work on editor content
========================================= */

const EXT_TOOLS = {

  "tool-sort-lines": {
    name: "Sort Lines",
    icon: "↕",
    desc: "Sort selected lines alphabetically or by length.",
    longDesc: "Sorts the selected lines (or whole file) alphabetically A-Z, Z-A, by length shortest first, or by length longest first.",
    howTo: "Select lines to sort (or nothing for whole file), click Open, choose sort order.",
    example: "banana\napple\ncherry\n→\napple\nbanana\ncherry",
    publisher: "vscodegodmode"
  },
  "tool-remove-dupes": {
    name: "Remove Duplicate Lines",
    icon: "🧹",
    desc: "Remove duplicate lines from selected text or whole file.",
    longDesc: "Scans all lines and removes exact duplicates, keeping the first occurrence of each unique line.",
    howTo: "Select text or leave nothing selected for whole file, click Open.",
    example: "apple\nbanana\napple\n→\napple\nbanana",
    publisher: "vscodegodmode"
  },
  "tool-word-count": {
    name: "Word Counter",
    icon: "🔢",
    desc: "Count words, characters, lines, and sentences.",
    longDesc: "Analyzes selected text (or whole file) and shows word count, character count, line count, sentence count, and reading time estimate.",
    howTo: "Select text (or nothing for whole file), click Open.",
    example: "Words: 42 | Chars: 280 | Lines: 8 | Reading time: ~1 min",
    publisher: "vscodegodmode"
  },
  "tool-indent-fix": {
    name: "Indentation Fixer",
    icon: "⇥",
    desc: "Convert tabs to spaces or spaces to tabs.",
    longDesc: "Converts all tab characters to 2 or 4 spaces, or converts leading spaces back to tabs for consistent indentation.",
    howTo: "Select code (or nothing for whole file), click Open, choose conversion.",
    example: "\\t\\tcode → '    code' (4 spaces)",
    publisher: "vscodegodmode"
  },
  "tool-line-numbers": {
    name: "Add Line Numbers",
    icon: "🔢",
    desc: "Prefix each line with its line number.",
    longDesc: "Prepends a line number to each line — useful for sharing code snippets with references or debugging output.",
    howTo: "Select text, click Open.",
    example: "hello\nworld\n→\n1. hello\n2. world",
    publisher: "vscodegodmode"
  },
  "tool-trim-lines": {
    name: "Trim Whitespace",
    icon: "✂",
    desc: "Remove leading/trailing whitespace from all lines.",
    longDesc: "Strips leading and trailing whitespace from every line, and optionally removes blank lines entirely.",
    howTo: "Select text or nothing for whole file, click Open.",
    example: "'  hello  '\n→\n'hello'",
    publisher: "vscodegodmode"
  },
  "tool-reverse-lines": {
    name: "Reverse Lines",
    icon: "🔃",
    desc: "Reverse the order of lines in selected text.",
    longDesc: "Flips the order of all selected lines — last line becomes first, first becomes last.",
    howTo: "Select lines, click Open.",
    example: "line1\nline2\nline3\n→\nline3\nline2\nline1",
    publisher: "vscodegodmode"
  },
  "tool-wrap-lines": {
    name: "Wrap/Unwrap Lines",
    icon: "↩",
    desc: "Wrap lines at 80 chars or join wrapped lines.",
    longDesc: "Wraps long lines at 80 characters by inserting newlines, or joins broken lines back into single long lines.",
    howTo: "Select text, click Open, choose Wrap or Unwrap.",
    example: "long line...\n→\nlong line up\nto 80 chars",
    publisher: "vscodegodmode"
  },
  "tool-extract-links": {
    name: "Extract URLs",
    icon: "🔗",
    desc: "Extract all URLs from selected text.",
    longDesc: "Finds and lists all http/https URLs in the selected text or file, one per line.",
    howTo: "Select text containing URLs, click Open.",
    example: "See https://example.com and https://google.com\n→\nhttps://example.com\nhttps://google.com",
    publisher: "vscodegodmode"
  },
  "tool-extract-emails": {
    name: "Extract Emails",
    icon: "📧",
    desc: "Extract all email addresses from selected text.",
    longDesc: "Finds all valid email addresses in the selected text and lists them one per line.",
    howTo: "Select text containing emails, click Open.",
    example: "Contact john@a.com or jane@b.com\n→\njohn@a.com\njane@b.com",
    publisher: "vscodegodmode"
  },
  "tool-count-chars": {
    name: "Character Frequency",
    icon: "📊",
    desc: "Count how many times each character appears.",
    longDesc: "Analyzes the selected text and shows a sorted list of characters by frequency — useful for cryptography, data analysis, and debugging.",
    howTo: "Select text, click Open.",
    example: "hello\n→\nl: 2\ne: 1\nh: 1\no: 1",
    publisher: "vscodegodmode"
  },
  "tool-prefix-suffix": {
    name: "Add Prefix / Suffix",
    icon: "✏",
    desc: "Add text before or after each line.",
    longDesc: "Prepends or appends a string to every line in the selection — useful for adding list markers, comment characters, or quotes.",
    howTo: "Select lines, click Open, choose prefix or suffix type.",
    example: "line1\nline2\n→ (prefix '- ')\n- line1\n- line2",
    publisher: "vscodegodmode"
  },
  "tool-filter-lines": {
    name: "Filter Lines",
    icon: "🔎",
    desc: "Keep only lines that match (or don't match) a pattern.",
    longDesc: "Like grep — filters the selected lines to keep only those containing a search string, or removes all lines that contain it.",
    howTo: "Select text, click Open, enter pattern, choose Keep or Remove.",
    example: "apple\nbanana\napricot\n(keep 'ap')\n→\napple\napricot",
    publisher: "vscodegodmode"
  },
  "tool-join-lines": {
    name: "Join Lines",
    icon: "⬆",
    desc: "Join all selected lines into one line.",
    longDesc: "Merges all selected lines into a single line, separated by a space, comma, or custom separator.",
    howTo: "Select lines, click Open, choose separator.",
    example: "apple\nbanana\ncherry\n→ apple, banana, cherry",
    publisher: "vscodegodmode"
  },
  "tool-split-lines": {
    name: "Split to Lines",
    icon: "⬇",
    desc: "Split a comma or space-separated list into lines.",
    longDesc: "Takes a comma-separated, space-separated, or pipe-separated list and puts each item on its own line.",
    howTo: "Select a delimited list, click Open, choose delimiter.",
    example: "apple, banana, cherry\n→\napple\nbanana\ncherry",
    publisher: "vscodegodmode"
  },
  "tool-shuffle-lines": {
    name: "Shuffle Lines",
    icon: "🔀",
    desc: "Randomly shuffle the order of selected lines.",
    longDesc: "Randomly rearranges the selected lines using Fisher-Yates shuffle — useful for randomizing lists or test data.",
    howTo: "Select lines, click Open.",
    example: "a\nb\nc\n→ c\na\nb (random)",
    publisher: "vscodegodmode"
  },
  "tool-to-list": {
    name: "Convert to List",
    icon: "📋",
    desc: "Convert lines to HTML ul/ol list or Markdown list.",
    longDesc: "Takes selected lines and wraps them in HTML unordered list, ordered list, or Markdown bullet/numbered list.",
    howTo: "Select lines, click Open, choose list format.",
    example: "apple\nbanana\n→\n<ul>\n  <li>apple</li>\n  <li>banana</li>\n</ul>",
    publisher: "vscodegodmode"
  },
  "tool-json-to-code": {
    name: "JSON to Code Variables",
    icon: "💻",
    desc: "Convert JSON keys to JS/Python/PHP variable declarations.",
    longDesc: "Takes a JSON object and generates const/let declarations (JS), variable assignments (Python), or $var assignments (PHP) for each key.",
    howTo: "Select a JSON object, click Open, choose language.",
    example: '{"name":"John","age":30}\n→\nconst name = "John";\nconst age = 30;',
    publisher: "vscodegodmode"
  },
  "tool-smart-quotes": {
    name: "Smart Quotes",
    icon: "\"",
    desc: "Convert straight quotes to curly/smart quotes and back.",
    longDesc: "Replaces straight single and double quotes with typographic curly quotes, or converts them back to plain ASCII quotes.",
    howTo: "Select text, click Open, choose direction.",
    example: '"hello" → \u201chello\u201d',
    publisher: "vscodegodmode"
  },
  "tool-diff-lines": {
    name: "Compare Two Blocks",
    icon: "⚡",
    desc: "Find lines that differ between two text blocks.",
    longDesc: "Split your selection with a '---' separator between two blocks. The tool finds lines unique to each block.",
    howTo: "Type or paste Block A, then ---, then Block B. Select all, click Open.",
    example: "apple\nbanana\n---\nbanana\ncherry\n→ Only in A: apple\nOnly in B: cherry",
    publisher: "vscodegodmode"
  }

};

/* ══════════════════════
   TOOL ACTIONS
══════════════════════ */
const TOOL_ACTIONS = {

  "tool-sort-lines": [
    { label: "A → Z", fn: t => t.split("\n").sort((a,b)=>a.localeCompare(b)).join("\n") },
    { label: "Z → A", fn: t => t.split("\n").sort((a,b)=>b.localeCompare(a)).join("\n") },
    { label: "Shortest first", fn: t => t.split("\n").sort((a,b)=>a.length-b.length).join("\n") },
    { label: "Longest first", fn: t => t.split("\n").sort((a,b)=>b.length-a.length).join("\n") },
    { label: "Random shuffle", fn: t => { const l=t.split("\n"); for(let i=l.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[l[i],l[j]]=[l[j],l[i]];} return l.join("\n"); } }
  ],
  "tool-remove-dupes": [
    { label: "Remove duplicate lines", fn: t => [...new Set(t.split("\n"))].join("\n") },
    { label: "Remove duplicate lines (case-insensitive)", fn: t => { const seen=new Set(); return t.split("\n").filter(l=>{const k=l.toLowerCase(); if(seen.has(k))return false; seen.add(k); return true;}).join("\n"); } }
  ],
  "tool-word-count": [
    { label: "Count words & stats", fn: t => {
      const words = t.trim().split(/\s+/).filter(Boolean).length;
      const chars = t.length;
      const charsNoSpace = t.replace(/\s/g,"").length;
      const lines = t.split("\n").length;
      const sentences = (t.match(/[.!?]+/g)||[]).length;
      const readTime = Math.max(1,Math.ceil(words/200));
      return `// Word Count Results\nWords:              ${words}\nCharacters:         ${chars}\nChars (no spaces):  ${charsNoSpace}\nLines:              ${lines}\nSentences:          ${sentences}\nReading time:       ~${readTime} min`;
    }}
  ],
  "tool-indent-fix": [
    { label: "Tabs → 2 spaces", fn: t => t.replace(/\t/g,"  ") },
    { label: "Tabs → 4 spaces", fn: t => t.replace(/\t/g,"    ") },
    { label: "2 spaces → tabs", fn: t => t.replace(/^(  )+/gm, m => "\t".repeat(m.length/2)) },
    { label: "4 spaces → tabs", fn: t => t.replace(/^(    )+/gm, m => "\t".repeat(m.length/4)) }
  ],
  "tool-line-numbers": [
    { label: "Add line numbers (1. 2. 3.)", fn: t => t.split("\n").map((l,i)=>`${i+1}. ${l}`).join("\n") },
    { label: "Add line numbers (padded)", fn: t => { const lines=t.split("\n"); const pad=String(lines.length).length; return lines.map((l,i)=>String(i+1).padStart(pad," ")+": "+l).join("\n"); } }
  ],
  "tool-trim-lines": [
    { label: "Trim each line", fn: t => t.split("\n").map(l=>l.trim()).join("\n") },
    { label: "Trim + remove blank lines", fn: t => t.split("\n").map(l=>l.trim()).filter(Boolean).join("\n") },
    { label: "Trim trailing whitespace only", fn: t => t.split("\n").map(l=>l.trimEnd()).join("\n") }
  ],
  "tool-reverse-lines": [
    { label: "Reverse line order", fn: t => t.split("\n").reverse().join("\n") },
    { label: "Reverse each line's characters", fn: t => t.split("\n").map(l=>[...l].reverse().join("")).join("\n") }
  ],
  "tool-wrap-lines": [
    { label: "Wrap at 80 chars", fn: t => wrapText(t, 80) },
    { label: "Wrap at 120 chars", fn: t => wrapText(t, 120) },
    { label: "Unwrap (join wrapped lines)", fn: t => t.replace(/([^\n])\n([^\n])/g,"$1 $2") }
  ],
  "tool-extract-links": [
    { label: "Extract all URLs", fn: t => { const m=t.match(/https?:\/\/[^\s"'<>)]+/g); return m?[...new Set(m)].join("\n"):"// No URLs found"; } }
  ],
  "tool-extract-emails": [
    { label: "Extract all emails", fn: t => { const m=t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g); return m?[...new Set(m)].join("\n"):"// No emails found"; } }
  ],
  "tool-count-chars": [
    { label: "Character frequency", fn: t => {
      const freq={};
      [...t].forEach(c=>{ if(c!==" "&&c!=="\n"&&c!=="\t") freq[c]=(freq[c]||0)+1; });
      return Object.entries(freq).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`'${c}': ${n}`).join("\n");
    }}
  ],
  "tool-prefix-suffix": [
    { label: "Add '- ' prefix (bullet list)", fn: t => t.split("\n").map(l=>l?"- "+l:l).join("\n") },
    { label: "Add '// ' prefix (comment)", fn: t => t.split("\n").map(l=>"// "+l).join("\n") },
    { label: "Add '> ' prefix (blockquote)", fn: t => t.split("\n").map(l=>"> "+l).join("\n") },
    { label: "Wrap each line in quotes", fn: t => t.split("\n").map(l=>`"${l}"`).join("\n") },
    { label: "Add comma suffix", fn: t => t.split("\n").map((l,i,a)=>i<a.length-1?l+",":l).join("\n") }
  ],
  "tool-filter-lines": [
    { label: "Keep lines containing...", fn: t => { const kw=prompt("Keep lines containing:",""); return kw===null?t:t.split("\n").filter(l=>l.includes(kw)).join("\n"); } },
    { label: "Remove lines containing...", fn: t => { const kw=prompt("Remove lines containing:",""); return kw===null?t:t.split("\n").filter(l=>!l.includes(kw)).join("\n"); } },
    { label: "Keep non-empty lines", fn: t => t.split("\n").filter(l=>l.trim()).join("\n") }
  ],
  "tool-join-lines": [
    { label: "Join with space", fn: t => t.split("\n").filter(l=>l.trim()).join(" ") },
    { label: "Join with comma", fn: t => t.split("\n").filter(l=>l.trim()).join(", ") },
    { label: "Join with pipe |", fn: t => t.split("\n").filter(l=>l.trim()).join(" | ") },
    { label: "Join with newline (remove blanks)", fn: t => t.split("\n").filter(l=>l.trim()).join("\n") }
  ],
  "tool-split-lines": [
    { label: "Split by comma", fn: t => t.split(",").map(s=>s.trim()).join("\n") },
    { label: "Split by semicolon", fn: t => t.split(";").map(s=>s.trim()).join("\n") },
    { label: "Split by pipe", fn: t => t.split("|").map(s=>s.trim()).join("\n") },
    { label: "Split by space", fn: t => t.split(/\s+/).filter(Boolean).join("\n") }
  ],
  "tool-shuffle-lines": [
    { label: "Shuffle lines randomly", fn: t => { const l=t.split("\n"); for(let i=l.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[l[i],l[j]]=[l[j],l[i]];} return l.join("\n"); } }
  ],
  "tool-to-list": [
    { label: "HTML unordered list", fn: t => "<ul>\n"+t.split("\n").filter(l=>l.trim()).map(l=>`  <li>${l.trim()}</li>`).join("\n")+"\n</ul>" },
    { label: "HTML ordered list", fn: t => "<ol>\n"+t.split("\n").filter(l=>l.trim()).map(l=>`  <li>${l.trim()}</li>`).join("\n")+"\n</ol>" },
    { label: "Markdown bullet list", fn: t => t.split("\n").filter(l=>l.trim()).map(l=>`- ${l.trim()}`).join("\n") },
    { label: "Markdown numbered list", fn: t => t.split("\n").filter(l=>l.trim()).map((l,i)=>`${i+1}. ${l.trim()}`).join("\n") }
  ],
  "tool-json-to-code": [
    { label: "→ JavaScript (const)", fn: t => { const o=JSON.parse(t); return Object.entries(o).map(([k,v])=>`const ${k} = ${JSON.stringify(v)};`).join("\n"); } },
    { label: "→ Python variables", fn: t => { const o=JSON.parse(t); return Object.entries(o).map(([k,v])=>`${k} = ${JSON.stringify(v)}`).join("\n"); } },
    { label: "→ PHP variables", fn: t => { const o=JSON.parse(t); return Object.entries(o).map(([k,v])=>`$${k} = ${JSON.stringify(v)};`).join("\n"); } },
    { label: "→ CSS variables", fn: t => { const o=JSON.parse(t); return ":root {\n"+Object.entries(o).map(([k,v])=>`  --${k}: ${v};`).join("\n")+"\n}"; } }
  ],
  "tool-smart-quotes": [
    { label: "Straight → Smart quotes", fn: t => t.replace(/"([^"]*)"/g,'\u201c$1\u201d').replace(/'([^']*)'/g,"\u2018$1\u2019") },
    { label: "Smart → Straight quotes", fn: t => t.replace(/[\u201c\u201d]/g,'"').replace(/[\u2018\u2019]/g,"'") }
  ],
  "tool-diff-lines": [
    { label: "Compare two blocks", fn: t => {
      const parts = t.split(/^---$/m);
      if (parts.length < 2) return "// Error: separate two blocks with a line containing only '---'";
      const a = new Set(parts[0].trim().split("\n").filter(Boolean));
      const b = new Set(parts[1].trim().split("\n").filter(Boolean));
      const onlyA = [...a].filter(l=>!b.has(l));
      const onlyB = [...b].filter(l=>!a.has(l));
      const common = [...a].filter(l=>b.has(l));
      return `// Only in Block A (${onlyA.length}):\n${onlyA.join("\n")||"(none)"}\n\n// Only in Block B (${onlyB.length}):\n${onlyB.join("\n")||"(none)"}\n\n// Common (${common.length}):\n${common.join("\n")||"(none)"}`;
    }}
  ]

};

/* ── helpers ── */
function wrapText(text, width) {
  return text.split("\n").map(line => {
    if (line.length <= width) return line;
    const words = line.split(" ");
    let result = "", current = "";
    words.forEach(word => {
      if ((current+" "+word).trim().length > width) { result += (result?"\n":"")+current; current = word; }
      else current = (current+" "+word).trim();
    });
    return result + (result?"\n":"") + current;
  }).join("\n");
}

/* ══════════════════════
   RUNNER
══════════════════════ */
function runToolAction(id) {
  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  if (!ed) { showToast("No active editor", "error"); return; }
  const { text, sel } = getSelectedTextOrAll(ed);

  const actions = TOOL_ACTIONS[id];
  if (!actions) { showToast("Tool not implemented", "error"); return; }

  if (actions.length === 1) {
    try {
      const result = actions[0].fn(text);
      if (result !== null && result !== undefined) { replaceEditorText(ed, sel, String(result)); showToast("Done ✓", "success"); }
    } catch(e) { showToast("Error: "+e.message, "error"); }
    return;
  }

  document.getElementById("extDetailOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "extDetailOverlay";
  overlay.innerHTML = `
    <div class="ext-detail-overlay" onclick="document.getElementById('extDetailOverlay').remove()"></div>
    <div class="ext-detail-modal" style="width:300px;">
      <div class="ext-detail-header">
        <div class="ext-detail-icon">${EXT_TOOLS[id]?.icon||"⚡"}</div>
        <div class="ext-detail-title">${EXT_TOOLS[id]?.name||id}</div>
        <button class="ext-detail-close" onclick="document.getElementById('extDetailOverlay').remove()">✕</button>
      </div>
      <div class="ext-detail-body" style="display:flex;flex-direction:column;gap:8px;max-height:300px;overflow-y:auto;">
        ${actions.map((a,i)=>`<button class="ext-btn ext-btn-primary" style="width:100%;" onclick="runToolActionItem('${id}',${i})">${a.label}</button>`).join("")}
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function runToolActionItem(id, idx) {
  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  const { text, sel } = getSelectedTextOrAll(ed);
  const action = TOOL_ACTIONS[id][idx];
  document.getElementById("extDetailOverlay")?.remove();
  try {
    const result = action.fn(text);
    if (result !== null && result !== undefined) {
      replaceEditorText(ed, sel, String(result));
      showToast(action.label + " ✓", "success");
    }
  } catch(e) { showToast("Error: "+e.message, "error"); }
}