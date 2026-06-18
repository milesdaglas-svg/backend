/* =========================================
   EXTENSIONS CLOUD SYNC
   - Admin-managed extensions via Firestore
   - Install tracking per session
   - Merges with hardcoded packs
========================================= */

const EXT_COLLECTION = "extensions";
const EXT_INSTALLS_COLLECTION = "extension_installs";

let cloudExtensions = {}; // id -> ext object (Firestore-sourced)

/* ══════════════════════
   FETCH CLOUD EXTENSIONS
══════════════════════ */
async function fetchCloudExtensions() {
  const db = await initAnnounceDB(); if (!db) return {};
  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDocs(collection(db, EXT_COLLECTION));
    const out = {};
    snap.forEach(d => { out[d.id] = { ...d.data(), _cloudId: d.id }; });
    return out;
  } catch(e) { console.warn("Cloud extensions:", e.message); return {}; }
}

/* refresh + re-render */
async function syncCloudExtensions() {
  cloudExtensions = await fetchCloudExtensions();
  cleanupUninstalledDeletedExtensions();
  if (typeof renderExtensionsPanel === "function") renderExtensionsPanel(document.getElementById("extSearchInput")?.value || "");
}

/* if an extension was deleted from cloud but user has it installed locally, remove it */
function cleanupUninstalledDeletedExtensions() {
  const installed = getInstalledExtensions();
  const validIds = new Set([
    ...Object.keys(typeof EXT_THEMES!=="undefined"?EXT_THEMES:{}),
    ...Object.keys(typeof EXT_SNIPPETS!=="undefined"?EXT_SNIPPETS:{}),
    ...Object.keys(typeof EXT_FORMATTERS!=="undefined"?EXT_FORMATTERS:{}),
    ...Object.keys(typeof EXT_GENERATORS!=="undefined"?EXT_GENERATORS:{}),
    ...Object.keys(typeof EXT_TOOLS!=="undefined"?EXT_TOOLS:{}),
    ...Object.keys(cloudExtensions)
  ]);
  const cleaned = installed.filter(id => validIds.has(id));
  if (cleaned.length !== installed.length) {
    saveInstalledExtensions(cleaned);
  }
}

/* ══════════════════════
   INSTALL TRACKING (per session)
══════════════════════ */
async function trackExtensionInstall(extId, installed) {
  try {
    const db = await initAnnounceDB(); if (!db) return;
    const { doc, setDoc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const sessId = (typeof visitorSessionId !== "undefined" && visitorSessionId) || localStorage.getItem("visitor_session") || "unknown";
    const docId = `${sessId}_${extId}`;
    if (installed) {
      await setDoc(doc(db, EXT_INSTALLS_COLLECTION, docId), {
        extensionId: extId, sessionId: sessId, installedAt: Date.now()
      });
    } else {
      await deleteDoc(doc(db, EXT_INSTALLS_COLLECTION, docId));
    }
  } catch {}
}

/* ══════════════════════
   ADMIN: FETCH STATS
══════════════════════ */
async function fetchExtensionStats() {
  const db = await initAnnounceDB(); if (!db) return null;
  try {
    const { collection, getDocs } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const installsSnap = await getDocs(collection(db, EXT_INSTALLS_COLLECTION));
    const installs = installsSnap.docs.map(d => d.data());

    // count per extension
    const counts = {};
    installs.forEach(i => { counts[i.extensionId] = (counts[i.extensionId]||0) + 1; });

    // per-session list
    const bySession = {};
    installs.forEach(i => {
      if (!bySession[i.sessionId]) bySession[i.sessionId] = [];
      bySession[i.sessionId].push(i.extensionId);
    });

    return { counts, bySession, totalInstalls: installs.length };
  } catch(e) { return null; }
}

/* ══════════════════════
   ADMIN: ADD / EDIT / DELETE EXTENSION
══════════════════════ */
async function adminSaveExtension(extData, existingId=null) {
  try {
    const db = await initAnnounceDB(); if (!db) return false;
    const { doc, setDoc, collection } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const id = existingId || ("ext_" + Date.now());
    await setDoc(doc(db, EXT_COLLECTION, id), { ...extData, updatedAt: Date.now() });
    return id;
  } catch(e) { console.warn("Save ext:", e.message); return false; }
}

async function adminDeleteExtension(id) {
  try {
    const db = await initAnnounceDB(); if (!db) return false;
    const { doc, deleteDoc, collection, getDocs, query, where, writeBatch } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(doc(db, EXT_COLLECTION, id));

    // also remove all install records for this extension
    const snap = await getDocs(collection(db, EXT_INSTALLS_COLLECTION));
    const toDelete = snap.docs.filter(d => d.data().extensionId === id);
    for (const d of toDelete) await deleteDoc(doc(db, EXT_INSTALLS_COLLECTION, d.id));

    return true;
  } catch(e) { console.warn("Delete ext:", e.message); return false; }
}

/* ══════════════════════
   ADMIN PANEL: EXTENSIONS TAB UI
══════════════════════ */
async function loadAdminExtensionsTab() {
  const el = document.getElementById("adm-extensions-content"); if (!el) return;
  el.innerHTML = `<div class="adm-feed-loading">// Loading extensions...</div>`;

  try { await syncCloudExtensions(); } catch(e) { console.warn("syncCloud:", e); }
  let stats = null;
  try { stats = await fetchExtensionStats(); } catch(e) { console.warn("extStats:", e); }

  const allBuiltIn = {
    ...(typeof EXT_THEMES!=="undefined"?EXT_THEMES:{}),
    ...(typeof EXT_SNIPPETS!=="undefined"?EXT_SNIPPETS:{}),
    ...(typeof EXT_FORMATTERS!=="undefined"?EXT_FORMATTERS:{}),
    ...(typeof EXT_GENERATORS!=="undefined"?EXT_GENERATORS:{}),
    ...(typeof EXT_TOOLS!=="undefined"?EXT_TOOLS:{})
  };

  let html = `
    <div class="adm-section-title">// ADD NEW EXTENSION</div>
    <div class="adm-form" style="max-width:600px;">
      <div class="adm-field"><label>NAME *</label><input class="adm-input" id="ext-name" placeholder="e.g. Lorem Ipsum Generator"></div>
      <div class="adm-field"><label>ICON (emoji)</label><input class="adm-input" id="ext-icon" placeholder="📝" maxlength="4"></div>
      <div class="adm-field"><label>SHORT DESCRIPTION *</label><input class="adm-input" id="ext-desc" placeholder="One-line description shown on card"></div>
      <div class="adm-field"><label>LONG DESCRIPTION (Details modal)</label><textarea class="adm-textarea" id="ext-longdesc" rows="2" placeholder="What this extension does in detail"></textarea></div>
      <div class="adm-field"><label>HOW TO USE</label><textarea class="adm-textarea" id="ext-howto" rows="2" placeholder="Instructions shown in Details modal"></textarea></div>
      <div class="adm-field"><label>EXAMPLE (optional)</label><textarea class="adm-textarea" id="ext-example" rows="2" placeholder="Example input/output"></textarea></div>
      <div class="adm-field">
        <label>TYPE *</label>
        <select class="adm-input" id="ext-type" onchange="adminExtTypeChanged()">
          <option value="tool">Custom Tool (JS code)</option>
          <option value="theme">Theme Pack</option>
          <option value="snippet">Snippet Pack</option>
        </select>
      </div>

      <div id="ext-type-tool-fields">
        <div class="adm-field">
          <label>JS CODE — function(text, ed, sel, helpers)</label>
          <textarea class="adm-textarea" id="ext-code" rows="8" style="font-family:monospace;font-size:11px;" placeholder="// 'text' = selected text (or whole file if nothing selected)
// return a string to replace it, or return null and use helpers yourself
// helpers.replaceEditorText(ed, sel, newText)
// helpers.showToast(msg, type)
// Example:
return text.toUpperCase();"></textarea>
        </div>
      </div>

      <div id="ext-type-theme-fields" style="display:none;">
        <div class="adm-field"><label>MONACO BASE THEME</label>
          <select class="adm-input" id="ext-theme-base">
            <option value="vs-dark">vs-dark</option>
            <option value="vs">vs (light)</option>
            <option value="hc-black">hc-black</option>
          </select>
        </div>
        <div class="adm-field"><label>BACKGROUND COLOR</label><input class="adm-input" type="color" id="ext-theme-bg" value="#1e1e1e"></div>
        <div class="adm-field"><label>FOREGROUND/TEXT COLOR</label><input class="adm-input" type="color" id="ext-theme-fg" value="#d4d4d4"></div>
        <div class="adm-field"><label>KEYWORD COLOR</label><input class="adm-input" type="color" id="ext-theme-keyword" value="#569cd6"></div>
        <div class="adm-field"><label>STRING COLOR</label><input class="adm-input" type="color" id="ext-theme-string" value="#ce9178"></div>
        <div class="adm-field"><label>COMMENT COLOR</label><input class="adm-input" type="color" id="ext-theme-comment" value="#6a9955"></div>
      </div>

      <div id="ext-type-snippet-fields" style="display:none;">
        <div class="adm-field">
          <label>SNIPPETS (JSON array)</label>
          <textarea class="adm-textarea" id="ext-snippets" rows="6" style="font-family:monospace;font-size:11px;" placeholder='[{"name":"Snippet Name","desc":"What it inserts","code":"console.log(1);"}]'></textarea>
        </div>
      </div>

      <div class="adm-form-actions">
        <button class="adm-btn adm-btn-primary" onclick="adminSubmitExtension()">➕ ADD EXTENSION</button>
      </div>
      <div id="ext-add-status" class="adm-form-status"></div>
    </div>

    <div class="adm-section-title" style="margin-top:24px;">// MOST INSTALLED</div>
    <div id="adm-ext-leaderboard">${renderExtLeaderboard(stats, allBuiltIn)}</div>

    <div class="adm-section-title" style="margin-top:24px;">// CLOUD EXTENSIONS (${Object.keys(cloudExtensions).length})</div>
    <div id="adm-ext-list">${renderAdminExtList(stats)}</div>

    <div class="adm-section-title" style="margin-top:24px;">// BUILT-IN PACKS (read-only, ${Object.keys(allBuiltIn).length})</div>
    <div style="font-size:11px;color:rgba(0,255,136,0.3);margin-bottom:8px;">These ship with the app and can't be deleted, but install stats are tracked.</div>
    <div id="adm-ext-builtin-list">${renderAdminBuiltinList(allBuiltIn, stats)}</div>
  `;

  el.innerHTML = html;
}

function adminExtTypeChanged() {
  const type = document.getElementById("ext-type").value;
  document.getElementById("ext-type-tool-fields").style.display = type === "tool" ? "block" : "none";
  document.getElementById("ext-type-theme-fields").style.display = type === "theme" ? "block" : "none";
  document.getElementById("ext-type-snippet-fields").style.display = type === "snippet" ? "block" : "none";
}

function renderExtLeaderboard(stats, allBuiltIn) {
  if (!stats || !Object.keys(stats.counts).length) return `<div class="adm-feed-empty">// No installs yet</div>`;
  const allExt = { ...allBuiltIn, ...cloudExtensions };
  const sorted = Object.entries(stats.counts).sort((a,b)=>b[1]-a[1]).slice(0,10);
  return `<div class="adm-history-list">` + sorted.map(([id,count]) => {
    const ext = allExt[id];
    const name = ext ? ext.name : id + " (deleted)";
    const icon = ext ? ext.icon : "❓";
    return `<div class="adm-hist-card" style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:18px;">${icon}</span>
      <span style="flex:1;">${name}</span>
      <span class="adm-online-count">${count} install${count!==1?"s":""}</span>
    </div>`;
  }).join("") + `</div>`;
}

function renderAdminExtList(stats) {
  const ids = Object.keys(cloudExtensions);
  if (!ids.length) return `<div class="adm-feed-empty">// No cloud extensions added yet</div>`;
  return ids.map(id => {
    const ext = cloudExtensions[id];
    const count = stats?.counts?.[id] || 0;
    return `<div class="adm-hist-card" style="display:flex;align-items:center;gap:10px;">
      <span style="font-size:18px;">${ext.icon||"🧩"}</span>
      <div style="flex:1;">
        <div style="font-weight:600;">${ext.name} <span style="font-size:10px;color:#666;">[${ext.type}]</span></div>
        <div style="font-size:11px;color:#888;">${ext.desc||""}</div>
      </div>
      <span class="adm-online-count">${count}</span>
      <button class="adm-btn adm-btn-danger" onclick="adminDeleteExtensionConfirm('${id}')">🗑</button>
    </div>`;
  }).join("");
}

function renderAdminBuiltinList(allBuiltIn, stats) {
  const ids = Object.keys(allBuiltIn);
  if (!ids.length) return `<div class="adm-feed-empty">// none</div>`;
  return `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;">` + ids.map(id => {
    const ext = allBuiltIn[id];
    const count = stats?.counts?.[id] || 0;
    return `<div style="background:rgba(255,255,255,0.03);border-radius:6px;padding:8px;font-size:11px;">
      <div>${ext.icon} ${ext.name}</div>
      <div style="color:#666;margin-top:2px;">${count} install${count!==1?"s":""}</div>
    </div>`;
  }).join("") + `</div>`;
}

async function adminSubmitExtension() {
  const status = document.getElementById("ext-add-status");
  const name = document.getElementById("ext-name")?.value.trim();
  const desc = document.getElementById("ext-desc")?.value.trim();
  const icon = document.getElementById("ext-icon")?.value.trim() || "🧩";
  const longDesc = document.getElementById("ext-longdesc")?.value.trim();
  const howTo = document.getElementById("ext-howto")?.value.trim();
  const example = document.getElementById("ext-example")?.value.trim();
  const type = document.getElementById("ext-type")?.value;

  if (!name || !desc) { if(status){status.innerText="⚠ Name and description required";status.style.color="#ffaa00";} return; }

  const data = { name, desc, icon, longDesc, howTo, example, type, publisher: "Admin", enabled: true };

  if (type === "tool") {
    data.code = document.getElementById("ext-code")?.value || "";
    if (!data.code.trim()) { if(status){status.innerText="⚠ JS code required for Custom Tool";status.style.color="#ffaa00";} return; }
  } else if (type === "theme") {
    data.themeConfig = {
      base: document.getElementById("ext-theme-base").value,
      bg: document.getElementById("ext-theme-bg").value,
      fg: document.getElementById("ext-theme-fg").value,
      keyword: document.getElementById("ext-theme-keyword").value,
      string: document.getElementById("ext-theme-string").value,
      comment: document.getElementById("ext-theme-comment").value
    };
  } else if (type === "snippet") {
    try {
      data.snippets = JSON.parse(document.getElementById("ext-snippets")?.value || "[]");
      if (!Array.isArray(data.snippets) || !data.snippets.length) throw new Error("empty");
    } catch {
      if(status){status.innerText="⚠ Snippets must be a valid non-empty JSON array";status.style.color="#ffaa00";} return;
    }
  }

  if (status) { status.innerText = "// Saving..."; status.style.color="#00d4ff"; }
  const id = await adminSaveExtension(data);
  if (id) {
    if (status) { status.innerText = "✅ Extension added! Visible to all users."; status.style.color="#00ff88"; }
    ["ext-name","ext-icon","ext-desc","ext-longdesc","ext-howto","ext-example","ext-code","ext-snippets"].forEach(fid => { const e=document.getElementById(fid); if(e) e.value=""; });
    loadAdminExtensionsTab();
    if (typeof showToast === "function") showToast("Extension added ✓", "success");
  } else {
    if (status) { status.innerText = "❌ Failed — check Firebase connection"; status.style.color="#ff4444"; }
  }
}

async function adminDeleteExtensionConfirm(id) {
  const ext = cloudExtensions[id];
  if (!confirm(`Delete "${ext?.name||id}"? This removes it for ALL users immediately, even if installed.`)) return;
  const ok = await adminDeleteExtension(id);
  if (ok) {
    if (typeof showToast === "function") showToast("Extension deleted", "info");
    loadAdminExtensionsTab();
  } else {
    if (typeof showToast === "function") showToast("Failed to delete", "error");
  }
}

/* ══════════════════════
   RUN CLOUD TOOL EXTENSION
══════════════════════ */
function runCloudExtensionTool(id) {
  const ext = cloudExtensions[id];
  if (!ext || ext.type !== "tool") { showToast("Tool not found", "error"); return; }

  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  if (!ed) { showToast("No active editor", "error"); return; }
  const { text, sel } = getSelectedTextOrAll(ed);

  const helpers = {
    replaceEditorText: (e, s, t) => replaceEditorText(e, s, t),
    showToast: (msg, type) => showToast(msg, type)
  };

  try {
    const fn = new Function("text", "ed", "sel", "helpers", ext.code);
    const result = fn(text, ed, sel, helpers);
    if (typeof result === "string") {
      replaceEditorText(ed, sel, result);
      showToast(ext.name + " applied ✓", "success");
    }
  } catch(e) {
    showToast("Extension error: " + e.message, "error");
  }
}

/* apply cloud theme extension */
function applyCloudExtensionTheme(id) {
  const ext = cloudExtensions[id];
  if (!ext || ext.type !== "theme" || !window.monaco) return;
  const c = ext.themeConfig;
  const themeName = "cloud-" + id;
  monaco.editor.defineTheme(themeName, {
    base: c.base || "vs-dark",
    inherit: true,
    rules: [
      { token: "keyword", foreground: c.keyword.replace("#","") },
      { token: "string", foreground: c.string.replace("#","") },
      { token: "comment", foreground: c.comment.replace("#",""), fontStyle: "italic" }
    ],
    colors: {
      "editor.background": c.bg,
      "editor.foreground": c.fg
    }
  });
  monaco.editor.setTheme(themeName);
  localStorage.setItem("vscode_active_ext_theme", id);
}

/* open snippet menu for cloud snippet pack */
function openCloudSnippetMenu(id) {
  const ext = cloudExtensions[id];
  if (!ext || !ext.snippets) return;

  document.getElementById("snippetMenuOverlay")?.remove();
  let itemsHtml = ext.snippets.map(s => `
    <div class="snippet-item" onclick="insertSnippetCode(${JSON.stringify(s.code).replace(/"/g,'&quot;')})">
      <div class="snippet-item-name">${ext.icon||"🧩"} ${s.name}</div>
      <div class="snippet-item-desc">${s.desc||""}</div>
    </div>`).join("");

  const overlay = document.createElement("div");
  overlay.id = "snippetMenuOverlay";
  overlay.innerHTML = `
    <div class="snippet-overlay" onclick="document.getElementById('snippetMenuOverlay').remove()"></div>
    <div class="snippet-menu">
      <div class="snippet-menu-header">
        <span>🧩 ${ext.name}</span>
        <button onclick="document.getElementById('snippetMenuOverlay').remove()" style="background:transparent;border:none;color:#ccc;cursor:pointer;font-size:14px;">✕</button>
      </div>
      <div class="snippet-menu-list">${itemsHtml}</div>
    </div>`;
  document.body.appendChild(overlay);
}

/* ══════════════════════
   INIT — sync on load
══════════════════════ */
window.addEventListener("load", () => {
  setTimeout(syncCloudExtensions, 2000);
});