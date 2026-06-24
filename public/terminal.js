/* =========================
   REAL TERMINAL v1
   - JS execution (eval sandbox)
   - Command history (arrow keys)
   - Built-in commands
   - File system access
   - npm-like package simulation
   - Clear, help, ls, cat, etc
========================= */

let termHistory    = [];
let termHistIdx    = -1;
let termOpen       = false;
let termWorker     = null;

/* ══════════════════════
   BUILT-IN COMMANDS
══════════════════════ */
const COMMANDS = {

  help: () => `
<span class="t-head">// VSCODEGODMODE TERMINAL — Available Commands</span>

<span class="t-cmd">File System:</span>
  ls              — list all project files
  ls [folder]     — list files in folder
  cat [file]      — print file contents
  touch [file]    — create new empty file
  mkdir [folder]  — create new folder
  rm [file]       — delete a file
  mv [old] [new]  — rename a file
  cp [src] [dst]  — copy a file
  pwd             — print current path

<span class="t-cmd">Code:</span>
  run             — run current HTML in preview
  eval [js]       — execute JavaScript
  format          — format current file
  lint            — basic JS lint check

<span class="t-cmd">Editor:</span>
  open [file]     — open file in editor
  files           — show all files
  theme [dark|light|hc] — switch editor theme

<span class="t-cmd">Info:</span>
  whoami          — show session info
  date            — current date/time
  clear           — clear terminal
  history         — show command history
  help            — show this help`,

  clear: () => { clearTerminal(); return ""; },

  ls: (args) => {
    const prefix = args[0] ? args[0].replace(/\/?$/, "/") : "";
    const fileList = typeof files !== "undefined" ? Object.keys(files) : [];
    const matching = fileList.filter(f => {
      if (!prefix) return !f.includes("/") || f.split("/").length === 2 && f.endsWith("/.gitkeep");
      return f.startsWith(prefix);
    }).filter(f => !f.endsWith("/.gitkeep"));

    if (!matching.length) return `<span class="t-err">ls: ${prefix||"."}: no files found</span>`;

    // group into files and folders
    const seen = new Set();
    const out  = [];
    matching.forEach(f => {
      const rel  = prefix ? f.slice(prefix.length) : f;
      const part = rel.split("/")[0];
      if (seen.has(part)) return;
      seen.add(part);
      const isDir = matching.some(x => x.startsWith((prefix||"")+part+"/"));
      if (isDir) out.push(`<span class="t-dir">📁 ${part}/</span>`);
      else out.push(`<span class="t-file">${getFileIcon ? getFileIcon(part) : "📄"} ${part}</span>`);
    });
    return out.join("\n");
  },

  cat: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: cat [filename]</span>`;
    const content = typeof files !== "undefined" ? files[args[0]] : null;
    if (content === undefined) return `<span class="t-err">cat: ${args[0]}: No such file</span>`;
    const escaped = String(content).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    return `<span class="t-muted">// ${args[0]}</span>\n${escaped}`;
  },

  touch: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: touch [filename]</span>`;
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    if (files[args[0]] !== undefined) return `<span class="t-warn">touch: ${args[0]}: Already exists</span>`;
    files[args[0]] = "";
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs  === "function") renderTabs();
    return `<span class="t-ok">✓ Created: ${args[0]}</span>`;
  },

  mkdir: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: mkdir [foldername]</span>`;
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    files[args[0] + "/.gitkeep"] = "";
    if (typeof openFolders !== "undefined") openFolders.add(args[0]);
    if (typeof renderFiles === "function") renderFiles();
    return `<span class="t-ok">✓ Created folder: ${args[0]}/</span>`;
  },

  rm: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: rm [filename]</span>`;
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    if (files[args[0]] === undefined) return `<span class="t-err">rm: ${args[0]}: No such file</span>`;
    delete files[args[0]];
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs  === "function") renderTabs();
    return `<span class="t-ok">✓ Deleted: ${args[0]}</span>`;
  },

  mv: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">Usage: mv [old] [new]</span>`;
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    if (files[args[0]] === undefined) return `<span class="t-err">mv: ${args[0]}: No such file</span>`;
    files[args[1]] = files[args[0]]; delete files[args[0]];
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs  === "function") renderTabs();
    return `<span class="t-ok">✓ Renamed: ${args[0]} → ${args[1]}</span>`;
  },

  cp: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">Usage: cp [src] [dst]</span>`;
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    if (files[args[0]] === undefined) return `<span class="t-err">cp: ${args[0]}: No such file</span>`;
    files[args[1]] = files[args[0]];
    if (typeof renderFiles === "function") renderFiles();
    return `<span class="t-ok">✓ Copied: ${args[0]} → ${args[1]}</span>`;
  },

  pwd: () => `<span class="t-path">/workspace/vscodegodmode</span>`,

  run: () => {
    if (typeof updatePreview === "function" && typeof currentFile !== "undefined") {
      updatePreview(currentFile);
      return `<span class="t-ok">✓ Running: ${currentFile}</span>`;
    }
    return `<span class="t-err">Preview not available</span>`;
  },

  open: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: open [filename]</span>`;
    if (typeof files === "undefined" || files[args[0]] === undefined)
      return `<span class="t-err">open: ${args[0]}: No such file</span>`;
    if (typeof openFile === "function") openFile(args[0]);
    return `<span class="t-ok">✓ Opened: ${args[0]}</span>`;
  },

  files: () => {
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    const list = Object.keys(files).filter(f => !f.endsWith("/.gitkeep"));
    return list.map(f => `  <span class="t-file">${f}</span>`).join("\n") || "No files";
  },

  format: () => {
    if (window.editor1) { window.editor1.trigger("","editor.action.formatDocument",{}); return `<span class="t-ok">✓ Formatted</span>`; }
    return `<span class="t-err">Editor not ready</span>`;
  },

  lint: () => {
    if (!window.editor1) return `<span class="t-err">Editor not ready</span>`;
    const code = window.editor1.getValue();
    const issues = [];
    if (code.includes("var "))    issues.push(`⚠ Line ~${code.split("\n").findIndex(l=>l.includes("var "))+1}: Use 'let' or 'const' instead of 'var'`);
    if (code.includes("==") && !code.includes("===")) issues.push("⚠ Use '===' instead of '=='");
    if (code.includes("eval("))  issues.push("⚠ Avoid using eval()");
    if (code.includes("console.log")) issues.push("ℹ console.log found — remove before production");
    if (!issues.length) return `<span class="t-ok">✓ No issues found</span>`;
    return issues.map(i=>`<span class="t-warn">${i}</span>`).join("\n");
  },

  theme: (args) => {
    const t = args[0];
    if (!t) return `<span class="t-err">Usage: theme [dark|light|hc]</span>`;
    const map = { dark:"vs-dark", light:"vs", hc:"hc-black" };
    const theme = map[t];
    if (!theme) return `<span class="t-err">Unknown theme. Use: dark, light, hc</span>`;
    if (window.monaco) { monaco.editor.setTheme(theme); return `<span class="t-ok">✓ Theme: ${t}</span>`; }
    return `<span class="t-err">Monaco not ready</span>`;
  },

  whoami: () => {
    const ua = navigator.userAgent;
    const device = /Mobi|Android/i.test(ua) ? "📱 Mobile" : "💻 Desktop";
    return `<span class="t-info">User     : guest@vscodegodmode
Device   : ${device}
Screen   : ${screen.width}x${screen.height}
Language : ${navigator.language}
Platform : ${navigator.platform}
Online   : ${navigator.onLine ? "Yes" : "No"}</span>`;
  },

  date: () => `<span class="t-info">${new Date().toString()}</span>`,

  history: () => termHistory.map((c,i)=>`  <span class="t-muted">${String(i+1).padStart(3," ")}  ${c}</span>`).join("\n") || "No history",

  echo: (args) => args.join(" "),

  time: () => `<span class="t-info">${new Date().toLocaleTimeString()}</span>`,

};

/* ══════════════════════
   JS EVAL SANDBOX
══════════════════════ */
function sandboxEval(code) {
  // capture console.log output
  const logs = [];
  const fakeConsole = {
    log:   (...a) => logs.push(a.map(x=>typeof x==="object"?JSON.stringify(x,null,2):String(x)).join(" ")),
    error: (...a) => logs.push("ERROR: "+a.join(" ")),
    warn:  (...a) => logs.push("WARN: "+a.join(" ")),
    info:  (...a) => logs.push(a.join(" "))
  };

  try {
    const fn = new Function("console","files","currentFile",
      `"use strict";\n${code}`
    );
    const result = fn(fakeConsole, typeof files!=="undefined"?files:{}, typeof currentFile!=="undefined"?currentFile:"");
    const out = [];
    if (logs.length) out.push(...logs.map(l=>`<span class="t-log">${escTerm(l)}</span>`));
    if (result !== undefined) out.push(`<span class="t-result">← ${escTerm(JSON.stringify(result,null,2))}</span>`);
    return out.join("\n") || `<span class="t-ok">✓ (no output)</span>`;
  } catch(e) {
    return `<span class="t-err">✗ ${escTerm(e.message)}</span>`;
  }
}

function escTerm(s){ return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* ══════════════════════
   EXECUTE COMMAND
══════════════════════ */
/* ══════════════════════
   REAL TERMINAL API
══════════════════════ */
const TERM_SERVER = "https://backend-forz.onrender.com";
let termCwd = null; // current working dir on server

async function runRealCommand(command) {
  // first sync project files to server
  printTermLine(`<span class="t-muted">$ ${escTerm(command)}</span>`);

  // special: cd command — update cwd
  if (command.startsWith("cd ")) {
    const target = command.slice(3).trim();
    termCwd = target === ".." ? null : target;
    printTermLine(`<span class="t-ok">✓ Changed directory to: ${escTerm(target)}</span>`);
    return;
  }

  // special: sync — push browser files to server
  if (command === "sync") {
    printTermLine(`<span class="t-info">⟳ Syncing project files to server...</span>`);
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: window.files || {} })
      });
      const d = await r.json();
      printTermLine(`<span class="t-ok">✓ Synced ${d.synced} files to server</span>`);
    } catch(e) {
      printTermLine(`<span class="t-err">✗ Sync failed: ${escTerm(e.message)}</span>`);
    }
    return;
  }

  // special: pull — read server files back into browser
  if (command === "pull-files") {
    printTermLine(`<span class="t-info">⟳ Pulling files from server...</span>`);
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/listfiles");
      const d = await r.json();
      if (d.files && Object.keys(d.files).length) {
        Object.assign(window.files, d.files);
        if (typeof saveToStorage === "function") saveToStorage();
        if (typeof renderFiles === "function") renderFiles();
        if (typeof renderTabs === "function") renderTabs();
        printTermLine(`<span class="t-ok">✓ Pulled ${Object.keys(d.files).length} files into editor</span>`);
      } else {
        printTermLine(`<span class="t-warn">No files found on server — run 'sync' first</span>`);
      }
    } catch(e) {
      printTermLine(`<span class="t-err">✗ Pull failed: ${escTerm(e.message)}</span>`);
    }
    return;
  }

  // all other commands — run on server
  printTermLine(`<span class="t-muted">running on server...</span>`);
  try {
    const r = await fetch(TERM_SERVER + "/api/terminal/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, cwd: termCwd })
    });
    const d = await r.json();
    if (d.stdout) printTermLine(`<span class="t-log">${escTerm(d.stdout)}</span>`);
    if (d.stderr) printTermLine(`<span class="t-warn">${escTerm(d.stderr)}</span>`);
    if (d.error)  printTermLine(`<span class="t-err">✗ ${escTerm(d.error)}</span>`);
    if (!d.stdout && !d.stderr && !d.error) printTermLine(`<span class="t-ok">✓ Done (exit 0)</span>`);

    // after npm install or git clone, auto pull files back
    if (/^(npm install|git clone|npm run|npx)/.test(command)) {
      setTimeout(async () => {
        printTermLine(`<span class="t-info">⟳ Syncing new files to editor...</span>`);
        const r2 = await fetch(TERM_SERVER + "/api/terminal/listfiles");
        const d2 = await r2.json();
        if (d2.files && Object.keys(d2.files).length) {
          Object.assign(window.files, d2.files);
          if (typeof saveToStorage === "function") saveToStorage();
          if (typeof renderFiles === "function") renderFiles();
          if (typeof renderTabs === "function") renderTabs();
          printTermLine(`<span class="t-ok">✓ ${Object.keys(d2.files).length} files synced to editor</span>`);
        }
      }, 1500);
    }
  } catch(e) {
    printTermLine(`<span class="t-err">✗ Server error: ${escTerm(e.message)}</span>`);
  }
}
function execCommand(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return;

  // add to history
  termHistory.push(trimmed);
  if (termHistory.length > 100) termHistory.shift();
  termHistIdx = termHistory.length;
  localStorage.setItem("term_history", JSON.stringify(termHistory));

  // print the command line
  printTermLine(`<span class="t-ps1">vscodegodmode:~$</span> <span class="t-input-echo">${escTerm(trimmed)}</span>`);

  // parse command
  const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const cmd   = parts[0]?.toLowerCase();
  const args  = parts.slice(1).map(a => a.replace(/^["']|["']$/g,""));

  // eval / js shorthand
  // send everything to real server terminal
  // except purely local commands
  const localOnly = ["clear","cls","help","history"];
  if (!localOnly.includes(cmd)) {
    runRealCommand(raw);
    return;
  }
  if (cmd === "eval" || cmd === "js" || cmd === "node") {
    const code = args.join(" ");
    if (!code) { printTermLine(`<span class="t-err">Usage: eval [javascript code]</span>`); return; }
    printTermLine(sandboxEval(code));
    return;
  }

  // run multi-line JS block
  if (trimmed.startsWith("```")) {
    const code = trimmed.replace(/^```\w*\n?/, "").replace(/```$/, "");
    printTermLine(sandboxEval(code));
    return;
  }

  // local only commands
  const localOnly = ["clear", "cls", "help", "history", "eval", "js"];
  if (localOnly.includes(cmd) && COMMANDS[cmd]) {
    const result = COMMANDS[cmd](args);
    if (result) printTermLine(result);
    return;
  }

  // everything else runs on real server
  runRealCommand(trimmed);
}

/* ══════════════════════
   PRINT TO TERMINAL
══════════════════════ */
function printTermLine(html) {
  const out = document.getElementById("term-output"); if (!out) return;
  const line = document.createElement("div");
  line.className = "term-line";
  line.innerHTML = html;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

function clearTerminal() {
  const out = document.getElementById("term-output"); if (!out) return;
  out.innerHTML = "";
  printTermLine(`<span class="t-head">// VSCODEGODMODE TERMINAL — type 'help' for commands</span>`);
}

/* ══════════════════════
   BUILD TERMINAL UI
══════════════════════ */
function buildTerminal() {
  const container = document.getElementById("terminalPanel"); if (!container) return;

  container.innerHTML = `
    <div class="term-titlebar">
      <div class="term-dots">
        <span class="term-dot red"></span>
        <span class="term-dot yellow"></span>
        <span class="term-dot green"></span>
      </div>
      <span class="term-title">vscodegodmode — terminal</span>
      <div class="term-actions">
        <button class="term-btn" onclick="clearTerminal()" title="Clear">⌫ Clear</button>
        <button class="term-btn" onclick="toggleTerminal()" title="Close">✕</button>
      </div>
    </div>
    <div class="term-output" id="term-output"></div>
    <div class="term-input-row">
      <span class="t-ps1">vscodegodmode:~$</span>
      <input
        id="term-input"
        class="term-input"
        type="text"
        placeholder="type a command or JS..."
        autocomplete="off"
        autocorrect="off"
        autocapitalize="off"
        spellcheck="false"
      >
    </div>`;

  // welcome message
  printTermLine(`<span class="t-head">╔══════════════════════════════════════╗</span>`);
  printTermLine(`<span class="t-head">║   VSCODEGODMODE TERMINAL  v1.0       ║</span>`);
  printTermLine(`<span class="t-head">╚══════════════════════════════════════╝</span>`);
  printTermLine(`<span class="t-muted">Type <span class="t-cmd">help</span> for available commands</span>`);
  printTermLine(`<span class="t-muted">Type <span class="t-cmd">eval [js]</span> to run JavaScript</span>`);
  printTermLine(``);

  // load history from localStorage
  try {
    const saved = localStorage.getItem("term_history");
    if (saved) { termHistory = JSON.parse(saved); termHistIdx = termHistory.length; }
  } catch {}

  // input events
  const input = document.getElementById("term-input");
  if (!input) return;

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      execCommand(input.value);
      input.value = "";
      termHistIdx  = termHistory.length;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (termHistIdx > 0) { termHistIdx--; input.value = termHistory[termHistIdx]||""; }
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (termHistIdx < termHistory.length-1) { termHistIdx++; input.value = termHistory[termHistIdx]||""; }
      else { termHistIdx = termHistory.length; input.value = ""; }
    }
    if (e.key === "Tab") {
      e.preventDefault();
      // autocomplete
      const val = input.value.trim();
      const parts = val.split(" ");
      if (parts.length === 1) {
        // complete command
        const matches = Object.keys(COMMANDS).filter(c => c.startsWith(val));
        if (matches.length === 1) input.value = matches[0] + " ";
        else if (matches.length > 1) printTermLine(`<span class="t-muted">${matches.join("  ")}</span>`);
      } else if (parts.length === 2 && ["cat","open","rm","mv","cp"].includes(parts[0])) {
        // complete filename
        const fileList = typeof files !== "undefined" ? Object.keys(files).filter(f=>!f.endsWith("/.gitkeep")) : [];
        const matches = fileList.filter(f => f.startsWith(parts[1]));
        if (matches.length === 1) input.value = parts[0] + " " + matches[0];
        else if (matches.length > 1) printTermLine(`<span class="t-muted">${matches.join("  ")}</span>`);
      }
    }
    if (e.key === "l" && e.ctrlKey) { e.preventDefault(); clearTerminal(); }
    if (e.key === "c" && e.ctrlKey) { input.value = ""; printTermLine(`<span class="t-muted">^C</span>`); }
  });

  input.focus();
}

/* ══════════════════════
   TOGGLE
══════════════════════ */
function toggleTerminal() {
  const panel = document.getElementById("terminalPanel"); if (!panel) return;
  termOpen = !termOpen;
  panel.style.height = termOpen ? "240px" : "0px";
  panel.style.borderTopWidth = termOpen ? "2px" : "0px";

  if (termOpen) {
    buildTerminal();
    document.getElementById("term-input")?.focus();
  }

  const btn = document.getElementById("terminalToggleBtn");
  if (btn) btn.classList.toggle("active", termOpen);
}

/* log from preview goes to terminal too */
window.addEventListener("message", e => {
  if (e.data?.type === "console" && termOpen) {
    const lvl = e.data.level;
    const cls = lvl==="error"?"t-err":lvl==="warn"?"t-warn":"t-log";
    printTermLine(`<span class="${cls}">[preview] ${escTerm(e.data.msg)}</span>`);
  }
});