/* =========================================
   EXTENSIONS — Theme Packs + Snippet Packs
========================================= */

const EXT_INSTALLED_KEY = "vscode_installed_extensions";

/* ══════════════════════
   THEME PACK DEFINITIONS
══════════════════════ */
const EXT_THEMES = {
  "theme-dracula": {
    name: "Dracula Official",
    icon: "🧛",
    desc: "Dark theme with vibrant purple, pink and cyan accents.",
    publisher: "Dracula Theme",
    monacoName: "dracula",
    rules: {
      base: "vs-dark",
      colors: {
        "editor.background": "#282a36",
        "editor.foreground": "#f8f8f2",
        "editorLineNumber.foreground": "#6272a4",
        "editor.selectionBackground": "#44475a",
        "editorCursor.foreground": "#f8f8f0",
      },
      tokenRules: [
        { token: "comment", foreground: "6272a4", fontStyle: "italic" },
        { token: "keyword", foreground: "ff79c6" },
        { token: "string", foreground: "f1fa8c" },
        { token: "number", foreground: "bd93f9" },
        { token: "type", foreground: "8be9fd" },
        { token: "function", foreground: "50fa7b" },
      ]
    }
  },
  "theme-monokai": {
    name: "Monokai",
    icon: "🌴",
    desc: "Classic Sublime Text-inspired theme with warm contrast.",
    publisher: "Monokai Pro",
    monacoName: "monokai",
    rules: {
      base: "vs-dark",
      colors: {
        "editor.background": "#272822",
        "editor.foreground": "#f8f8f2",
        "editorLineNumber.foreground": "#75715e",
        "editor.selectionBackground": "#49483e",
        "editorCursor.foreground": "#f8f8f0",
      },
      tokenRules: [
        { token: "comment", foreground: "75715e", fontStyle: "italic" },
        { token: "keyword", foreground: "f92672" },
        { token: "string", foreground: "e6db74" },
        { token: "number", foreground: "ae81ff" },
        { token: "type", foreground: "66d9ef" },
        { token: "function", foreground: "a6e22e" },
      ]
    }
  },
  "theme-nord": {
    name: "Nord",
    icon: "🧊",
    desc: "Arctic, north-bluish color palette — calm and minimal.",
    publisher: "Arctic Ice Studio",
    monacoName: "nord",
    rules: {
      base: "vs-dark",
      colors: {
        "editor.background": "#2e3440",
        "editor.foreground": "#d8dee9",
        "editorLineNumber.foreground": "#4c566a",
        "editor.selectionBackground": "#434c5e",
        "editorCursor.foreground": "#d8dee9",
      },
      tokenRules: [
        { token: "comment", foreground: "616e88", fontStyle: "italic" },
        { token: "keyword", foreground: "81a1c1" },
        { token: "string", foreground: "a3be8c" },
        { token: "number", foreground: "b48ead" },
        { token: "type", foreground: "8fbcbb" },
        { token: "function", foreground: "88c0d0" },
      ]
    }
  },
  "theme-github-dark": {
    name: "GitHub Dark",
    icon: "🐙",
    desc: "GitHub's official dark editor theme.",
    publisher: "GitHub",
    monacoName: "github-dark",
    rules: {
      base: "vs-dark",
      colors: {
        "editor.background": "#0d1117",
        "editor.foreground": "#c9d1d9",
        "editorLineNumber.foreground": "#484f58",
        "editor.selectionBackground": "#3392FF44",
        "editorCursor.foreground": "#c9d1d9",
      },
      tokenRules: [
        { token: "comment", foreground: "8b949e", fontStyle: "italic" },
        { token: "keyword", foreground: "ff7b72" },
        { token: "string", foreground: "a5d6ff" },
        { token: "number", foreground: "79c0ff" },
        { token: "type", foreground: "ffa657" },
        { token: "function", foreground: "d2a8ff" },
      ]
    }
  },
  "theme-solarized": {
    name: "Solarized Dark",
    icon: "🌅",
    desc: "Precision colors for low-contrast, easy-on-eyes coding.",
    publisher: "Ethan Schoonover",
    monacoName: "solarized-dark",
    rules: {
      base: "vs-dark",
      colors: {
        "editor.background": "#002b36",
        "editor.foreground": "#839496",
        "editorLineNumber.foreground": "#586e75",
        "editor.selectionBackground": "#073642",
        "editorCursor.foreground": "#839496",
      },
      tokenRules: [
        { token: "comment", foreground: "586e75", fontStyle: "italic" },
        { token: "keyword", foreground: "859900" },
        { token: "string", foreground: "2aa198" },
        { token: "number", foreground: "d33682" },
        { token: "type", foreground: "b58900" },
        { token: "function", foreground: "268bd2" },
      ]
    }
  },
  "theme-onedark": {
    name: "One Dark Pro",
    icon: "⚛",
    desc: "Atom's iconic One Dark theme, beloved by millions.",
    publisher: "binaryify",
    monacoName: "one-dark-pro",
    rules: {
      base: "vs-dark",
      colors: {
        "editor.background": "#282c34",
        "editor.foreground": "#abb2bf",
        "editorLineNumber.foreground": "#495162",
        "editor.selectionBackground": "#3e4451",
        "editorCursor.foreground": "#528bff",
      },
      tokenRules: [
        { token: "comment", foreground: "5c6370", fontStyle: "italic" },
        { token: "keyword", foreground: "c678dd" },
        { token: "string", foreground: "98c379" },
        { token: "number", foreground: "d19a66" },
        { token: "type", foreground: "e5c07b" },
        { token: "function", foreground: "61afef" },
      ]
    }
  }
};

/* ══════════════════════
   SNIPPET PACK DEFINITIONS
══════════════════════ */
const EXT_SNIPPETS = {
  "snippets-html5": {
    name: "HTML5 Boilerplate Pack",
    icon: "🌐",
    desc: "Common HTML5 boilerplates, meta tags, and structures.",
    publisher: "vscodegodmode",
    snippets: [
      { name: "HTML5 Skeleton", desc: "Basic HTML5 document structure", code:
`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Document</title>
</head>
<body>

</body>
</html>` },
      { name: "Meta Tags (SEO)", desc: "Common SEO meta tags", code:
`<meta name="description" content="">
<meta name="keywords" content="">
<meta name="author" content="">
<meta property="og:title" content="">
<meta property="og:description" content="">
<meta property="og:image" content="">` },
      { name: "Responsive Nav", desc: "Basic nav bar with mobile toggle", code:
`<nav class="navbar">
  <div class="logo">Brand</div>
  <ul class="nav-links">
    <li><a href="#">Home</a></li>
    <li><a href="#">About</a></li>
    <li><a href="#">Contact</a></li>
  </ul>
  <button class="nav-toggle">☰</button>
</nav>` }
    ]
  },
  "snippets-react": {
    name: "React Snippets",
    icon: "⚛",
    desc: "Functional components, hooks, and common patterns.",
    publisher: "vscodegodmode",
    snippets: [
      { name: "Functional Component", desc: "Basic React functional component", code:
`function Component() {
  return (
    <div>

    </div>
  );
}

export default Component;` },
      { name: "useState Hook", desc: "useState boilerplate", code:
`const [value, setValue] = useState(null);` },
      { name: "useEffect Hook", desc: "useEffect with cleanup", code:
`useEffect(() => {

  return () => {
    // cleanup
  };
}, []);` },
      { name: "Fetch Data Hook", desc: "useEffect + fetch pattern", code:
`useEffect(() => {
  async function fetchData() {
    try {
      const res = await fetch("URL");
      const data = await res.json();
      setData(data);
    } catch (e) {
      console.error(e);
    }
  }
  fetchData();
}, []);` }
    ]
  },
  "snippets-python": {
    name: "Python Snippets",
    icon: "🐍",
    desc: "Common Python patterns — classes, file IO, decorators.",
    publisher: "vscodegodmode",
    snippets: [
      { name: "Main Guard", desc: "if __name__ == '__main__'", code:
`if __name__ == "__main__":
    main()` },
      { name: "Class Template", desc: "Basic class with __init__", code:
`class ClassName:
    def __init__(self, ):
        pass

    def method(self):
        pass` },
      { name: "Try/Except", desc: "Basic error handling", code:
`try:

except Exception as e:
    print(f"Error: {e}")` },
      { name: "Read File", desc: "Context manager file read", code:
`with open("file.txt", "r") as f:
    content = f.read()` }
    ]
  },
  "snippets-css": {
    name: "CSS Utility Pack",
    icon: "🎨",
    desc: "Flexbox, grid, animations, and common layout patterns.",
    publisher: "vscodegodmode",
    snippets: [
      { name: "Flex Center", desc: "Center content with flexbox", code:
`display: flex;
align-items: center;
justify-content: center;` },
      { name: "Grid Auto-fit", desc: "Responsive grid layout", code:
`display: grid;
grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
gap: 20px;` },
      { name: "Fade In Animation", desc: "Keyframe fade-in", code:
`@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
.fade-in { animation: fadeIn 0.5s ease forwards; }` },
      { name: "Glassmorphism Card", desc: "Frosted glass effect", code:
`background: rgba(255,255,255,0.08);
backdrop-filter: blur(12px);
border: 1px solid rgba(255,255,255,0.15);
border-radius: 12px;` }
    ]
  },
  "snippets-js": {
    name: "JavaScript Essentials",
    icon: "⚡",
    desc: "Async patterns, array methods, DOM utilities.",
    publisher: "vscodegodmode",
    snippets: [
      { name: "Fetch with async/await", desc: "Basic fetch wrapper", code:
`async function getData(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Network error");
    return await res.json();
  } catch (e) {
    console.error(e);
  }
}` },
      { name: "Debounce", desc: "Debounce function", code:
`function debounce(fn, delay) {
  let timer;
  return function(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}` },
      { name: "LocalStorage Helper", desc: "Get/set JSON in localStorage", code:
`const storage = {
  get: (key) => JSON.parse(localStorage.getItem(key) || "null"),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val))
};` }
    ]
  }
};

/* ══════════════════════
   INSTALL STATE
══════════════════════ */
function getInstalledExtensions() {
  try { return JSON.parse(localStorage.getItem(EXT_INSTALLED_KEY) || "[]"); }
  catch { return []; }
}
function saveInstalledExtensions(list) {
  localStorage.setItem(EXT_INSTALLED_KEY, JSON.stringify(list));
}
function isExtInstalled(id) {
  return getInstalledExtensions().includes(id);
}

function installExtension(id) {
  const list = getInstalledExtensions();
  if (!list.includes(id)) list.push(id);
  saveInstalledExtensions(list);
  if (typeof trackExtensionInstall === "function") trackExtensionInstall(id, true);

  const cloudExt = (typeof cloudExtensions !== "undefined") ? cloudExtensions[id] : null;

  if (EXT_THEMES[id]) {
    applyExtensionTheme(id);
    showToast(`✓ ${EXT_THEMES[id].name} installed & applied`, "success");
  } else if (EXT_SNIPPETS[id]) {
    showToast(`✓ ${EXT_SNIPPETS[id].name} installed — open via 🧩 Snippets menu`, "success");
  } else if (cloudExt) {
    if (cloudExt.type === "theme") { applyCloudExtensionTheme(id); showToast(`✓ ${cloudExt.name} installed & applied`, "success"); }
    else showToast(`✓ ${cloudExt.name} installed`, "success");
  } else {
    showToast("✓ Installed", "success");
  }
  renderExtensionsPanel();
}

function uninstallExtension(id) {
  let list = getInstalledExtensions().filter(x => x !== id);
  saveInstalledExtensions(list);
  if (typeof trackExtensionInstall === "function") trackExtensionInstall(id, false);

  if (EXT_THEMES[id] || (typeof cloudExtensions !== "undefined" && cloudExtensions[id] && cloudExtensions[id].type === "theme")) {
    const activeTheme = localStorage.getItem("vscode_active_ext_theme");
    if (activeTheme === id) {
      localStorage.removeItem("vscode_active_ext_theme");
      if (window.monaco) monaco.editor.setTheme("vs-dark");
    }
  }
  showToast("Uninstalled", "info");
  renderExtensionsPanel();
}

/* apply an installed theme extension to Monaco */
function applyExtensionTheme(id) {
  const ext = EXT_THEMES[id]; if (!ext || !window.monaco) return;
  monaco.editor.defineTheme(ext.monacoName, {
    base: ext.rules.base,
    inherit: true,
    rules: ext.rules.tokenRules,
    colors: ext.rules.colors
  });
  monaco.editor.setTheme(ext.monacoName);
  localStorage.setItem("vscode_active_ext_theme", id);
}

/* re-apply saved extension theme on load */
function applyInstalledThemeOnLoad() {
  const activeTheme = localStorage.getItem("vscode_active_ext_theme");
  if (activeTheme && EXT_THEMES[activeTheme] && isExtInstalled(activeTheme)) {
    applyExtensionTheme(activeTheme);
  }
}
window.addEventListener("load", () => setTimeout(applyInstalledThemeOnLoad, 1500));

/* ══════════════════════
   RENDER EXTENSIONS PANEL
══════════════════════ */
function renderExtensionsPanel(filter = "") {
  const container = document.getElementById("extensionsList");
  if (!container) return;

  const installed = getInstalledExtensions();
  const f = filter.toLowerCase();

  function cardHTML(id, ext, type) {
    const inst = installed.includes(id);
    const matches = !f || ext.name.toLowerCase().includes(f) || ext.desc.toLowerCase().includes(f);
    if (!matches) return "";

    const isCloud = typeof cloudExtensions !== "undefined" && !!cloudExtensions[id];

    let actionBtn;
    if (type === "Theme") {
      actionBtn = inst
        ? `<button class="ext-btn" onclick="${isCloud?'applyCloudExtensionTheme':'applyExtensionTheme'}('${id}');showToast('Theme applied','success')">Apply</button>`
        : `<button class="ext-btn ext-btn-primary" onclick="installExtension('${id}')">Install</button>`;
    } else if (type === "Snippets") {
      actionBtn = inst
        ? `<button class="ext-btn" onclick="${isCloud?'openCloudSnippetMenu':'openSnippetMenu'}('${id}')">Browse</button>`
        : `<button class="ext-btn ext-btn-primary" onclick="installExtension('${id}')">Install</button>`;
    } else {
      // functional tools
      actionBtn = inst
        ? `<button class="ext-btn" onclick="runExtensionTool('${id}')">Open</button>`
        : `<button class="ext-btn ext-btn-primary" onclick="installExtension('${id}')">Install</button>`;
    }

    const uninstallBtn = inst ? `<button class="ext-btn ext-btn-danger" onclick="uninstallExtension('${id}')">Uninstall</button>` : "";

    return `
      <div class="ext-card">
        <div class="ext-card-icon">${ext.icon}</div>
        <div class="ext-card-body">
          <div class="ext-card-name">${ext.name} ${inst?'<span class="ext-card-installed-badge">INSTALLED</span>':''}</div>
          <div class="ext-card-desc">${ext.desc}</div>
          <div class="ext-card-meta">${ext.publisher} · ${type}</div>
          <div class="ext-card-actions">
            ${actionBtn}
            ${uninstallBtn}
            <button class="ext-btn ext-btn-details" onclick="showExtensionDetails('${id}','${type}')">Details</button>
          </div>
        </div>
      </div>`;
  }

  const cat = window._extActiveCategory || "all";
  let html = `
    <div class="ext-category-tabs">
      <span class="ext-cat-tab ${cat==='all'?'active':''}" onclick="setExtCategory('all')">All</span>
      <span class="ext-cat-tab ${cat==='Theme'?'active':''}" onclick="setExtCategory('Theme')">Themes</span>
      <span class="ext-cat-tab ${cat==='Snippets'?'active':''}" onclick="setExtCategory('Snippets')">Snippets</span>
      <span class="ext-cat-tab ${cat==='Formatter'?'active':''}" onclick="setExtCategory('Formatter')">Formatters</span>
      <span class="ext-cat-tab ${cat==='Generator'?'active':''}" onclick="setExtCategory('Generator')">Generators</span>
      <span class="ext-cat-tab ${cat==='Tool'?'active':''}" onclick="setExtCategory('Tool')">Tools</span>
      <span class="ext-cat-tab ${cat==='installed'?'active':''}" onclick="setExtCategory('installed')">Installed</span>
    </div>`;

  function section(title, dict, type) {
    if (cat !== "all" && cat !== type && cat !== "installed") return "";
    let body = "";
    Object.keys(dict).forEach(id => {
      if (cat === "installed" && !installed.includes(id)) return;
      body += cardHTML(id, dict[id], type);
    });
    if (!body) return "";
    return `<div class="ext-section-title">${title}</div>${body}`;
  }

  html += section("Themes", EXT_THEMES, "Theme");
  html += section("Snippets", EXT_SNIPPETS, "Snippets");
  if (typeof EXT_FORMATTERS !== "undefined") html += section("Formatters & Converters", EXT_FORMATTERS, "Formatter");
  if (typeof EXT_GENERATORS !== "undefined") html += section("Generators", EXT_GENERATORS, "Generator");
  if (typeof EXT_TOOLS !== "undefined") html += section("Productivity Tools", EXT_TOOLS, "Tool");

  // cloud-added extensions, grouped by their type
  if (typeof cloudExtensions !== "undefined" && Object.keys(cloudExtensions).length) {
    const cloudByType = { theme: {}, snippet: {}, tool: {} };
    Object.keys(cloudExtensions).forEach(id => {
      const e = cloudExtensions[id];
      if (cloudByType[e.type]) cloudByType[e.type][id] = e;
    });
    html += section("Themes", cloudByType.theme, "Theme");
    html += section("Snippets", cloudByType.snippet, "Snippets");
    html += section("Community Tools", cloudByType.tool, "Tool");
  }

  if (!html.replace(/<div class="ext-category-tabs">[\s\S]*?<\/div>/,"").trim()) {
    html += `<div class="ext-card"><div class="ext-card-body">No extensions match "${filter}"</div></div>`;
  }

  container.innerHTML = html;
}

function setExtCategory(cat) {
  window._extActiveCategory = cat;
  renderExtensionsPanel(document.getElementById("extSearchInput")?.value || "");
}

/* ══════════════════════
   DETAILS MODAL
══════════════════════ */
function showExtensionDetails(id, type) {
  let ext = EXT_THEMES[id] || EXT_SNIPPETS[id] ||
            (typeof EXT_FORMATTERS !== "undefined" && EXT_FORMATTERS[id]) ||
            (typeof EXT_GENERATORS !== "undefined" && EXT_GENERATORS[id]) ||
            (typeof EXT_TOOLS !== "undefined" && EXT_TOOLS[id]) ||
            (typeof cloudExtensions !== "undefined" && cloudExtensions[id]);
  if (!ext) return;

  let bodyHtml = `<div class="ext-detail-section-title">What it does</div><div>${ext.longDesc || ext.desc}</div>`;

  if (ext.howTo) {
    bodyHtml += `<div class="ext-detail-section-title">How to use</div><div>${ext.howTo}</div>`;
  }
  if (ext.example) {
    bodyHtml += `<div class="ext-detail-section-title">Example</div><div class="ext-detail-example">${escapeHtmlSearch(ext.example)}</div>`;
  }
  if (type === "Snippets" && ext.snippets) {
    bodyHtml += `<div class="ext-detail-section-title">Included Snippets (${ext.snippets.length})</div>`;
    bodyHtml += ext.snippets.map(s => `<div style="margin-bottom:6px;"><b>${s.name}</b> — ${s.desc}</div>`).join("");
  }

  document.getElementById("extDetailOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "extDetailOverlay";
  overlay.innerHTML = `
    <div class="ext-detail-overlay" onclick="document.getElementById('extDetailOverlay').remove()"></div>
    <div class="ext-detail-modal">
      <div class="ext-detail-header">
        <div class="ext-detail-icon">${ext.icon}</div>
        <div>
          <div class="ext-detail-title">${ext.name}</div>
          <div class="ext-detail-publisher">${ext.publisher} · ${type}</div>
        </div>
        <button class="ext-detail-close" onclick="document.getElementById('extDetailOverlay').remove()">✕</button>
      </div>
      <div class="ext-detail-body">${bodyHtml}</div>
      <div class="ext-detail-footer">
        ${isExtInstalled(id)
          ? `<button class="ext-btn ext-btn-danger" onclick="uninstallExtension('${id}');document.getElementById('extDetailOverlay').remove()">Uninstall</button>`
          : `<button class="ext-btn ext-btn-primary" onclick="installExtension('${id}');document.getElementById('extDetailOverlay').remove()">Install</button>`
        }
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function filterExtensions() {
  const val = document.getElementById("extSearchInput")?.value || "";
  renderExtensionsPanel(val);
}

/* ══════════════════════
   SNIPPET INSERT MENU
══════════════════════ */
function openSnippetMenu(specificPackId) {
  document.getElementById("snippetMenuOverlay")?.remove();

  const installed = getInstalledExtensions().filter(id => EXT_SNIPPETS[id]);
  let packsToShow = specificPackId ? [specificPackId] : installed;

  let itemsHtml = "";
  if (!packsToShow.length) {
    itemsHtml = `<div class="snippet-menu-empty">No snippet packs installed.<br>Go to 🧩 Extensions to install some.</div>`;
  } else {
    packsToShow.forEach(packId => {
      const pack = EXT_SNIPPETS[packId];
      if (!pack) return;
      pack.snippets.forEach(s => {
        itemsHtml += `<div class="snippet-item" onclick="insertSnippetCode(${JSON.stringify(s.code).replace(/"/g,'&quot;')})">
          <div class="snippet-item-name">${pack.icon} ${s.name}</div>
          <div class="snippet-item-desc">${s.desc}</div>
        </div>`;
      });
    });
  }

  const overlay = document.createElement("div");
  overlay.id = "snippetMenuOverlay";
  overlay.innerHTML = `
    <div class="snippet-overlay" onclick="document.getElementById('snippetMenuOverlay').remove()"></div>
    <div class="snippet-menu">
      <div class="snippet-menu-header">
        <span>🧩 Insert Snippet</span>
        <button onclick="document.getElementById('snippetMenuOverlay').remove()" style="background:transparent;border:none;color:#ccc;cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div class="snippet-menu-list">${itemsHtml}</div>
    </div>`;
  document.body.appendChild(overlay);
}

function insertSnippetCode(code) {
  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  if (ed) {
    const sel = ed.getSelection();
    ed.executeEdits("snippet", [{ range: sel, text: code, forceMoveMarkers: true }]);
    ed.pushUndoStop();
    ed.focus();
  }
  document.getElementById("snippetMenuOverlay")?.remove();
  if (typeof showToast === "function") showToast("Snippet inserted", "success");
}

/* keyboard shortcut: Ctrl+Shift+I opens snippet menu */
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && e.key === "I") {
    e.preventDefault();
    openSnippetMenu();
  }
});

/* ══════════════════════
   DISPATCHER for functional tool extensions
══════════════════════ */
function runExtensionTool(id) {
  if (id === "fmt-hash") { runHashTool(); return; }
  if (typeof FORMATTER_ACTIONS !== "undefined" && FORMATTER_ACTIONS[id]) { runFormatterTool(id); return; }
  if (typeof GENERATOR_ACTIONS !== "undefined" && GENERATOR_ACTIONS[id]) { runGeneratorTool(id); return; }
  if (typeof TOOL_ACTIONS !== "undefined" && TOOL_ACTIONS[id]) { runToolAction(id); return; }
  if (typeof cloudExtensions !== "undefined" && cloudExtensions[id]) { runCloudExtensionTool(id); return; }
  showToast("This tool isn't wired up yet", "error");
}