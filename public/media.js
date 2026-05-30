/* =========================
   MEDIA MANAGER v1
   - Upload images/video/audio
     from device gallery
   - Search & import from online
   - Drag & drop into file tree
   - Preview media files
   - Insert into editor as HTML
   - Stores as base64 in files{}
========================= */

const MEDIA_EXTENSIONS = {
  image: ["png","jpg","jpeg","gif","webp","svg","ico","bmp"],
  video: ["mp4","webm","ogg","mov","avi"],
  audio: ["mp3","wav","ogg","m4a","aac","flac"]
};

function getMediaType(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  if (MEDIA_EXTENSIONS.image.includes(ext)) return "image";
  if (MEDIA_EXTENSIONS.video.includes(ext)) return "video";
  if (MEDIA_EXTENSIONS.audio.includes(ext)) return "audio";
  return null;
}

function isMediaFile(filename) {
  return getMediaType(filename) !== null;
}

/* ══════════════════════
   BUILD MEDIA PANEL
══════════════════════ */
function openMediaManager() {
  document.getElementById("mediaPanel")?.remove();

  const panel = document.createElement("div");
  panel.id = "mediaPanel";
  panel.innerHTML = `
    <div class="mp-overlay" onclick="closeMediaManager()"></div>
    <div class="mp-window">

      <!-- HEADER -->
      <div class="mp-header">
        <div class="mp-header-left">
          <span class="mp-icon">🗂</span>
          <div>
            <div class="mp-title">Media Manager</div>
            <div class="mp-sub">Images · Videos · Audio — from device or online</div>
          </div>
        </div>
        <button class="mp-close" onclick="closeMediaManager()">✕</button>
      </div>

      <!-- TABS -->
      <div class="mp-tabs">
        <button class="mp-tab active" onclick="mpTab('upload',this)">📁 Upload from Device</button>
        <button class="mp-tab" onclick="mpTab('online',this)">🌐 Search Online</button>
        <button class="mp-tab" onclick="mpTab('library',this)">🖼 My Media Library</button>
      </div>

      <!-- UPLOAD TAB -->
      <div class="mp-content" id="mp-upload">
        <div class="mp-dropzone" id="mp-dropzone">
          <div class="mp-drop-icon">📂</div>
          <div class="mp-drop-title">Drop files here or click to browse</div>
          <div class="mp-drop-sub">Supports: PNG, JPG, GIF, WebP, SVG, MP4, WebM, MP3, WAV, OGG and more</div>
          <input type="file" id="mp-file-input" multiple accept="image/*,video/*,audio/*" style="display:none">
          <div class="mp-drop-btns">
            <button class="mp-btn mp-btn-primary" onclick="document.getElementById('mp-file-input').click()">
              🖼 Images
            </button>
            <button class="mp-btn mp-btn-secondary" onclick="mpOpenCamera()">
              📷 Camera
            </button>
          </div>
        </div>
        <div id="mp-upload-preview" class="mp-preview-grid"></div>
      </div>

      <!-- ONLINE SEARCH TAB -->
      <div class="mp-content hidden" id="mp-online">
        <div class="mp-search-row">
          <input id="mp-search-input" class="mp-search-box" type="text" placeholder="Search images online (e.g. nature, city, food)...">
          <select id="mp-search-type" class="mp-search-select">
            <option value="unsplash">📷 Unsplash Photos</option>
            <option value="pixabay">🎨 Pixabay</option>
            <option value="url">🔗 Direct URL</option>
          </select>
          <button class="mp-btn mp-btn-primary" onclick="mpSearchOnline()">Search</button>
        </div>
        <!-- URL import -->
        <div id="mp-url-row" class="mp-url-row hidden">
          <input id="mp-url-input" class="mp-search-box" type="text" placeholder="Paste image/video/audio URL...">
          <button class="mp-btn mp-btn-primary" onclick="mpImportFromUrl()">Import</button>
        </div>
        <div id="mp-online-grid" class="mp-preview-grid"></div>
      </div>

      <!-- LIBRARY TAB -->
      <div class="mp-content hidden" id="mp-library">
        <div class="mp-library-toolbar">
          <span class="mp-lib-count" id="mp-lib-count">0 media files</span>
          <div style="display:flex;gap:6px;">
            <button class="mp-btn mp-btn-ghost" onclick="mpFilterLibrary('all')">All</button>
            <button class="mp-btn mp-btn-ghost" onclick="mpFilterLibrary('image')">🖼 Images</button>
            <button class="mp-btn mp-btn-ghost" onclick="mpFilterLibrary('video')">🎬 Videos</button>
            <button class="mp-btn mp-btn-ghost" onclick="mpFilterLibrary('audio')">🎵 Audio</button>
          </div>
        </div>
        <div id="mp-library-grid" class="mp-preview-grid"></div>
      </div>

    </div>`;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.querySelector(".mp-window").classList.add("mp-in"));

  // setup file input
  document.getElementById("mp-file-input").addEventListener("change", e => {
    mpHandleFiles(Array.from(e.target.files));
  });

  // setup drag & drop zone
  setupDropZone();

  // show search type toggle
  document.getElementById("mp-search-type").addEventListener("change", e => {
    const urlRow = document.getElementById("mp-url-row");
    urlRow.classList.toggle("hidden", e.target.value !== "url");
  });

  // load library
  mpRenderLibrary();
}

function closeMediaManager() {
  const p = document.getElementById("mediaPanel"); if (!p) return;
  p.querySelector(".mp-window")?.classList.remove("mp-in");
  setTimeout(() => p.remove(), 350);
}

function mpTab(name, btn) {
  document.querySelectorAll(".mp-tab").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".mp-content").forEach(c => c.classList.add("hidden"));
  btn.classList.add("active");
  document.getElementById("mp-" + name)?.classList.remove("hidden");
  if (name === "library") mpRenderLibrary();
}

/* ══════════════════════
   DRAG & DROP ZONE
══════════════════════ */
function setupDropZone() {
  const zone = document.getElementById("mp-dropzone"); if (!zone) return;

  zone.addEventListener("dragover", e => {
    e.preventDefault(); zone.classList.add("mp-drag-over");
  });
  zone.addEventListener("dragleave", () => zone.classList.remove("mp-drag-over"));
  zone.addEventListener("drop", e => {
    e.preventDefault(); zone.classList.remove("mp-drag-over");
    const files = Array.from(e.dataTransfer.files);
    mpHandleFiles(files);
  });
}

/* ══════════════════════
   HANDLE UPLOADED FILES
══════════════════════ */
async function mpHandleFiles(fileList) {
  const grid = document.getElementById("mp-upload-preview"); if (!grid) return;

  for (const file of fileList) {
    const type = getMediaType(file.name) || (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : null);
    if (!type) { showToast(`Skipped: ${file.name} (unsupported)`, "info"); continue; }

    try {
      const dataUrl = await fileToDataUrl(file);
      // store in files object
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      files["media/" + safeName] = dataUrl;

      // render preview card
      const card = createMediaCard(safeName, dataUrl, type, "media/" + safeName);
      grid.prepend(card);

      if (typeof renderFiles === "function") renderFiles();
      showToast(`✓ Added: ${safeName}`, "success");
    } catch(e) {
      showToast(`Failed: ${file.name}`, "error");
    }
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ══════════════════════
   CAMERA
══════════════════════ */
function mpOpenCamera() {
  const input = document.createElement("input");
  input.type    = "file";
  input.accept  = "image/*";
  input.capture = "environment";
  input.onchange = e => mpHandleFiles(Array.from(e.target.files));
  input.click();
}

/* ══════════════════════
   ONLINE SEARCH
══════════════════════ */
async function mpSearchOnline() {
  const q    = document.getElementById("mp-search-input")?.value.trim(); if (!q) return;
  const type = document.getElementById("mp-search-type")?.value;
  const grid = document.getElementById("mp-online-grid"); if (!grid) return;

  grid.innerHTML = `<div class="mp-loading">🔍 Searching...</div>`;

  if (type === "unsplash") {
    const key = typeof getUnsplashKey === "function" ? getUnsplashKey() : "";
    try {
      let results = [];
      if (key) {
        const res = await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(q)}&per_page=18&client_id=${key}`);
        const data = await res.json();
        results = (data.results || []).map(img => ({
          thumb: img.urls.small, full: img.urls.regular,
          name: img.slug || q, credit: img.user.name
        }));
      } else {
        // fallback picsum
        results = Array.from({length:12},(_,i)=>({
          thumb:`https://picsum.photos/seed/${encodeURIComponent(q)}${i}/200/150`,
          full:`https://picsum.photos/seed/${encodeURIComponent(q)}${i}/800/600`,
          name:`${q}_${i+1}`, credit:"Picsum"
        }));
      }
      grid.innerHTML = "";
      results.forEach(img => {
        const card = document.createElement("div");
        card.className = "mp-card";
        card.innerHTML = `
          <div class="mp-card-preview">
            <img src="${img.thumb}" alt="${img.name}" loading="lazy">
          </div>
          <div class="mp-card-info">
            <span class="mp-card-name">${img.name.slice(0,20)}</span>
            <span class="mp-card-credit">${img.credit}</span>
          </div>
          <div class="mp-card-actions">
            <button onclick="mpInsertOnlineImage('${img.full}','${img.name}')">⚡ Insert</button>
            <button onclick="mpImportOnlineToFiles('${img.full}','${img.name}')">💾 Save</button>
          </div>`;
        grid.appendChild(card);
      });
    } catch(e) {
      grid.innerHTML = `<div class="mp-loading">Search failed. Add Unsplash key in ⚙ Settings.</div>`;
    }
  } else if (type === "pixabay") {
    grid.innerHTML = `<div class="mp-loading">Add a Pixabay API key in ⚙ Settings to search Pixabay.</div>`;
  }
}

async function mpImportOnlineToFiles(url, name) {
  try {
    showToast("Importing...", "info");
    const res  = await fetch(url);
    const blob = await res.blob();
    const file = new File([blob], name + ".jpg", {type: blob.type});
    await mpHandleFiles([file]);
  } catch(e) {
    // fallback — store URL directly
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g,"_") + ".jpg";
    files["media/" + safeName] = url;
    if (typeof renderFiles === "function") renderFiles();
    showToast("Saved as URL reference: " + safeName, "success");
  }
}

function mpInsertOnlineImage(url, alt) {
  const tag = `<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;">`;
  if (window.editor1) {
    const pos = window.editor1.getPosition();
    window.editor1.executeEdits("mp", [{
      range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
      text: tag
    }]);
    window.editor1.focus();
    showToast("Image inserted ✓", "success");
    closeMediaManager();
  }
}

function mpImportFromUrl() {
  const url = document.getElementById("mp-url-input")?.value.trim(); if (!url) return;
  const ext  = url.split("?")[0].split(".").pop().toLowerCase();
  const type = getMediaType("file." + ext) || "image";
  const name = "imported_" + Date.now() + "." + (ext || "jpg");
  files["media/" + name] = url;
  if (typeof renderFiles === "function") renderFiles();
  showToast("Imported: " + name, "success");
  mpRenderLibrary();
}

/* ══════════════════════
   MEDIA LIBRARY
══════════════════════ */
let mpLibFilter = "all";

function mpFilterLibrary(type) {
  mpLibFilter = type;
  mpRenderLibrary();
}

function mpRenderLibrary() {
  const grid = document.getElementById("mp-library-grid"); if (!grid) return;
  const count = document.getElementById("mp-lib-count");

  const mediaFiles = Object.entries(files || {}).filter(([path]) => {
    if (path.endsWith("/.gitkeep")) return false;
    const type = getMediaType(path);
    if (!type) return false;
    if (mpLibFilter === "all") return true;
    return type === mpLibFilter;
  });

  if (count) count.innerText = `${mediaFiles.length} media file${mediaFiles.length!==1?"s":""}`;

  if (!mediaFiles.length) {
    grid.innerHTML = `<div class="mp-loading">// No ${mpLibFilter === "all" ? "" : mpLibFilter + " "}files yet. Upload or import some!</div>`;
    return;
  }

  grid.innerHTML = "";
  mediaFiles.forEach(([path, content]) => {
    const name = path.split("/").pop();
    const type = getMediaType(path) || "image";
    const card = createMediaCard(name, content, type, path);
    grid.appendChild(card);
  });
}

function createMediaCard(name, content, type, fullPath) {
  const card = document.createElement("div");
  card.className = "mp-card";

  let preview = "";
  if (type === "image") {
    preview = `<img src="${content}" alt="${name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;">`;
  } else if (type === "video") {
    preview = `<video src="${content}" style="width:100%;height:100%;object-fit:cover;" muted></video>
               <div class="mp-play-icon">▶</div>`;
  } else if (type === "audio") {
    preview = `<div class="mp-audio-icon">🎵</div><div class="mp-audio-name">${name}</div>`;
  }

  card.innerHTML = `
    <div class="mp-card-preview mp-card-${type}">${preview}</div>
    <div class="mp-card-info">
      <span class="mp-card-name" title="${fullPath}">${name.slice(0,18)}${name.length>18?"...":""}</span>
      <span class="mp-card-type">${type}</span>
    </div>
    <div class="mp-card-actions">
      <button onclick="mpInsertIntoEditor('${fullPath}','${type}','${name}')" title="Insert into editor">⚡ Insert</button>
      <button onclick="mpPreviewFile('${fullPath}','${type}')" title="Preview">👁</button>
      <button onclick="mpDeleteMedia('${fullPath}')" title="Delete" style="color:#e74c3c;">🗑</button>
    </div>`;

  return card;
}

/* ══════════════════════
   INSERT INTO EDITOR
══════════════════════ */
function mpInsertIntoEditor(path, type, name) {
  let tag = "";
  const content = files[path] || path;

  if (type === "image") {
    tag = `<img src="${content}" alt="${name}" style="max-width:100%;height:auto;">`;
  } else if (type === "video") {
    tag = `<video src="${content}" controls style="max-width:100%;"></video>`;
  } else if (type === "audio") {
    tag = `<audio src="${content}" controls></audio>`;
  }

  if (window.editor1 && tag) {
    const pos = window.editor1.getPosition();
    window.editor1.executeEdits("mp", [{
      range: new monaco.Range(pos.lineNumber, pos.column, pos.lineNumber, pos.column),
      text: tag
    }]);
    window.editor1.focus();
    showToast(`${type} inserted ✓`, "success");
    closeMediaManager();
  }
}

/* ══════════════════════
   PREVIEW FILE
══════════════════════ */
function mpPreviewFile(path, type) {
  const content = files[path] || path;
  document.getElementById("mp-preview-modal")?.remove();

  const modal = document.createElement("div");
  modal.id = "mp-preview-modal";
  modal.style.cssText = "position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.92);display:flex;align-items:center;justify-content:center;";
  modal.onclick = () => modal.remove();

  let inner = "";
  if (type === "image") inner = `<img src="${content}" style="max-width:90vw;max-height:90vh;border-radius:8px;object-fit:contain;">`;
  else if (type === "video") inner = `<video src="${content}" controls autoplay style="max-width:90vw;max-height:90vh;border-radius:8px;"></video>`;
  else if (type === "audio") inner = `<div style="background:#161b22;border-radius:12px;padding:30px;text-align:center;"><div style="font-size:48px;margin-bottom:16px;">🎵</div><audio src="${content}" controls autoplay></audio></div>`;

  modal.innerHTML = `<div onclick="event.stopPropagation()">${inner}</div>
    <button onclick="document.getElementById('mp-preview-modal').remove()" style="position:absolute;top:16px;right:20px;background:rgba(255,255,255,0.1);border:none;color:white;font-size:18px;padding:6px 14px;border-radius:6px;cursor:pointer;">✕</button>`;
  document.body.appendChild(modal);
}

/* ══════════════════════
   DELETE MEDIA
══════════════════════ */
function mpDeleteMedia(path) {
  if (!confirm(`Delete "${path.split("/").pop()}"?`)) return;
  delete files[path];
  if (typeof renderFiles === "function") renderFiles();
  mpRenderLibrary();
  showToast("Deleted", "info");
}

/* ══════════════════════
   DRAG FILES INTO SIDEBAR
   (onto folder items)
══════════════════════ */
function setupFileDragDrop() {
  // Make file items draggable
  document.getElementById("fileList")?.addEventListener("dragstart", e => {
    const item = e.target.closest(".file-item");
    if (!item) return;
    const fname = item.querySelector(".file-name")?.title || item.querySelector(".file-name")?.innerText;
    if (fname) {
      e.dataTransfer.setData("text/plain", fname);
      e.dataTransfer.effectAllowed = "move";
      item.classList.add("dragging");
    }
  });

  document.getElementById("fileList")?.addEventListener("dragend", e => {
    document.querySelectorAll(".file-item.dragging").forEach(el => el.classList.remove("dragging"));
    document.querySelectorAll(".folder-item.drag-target").forEach(el => el.classList.remove("drag-target"));
  });

  document.getElementById("fileList")?.addEventListener("dragover", e => {
    e.preventDefault();
    const folder = e.target.closest(".folder-item");
    document.querySelectorAll(".folder-item.drag-target").forEach(el => el.classList.remove("drag-target"));
    if (folder) { folder.classList.add("drag-target"); e.dataTransfer.dropEffect = "move"; }
  });

  document.getElementById("fileList")?.addEventListener("drop", e => {
    e.preventDefault();
    const draggedFile = e.dataTransfer.getData("text/plain");
    const folder = e.target.closest(".folder-item");
    document.querySelectorAll(".folder-item.drag-target").forEach(el => el.classList.remove("drag-target"));

    if (!draggedFile || !folder) return;

    const folderName = folder.querySelector(".folder-name")?.innerText;
    if (!folderName || !files[draggedFile]) return;

    // find folder path
    const folderPath = Object.keys(files).find(f => {
      const parts = f.split("/");
      return parts[parts.length-2] === folderName || f.endsWith("/"+folderName+"/.gitkeep");
    });

    const targetFolder = folderPath
      ? folderPath.replace("/.gitkeep","").split("/").slice(0,-1).join("/")+"/"+folderName
      : folderName;

    const newPath = targetFolder + "/" + draggedFile.split("/").pop();

    if (files[newPath] !== undefined) { showToast("File already exists in that folder!", "error"); return; }

    files[newPath] = files[draggedFile];
    delete files[draggedFile];

    if (typeof openFolders !== "undefined") openFolders.add(targetFolder);
    if (typeof renderFiles === "function") renderFiles();
    if (typeof renderTabs  === "function") renderTabs();
    if (typeof currentFile !== "undefined" && currentFile === draggedFile) {
      if (typeof openFile === "function") openFile(newPath);
    }

    showToast(`Moved to ${targetFolder}/`, "success");
  });

  // Make file items have draggable=true
  const observer = new MutationObserver(() => {
    document.querySelectorAll(".file-item").forEach(el => {
      el.draggable = true;
    });
  });
  const list = document.getElementById("fileList");
  if (list) observer.observe(list, { childList: true, subtree: true });
}

/* ══════════════════════
   INIT on load
══════════════════════ */
function initMediaManager() {
  setupFileDragDrop();
}