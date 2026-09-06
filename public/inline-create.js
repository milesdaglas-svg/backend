/* ══════════════════════════════════════════════════════
   INLINE FILE/FOLDER CREATION — real VS Code style
   Replaces the old window.prompt() boxes: a text input drops
   straight into the tree, right where the new item will live.
   Its icon updates live as you type — type ".c" and it shows
   the C icon, keep going to ".cpp" and it switches to the C++
   icon — exactly like watching VS Code's own file icon theme
   react while you name a new file.

   Must load AFTER app.js and file-icons.js.
══════════════════════════════════════════════════════ */

let icPending = null; // { kind:'file'|'folder', parentPath:string }

function icStart(kind, parentPath) {
  icPending = { kind, parentPath: parentPath || "" };
  if (parentPath) openFolders.add(parentPath); // reveal the folder it'll land in
  renderFiles();
}

function icCancel() {
  icPending = null;
  renderFiles();
}

function icCommit(rawName) {
  const pending = icPending;
  icPending = null;
  const name = (rawName || "").trim();
  if (!name) { renderFiles(); return; }
  const full = pending.parentPath ? pending.parentPath + "/" + name : name;

  if (pending.kind === "file") {
    if (files[full] !== undefined) { showToast("Already exists!", "error"); renderFiles(); return; }
    if (full.endsWith(".html")) files[full] = `<!DOCTYPE html>\n<html lang="en">\n<head>\n<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<title>${full.split("/").pop()}</title>\n</head>\n<body>\n\n</body>\n</html>`;
    else if (full.endsWith(".css")) files[full] = `/* ${full.split("/").pop()} */\n`;
    else if (/\.(js|jsx|ts|tsx|mjs|cjs)$/.test(full)) files[full] = `// ${full.split("/").pop()}\n`;
    else files[full] = "";
    const parts = full.split("/"); for (let i = 1; i < parts.length; i++) openFolders.add(parts.slice(0, i).join("/"));
    renderFiles(); renderTabs(); openFile(full); showToast("Created " + full, "success");
  } else {
    files[full + "/.gitkeep"] = "";
    const parts = full.split("/"); for (let i = 1; i <= parts.length; i++) openFolders.add(parts.slice(0, i).join("/"));
    renderFiles(); showToast("Created folder " + full, "success");
  }
  if (typeof saveToStorage === "function") saveToStorage();
}

function icRenderRow(container, path) {
  const row = document.createElement("div");
  row.className = (icPending.kind === "file" ? "file-item" : "folder-item") + " ic-row";
  const depth = path ? path.split("/").filter(Boolean).length : 0;
  row.style.paddingLeft = (depth * 14 + (icPending.kind === "file" ? 8 : 6)) + "px";

  const iconSpan = document.createElement("span");
  iconSpan.className = "ic-icon";
  iconSpan.innerHTML = icPending.kind === "file" ? getFileIcon("") : getFolderIcon("", false);

  const input = document.createElement("input");
  input.className = "ic-input";
  input.type = "text";
  input.placeholder = icPending.kind === "file" ? "filename.ext" : "folder name";

  row.appendChild(iconSpan);
  row.appendChild(input);
  container.prepend(row);
  input.focus();

  input.addEventListener("input", () => {
    const val = input.value.trim();
    iconSpan.innerHTML = icPending.kind === "file" ? getFileIcon(val) : getFolderIcon(val, false);
  });
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") icCommit(input.value);
    else if (e.key === "Escape") icCancel();
  });
  input.addEventListener("blur", () => {
    // slight delay so a click elsewhere in the tree doesn't race the commit
    setTimeout(() => { if (icPending) icCommit(input.value); }, 80);
  });
}

/* wrap the app's own renderFiles() so the pending row survives every
   re-render (folder toggles, etc.) until it's actually committed/cancelled */
(function icHookRenderFiles(){
  const originalRenderFiles = window.renderFiles;
  if (typeof originalRenderFiles !== "function") return;
  window.renderFiles = function(){
    originalRenderFiles.apply(this, arguments);
    if (!icPending) return;
    let container;
    if (!icPending.parentPath) {
      container = document.getElementById("fileList");
    } else {
      const fd = document.querySelector('.folder-item[data-path="' + CSS.escape(icPending.parentPath) + '"]');
      container = fd ? fd.nextElementSibling : null;
    }
    if (container) icRenderRow(container, icPending.parentPath);
    else icPending = null; // folder isn't visible (e.g. got collapsed) — bail cleanly
  };
})();

/* rewire every entry point that used to open a window.prompt() */
document.getElementById("newFileBtn").onclick = () => icStart("file", "");
document.getElementById("newFolderBtn").onclick = () => icStart("folder", "");
function newFileInFolder(parentPath) { icStart("file", parentPath); }
function newFolderInFolder(parentPath) { icStart("folder", parentPath); }
