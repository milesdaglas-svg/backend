/* =========================
   TERMINAL v2 — 4 TABS
   1. BASH   — Linux shell (runs on Render server)
   2. CMD    — Windows CMD style commands
   3. VSC    — VS Code editor commands
   4. NODE   — Node.js REPL / JS sandbox
========================= */

const TERM_SERVER = "https://backend-forz.onrender.com";

let termOpen      = false;
let termCwd       = null;
let termActiveTab = "bash";

// Per-tab state
const termState = {
  bash: { history: [], histIdx: 0, output: [] },
  cmd:  { history: [], histIdx: 0, output: [] },
  vsc:  { history: [], histIdx: 0, output: [] },
  node: { history: [], histIdx: 0, output: [], ctx: {} }
};

// Load histories from localStorage
try {
  const saved = localStorage.getItem("term_histories_v2");
  if (saved) {
    const parsed = JSON.parse(saved);
    Object.keys(parsed).forEach(tab => {
      if (termState[tab]) {
        termState[tab].history = parsed[tab] || [];
        termState[tab].histIdx = termState[tab].history.length;
      }
    });
  }
} catch {}

function saveTermHistories() {
  try {
    const data = {};
    Object.keys(termState).forEach(t => { data[t] = termState[t].history.slice(-100); });
    localStorage.setItem("term_histories_v2", JSON.stringify(data));
  } catch {}
}

/* ══════════════════════
   HELPERS
══════════════════════ */
function escTerm(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function printLine(html, tab) {
  tab = tab || termActiveTab;
  const out = document.getElementById(`term-out-${tab}`);
  if (!out) return;
  const div = document.createElement("div");
  div.className = "term-line";
  div.innerHTML = html;
  out.appendChild(div);
  out.scrollTop = out.scrollHeight;
}

function clearTab(tab) {
  tab = tab || termActiveTab;
  const out = document.getElementById(`term-out-${tab}`);
  if (out) out.innerHTML = "";
  printWelcome(tab);
}

function getPS1(tab) {
  const ps1 = {
    bash: `<span class="t-ps1">user@godmode:~$</span>`,
    cmd:  `<span class="t-ps1-cmd">C:\\workspace&gt;</span>`,
    vsc:  `<span class="t-ps1-vsc">vscode &gt;</span>`,
    node: `<span class="t-ps1-node">node &gt;</span>`
  };
  return ps1[tab] || ps1.bash;
}

/* ══════════════════════
   WELCOME MESSAGES
══════════════════════ */
function printWelcome(tab) {
  const msgs = {
    bash: [
      `<span class="t-head">┌─────────────────────────────────────┐</span>`,
      `<span class="t-head">│  🐧 BASH TERMINAL  — Linux Shell    │</span>`,
      `<span class="t-head">└─────────────────────────────────────┘</span>`,
      `<span class="t-muted">Runs real commands on the server. Try: <span class="t-cmd">help</span></span>`,
      ``
    ],
    cmd: [
      `<span class="t-head-cmd">╔═════════════════════════════════════╗</span>`,
      `<span class="t-head-cmd">║  🪟 CMD TERMINAL — Windows Style    ║</span>`,
      `<span class="t-head-cmd">╚═════════════════════════════════════╝</span>`,
      `<span class="t-muted">Windows-style commands. Type <span class="t-cmd">help</span></span>`,
      ``
    ],
    vsc: [
      `<span class="t-head-vsc">╔═════════════════════════════════════╗</span>`,
      `<span class="t-head-vsc">║  💙 VS CODE TERMINAL — Editor Shell ║</span>`,
      `<span class="t-head-vsc">╚═════════════════════════════════════╝</span>`,
      `<span class="t-muted">Editor commands. Type <span class="t-cmd">help</span></span>`,
      ``
    ],
    node: [
      `<span class="t-head-node">╔═════════════════════════════════════╗</span>`,
      `<span class="t-head-node">║  🟢 NODE.JS REPL — JavaScript REPL  ║</span>`,
      `<span class="t-head-node">╚═════════════════════════════════════╝</span>`,
      `<span class="t-muted">Live JS execution. Try: <span class="t-cmd">2 + 2</span> or <span class="t-cmd">files</span></span>`,
      ``
    ]
  };
  (msgs[tab]||[]).forEach(m => printLine(m, tab));
}

/* ══════════════════════
   BASH COMMANDS
══════════════════════ */
const BASH_CMDS = {
  help: () => `
<span class="t-head">// BASH — Available Commands</span>

<span class="t-cmd">File System:</span>
  ls [dir]        — list files
  cat [file]      — print file contents
  touch [file]    — create file
  mkdir [dir]     — create folder
  rm [file]       — delete file
  mv [src] [dst]  — rename/move
  cp [src] [dst]  — copy file
  pwd             — current directory
  find [name]     — search files

<span class="t-cmd">Project:</span>
  sync            — push editor files to server
  pull-files      — pull server files to editor
  git clone [url] — clone a repo

<span class="t-cmd">Server:</span>
  npm install     — install packages
  npm start       — start dev server
  node [file]     — run Node.js file
  python [file]   — run Python script
  kill [port]     — stop a running server

<span class="t-cmd">System:</span>
  whoami          — user info
  date / uname    — system info
  ps              — running processes
  clear / cls     — clear terminal
  history         — command history`,

  ls: (args) => {
    const prefix = args[0] ? args[0].replace(/\/?$/, "/") : "";
    const fileList = typeof files !== "undefined" ? Object.keys(files) : [];
    const matching = fileList.filter(f => {
      if (!prefix) return !f.includes("/") || f.split("/").length === 2;
      return f.startsWith(prefix);
    }).filter(f => !f.endsWith("/.gitkeep"));
    if (!matching.length) return `<span class="t-err">ls: ${prefix||"."}: No such file or directory</span>`;
    const seen = new Set(); const out = [];
    matching.forEach(f => {
      const rel = prefix ? f.slice(prefix.length) : f;
      const part = rel.split("/")[0];
      if (seen.has(part)) return; seen.add(part);
      const isDir = matching.some(x => x.startsWith((prefix||"")+part+"/"));
      if (isDir) out.push(`<span class="t-dir">📁 ${part}/</span>`);
      else out.push(`<span class="t-file">${typeof getFileIcon==="function"?getFileIcon(part):"📄"} ${part}</span>`);
    });
    return `<span class="t-muted">total ${out.length}</span>\n` + out.join("\n");
  },

  cat: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: cat [file]</span>`;
    const content = typeof files !== "undefined" ? files[args[0]] : null;
    if (content === undefined) return `<span class="t-err">cat: ${args[0]}: No such file or directory</span>`;
    return `<span class="t-muted">// ${args[0]} (${String(content).split("\n").length} lines)</span>\n${escTerm(String(content))}`;
  },

  touch: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: touch [file]</span>`;
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    if (files[args[0]] !== undefined) return `<span class="t-warn">touch: ${args[0]}: already exists</span>`;
    files[args[0]] = "";
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ ${args[0]}</span>`;
  },

  mkdir: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: mkdir [dir]</span>`;
    files[args[0] + "/.gitkeep"] = "";
    if (typeof openFolders !== "undefined") openFolders.add(args[0]);
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ mkdir: created directory '${args[0]}'</span>`;
  },

  rm: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: rm [file]</span>`;
    if (typeof files === "undefined" || files[args[0]] === undefined)
      return `<span class="t-err">rm: ${args[0]}: No such file or directory</span>`;
    delete files[args[0]];
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ removed '${args[0]}'</span>`;
  },

  mv: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">Usage: mv [src] [dst]</span>`;
    if (files[args[0]] === undefined) return `<span class="t-err">mv: ${args[0]}: No such file or directory</span>`;
    files[args[1]] = files[args[0]]; delete files[args[0]];
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ '${args[0]}' → '${args[1]}'</span>`;
  },

  cp: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">Usage: cp [src] [dst]</span>`;
    if (files[args[0]] === undefined) return `<span class="t-err">cp: ${args[0]}: No such file or directory</span>`;
    files[args[1]] = files[args[0]];
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ '${args[0]}' → '${args[1]}'</span>`;
  },

  pwd: () => `<span class="t-path">${termCwd || "/workspace/vscodegodmode"}</span>`,

  find: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: find [name]</span>`;
    const q = args[0].toLowerCase();
    const found = typeof files !== "undefined" ? Object.keys(files).filter(f => f.toLowerCase().includes(q) && !f.endsWith("/.gitkeep")) : [];
    if (!found.length) return `<span class="t-warn">find: no matches for '${args[0]}'</span>`;
    return found.map(f => `<span class="t-file">./${f}</span>`).join("\n");
  },

  whoami: () => {
    const ua = navigator.userAgent;
    const dev = /Mobi|Android/i.test(ua) ? "📱 Mobile" : "💻 Desktop";
    return `<span class="t-info">user@vscodegodmode
uid=1000(user) gid=1000(user)
Device: ${dev}
Screen: ${screen.width}x${screen.height}
OS: ${navigator.platform}
Lang: ${navigator.language}
Online: ${navigator.onLine ? "yes" : "no"}</span>`;
  },

  uname: () => `<span class="t-info">Linux vscodegodmode 5.15.0-render x86_64 GNU/Linux</span>`,

  date: () => `<span class="t-info">${new Date().toString()}</span>`,

  ps: () => `<span class="t-info">  PID TTY          TIME CMD
    1 pts/0    00:00:00 bash
   42 pts/0    00:00:01 node
   99 pts/0    00:00:00 ps</span>`,

  history: (args, tab) => {
    const h = termState[tab||termActiveTab].history;
    return h.map((c,i) => `  <span class="t-muted">${String(i+1).padStart(4," ")}  ${escTerm(c)}</span>`).join("\n") || "No history";
  },

  echo: (args) => `<span class="t-log">${escTerm(args.join(" "))}</span>`,

  clear: () => { clearTab(termActiveTab); return ""; },
  cls:   () => { clearTab(termActiveTab); return ""; },
};

/* ══════════════════════
   CMD COMMANDS (Windows style)
══════════════════════ */
const CMD_CMDS = {
  help: () => `
<span class="t-head-cmd">// CMD — Windows Commands</span>

<span class="t-cmd">File System:</span>
  dir             — list files (like ls)
  dir [folder]    — list folder contents
  type [file]     — print file (like cat)
  copy [src] [dst]— copy file
  del [file]      — delete file
  ren [old] [new] — rename file
  md [dir]        — make directory
  rd [dir]        — remove directory
  cd [dir]        — change directory

<span class="t-cmd">System:</span>
  cls             — clear screen
  echo [text]     — print text
  set             — show variables
  ver             — version info
  whoami          — current user
  date /t         — current date
  time /t         — current time
  tasklist        — running processes

<span class="t-cmd">Network:</span>
  ping [host]     — ping host
  ipconfig        — network info`,

  dir: (args) => {
    const prefix = args[0] ? args[0].replace(/\\?\/?$/, "/").replace(/\\/g,"/") : "";
    const fileList = typeof files !== "undefined" ? Object.keys(files).filter(f => !f.endsWith("/.gitkeep")) : [];
    const matching = prefix ? fileList.filter(f => f.startsWith(prefix)) : fileList.filter(f => !f.includes("/"));
    const now = new Date().toLocaleDateString("en-US");
    let out = `<span class="t-muted"> Volume in drive C is VSCODEGODMODE\n Directory of C:\\workspace${prefix ? "\\"+prefix.slice(0,-1) : ""}\n\n${now}  &lt;DIR&gt;          .</span>\n`;
    const seen = new Set();
    matching.forEach(f => {
      const rel = prefix ? f.slice(prefix.length) : f;
      const part = rel.split("/")[0];
      if (seen.has(part)) return; seen.add(part);
      const isDir = matching.some(x => x.startsWith((prefix||"")+part+"/"));
      const size = (!isDir && files[f]) ? String(files[f]).length : 0;
      out += isDir
        ? `<span class="t-dir">${now}  &lt;DIR&gt;          ${part}</span>\n`
        : `<span class="t-file">${now}  ${String(size).padStart(14," ")} ${part}</span>\n`;
    });
    out += `<span class="t-muted">       ${seen.size} file(s)</span>`;
    return out;
  },

  type: (args) => {
    if (!args[0]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    const f = args[0].replace(/\\/g,"/");
    const content = typeof files !== "undefined" ? files[f] : null;
    if (content === undefined) return `<span class="t-err">The system cannot find the file specified.</span>`;
    return escTerm(String(content));
  },

  copy: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    const src = args[0].replace(/\\/g,"/"), dst = args[1].replace(/\\/g,"/");
    if (typeof files === "undefined" || files[src] === undefined) return `<span class="t-err">The system cannot find the file specified.</span>`;
    files[dst] = files[src];
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">        1 file(s) copied.</span>`;
  },

  del: (args) => {
    if (!args[0]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    const f = args[0].replace(/\\/g,"/");
    if (typeof files === "undefined" || files[f] === undefined) return `<span class="t-err">Could Not Find ${args[0]}</span>`;
    delete files[f];
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ Deleted</span>`;
  },

  ren: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    const src = args[0].replace(/\\/g,"/"), dst = args[1].replace(/\\/g,"/");
    if (files[src] === undefined) return `<span class="t-err">The system cannot find the file specified.</span>`;
    files[dst] = files[src]; delete files[src];
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ Renamed</span>`;
  },

  md: (args) => {
    if (!args[0]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    files[args[0].replace(/\\/g,"/") + "/.gitkeep"] = "";
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓</span>`;
  },

  rd: (args) => {
    if (!args[0]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    const prefix = args[0].replace(/\\/g,"/") + "/";
    Object.keys(files).filter(f => f.startsWith(prefix)).forEach(f => delete files[f]);
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓</span>`;
  },

  echo: (args) => `<span class="t-log">${escTerm(args.join(" "))}</span>`,

  set: () => `<span class="t-info">PATH=C:\\Windows\\system32;C:\\Windows
USERPROFILE=C:\\Users\\user
OS=Windows_NT
COMPUTERNAME=VSCODEGODMODE</span>`,

  ver: () => `<span class="t-info">Microsoft Windows [Version 10.0.19045.3570]</span>`,

  whoami: () => `<span class="t-info">vscodegodmode\\user</span>`,

  "date /t": () => `<span class="t-info">${new Date().toLocaleDateString()}</span>`,
  "time /t": () => `<span class="t-info">${new Date().toLocaleTimeString()}</span>`,

  tasklist: () => `<span class="t-info">Image Name         PID Session Name   Mem Usage
========================= ======== =============== ============
System Idle Process       0 Services           8 K
node.exe               1234 Console        45,234 K
chrome.exe             5678 Console       312,540 K</span>`,

  ipconfig: () => `<span class="t-info">Windows IP Configuration

Ethernet adapter Local:
   IPv4 Address: 10.0.0.${Math.floor(Math.random()*254)+1}
   Subnet Mask : 255.255.255.0
   Default Gateway: 10.0.0.1</span>`,

  cls: () => { clearTab("cmd"); return ""; },
  cls2: () => { clearTab("cmd"); return ""; },

  history: () => {
    const h = termState["cmd"].history;
    return h.map((c,i) => `  <span class="t-muted">${i+1}  ${escTerm(c)}</span>`).join("\n") || "No history";
  }
};

/* ══════════════════════
   VSC COMMANDS
══════════════════════ */
const VSC_CMDS = {
  help: () => `
<span class="t-head-vsc">// VS CODE — Editor Commands</span>

<span class="t-cmd">Files:</span>
  open [file]     — open file in editor
  new [file]      — create + open file
  close           — close current file
  rename [f] [n]  — rename file
  files           — list all files
  save            — save current file

<span class="t-cmd">Editor:</span>
  format          — format document
  lint            — lint current file
  theme [dark|light|hc] — change theme
  split [file]    — split editor with file
  run             — run preview
  fold / unfold   — fold all code

<span class="t-cmd">Workspace:</span>
  clear-storage   — reset workspace
  export          — download project ZIP
  sync            — sync to server
  stats           — workspace statistics

<span class="t-cmd">Find:</span>
  find [text]     — search in files
  replace [a] [b] — replace in current file`,

  open: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: open [file]</span>`;
    if (typeof files === "undefined" || files[args[0]] === undefined)
      return `<span class="t-err">Cannot open '${args[0]}': No such file</span>`;
    if (typeof openFile === "function") openFile(args[0]);
    return `<span class="t-ok-vsc">✓ Opened: ${args[0]}</span>`;
  },

  new: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: new [file]</span>`;
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    files[args[0]] = "";
    if (typeof renderFiles === "function") renderFiles();
    if (typeof openFile === "function") openFile(args[0]);
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok-vsc">✓ Created and opened: ${args[0]}</span>`;
  },

  save: () => {
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok-vsc">✓ Saved to storage</span>`;
  },

  files: () => {
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    const list = Object.keys(files).filter(f => !f.endsWith("/.gitkeep"));
    const totalSize = list.reduce((s,f) => s + String(files[f]||"").length, 0);
    return list.map(f => {
      const size = String(files[f]||"").length;
      return `  <span class="t-file">${f}</span><span class="t-muted"> (${size}b)</span>`;
    }).join("\n") + `\n<span class="t-muted">${list.length} files · ${totalSize} bytes total</span>`;
  },

  format: () => {
    if (window.editor1) { window.editor1.trigger("","editor.action.formatDocument",{}); return `<span class="t-ok-vsc">✓ Document formatted</span>`; }
    return `<span class="t-err">Editor not ready</span>`;
  },

  fold: () => {
    if (window.editor1) { window.editor1.trigger("","editor.foldAll",{}); return `<span class="t-ok-vsc">✓ All folded</span>`; }
    return `<span class="t-err">Editor not ready</span>`;
  },

  unfold: () => {
    if (window.editor1) { window.editor1.trigger("","editor.unfoldAll",{}); return `<span class="t-ok-vsc">✓ All unfolded</span>`; }
    return `<span class="t-err">Editor not ready</span>`;
  },

  lint: () => {
    if (!window.editor1) return `<span class="t-err">Editor not ready</span>`;
    const code = window.editor1.getValue();
    const issues = [];
    if (code.includes("var ")) issues.push(`⚠ Use 'let'/'const' instead of 'var'`);
    if (code.includes("==") && !code.includes("===")) issues.push("⚠ Use '===' instead of '=='");
    if (code.includes("eval(")) issues.push("⚠ Avoid eval()");
    if (code.includes("console.log")) issues.push("ℹ console.log found");
    if (!issues.length) return `<span class="t-ok-vsc">✓ No issues found</span>`;
    return issues.map(i=>`<span class="t-warn">${i}</span>`).join("\n");
  },

  theme: (args) => {
    const map = { dark:"vs-dark", light:"vs", hc:"hc-black" };
    if (!args[0] || !map[args[0]]) return `<span class="t-err">Usage: theme [dark|light|hc]</span>`;
    if (window.monaco) { monaco.editor.setTheme(map[args[0]]); return `<span class="t-ok-vsc">✓ Theme: ${args[0]}</span>`; }
    return `<span class="t-err">Monaco not ready</span>`;
  },

  run: () => {
    if (typeof updatePreview === "function" && typeof currentFile !== "undefined") {
      updatePreview(currentFile);
      return `<span class="t-ok-vsc">▶ Running: ${currentFile}</span>`;
    }
    return `<span class="t-err">Preview not available</span>`;
  },

  split: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: split [file]</span>`;
    if (typeof openInSplitFromSidebar === "function") { openInSplitFromSidebar(args[0]); return `<span class="t-ok-vsc">✓ Split view: ${args[0]}</span>`; }
    return `<span class="t-err">Split not available</span>`;
  },

  find: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: find [text]</span>`;
    const q = args[0].toLowerCase(); let results = [];
    if (typeof files !== "undefined") {
      Object.keys(files).forEach(f => {
        const lines = String(files[f]||"").split("\n");
        lines.forEach((line, i) => {
          if (line.toLowerCase().includes(q))
            results.push(`<span class="t-file">${f}</span><span class="t-muted">:${i+1}</span>  ${escTerm(line.trim().slice(0,60))}`);
        });
      });
    }
    if (!results.length) return `<span class="t-warn">No results for '${args[0]}'</span>`;
    return results.slice(0,30).join("\n") + (results.length>30 ? `\n<span class="t-muted">...and ${results.length-30} more</span>` : "");
  },

  replace: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">Usage: replace [find] [replacement]</span>`;
    if (!window.editor1) return `<span class="t-err">Editor not ready</span>`;
    const code = window.editor1.getValue();
    const newCode = code.split(args[0]).join(args[1]);
    const count = code.split(args[0]).length - 1;
    window.editor1.setValue(newCode);
    if (typeof currentFile !== "undefined" && typeof files !== "undefined") files[currentFile] = newCode;
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok-vsc">✓ Replaced ${count} occurrence(s)</span>`;
  },

  stats: () => {
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    const list = Object.keys(files).filter(f => !f.endsWith("/.gitkeep"));
    const totalSize = list.reduce((s,f) => s + String(files[f]||"").length, 0);
    const types = {};
    list.forEach(f => { const ext = f.split(".").pop(); types[ext] = (types[ext]||0)+1; });
    return `<span class="t-info">📊 Workspace Stats
Files: ${list.length}
Total size: ${(totalSize/1024).toFixed(1)} KB
Types: ${Object.entries(types).map(([e,c])=>`${e}(${c})`).join(", ")}</span>`;
  },

  export: () => {
    if (typeof downloadProjectZip === "function") { downloadProjectZip(); return `<span class="t-ok-vsc">✓ Downloading ZIP...</span>`; }
    return `<span class="t-err">Export not available</span>`;
  },

  sync: async () => `<span class="t-info">⟳ Use bash tab for sync</span>`,

  "clear-storage": () => {
    if (!confirm("Reset ALL workspace files? This cannot be undone.")) return `<span class="t-warn">Cancelled</span>`;
    localStorage.removeItem("vscode_files");
    location.reload();
    return "";
  },

  history: () => {
    const h = termState["vsc"].history;
    return h.map((c,i) => `  <span class="t-muted">${i+1}  ${escTerm(c)}</span>`).join("\n") || "No history";
  },

  clear: () => { clearTab("vsc"); return ""; }
};

/* ══════════════════════
   NODE REPL
══════════════════════ */
const nodeCtx = {};  // persistent variables across commands

function runNodeREPL(code) {
  const logs = [];
  const fakeConsole = {
    log:   (...a) => logs.push(`<span class="t-log">${escTerm(a.map(x=>typeof x==="object"?JSON.stringify(x,null,2):String(x)).join(" "))}</span>`),
    error: (...a) => logs.push(`<span class="t-err">✗ ${escTerm(a.join(" "))}</span>`),
    warn:  (...a) => logs.push(`<span class="t-warn">⚠ ${escTerm(a.join(" "))}</span>`),
    info:  (...a) => logs.push(`<span class="t-info">${escTerm(a.join(" "))}</span>`),
    table: (data) => logs.push(`<span class="t-log">${escTerm(JSON.stringify(data,null,2))}</span>`)
  };

  // special keywords
  if (code.trim() === "files") {
    if (typeof files === "undefined") return `<span class="t-err">files not available</span>`;
    return `<span class="t-result">${escTerm(JSON.stringify(Object.keys(files),null,2))}</span>`;
  }
  if (code.trim() === ".clear") { clearTab("node"); return ""; }
  if (code.trim() === ".help") return `<span class="t-info">.clear  — clear REPL
.ctx    — show context vars
files   — list project files
Any JS expression is evaluated live.</span>`;
  if (code.trim() === ".ctx") return `<span class="t-result">${escTerm(JSON.stringify(Object.keys(nodeCtx),null,2))}</span>`;

  try {
    // wrap in async so await works
    const fn = new Function(
      "console","files","currentFile","ctx","require",
      `"use strict";\nwith(ctx){\n${code}\n}`
    );
    const fakeRequire = (mod) => { throw new Error(`Cannot require '${mod}' in browser REPL`); };
    const result = fn(
      fakeConsole,
      typeof files !== "undefined" ? files : {},
      typeof currentFile !== "undefined" ? currentFile : "",
      nodeCtx,
      fakeRequire
    );

    const out = [...logs];
    if (result !== undefined)
      out.push(`<span class="t-result">← ${escTerm(JSON.stringify(result, null, 2))}</span>`);
    return out.join("\n") || `<span class="t-ok-node">✓ undefined</span>`;
  } catch(e) {
    return `<span class="t-err">✗ ${escTerm(e.message)}</span>`;
  }
}

/* ══════════════════════
   SERVER COMMANDS
   (used by bash tab for real execution)
══════════════════════ */
async function runServerCommand(command, tab) {
  tab = tab || "bash";
  const cmd = command.trim().split(" ")[0].toLowerCase();

  if (command === "sync") {
    printLine(`<span class="t-info">⟳ Syncing files to server...</span>`, tab);
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/sync", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ files: window.files || {} })
      });
      const d = await r.json();
      printLine(`<span class="t-ok">✓ Synced ${d.synced} files</span>`, tab);
    } catch(e) { printLine(`<span class="t-err">✗ Sync failed: ${escTerm(e.message)}</span>`, tab); }
    return;
  }

  if (command === "pull-files") {
    printLine(`<span class="t-info">⟳ Pulling files from server...</span>`, tab);
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/listfiles");
      const d = await r.json();
      if (d.files && Object.keys(d.files).length) {
        Object.assign(window.files, d.files);
        if (typeof saveToStorage === "function") saveToStorage();
        if (typeof renderFiles === "function") renderFiles();
        if (typeof renderTabs === "function") renderTabs();
        printLine(`<span class="t-ok">✓ Pulled ${Object.keys(d.files).length} files</span>`, tab);
      } else { printLine(`<span class="t-warn">No files on server — run sync first</span>`, tab); }
    } catch(e) { printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, tab); }
    return;
  }

  if (cmd === "cd") {
    const target = command.slice(3).trim();
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/exec", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ command: `cd ${target} && pwd`, cwd: termCwd })
      });
      const d = await r.json();
      if (d.stdout && !d.error) { termCwd = d.stdout.trim(); printLine(`<span class="t-ok">✓ ${escTerm(termCwd)}</span>`, tab); }
      else printLine(`<span class="t-err">✗ cd: ${escTerm(target)}: No such directory</span>`, tab);
    } catch(e) { printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, tab); }
    return;
  }

  // auto-sync before npm/node
  if (/^(npm|node|npx|python|python3)/.test(command)) {
    printLine(`<span class="t-info">⟳ Syncing files first...</span>`, tab);
    try {
      const sr = await fetch(TERM_SERVER + "/api/terminal/sync", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ files: window.files || {} })
      });
      const sd = await sr.json();
      printLine(`<span class="t-ok">✓ Synced ${sd.synced} files</span>`, tab);
    } catch(e) { printLine(`<span class="t-warn">⚠ Sync failed: ${escTerm(e.message)}</span>`, tab); }
  }

  // server-start commands
  const isServerStart = /^(node\s+\S+|npm\s+start|npm\s+run|python\s+\S+|python3\s+\S+|php\s+-S|ruby|bun\s+run)/.test(command);
  if (isServerStart) {
    const portMatch = command.match(/--port[= ](\d+)|-p\s*(\d+)|PORT=(\d+)/);
    const port = portMatch ? parseInt(portMatch[1]||portMatch[2]||portMatch[3]) : 3000;
    printLine(`<span class="t-info">⟳ Starting server on port ${port}...</span>`, tab);
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/start", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ command, port, cwd: termCwd })
      });
      const d = await r.json();
      if (d.logs) printLine(`<span class="t-log">${escTerm(d.logs)}</span>`, tab);
      printLine(`
        <span class="t-ok">✓ Server started (PID: ${d.pid}) on port ${port}</span>
        <br><a href="${d.previewUrl}" target="_blank" style="color:#58a6ff;text-decoration:underline;">
          🌐 ${d.previewUrl}
        </a>
        <br><button onclick="openServerPreview('${d.previewUrl}')"
          style="margin-top:6px;padding:5px 14px;background:#1f6feb;color:white;border:none;border-radius:5px;cursor:pointer;font-size:11px;">
          ▶ Open Preview
        </button>
        <button onclick="killServer(${port})"
          style="margin-left:6px;padding:5px 14px;background:#3a1010;color:#ff5050;border:1px solid #ff505044;border-radius:5px;cursor:pointer;font-size:11px;">
          ✕ Stop
        </button>`, tab);
    } catch(e) { printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, tab); }
    return;
  }

  // spinner
  const runId = "run-" + Date.now();
  printLine(`<span id="${runId}" class="t-muted">⠋ running...</span>`, tab);
  const frames = ["⠋","⠙","⠹","⠸","⠼","⠴","⠦","⠧","⠇","⠏"];
  let fi = 0;
  const spinner = setInterval(() => {
    const el = document.getElementById(runId);
    if (el) el.innerHTML = `<span class="t-muted">${frames[fi++%frames.length]} running...</span>`;
  }, 120);

  try {
    const r = await fetch(TERM_SERVER + "/api/terminal/exec", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ command, cwd: termCwd })
    });
    const d = await r.json();
    clearInterval(spinner);
    document.getElementById(runId)?.remove();

    if (d.stdout) d.stdout.split("\n").forEach(line => { if(line.trim()) printLine(`<span class="t-log">${escTerm(line)}</span>`, tab); });
    if (d.stderr) d.stderr.split("\n").forEach(line => {
      if(line.trim()) {
        const isErr = /error|failed|not found/i.test(line);
        printLine(`<span class="${isErr?"t-err":"t-warn"}">${escTerm(line)}</span>`, tab);
      }
    });
    if (d.error && !d.stderr) printLine(`<span class="t-err">✗ ${escTerm(d.error)}</span>`, tab);
    if (!d.stdout && !d.stderr && !d.error) printLine(`<span class="t-ok">✓ Done (exit 0)</span>`, tab);

    // after git clone / npm install — pull files
    if (/^(npm install|npm i|git clone|npx create|npx)/.test(command)) {
      printLine(`<span class="t-info">⟳ Scanning server for files...</span>`, tab);
      if (command.startsWith("git clone")) {
        const urlMatch = command.match(/git clone\s+\S+\/([\w.-]+?)(?:\.git)?\s*$/);
        if (urlMatch) {
          termCwd = `/tmp/vscode_godmode_project/${urlMatch[1]}`;
          printLine(`<span class="t-info">📁 Reading: ${escTerm(termCwd)}</span>`, tab);
        }
      }
      setTimeout(async () => {
        try {
          const r2 = await fetch(TERM_SERVER + "/api/terminal/listfiles?cwd=" + encodeURIComponent(termCwd||""));
          const d2 = await r2.json();
          if (d2.files && Object.keys(d2.files).length) {
            let count = 0;
            Object.keys(d2.files).forEach(f => {
              if (f.includes("node_modules/")) return;
              if (!window.files) window.files = {};
              window.files[f] = d2.files[f]; count++;
            });
            if (typeof saveToStorage==="function") saveToStorage();
            if (typeof renderFiles==="function") renderFiles();
            if (typeof renderTabs==="function") renderTabs();
            const htmlFile = Object.keys(d2.files).find(f => f.endsWith(".html") && !f.includes("node_modules"));
            if (htmlFile && typeof openFile==="function") openFile(htmlFile);
            printLine(`<span class="t-ok">✓ ${count} files loaded into editor</span>`, tab);
            if (typeof showToast==="function") showToast(`✓ ${count} files loaded`, "success");
          } else { printLine(`<span class="t-warn">⚠ No files found — try 'pull-files'</span>`, tab); }
        } catch(e) { printLine(`<span class="t-err">✗ File sync failed: ${escTerm(e.message)}</span>`, tab); }
      }, 2500);
    }
  } catch(e) {
    clearInterval(spinner);
    document.getElementById(runId)?.remove();
    printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, tab);
  }
}

/* ══════════════════════
   EXECUTE COMMAND — ROUTER
══════════════════════ */
function execTermCommand(raw, tab) {
  tab = tab || termActiveTab;
  const trimmed = raw.trim();
  if (!trimmed) return;

  // save to history
  const state = termState[tab];
  state.history.push(trimmed);
  if (state.history.length > 200) state.history.shift();
  state.histIdx = state.history.length;
  saveTermHistories();

  // print the prompt + command
  printLine(`${getPS1(tab)} <span class="t-input-echo">${escTerm(trimmed)}</span>`, tab);

  const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const cmd   = parts[0]?.toLowerCase();
  const args  = parts.slice(1).map(a => a.replace(/^["']|["']$/g,""));

  if (tab === "bash") {
    if (cmd === "clear" || cmd === "cls") { clearTab("bash"); return; }
    if (cmd === "history") { const r = BASH_CMDS.history(args, "bash"); if(r) printLine(r, "bash"); return; }
    if (BASH_CMDS[cmd]) {
      const result = BASH_CMDS[cmd](args);
      if (result) printLine(result, "bash");
    } else {
      // send to real server
      runServerCommand(trimmed, "bash");
    }
    return;
  }

  if (tab === "cmd") {
    // handle "dir /w", "date /t" etc
    const cmdFull = (cmd + (args[0]&&args[0].startsWith("/")?(" "+args[0]):"")).toLowerCase();
    if (cmdFull === "cls" || cmd === "cls") { clearTab("cmd"); return; }
    if (CMD_CMDS[cmdFull]) { const r = CMD_CMDS[cmdFull](args.slice(1)); if(r) printLine(r, "cmd"); return; }
    if (CMD_CMDS[cmd]) { const r = CMD_CMDS[cmd](args); if(r) printLine(r, "cmd"); return; }
    // unknown CMD command
    printLine(`<span class="t-err">'${escTerm(cmd)}' is not recognized as an internal or external command.</span>`, "cmd");
    return;
  }

  if (tab === "vsc") {
    if (cmd === "clear" || cmd === "cls") { clearTab("vsc"); return; }
    if (VSC_CMDS[cmd]) { const r = VSC_CMDS[cmd](args); if(r) printLine(r, "vsc"); return; }
    printLine(`<span class="t-err">vscode: command not found: ${escTerm(cmd)}</span>`, "vsc");
    return;
  }

  if (tab === "node") {
    if (trimmed === ".clear") { clearTab("node"); return; }
    const result = runNodeREPL(trimmed);
    if (result) printLine(result, "node");
    return;
  }
}

/* ══════════════════════
   SWITCH TAB
══════════════════════ */
function switchTermTab(tab) {
  termActiveTab = tab;
  // update tab buttons
  document.querySelectorAll(".term-tab-btn").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
  // show/hide outputs
  document.querySelectorAll(".term-tab-pane").forEach(p => {
    p.style.display = p.dataset.tab === tab ? "flex" : "none";
  });
  // focus input
  document.getElementById(`term-input-${tab}`)?.focus();
}

/* ══════════════════════
   BUILD TERMINAL UI
══════════════════════ */
function buildTerminal() {
  const container = document.getElementById("terminalPanel");
  if (!container) return;

  const tabs = [
    { id:"bash", label:"🐧 Bash",   color:"#00ff88" },
    { id:"cmd",  label:"🪟 CMD",    color:"#00d4ff" },
    { id:"vsc",  label:"💙 VSCode", color:"#007acc" },
    { id:"node", label:"🟢 Node",   color:"#68d391"  }
  ];

  container.innerHTML = `
    <div class="term-titlebar">
      <div class="term-dots">
        <span class="term-dot red"></span>
        <span class="term-dot yellow"></span>
        <span class="term-dot green"></span>
      </div>
      <div class="term-tabs-row">
        ${tabs.map(t => `
          <button class="term-tab-btn${termActiveTab===t.id?" active":""}"
            data-tab="${t.id}"
            style="--tab-color:${t.color}"
            onclick="switchTermTab('${t.id}')">
            ${t.label}
          </button>`).join("")}
      </div>
      <div class="term-actions">
        <button class="term-btn" onclick="clearTab(termActiveTab)">⌫ Clear</button>
        <button class="term-btn" onclick="toggleTerminal()">✕</button>
      </div>
    </div>

    ${tabs.map(t => `
      <div class="term-tab-pane" data-tab="${t.id}" style="display:${termActiveTab===t.id?"flex":"none"};flex-direction:column;flex:1;min-height:0;">
        <div class="term-output" id="term-out-${t.id}"></div>
        <div class="term-input-row">
          ${t.id==="bash" ? `<span class="t-ps1">user@godmode:~$</span>` :
            t.id==="cmd"  ? `<span class="t-ps1-cmd">C:\\workspace&gt;</span>` :
            t.id==="vsc"  ? `<span class="t-ps1-vsc">vscode &gt;</span>` :
                            `<span class="t-ps1-node">node &gt;</span>`}
          <input
            id="term-input-${t.id}"
            class="term-input"
            type="text"
            placeholder="${t.id==="node"?"JS expression or .help...":"type a command..."}"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"
          >
        </div>
      </div>`).join("")}`;

  // print welcome for each tab
  tabs.forEach(t => printWelcome(t.id));

  // wire up inputs
  tabs.forEach(t => {
    const input = document.getElementById(`term-input-${t.id}`);
    if (!input) return;
    const state = termState[t.id];

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        execTermCommand(input.value, t.id);
        input.value = "";
        state.histIdx = state.history.length;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (state.histIdx > 0) { state.histIdx--; input.value = state.history[state.histIdx]||""; }
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (state.histIdx < state.history.length-1) { state.histIdx++; input.value = state.history[state.histIdx]||""; }
        else { state.histIdx = state.history.length; input.value = ""; }
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const val = input.value.trim();
        const parts = val.split(" ");
        const cmdMap = t.id==="bash"?BASH_CMDS : t.id==="cmd"?CMD_CMDS : t.id==="vsc"?VSC_CMDS : {};
        if (parts.length === 1) {
          const matches = Object.keys(cmdMap).filter(c => c.startsWith(val));
          if (matches.length === 1) input.value = matches[0] + " ";
          else if (matches.length > 1) printLine(`<span class="t-muted">${matches.join("  ")}</span>`, t.id);
        } else if (parts.length === 2 && ["cat","open","rm","mv","cp","type","del","ren"].includes(parts[0])) {
          const fileList = typeof files !== "undefined" ? Object.keys(files).filter(f=>!f.endsWith("/.gitkeep")) : [];
          const matches = fileList.filter(f => f.startsWith(parts[1]));
          if (matches.length === 1) input.value = parts[0] + " " + matches[0];
          else if (matches.length > 1) printLine(`<span class="t-muted">${matches.join("  ")}</span>`, t.id);
        }
      }
      if (e.key==="l" && e.ctrlKey) { e.preventDefault(); clearTab(t.id); }
      if (e.key==="c" && e.ctrlKey) { input.value=""; printLine(`<span class="t-muted">^C</span>`, t.id); }
    });
  });

  // focus active tab input
  document.getElementById(`term-input-${termActiveTab}`)?.focus();
}

/* ══════════════════════
   SERVER PREVIEW HELPERS
══════════════════════ */
function openServerPreview(url) {
  const iframe = document.getElementById("previewFrame");
  if (iframe) {
    iframe.src = url;
    const preview = document.getElementById("preview");
    if (preview) preview.classList.remove("collapsed","hidden");
    if (typeof showToast === "function") showToast("Preview opened ✓", "success");
  } else {
    window.open(url, "_blank");
  }
}

async function killServer(port) {
  try {
    const r = await fetch(TERM_SERVER + "/api/terminal/kill", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ port })
    });
    const d = await r.json();
    printLine(`<span class="t-warn">✓ ${escTerm(d.message)}</span>`, termActiveTab);
  } catch(e) {
    printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, termActiveTab);
  }
}

/* ══════════════════════
   TOGGLE
══════════════════════ */
function toggleTerminal() {
  const panel = document.getElementById("terminalPanel");
  if (!panel) return;
  termOpen = !termOpen;
  panel.style.height = termOpen ? "280px" : "0px";
  panel.style.borderTopWidth = termOpen ? "2px" : "0px";
  if (termOpen) {
    buildTerminal();
    document.getElementById(`term-input-${termActiveTab}`)?.focus();
  }
  const btn = document.getElementById("terminalToggleBtn");
  if (btn) btn.classList.toggle("active", termOpen);
}