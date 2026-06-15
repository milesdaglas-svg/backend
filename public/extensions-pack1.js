/* =========================================
   EXTENSION PACK 1 — FORMATTERS & CONVERTERS
========================================= */

const EXT_FORMATTERS = {

  "fmt-json": {
    name: "JSON Formatter",
    icon: "🔧",
    desc: "Pretty-print or minify JSON in the editor.",
    longDesc: "Formats selected JSON text (or the whole file if nothing is selected) with proper indentation, or minifies it to a single line.",
    howTo: "Select JSON text (or select nothing to use the whole file), then click Open and choose Format or Minify.",
    example: '{"a":1,"b":[1,2,3]}\n→\n{\n  "a": 1,\n  "b": [1, 2, 3]\n}',
    publisher: "vscodegodmode"
  },
  "fmt-base64": {
    name: "Base64 Encode/Decode",
    icon: "🔐",
    desc: "Encode or decode selected text to/from Base64.",
    longDesc: "Takes the selected text and either encodes it to Base64 or decodes a Base64 string back to plain text — replacing the selection in place.",
    howTo: "Select text, click Open, choose Encode or Decode.",
    example: 'Hello World\n→\nSGVsbG8gV29ybGQ=',
    publisher: "vscodegodmode"
  },
  "fmt-url": {
    name: "URL Encode/Decode",
    icon: "🔗",
    desc: "Encode or decode URL-safe strings.",
    longDesc: "Converts selected text using encodeURIComponent/decodeURIComponent — useful for query strings and URL parameters.",
    howTo: "Select text containing spaces/special chars, click Open, choose Encode or Decode.",
    example: 'hello world?\n→\nhello%20world%3F',
    publisher: "vscodegodmode"
  },
  "fmt-htmlentities": {
    name: "HTML Entity Encoder",
    icon: "🔣",
    desc: "Convert special characters to HTML entities and back.",
    longDesc: "Escapes characters like <, >, &, \" into their HTML entity equivalents, or decodes entities back to characters.",
    howTo: "Select text, click Open, choose Encode or Decode.",
    example: '<div>\n→\n&lt;div&gt;',
    publisher: "vscodegodmode"
  },
  "fmt-case": {
    name: "Case Converter",
    icon: "🔤",
    desc: "Convert text between camelCase, snake_case, kebab-case, PascalCase, UPPER, lower.",
    longDesc: "Transforms the selected text into one of several common casing conventions used in programming.",
    howTo: "Select an identifier or phrase, click Open, pick the target case.",
    example: 'hello world\n→ camelCase: helloWorld\n→ snake_case: hello_world\n→ kebab-case: hello-world\n→ PascalCase: HelloWorld',
    publisher: "vscodegodmode"
  },
  "fmt-csvjson": {
    name: "CSV ↔ JSON Converter",
    icon: "📊",
    desc: "Convert CSV data to JSON array, or JSON array to CSV.",
    longDesc: "Parses selected CSV (with header row) into a JSON array of objects, or converts a JSON array of objects into CSV with headers.",
    howTo: "Select CSV or JSON text, click Open, choose the conversion direction.",
    example: 'name,age\nJohn,30\n→\n[{"name":"John","age":"30"}]',
    publisher: "vscodegodmode"
  },
  "fmt-minify-css": {
    name: "CSS Minifier",
    icon: "🗜",
    desc: "Minify CSS by removing whitespace and comments.",
    longDesc: "Strips comments, newlines, and unnecessary whitespace from CSS to reduce file size for production.",
    howTo: "Select CSS code (or whole file), click Open, click Minify.",
    example: 'body {\n  color: red;\n}\n→\nbody{color:red}',
    publisher: "vscodegodmode"
  },
  "fmt-minify-js": {
    name: "JS Minifier (basic)",
    icon: "📦",
    desc: "Basic JavaScript minification — removes comments and extra whitespace.",
    longDesc: "Performs lightweight minification: strips // and /* */ comments and collapses whitespace. Not a full minifier — for production use a proper build tool.",
    howTo: "Select JS code, click Open, click Minify.",
    example: '// comment\nfunction f() {\n  return 1;\n}\n→\nfunction f(){return 1;}',
    publisher: "vscodegodmode"
  },
  "fmt-jwt": {
    name: "JWT Decoder",
    icon: "🪪",
    desc: "Decode a JWT token's header and payload.",
    longDesc: "Splits a JSON Web Token into its header and payload, base64-decodes both, and shows them as formatted JSON (does not verify signature).",
    howTo: "Select a JWT string (xxx.yyy.zzz), click Open, click Decode.",
    example: 'eyJhbGc...→ {\"alg\":\"HS256\"...} + {\"sub\":\"123\"...}',
    publisher: "vscodegodmode"
  },
  "fmt-hash": {
    name: "Hash Generator",
    icon: "#️⃣",
    desc: "Generate SHA-256 hash of selected text.",
    longDesc: "Computes a SHA-256 hex digest of the selected text using the browser's Web Crypto API — useful for checksums or quick comparisons.",
    howTo: "Select text, click Open, click Generate Hash.",
    example: 'hello\n→\n2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824',
    publisher: "vscodegodmode"
  },
  "fmt-color": {
    name: "Color Converter",
    icon: "🎨",
    desc: "Convert colors between HEX, RGB, and HSL.",
    longDesc: "Takes a selected color value in HEX, RGB(), or HSL() format and converts it to the other formats, inserting the result.",
    howTo: "Select a color value like #ff0000 or rgb(255,0,0), click Open, choose target format.",
    example: '#ff0000\n→ rgb(255, 0, 0)\n→ hsl(0, 100%, 50%)',
    publisher: "vscodegodmode"
  },
  "fmt-timestamp": {
    name: "Timestamp Converter",
    icon: "🕐",
    desc: "Convert Unix timestamps to readable dates and back.",
    longDesc: "Converts a selected Unix timestamp (seconds or milliseconds) to a human-readable ISO date string, or converts an ISO date back to a timestamp.",
    howTo: "Select a timestamp or date string, click Open, choose direction.",
    example: '1700000000\n→\n2023-11-14T22:13:20.000Z',
    publisher: "vscodegodmode"
  },
  "fmt-xmljson": {
    name: "XML ↔ JSON Converter",
    icon: "📰",
    desc: "Convert simple XML to JSON and back.",
    longDesc: "Parses basic XML structures into a JSON representation, or converts a JSON object back into XML tags. Best for simple, non-attribute-heavy XML.",
    howTo: "Select XML or JSON text, click Open, choose direction.",
    example: '<a><b>1</b></a>\n→\n{"a":{"b":"1"}}',
    publisher: "vscodegodmode"
  },
  "fmt-markdown-table": {
    name: "Markdown Table Generator",
    icon: "📋",
    desc: "Convert CSV/tab-separated text into a Markdown table.",
    longDesc: "Takes comma or tab separated rows and generates a properly aligned Markdown table with header separators.",
    howTo: "Select CSV/TSV text, click Open, click Generate.",
    example: 'a,b\n1,2\n→\n| a | b |\n|---|---|\n| 1 | 2 |',
    publisher: "vscodegodmode"
  },
  "fmt-slugify": {
    name: "Slugify Text",
    icon: "🐌",
    desc: "Convert text into a URL-friendly slug.",
    longDesc: "Lowercases text, replaces spaces and special characters with hyphens — perfect for URLs, file names, and IDs.",
    howTo: "Select a title or phrase, click Open, click Slugify.",
    example: 'My Blog Post Title!\n→\nmy-blog-post-title',
    publisher: "vscodegodmode"
  },
  "fmt-escape-regex": {
    name: "Regex Escaper",
    icon: ".*",
    desc: "Escape special regex characters in selected text.",
    longDesc: "Adds backslashes before regex special characters (. * + ? ^ $ {} () | [] \\) so the text can be used literally inside a regex pattern.",
    howTo: "Select text containing special characters, click Open, click Escape.",
    example: '1.5 (test)\n→\n1\\.5 \\(test\\)',
    publisher: "vscodegodmode"
  },
  "fmt-number": {
    name: "Number Formatter",
    icon: "🔢",
    desc: "Add thousands separators or convert number bases (binary/hex/decimal).",
    longDesc: "Formats numbers with comma separators, or converts between decimal, binary, octal, and hexadecimal.",
    howTo: "Select a number, click Open, choose formatting or base conversion.",
    example: '1000000 → 1,000,000\n255 → 0xFF (hex) / 11111111 (binary)',
    publisher: "vscodegodmode"
  },
  "fmt-yaml-json": {
    name: "YAML ↔ JSON Converter",
    icon: "📄",
    desc: "Convert simple YAML to JSON and back.",
    longDesc: "Converts basic YAML key-value structures (no anchors/complex types) to JSON, or formats JSON as simple YAML.",
    howTo: "Select YAML or JSON text, click Open, choose direction.",
    example: 'name: John\nage: 30\n→\n{"name":"John","age":30}',
    publisher: "vscodegodmode"
  },
  "fmt-strip-comments": {
    name: "Comment Stripper",
    icon: "✂",
    desc: "Remove all comments from JS/CSS/HTML code.",
    longDesc: "Strips line comments (//), block comments (/* */), and HTML comments (<!-- -->) from selected code based on current file type.",
    howTo: "Select code, click Open, click Strip Comments.",
    example: '/* note */\ncode(); // run\n→\ncode();',
    publisher: "vscodegodmode"
  },
  "fmt-sql-format": {
    name: "SQL Formatter",
    icon: "🗃",
    desc: "Pretty-print SQL queries with line breaks per clause.",
    longDesc: "Reformats a single-line or compact SQL query, placing major clauses (SELECT, FROM, WHERE, JOIN, GROUP BY, ORDER BY) on their own lines for readability.",
    howTo: "Select a SQL query, click Open, click Format.",
    example: 'SELECT a,b FROM t WHERE x=1\n→\nSELECT a, b\nFROM t\nWHERE x=1',
    publisher: "vscodegodmode"
  }

};

/* ══════════════════════
   TOOL EXECUTION
══════════════════════ */
function getSelectedTextOrAll(ed) {
  if (!ed) return { text: "", hasSelection: false, sel: null };
  const sel = ed.getSelection();
  const text = ed.getModel().getValueInRange(sel);
  if (text && text.length) return { text, hasSelection: true, sel };
  return { text: ed.getValue(), hasSelection: false, sel: ed.getModel().getFullModelRange() };
}

function replaceEditorText(ed, sel, newText) {
  ed.executeEdits("ext-tool", [{ range: sel, text: newText, forceMoveMarkers: true }]);
  ed.pushUndoStop();
  ed.focus();
}

/* ── Generic action runner: shows a small choice menu then applies transform ── */
function runFormatterTool(id) {
  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  if (!ed) { showToast("No active editor", "error"); return; }
  const { text, sel } = getSelectedTextOrAll(ed);

  const actions = FORMATTER_ACTIONS[id];
  if (!actions) { showToast("Tool not implemented", "error"); return; }

  if (actions.length === 1) {
    runFormatterAction(ed, sel, text, actions[0]);
    return;
  }

  // show choice menu
  document.getElementById("extDetailOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "extDetailOverlay";
  overlay.innerHTML = `
    <div class="ext-detail-overlay" onclick="document.getElementById('extDetailOverlay').remove()"></div>
    <div class="ext-detail-modal" style="width:300px;">
      <div class="ext-detail-header">
        <div class="ext-detail-icon">${EXT_FORMATTERS[id]?.icon||EXT_GENERATORS?.[id]?.icon||EXT_TOOLS?.[id]?.icon||'🔧'}</div>
        <div class="ext-detail-title">${EXT_FORMATTERS[id]?.name||EXT_GENERATORS?.[id]?.name||EXT_TOOLS?.[id]?.name||id}</div>
        <button class="ext-detail-close" onclick="document.getElementById('extDetailOverlay').remove()">✕</button>
      </div>
      <div class="ext-detail-body" style="display:flex;flex-direction:column;gap:8px;">
        ${actions.map((a,i)=>`<button class="ext-btn ext-btn-primary" style="width:100%;" onclick="runFormatterActionById('${id}',${i})">${a.label}</button>`).join("")}
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function runFormatterActionById(id, idx) {
  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  const { text, sel } = getSelectedTextOrAll(ed);
  const action = FORMATTER_ACTIONS[id][idx];
  document.getElementById("extDetailOverlay")?.remove();
  runFormatterAction(ed, sel, text, action);
}

function runFormatterAction(ed, sel, text, action) {
  try {
    const result = action.fn(text);
    if (result === null || result === undefined) { showToast("Could not process — check input", "error"); return; }
    replaceEditorText(ed, sel, String(result));
    showToast(action.label + " applied ✓", "success");
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

/* ══════════════════════
   ACTION IMPLEMENTATIONS
══════════════════════ */
const FORMATTER_ACTIONS = {

  "fmt-json": [
    { label: "Format / Pretty Print", fn: t => JSON.stringify(JSON.parse(t), null, 2) },
    { label: "Minify", fn: t => JSON.stringify(JSON.parse(t)) }
  ],
  "fmt-base64": [
    { label: "Encode to Base64", fn: t => btoa(unescape(encodeURIComponent(t))) },
    { label: "Decode from Base64", fn: t => decodeURIComponent(escape(atob(t.trim()))) }
  ],
  "fmt-url": [
    { label: "URL Encode", fn: t => encodeURIComponent(t) },
    { label: "URL Decode", fn: t => decodeURIComponent(t) }
  ],
  "fmt-htmlentities": [
    { label: "Encode Entities", fn: t => t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;") },
    { label: "Decode Entities", fn: t => t.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'") }
  ],
  "fmt-case": [
    { label: "camelCase", fn: t => toWords(t).map((w,i)=>i===0?w.toLowerCase():capitalize(w)).join("") },
    { label: "snake_case", fn: t => toWords(t).map(w=>w.toLowerCase()).join("_") },
    { label: "kebab-case", fn: t => toWords(t).map(w=>w.toLowerCase()).join("-") },
    { label: "PascalCase", fn: t => toWords(t).map(w=>capitalize(w)).join("") },
    { label: "UPPER CASE", fn: t => t.toUpperCase() },
    { label: "lower case", fn: t => t.toLowerCase() }
  ],
  "fmt-csvjson": [
    { label: "CSV → JSON", fn: csvToJson },
    { label: "JSON → CSV", fn: jsonToCsv }
  ],
  "fmt-minify-css": [
    { label: "Minify CSS", fn: t => t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/\s+/g," ").replace(/\s*([{}:;,])\s*/g,"$1").replace(/;}/g,"}").trim() }
  ],
  "fmt-minify-js": [
    { label: "Minify JS (basic)", fn: t => t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:])\/\/.*$/gm,"$1").replace(/\n\s*/g,"\n").replace(/\n+/g,"\n").trim() }
  ],
  "fmt-jwt": [
    { label: "Decode JWT", fn: decodeJwt }
  ],
  "fmt-hash": [
    { label: "Generate SHA-256", fn: null } // async, handled specially below
  ],
  "fmt-color": [
    { label: "HEX → RGB", fn: hexToRgb },
    { label: "RGB → HEX", fn: rgbToHex },
    { label: "HEX → HSL", fn: t => rgbToHsl(hexToRgb(t)) }
  ],
  "fmt-timestamp": [
    { label: "Timestamp → Date", fn: t => { const n=parseInt(t.trim()); const ms = n < 1e12 ? n*1000 : n; return new Date(ms).toISOString(); } },
    { label: "Date → Timestamp", fn: t => String(Math.floor(new Date(t.trim()).getTime()/1000)) }
  ],
  "fmt-xmljson": [
    { label: "XML → JSON", fn: xmlToJson },
    { label: "JSON → XML", fn: t => jsonToXml(JSON.parse(t)) }
  ],
  "fmt-markdown-table": [
    { label: "Generate Markdown Table", fn: textToMarkdownTable }
  ],
  "fmt-slugify": [
    { label: "Slugify", fn: t => t.toLowerCase().trim().replace(/[^a-z0-9\s-]/g,"").replace(/\s+/g,"-").replace(/-+/g,"-") }
  ],
  "fmt-escape-regex": [
    { label: "Escape Regex", fn: t => t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&") }
  ],
  "fmt-number": [
    { label: "Add Thousands Separators", fn: t => Number(t.trim()).toLocaleString() },
    { label: "Decimal → Hex", fn: t => "0x"+Number(t.trim()).toString(16).toUpperCase() },
    { label: "Decimal → Binary", fn: t => Number(t.trim()).toString(2) },
    { label: "Hex → Decimal", fn: t => String(parseInt(t.trim().replace(/^0x/i,""),16)) }
  ],
  "fmt-yaml-json": [
    { label: "YAML → JSON", fn: yamlToJson },
    { label: "JSON → YAML", fn: jsonToYaml }
  ],
  "fmt-strip-comments": [
    { label: "Strip Comments", fn: t => t.replace(/\/\*[\s\S]*?\*\//g,"").replace(/(^|[^:])\/\/.*$/gm,"$1").replace(/<!--[\s\S]*?-->/g,"").replace(/\n\s*\n/g,"\n") }
  ],
  "fmt-sql-format": [
    { label: "Format SQL", fn: formatSql }
  ]

};

/* ── helpers ── */
function toWords(s) {
  return s.replace(/([a-z])([A-Z])/g,"$1 $2").replace(/[_\-]+/g," ").trim().split(/\s+/);
}
function capitalize(w) { return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase(); }

function csvToJson(csv) {
  const lines = csv.trim().split("\n").map(l=>l.split(","));
  const headers = lines[0].map(h=>h.trim());
  const rows = lines.slice(1).map(line => {
    const obj = {};
    headers.forEach((h,i)=>obj[h]=(line[i]||"").trim());
    return obj;
  });
  return JSON.stringify(rows, null, 2);
}
function jsonToCsv(json) {
  const arr = JSON.parse(json);
  if (!Array.isArray(arr) || !arr.length) throw new Error("Need a non-empty JSON array");
  const headers = Object.keys(arr[0]);
  const rows = arr.map(o => headers.map(h => o[h]).join(","));
  return headers.join(",") + "\n" + rows.join("\n");
}

function decodeJwt(token) {
  const parts = token.trim().split(".");
  if (parts.length < 2) throw new Error("Not a valid JWT");
  const header = JSON.parse(decodeURIComponent(escape(atob(parts[0].replace(/-/g,"+").replace(/_/g,"/")))));
  const payload = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g,"+").replace(/_/g,"/")))));
  return "HEADER:\n" + JSON.stringify(header,null,2) + "\n\nPAYLOAD:\n" + JSON.stringify(payload,null,2);
}

function hexToRgb(hex) {
  hex = hex.trim().replace("#","");
  if (hex.length === 3) hex = hex.split("").map(c=>c+c).join("");
  const num = parseInt(hex,16);
  return `rgb(${(num>>16)&255}, ${(num>>8)&255}, ${num&255})`;
}
function rgbToHex(rgb) {
  const m = rgb.match(/(\d+)/g);
  if (!m || m.length < 3) throw new Error("Expected rgb(r,g,b)");
  return "#" + m.slice(0,3).map(n=>(+n).toString(16).padStart(2,"0")).join("");
}
function rgbToHsl(rgbStr) {
  const m = rgbStr.match(/(\d+)/g);
  let [r,g,b] = m.map(n=>+n/255);
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if (max===min) { h=s=0; }
  else {
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      case b: h=(r-g)/d+4; break;
    }
    h/=6;
  }
  return `hsl(${Math.round(h*360)}, ${Math.round(s*100)}%, ${Math.round(l*100)}%)`;
}

function xmlToJson(xml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml.trim(), "text/xml");
  function nodeToObj(node) {
    const children = Array.from(node.children);
    if (!children.length) return node.textContent;
    const obj = {};
    children.forEach(c => { obj[c.tagName] = nodeToObj(c); });
    return obj;
  }
  const root = doc.documentElement;
  if (!root || root.tagName === "parsererror") throw new Error("Invalid XML");
  return JSON.stringify({ [root.tagName]: nodeToObj(root) }, null, 2);
}
function jsonToXml(obj, rootTag) {
  function build(o) {
    if (typeof o !== "object" || o===null) return String(o);
    return Object.keys(o).map(k => `<${k}>${build(o[k])}</${k}>`).join("");
  }
  const keys = Object.keys(obj);
  if (keys.length === 1) return `<${keys[0]}>${build(obj[keys[0]])}</${keys[0]}>`;
  return build(obj);
}

function textToMarkdownTable(text) {
  const sep = text.includes("\t") ? "\t" : ",";
  const rows = text.trim().split("\n").map(r=>r.split(sep).map(c=>c.trim()));
  const headers = rows[0];
  let out = "| " + headers.join(" | ") + " |\n";
  out += "|" + headers.map(()=>"---").join("|") + "|\n";
  rows.slice(1).forEach(r => out += "| " + r.join(" | ") + " |\n");
  return out.trim();
}

function yamlToJson(yaml) {
  const obj = {};
  yaml.split("\n").forEach(line => {
    const m = line.match(/^(\s*)([\w-]+):\s*(.*)$/);
    if (m) {
      let val = m[3].trim();
      if (val === "") return;
      if (/^-?\d+(\.\d+)?$/.test(val)) val = Number(val);
      else if (val === "true" || val === "false") val = val === "true";
      else val = val.replace(/^["']|["']$/g,"");
      obj[m[2]] = val;
    }
  });
  return JSON.stringify(obj, null, 2);
}
function jsonToYaml(json) {
  const obj = JSON.parse(json);
  return Object.keys(obj).map(k => `${k}: ${typeof obj[k]==='string'?obj[k]:JSON.stringify(obj[k])}`).join("\n");
}

function formatSql(sql) {
  const keywords = ["SELECT","FROM","WHERE","JOIN","LEFT JOIN","RIGHT JOIN","INNER JOIN","GROUP BY","ORDER BY","HAVING","LIMIT","INSERT INTO","VALUES","UPDATE","SET","DELETE FROM","AND","OR"];
  let formatted = sql.trim().replace(/\s+/g," ");
  keywords.forEach(kw => {
    const re = new RegExp("\\b"+kw.replace(" ","\\s+")+"\\b","gi");
    formatted = formatted.replace(re, "\n"+kw.toUpperCase());
  });
  return formatted.trim();
}

/* ══════════════════════
   ASYNC HASH (special-cased)
══════════════════════ */
async function runHashTool() {
  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  if (!ed) return;
  const { text, sel } = getSelectedTextOrAll(ed);
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    const hex = Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
    replaceEditorText(ed, sel, hex);
    showToast("SHA-256 hash generated ✓", "success");
  } catch(e) { showToast("Error: "+e.message, "error"); }
}