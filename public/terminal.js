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
  help            — show this help

<span class="t-cmd">Server (Real):</span>
  sync            — push editor files to server
  pull-files      — pull server files into editor
  node [file]     — run a Node.js server
  npm install     — install packages
  npm start       — start your project server
  git clone [url] — clone a GitHub repo
  kill [port]     — stop a running server`,

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
let termCwd = null;

async function runRealCommand(command) {
  const cmd = command.trim().split(" ")[0].toLowerCase();

  // sync — push browser files to server
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

  // pull-files — read server files back into browser
  if (command === "pull-files") {
    printTermLine(`<span class="t-info">⟳ Pulling files from server...</span>`);
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/listfiles");
      const d = await r.json();
      if (d.files && Object.keys(d.files).length) {
        Object.assign(window.files, d.files);
        if (typeof saveToStorage === "function") saveToStorage();
        if (typeof renderFiles   === "function") renderFiles();
        if (typeof renderTabs    === "function") renderTabs();
        printTermLine(`<span class="t-ok">✓ Pulled ${Object.keys(d.files).length} files into editor</span>`);
      } else {
        printTermLine(`<span class="t-warn">No files on server — run 'sync' first</span>`);
      }
    } catch(e) {
      printTermLine(`<span class="t-err">✗ Failed: ${escTerm(e.message)}</span>`);
    }
    return;
  }

  // cd — update working directory ON SERVER too
  if (cmd === "cd") {
    const target = command.slice(3).trim();
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: `cd ${target} && pwd`, cwd: termCwd })
      });
      const d = await r.json();
      if (d.stdout && !d.error) {
        termCwd = d.stdout.trim();
        printTermLine(`<span class="t-ok">✓ ${escTerm(termCwd)}</span>`);
      } else {
        printTermLine(`<span class="t-err">✗ cd: ${escTerm(target)}: No such directory</span>`);
      }
    } catch(e) {
      printTermLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`);
    }
    return;
  }

  // detect server start commands — node/npm start/python etc
  // auto-sync before npm/node commands
  if (/^(npm|node|npx)/.test(command)) {
    printTermLine(`<span class="t-info">⟳ Syncing your files to server first...</span>`);
    try {
      const syncR = await fetch(TERM_SERVER + "/api/terminal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: window.files || {} })
      });
      const syncD = await syncR.json();
      if (syncD.synced > 0) {
        printTermLine(`<span class="t-ok">✓ Synced ${syncD.synced} files to server</span>`);
      } else {
        printTermLine(`<span class="t-warn">⚠ No files to sync — create a package.json first</span>`);
        if (command.trim() === "npm install") {
          printTermLine(`<span class="t-info">💡 Tip: Add a package.json file to your project first, then run npm install</span>`);
          return;
        }
      }
    } catch(e) {
      printTermLine(`<span class="t-warn">⚠ Sync failed — ${escTerm(e.message)}</span>`);
    }
  }
  const isServerCmd = /^(node|npm\s+start|npm\s+run|python|python3|php\s+-S|ruby|bun\s+run)/.test(command);
  if (isServerCmd) {
    // detect port from command or default to 3000
    const portMatch = command.match(/--port[= ](\d+)|-p\s*(\d+)|PORT=(\d+)/);
    const port = portMatch ? parseInt(portMatch[1]||portMatch[2]||portMatch[3]) : 3000;

    printTermLine(`<span class="t-info">⟳ Starting server... (waiting 3s for startup)</span>`);
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command, port, cwd: termCwd })
      });
      const d = await r.json();

      if (d.logs) printTermLine(`<span class="t-log">${escTerm(d.logs)}</span>`);

      printTermLine(`
        <span class="t-ok">✓ Server started on port ${port} (PID: ${d.pid})</span>
        <br><span class="t-info">Preview URL:</span>
        <br><a href="${d.previewUrl}" target="_blank"
          style="color:#58a6ff;text-decoration:underline;font-size:13px;">
          🌐 ${d.previewUrl}
        </a>
        <br><span class="t-muted">Click to open · runs on Render server</span>
        <br><button onclick="openServerPreview('${d.previewUrl}')"
          style="margin-top:6px;padding:6px 16px;background:#1f6feb;color:white;
          border:none;border-radius:6px;cursor:pointer;font-size:12px;">
          ▶ Open Preview
        </button>
        <button onclick="killServer(${port})"
          style="margin-top:6px;margin-left:6px;padding:6px 16px;background:#3a1010;
          color:#ff5050;border:1px solid #ff505044;border-radius:6px;
          cursor:pointer;font-size:12px;">
          ✕ Stop Server
        </button>`);
    } catch(e) {
      printTermLine(`<span class="t-err">✗ Failed to start: ${escTerm(e.message)}</span>`);
    }
    return;
  }

  // all other commands — run on server with streaming-like output
  printTermLine(`<span class="t-muted">$ ${escTerm(command)}</span>`);

  // show animated running indicator
  const runId = "run-" + Date.now();
  printTermLine(`<span id="${runId}" class="t-muted">⠋ running...</span>`);
  const spinFrames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  let spinIdx = 0;
  const spinner = setInterval(() => {
    const el = document.getElementById(runId);
    if (el) el.innerHTML = `<span class="t-muted">${spinFrames[spinIdx++ % spinFrames.length]} running...</span>`;
  }, 120);

  try {
    const r = await fetch(TERM_SERVER + "/api/terminal/exec", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command, cwd: termCwd })
    });
    const d = await r.json();

    // remove spinner
    clearInterval(spinner);
    const spinEl = document.getElementById(runId);
    if (spinEl) spinEl.remove();

    // print output line by line so it looks real
    if (d.stdout) {
      d.stdout.split("\n").forEach(line => {
        if (line.trim()) printTermLine(`<span class="t-log">${escTerm(line)}</span>`);
      });
    }
    if (d.stderr) {
      d.stderr.split("\n").forEach(line => {
        if (line.trim()) {
          const isErr = /error|failed|not found/i.test(line);
          printTermLine(`<span class="${isErr ? "t-err" : "t-warn"}">${escTerm(line)}</span>`);
        }
      });
    }
    if (d.error && !d.stderr)  printTermLine(`<span class="t-err">✗ ${escTerm(d.error)}</span>`);
    if (!d.stdout && !d.stderr && !d.error) printTermLine(`<span class="t-ok">✓ Done (exit 0)</span>`);

    // after git clone or npm install — pull ALL files from server into editor
    if (/^(npm install|npm i|git clone|npx create|npx)/.test(command)) {
      printTermLine(`<span class="t-info">⟳ Scanning server for files...</span>`);
      setTimeout(async () => {
        try {
          // list files from the CURRENT cwd, not just PROJECT_DIR
          const r2 = await fetch(TERM_SERVER + "/api/terminal/listfiles?cwd=" + encodeURIComponent(termCwd || ""));
          const d2 = await r2.json();
          if (d2.files && Object.keys(d2.files).length) {
            let count = 0;
            Object.keys(d2.files).forEach(f => {
              // skip node_modules
              if (f.includes("node_modules/")) return;
              window.files[f] = d2.files[f];
              count++;
            });
            if (typeof saveToStorage === "function") saveToStorage();
            if (typeof renderFiles   === "function") renderFiles();
            if (typeof renderTabs    === "function") renderTabs();
            const htmlFile = Object.keys(d2.files).find(f => f.endsWith(".html") && !f.includes("node_modules"));
            if (htmlFile && typeof openFile === "function") openFile(htmlFile);
            printTermLine(`<span class="t-ok">✓ ${count} files loaded into editor sidebar</span>`);
            if (typeof showToast === "function") showToast(`✓ ${count} files loaded`, "success");
          } else {
            printTermLine(`<span class="t-warn">⚠ No files found — try running 'pull-files' manually</span>`);
          }
        } catch(e) {
          printTermLine(`<span class="t-err">✗ File sync failed: ${escTerm(e.message)}</span>`);
        }
      }, 2500);
    }
  } catch(e) {
    clearInterval(spinner);
    const spinEl = document.getElementById(runId);
    if (spinEl) spinEl.remove();
    printTermLine(`<span class="t-err">✗ Server error: ${escTerm(e.message)}</span>`);
  }
}

function openServerPreview(url) {
  // open in preview iframe if possible, else new tab
  const iframe = document.getElementById("previewFrame");
  if (iframe) {
    iframe.src = url;
    const preview = document.getElementById("preview");
    if (preview) preview.classList.remove("collapsed", "hidden");
    if (typeof showToast === "function") showToast("Preview opened ✓", "success");
  } else {
    window.open(url, "_blank");
  }
}

async function killServer(port) {
  try {
    const r = await fetch(TERM_SERVER + "/api/terminal/kill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ port })
    });
    const d = await r.json();
    printTermLine(`<span class="t-warn">✓ ${escTerm(d.message)}</span>`);
  } catch(e) {
    printTermLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`);
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

  // local only commands
  const localOnly = ["clear", "cls", "help", "history"];
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
/* =========================
   FULL PREVIEW
========================= */
let fpRotated = false;
let fpCurrentDevice = "desktop";

const FP_DEVICES = {
  desktop:    { w: null,     h: null,     label: "Desktop",        chrome: false },
  laptop:     { w: 1280,     h: 800,      label: "Laptop 1280×800", chrome: true  },
  tablet:     { w: 768,      h: 1024,     label: "iPad 768×1024",  chrome: true  },
  mobile:     { w: 390,      h: 844,      label: "iPhone 390×844", chrome: true  },
  smallphone: { w: 360,      h: 740,      label: "Android 360×740",chrome: true  },
};

function openFullPreview() {
  const modal    = document.getElementById("fullPreviewModal");
  const fullFrame= document.getElementById("fullPreviewFrame");
  const srcFrame = document.getElementById("previewFrame");
  if (!modal || !fullFrame) return;

  // copy the EXACT same srcdoc or src from the live preview iframe
  if (srcFrame) {
    if (srcFrame.srcdoc) {
      fullFrame.srcdoc = srcFrame.srcdoc;
    } else if (srcFrame.src && srcFrame.src !== "about:blank") {
      fullFrame.src = srcFrame.src;
    } else {
      // build from current file
      if (typeof currentFile !== "undefined" && typeof files !== "undefined") {
        const content = files[currentFile] || "";
        fullFrame.srcdoc = content;
      }
    }
  }

  modal.style.display = "flex";
  fpRotated = false;
  setPreviewDevice("desktop");
}

function closeFullPreview() {
  const modal = document.getElementById("fullPreviewModal");
  if (modal) modal.style.display = "none";
}

function setPreviewDevice(device) {
  fpCurrentDevice = device;
  const cfg    = FP_DEVICES[device];
  const frame  = document.getElementById("fullPreviewFrame");
  const frmDiv = document.getElementById("fp-device-frame");
  const chrTop = document.getElementById("fp-chrome-top");
  const chrBot = document.getElementById("fp-chrome-bottom");
  const label  = document.getElementById("fp-size-label");
  const stage  = document.getElementById("fp-stage");
  if (!frame || !frmDiv || !stage) return;

  // update button styles
  Object.keys(FP_DEVICES).forEach(d => {
    const btn = document.getElementById("fpd-" + d);
    if (!btn) return;
    if (d === device) {
      btn.style.borderColor = "#58a6ff";
      btn.style.background  = "rgba(88,166,255,0.15)";
      btn.style.color       = "#58a6ff";
    } else {
      btn.style.borderColor = "#1a2332";
      btn.style.background  = "transparent";
      btn.style.color       = "#8b949e";
    }
  });

  if (label) label.innerText = cfg.label;

  if (device === "desktop") {
    // fill entire stage
    stage.style.padding = "0";
    stage.style.alignItems = "stretch";
    stage.style.justifyContent = "stretch";
    frmDiv.style.width  = "100%";
    frmDiv.style.height = "100%";
    frmDiv.style.boxShadow = "none";
    frmDiv.style.borderRadius = "0";
    frame.style.width  = "100%";
    frame.style.height = "100%";
    if (chrTop) chrTop.style.display = "none";
    if (chrBot) chrBot.style.display = "none";
  } else {
    // device frame — scale down if screen is too small
    let w = fpRotated ? cfg.h : cfg.w;
    let h = fpRotated ? cfg.w : cfg.h;

    // get available stage size
    const stageW = stage.clientWidth  - 32;
    const stageH = stage.clientHeight - 32;

    // scale down to fit if needed
    let scale = 1;
    if (w > stageW || h > stageH) {
      scale = Math.min(stageW / w, stageH / h);
    }

    const scaledW = Math.floor(w * scale);
    const scaledH = Math.floor(h * scale);

    stage.style.padding = "16px";
    stage.style.alignItems = "center";
    stage.style.justifyContent = "center";

    frmDiv.style.width  = scaledW + "px";
    frmDiv.style.height = "auto";
    frmDiv.style.boxShadow = "0 20px 60px rgba(0,0,0,0.7),0 0 0 2px #1a2332";
    frmDiv.style.borderRadius = cfg.chrome ? "20px" : "8px";

    // iframe keeps original size then scaled via transform
    frame.style.width  = w + "px";
    frame.style.height = h + "px";
    frame.style.transformOrigin = "top left";
    frame.style.transform = `scale(${scale})`;

    frmDiv.style.width  = scaledW + "px";
    frmDiv.style.height = scaledH + (cfg.chrome ? 60 : 0) + "px";
    frmDiv.style.overflow = "hidden";

    if (chrTop) chrTop.style.display = cfg.chrome ? "flex" : "none";
    if (chrBot) chrBot.style.display = cfg.chrome ? "flex" : "none";
  }
}

function rotatePreview() {
  fpRotated = !fpRotated;
  setPreviewDevice(fpCurrentDevice);
}

document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const modal = document.getElementById("fullPreviewModal");
    if (modal && modal.style.display !== "none") closeFullPreview();
  }
});

window.addEventListener("resize", () => {
  const modal = document.getElementById("fullPreviewModal");
  if (modal && modal.style.display !== "none" && fpCurrentDevice !== "desktop") {
    setPreviewDevice(fpCurrentDevice);
  }
});
window.addEventListener("message", e => {
  if (e.data?.type === "console" && termOpen) {
    const lvl = e.data.level;
    const cls = lvl==="error"?"t-err":lvl==="warn"?"t-warn":"t-log";
    printTermLine(`<span class="${cls}">[preview] ${escTerm(e.data.msg)}</span>`);
  }
});