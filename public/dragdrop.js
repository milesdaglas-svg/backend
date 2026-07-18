/* =========================
   DRAG & DROP FILE MANAGER v1
   - Drag files into folders
   - Drag folders into folders
   - Touch/mobile support
   - Visual drag feedback
   - Works with nested paths
   - Undo last move
========================= */

let dragState = {
  dragging:   null,  // path being dragged
  type:       null,  // "file" | "folder"
  lastMove:   null,  // { from, to } for undo
  touchTimer: null,
};

/* ══════════════════════
   INIT — patches
   renderTreeNode to
   add drag support
══════════════════════ */
function initDragDrop() {
  // Observe fileList for changes and re-apply drag
  const list = document.getElementById("fileList");
  if (!list) return;

  const observer = new MutationObserver(() => applyDragToItems());
  observer.observe(list, { childList: true, subtree: true });

  // Apply immediately
  applyDragToItems();

  // keyboard undo: Ctrl+Z after drag
  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key === "z" && dragState.lastMove) {
      undoLastMove();
    }
  });
}

/* ══════════════════════
   APPLY DRAG ATTRS
   to all file + folder
   items in sidebar
══════════════════════ */
function applyDragToItems() {
  const list = document.getElementById("fileList"); if (!list) return;

  // FILE ITEMS — draggable
  list.querySelectorAll(".file-item").forEach(el => {
    if (el.dataset.dragInit) return;
    el.dataset.dragInit = "1";
    el.draggable = true;

    const path = el.querySelector(".file-name")?.title ||
                 el.querySelector(".file-name")?.innerText?.trim();
    if (!path) return;

    // Desktop drag
    el.addEventListener("dragstart", e => startDrag(e, path, "file", el));
    el.addEventListener("dragend",   e => endDrag(e, el));

    // Touch drag (long press = 400ms)
    el.addEventListener("touchstart", e => startTouchDrag(e, path, "file", el), {passive:true});
    el.addEventListener("touchmove",  onTouchMove, {passive:false});
    el.addEventListener("touchend",   onTouchEnd);
  });

  // FOLDER ITEMS — draggable AND droppable
  list.querySelectorAll(".folder-item").forEach(el => {
    if (el.dataset.dragInit) return;
    el.dataset.dragInit = "1";

    const name = el.querySelector(".folder-name")?.innerText?.trim();
    if (!name) return;

    // find folder path from siblings
    const path = getFolderPath(el, name);

    // Make folder draggable too
    el.draggable = true;
    el.addEventListener("dragstart", e => startDrag(e, path, "folder", el));
    el.addEventListener("dragend",   e => endDrag(e, el));

    // Drop target
    el.addEventListener("dragover",  e => onDragOver(e, el));
    el.addEventListener("dragleave", e => onDragLeave(e, el));
    el.addEventListener("drop",      e => onDrop(e, el, path));

    // Touch
    el.addEventListener("touchstart", e => startTouchDrag(e, path, "folder", el), {passive:true});
    el.addEventListener("touchmove",  onTouchMove, {passive:false});
    el.addEventListener("touchend",   onTouchEnd);
  });
}

/* ══════════════════════
   FIND FOLDER PATH
   Crawl up/down the DOM
   to find the full path
══════════════════════ */
function getFolderPath(folderEl, name) {
  // Try to find a file inside this folder to derive the path
  const next = folderEl.nextElementSibling; // folder-children div
  if (next?.classList.contains("folder-children")) {
    const firstFile = next.querySelector(".file-name");
    if (firstFile) {
      const filePath = firstFile.title || firstFile.innerText;
      const parts    = filePath.split("/");
      const idx      = parts.indexOf(name);
      if (idx !== -1) return parts.slice(0, idx+1).join("/");
    }
  }
  // Fallback: check files object
  if (typeof files !== "undefined") {
    const match = Object.keys(files).find(f => {
      const parts = f.split("/");
      return parts.includes(name);
    });
    if (match) {
      const parts = match.split("/");
      const idx   = parts.indexOf(name);
      if (idx !== -1) return parts.slice(0, idx+1).join("/");
    }
  }
  return name;
}

/* ══════════════════════
   DRAG START
══════════════════════ */
function startDrag(e, path, type, el) {
  dragState.dragging = path;
  dragState.type     = type;

  e.dataTransfer.setData("text/plain", path);
  e.dataTransfer.effectAllowed = "move";

  el.classList.add("dd-dragging");

  // ghost label
  const ghost = document.createElement("div");
  ghost.className = "dd-ghost";
  ghost.innerText = (type === "folder" ? "📁 " : getFileIcon ? getFileIcon(path.split("/").pop()) + " " : "📄 ") + path.split("/").pop();
  document.body.appendChild(ghost);
  e.dataTransfer.setDragImage(ghost, 10, 10);
  setTimeout(() => ghost.remove(), 0);
}

function endDrag(e, el) {
  el.classList.remove("dd-dragging");
  dragState.dragging = null;
  dragState.type     = null;
  clearAllDropTargets();
}

/* ══════════════════════
   DRAG OVER / LEAVE / DROP
══════════════════════ */
function onDragOver(e, el) {
  e.preventDefault();
  if (!dragState.dragging) return;

  const name = el.querySelector(".folder-name")?.innerText?.trim();
  const path = getFolderPath(el, name);

  // don't allow dropping into itself or its children
  if (dragState.dragging === path || path.startsWith(dragState.dragging + "/")) {
    e.dataTransfer.dropEffect = "none";
    return;
  }

  e.dataTransfer.dropEffect = "move";
  clearAllDropTargets();
  el.classList.add("dd-target");
}

function onDragLeave(e, el) {
  // only remove if leaving the element entirely
  if (!el.contains(e.relatedTarget)) {
    el.classList.remove("dd-target");
  }
}

function onDrop(e, el, folderPath) {
  e.preventDefault();
  el.classList.remove("dd-target");
  clearAllDropTargets();

  const srcPath = dragState.dragging || e.dataTransfer.getData("text/plain");
  const srcType = dragState.dragging ? dragState.type : "file";
  dragState.dragging = null;

  if (!srcPath || srcPath === folderPath || folderPath.startsWith(srcPath+"/")) return;

  if (srcType === "folder") {
    moveFolderInto(srcPath, folderPath);
  } else {
    moveFileInto(srcPath, folderPath);
  }
}

/* ══════════════════════
   MOVE FILE
══════════════════════ */
function moveFileInto(srcPath, destFolder) {
  if (typeof files === "undefined") return;
  if (files[srcPath] === undefined) return;

  const filename = srcPath.split("/").pop();
  const destPath = destFolder + "/" + filename;

  if (files[destPath] !== undefined) {
    showToast(`"${filename}" already exists in ${destFolder}`, "error");
    return;
  }

  // save undo
  dragState.lastMove = { srcPath, destPath, type:"file" };

  files[destPath] = files[srcPath];
  delete files[srcPath];

  if (typeof openFolders !== "undefined") openFolders.add(destFolder);
  if (typeof currentFile !== "undefined" && currentFile === srcPath) {
    window.currentFile = destPath;
  }
  if (typeof splitFile !== "undefined" && splitFile === srcPath) {
    window.splitFile = destPath;
  }

  if (typeof renderFiles    === "function") renderFiles();
  if (typeof renderTabs     === "function") renderTabs();
  if (typeof saveToStorage  === "function") saveToStorage();

  showToast(`✓ Moved to ${destFolder}/ · Ctrl+Z to undo`, "success");
}

/* ══════════════════════
   MOVE FOLDER
══════════════════════ */
function moveFolderInto(srcFolder, destFolder) {
  if (typeof files === "undefined") return;

  const folderName = srcFolder.split("/").pop();
  const newBase    = destFolder + "/" + folderName;

  // check for conflict
  const conflicts = Object.keys(files).filter(f => f.startsWith(newBase + "/"));
  if (conflicts.length) {
    showToast(`Folder "${folderName}" already exists in ${destFolder}`, "error");
    return;
  }

  // get all files in source folder
  const toMove = Object.keys(files).filter(f => f.startsWith(srcFolder + "/"));
  if (!toMove.length) { showToast("Folder is empty", "info"); return; }

  // save undo state
  const undoMap = {};
  toMove.forEach(f => { undoMap[f] = f.replace(srcFolder, newBase); });
  dragState.lastMove = { type:"folder", undoMap };

  // move all files
  toMove.forEach(f => {
    const newPath = f.replace(srcFolder, newBase);
    files[newPath] = files[f];
    delete files[f];
  });

  // update openFolders
  if (typeof openFolders !== "undefined") {
    openFolders.delete(srcFolder);
    openFolders.add(destFolder);
    openFolders.add(newBase);
  }

  // fix currentFile if needed
  if (typeof currentFile !== "undefined" && currentFile.startsWith(srcFolder+"/")) {
    window.currentFile = currentFile.replace(srcFolder, newBase);
  }

  if (typeof renderFiles   === "function") renderFiles();
  if (typeof renderTabs    === "function") renderTabs();
  if (typeof saveToStorage === "function") saveToStorage();

  showToast(`✓ Moved folder to ${destFolder}/ · Ctrl+Z to undo`, "success");
}

/* ══════════════════════
   UNDO LAST MOVE
══════════════════════ */
function undoLastMove() {
  const lm = dragState.lastMove; if (!lm) return;

  if (lm.type === "file") {
    if (files[lm.destPath] === undefined) { showToast("Can't undo — file was modified", "error"); return; }
    files[lm.srcPath] = files[lm.destPath];
    delete files[lm.destPath];
    if (typeof currentFile !== "undefined" && currentFile === lm.destPath) window.currentFile = lm.srcPath;
    showToast("↩ Move undone", "success");

  } else if (lm.type === "folder") {
    Object.entries(lm.undoMap).forEach(([orig, moved]) => {
      if (files[moved] !== undefined) {
        files[orig] = files[moved];
        delete files[moved];
      }
    });
    showToast("↩ Folder move undone", "success");
  }

  dragState.lastMove = null;
  if (typeof renderFiles   === "function") renderFiles();
  if (typeof renderTabs    === "function") renderTabs();
  if (typeof saveToStorage === "function") saveToStorage();
}

/* ══════════════════════
   TOUCH DRAG (mobile)
   Long press to start
══════════════════════ */
let touchDragEl   = null;
let touchClone    = null;
let touchSrcPath  = null;
let touchSrcType  = null;

function startTouchDrag(e, path, type, el) {
  dragState.touchTimer = setTimeout(() => {
    touchSrcPath = path;
    touchSrcType = type;
    touchDragEl  = el;

    // create floating clone
    const rect = el.getBoundingClientRect();
    touchClone  = el.cloneNode(true);
    touchClone.className = "dd-touch-clone";
    touchClone.style.cssText = `
      position:fixed; z-index:99999; pointer-events:none;
      left:${rect.left}px; top:${rect.top}px;
      width:${rect.width}px; opacity:0.85;
    `;
    document.body.appendChild(touchClone);
    el.classList.add("dd-dragging");

    // vibrate on mobile
    if (navigator.vibrate) navigator.vibrate(50);

    showToast("Drag to a folder to move", "info");
  }, 400);
}

function onTouchMove(e) {
  if (!touchClone) return;
  e.preventDefault();
  const touch = e.touches[0];
  touchClone.style.left = (touch.clientX - 60) + "px";
  touchClone.style.top  = (touch.clientY - 20) + "px";

  // highlight folder under finger
  touchClone.style.display = "none";
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  touchClone.style.display = "";

  clearAllDropTargets();
  const folder = el?.closest(".folder-item");
  if (folder) folder.classList.add("dd-target");
}

function onTouchEnd(e) {
  clearTimeout(dragState.touchTimer);
  if (!touchClone) return;

  const touch = e.changedTouches[0];
  touchClone.style.display = "none";
  const el = document.elementFromPoint(touch.clientX, touch.clientY);
  touchClone.style.display = "";
  touchClone.remove();
  touchClone = null;

  touchDragEl?.classList.remove("dd-dragging");
  clearAllDropTargets();

  if (!touchSrcPath) return;

  const folder = el?.closest(".folder-item");
  if (folder) {
    const name       = folder.querySelector(".folder-name")?.innerText?.trim();
    const folderPath = getFolderPath(folder, name);
    if (touchSrcType === "folder") {
      moveFolderInto(touchSrcPath, folderPath);
    } else {
      moveFileInto(touchSrcPath, folderPath);
    }
  }

  touchSrcPath = null; touchSrcType = null; touchDragEl = null;
}

/* ══════════════════════
   HELPERS
══════════════════════ */
function clearAllDropTargets() {
  document.querySelectorAll(".dd-target").forEach(el => el.classList.remove("dd-target"));
}

/* ══════════════════════
   DROP ZONE on editor area
   (drag from desktop OS
    onto the editor)
══════════════════════ */
function initEditorDropZone() {
  const editorArea = document.querySelector(".editor-area");
  if (!editorArea) return;

  editorArea.addEventListener("dragover", e => {
    // only for external files (from OS)
    if (e.dataTransfer.types.includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      editorArea.classList.add("dd-editor-target");
    }
  });

  editorArea.addEventListener("dragleave", e => {
    if (!editorArea.contains(e.relatedTarget)) {
      editorArea.classList.remove("dd-editor-target");
    }
  });

  editorArea.addEventListener("drop", async e => {
    editorArea.classList.remove("dd-editor-target");
    if (!e.dataTransfer.types.includes("Files")) return;
    e.preventDefault();

    const droppedFiles = Array.from(e.dataTransfer.files);
    let count = 0;

    for (const file of droppedFiles) {
      try {
        const text = await file.text();
        const name = file.name;
        if (typeof files !== "undefined") {
          files[name] = text;
          count++;
        }
      } catch {
        // binary file — try as media
        if (typeof mpHandleFiles === "function") {
          await mpHandleFiles([file]);
        }
      }
    }

    if (count > 0) {
      if (typeof renderFiles === "function") renderFiles();
      if (typeof renderTabs  === "function") renderTabs();
      const firstName = droppedFiles[0]?.name;
      if (firstName && typeof files !== "undefined" && files[firstName] !== undefined) {
        if (typeof openFile === "function") openFile(firstName);
      }
      showToast(`✓ Dropped ${count} file(s) into project`, "success");
    }
  });
}