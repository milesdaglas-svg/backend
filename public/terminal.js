/* =========================
   TERMINAL v3 — 5 TABS
   1. BASH   — Linux shell (runs on Render server)
   2. CMD    — Windows CMD style commands
   3. VSC    — VS Code editor commands
   4. NODE   — Node.js REPL / JS sandbox
   5. SHELL  — Real PTY via xterm.js + WebSocket
========================= */

const TERM_SERVER = "https://backend-forz.onrender.com";

let termOpen      = false;
let termCwd       = null;
let termActiveTab = "bash";

/* ══════════════════════
   DEVICE FILESYSTEM
   File System Access API (browser) OR
   Capacitor Filesystem (real APK)
══════════════════════ */
const isNativeApp = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
let nativeCwdPath = "";
let deviceRootHandle = null;
let deviceCwd        = null;
let deviceCwdPath    = "";
let deviceMode       = false;

/* ══════════════════════
   PTY STATE
══════════════════════ */
let ptyTerm = null;
let ptyWs   = null;
let ptyFit  = null;

let vmTerm  = null;
let vmWs    = null;
let vmFit   = null;
let vmCodespaceName = null;

// Per-tab state
const termState = {
  bash: { history: [], histIdx: 0 },
  cmd:  { history: [], histIdx: 0 },
  vsc:  { history: [], histIdx: 0 },
  node: { history: [], histIdx: 0 }
};

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
  if (tab !== "pty") printWelcome(tab);
}

function getPS1(tab) {
  const shortPath = termCwd ? termCwd.replace("/tmp/vscode_godmode_project","~") : "~";
  const devicePath = deviceMode ? `device:/${deviceCwdPath}` : shortPath;
  const ps1 = {
    bash: `<span class="t-ps1">user@godmode:${devicePath}$</span>`,
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
      `<span class="t-muted">Server mode: real commands on Render. Try: <span class="t-cmd">ls</span> or <span class="t-cmd">git clone [url]</span></span>`,
      `<span class="t-muted">📁 Device mode: click <span class="t-cmd">Mount</span> to navigate your real phone/PC files</span>`,
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

<span class="t-cmd">Device:</span>
  mount           — mount your phone/PC folder
  unmount         — back to server mode

<span class="t-cmd">System:</span>
  whoami          — user info
  date / uname    — system info
  ps              — running processes
  clear           — clear terminal
  history         — command history`,

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
  uname:   () => `<span class="t-info">Linux vscodegodmode 5.15.0-render x86_64 GNU/Linux</span>`,
  date:    () => `<span class="t-info">${new Date().toString()}</span>`,
  pwd:     () => `<span class="t-path">${termCwd || "/workspace/vscodegodmode"}</span>`,
  echo:    (args) => `<span class="t-log">${escTerm(args.join(" "))}</span>`,
  clear:   () => { clearTab("bash"); return ""; },
  cls:     () => { clearTab("bash"); return ""; },
  history: (args, tab) => {
    const h = termState[tab||"bash"].history;
    return h.map((c,i) => `  <span class="t-muted">${String(i+1).padStart(4," ")}  ${escTerm(c)}</span>`).join("\n") || "No history";
  },
  ps: () => `<span class="t-info">  PID TTY          TIME CMD
    1 pts/0    00:00:00 bash
   42 pts/0    00:00:01 node
   99 pts/0    00:00:00 ps</span>`,

  ls: (args) => {
    if (termCwd) { runServerCommand("ls -la " + (args[0]||""), "bash"); return ""; }
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
      else out.push(`<span class="t-file">📄 ${part}</span>`);
    });
    return `<span class="t-muted">total ${out.length}</span>\n` + out.join("\n");
  },

  cat: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: cat [file]</span>`;
    if (termCwd) { runServerCommand("cat " + args[0], "bash"); return ""; }
    const content = typeof files !== "undefined" ? files[args[0]] : null;
    if (content === undefined) return `<span class="t-err">cat: ${args[0]}: No such file</span>`;
    return `<span class="t-muted">// ${args[0]}</span>\n${escTerm(String(content))}`;
  },

  touch: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: touch [file]</span>`;
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    files[args[0]] = "";
    window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ ${args[0]}</span>`;
  },

  mkdir: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: mkdir [dir]</span>`;
    if (termCwd) { runServerCommand("mkdir -p " + args[0], "bash"); return ""; }
    files[args[0] + "/.gitkeep"] = "";
    window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ mkdir '${args[0]}'</span>`;
  },

  rm: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: rm [file]</span>`;
    if (termCwd) { runServerCommand("rm -rf " + args[0], "bash"); return ""; }
    if (typeof files === "undefined" || files[args[0]] === undefined)
      return `<span class="t-err">rm: ${args[0]}: No such file</span>`;
    delete files[args[0]];
    window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ removed '${args[0]}'</span>`;
  },

  mv: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">Usage: mv [src] [dst]</span>`;
    if (termCwd) { runServerCommand(`mv ${args[0]} ${args[1]}`, "bash"); return ""; }
    if (files[args[0]] === undefined) return `<span class="t-err">mv: ${args[0]}: No such file</span>`;
    files[args[1]] = files[args[0]]; delete files[args[0]];
    window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ '${args[0]}' → '${args[1]}'</span>`;
  },

  cp: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">Usage: cp [src] [dst]</span>`;
    if (termCwd) { runServerCommand(`cp ${args[0]} ${args[1]}`, "bash"); return ""; }
    if (files[args[0]] === undefined) return `<span class="t-err">cp: ${args[0]}: No such file</span>`;
    files[args[1]] = files[args[0]];
    window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ '${args[0]}' → '${args[1]}'</span>`;
  },

  find: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: find [name]</span>`;
    if (termCwd) { runServerCommand(`find . -name "*${args[0]}*"`, "bash"); return ""; }
    const q = args[0].toLowerCase();
    const found = typeof files !== "undefined" ? Object.keys(files).filter(f => f.toLowerCase().includes(q) && !f.endsWith("/.gitkeep")) : [];
    if (!found.length) return `<span class="t-warn">find: no matches for '${args[0]}'</span>`;
    return found.map(f => `<span class="t-file">./${f}</span>`).join("\n");
  }
};

/* ══════════════════════
   CMD COMMANDS
══════════════════════ */
const CMD_CMDS = {
  help: () => `
<span class="t-head-cmd">// CMD — Windows Commands</span>
  dir             — list files
  type [file]     — print file contents
  copy [src] [dst]— copy file
  del [file]      — delete file
  ren [old] [new] — rename file
  md [dir]        — make directory
  rd [dir]        — remove directory
  cls             — clear screen
  echo [text]     — print text
  set             — show variables
  ver             — version info
  whoami          — current user
  tasklist        — running processes
  ipconfig        — network info`,

  dir: (args) => {
    const prefix = args[0] ? args[0].replace(/\\?\/?$/, "/").replace(/\\/g,"/") : "";
    const fileList = typeof files !== "undefined" ? Object.keys(files).filter(f => !f.endsWith("/.gitkeep")) : [];
    const matching = prefix ? fileList.filter(f => f.startsWith(prefix)) : fileList.filter(f => !f.includes("/"));
    const now = new Date().toLocaleDateString("en-US");
    let out = `<span class="t-muted"> Volume in drive C is VSCODEGODMODE\n Directory of C:\\workspace\n\n${now}  &lt;DIR&gt;  .</span>\n`;
    const seen = new Set();
    matching.forEach(f => {
      const rel = prefix ? f.slice(prefix.length) : f;
      const part = rel.split("/")[0];
      if (seen.has(part)) return; seen.add(part);
      const isDir = matching.some(x => x.startsWith((prefix||"")+part+"/"));
      const size = (!isDir && files[f]) ? String(files[f]).length : 0;
      out += isDir
        ? `<span class="t-dir">${now}  &lt;DIR&gt;  ${part}</span>\n`
        : `<span class="t-file">${now}  ${String(size).padStart(10," ")}  ${part}</span>\n`;
    });
    out += `<span class="t-muted">  ${seen.size} file(s)</span>`;
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
    if (!files[src]) return `<span class="t-err">The system cannot find the file specified.</span>`;
    files[dst] = files[src]; window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">  1 file(s) copied.</span>`;
  },
  del: (args) => {
    if (!args[0]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    const f = args[0].replace(/\\/g,"/");
    if (!files[f]) return `<span class="t-err">Could Not Find ${args[0]}</span>`;
    delete files[f]; window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ Deleted</span>`;
  },
  ren: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    const src = args[0].replace(/\\/g,"/"), dst = args[1].replace(/\\/g,"/");
    if (!files[src]) return `<span class="t-err">The system cannot find the file specified.</span>`;
    files[dst] = files[src]; delete files[src]; window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓ Renamed</span>`;
  },
  md: (args) => {
    if (!args[0]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    files[args[0].replace(/\\/g,"/") + "/.gitkeep"] = ""; window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓</span>`;
  },
  rd: (args) => {
    if (!args[0]) return `<span class="t-err">The syntax of the command is incorrect.</span>`;
    const prefix = args[0].replace(/\\/g,"/") + "/";
    Object.keys(files).filter(f => f.startsWith(prefix)).forEach(f => delete files[f]);
    window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok">✓</span>`;
  },
  echo:    (args) => `<span class="t-log">${escTerm(args.join(" "))}</span>`,
  set:     () => `<span class="t-info">PATH=C:\\Windows\\system32\nOS=Windows_NT\nCOMPUTERNAME=VSCODEGODMODE</span>`,
  ver:     () => `<span class="t-info">Microsoft Windows [Version 10.0.19045]</span>`,
  whoami:  () => `<span class="t-info">vscodegodmode\\user</span>`,
  tasklist:() => `<span class="t-info">System      0  Services   8 K\nnode.exe  1234  Console  45,234 K</span>`,
  ipconfig:() => `<span class="t-info">Ethernet:\n  IPv4: 10.0.0.${Math.floor(Math.random()*254)+1}\n  Mask: 255.255.255.0</span>`,
  cls:     () => { clearTab("cmd"); return ""; },
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
  open [file]     — open file in editor
  new [file]      — create + open file
  save            — save current file
  files           — list all files
  format          — format document
  lint            — lint current file
  theme [dark|light|hc] — change theme
  split [file]    — split editor
  run             — run preview
  fold / unfold   — fold all code
  find [text]     — search in files
  replace [a] [b] — replace in current file
  stats           — workspace statistics
  export          — download project ZIP
  clear-storage   — reset workspace
  clear           — clear terminal`,

  open: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: open [file]</span>`;
    if (typeof files === "undefined" || files[args[0]] === undefined)
      return `<span class="t-err">Cannot open '${args[0]}': No such file</span>`;
    if (typeof openFile === "function") openFile(args[0]);
    return `<span class="t-ok-vsc">✓ Opened: ${args[0]}</span>`;
  },
  new: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: new [file]</span>`;
    files[args[0]] = ""; window.files = files;
    if (typeof renderFiles === "function") renderFiles();
    if (typeof openFile === "function") openFile(args[0]);
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok-vsc">✓ Created and opened: ${args[0]}</span>`;
  },
  save: () => {
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok-vsc">✓ Saved</span>`;
  },
  files: () => {
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    const list = Object.keys(files).filter(f => !f.endsWith("/.gitkeep"));
    const totalSize = list.reduce((s,f) => s + String(files[f]||"").length, 0);
    return list.map(f => `  <span class="t-file">${f}</span><span class="t-muted"> (${String(files[f]||"").length}b)</span>`).join("\n")
      + `\n<span class="t-muted">${list.length} files · ${totalSize} bytes</span>`;
  },
  format: () => {
    if (window.editor1) { window.editor1.trigger("","editor.action.formatDocument",{}); return `<span class="t-ok-vsc">✓ Formatted</span>`; }
    return `<span class="t-err">Editor not ready</span>`;
  },
  fold:   () => { if (window.editor1) { window.editor1.trigger("","editor.foldAll",{}); return `<span class="t-ok-vsc">✓ Folded</span>`; } return `<span class="t-err">Editor not ready</span>`; },
  unfold: () => { if (window.editor1) { window.editor1.trigger("","editor.unfoldAll",{}); return `<span class="t-ok-vsc">✓ Unfolded</span>`; } return `<span class="t-err">Editor not ready</span>`; },
  lint: () => {
    if (!window.editor1) return `<span class="t-err">Editor not ready</span>`;
    const code = window.editor1.getValue();
    const issues = [];
    if (code.includes("var ")) issues.push("⚠ Use 'let'/'const' instead of 'var'");
    if (code.includes("==") && !code.includes("===")) issues.push("⚠ Use '===' instead of '=='");
    if (code.includes("eval(")) issues.push("⚠ Avoid eval()");
    if (code.includes("console.log")) issues.push("ℹ console.log found");
    return issues.length ? issues.map(i=>`<span class="t-warn">${i}</span>`).join("\n") : `<span class="t-ok-vsc">✓ No issues found</span>`;
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
    if (typeof openInSplitFromSidebar === "function") { openInSplitFromSidebar(args[0]); return `<span class="t-ok-vsc">✓ Split: ${args[0]}</span>`; }
    return `<span class="t-err">Split not available</span>`;
  },
  find: (args) => {
    if (!args[0]) return `<span class="t-err">Usage: find [text]</span>`;
    const q = args[0].toLowerCase(); let results = [];
    if (typeof files !== "undefined") {
      Object.keys(files).forEach(f => {
        String(files[f]||"").split("\n").forEach((line, i) => {
          if (line.toLowerCase().includes(q))
            results.push(`<span class="t-file">${f}</span><span class="t-muted">:${i+1}</span>  ${escTerm(line.trim().slice(0,60))}`);
        });
      });
    }
    if (!results.length) return `<span class="t-warn">No results for '${args[0]}'</span>`;
    return results.slice(0,30).join("\n") + (results.length>30?`\n<span class="t-muted">...and ${results.length-30} more</span>`:"");
  },
  replace: (args) => {
    if (!args[0]||!args[1]) return `<span class="t-err">Usage: replace [find] [replacement]</span>`;
    if (!window.editor1) return `<span class="t-err">Editor not ready</span>`;
    const code = window.editor1.getValue();
    const newCode = code.split(args[0]).join(args[1]);
    const count = code.split(args[0]).length - 1;
    window.editor1.setValue(newCode);
    if (typeof currentFile !== "undefined" && typeof files !== "undefined") { files[currentFile] = newCode; window.files = files; }
    if (typeof saveToStorage === "function") saveToStorage();
    return `<span class="t-ok-vsc">✓ Replaced ${count} occurrence(s)</span>`;
  },
  stats: () => {
    if (typeof files === "undefined") return `<span class="t-err">File system unavailable</span>`;
    const list = Object.keys(files).filter(f => !f.endsWith("/.gitkeep"));
    const totalSize = list.reduce((s,f) => s + String(files[f]||"").length, 0);
    const types = {};
    list.forEach(f => { const ext = f.split(".").pop(); types[ext] = (types[ext]||0)+1; });
    return `<span class="t-info">📊 Workspace Stats\nFiles: ${list.length}\nSize: ${(totalSize/1024).toFixed(1)} KB\nTypes: ${Object.entries(types).map(([e,c])=>`${e}(${c})`).join(", ")}</span>`;
  },
  export: () => {
    if (typeof downloadProjectZip === "function") { downloadProjectZip(); return `<span class="t-ok-vsc">✓ Downloading ZIP...</span>`; }
    return `<span class="t-err">Export not available</span>`;
  },
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
const nodeCtx = {};

function runNodeREPL(code) {
  const logs = [];
  const fakeConsole = {
    log:   (...a) => logs.push(`<span class="t-log">${escTerm(a.map(x=>typeof x==="object"?JSON.stringify(x,null,2):String(x)).join(" "))}</span>`),
    error: (...a) => logs.push(`<span class="t-err">✗ ${escTerm(a.join(" "))}</span>`),
    warn:  (...a) => logs.push(`<span class="t-warn">⚠ ${escTerm(a.join(" "))}</span>`),
    info:  (...a) => logs.push(`<span class="t-info">${escTerm(a.join(" "))}</span>`),
    table: (data) => logs.push(`<span class="t-log">${escTerm(JSON.stringify(data,null,2))}</span>`)
  };
  if (code.trim() === "files") {
    if (typeof files === "undefined") return `<span class="t-err">files not available</span>`;
    return `<span class="t-result">${escTerm(JSON.stringify(Object.keys(files),null,2))}</span>`;
  }
  if (code.trim() === ".clear") { clearTab("node"); return ""; }
  if (code.trim() === ".help") return `<span class="t-info">.clear — clear REPL\n.ctx   — show context vars\nfiles  — list project files\nAny JS expression evaluated live.</span>`;
  if (code.trim() === ".ctx") return `<span class="t-result">${escTerm(JSON.stringify(Object.keys(nodeCtx),null,2))}</span>`;
  try {
    const fn = new Function("console","files","currentFile","ctx","require",`"use strict";\nwith(ctx){\n${code}\n}`);
    const result = fn(fakeConsole, typeof files!=="undefined"?files:{}, typeof currentFile!=="undefined"?currentFile:"", nodeCtx, (mod)=>{throw new Error(`Cannot require '${mod}' in browser REPL`);});
    const out = [...logs];
    if (result !== undefined) out.push(`<span class="t-result">← ${escTerm(JSON.stringify(result,null,2))}</span>`);
    return out.join("\n") || `<span class="t-ok-node">✓ undefined</span>`;
  } catch(e) {
    return `<span class="t-err">✗ ${escTerm(e.message)}</span>`;
  }
}

/* ══════════════════════
   REAL PTY TERMINAL
   xterm.js + WebSocket
══════════════════════ */
function initPtyTerminal() {
  const container = document.getElementById("term-out-pty");
  if (!container) return;

  if (ptyTerm) {
    if (ptyWs && ptyWs.readyState === WebSocket.OPEN) {
      try { ptyFit?.fit(); } catch {}
      return;
    }
    // stale/disconnected session — tear down and reconnect
    try { ptyTerm.dispose(); } catch {}
    ptyTerm = null;
    ptyWs = null;
  }

  container.innerHTML = "";
  container.style.padding = "0";
  container.style.background = "#0a0a0f";
  container.style.overflow = "hidden";

  if (typeof Terminal === "undefined") {
    container.innerHTML = `<div style="padding:20px;color:#ff5050;font-family:monospace;">
      ✗ xterm.js not loaded. Add to index.html:<br><br>
      &lt;link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css"&gt;<br>
      &lt;script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"&gt;&lt;/script&gt;<br>
      &lt;script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"&gt;&lt;/script&gt;
    </div>`;
    return;
  }

  ptyTerm = new Terminal({
    theme: {
      background:"#0a0a0f", foreground:"#c0c8d8", cursor:"#00d4ff",
      selection:"rgba(0,212,255,0.3)", green:"#00ff88", blue:"#58a6ff",
      cyan:"#00d4ff", yellow:"#ffaa00", red:"#ff5050"
    },
    fontFamily:"'JetBrains Mono','Cascadia Code','Fira Code','Courier New',monospace",
    fontSize: 13, lineHeight: 1.4, letterSpacing: 0, cursorBlink: true, cursorStyle: "block",
    scrollback: 5000, allowTransparency: true
  });

  ptyFit = new FitAddon.FitAddon();
  ptyTerm.loadAddon(ptyFit);
  ptyTerm.open(container);
  ptyTerm.focus();
  setTimeout(() => { try { ptyFit.fit(); } catch {} }, 100);

  const wsUrl = TERM_SERVER.replace("https://","wss://").replace("http://","ws://") + "/pty";
  ptyTerm.writeln("\x1b[90mConnecting to real Linux shell...\x1b[0m");

  try {
    ptyWs = new WebSocket(wsUrl);
    ptyWs.onopen = () => {
      ptyTerm.writeln("\x1b[32m✓ Connected — full bash shell\x1b[0m\r\n");
      try { ptyFit.fit(); } catch {}
      ptyWs.send(JSON.stringify({ type:"resize", cols: ptyTerm.cols, rows: ptyTerm.rows }));
    };
    ptyWs.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "output") ptyTerm.write(msg.data);
        if (msg.type === "exit")   ptyTerm.writeln("\r\n\x1b[31mShell exited\x1b[0m");
      } catch { ptyTerm.write(e.data); }
    };
    ptyWs.onclose = () => ptyTerm.writeln("\r\n\x1b[31m⚠ Disconnected\x1b[0m");
    ptyWs.onerror = () => ptyTerm.writeln("\r\n\x1b[31m✗ Connection error — is backend deployed with node-pty?\x1b[0m");
    ptyTerm.onData(data => {
      if (ptyWs?.readyState === WebSocket.OPEN) ptyWs.send(JSON.stringify({ type:"input", data }));
    });
    ptyTerm.onResize(({cols,rows}) => {
      if (ptyWs?.readyState === WebSocket.OPEN) ptyWs.send(JSON.stringify({ type:"resize", cols, rows }));
    });
  } catch(e) {
    ptyTerm.writeln(`\r\n\x1b[31m✗ WebSocket failed: ${e.message}\x1b[0m`);
  }

  window.addEventListener("resize", () => { try { ptyFit?.fit(); } catch {} });
}

/* ══════════════════════
   USER VM TERMINAL
   GitHub Codespaces
══════════════════════ */
async function initVmTerminal() {
  const container = document.getElementById("term-out-vm");
  if (!container) return;

  if (vmTerm) {
    if (vmWs && vmWs.readyState === WebSocket.OPEN) {
      try { vmFit?.fit(); vmTerm.focus(); } catch {}
      return;
    }
    try { vmTerm.dispose(); } catch {}
    vmTerm = null; vmWs = null;
  }

  const ghToken = typeof ghGetToken === "function" ? ghGetToken() : localStorage.getItem("gh_token");
  if (!ghToken) {
    container.innerHTML = `<div style="padding:20px;color:#ff9500;font-family:monospace;">
      ⚠ Login with GitHub first (use the GitHub panel) to get your own VM.
    </div>`;
    return;
  }

  container.innerHTML = "";
  vmTerm = new Terminal({
    theme: { background:"#0a0a0f", foreground:"#c0c8d8", cursor:"#a855f7" },
    fontFamily:"'JetBrains Mono','Cascadia Code','Fira Code','Courier New',monospace",
    fontSize:13, lineHeight:1.4, letterSpacing:0, cursorBlink:true, scrollback:5000
  });
  vmFit = new FitAddon.FitAddon();
  vmTerm.loadAddon(vmFit);
  vmTerm.open(container);
  vmTerm.focus();
  setTimeout(() => { try { vmFit.fit(); } catch {} }, 100);

  vmTerm.writeln("\x1b[90mCreating your VM (first time takes ~60s)...\x1b[0m");

  try {
    const r = await fetch(TERM_SERVER + "/api/vm/create", {
      method: "POST", headers: { "x-github-token": ghToken }
    });
    const d = await r.json();
    if (d.error) { vmTerm.writeln(`\x1b[31m✗ ${d.error}\x1b[0m`); return; }
    vmCodespaceName = d.name;
    vmTerm.writeln("\x1b[32m✓ VM ready — connecting...\x1b[0m\r\n");

    const wsUrl = TERM_SERVER.replace("https://","wss://").replace("http://","ws://") + `/vm-pty`;
    vmWs = new WebSocket(wsUrl);

    vmWs.onopen = () => {
      try {
        vmWs.send(JSON.stringify({type:"auth", token: ghToken, name: vmCodespaceName}));
        vmFit.fit();
        vmWs.send(JSON.stringify({type:"resize",cols:vmTerm.cols,rows:vmTerm.rows}));
      } catch {}
    };
    vmWs.onmessage = (e) => {
      try { const msg = JSON.parse(e.data); if (msg.type==="output") vmTerm.write(msg.data); if (msg.type==="exit") vmTerm.writeln("\r\n\x1b[31mVM session ended\x1b[0m"); }
      catch { vmTerm.write(e.data); }
    };
    vmWs.onclose = () => vmTerm.writeln("\r\n\x1b[31m⚠ Disconnected\x1b[0m");
    vmWs.onerror = () => vmTerm.writeln("\r\n\x1b[31m✗ Connection error\x1b[0m");
    vmTerm.onData(data => { if (vmWs?.readyState === WebSocket.OPEN) vmWs.send(JSON.stringify({type:"input",data})); });
    vmTerm.onResize(({cols,rows}) => { if (vmWs?.readyState === WebSocket.OPEN) vmWs.send(JSON.stringify({type:"resize",cols,rows})); });
  } catch(e) {
    vmTerm.writeln(`\x1b[31m✗ ${e.message}\x1b[0m`);
  }
}

/* ══════════════════════
   DEVICE FILESYSTEM
══════════════════════ */
async function mountDeviceFolder() {
  if (isNativeApp) { mountNativeStorage(); return; }
  if (!window.showDirectoryPicker) {
    printLine(`<span class="t-err">✗ Browser doesn't support File System Access API.</span>`, "bash");
    printLine(`<span class="t-warn">Use Chrome or Edge on Android/PC.</span>`, "bash");
    return;
  }
  try {
    printLine(`<span class="t-info">📂 Opening folder picker — select your root folder...</span>`, "bash");
    const handle = await window.showDirectoryPicker({ mode: "readwrite" });
    deviceRootHandle = handle;
    deviceCwd        = handle;
    deviceCwdPath    = handle.name;
    deviceMode       = true;
    updateDevicePS1();
    printLine(`<span class="t-ok">✓ Mounted: <span class="t-path">${escTerm(handle.name)}</span></span>`, "bash");
    printLine(`<span class="t-muted">Device mode active. Type <span class="t-cmd">help</span> for commands, <span class="t-cmd">unmount</span> to exit.</span>`, "bash");
    await deviceLS([]);
  } catch(e) {
    if (e.name === "AbortError") printLine(`<span class="t-warn">⚠ Cancelled.</span>`, "bash");
    else printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, "bash");
  }
}
async function mountNativeStorage() {
  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    printLine(`<span class="t-info">📂 Requesting storage permission...</span>`, "bash");
    await Filesystem.requestPermissions();
    nativeCwdPath = "";
    deviceMode = true;
    updateDevicePS1();
    printLine(`<span class="t-ok">✓ Mounted phone storage</span>`, "bash");
    printLine(`<span class="t-muted">Device mode active (native). Type <span class="t-cmd">help</span> for commands, <span class="t-cmd">unmount</span> to exit.</span>`, "bash");
    await nativeLS([]);
  } catch(e) { printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, "bash"); }
}

async function nativeLS(args) {
  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const target = args[0] ? (nativeCwdPath ? nativeCwdPath+"/"+args[0] : args[0]) : nativeCwdPath;
    const result = await Filesystem.readdir({ path: target, directory: "EXTERNAL_STORAGE" });
    if (!result.files.length) { printLine(`<span class="t-muted">(empty)</span>`, "bash"); return; }
    let out = `<span class="t-muted">total ${result.files.length} — /${target}</span>\n`;
    result.files.forEach(f => {
      const isDir = f.type === "directory";
      out += isDir ? `<span class="t-dir">📁 ${escTerm(f.name)}/</span>\n` : `<span class="t-file">📄 ${escTerm(f.name)}</span>\n`;
    });
    printLine(out, "bash");
  } catch(e) { printLine(`<span class="t-err">✗ ls: ${escTerm(e.message)}</span>`, "bash"); }
}

async function nativeCD(args) {
  const target = args[0];
  if (!target || target === "~" || target === "/") { nativeCwdPath = ""; updateDevicePS1(); printLine(`<span class="t-ok">✓ /</span>`, "bash"); return; }
  if (target === "..") {
    const parts = nativeCwdPath.split("/").filter(Boolean);
    parts.pop();
    nativeCwdPath = parts.join("/");
    updateDevicePS1(); printLine(`<span class="t-ok">✓ /${escTerm(nativeCwdPath)}</span>`, "bash"); return;
  }
  const newPath = nativeCwdPath ? nativeCwdPath+"/"+target : target;
  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    await Filesystem.readdir({ path: newPath, directory: "EXTERNAL_STORAGE" });
    nativeCwdPath = newPath;
    updateDevicePS1(); printLine(`<span class="t-ok">✓ /${escTerm(nativeCwdPath)}</span>`, "bash");
  } catch(e) { printLine(`<span class="t-err">cd: ${escTerm(target)}: No such directory</span>`, "bash"); }
}

async function nativePWD() { printLine(`<span class="t-path">/${escTerm(nativeCwdPath)}</span>`, "bash"); }

async function nativeCAT(args) {
  if (!args[0]) { printLine(`<span class="t-err">Usage: cat [file]</span>`, "bash"); return; }
  try {
    const Filesystem = window.Capacitor.Plugins.Filesystem;
    const filePath = nativeCwdPath ? nativeCwdPath+"/"+args[0] : args[0];
    const result = await Filesystem.readFile({ path: filePath, directory: "EXTERNAL_STORAGE", encoding: "utf8" });
    printLine(`<span class="t-muted">// ${escTerm(args[0])}</span>\n${escTerm(result.data)}`, "bash");
  } catch(e) { printLine(`<span class="t-err">cat: ${escTerm(e.message)}</span>`, "bash"); }
}
function unmountDevice() {
  deviceRootHandle = null; deviceCwd = null; deviceCwdPath = ""; deviceMode = false;
  updateDevicePS1();
  printLine(`<span class="t-ok">✓ Unmounted. Back to server mode.</span>`, "bash");
}

function updateDevicePS1() {
  const shortPath = deviceMode ? `device:/${isNativeApp ? nativeCwdPath : deviceCwdPath}` : (termCwd ? termCwd.replace("/tmp/vscode_godmode_project","~") : "~");
  document.querySelectorAll(".term-tab-pane[data-tab='bash'] .t-ps1").forEach(el => {
    el.textContent = `user@godmode:${shortPath}$ `;
  });
}

async function deviceLS(args) {
  if (!deviceCwd) return;
  try {
    const entries = [];
    for await (const [name, h] of deviceCwd.entries()) entries.push({ name, kind: h.kind });
    entries.sort((a,b) => a.kind!==b.kind ? (a.kind==="directory"?-1:1) : a.name.localeCompare(b.name));
    if (!entries.length) { printLine(`<span class="t-muted">(empty)</span>`, "bash"); return; }
    const dirs = entries.filter(e=>e.kind==="directory");
    const fls  = entries.filter(e=>e.kind==="file");
    let out = `<span class="t-muted">total ${entries.length} — ${escTerm(deviceCwdPath)}</span>\n`;
    dirs.forEach(e => { out += `<span class="t-dir">📁 ${escTerm(e.name)}/</span>\n`; });
    fls.forEach(e  => { out += `<span class="t-file">📄 ${escTerm(e.name)}</span>\n`; });
    printLine(out, "bash");
  } catch(e) { printLine(`<span class="t-err">✗ ls: ${escTerm(e.message)}</span>`, "bash"); }
}

async function deviceCD(args) {
  if (!deviceCwd) return;
  const target = args[0];
  if (!target || target === "~" || target === "/") {
    deviceCwd = deviceRootHandle; deviceCwdPath = deviceRootHandle.name;
    updateDevicePS1(); printLine(`<span class="t-ok">✓ ${escTerm(deviceCwdPath)}</span>`, "bash"); return;
  }
  if (target === "..") {
    const parts = deviceCwdPath.split("/");
    if (parts.length <= 1) { deviceCwd = deviceRootHandle; deviceCwdPath = deviceRootHandle.name; }
    else {
      parts.pop();
      let h = deviceRootHandle;
      for (const part of parts.slice(1)) { try { h = await h.getDirectoryHandle(part); } catch { break; } }
      deviceCwd = h; deviceCwdPath = parts.join("/");
    }
    updateDevicePS1(); printLine(`<span class="t-ok">✓ ${escTerm(deviceCwdPath)}</span>`, "bash"); return;
  }
  try {
    deviceCwd = await deviceCwd.getDirectoryHandle(target);
    deviceCwdPath = deviceCwdPath + "/" + target;
    updateDevicePS1(); printLine(`<span class="t-ok">✓ ${escTerm(deviceCwdPath)}</span>`, "bash");
  } catch(e) { printLine(`<span class="t-err">cd: ${escTerm(target)}: No such directory</span>`, "bash"); }
}

async function deviceCAT(args) {
  if (!deviceCwd || !args[0]) { printLine(`<span class="t-err">Usage: cat [file]</span>`, "bash"); return; }
  try {
    const fh = await deviceCwd.getFileHandle(args[0]);
    const f  = await fh.getFile();
    const t  = await f.text();
    printLine(`<span class="t-muted">// ${escTerm(args[0])} (${f.size} bytes)</span>\n${escTerm(t)}`, "bash");
  } catch(e) { printLine(`<span class="t-err">cat: ${escTerm(e.message)}</span>`, "bash"); }
}

async function devicePWD()      { printLine(`<span class="t-path">${escTerm(deviceCwdPath)}</span>`, "bash"); }

async function deviceMKDIR(args) {
  if (!args[0]) { printLine(`<span class="t-err">Usage: mkdir [name]</span>`, "bash"); return; }
  try { await deviceCwd.getDirectoryHandle(args[0], { create:true }); printLine(`<span class="t-ok">✓ mkdir '${escTerm(args[0])}'</span>`, "bash"); }
  catch(e) { printLine(`<span class="t-err">mkdir: ${escTerm(e.message)}</span>`, "bash"); }
}

async function deviceRM(args) {
  if (!args[0]) { printLine(`<span class="t-err">Usage: rm [file]</span>`, "bash"); return; }
  try { await deviceCwd.removeEntry(args[0], { recursive: args.includes("-rf")||args.includes("-r") }); printLine(`<span class="t-ok">✓ removed '${escTerm(args[0])}'</span>`, "bash"); }
  catch(e) { printLine(`<span class="t-err">rm: ${escTerm(e.message)}</span>`, "bash"); }
}

async function deviceCP(args) {
  if (!args[0]||!args[1]) { printLine(`<span class="t-err">Usage: cp [src] [dst]</span>`, "bash"); return; }
  try {
    const src = await (await deviceCwd.getFileHandle(args[0])).getFile();
    const dst = await deviceCwd.getFileHandle(args[1], { create:true });
    const w   = await dst.createWritable();
    await w.write(await src.text()); await w.close();
    printLine(`<span class="t-ok">✓ '${escTerm(args[0])}' → '${escTerm(args[1])}'</span>`, "bash");
  } catch(e) { printLine(`<span class="t-err">cp: ${escTerm(e.message)}</span>`, "bash"); }
}

async function deviceMV(args) {
  if (!args[0]||!args[1]) { printLine(`<span class="t-err">Usage: mv [src] [dst]</span>`, "bash"); return; }
  try {
    const src = await (await deviceCwd.getFileHandle(args[0])).getFile();
    const dst = await deviceCwd.getFileHandle(args[1], { create:true });
    const w   = await dst.createWritable();
    await w.write(await src.text()); await w.close();
    await deviceCwd.removeEntry(args[0]);
    printLine(`<span class="t-ok">✓ '${escTerm(args[0])}' → '${escTerm(args[1])}'</span>`, "bash");
  } catch(e) { printLine(`<span class="t-err">mv: ${escTerm(e.message)}</span>`, "bash"); }
}

async function deviceFIND(args) {
  if (!args[0]) { printLine(`<span class="t-err">Usage: find [name]</span>`, "bash"); return; }
  const q = args[0].toLowerCase(); const results = [];
  async function walk(handle, path) {
    for await (const [name, h] of handle.entries()) {
      const fp = path + "/" + name;
      if (name.toLowerCase().includes(q)) results.push({ path:fp, kind:h.kind });
      if (h.kind === "directory" && results.length < 200) await walk(h, fp);
    }
  }
  printLine(`<span class="t-info">⟳ Searching...</span>`, "bash");
  await walk(deviceCwd, deviceCwdPath);
  if (!results.length) { printLine(`<span class="t-warn">No matches for '${escTerm(args[0])}'</span>`, "bash"); return; }
  results.forEach(r => printLine(`<span class="${r.kind==="directory"?"t-dir":"t-file"}">${escTerm(r.path)}${r.kind==="directory"?"/":""}</span>`, "bash"));
  printLine(`<span class="t-muted">${results.length} result(s)</span>`, "bash");
}

async function deviceOpenInEditor(args) {
  if (!args[0]) { printLine(`<span class="t-err">Usage: open [file]</span>`, "bash"); return; }
  try {
    const fh = await deviceCwd.getFileHandle(args[0]);
    const f  = await fh.getFile();
    const t  = await f.text();
    if (typeof files !== "undefined") {
      files[args[0]] = t; window.files = files;
      if (typeof saveToStorage === "function") saveToStorage();
      if (typeof renderFiles === "function") renderFiles();
      if (typeof openFile === "function") openFile(args[0]);
    }
    printLine(`<span class="t-ok-vsc">✓ Opened '${escTerm(args[0])}' in editor</span>`, "bash");
  } catch(e) { printLine(`<span class="t-err">open: ${escTerm(e.message)}</span>`, "bash"); }
}

async function deviceUploadToServer(args) {
  if (!deviceCwd) return;
  printLine(`<span class="t-info">⟳ Reading device files...</span>`, "bash");
  const collected = {};
  async function walk(handle, base) {
    for await (const [name, h] of handle.entries()) {
      if (name === "node_modules" || name === ".git") continue;
      const rel = base ? base + "/" + name : name;
      if (h.kind === "file") {
        try { const f = await h.getFile(); if (f.size < 5*1024*1024) collected[rel] = await f.text(); }
        catch {}
      } else { await walk(h, rel); }
    }
  }
  const startHandle = args[0] ? await deviceCwd.getDirectoryHandle(args[0]).catch(()=>deviceCwd) : deviceCwd;
  await walk(startHandle, "");
  const count = Object.keys(collected).length;
  printLine(`<span class="t-info">⟳ Uploading ${count} files to server...</span>`, "bash");
  try {
    const r = await fetch(TERM_SERVER + "/api/terminal/sync", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ files: collected })
    });
    const d = await r.json();
    if (typeof files !== "undefined") {
      Object.assign(files, collected); window.files = files;
      if (typeof saveToStorage === "function") saveToStorage();
      if (typeof renderFiles === "function") renderFiles();
    }
    const folderKey = Object.keys(collected)[0]?.split("/")[0] || "";
    if (folderKey) termCwd = `/tmp/vscode_godmode_project/${folderKey}`;
    printLine(`<span class="t-ok">✓ Uploaded ${d.synced} files to server</span>`, "bash");
    printLine(`<span class="t-muted">Now run: <span class="t-cmd">npm install && npm start</span></span>`, "bash");
  } catch(e) { printLine(`<span class="t-err">✗ Upload failed: ${escTerm(e.message)}</span>`, "bash"); }
}

/* ══════════════════════
   SERVER COMMANDS
══════════════════════ */
async function runServerCommand(command, tab) {
  tab = tab || "bash";
  const cmd = command.trim().split(" ")[0].toLowerCase();

  if (command === "sync") {
    printLine(`<span class="t-info">⟳ Syncing files to server...</span>`, tab);
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/sync", {
        method:"POST", headers:{"Content-Type":"application/json"},
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
        if (!window.files) window.files = {};
        Object.assign(window.files, d.files);
        Object.assign(files, d.files);
        if (typeof saveToStorage === "function") saveToStorage();
        if (typeof renderFiles === "function") renderFiles();
        if (typeof renderTabs === "function") renderTabs();
        printLine(`<span class="t-ok">✓ Pulled ${Object.keys(d.files).length} files</span>`, tab);
      } else { printLine(`<span class="t-warn">No files on server — run sync first</span>`, tab); }
    } catch(e) { printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, tab); }
    return;
  }

  if (cmd === "cd") {
    const target = command.slice(3).trim() || "~";
    try {
      const r = await fetch(TERM_SERVER + "/api/terminal/exec", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ command: `cd ${target} && pwd`, cwd: termCwd || "/tmp/vscode_godmode_project" })
      });
      const d = await r.json();
      const newDir = d.stdout?.trim();
      if (newDir && !d.stderr?.includes("No such")) {
        termCwd = newDir;
        updateDevicePS1();
        printLine(``, tab);
      } else if (d.stderr) {
        printLine(`<span class="t-err">${escTerm(d.stderr.trim())}</span>`, tab);
      }
    } catch(e) { printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, tab); }
    return;
  }

  // auto-sync before npm/node/python
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
        <span class="t-ok">✓ Server started on port ${port}</span>
        <br><a href="${d.previewUrl}" target="_blank" style="color:#58a6ff;">🌐 ${d.previewUrl}</a>
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
      body: JSON.stringify({ command, cwd: termCwd || "/tmp/vscode_godmode_project" })
    });
    const d = await r.json();
    clearInterval(spinner);
    document.getElementById(runId)?.remove();

    if (d.stdout) d.stdout.split("\n").forEach(line => { if(line.trim()) printLine(`<span class="t-log">${escTerm(line)}</span>`, tab); });
    if (d.stderr) d.stderr.split("\n").forEach(line => {
      if(line.trim()) printLine(`<span class="${/error|failed|not found/i.test(line)?"t-err":"t-warn"}">${escTerm(line)}</span>`, tab);
    });
    if (d.error && !d.stderr) printLine(`<span class="t-err">✗ ${escTerm(d.error)}</span>`, tab);
    if (!d.stdout && !d.stderr && !d.error) printLine(`<span class="t-ok">✓ Done (exit 0)</span>`, tab);

    // after git clone / npm install — pull files into editor
    if (/^(npm install|npm i|git clone|npx create|npx)/.test(command)) {
      printLine(`<span class="t-info">⟳ Scanning server for files...</span>`, tab);
      if (command.startsWith("git clone")) {
        const urlMatch = command.match(/git clone\s+\S+\/([\w.-]+?)(?:\.git)?\s*$/);
        if (urlMatch) {
          termCwd = `/tmp/vscode_godmode_project/${urlMatch[1]}`;
          printLine(`<span class="t-ok">✓ Auto cd into: ${escTerm(termCwd)}</span>`, tab);
          updateDevicePS1();
        }
      }
      setTimeout(async () => {
        try {
          const r2 = await fetch(TERM_SERVER + "/api/terminal/listfiles?cwd=" + encodeURIComponent(termCwd||""));
          const d2 = await r2.json();
          if (d2.files && Object.keys(d2.files).length) {
            let count = 0;
            if (!window.files) window.files = {};
            Object.keys(d2.files).forEach(f => {
              if (f.includes("node_modules/")) return;
              window.files[f] = d2.files[f];
              files[f] = d2.files[f];
              count++;
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

  const state = termState[tab];
  if (state) {
    state.history.push(trimmed);
    if (state.history.length > 200) state.history.shift();
    state.histIdx = state.history.length;
    saveTermHistories();
  }

  printLine(`${getPS1(tab)} <span class="t-input-echo">${escTerm(trimmed)}</span>`, tab);

  const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const cmd   = parts[0]?.toLowerCase();
  const args  = parts.slice(1).map(a => a.replace(/^["']|["']$/g,""));

  /* ── BASH ── */
  if (tab === "bash") {
    if (cmd === "clear" || cmd === "cls") { clearTab("bash"); return; }
    if (cmd === "mount" || trimmed === "mount-device") { mountDeviceFolder(); return; }
    if (cmd === "unmount") { unmountDevice(); return; }

    if (deviceMode) {
      if (cmd === "ls" || cmd === "dir") { isNativeApp ? nativeLS(args) : deviceLS(args); return; }
      if (cmd === "cd")                  { isNativeApp ? nativeCD(args) : deviceCD(args); return; }
      if (cmd === "pwd")                 { isNativeApp ? nativePWD() : devicePWD(); return; }
      if (cmd === "cat")                 { isNativeApp ? nativeCAT(args) : deviceCAT(args); return; }
      if (cmd === "mkdir")               { deviceMKDIR(args); return; }
      if (cmd === "rm")                  { deviceRM(args); return; }
      if (cmd === "cp")                  { deviceCP(args); return; }
      if (cmd === "mv")                  { deviceMV(args); return; }
      if (cmd === "find")                { deviceFIND(args); return; }
      if (cmd === "open")                { deviceOpenInEditor(args); return; }
      if (cmd === "upload")              { deviceUploadToServer(args); return; }
      if (cmd === "help") {
        printLine(`<span class="t-head">// DEVICE MODE</span>
  ls / dir        — list files
  cd [folder]     — enter folder (cd .. to go up)
  pwd             — current path
  cat [file]      — read file
  mkdir [name]    — create folder
  rm [file]       — delete file
  cp [src] [dst]  — copy file
  mv [src] [dst]  — move/rename file
  find [name]     — search recursively
  open [file]     — open in editor
  upload          — upload folder to server to run it
  unmount         — exit device mode`, "bash");
        return;
      }
      printLine(`<span class="t-warn">⚠ '${escTerm(cmd)}' not in device mode. Type <span class="t-cmd">help</span> or <span class="t-cmd">unmount</span></span>`, "bash");
      return;
    }

    if (cmd === "history") { const r = BASH_CMDS.history(args,"bash"); if(r) printLine(r,"bash"); return; }
    if (BASH_CMDS[cmd]) { const r = BASH_CMDS[cmd](args); if(r) printLine(r,"bash"); return; }
    runServerCommand(trimmed, "bash");
    return;
  }

  /* ── CMD ── */
  if (tab === "cmd") {
    const cmdFull = (cmd + (args[0]&&args[0].startsWith("/")?(" "+args[0]):"")).toLowerCase();
    if (cmdFull === "cls" || cmd === "cls") { clearTab("cmd"); return; }
    if (CMD_CMDS[cmdFull]) { const r = CMD_CMDS[cmdFull](args.slice(1)); if(r) printLine(r,"cmd"); return; }
    if (CMD_CMDS[cmd])     { const r = CMD_CMDS[cmd](args);              if(r) printLine(r,"cmd"); return; }
    printLine(`<span class="t-err">'${escTerm(cmd)}' is not recognized as an internal or external command.</span>`, "cmd");
    return;
  }

  /* ── VSC ── */
  if (tab === "vsc") {
    if (cmd === "clear" || cmd === "cls") { clearTab("vsc"); return; }
    if (VSC_CMDS[cmd]) { const r = VSC_CMDS[cmd](args); if(r) printLine(r,"vsc"); return; }
    printLine(`<span class="t-err">vscode: command not found: ${escTerm(cmd)}</span>`, "vsc");
    return;
  }

  /* ── NODE ── */
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
  document.querySelectorAll(".term-tab-btn").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  document.querySelectorAll(".term-tab-pane").forEach(p => p.style.display = p.dataset.tab === tab ? "flex" : "none");
  if (tab === "pty") {
    setTimeout(() => { initPtyTerminal(); try { ptyFit?.fit(); } catch {} }, 100);
  } else if (tab === "vm") {
    setTimeout(() => { initVmTerminal(); try { vmFit?.fit(); } catch {} }, 100);
  } else {
    document.getElementById(`term-input-${tab}`)?.focus();
  }
}

/* ══════════════════════
   PASTE INTO TERMINAL
══════════════════════ */
async function showPastePreview(evt) {
  document.getElementById("paste-preview-popup")?.remove();

  let text = "";
  try {
    text = await navigator.clipboard.readText();
  } catch (e) {
    if (typeof showToast === "function") showToast("Clipboard access denied — check browser permissions", "error");
    return;
  }
  if (!text) {
    if (typeof showToast === "function") showToast("Clipboard is empty", "error");
    return;
  }

  const btn = evt.currentTarget;
  const rect = btn.getBoundingClientRect();
  const popup = document.createElement("div");
  popup.id = "paste-preview-popup";
  popup.className = "paste-preview-popup";
  popup.style.top = `${rect.bottom + 6}px`;
  popup.style.left = `${Math.max(8, rect.right - 260)}px`;
  popup.innerHTML = `
    <div class="paste-preview-label">Last copied:</div>
    <div class="paste-preview-text">${escTerm(text)}</div>
    <div class="paste-preview-actions">
      <button class="term-btn" onclick="closePastePreview()">✕ Cancel</button>
      <button class="term-btn paste-preview-confirm">✓ Paste this</button>
    </div>
  `;
  document.body.appendChild(popup);
  popup.querySelector(".paste-preview-confirm").onclick = () => confirmPasteFromPreview(text);

  setTimeout(() => document.addEventListener("click", closePastePreviewOnOutsideClick), 0);
}

function closePastePreviewOnOutsideClick(e) {
  const popup = document.getElementById("paste-preview-popup");
  if (popup && !popup.contains(e.target)) closePastePreview();
}

function closePastePreview() {
  document.getElementById("paste-preview-popup")?.remove();
  document.removeEventListener("click", closePastePreviewOnOutsideClick);
}

function confirmPasteFromPreview(text) {
  closePastePreview();
  if (termActiveTab === "pty" && ptyWs?.readyState === WebSocket.OPEN) {
    ptyWs.send(JSON.stringify({ type:"input", data:text }));
  } else if (termActiveTab === "vm" && vmWs?.readyState === WebSocket.OPEN) {
    vmWs.send(JSON.stringify({ type:"input", data:text }));
  } else {
    if (typeof showToast === "function") showToast("📋 Paste only works in Shell or My VM tabs", "error");
  }
}

async function pasteToTerminal() {
  try {
    const text = await navigator.clipboard.readText();
    if (!text) return;
    if (termActiveTab === "pty" && ptyWs?.readyState === WebSocket.OPEN) {
      ptyWs.send(JSON.stringify({ type:"input", data:text }));
    } else if (termActiveTab === "vm" && vmWs?.readyState === WebSocket.OPEN) {
      vmWs.send(JSON.stringify({ type:"input", data:text }));
    } else {
      if (typeof showToast === "function") showToast("📋 Paste only works in Shell or My VM tabs", "error");
    }
  } catch (e) {
    if (typeof showToast === "function") showToast("Clipboard access denied — check browser permissions", "error");
  }
}

/* ══════════════════════
   BUILD TERMINAL UI
══════════════════════ */
function buildTerminal() {
  const container = document.getElementById("terminalPanel");
  if (!container) return;

  const tabs = [
    { id:"bash",  label:"🐧 Bash",   color:"#00ff88" },
    { id:"cmd",   label:"🪟 CMD",    color:"#00d4ff" },
    { id:"vsc",   label:"💙 VSCode", color:"#007acc" },
    { id:"node",  label:"🟢 Node",   color:"#68d391" },
    { id:"pty",   label:"⚡ Shell",  color:"#ff9500" },
    { id:"vm",    label:"🖥 My VM",  color:"#a855f7" }
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
            data-tab="${t.id}" style="--tab-color:${t.color}"
            onclick="switchTermTab('${t.id}')">${t.label}</button>`).join("")}
      </div>
      <button class="term-btn" onclick="toggleTerminal()">✕</button>
    </div>
    <div class="term-toolbar">
      <div class="term-actions">
        <button class="term-btn" onclick="mountDeviceFolder()" style="background:#1a3a2a;color:#00ff88;">📁 Mount</button>
        <button class="term-btn" onclick="showPastePreview(event)" style="background:#1a2a3a;color:#58a6ff;">📋 Paste ▾</button>
        <button class="term-btn" onclick="clearTab(termActiveTab)">⌫ Clear</button>
      </div>
    </div>

    ${tabs.map(t => `
      <div class="term-tab-pane" data-tab="${t.id}"
        style="display:${termActiveTab===t.id?"flex":"none"};flex-direction:column;flex:1;min-height:0;">
        <div class="term-output" id="term-out-${t.id}"
          style="${t.id==='pty'?'padding:0;overflow:hidden;flex:1;':''}"></div>
        ${(t.id !== "pty" && t.id !== "vm") ? `
        <div class="term-input-row">
          ${t.id==="bash" ? `<span class="t-ps1">user@godmode:~$</span>` :
            t.id==="cmd"  ? `<span class="t-ps1-cmd">C:\\workspace&gt;</span>` :
            t.id==="vsc"  ? `<span class="t-ps1-vsc">vscode &gt;</span>` :
                            `<span class="t-ps1-node">node &gt;</span>`}
          <input id="term-input-${t.id}" class="term-input" type="text"
            placeholder="${t.id==="node"?"JS expression or .help...":"type a command..."}"
            autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
        </div>` : ""}
      </div>`).join("")}`;

  // print welcome for non-PTY tabs
  tabs.filter(t=>t.id!=="pty").forEach(t => printWelcome(t.id));

  // wire up inputs
  tabs.filter(t=>t.id!=="pty").forEach(t => {
    const input = document.getElementById(`term-input-${t.id}`);
    if (!input) return;
    const state = termState[t.id];

    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        execTermCommand(input.value, t.id);
        input.value = "";
        if (state) state.histIdx = state.history.length;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        if (state && state.histIdx > 0) { state.histIdx--; input.value = state.history[state.histIdx]||""; }
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (state && state.histIdx < state.history.length-1) { state.histIdx++; input.value = state.history[state.histIdx]||""; }
        else { if(state) state.histIdx = state.history.length; input.value = ""; }
      }
      if (e.key === "Tab") {
        e.preventDefault();
        const val = input.value.trim();
        const cmdMap = t.id==="bash"?BASH_CMDS : t.id==="cmd"?CMD_CMDS : t.id==="vsc"?VSC_CMDS : {};
        const valParts = val.split(" ");
        if (valParts.length === 1) {
          const matches = Object.keys(cmdMap).filter(c => c.startsWith(val));
          if (matches.length === 1) input.value = matches[0] + " ";
          else if (matches.length > 1) printLine(`<span class="t-muted">${matches.join("  ")}</span>`, t.id);
        } else if (valParts.length === 2 && ["cat","open","rm","mv","cp","type","del","ren"].includes(valParts[0])) {
          const fileList = typeof files !== "undefined" ? Object.keys(files).filter(f=>!f.endsWith("/.gitkeep")) : [];
          const matches = fileList.filter(f => f.startsWith(valParts[1]));
          if (matches.length === 1) input.value = valParts[0] + " " + matches[0];
          else if (matches.length > 1) printLine(`<span class="t-muted">${matches.join("  ")}</span>`, t.id);
        }
      }
      if (e.key==="l" && e.ctrlKey) { e.preventDefault(); clearTab(t.id); }
      if (e.key==="r" && e.ctrlKey) {
        e.preventDefault();
        const q = input.value.trim();
        if (!q) return;
        const h = state?.history || [];
        for (let i = h.length - 1; i >= 0; i--) {
          if (h[i].includes(q) && h[i] !== q) { input.value = h[i]; return; }
        }
        printLine(`<span class="t-muted">(no match for '${escTerm(q)}')</span>`, t.id);
      }
      if (e.key==="c" && e.ctrlKey) { input.value=""; printLine(`<span class="t-muted">^C</span>`, t.id); }
    });
  });

  document.getElementById(`term-input-${termActiveTab}`)?.focus();
}

/* ══════════════════════
   HELPERS
══════════════════════ */
async function generateShareLink(){
  const db = await initAnnounceDB(); if(!db){ showToast("Firebase not connected","error"); return; }
  const{doc,setDoc}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const id = "share_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
  await setDoc(doc(db,"shares",id),{ files: window.files||{}, createdAt: Date.now() });
  const link = location.origin + "/share.html?id=" + id;
  navigator.clipboard.writeText(link);
  showToast("✓ Link copied: "+link,"success");
}
function openServerPreview(url) {
  const iframe = document.getElementById("previewFrame");
  if (iframe) {
    iframe.src = url;
    const preview = document.getElementById("preview");
    if (preview) preview.classList.remove("collapsed","hidden");
    if (typeof showToast === "function") showToast("Preview opened ✓", "success");
  } else { window.open(url, "_blank"); }
}

async function killServer(port) {
  try {
    const r = await fetch(TERM_SERVER + "/api/terminal/kill", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ port })
    });
    const d = await r.json();
    printLine(`<span class="t-warn">✓ ${escTerm(d.message)}</span>`, termActiveTab);
  } catch(e) { printLine(`<span class="t-err">✗ ${escTerm(e.message)}</span>`, termActiveTab); }
}

/* ══════════════════════
   TOGGLE
══════════════════════ */
function toggleTerminal() {
  const panel = document.getElementById("terminalPanel");
  if (!panel) return;
  termOpen = !termOpen;
  const isMobile = window.innerWidth <= 768;
  panel.style.height = termOpen ? (isMobile ? "55vh" : "280px") : "0px";
  panel.style.borderTopWidth = termOpen ? "2px" : "0px";
  if (termOpen) {
    buildTerminal();
    if (termActiveTab === "pty") setTimeout(() => initPtyTerminal(), 150);
    else document.getElementById(`term-input-${termActiveTab}`)?.focus();
  }
  const btn = document.getElementById("terminalToggleBtn");
  if (btn) btn.classList.toggle("active", termOpen);
}