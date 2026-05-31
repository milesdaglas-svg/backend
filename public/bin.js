/* =========================
   RECYCLE BIN v1
   - Deleted files go to bin
   - Firebase cloud storage
   - Local fallback (localStorage)
   - Restore anytime
   - Auto-expire after 30 days
   - Supports all file types
========================= */

const BIN_COLLECTION  = "recyclebin";
const BIN_LOCAL_KEY   = "vscode_recycle_bin";
const BIN_EXPIRE_DAYS = 30;

/* ══════════════════════
   SAVE TO BIN
   Called instead of
   direct delete
══════════════════════ */
async function sendToBin(filename, content) {
  const item = {
    filename,
    content: typeof content === "string" ? content.slice(0, 500000) : "", // max 500kb
    deletedAt: Date.now(),
    deletedDate: new Date().toLocaleString(),
    size: typeof content === "string" ? content.length : 0,
    type: getBinFileType(filename),
    id: "bin_" + Date.now() + "_" + Math.random().toString(36).slice(2)
  };

  // save to localStorage first (always works)
  saveBinLocal(item);

  // try Firebase too
  await saveBinCloud(item);

  return item.id;
}

function getBinFileType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const map = {
    html:"HTML", htm:"HTML", css:"CSS", js:"JavaScript", ts:"TypeScript",
    json:"JSON", md:"Markdown", py:"Python", php:"PHP", rb:"Ruby",
    png:"Image", jpg:"Image", jpeg:"Image", gif:"Image", svg:"Image",
    webp:"Image", mp4:"Video", webm:"Video", mp3:"Audio", wav:"Audio",
    txt:"Text", xml:"XML", yaml:"YAML", yml:"YAML"
  };
  return map[ext] || ext.toUpperCase() || "File";
}

/* ── LOCAL STORAGE ── */
function getBinLocal() {
  try {
    const raw = localStorage.getItem(BIN_LOCAL_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw);
    // filter expired
    const cutoff = Date.now() - (BIN_EXPIRE_DAYS * 24 * 60 * 60 * 1000);
    return items.filter(i => i.deletedAt > cutoff);
  } catch { return []; }
}

function saveBinLocal(item) {
  try {
    const items = getBinLocal();
    items.unshift(item);
    // keep max 50 items locally
    if (items.length > 50) items.splice(50);
    localStorage.setItem(BIN_LOCAL_KEY, JSON.stringify(items));
  } catch(e) {
    console.warn("Bin local save failed:", e.message);
  }
}

function removeBinLocal(id) {
  try {
    const items = getBinLocal().filter(i => i.id !== id);
    localStorage.setItem(BIN_LOCAL_KEY, JSON.stringify(items));
  } catch {}
}

function clearBinLocal() {
  localStorage.removeItem(BIN_LOCAL_KEY);
}

/* ── FIREBASE ── */
async function saveBinCloud(item) {
  const db = await initAnnounceDB(); if (!db) return;
  try {
    const { collection, addDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    // don't store huge base64 files in Firebase (cost/size)
    const cloudItem = { ...item };
    if (cloudItem.content && cloudItem.content.startsWith("data:")) {
      cloudItem.content = "[media_file_stored_locally]";
      cloudItem.isMedia = true;
    }
    await addDoc(collection(db, BIN_COLLECTION), cloudItem);
  } catch(e) { console.warn("Bin cloud save:", e.message); }
}

async function getBinCloud() {
  const db = await initAnnounceDB(); if (!db) return [];
  try {
    const { collection, getDocs, query, orderBy, limit } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDocs(
      query(collection(db, BIN_COLLECTION), orderBy("deletedAt","desc"), limit(100))
    );
    return snap.docs.map(d => ({ docId: d.id, ...d.data() }));
  } catch { return []; }
}

async function removeBinCloud(docId) {
  const db = await initAnnounceDB(); if (!db) return;
  try {
    const { doc, deleteDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(doc(db, BIN_COLLECTION, docId));
  } catch {}
}

/* ══════════════════════
   OPEN BIN PANEL
══════════════════════ */
async function openRecycleBin() {
  document.getElementById("binPanel")?.remove();

  const panel = document.createElement("div");
  panel.id = "binPanel";
  panel.innerHTML = `
    <div class="bin-overlay" onclick="closeRecycleBin()"></div>
    <div class="bin-window">

      <div class="bin-header">
        <div class="bin-header-left">
          <span class="bin-icon">🗑</span>
          <div>
            <div class="bin-title">Recycle Bin</div>
            <div class="bin-sub">Deleted files — restored anytime · Auto-purge after ${BIN_EXPIRE_DAYS} days</div>
          </div>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="bin-empty-btn" onclick="emptyBin()">🗑 Empty Bin</button>
          <button class="bin-close" onclick="closeRecycleBin()">✕</button>
        </div>
      </div>

      <div class="bin-toolbar">
        <input id="bin-search" class="bin-search" type="text" placeholder="Search deleted files..." oninput="renderBinList()">
        <div class="bin-filters">
          <button class="bin-filter active" onclick="setBinFilter('all',this)">All</button>
          <button class="bin-filter" onclick="setBinFilter('local',this)">📱 Local</button>
          <button class="bin-filter" onclick="setBinFilter('cloud',this)">☁ Cloud</button>
        </div>
      </div>

      <div id="bin-list" class="bin-list">
        <div class="bin-loading">// Loading bin...</div>
      </div>

      <div class="bin-footer">
        <span id="bin-count" class="bin-count">Loading...</span>
        <span class="bin-tip">💡 Files auto-deleted after ${BIN_EXPIRE_DAYS} days</span>
      </div>
    </div>`;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.querySelector(".bin-window").classList.add("bin-in"));

  await loadBinItems();
}

function closeRecycleBin() {
  const p = document.getElementById("binPanel"); if (!p) return;
  p.querySelector(".bin-window")?.classList.remove("bin-in");
  setTimeout(() => p.remove(), 350);
}

/* ══════════════════════
   LOAD + RENDER
══════════════════════ */
let binItems    = [];
let binFilter   = "all";

async function loadBinItems() {
  const list = document.getElementById("bin-list"); if (!list) return;
  list.innerHTML = `<div class="bin-loading">// Fetching deleted files...</div>`;

  const local = getBinLocal().map(i => ({ ...i, source:"local" }));

  let cloud = [];
  try {
    cloud = (await getBinCloud()).map(i => ({ ...i, source:"cloud" }));
  } catch {}

  // merge, deduplicate by id
  const seen = new Set();
  binItems = [];
  [...local, ...cloud].forEach(item => {
    if (!seen.has(item.id)) { seen.add(item.id); binItems.push(item); }
  });

  // sort by deletedAt desc
  binItems.sort((a,b) => (b.deletedAt||0) - (a.deletedAt||0));

  renderBinList();
}

function setBinFilter(f, btn) {
  binFilter = f;
  document.querySelectorAll(".bin-filter").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  renderBinList();
}

function renderBinList() {
  const list   = document.getElementById("bin-list"); if (!list) return;
  const count  = document.getElementById("bin-count");
  const search = document.getElementById("bin-search")?.value.toLowerCase() || "";

  let filtered = binItems.filter(item => {
    if (binFilter === "local" && item.source !== "local") return false;
    if (binFilter === "cloud" && item.source !== "cloud") return false;
    if (search && !item.filename.toLowerCase().includes(search)) return false;
    return true;
  });

  if (count) count.innerText = `${filtered.length} item${filtered.length!==1?"s":""} in bin`;

  if (!filtered.length) {
    list.innerHTML = `
      <div class="bin-empty">
        <div class="bin-empty-icon">🗑</div>
        <div class="bin-empty-title">Bin is empty</div>
        <div class="bin-empty-sub">${search ? "No files match your search" : "Deleted files will appear here"}</div>
      </div>`;
    return;
  }

  list.innerHTML = "";
  filtered.forEach(item => {
    const row = document.createElement("div");
    row.className = "bin-item";
    const age     = timeAgoBin(item.deletedAt);
    const sizeStr = formatBinSize(item.size);
    const isMedia = item.content?.startsWith("data:") || item.isMedia;
    const canPreview = item.content && !item.isMedia && item.content.length < 50000;

    row.innerHTML = `
      <div class="bin-item-icon">${getBinIcon(item.filename)}</div>
      <div class="bin-item-info">
        <div class="bin-item-name">${item.filename}</div>
        <div class="bin-item-meta">
          <span class="bin-item-type">${item.type||"File"}</span>
          <span class="bin-item-size">${sizeStr}</span>
          <span class="bin-item-date">Deleted ${age}</span>
          <span class="bin-item-source ${item.source==="cloud"?"bin-cloud":"bin-local"}">
            ${item.source==="cloud"?"☁ Cloud":"📱 Local"}
          </span>
        </div>
      </div>
      <div class="bin-item-actions">
        ${canPreview ? `<button class="bin-btn bin-btn-ghost" onclick="previewBinItem('${item.id}')">👁 Preview</button>` : ""}
        <button class="bin-btn bin-btn-restore" onclick="restoreFromBin('${item.id}')">↩ Restore</button>
        <button class="bin-btn bin-btn-delete"  onclick="permanentDelete('${item.id}','${item.docId||""}')">✕ Delete</button>
      </div>`;

    list.appendChild(row);
  });
}

/* ══════════════════════
   RESTORE FILE
══════════════════════ */
function restoreFromBin(id) {
  const item = binItems.find(i => i.id === id); if (!item) return;

  if (item.isMedia) {
    showToast("Media files stored locally only — cannot restore to editor", "info");
    return;
  }

  // restore to files
  let targetName = item.filename;
  if (typeof files !== "undefined" && files[targetName] !== undefined) {
    // file exists — restore with suffix
    const parts = targetName.split(".");
    const ext   = parts.length > 1 ? "." + parts.pop() : "";
    targetName  = parts.join(".") + "_restored" + ext;
  }

  if (typeof files !== "undefined") {
    files[targetName] = item.content || "";
  }

  // remove from bin
  removeBinLocal(id);
  binItems = binItems.filter(i => i.id !== id);

  if (typeof renderFiles === "function") renderFiles();
  if (typeof renderTabs  === "function") renderTabs();
  if (typeof openFile    === "function") openFile(targetName);

  renderBinList();
  showToast(`↩ Restored: ${targetName}`, "success");
}

/* ══════════════════════
   PREVIEW BIN ITEM
══════════════════════ */
function previewBinItem(id) {
  const item = binItems.find(i => i.id === id); if (!item || !item.content) return;

  document.getElementById("bin-preview-modal")?.remove();
  const modal = document.createElement("div");
  modal.id = "bin-preview-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;";
  modal.onclick = () => modal.remove();

  const escaped = item.content
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");

  modal.innerHTML = `
    <div style="background:#161b22;border:1px solid #1a2332;border-radius:10px;max-width:80vw;width:700px;max-height:70vh;overflow:auto;padding:16px;" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <span style="font-size:13px;color:#58a6ff;font-family:monospace;">${item.filename}</span>
        <button onclick="document.getElementById('bin-preview-modal').remove()" style="background:transparent;border:none;color:#666;font-size:16px;cursor:pointer;">✕</button>
      </div>
      <pre style="font-family:'Cascadia Code','Courier New',monospace;font-size:12px;color:#c0c8d8;white-space:pre-wrap;word-break:break-all;line-height:1.6;margin:0;">${escaped.slice(0,5000)}${item.content.length>5000?"\n\n// ... (truncated)":""}</pre>
    </div>
    <div style="font-size:11px;color:#3a5a8a;">Click outside to close</div>`;

  document.body.appendChild(modal);
}

/* ══════════════════════
   PERMANENT DELETE
══════════════════════ */
async function permanentDelete(id, docId) {
  if (!confirm("Permanently delete this file? This cannot be undone.")) return;
  removeBinLocal(id);
  if (docId) await removeBinCloud(docId);
  binItems = binItems.filter(i => i.id !== id);
  renderBinList();
  showToast("Permanently deleted", "info");
}

async function emptyBin() {
  if (!confirm(`Empty the entire recycle bin? This will permanently delete ${binItems.length} file(s).`)) return;
  showToast("Emptying bin...", "info");

  // delete all cloud items
  for (const item of binItems) {
    if (item.docId) await removeBinCloud(item.docId);
  }
  clearBinLocal();
  binItems = [];
  renderBinList();
  showToast("Bin emptied ✓", "success");
}

/* ══════════════════════
   HELPERS
══════════════════════ */
function getBinIcon(filename) {
  const ext = (filename||"").split(".").pop().toLowerCase();
  const m = {
    html:"🌐",htm:"🌐",css:"🎨",scss:"🎨",js:"⚡",ts:"🔷",
    json:"{}",md:"📝",py:"🐍",php:"🐘",rb:"💎",java:"☕",
    png:"🖼",jpg:"🖼",jpeg:"🖼",gif:"🖼",svg:"🖼",webp:"🖼",
    mp4:"🎬",webm:"🎬",mp3:"🎵",wav:"🎵",ogg:"🎵",
    txt:"📄",xml:"📄",yaml:"📐",yml:"📐",sh:"🖥"
  };
  return m[ext] || "📄";
}

function formatBinSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/(1024*1024)).toFixed(1) + " MB";
}

function timeAgoBin(ts) {
  if (!ts) return "unknown";
  const s = Math.floor((Date.now()-ts)/1000);
  if (s < 60)   return "just now";
  if (s < 3600) return Math.floor(s/60) + "m ago";
  if (s < 86400)return Math.floor(s/3600) + "h ago";
  return Math.floor(s/86400) + "d ago";
}

/* ══════════════════════
   HOOK deleteFile
   Intercept to send to bin
   instead of direct delete
══════════════════════ */
function initRecycleBin() {
  // Override deleteFile to send to bin first
  const originalDeleteFile = window.deleteFile;
  window.deleteFile = async function(file) {
    if (typeof files === "undefined" || files[file] === undefined) {
      if (originalDeleteFile) originalDeleteFile(file);
      return;
    }
    // send to bin
    await sendToBin(file, files[file]);
    // then do original delete (without confirm — we already have it in bin)
    delete files[file];
    if (typeof currentFile !== "undefined" && currentFile === file) {
      const remaining = Object.keys(files).filter(f=>!f.endsWith("/.gitkeep"));
      if (remaining.length && typeof openFile === "function") openFile(remaining[0]);
    }
    if (typeof splitFile !== "undefined" && splitFile === file) {
      if (typeof splitActive !== "undefined") window.splitActive = false;
      if (typeof updateSplitHeader === "function") updateSplitHeader();
    }
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs  === "function") renderTabs();
    if (typeof saveToStorage === "function") saveToStorage();
    showToast(`🗑 Moved to bin: ${file.split("/").pop()}`, "info");
  };
}