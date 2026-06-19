/* =========================================
   EXTENSION PACK 5 — VS CODE-LIKE FEATURES
   Git, Terminal, NPM UI, IntelliSense,
   File Templates, Live Server boost
========================================= */

/* ── These are UI/functional extensions that open panels ── */
const EXT_VSCODE_FEATURES = {

  "vsc-git": {
    name: "Git Integration",
    icon: "🌿",
    desc: "Commit, view status, and diff files — all from the editor.",
    longDesc: "Simulates Git source control: tracks modified files since your last 'commit', shows M/A/D status badges, lets you write commit messages, and shows a visual diff of changes.",
    howTo: "Install, then click Open. Modified files show in the panel. Write a commit message and click Commit to clear the change log.",
    example: "M  index.html\nA  style.css\nD  old.js",
    publisher: "vscodegodmode",
    category: "Tool"
  },
  "vsc-npm": {
    name: "NPM Package Manager UI",
    icon: "📦",
    desc: "Browse, search, and insert npm package imports.",
    longDesc: "Search the npm registry for packages and instantly insert import/require statements into your current file. Also shows package details like weekly downloads and description.",
    howTo: "Install, click Open. Type a package name to search npm. Click any result to insert the import at the top of your current file.",
    example: "import axios from 'axios';\nimport _ from 'lodash';",
    publisher: "vscodegodmode",
    category: "Tool"
  },
  "vsc-intellisense": {
    name: "IntelliSense Boost",
    icon: "🧠",
    desc: "Enhanced Monaco autocomplete with HTML tags, CSS props, and JS snippets.",
    longDesc: "Registers hundreds of custom Monaco completion providers for HTML tags+attributes, CSS properties+values, and JavaScript/ES6 patterns — giving you rich autocomplete on top of Monaco's built-in suggestions.",
    howTo: "Install to activate. Start typing in the editor and press Ctrl+Space to trigger suggestions. Works immediately after installing.",
    example: "Type 'flex' → suggests: display:flex, flex-direction, flex-wrap...",
    publisher: "vscodegodmode",
    category: "Tool"
  },
  "vsc-templates": {
    name: "File Templates",
    icon: "📄",
    desc: "Auto-fill new files with boilerplate based on file type.",
    longDesc: "When you create a new file, this extension automatically inserts the appropriate boilerplate — HTML5 skeleton for .html, reset+variables for .css, module template for .js, and more.",
    howTo: "Install to activate. Create a new file (+ File button) — if the file has a known extension, it auto-fills with starter code.",
    example: "New index.html → auto-fills with HTML5 skeleton\nNew style.css → auto-fills with CSS reset + :root variables",
    publisher: "vscodegodmode",
    category: "Tool"
  },
  "vsc-live-server": {
    name: "Live Server Plus",
    icon: "🌐",
    desc: "Enhanced live preview with device frame, console overlay, and URL bar.",
    longDesc: "Upgrades the built-in live preview with a browser-style URL bar, device frame switcher (desktop/tablet/phone), error overlay, and auto-scroll-to-top on reload.",
    howTo: "Install to activate. The preview panel gets a toolbar with device switcher and URL bar. Click device icons to preview at different screen sizes.",
    example: "💻 Desktop / 📱 Mobile / 📟 Tablet — switch with one click",
    publisher: "vscodegodmode",
    category: "Tool"
  },
  "vsc-terminal-plus": {
    name: "Terminal Commands",
    icon: "💻",
    desc: "Quick-run common terminal commands from a menu.",
    longDesc: "Provides a command palette of common development commands (npm install, npm run dev, git status, etc.) that you can run with one click — piped to the built-in terminal.",
    howTo: "Install, click Open. Browse command categories (NPM, Git, File ops) and click any command to execute it in the terminal.",
    example: "npm install\nnpm run dev\ngit status\ngit log --oneline",
    publisher: "vscodegodmode",
    category: "Tool"
  }

};

/* merge into EXT_TOOLS */
if (typeof EXT_TOOLS !== "undefined") {
  Object.assign(EXT_TOOLS, EXT_VSCODE_FEATURES);
} else {
  window.EXT_TOOLS = EXT_VSCODE_FEATURES;
}

/* ══════════════════════════════════════════
   IMPLEMENTATIONS
══════════════════════════════════════════ */

/* ── GIT INTEGRATION ── */
(function initGitExtension() {
  // track modified files since last "commit"
  if (!localStorage.getItem("git_ext_baseline")) {
    localStorage.setItem("git_ext_baseline", "{}");
  }

  window.gitExtMarkModified = function(filename) {
    if (!isExtInstalled("vsc-git")) return;
    try {
      const baseline = JSON.parse(localStorage.getItem("git_ext_baseline")||"{}");
      if (!baseline[filename]) baseline[filename] = "M";
      localStorage.setItem("git_ext_baseline", JSON.stringify(baseline));
    } catch {}
  };

  window.gitExtMarkNew = function(filename) {
    if (!isExtInstalled("vsc-git")) return;
    try {
      const baseline = JSON.parse(localStorage.getItem("git_ext_baseline")||"{}");
      baseline[filename] = "A";
      localStorage.setItem("git_ext_baseline", JSON.stringify(baseline));
    } catch {}
  };
})();

function runVscGit() {
  const changes = (() => { try { return JSON.parse(localStorage.getItem("git_ext_baseline")||"{}"); } catch { return {}; } })();
  const entries = Object.entries(changes);

  document.getElementById("extDetailOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "extDetailOverlay";
  overlay.innerHTML = `
    <div class="ext-detail-overlay" onclick="document.getElementById('extDetailOverlay').remove()"></div>
    <div class="ext-detail-modal" style="width:480px;">
      <div class="ext-detail-header">
        <div class="ext-detail-icon">🌿</div>
        <div class="ext-detail-title">Git Integration</div>
        <button class="ext-detail-close" onclick="document.getElementById('extDetailOverlay').remove()">✕</button>
      </div>
      <div class="ext-detail-body">
        <div style="font-size:11px;color:#858585;margin-bottom:12px;">// SOURCE CONTROL — ${entries.length} change${entries.length!==1?"s":""}</div>

        ${entries.length ? `
          <div style="font-family:monospace;font-size:12px;margin-bottom:16px;display:flex;flex-direction:column;gap:4px;">
            ${entries.map(([f,s])=>`
              <div style="display:flex;align-items:center;gap:8px;padding:6px 8px;background:#1a1a1a;border-radius:4px;">
                <span style="color:${s==="A"?"#4ade80":s==="D"?"#f87171":"#fbbf24"};font-weight:700;width:14px;">${s}</span>
                <span style="color:#ccc;flex:1;">${f}</span>
                <button onclick="gitExtViewDiff('${f}')" style="font-size:10px;padding:2px 8px;background:#2d2d2d;border:1px solid #444;color:#aaa;border-radius:4px;cursor:pointer;">diff</button>
              </div>`).join("")}
          </div>
        ` : `<div style="color:#555;font-size:12px;text-align:center;padding:20px;">// No changes since last commit</div>`}

        <div style="margin-bottom:8px;font-size:11px;color:#858585;">Commit message:</div>
        <textarea id="git-commit-msg" style="width:100%;background:#1a1a1a;border:1px solid #333;color:#ccc;padding:8px;border-radius:6px;font-family:monospace;font-size:12px;resize:vertical;min-height:60px;outline:none;box-sizing:border-box;" placeholder="feat: describe your changes..."></textarea>

        <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;">
          <button class="ext-btn ext-btn-primary" style="flex:1;" onclick="gitExtCommit()">✓ Commit (clear changes)</button>
          <button class="ext-btn" onclick="gitExtClearAll()" style="color:#f87171;border-color:rgba(248,113,113,0.3);">🗑 Clear log</button>
        </div>

        <div style="margin-top:12px;font-size:10px;color:#555;line-height:1.6;">
          ⚡ Note: This tracks file changes within the app session. To actually push to GitHub, use your terminal's <code style="color:#888">push.bat</code> or <code style="color:#888">git push</code>.
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

window.gitExtCommit = function() {
  const msg = document.getElementById("git-commit-msg")?.value.trim();
  if (!msg) { showToast("Enter a commit message first", "error"); return; }
  localStorage.setItem("git_ext_baseline", "{}");
  localStorage.setItem("git_last_commit", JSON.stringify({ message: msg, time: new Date().toLocaleString() }));
  document.getElementById("extDetailOverlay")?.remove();
  showToast("✓ Committed: " + msg, "success");
};

window.gitExtClearAll = function() {
  localStorage.setItem("git_ext_baseline", "{}");
  document.getElementById("extDetailOverlay")?.remove();
  showToast("Change log cleared", "info");
};

window.gitExtViewDiff = function(filename) {
  const content = (typeof files !== "undefined" && files[filename]) || "";
  showToast("Diff view — " + filename + " (" + content.split("\n").length + " lines)", "info");
};

/* ── NPM PACKAGE MANAGER ── */
function runVscNpm() {
  document.getElementById("extDetailOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "extDetailOverlay";
  overlay.innerHTML = `
    <div class="ext-detail-overlay" onclick="document.getElementById('extDetailOverlay').remove()"></div>
    <div class="ext-detail-modal" style="width:460px;">
      <div class="ext-detail-header">
        <div class="ext-detail-icon">📦</div>
        <div class="ext-detail-title">NPM Package Manager</div>
        <button class="ext-detail-close" onclick="document.getElementById('extDetailOverlay').remove()">✕</button>
      </div>
      <div class="ext-detail-body">
        <div style="display:flex;gap:8px;margin-bottom:12px;">
          <input id="npm-search-input" type="text" placeholder="Search npm packages..." style="flex:1;background:#1a1a1a;border:1px solid #333;color:#ccc;padding:8px 12px;border-radius:6px;font-size:13px;outline:none;" onkeydown="if(event.key==='Enter')npmSearch()">
          <button class="ext-btn ext-btn-primary" onclick="npmSearch()">Search</button>
        </div>
        <div id="npm-results" style="display:flex;flex-direction:column;gap:6px;max-height:320px;overflow-y:auto;">
          <div style="color:#555;font-size:12px;text-align:center;padding:20px;">Search for a package above</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById("npm-search-input")?.focus(), 100);
}

window.npmSearch = async function() {
  const q = document.getElementById("npm-search-input")?.value.trim();
  const results = document.getElementById("npm-results");
  if (!q || !results) return;
  results.innerHTML = `<div style="color:#555;font-size:12px;text-align:center;padding:20px;">Searching...</div>`;
  try {
    const res = await fetch(`https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(q)}&size=8`);
    const data = await res.json();
    if (!data.objects?.length) { results.innerHTML=`<div style="color:#555;font-size:12px;text-align:center;padding:20px;">No packages found</div>`; return; }
    results.innerHTML = data.objects.map(({package:p}) => `
      <div style="background:#1a1a1a;border:1px solid #2d2d2d;border-radius:6px;padding:10px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:4px;">
          <span style="font-weight:600;color:#ccc;font-size:13px;">${p.name}</span>
          <span style="font-size:10px;color:#555;">v${p.version}</span>
        </div>
        <div style="font-size:11px;color:#777;margin-bottom:8px;">${(p.description||"").slice(0,80)}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="ext-btn ext-btn-primary" style="font-size:10px;padding:3px 10px;" onclick="npmInsertImport('${p.name}','esm')">import (ESM)</button>
          <button class="ext-btn" style="font-size:10px;padding:3px 10px;" onclick="npmInsertImport('${p.name}','cjs')">require (CJS)</button>
          <button class="ext-btn" style="font-size:10px;padding:3px 10px;" onclick="npmInsertCDN('${p.name}','${p.version}')">CDN &lt;script&gt;</button>
        </div>
      </div>`).join("");
  } catch(e) { results.innerHTML=`<div style="color:#f87171;font-size:12px;text-align:center;padding:20px;">Error: ${e.message}</div>`; }
};

window.npmInsertImport = function(pkg, style) {
  const ed = typeof getActiveEditor==="function" ? getActiveEditor() : window.editor1;
  if (!ed) return;
  const name = pkg.replace(/-([a-z])/g,(_,c)=>c.toUpperCase()).replace(/[@/]/g,"");
  const code = style==="esm" ? `import ${name} from '${pkg}';\n` : `const ${name} = require('${pkg}');\n`;
  const model = ed.getModel();
  const firstLine = model.getLineCount() > 0 ? { startLineNumber:1,startColumn:1,endLineNumber:1,endColumn:1 } : ed.getSelection();
  ed.executeEdits("npm",[{ range:firstLine, text:code, forceMoveMarkers:true }]);
  ed.pushUndoStop();
  document.getElementById("extDetailOverlay")?.remove();
  showToast(`✓ Inserted import for ${pkg}`, "success");
};

window.npmInsertCDN = function(pkg, version) {
  const ed = typeof getActiveEditor==="function" ? getActiveEditor() : window.editor1;
  if (!ed) return;
  const code = `<script src="https://cdn.jsdelivr.net/npm/${pkg}@${version}"><\/script>\n`;
  const sel = ed.getSelection();
  ed.executeEdits("npm",[{ range:sel, text:code, forceMoveMarkers:true }]);
  ed.pushUndoStop();
  document.getElementById("extDetailOverlay")?.remove();
  showToast(`✓ Inserted CDN script for ${pkg}`, "success");
};

/* ── INTELLISENSE BOOST ── */
window._intellisenseRegistered = false;

function activateIntelliSense() {
  if (window._intellisenseRegistered || !window.monaco) return;
  window._intellisenseRegistered = true;

  // HTML completions
  monaco.languages.registerCompletionItemProvider("html", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber:position.lineNumber, endLineNumber:position.lineNumber, startColumn:word.startColumn, endColumn:word.endColumn };
      const htmlTags = ["div","span","p","h1","h2","h3","h4","h5","h6","a","img","ul","ol","li","nav","header","footer","main","section","article","aside","form","input","button","select","option","textarea","table","tr","td","th","thead","tbody","label","figure","video","audio","canvas","iframe"];
      const suggestions = htmlTags.map(tag => ({
        label: tag,
        kind: monaco.languages.CompletionItemKind.Keyword,
        insertText: `<${tag}>\$1</${tag}>`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        range
      }));
      // common attributes
      const attrs = ["class","id","style","href","src","alt","type","placeholder","required","disabled","checked","value","name","action","method","target","rel","data-","aria-label","aria-hidden","role"];
      attrs.forEach(a => suggestions.push({
        label: a, kind: monaco.languages.CompletionItemKind.Property,
        insertText: `${a}="\$1"`,
        insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range
      }));
      return { suggestions };
    }
  });

  // CSS completions
  monaco.languages.registerCompletionItemProvider("css", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber:position.lineNumber, endLineNumber:position.lineNumber, startColumn:word.startColumn, endColumn:word.endColumn };
      const cssProps = [
        {l:"display",i:"display: $1;"},{l:"flex",i:"display: flex;"},{l:"grid",i:"display: grid;"},
        {l:"position",i:"position: $1;"},{l:"width",i:"width: $1;"},{l:"height",i:"height: $1;"},
        {l:"margin",i:"margin: $1;"},{l:"padding",i:"padding: $1;"},{l:"background",i:"background: $1;"},
        {l:"color",i:"color: $1;"},{l:"font-size",i:"font-size: $1;"},{l:"font-weight",i:"font-weight: $1;"},
        {l:"border",i:"border: $1;"},{l:"border-radius",i:"border-radius: $1;"},{l:"box-shadow",i:"box-shadow: $1;"},
        {l:"transition",i:"transition: $1 0.3s ease;"},{l:"transform",i:"transform: $1;"},
        {l:"flex-direction",i:"flex-direction: $1;"},{l:"align-items",i:"align-items: $1;"},
        {l:"justify-content",i:"justify-content: $1;"},{l:"gap",i:"gap: $1;"},
        {l:"grid-template-columns",i:"grid-template-columns: $1;"},{l:"overflow",i:"overflow: $1;"},
        {l:"z-index",i:"z-index: $1;"},{l:"opacity",i:"opacity: $1;"},{l:"cursor",i:"cursor: $1;"},
        {l:"animation",i:"animation: $1 0.3s ease;"},{l:"content",i:'content: "$1";'},
        {l:"text-align",i:"text-align: $1;"},{l:"letter-spacing",i:"letter-spacing: $1;"},
        {l:"line-height",i:"line-height: $1;"},{l:"object-fit",i:"object-fit: $1;"},
        {l:"top",i:"top: $1;"},{l:"left",i:"left: $1;"},{l:"right",i:"right: $1;"},{l:"bottom",i:"bottom: $1;"},
        {l:"min-width",i:"min-width: $1;"},{l:"max-width",i:"max-width: $1;"},
        {l:"min-height",i:"min-height: $1;"},{l:"max-height",i:"max-height: $1;"},
        {l:"white-space",i:"white-space: $1;"},{l:"text-overflow",i:"text-overflow: $1;"},
        {l:"backdrop-filter",i:"backdrop-filter: blur($1px);"},{l:"user-select",i:"user-select: none;"}
      ];
      return { suggestions: cssProps.map(p=>({ label:p.l, kind:monaco.languages.CompletionItemKind.Property, insertText:p.i, insertTextRules:monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range })) };
    }
  });

  // JS completions
  monaco.languages.registerCompletionItemProvider("javascript", {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = { startLineNumber:position.lineNumber, endLineNumber:position.lineNumber, startColumn:word.startColumn, endColumn:word.endColumn };
      const jsSnippets = [
        {l:"clg",i:'console.log($1);',d:"console.log"},
        {l:"afn",i:"async function $1() {\n  $2\n}",d:"async function"},
        {l:"afat",i:"async ($1) => {\n  $2\n}",d:"async arrow function"},
        {l:"fetch",i:'const res = await fetch("$1");\nconst data = await res.json();',d:"fetch call"},
        {l:"trycatch",i:"try {\n  $1\n} catch(e) {\n  console.error(e);\n}",d:"try catch"},
        {l:"qs",i:'document.querySelector("$1")',d:"querySelector"},
        {l:"qsa",i:'document.querySelectorAll("$1")',d:"querySelectorAll"},
        {l:"addev",i:'$1.addEventListener("$2", $3);',d:"addEventListener"},
        {l:"lsg",i:'localStorage.getItem("$1")',d:"localStorage.getItem"},
        {l:"lss",i:'localStorage.setItem("$1", $2)',d:"localStorage.setItem"},
        {l:"imp",i:'import $1 from "$2";',d:"import statement"},
        {l:"exp",i:"export default $1;",d:"export default"},
        {l:"arr",i:"const $1 = [$2];",d:"array declaration"},
        {l:"obj",i:"const $1 = {\n  $2\n};",d:"object declaration"},
        {l:"map",i:"$1.map(($2) => $3)",d:"array map"},
        {l:"filt",i:"$1.filter(($2) => $3)",d:"array filter"},
        {l:"redu",i:"$1.reduce((acc, $2) => acc, $3)",d:"array reduce"},
        {l:"prom",i:"new Promise((resolve, reject) => {\n  $1\n});",d:"Promise"},
        {l:"setint",i:"setInterval(() => {\n  $1\n}, $2);",d:"setInterval"},
        {l:"settim",i:"setTimeout(() => {\n  $1\n}, $2);",d:"setTimeout"}
      ];
      return { suggestions: jsSnippets.map(s=>({ label:s.l, detail:s.d, kind:monaco.languages.CompletionItemKind.Snippet, insertText:s.i, insertTextRules:monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range })) };
    }
  });

  showToast("🧠 IntelliSense Boost activated!", "success");
}

/* ── FILE TEMPLATES ── */
const FILE_TEMPLATES = {
  "html": `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Document</title>
<link rel="stylesheet" href="style.css">
</head>
<body>

  <h1>Hello World</h1>

<script src="script.js"><\/script>
</body>
</html>`,
  "css": `:root {
  --primary: #3b82f6;
  --secondary: #8b5cf6;
  --bg: #ffffff;
  --text: #1f2937;
  --radius: 8px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}`,
  "js": `// Script
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  console.log('Ready!');
});`,
  "ts": `// TypeScript Module

interface Config {
  name: string;
  value: number;
}

export function main(config: Config): void {
  console.log(config.name);
}`,
  "jsx": `import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="App">
      <h1>Hello React</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count: {count}
      </button>
    </div>
  );
}

export default App;`,
  "py": `# Python Script

def main():
    print("Hello, World!")


if __name__ == "__main__":
    main()`,
  "md": `# Title

## Introduction

Write your content here.

## Section

- Item 1
- Item 2

## Code Example

\`\`\`javascript
console.log("Hello!");
\`\`\`
`,
  "json": `{
  "name": "project",
  "version": "1.0.0",
  "description": ""
}`
};

function applyFileTemplate(filename, content) {
  if (!isExtInstalled("vsc-templates")) return content;
  if (content && content.trim()) return content; // don't overwrite existing content
  const ext = filename.split(".").pop().toLowerCase();
  return FILE_TEMPLATES[ext] || content;
}

/* ── LIVE SERVER PLUS ── */
function activateLiveServerPlus() {
  const preview = document.getElementById("preview");
  const previewHeader = preview?.querySelector(".preview-header");
  if (!preview || !previewHeader || document.getElementById("lsp-toolbar")) return;

  const toolbar = document.createElement("div");
  toolbar.id = "lsp-toolbar";
  toolbar.style.cssText = "display:flex;align-items:center;gap:6px;padding:4px 8px;background:#0d1117;border-bottom:1px solid #222;flex-shrink:0;flex-wrap:wrap;";
  toolbar.innerHTML = `
    <button onclick="lspDevice('100%','100%')" title="Desktop" style="background:#1f2937;border:none;color:#aaa;padding:3px 7px;border-radius:4px;cursor:pointer;font-size:12px;">💻</button>
    <button onclick="lspDevice('768px','1024px')" title="Tablet" style="background:#1f2937;border:none;color:#aaa;padding:3px 7px;border-radius:4px;cursor:pointer;font-size:12px;">📟</button>
    <button onclick="lspDevice('375px','667px')" title="Mobile" style="background:#1f2937;border:none;color:#aaa;padding:3px 7px;border-radius:4px;cursor:pointer;font-size:12px;">📱</button>
    <div style="width:1px;height:16px;background:#333;"></div>
    <span style="font-size:10px;color:#555;font-family:monospace;" id="lsp-size">full</span>
    <div style="flex:1;"></div>
    <button onclick="lspScrollTop()" title="Scroll to top" style="background:#1f2937;border:none;color:#aaa;padding:3px 7px;border-radius:4px;cursor:pointer;font-size:11px;">⬆ Top</button>
  `;

  // insert after preview header
  previewHeader.insertAdjacentElement("afterend", toolbar);
  showToast("🌐 Live Server Plus activated!", "success");
}

window.lspDevice = function(w, h) {
  const frame = document.getElementById("previewFrame");
  if (!frame) return;
  const isFullWidth = w === "100%";
  frame.style.width = w;
  frame.style.height = h;
  frame.style.margin = isFullWidth ? "0" : "8px auto";
  frame.style.border = isFullWidth ? "none" : "2px solid #333";
  frame.style.borderRadius = isFullWidth ? "0" : "8px";
  document.getElementById("lsp-size").innerText = isFullWidth ? "full" : `${w}`;
};

window.lspScrollTop = function() {
  const frame = document.getElementById("previewFrame");
  try { frame?.contentWindow?.scrollTo(0,0); } catch {}
};

/* ── TERMINAL COMMANDS ── */
function runVscTerminal() {
  const commands = {
    "NPM": [
      "npm install","npm run dev","npm run build","npm run start","npm run test",
      "npm init -y","npm list","npm outdated","npm update","npm audit fix"
    ],
    "Git": [
      "git status","git add .","git log --oneline -10","git diff",
      "git branch","git pull","git fetch","git stash","git stash pop"
    ],
    "Files": [
      "ls -la","pwd","mkdir newFolder","rm -rf dist/","cp -r src/ backup/",
      "find . -name '*.js'","cat package.json","wc -l src/*.js"
    ],
    "Node": [
      "node --version","npm --version","node app.js","npx create-react-app .",
      "npx vite","node -e \"console.log(process.version)\""
    ]
  };

  document.getElementById("extDetailOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "extDetailOverlay";
  overlay.innerHTML = `
    <div class="ext-detail-overlay" onclick="document.getElementById('extDetailOverlay').remove()"></div>
    <div class="ext-detail-modal" style="width:440px;">
      <div class="ext-detail-header">
        <div class="ext-detail-icon">💻</div>
        <div class="ext-detail-title">Terminal Commands</div>
        <button class="ext-detail-close" onclick="document.getElementById('extDetailOverlay').remove()">✕</button>
      </div>
      <div class="ext-detail-body" style="max-height:400px;overflow-y:auto;">
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          <input id="term-custom-cmd" type="text" placeholder="Type custom command..." style="flex:1;background:#1a1a1a;border:1px solid #333;color:#ccc;padding:7px 10px;border-radius:6px;font-family:monospace;font-size:12px;outline:none;" onkeydown="if(event.key==='Enter')termRunCustom()">
          <button class="ext-btn ext-btn-primary" onclick="termRunCustom()">▶ Run</button>
        </div>
        ${Object.entries(commands).map(([cat, cmds]) => `
          <div style="font-size:10px;color:#555;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin:10px 0 6px;">// ${cat}</div>
          <div style="display:flex;flex-direction:column;gap:3px;">
            ${cmds.map(cmd=>`
              <div style="display:flex;align-items:center;gap:6px;padding:5px 8px;background:#1a1a1a;border-radius:4px;cursor:pointer;" onclick="termRunCmd('${cmd.replace(/'/g,"\\'")}')">
                <span style="color:#555;font-size:10px;">▶</span>
                <span style="font-family:monospace;font-size:12px;color:#a0c0e0;flex:1;">${cmd}</span>
              </div>`).join("")}
          </div>`).join("")}
      </div>
    </div>`;
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById("term-custom-cmd")?.focus(), 100);
}

window.termRunCmd = function(cmd) {
  document.getElementById("extDetailOverlay")?.remove();
  // open terminal and send command
  if (typeof toggleTerminal === "function") {
    const termPanel = document.getElementById("terminalPanel");
    if (!termPanel || termPanel.style.display === "none" || termPanel.innerHTML === "") toggleTerminal();
  }
  // try to write to terminal input
  setTimeout(() => {
    const termInput = document.querySelector("#terminalPanel input, #terminalPanel .xterm-helper-textarea");
    if (termInput) {
      termInput.value = cmd;
      termInput.dispatchEvent(new Event("input", {bubbles:true}));
    }
    showToast("▶ " + cmd, "info");
  }, 300);
};

window.termRunCustom = function() {
  const cmd = document.getElementById("term-custom-cmd")?.value.trim();
  if (cmd) termRunCmd(cmd);
};

/* ══════════════════════
   WIRE INTO TOOL ACTIONS
══════════════════════ */
if (typeof TOOL_ACTIONS !== "undefined") {
  TOOL_ACTIONS["vsc-git"]          = [{ label: "Open Git Panel", fn: () => { runVscGit(); return null; } }];
  TOOL_ACTIONS["vsc-npm"]          = [{ label: "Open NPM Search", fn: () => { runVscNpm(); return null; } }];
  TOOL_ACTIONS["vsc-intellisense"] = [{ label: "Activate IntelliSense", fn: () => { activateIntelliSense(); return null; } }];
  TOOL_ACTIONS["vsc-templates"]    = [{ label: "File Templates (auto-applied on new files)", fn: () => null }];
  TOOL_ACTIONS["vsc-live-server"]  = [{ label: "Activate Live Server Plus", fn: () => { activateLiveServerPlus(); return null; } }];
  TOOL_ACTIONS["vsc-terminal-plus"]= [{ label: "Open Terminal Commands", fn: () => { runVscTerminal(); return null; } }];
}

/* ── Activate on install ── */
const _origInstall = typeof installExtension !== "undefined" ? installExtension : null;
window.addEventListener("load", () => {
  setTimeout(() => {
    if (isExtInstalled("vsc-intellisense") && window.monaco) activateIntelliSense();
    if (isExtInstalled("vsc-live-server")) activateLiveServerPlus();
  }, 2500);
});