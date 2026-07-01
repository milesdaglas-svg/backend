/* =========================================
   VS CODE SHELL — Activity Bar + Search + Status Bar
========================================= */

let searchCaseSensitive = false;
let searchWholeWord     = false;
let searchUseRegex      = false;

/* ── ACTIVITY BAR SWITCHING ── */
function activitySwitch(panel) {
  document.querySelectorAll(".activity-btn").forEach(b => b.classList.toggle("active", b.dataset.panel === panel));
  document.querySelectorAll(".sidebar-panel").forEach(p => p.classList.toggle("active", p.dataset.panel === panel));

  // on mobile, ensure sidebar is open when switching panels
  const sidebar = document.getElementById("sidebar");
  if (window.innerWidth <= 768 && sidebar && !sidebar.classList.contains("open")) {
    sidebar.classList.add("open");
    document.getElementById("sidebarOverlay")?.classList.add("active");
  }

  if (panel === "search") {
    setTimeout(() => document.getElementById("searchInput")?.focus(), 50);
  }
}

/* ── VS CODE-STYLE FILE ICON BADGES ── */
function getFileIconBadge(name) {
  const n = name.toLowerCase();
  if (n === ".env" || n.startsWith(".env.")) return '<span class="fi-badge fi-env">E</span>';
  if (n === "package.json" || n === "package-lock.json") return '<span class="fi-badge fi-json">{}</span>';
  if (n === ".gitignore") return '<span class="fi-badge fi-config">G</span>';
  const ext = n.split(".").pop();
  const map = {
    html: ['fi-html','<>'], htm: ['fi-html','<>'],
    css: ['fi-css','#'], scss: ['fi-css','#'], sass: ['fi-css','#'], less: ['fi-css','#'],
    js: ['fi-js','JS'], mjs: ['fi-js','JS'],
    ts: ['fi-ts','TS'], tsx: ['fi-jsx','TX'], jsx: ['fi-jsx','JX'],
    json: ['fi-json','{}'],
    md: ['fi-md','M↓'], mdx: ['fi-md','M↓'],
    py: ['fi-py','PY'],
    png: ['fi-img','◩'], jpg: ['fi-img','◩'], jpeg: ['fi-img','◩'], gif: ['fi-img','◩'], svg: ['fi-img','◩'], webp: ['fi-img','◩'], ico: ['fi-img','◩'],
    yml: ['fi-config','Y'], yaml: ['fi-config','Y'], toml: ['fi-config','T'], ini: ['fi-config','I']
  };
  const entry = map[ext];
  if (entry) return `<span class="fi-badge ${entry[0]}">${entry[1]}</span>`;
  return '<span class="fi-badge fi-default">' + (ext ? ext[0].toUpperCase() : '?') + '</span>';
}

/* ══════════════════════
   SEARCH PANEL
══════════════════════ */
function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function performSearch() {
  const term = document.getElementById("searchInput")?.value || "";
  const resultsEl = document.getElementById("searchResults");
  const summaryEl = document.getElementById("searchSummary");
  if (!resultsEl) return;

  if (!term) {
    resultsEl.innerHTML = '<div class="search-empty">Type to search across all files</div>';
    if (summaryEl) summaryEl.innerText = "";
    return;
  }

  let pattern;
  try {
    if (searchUseRegex) {
      pattern = new RegExp(term, searchCaseSensitive ? "g" : "gi");
    } else {
      let esc = escRegex(term);
      if (searchWholeWord) esc = "\\b" + esc + "\\b";
      pattern = new RegExp(esc, searchCaseSensitive ? "g" : "gi");
    }
  } catch (e) {
    resultsEl.innerHTML = '<div class="search-empty">Invalid regex</div>';
    return;
  }

  let totalMatches = 0, totalFiles = 0;
  let html = "";

  Object.keys(files).sort().forEach(path => {
    if (path.endsWith("/.gitkeep")) return;
    if (isMediaFileCheck(path)) return;
    const content = files[path];
    if (typeof content !== "string") return;

    const lines = content.split("\n");
    let fileMatches = [];

    lines.forEach((line, idx) => {
      pattern.lastIndex = 0;
      if (pattern.test(line)) {
        fileMatches.push({ lineNo: idx + 1, text: line });
      }
    });

    if (fileMatches.length) {
      totalFiles++;
      totalMatches += fileMatches.length;
      const fname = path.split("/").pop();
      html += `<div class="search-file-group">
        <div class="search-file-header" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">
          ${getFileIconBadge(fname)}<span>${escapeHtmlSearch(path)}</span>
          <span class="search-file-count">${fileMatches.length}</span>
        </div>
        <div class="search-file-matches">`;

      fileMatches.slice(0, 50).forEach(m => {
        const highlighted = escapeHtmlSearch(m.text.trim()).replace(
          new RegExp(searchUseRegex ? term : escRegex(term), searchCaseSensitive ? "g" : "gi"),
          x => `<span class="search-match-highlight">${x}</span>`
        );
        html += `<div class="search-match-line" onclick="openSearchResult('${path.replace(/'/g,"\\'")}', ${m.lineNo})">
          <span class="search-match-lineno">${m.lineNo}</span>
          <span class="search-match-text">${highlighted}</span>
        </div>`;
      });

      html += `</div></div>`;
    }
  });

  if (summaryEl) {
    summaryEl.innerText = totalMatches
      ? `${totalMatches} result${totalMatches!==1?"s":""} in ${totalFiles} file${totalFiles!==1?"s":""}`
      : "No results found";
  }
  resultsEl.innerHTML = html || '<div class="search-empty">No results found</div>';
}

function escapeHtmlSearch(s) {
  return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function isMediaFileCheck(path) {
  return typeof isMediaFile === "function" ? isMediaFile(path) : /\.(png|jpe?g|gif|webp|svg|ico|mp3|mp4|wav|webm)$/i.test(path);
}

function openSearchResult(path, lineNo) {
  openFile(path);
  setTimeout(() => {
    const ed = (typeof splitActive !== "undefined" && splitActive && splitFile === path) ? window.editor2 : window.editor1;
    if (ed && typeof ed.revealLineInCenter === "function") {
      ed.revealLineInCenter(lineNo);
      ed.setPosition({ lineNumber: lineNo, column: 1 });
      ed.focus();
    }
  }, 150);
  // collapse sidebar on mobile after jump
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarOverlay")?.classList.remove("active");
  }
}

function toggleSearchOption(opt, btn) {
  if (opt === "case") searchCaseSensitive = !searchCaseSensitive;
  if (opt === "word") searchWholeWord = !searchWholeWord;
  if (opt === "regex") searchUseRegex = !searchUseRegex;
  btn.classList.toggle("active");
  performSearch();
}

function toggleReplaceBox() {
  const box = document.getElementById("searchReplaceRow");
  if (box) box.style.display = box.style.display === "none" ? "flex" : "none";
}

function replaceAllInProject() {
  const term = document.getElementById("searchInput")?.value || "";
  const replacement = document.getElementById("searchReplaceInput")?.value || "";
  if (!term) { showToast("Enter a search term first", "error"); return; }
  if (!confirm(`Replace ALL occurrences of "${term}" with "${replacement}" across the whole project?`)) return;

  let pattern;
  try {
    if (searchUseRegex) {
      pattern = new RegExp(term, searchCaseSensitive ? "g" : "gi");
    } else {
      let esc = escRegex(term);
      if (searchWholeWord) esc = "\\b" + esc + "\\b";
      pattern = new RegExp(esc, searchCaseSensitive ? "g" : "gi");
    }
  } catch { showToast("Invalid regex", "error"); return; }

  let count = 0;
  Object.keys(files).forEach(path => {
    if (isMediaFileCheck(path)) return;
    const content = files[path];
    if (typeof content !== "string") return;
    const matches = content.match(pattern);
    if (matches) {
      count += matches.length;
      files[path] = content.replace(pattern, replacement);
      if (path === currentFile && window.editor1) window.editor1.setValue(files[path]);
      if (typeof splitFile !== "undefined" && path === splitFile && window.editor2) window.editor2.setValue(files[path]);
    }
  });

  if (typeof saveToStorage === "function") saveToStorage();
  if (currentFile.endsWith(".html") && typeof updatePreview === "function") updatePreview(currentFile);
  showToast(`Replaced ${count} occurrence(s)`, "success");
  performSearch();
}

/* ══════════════════════
   STATUS BAR
══════════════════════ */
function updateStatusBar() {
  try {
  const langEl = document.getElementById("sbLang");
  const fileEl = document.getElementById("sbFile");
  const posEl  = document.getElementById("sbPos");
  const errEl  = document.getElementById("sbErrors");
  const bar    = document.getElementById("statusBar");

  const cf = typeof currentFile !== "undefined" ? currentFile : "";
  if (fileEl) fileEl.innerText = cf;
  if (langEl && typeof getLang === "function") langEl.innerText = getLang(cf);

  const ed = window.editor1;
  if (posEl && ed && typeof ed.getPosition === "function") {
    const pos = ed.getPosition();
    if (pos) posEl.innerText = `Ln ${pos.lineNumber}, Col ${pos.column}`;
  }

  // error/warning counts from consoleHistory if present
  if (typeof consoleHistory !== "undefined" && errEl) {
    const errors = consoleHistory.filter(c => c.level === "error").length;
    const warns  = consoleHistory.filter(c => c.level === "warn").length;
    errEl.innerHTML = `<span style="margin-right:8px;">✕ ${errors}</span><span>⚠ ${warns}</span>`;
    if (bar) bar.classList.toggle("has-errors", errors > 0);
  }
  } catch(e) {}
}

/* poll cursor position periodically (Monaco events fire too often for some setups) */
setInterval(updateStatusBar, 1000);

window.addEventListener("load", () => {
  setTimeout(() => {
    updateStatusBar();
    // hook into editor cursor changes if available
    if (window.editor1 && typeof window.editor1.onDidChangeCursorPosition === "function") {
      window.editor1.onDidChangeCursorPosition(updateStatusBar);
    }
  }, 2000);
});