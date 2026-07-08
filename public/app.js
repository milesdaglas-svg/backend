/* =========================
   APP.JS — FULL FINAL VERSION
========================= */
let editor1, editor2;
let isSyncing   = false;
let currentFile = "index.html";
let splitFile   = "about.html";
let splitActive = false;
let aiChatHistory = [];
let currentSessionId = "session_"+Date.now();

let files = {
  "index.html":`<!DOCTYPE html>\n<html>\n<head>\n<title>VS Code GOD MODE</title>\n<link rel="stylesheet" href="style.css">\n</head>\n<body>\n<h1>⚡ VS Code Ultra Pro Max</h1>\n<a href="about.html">About</a>\n<script src="script.js"><\/script>\n</body>\n</html>`,
  "about.html":`<!DOCTYPE html>\n<html>\n<head><title>About</title></head>\n<body>\n<h1>ABOUT PAGE</h1>\n<a href="index.html">Home</a>\n</body>\n</html>`,
  "style.css":`body{\nbackground:#111;\ncolor:white;\nfont-family:Arial;\npadding:40px;\n}`,
  "script.js":`console.log("VS Code God Mode");`
};
let openFolders=new Set();
const PROJECT_TEMPLATES = {
  blank: { "index.html":`<!DOCTYPE html>\n<html><head><title>New Project</title></head><body><h1>Hello</h1></body></html>` },
  "react-cdn": {
    "index.html":`<!DOCTYPE html>\n<html>\n<head>\n<title>React App</title>\n<script src="https://unpkg.com/react@18/umd/react.development.js"><\/script>\n<script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>\n<script src="https://unpkg.com/@babel/standalone/babel.min.js"><\/script>\n</head>\n<body>\n<div id="root"></div>\n<script type="text/babel" src="app.js"><\/script>\n</body>\n</html>`,
    "app.js":`function App(){\n  return <h1>Hello React 👋</h1>;\n}\nReactDOM.createRoot(document.getElementById("root")).render(<App/>);`
  },
  "express-api": {
    "server.js":`const express = require("express");\nconst app = express();\napp.get("/", (req,res)=>res.send("Hello from Express!"));\napp.listen(3000, ()=>console.log("Server on port 3000"));`,
    "package.json":`{\n  "name": "my-api",\n  "scripts": { "start": "node server.js" },\n  "dependencies": { "express": "^4.18.2" }\n}`
  }
};

function openTemplateMenu(){
  document.querySelector(".snippet-overlay")?.remove();
  document.querySelector(".snippet-menu")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "snippet-overlay";
  overlay.onclick = ()=>{ overlay.remove(); menu.remove(); };
  const menu = document.createElement("div");
  menu.className = "snippet-menu";
  menu.innerHTML = `
    <div class="snippet-menu-header"><span>📦 New Project From Template</span><button onclick="this.closest('.snippet-menu').remove();document.querySelector('.snippet-overlay')?.remove();" style="background:transparent;border:none;color:#ccc;cursor:pointer;">✕</button></div>
    <div class="snippet-menu-list">
      <div class="snippet-item" onclick="applyTemplate('blank')"><div class="snippet-item-name">📄 Blank</div><div class="snippet-item-desc">Single empty HTML page</div></div>
      <div class="snippet-item" onclick="applyTemplate('react-cdn')"><div class="snippet-item-name">⚛ React (CDN)</div><div class="snippet-item-desc">React + Babel, no build step</div></div>
      <div class="snippet-item" onclick="applyTemplate('express-api')"><div class="snippet-item-name">🚂 Express API</div><div class="snippet-item-desc">Node server, use Smart Run to start</div></div>
    </div>`;
  document.body.append(overlay, menu);
}

function applyTemplate(key){
  const tpl = PROJECT_TEMPLATES[key];
  if(!tpl) return;
  if(!confirm("Replace current project with this template? Unsaved work will be lost.")) return;
  files = JSON.parse(JSON.stringify(tpl));
  window.files = files;
  currentFile = Object.keys(files)[0];
  openFolders = new Set();
  saveToStorage();
  renderFiles(); renderTabs(); openFile(currentFile);
  document.querySelector(".snippet-overlay")?.remove();
  document.querySelector(".snippet-menu")?.remove();
  showToast(`✓ Loaded template: ${key}`,"success");
}
let pendingAiChanges = [];

function showAiDiffModal(changes){
  pendingAiChanges = changes;
  document.querySelector(".gh-modal-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.className = "gh-modal-overlay";
  overlay.innerHTML = `
    <div class="gh-modal">
      <div class="gh-modal-title">🤖 AI wants to change ${changes.length} file(s)</div>
      <div style="max-height:240px;overflow-y:auto;display:flex;flex-direction:column;gap:6px;">
        ${changes.map(c=>`<div style="font-size:12px;color:#ccc;padding:6px 10px;background:#0d1117;border-radius:6px;">
          ${files[c.file]!==undefined?"📝 Modified":"🆕 New"}: <b>${c.file}</b>
        </div>`).join("")}
      </div>
      <div class="gh-modal-row" style="margin-top:10px;">
        <button class="gh-btn gh-btn-green" onclick="applyPendingAiChanges()">✓ Apply All</button>
        <button class="gh-btn gh-btn-ghost" onclick="cancelPendingAiChanges()">✕ Cancel</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function applyPendingAiChanges(){
  let updatedFiles=0;
  pendingAiChanges.forEach(c=>{
    if(c.file&&c.code!==undefined){
      if(files[c.file]!==undefined && typeof sendToBin==="function") sendToBin(c.file, files[c.file]);
      files[c.file]=c.code;
      const parts=c.file.split("/");
      for(let i=1;i<parts.length;i++) openFolders.add(parts.slice(0,i).join("/"));
      updatedFiles++;
    }
  });
  renderFiles();renderTabs();
  const firstChanged=pendingAiChanges.find(c=>c.file&&files[c.file]!==undefined);
  if(firstChanged) openFile(firstChanged.file);
  saveToStorage();
  showToast(`✅ ${updatedFiles} file(s) updated`,"success");
  document.querySelector(".gh-modal-overlay")?.remove();
  pendingAiChanges = [];
}

function cancelPendingAiChanges(){
  document.querySelector(".gh-modal-overlay")?.remove();
  pendingAiChanges = [];
  showToast("Changes discarded","info");
}

/* ========== STORAGE ========== */
function saveToStorage(){
  try{localStorage.setItem("vscode_files",JSON.stringify(files));localStorage.setItem("vscode_currentFile",currentFile);localStorage.setItem("vscode_openFolders",JSON.stringify([...openFolders]));}catch{}
}
function loadFromStorage(){
  try{
    const s=localStorage.getItem("vscode_files");
    if(s){const p=JSON.parse(s);if(Object.keys(p).length>0){files=p;const c=localStorage.getItem("vscode_currentFile");currentFile=(c&&files[c])?c:Object.keys(files)[0];const of=localStorage.getItem("vscode_openFolders");if(of)openFolders=new Set(JSON.parse(of));return true;}}
  }catch{}return false;
}
setInterval(saveToStorage,3000);
if(!localStorage.getItem("seen_multicursor_tip")){
  setTimeout(()=>{
    showToast("💡 Tip: Alt+Click for multi-cursor, Ctrl+D to select next match","info");
    localStorage.setItem("seen_multicursor_tip","1");
  }, 3000);
}
let lastActivityTime = Date.now();
["mousemove","keydown","click"].forEach(evt=>document.addEventListener(evt,()=>lastActivityTime=Date.now()));
setInterval(()=>{
  if(Date.now()-lastActivityTime > 600000 && currentAiUser && !document.getElementById("session-lock-overlay")){
    const overlay=document.createElement("div");
    overlay.id="session-lock-overlay";
    overlay.style.cssText="position:fixed;inset:0;background:rgba(0,0,0,0.92);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(8px);";
    overlay.innerHTML=`<div style="text-align:center;color:#ccc;">
      <div style="font-size:40px;margin-bottom:10px;">🔒</div>
      <div style="margin-bottom:14px;">Session locked due to inactivity</div>
      <input type="password" id="unlock-pass" placeholder="Enter password" style="padding:8px;border-radius:6px;background:#0d1117;border:1px solid #333;color:#ccc;">
      <button onclick="unlockSession()" style="margin-left:6px;padding:8px 14px;background:#238636;color:#fff;border:none;border-radius:6px;cursor:pointer;">Unlock</button>
    </div>`;
    document.body.appendChild(overlay);
  }
}, 30000);

async function unlockSession(){
  const pass = document.getElementById("unlock-pass")?.value;
  if(!pass || !currentAiUser) return;
  const hash = await hashPassword(pass);
  if(hash === currentAiUser.passwordHash){
    document.getElementById("session-lock-overlay")?.remove();
    lastActivityTime = Date.now();
  } else showToast("Wrong password","error");
}
setInterval(()=>{
  try{
    const versions = JSON.parse(localStorage.getItem("file_versions")||"{}");
    if(currentFile && files[currentFile]!==undefined){
      versions[currentFile]=versions[currentFile]||[];
      const last=versions[currentFile][versions[currentFile].length-1];
      if(!last||last.content!==files[currentFile]){
        versions[currentFile].push({content:files[currentFile],ts:Date.now()});
        if(versions[currentFile].length>10) versions[currentFile].shift();
      }
    }
    localStorage.setItem("file_versions",JSON.stringify(versions));
  }catch{}
}, 60000);

function openFileHistory(){
  if(!currentFile){ showToast("Open a file first","error"); return; }
  const versions = JSON.parse(localStorage.getItem("file_versions")||"{}")[currentFile]||[];
  document.querySelector(".snippet-overlay")?.remove();
  document.querySelector(".snippet-menu")?.remove();
  const overlay=document.createElement("div");
  overlay.className="snippet-overlay";
  overlay.onclick=()=>{overlay.remove();menu.remove();};
  const menu=document.createElement("div");
  menu.className="snippet-menu";
  menu.innerHTML=`<div class="snippet-menu-header"><span>🕐 History: ${currentFile}</span></div>
    <div class="snippet-menu-list">${versions.length?versions.slice().reverse().map(v=>`
      <div class="snippet-item" onclick="restoreFileVersion(${v.ts})">
        <div class="snippet-item-name">${new Date(v.ts).toLocaleString()}</div>
      </div>`).join(""):`<div class="snippet-menu-empty">No history yet — wait a minute after editing</div>`}</div>`;
  document.body.append(overlay,menu);
}

function restoreFileVersion(ts){
  const versions = JSON.parse(localStorage.getItem("file_versions")||"{}")[currentFile]||[];
  const v = versions.find(x=>x.ts===ts);
  if(!v) return;
  if(!confirm("Restore this version? Current content will be replaced.")) return;
  files[currentFile]=v.content; window.files=files;
  if(window.editor1) window.editor1.setValue(v.content);
  saveToStorage();
  document.querySelector(".snippet-overlay")?.remove();
  document.querySelector(".snippet-menu")?.remove();
  showToast("✓ Restored version","success");
}
setInterval(()=>{ if(typeof currentAiUser!=="undefined" && currentAiUser && typeof saveWorkspaceToCloud==="function") saveWorkspaceToCloud(); }, 300000);
/* ========== TOAST ========== */
function showToast(msg,type="info"){
  const t=document.getElementById("toast");t.innerText=msg;t.className="toast show "+type;
  clearTimeout(t._timer);t._timer=setTimeout(()=>{t.className="toast";},2500);
}

/* ========== FILE ICONS ========== */
function getFileIcon(name){
  if (typeof getFileIconBadge === "function") return getFileIconBadge(name);
  return '<span class="fi">📄</span>';
}
function getFolderIcon(name,open){
  const m={src:"📂",public:"🌐",assets:"🖼",images:"🖼",components:"⚛",pages:"📄",styles:"🎨",node_modules:"📦",dist:"🚀",build:"🏗",".git":"🌿",tests:"🧪",docs:"📖"};
  return`<span class="fi">${m[name.toLowerCase()]||(open?"📂":"📁")}</span>`;
}
function getLang(f){
  const e=f.split(".").pop().toLowerCase();
  const m={html:"html",htm:"html",css:"css",scss:"css",js:"javascript",mjs:"javascript",ts:"typescript",tsx:"typescript",jsx:"javascript",json:"json",md:"markdown",py:"python",php:"php",rb:"ruby",java:"java",cpp:"cpp",c:"c",cs:"csharp",go:"go",rs:"rust",sql:"sql",xml:"xml",yaml:"yaml",yml:"yaml",sh:"shell",vue:"html",svelte:"html"};
  return m[e]||"plaintext";
}

/* ========== TREE ========== */
function buildTree(){
  const tree={};
  Object.keys(files).forEach(path=>{
    const parts=path.split("/");let node=tree;
    parts.forEach((part,i)=>{if(i===parts.length-1)node[part]={_file:path};else{if(!node[part])node[part]={};node=node[part];}});
  });
  return tree;
}
function renderFiles(){
  const list=document.getElementById("fileList");list.innerHTML="";
  renderTreeNode(buildTree(),list,"");
  updateWelcomeVisibility();
}

function updateWelcomeVisibility(){
  const hasFiles = Object.keys(files||{}).some(f=>!f.endsWith("/.gitkeep"));
  const welcome = document.getElementById("welcomeScreen");
  if(welcome) welcome.style.display = hasFiles ? "none" : "flex";
}
function renderTreeNode(node,container,prefix){
  const keys=Object.keys(node).sort((a,b)=>{const af=node[a]._file!==undefined,bf=node[b]._file!==undefined;if(af&&!bf)return 1;if(!af&&bf)return -1;return a.localeCompare(b);});
  keys.forEach(key=>{
    const val=node[key],path=prefix?prefix+"/"+key:key;
    if(val._file!==undefined){
      if(val._file.endsWith("/.gitkeep"))return;
      const div=document.createElement("div");
      div.className="file-item"+(val._file===currentFile?" active":"")+(splitActive&&val._file===splitFile?" split-active":"");
      div.style.paddingLeft=(prefix.split("/").filter(Boolean).length*14+8)+"px";
      div.innerHTML=`${getFileIcon(key)}<span class="file-name" title="${val._file}">${key}</span><span class="file-actions"><span class="file-split" title="Split">⬒</span><span class="file-delete" title="Delete">✕</span></span>`;
      div.querySelector(".file-name").onclick=()=>openFile(val._file);
      div.querySelector(".file-name").ondblclick=(e)=>{e.stopPropagation();renameFile(val._file);};
      div.querySelector(".file-split").onclick=(e)=>{e.stopPropagation();openInSplitFromSidebar(val._file);};
      div.querySelector(".file-delete").onclick=(e)=>{e.stopPropagation();deleteFile(val._file);};
      container.appendChild(div);
    } else {
      const isOpen=openFolders.has(path);
      const fd=document.createElement("div");fd.className="folder-item";
      fd.style.paddingLeft=(prefix.split("/").filter(Boolean).length*14+6)+"px";
      fd.innerHTML=`<span class="folder-arrow">${isOpen?"▾":"▸"}</span>${getFolderIcon(key,isOpen)}<span class="folder-name">${key}</span><span class="folder-actions"><span class="folder-new-file" title="New file">+F</span><span class="folder-new-folder" title="New folder">+D</span><span class="folder-delete" title="Delete">✕</span></span>`;
      const sub=document.createElement("div");sub.className="folder-children";sub.style.display=isOpen?"block":"none";
      fd.querySelector(".folder-name").onclick=fd.querySelector(".folder-arrow").onclick=()=>toggleFolder(path,fd,val,sub);
      fd.querySelector(".folder-new-file").onclick=(e)=>{e.stopPropagation();newFileInFolder(path);};
      fd.querySelector(".folder-new-folder").onclick=(e)=>{e.stopPropagation();newFolderInFolder(path);};
      fd.querySelector(".folder-delete").onclick=(e)=>{e.stopPropagation();deleteFolder(path);};
      container.appendChild(fd);container.appendChild(sub);
      if(isOpen)renderTreeNode(val,sub,path);
    }
  });
}
function toggleFolder(path,fd,node,sub){
  const isOpen=openFolders.has(path);
  if(isOpen){openFolders.delete(path);sub.style.display="none";fd.querySelector(".folder-arrow").innerText="▸";}
  else{openFolders.add(path);sub.style.display="block";sub.innerHTML="";renderTreeNode(node,sub,path);fd.querySelector(".folder-arrow").innerText="▾";}
  saveToStorage();
}

/* ========== FILE OPS ========== */

function isMediaFile(file){
  return /\.(png|jpg|jpeg|gif|webp|svg|bmp|ico|mp4|webm|ogg|mp3|wav)$/i.test(file);
}

function openFile(file){
  if(files[file]===undefined)return;
  currentFile=file;

  // If it's an image/video/audio — show preview instead of raw code
  if(isMediaFile(file)){
    var content=files[file];
    var editorArea=document.getElementById("editorArea")||document.querySelector(".editor-area");
    var existing=document.getElementById("mediaPreviewPane");
    if(existing)existing.remove();
    var ext=file.split(".").pop().toLowerCase();
    var isImg=/png|jpg|jpeg|gif|webp|svg|bmp|ico/.test(ext);
    var isVid=/mp4|webm|ogg/.test(ext);
    var isAud=/mp3|wav|ogg/.test(ext);
    var pane=document.createElement("div");
    pane.id="mediaPreviewPane";
    pane.style.cssText="position:absolute;inset:0;z-index:50;background:#0d1117;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;";
    var html="<div style='font-size:12px;color:#58a6ff;font-family:monospace;margin-bottom:4px;'>"+file+"</div>";
    if(isImg) html+="<img src='"+content+"' style='max-width:90%;max-height:70vh;border-radius:8px;border:1px solid #1a2332;object-fit:contain;'>";
    else if(isVid) html+="<video src='"+content+"' controls style='max-width:90%;max-height:70vh;border-radius:8px;'></video>";
    else if(isAud) html+="<audio src='"+content+"' controls style='width:80%;'></audio>";
    html+="<button onclick=\"document.getElementById('mediaPreviewPane').remove();\" style='margin-top:8px;padding:6px 18px;background:#1a2332;border:1px solid #2a3545;color:#8b949e;border-radius:6px;cursor:pointer;font-size:12px;'>✕ Close Preview</button>";
    pane.innerHTML=html;
    var edWrap=document.getElementById("editor1Wrap")||editorArea;
    if(edWrap){edWrap.style.position="relative";edWrap.appendChild(pane);}
    renderFiles();renderTabs();addRecent(file);saveToStorage();
    return;
  }

  // Remove media preview if switching back to code file
  var mp=document.getElementById("mediaPreviewPane");if(mp)mp.remove();

  isSyncing=true;
  editor1.setValue(files[file]);monaco.editor.setModelLanguage(editor1.getModel(),getLang(file));
  if(!splitActive){editor2.setValue(files[file]);monaco.editor.setModelLanguage(editor2.getModel(),getLang(file));}
  isSyncing=false;
  if(file.endsWith(".html"))updatePreview(file);
  renderFiles();renderTabs();addRecent(file);updateSplitHeader();saveToStorage();
  if(window.innerWidth<=768){document.getElementById("sidebar").classList.remove("open");document.getElementById("sidebarOverlay").classList.remove("active");}
}
function newFolderInFolder(parentPath){
  const name=prompt("Folder name:");if(!name?.trim())return;
  const full=parentPath+"/"+name.trim();
  files[full+"/.gitkeep"]="";openFolders.add(parentPath);openFolders.add(full);renderFiles();showToast("Created "+name.trim(),"success");
}
function deleteFolder(folderPath){
  const del=Object.keys(files).filter(f=>f.startsWith(folderPath+"/"));
  if(!del.length){showToast("Folder empty","info");return;}
  if(!confirm(`Delete "${folderPath}" and ${del.length} file(s)?`))return;
  del.forEach(f=>delete files[f]);openFolders.delete(folderPath);
  if(del.includes(currentFile))openFile(Object.keys(files).find(f=>!f.endsWith("/.gitkeep"))||"");
 renderFiles();renderTabs();saveToStorage();showToast("Deleted","info");
}
function renameFile(file){
  const n=prompt("Rename to:",file.split("/").pop());if(!n?.trim())return;
  const parts=file.split("/");parts[parts.length-1]=n.trim();
  const newPath=parts.join("/");
  if(files[newPath]!==undefined){showToast("Already exists!","error");return;}
  files[newPath]=files[file];delete files[file];
  if(currentFile===file)currentFile=newPath;if(splitFile===file)splitFile=newPath;
  const mp=document.getElementById("mediaPreviewPane");if(mp)mp.remove();
  renderFiles();renderTabs();openFile(currentFile);showToast("Renamed to "+n.trim(),"success");saveToStorage();
}
function deleteFile(file){

  if(Object.keys(files).filter(f=>!f.endsWith("/.gitkeep")).length<=1){showToast("Can't delete last file.","error");return;}
  if(!confirm(`Delete "${file}"?`))return;
  delete files[file];
  if(currentFile===file)openFile(Object.keys(files).find(f=>!f.endsWith("/.gitkeep"))||"");
  if(splitFile===file){splitActive=false;updateSplitHeader();}
  renderFiles();renderTabs();saveToStorage();
}

/* ========== SPLIT ========== */
function openFileInSplit(file){
  if(files[file]===undefined)return;splitFile=file;splitActive=true;
  isSyncing=true;editor2.setValue(files[file]);monaco.editor.setModelLanguage(editor2.getModel(),getLang(file));isSyncing=false;
  updateSplitHeader();renderFiles();showToast("Split: "+file,"info");
}
function closeSplit(){
  document.getElementById("editor2Wrap").classList.add("hidden");document.getElementById("splitResizer").classList.add("hidden");
  splitActive=false;updateSplitHeader();renderFiles();showToast("Split closed","info");
}
function updateSplitHeader(){
  const h=document.getElementById("splitHeader");if(!h)return;
  if(splitActive){h.innerHTML=`<span>${splitFile}</span><span class="split-close-btn" onclick="closeSplit()">✕</span>`;h.style.display="flex";}
  else h.style.display="none";
}
function openInSplitFromSidebar(file){document.getElementById("editor2Wrap").classList.remove("hidden");document.getElementById("splitResizer").classList.remove("hidden");openFileInSplit(file);}

/* ========== TABS ========== */
function renderTabs(){
  const tabs=document.getElementById("tabs");tabs.innerHTML="";
  Object.keys(files).filter(f=>!f.endsWith("/.gitkeep")).forEach(file=>{
    const tab=document.createElement("div");tab.className="tab"+(file===currentFile?" active":"");
    const name=file.split("/").pop();
    tab.innerHTML=`<span class="tab-label">${getFileIcon(name)} ${name}</span><span class="tab-close">✕</span>`;
    tab.querySelector(".tab-label").onclick=()=>openFile(file);
    tab.querySelector(".tab-close").onclick=(e)=>{e.stopPropagation();deleteFile(file);};
    tabs.appendChild(tab);
  });
}

/* ========== RECENT ========== */
let recentFiles=[];
function addRecent(file){recentFiles=recentFiles.filter(f=>f!==file);recentFiles.unshift(file);if(recentFiles.length>8)recentFiles.pop();renderRecent();}
function renderRecent(){
  const box=document.getElementById("recentProjects");if(!box)return;
  box.innerHTML=`<div class="recent-title">📂 Recent</div>`;
  recentFiles.forEach(file=>{const name=file.split("/").pop();const div=document.createElement("div");div.className="recent-item";div.innerHTML=`${getFileIcon(name)} ${name}`;div.title=file;div.onclick=()=>openFile(file);box.appendChild(div);});
}

/* ========== MONACO ========== */
require.config({paths:{vs:"https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs"}});
require(["vs/editor/editor.main"],()=>{
 const isMobile=/Mobi|Android/i.test(navigator.userAgent);
const shared={
  theme:"vs-dark",
  automaticLayout:true,
  fontSize:14,
  minimap:{enabled:false},
  wordWrap:"on",
  scrollBeyondLastLine:false,
  tabSize:2,
  lineNumbers:"on",
  renderLineHighlight:"all",
  cursorBlinking:"smooth",
  smoothScrolling:true,
  suggestOnTriggerCharacters:true,
  quickSuggestions:true,

  // ── TYPING FEEL FIX ──
  fontFamily:"'Cascadia Code','Fira Code','Consolas','Courier New',monospace",
  fontLigatures:false,          // disable ligatures — causes render delay
  renderControlCharacters:false,
  disableLayerHinting:false,
  renderFinalNewline:"on",
  fixedOverflowWidgets:true,
  roundedSelection:false,

  // make typing feel instant like notepad/vsc
  cursorSmoothCaretAnimation:"off",  // off = instant caret movement
  cursorStyle:"line",
  cursorWidth:2,
  mouseWheelZoom:false,
  fastScrollSensitivity:5,
  padding:{top:8,bottom:8},

  // ── ERROR HIGHLIGHTING ──
  // keep validation ON for all languages
  "semanticHighlighting.enabled":true,
  bracketPairColorization:{enabled:true},    // colorize matching brackets
  guides:{bracketPairs:true,indentation:true}, // indent + bracket guides

  // word-by-word rendering fix
  stopRenderingLineAfter:-1,   // -1 = never stop rendering (fixes cut-off text)
  renderValidationDecorations:"on",
};
  loadFromStorage();

  // no auto-seed anymore — empty projects show the Welcome screen instead
  if (!files) files = {};

  updateWelcomeVisibility();
  // make sure currentFile actually exists
  if (!files[currentFile]) {
    currentFile = Object.keys(files).find(f => !f.endsWith("/.gitkeep")) || "index.html";
  }

  editor1 = monaco.editor.create(document.getElementById("editor1"), {...shared, language: getLang(currentFile), value: files[currentFile] || ""});
  editor2 = monaco.editor.create(document.getElementById("editor2"), {...shared, language: getLang(currentFile), value: files[currentFile] || ""});
  // ── Enable language validation/diagnostics (error squiggles) ──
  monaco.languages.css.cssDefaults.setOptions({
    validate: true,
    lint: {
      compatibleVendorPrefixes: "warning",
      duplicateProperties: "warning",
      emptyRules: "warning",
      importStatement: "warning",
      boxModel: "ignore",
      universalSelector: "ignore",
      zeroUnits: "warning",
      fontFaceProperties: "warning",
      hexColorLength: "error",
      argumentsInColorFunction: "error",
      unknownProperties: "warning",
      ieHack: "ignore",
      unknownVendorSpecificProperties: "ignore",
      propertyIgnoredDueToDisplay: "warning",
      important: "ignore",
      float: "ignore",
      idSelector: "ignore"
    }
  });

  monaco.languages.css.scssDefaults.setOptions({ validate: true });
  monaco.languages.css.lessDefaults.setOptions({ validate: true });

  monaco.languages.html.htmlDefaults.setOptions({
    validate: true,
    format: {
      enable: true,
      wrapLineLength: 120,
      unformatted: "pre,code,textarea",
      indentInnerHtml: false,
      preserveNewLines: true,
      maxPreserveNewLines: null,
      indentHandlebars: false,
      endWithNewline: false,
      extraLiners: "head,body,/html"
    },
    suggest: {
      html5: true,
      angular1: false,
      ionic: false
    }
  });

  monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false,
    noSuggestionDiagnostics: false
  });

  monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
    target: monaco.languages.typescript.ScriptTarget.ESNext,
    allowNonTsExtensions: true,
    moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
    module: monaco.languages.typescript.ModuleKind.CommonJS,
    noEmit: true,
    allowJs: true,
    checkJs: true,
    strict: false
  });

  monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
    noSemanticValidation: false,
    noSyntaxValidation: false
  });
  /* ── FILE PATH INTELLISENSE — like VS Code's Path Intellisense ── */
  function registerFilePathIntelliSense(lang, patterns){
    monaco.languages.registerCompletionItemProvider(lang, {
      triggerCharacters: ['"',"'","/"],
      provideCompletionItems: (model, position) => {
        const textUntil = model.getValueInRange({
          startLineNumber: position.lineNumber, startColumn: 1,
          endLineNumber: position.lineNumber, endColumn: position.column
        });
        let match = null, quoteChar = null, typedSoFar = "";
        for(const re of patterns){
          const m = textUntil.match(re);
          if(m){ match = m; quoteChar = m[1]; typedSoFar = m[2]; break; }
        }
        if(!match) return { suggestions: [] };

        const candidates = Object.keys(files).filter(f =>
          !f.endsWith("/.gitkeep") && f !== currentFile &&
          f.toLowerCase().includes(typedSoFar.toLowerCase())
        );

        const wordStart = position.column - typedSoFar.length;
        const suggestions = candidates.map(f => ({
          label: f,
          kind: monaco.languages.CompletionItemKind.File,
          insertText: f,
          detail: "project file",
          range: {
            startLineNumber: position.lineNumber, startColumn: wordStart,
            endLineNumber: position.lineNumber, endColumn: position.column
          }
        }));
        return { suggestions };
      }
    });
  }

  registerFilePathIntelliSense("html", [
    /(?:href|src)\s*=\s*("|')([^"']*)$/i
  ]);
  registerFilePathIntelliSense("css", [
    /url\(\s*("|')?([^"')]*)$/i
  ]);
  registerFilePathIntelliSense("javascript", [
    /(?:import\s+.*from\s+|require\s*\(\s*)("|')([^"']*)$/i
  ]);
  let previewDebounceTimer=null;
  function debouncedUpdatePreview(page){
    clearTimeout(previewDebounceTimer);
    previewDebounceTimer=setTimeout(()=>updatePreview(page),400);
  }
  editor1.onDidChangeModelContent(()=>{
    if(isSyncing)return;files[currentFile]=editor1.getValue();
    if(!splitActive){isSyncing=true;editor2.setValue(editor1.getValue());isSyncing=false;}
    if(currentFile.endsWith(".html"))debouncedUpdatePreview(currentFile);
  });
  editor2.onDidChangeModelContent(()=>{
    if(isSyncing)return;
    if(splitActive){files[splitFile]=editor2.getValue();if(splitFile.endsWith(".html"))debouncedUpdatePreview(splitFile);}
    else{files[currentFile]=editor2.getValue();isSyncing=true;editor1.setValue(editor2.getValue());isSyncing=false;if(currentFile.endsWith(".html"))debouncedUpdatePreview(currentFile);}
  });
  renderFiles();renderTabs();updatePreview(currentFile);updateSplitHeader();
  setTimeout(()=>Object.keys(files).filter(f=>!f.endsWith("/.gitkeep")).forEach(f=>addRecent(f)),300);
  editor1.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyS,saveCurrentFile);
  editor2.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyS,saveCurrentFile);
  editor1.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyMod.Shift|monaco.KeyCode.KeyF,()=>editor1.trigger("","editor.action.formatDocument",{}));
  editor2.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyMod.Shift|monaco.KeyCode.KeyF,()=>editor2.trigger("","editor.action.formatDocument",{}));
  // load cloud conversation on start
  loadCloudConversation();
});

/* ========== PREVIEW with scrollbar ========== */
/* ── Resolve local media src/url() paths to base64 data URIs from files{} ── */
function resolveMediaPaths(text){
  if(!text) return text;

  function findFile(rawPath){
    if(!rawPath) return null;
    if(rawPath.startsWith("data:")||rawPath.startsWith("http://")||rawPath.startsWith("https://")||rawPath.startsWith("//")) return null;
    let p=rawPath.split("?")[0].split("#")[0];
    p=p.replace(/^\.\//,"").replace(/^\//,"");
    if(files[p]!==undefined) return files[p];
    // try matching by filename only (in case of folder mismatch)
    const fname=p.split("/").pop();
    const match=Object.keys(files).find(f=>f.split("/").pop()===fname && isMediaFile(f));
    return match?files[match]:null;
  }
  // remove broken external script/link src references that don't exist in files[]
  text=text.replace(/<script\b[^>]*\bsrc\s*=\s*(["'])([^"']+)\1[^>]*><\/script>/gi,(m,q,path)=>{
    if(path.startsWith("http")||path.startsWith("//")) return m; // keep external CDN scripts
    const p=path.replace(/^\.\//,"").replace(/^\//,"");
    return (files[p]!==undefined) ? m : `<!-- removed missing: ${path} -->`;
  });

  // <img src="...">, <source src="...">, <video src="...">, <audio src="...">
  text=text.replace(/(<(?:img|source|video|audio|embed)\b[^>]*\bsrc\s*=\s*)(["'])([^"']+)\2/gi,(m,pre,q,path)=>{
    const data=findFile(path);
    return data?`${pre}${q}${data}${q}`:m;
  });

  // poster="..." (video thumbnails)
  text=text.replace(/(<video\b[^>]*\bposter\s*=\s*)(["'])([^"']+)\2/gi,(m,pre,q,path)=>{
    const data=findFile(path);
    return data?`${pre}${q}${data}${q}`:m;
  });

  // CSS url(...) — both inline style="" and <style> blocks
  text=text.replace(/url\((['"]?)([^'")]+)\1\)/gi,(m,q,path)=>{
    const data=findFile(path);
    return data?`url(${q}${data}${q})`:m;
  });

  return text;
}
function updatePreview(page=currentFile){
  const iframe=document.getElementById("previewFrame");
  let html=files[page]||"";if(!page.endsWith(".html"))return;

  // Replace local media references (img/video/audio/source/link href + css url()) with base64 data URIs
  html=resolveMediaPaths(html);

  // Remove external <link> tags pointing to local css files (we inject them ourselves)
  html=html.replace(/<link[^>]+rel=["']stylesheet["'][^>]*href=["'](?!http)([^"']+)["'][^>]*\/?>/gi,"");
  html=html.replace(/<link[^>]+href=["'](?!http)([^"']+)["'][^>]+rel=["']stylesheet["'][^>]*\/?>/gi,"");
  // Remove external <script src=""> tags pointing to local js files (we inject them ourselves)
  html=html.replace(/<script[^>]+src=["'](?!http)([^"']+)["'][^>]*><\/script>/gi,"");

  let css="";Object.keys(files).forEach(f=>{if(f.endsWith(".css"))css+=`<style>${resolveMediaPaths(files[f])}</style>`;});
  // Only inject JS files that are linked in the HTML, not ALL js files
  const linkedScripts=[];
  const scriptTagRe=/<script[^>]+src=["'](?!http)([^"'?#]+\.js)[^"']*["']/gi;
  let sm;
  while((sm=scriptTagRe.exec(files[page]))!==null){
    const name=sm[1].replace(/^\.?\//,"");
    // find matching file (exact or by filename)
    const match=Object.keys(files).find(f=>f===name||f.endsWith("/"+name));
    if(match&&files[match])linkedScripts.push(match);
  }
  // if no script tags found, fall back to injecting only root-level js files (not editor files)
  const jsFiles = linkedScripts.length>0 ? linkedScripts :
    Object.keys(files).filter(f=>
      f.endsWith(".js") &&
      !f.includes("/") && // only root level
      !["sw.js","app.js","admin.js","ai.js","terminal.js","github-panel.js",
        "keyboard.js","media.js","bin.js","dragdrop.js","extensions.js",
        "sidebar-shell.js","source-control.js","models.js","ad_control.js",
        "ad_stats.js","announcements.js","extensions-pack1.js","extensions-pack2.js",
        "extensions-pack3.js","extensions-pack4.js","extensions-pack5.js",
        "extensions-cloud.js","main.js","check_parens.js","find_unclosed.js",
        "track_balance.js","firebase-config.js"].includes(f)
    );
  let js="";jsFiles.forEach(f=>{if(files[f]!==undefined)js+=`<script>${files[f]}<\/script>`;});
  // inject scrollbar styling
  const scrollCSS=`<style>::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-track{background:#f1f1f1}::-webkit-scrollbar-thumb{background:#888;border-radius:4px}::-webkit-scrollbar-thumb:hover{background:#555}body{overflow:auto!important}</style>`;
  html=html.includes("</head>")?html.replace("</head>",css+scrollCSS+"</head>"):css+scrollCSS+html;
  html=html.includes("</body>")?html.replace("</body>",js+"</body>"):html+js;
  html+=`<script>
    (function(){
      var _c={log:console.log.bind(console),error:console.error.bind(console),warn:console.warn.bind(console)};
      ['log','error','warn'].forEach(function(t){console[t]=function(){_c[t].apply(console,arguments);var msg=Array.prototype.slice.call(arguments).map(function(x){return typeof x==='object'?JSON.stringify(x):String(x);}).join(' ');try{parent.postMessage({type:'console',level:t,msg:msg},'*');}catch(e){}};});
      window.onerror=function(m,s,l,c,e){try{parent.postMessage({type:'console',level:'error',msg:m+' (line '+l+')'},'*');}catch(ex){}return false;};
      window.addEventListener('unhandledrejection',function(e){try{parent.postMessage({type:'console',level:'error',msg:'Promise: '+(e.reason?.message||e.reason)},'*');}catch(ex){}});
    })();
    document.addEventListener("click",function(e){var link=e.target.closest("a");if(!link)return;var href=link.getAttribute("href");if(href&&(href.endsWith(".html")||href.startsWith("#"))){if(href.startsWith("#"))return;e.preventDefault();try{parent.postMessage({type:"navigate",page:href},"*");}catch(ex){}}});
  <\/script>`;
  iframe.srcdoc=html;
}
/* =========================
   FULL PREVIEW
========================= */
let fpRotated = false;
let fpCurrentDevice = "desktop";

const FP_DEVICES = {
  desktop:    { w: null,  h: null,   label: "Desktop",          chrome: false },
  laptop:     { w: 1280,  h: 800,    label: "Laptop 1280×800",  chrome: true  },
  tablet:     { w: 768,   h: 1024,   label: "iPad 768×1024",    chrome: true  },
  mobile:     { w: 390,   h: 844,    label: "iPhone 390×844",   chrome: true  },
  smallphone: { w: 360,   h: 740,    label: "Android 360×740",  chrome: true  },
};

function openFullPreview() {
  const modal = document.getElementById("fullPreviewModal");
  const fullFrame = document.getElementById("fullPreviewFrame");
  const srcFrame  = document.getElementById("previewFrame");
  if (!modal || !fullFrame) return;

  // copy srcdoc from main preview so actual site content shows
  if (srcFrame?.srcdoc) {
    fullFrame.srcdoc = srcFrame.srcdoc;
  } else if (typeof currentFile !== "undefined" && typeof files !== "undefined") {
    updatePreview(currentFile);
    setTimeout(() => {
      const src = document.getElementById("previewFrame");
      if (src?.srcdoc) fullFrame.srcdoc = src.srcdoc;
    }, 300);
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
    btn.style.borderColor = d === device ? "#58a6ff" : "#1a2332";
    btn.style.background  = d === device ? "rgba(88,166,255,0.15)" : "transparent";
    btn.style.color       = d === device ? "#58a6ff" : "#8b949e";
  });

  if (label) label.innerText = cfg.label;

  if (device === "desktop") {
    stage.style.padding        = "0";
    stage.style.alignItems     = "stretch";
    stage.style.justifyContent = "stretch";
    frmDiv.style.width         = "100%";
    frmDiv.style.height        = "100%";
    frmDiv.style.boxShadow     = "none";
    frmDiv.style.borderRadius  = "0";
    frmDiv.style.overflow      = "hidden";
    frame.style.width          = "100%";
    frame.style.height         = "100%";
    frame.style.transform      = "none";
    if (chrTop) chrTop.style.display = "none";
    if (chrBot) chrBot.style.display = "none";
  } else {
    let w = fpRotated ? cfg.h : cfg.w;
    let h = fpRotated ? cfg.w : cfg.h;

    // scale down to fit screen
    const stageW = stage.clientWidth  - 40;
    const stageH = stage.clientHeight - 40;
    const scale  = Math.min(1, stageW / w, stageH / h);
    const scaledW = Math.floor(w * scale);
    const scaledH = Math.floor(h * scale);

    stage.style.padding        = "16px";
    stage.style.alignItems     = "center";
    stage.style.justifyContent = "center";
    frmDiv.style.width         = scaledW + "px";
    frmDiv.style.height        = scaledH + (cfg.chrome ? 60 : 0) + "px";
    frmDiv.style.boxShadow     = "0 20px 60px rgba(0,0,0,0.7),0 0 0 2px #1a2332";
    frmDiv.style.borderRadius  = cfg.chrome ? "20px" : "8px";
    frmDiv.style.overflow      = "hidden";
    frame.style.width          = w + "px";
    frame.style.height         = h + "px";
    frame.style.transformOrigin= "top left";
    frame.style.transform      = `scale(${scale})`;
    if (chrTop) chrTop.style.display = cfg.chrome ? "flex" : "none";
    if (chrBot) chrBot.style.display = cfg.chrome ? "flex" : "none";
  }
}

function rotatePreview() {
  fpRotated = !fpRotated;
  setPreviewDevice(fpCurrentDevice);
}

// close on Escape key
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    const modal = document.getElementById("fullPreviewModal");
    if (modal && modal.style.display !== "none") closeFullPreview();
  }
});
window.addEventListener("message",(e)=>{
  if(e.data.type==="navigate"&&files[e.data.page])openFile(e.data.page);
  if(e.data.type==="console")logConsole(e.data.level,e.data.msg);
});

/* ========== CONSOLE ========== */
const consoleHistory=[];
function logConsole(level,msg){
  consoleHistory.push({level,msg,time:new Date().toLocaleTimeString()});
  renderConsoleLines();
  const b=document.getElementById("consoleBadge");
  if(b){b.innerText=(parseInt(b.innerText)||0)+1;b.style.display="inline";}
  if(level==="error" && window.innerWidth > 768) document.getElementById("consolePanel").classList.remove("hidden");
}
function renderConsoleLines(){
  const panel=document.getElementById("consoleOutput");if(!panel)return;
  panel.innerHTML="";
  consoleHistory.forEach(({level,msg,time})=>{
    const line=document.createElement("div");line.className="console-line console-"+level;
    line.innerHTML=`<span class="console-time">${time}</span><span class="console-icon">${level==="error"?"✖":level==="warn"?"⚠":"›"}</span><span class="console-msg">${String(msg).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>`;
    panel.appendChild(line);
  });
  panel.scrollTop=panel.scrollHeight;
}
function escapeHtml(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}
document.getElementById("clearConsoleBtn").onclick=()=>{consoleHistory.length=0;renderConsoleLines();const b=document.getElementById("consoleBadge");if(b){b.innerText="0";b.style.display="none";}};
document.getElementById("consoleToggleBtn").onclick=()=>{const p=document.getElementById("consolePanel");p.classList.toggle("hidden");if(!p.classList.contains("hidden"))renderConsoleLines();};

/* ========== FIREBASE CLOUD MEMORY ========== */
async function saveCloudConversation(){
  if(!aiChatHistory.length)return;
  try{
    await saveConversationToCloud(currentSessionId,aiChatHistory);
    showToast("💾 Conversation saved to cloud","success");
  }catch(e){showToast("Cloud save failed: "+e.message,"error");}
}

async function loadCloudConversation(){
  try{
    const data=await loadLastConversationFromCloud();
    if(!data||!data.messages?.length)return;
    const resume=confirm(`☁ Found your last AI conversation (${data.messages.length} messages from ${new Date(data.timestamp).toLocaleDateString()}). Resume it?`);
    if(!resume)return;
    aiChatHistory=data.messages;
    currentSessionId=data.sessionId||currentSessionId;
    // re-render chat
    const chat=document.getElementById("aiChat");chat.innerHTML="";
    aiChatHistory.forEach(m=>addMessage(m.content,m.role==="user"?"user":"ai"));
    showToast("☁ Conversation resumed!","success");
  }catch{}
}

/* ========== AI MODELS + CUSTOM MODELS ========== */
window.models={
  gemini:["gemini-2.5-flash","gemini-2.0-flash","gemini-1.5-flash"],
  groq:["llama-3.3-70b-versatile","llama-3.1-8b-instant","mixtral-8x7b-32768","gemma2-9b-it"],
  deepseek:["deepseek-chat","deepseek-coder"],
  openrouter:["meta-llama/llama-3.3-70b-instruct","mistralai/mistral-7b-instruct","google/gemma-3-12b-it:free","deepseek/deepseek-r1:free","openai/gpt-4o-mini"],
  huggingface:["HuggingFaceH4/zephyr-7b-beta","Qwen/Qwen2.5-Coder-32B-Instruct","mistralai/Mistral-7B-Instruct-v0.3"]
};
const providerSelect=document.getElementById("providerSelect");
const modelSelect=document.getElementById("modelSelect");

function updateModels(){
  const p=providerSelect.value;
  const cm=typeof getCustomModels==="function"?getCustomModels():{};
  const base=window.models[p]||[];
  const custom=cm[p]||[];
  modelSelect.innerHTML="";
  [...base,...custom].forEach(m=>{const o=document.createElement("option");o.value=m;o.innerText=m;modelSelect.appendChild(o);});
  // add + model button hint
  const customProv=typeof getCustomProviders==="function"?getCustomProviders().find(c=>c.id===p):null;
  if(customProv?.defaultModel&&!base.includes(customProv.defaultModel)&&!custom.includes(customProv.defaultModel)){
    const o=document.createElement("option");o.value=customProv.defaultModel;o.innerText=customProv.defaultModel;modelSelect.appendChild(o);
  }
}
providerSelect.onchange=updateModels;updateModels();

function addMessage(text,sender){
  const chat=document.getElementById("aiChat");
  const msg=document.createElement("div");msg.className=sender==="user"?"message user-message":"message ai-message";
  msg.innerText=text;chat.appendChild(msg);chat.scrollTop=chat.scrollHeight;return msg;
}

/* ========== AI SEND ========== */
document.getElementById("aiSend").onclick=async()=>{
  const input=document.getElementById("aiInput");
  const prompt=input.value.trim();if(!prompt)return;
  const provider=providerSelect.value,model=modelSelect.value;
  const sendBtn=document.getElementById("aiSend");
  addMessage(prompt,"user");aiChatHistory.push({role:"user",content:prompt});
  input.value="";sendBtn.disabled=true;sendBtn.innerText="⏳";
  const thinking=addMessage(`🤖 ${provider}/${model}...`,"ai");
  try{
    let data=await callAI({provider,model,prompt,currentFile,currentCode:editor1.getValue(),files,history:aiChatHistory.slice(-12)});

    // SAFETY NET: if reply looks like raw JSON, re-parse it
    if(data.reply&&typeof data.reply==="string"){
      const r=data.reply.trim();
      if((r.startsWith("{")&&r.includes('"changes"'))||(r.startsWith("{")&&r.includes('"reply"'))){
        try{
          const reparsed=typeof extractJSON==="function"?extractJSON(r):JSON.parse(r);
          if(reparsed&&(reparsed.changes?.length>0||reparsed.reply)){
            data=reparsed;
          }
        }catch{}
      }
    }

    thinking.remove();

    if(data.changes&&data.changes.length>0){
      showAiDiffModal(data.changes);
    }

    const reply=data.reply||"Done ✓";
    // Don't show raw JSON as reply
    const displayReply=reply.trim().startsWith("{")&&reply.includes('"changes"')
      ? "✅ Done! Files have been updated."
      : reply;
    addMessage(displayReply,"ai");
    aiChatHistory.push({role:"assistant",content:displayReply});
    if(aiChatHistory.length%5===0) saveCloudConversation();

  }catch(err){thinking.remove();addMessage("❌ "+err.message,"ai");showToast(err.message,"error");}
  finally{sendBtn.disabled=false;sendBtn.innerText="Send";}
};

document.getElementById("aiInput").addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter")document.getElementById("aiSend").click();});
document.getElementById("clearChatBtn").onclick=()=>{document.getElementById("aiChat").innerHTML="";aiChatHistory=[];showToast("Chat cleared","info");};
document.getElementById("saveConversationBtn").onclick=saveCloudConversation;
document.getElementById("saveWorkspaceBtn").onclick=saveWorkspaceToCloud;
document.querySelectorAll(".prompt-btn").forEach(btn=>{btn.onclick=()=>{document.getElementById("aiInput").value=btn.dataset.prompt;document.getElementById("aiInput").focus();};});

/* ========== IMAGE SEARCH ========== */
async function searchImages(query){
  const key=typeof getUnsplashKey==="function"?getUnsplashKey():"";
  try{if(key){const res=await fetch(`https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=9&client_id=${key}`);const data=await res.json();return(data.results||[]).map(img=>({thumb:img.urls.small,full:img.urls.regular,alt:img.alt_description||query,credit:img.user.name}));}}catch{}
  return Array.from({length:9},(_,i)=>({thumb:`https://picsum.photos/seed/${encodeURIComponent(query)}${i}/200/150`,full:`https://picsum.photos/seed/${encodeURIComponent(query)}${i}/800/600`,alt:query+" "+(i+1),credit:"Picsum"}));
}
document.getElementById("imageSearchBtn").onclick=()=>document.getElementById("imagePanel").classList.toggle("hidden");
document.getElementById("closeImgPanel").onclick=()=>document.getElementById("imagePanel").classList.add("hidden");
document.getElementById("imgSearchGo").onclick=async()=>{
  const q=document.getElementById("imgSearchInput").value.trim();if(!q)return;
  const grid=document.getElementById("imgGrid");grid.innerHTML=`<div class="img-loading">🔍 Searching...</div>`;
  const results=await searchImages(q);grid.innerHTML="";
  results.forEach(img=>{const div=document.createElement("div");div.className="img-item";div.innerHTML=`<img src="${img.thumb}" alt="${img.alt}" loading="lazy">`;div.querySelector("img").onclick=()=>insertImage(img.full,img.alt);grid.appendChild(div);});
};
document.getElementById("imgSearchInput").addEventListener("keydown",e=>{if(e.key==="Enter")document.getElementById("imgSearchGo").click();});
function insertImage(url,alt){
  const tag=`<img src="${url}" alt="${alt}" style="max-width:100%;height:auto;">`;
  if(editor1){const pos=editor1.getPosition();editor1.executeEdits("",[{range:new monaco.Range(pos.lineNumber,pos.column,pos.lineNumber,pos.column),text:tag}]);}
  showToast("Image inserted ✓","success");document.getElementById("imagePanel").classList.add("hidden");
}

/* ========== THEME / FONT / FORMAT ========== */
const themes=["vs-dark","vs","hc-black"];let currentTheme=0;
document.getElementById("themeBtn").onclick=()=>{
  currentTheme=(currentTheme+1)%themes.length;
  monaco.editor.setTheme(themes[currentTheme]);
  const names={vs:"☀ Light","vs-dark":"🌙 Dark","hc-black":"🔳 High Contrast"};
  showToast(names[themes[currentTheme]]+" theme","info");
  // show on mobile too
  document.body.dataset.theme=themes[currentTheme];
};
let fontSize=14;
document.getElementById("fontPlusBtn").onclick=()=>{fontSize=Math.min(28,fontSize+1);editor1.updateOptions({fontSize});editor2.updateOptions({fontSize});showToast("Font: "+fontSize+"px","info");};
document.getElementById("fontMinusBtn").onclick=()=>{fontSize=Math.max(10,fontSize-1);editor1.updateOptions({fontSize});editor2.updateOptions({fontSize});showToast("Font: "+fontSize+"px","info");};
document.getElementById("formatBtn").onclick=()=>{editor1.trigger("","editor.action.formatDocument",{});showToast("Formatted ✓","success");};

// Mobile font/theme buttons
document.getElementById("mobileFontPlus")?.addEventListener("click",()=>document.getElementById("fontPlusBtn").click());
document.getElementById("mobileFontMinus")?.addEventListener("click",()=>document.getElementById("fontMinusBtn").click());
document.getElementById("mobileTheme")?.addEventListener("click",()=>document.getElementById("themeBtn").click());

/* ========== COLLAPSE ========== */
document.getElementById("collapseSidebarBtn").onclick=()=>document.getElementById("sidebar").classList.toggle("collapsed");
document.getElementById("collapsePreviewBtn").onclick=()=>document.getElementById("preview").classList.toggle("collapsed");
document.getElementById("collapseAiBtn").onclick=()=>{document.getElementById("aiPanel").classList.add("collapsed");document.getElementById("aiResizer").classList.add("hidden");};

/* ========== TOPBAR ========== */
document.getElementById("runBtn").onclick=smartRun;

async function smartRun(){
  const pkgFile = Object.keys(files).find(f => f === "package.json" || f.endsWith("/package.json"));
  if(!pkgFile){
    updatePreview(currentFile);
    showToast("Preview refreshed","info");
    return;
  }
  let pkg;
  try{ pkg = JSON.parse(files[pkgFile]); }catch{
    showToast("package.json is invalid — falling back to static preview","error");
    updatePreview(currentFile);
    return;
  }
  const script = pkg.scripts?.start ? "npm start" : pkg.scripts?.dev ? "npm run dev" : null;
  if(!script){
    showToast("No start/dev script found — falling back to static preview","info");
    updatePreview(currentFile);
    return;
  }
  showToast("⟳ Detected Node project — syncing & starting server...","info");
  try{
    await fetch(TERM_SERVER + "/api/terminal/sync", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ files: window.files || {} })
    });
    const r = await fetch(TERM_SERVER + "/api/terminal/start", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ command: script, port: 3000 })
    });
    const d = await r.json();
    if(d.previewUrl){
      openServerPreview(d.previewUrl);
      showToast("✓ Server running — preview opened","success");
    } else {
      showToast("Server start failed: "+(d.error||"unknown error"),"error");
    }
  }catch(e){
    showToast("Run failed: "+e.message,"error");
  }
}

document.getElementById("newFileBtn").onclick=()=>{
  const name=prompt("File name (e.g. src/app.js):");if(!name?.trim())return;
  const n=name.trim();if(files[n]!==undefined){showToast("Already exists!","error");return;}
  if(n.endsWith(".html"))files[n]=`<!DOCTYPE html>\n<html>\n<head>\n<title>${n.split("/").pop()}</title>\n</head>\n<body>\n\n</body>\n</html>`;
  else if(n.endsWith(".css"))files[n]=`/* ${n.split("/").pop()} */\n`;
  else if(n.endsWith(".js"))files[n]=`// ${n.split("/").pop()}\n`;
  else files[n]="";
  const parts=n.split("/");for(let i=1;i<parts.length;i++)openFolders.add(parts.slice(0,i).join("/"));
  renderFiles();renderTabs();openFile(n);showToast("Created "+n,"success");
};

document.getElementById("newFolderBtn").onclick=()=>{
  const name=prompt("Folder name:");if(!name?.trim())return;
  const n=name.trim();files[n+"/.gitkeep"]="";
  const parts=n.split("/");for(let i=1;i<=parts.length;i++)openFolders.add(parts.slice(0,i).join("/"));
  renderFiles();showToast("Created folder "+n,"success");
};

function saveCurrentFile(){
  if (typeof scRefresh === "function") setTimeout(scRefresh, 300);
  const blob=new Blob([editor1.getValue()],{type:"text/plain"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=currentFile.split("/").pop();a.click();URL.revokeObjectURL(a.href);
  showToast("Saved "+currentFile.split("/").pop(),"success");
}
document.getElementById("saveBtn").onclick=saveCurrentFile;

/* ZIP DOWNLOAD */
document.getElementById("downloadAllBtn").onclick=async()=>{
  showToast("Building ZIP...","info");
  try{
    if(!window.JSZip){await new Promise((res,rej)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});}
    const folderName=prompt("Project folder name:","my-project")||"my-project";
    const zip=new JSZip();const root=zip.folder(folderName);
    Object.keys(files).forEach(path=>{if(path.endsWith("/.gitkeep"))return;root.file(path,files[path]);});
    const blob=await zip.generateAsync({type:"blob"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=folderName+".zip";a.click();URL.revokeObjectURL(a.href);
    showToast("Downloaded "+folderName+".zip ✓","success");
  }catch(err){showToast("ZIP error: "+err.message,"error");}
};

document.getElementById("openFolderBtn").onclick=()=>document.getElementById("folderInput").click();
document.getElementById("folderInput").addEventListener("change",async e=>{
  let count=0;
  for(const file of e.target.files){
    try{const path=file.webkitRelativePath||file.name;files[path]=await file.text();count++;const parts=path.split("/");for(let i=1;i<parts.length;i++)openFolders.add(parts.slice(0,i).join("/"));}catch{}
  }
  renderFiles();renderTabs();
  const first=e.target.files[0]?.webkitRelativePath||e.target.files[0]?.name;
  if(first&&files[first])openFile(first);showToast("Loaded "+count+" files","success");
});

document.getElementById("splitBtn").onclick=()=>{
  const wrap=document.getElementById("editor2Wrap"),sres=document.getElementById("splitResizer");
  if(wrap.classList.contains("hidden")){wrap.classList.remove("hidden");sres.classList.remove("hidden");const next=Object.keys(files).find(f=>f!==currentFile&&!f.endsWith("/.gitkeep"))||currentFile;openFileInSplit(next);}
  else closeSplit();
};
document.getElementById("togglePreviewBtn").onclick=()=>document.getElementById("preview").classList.toggle("collapsed");
document.getElementById("toggleAiBtn").onclick=()=>{const p=document.getElementById("aiPanel"),r=document.getElementById("aiResizer");const col=p.classList.toggle("collapsed");r.classList.toggle("hidden",col);};
document.getElementById("closeAiBtn").onclick=()=>{document.getElementById("aiPanel").classList.add("collapsed");document.getElementById("aiResizer").classList.add("hidden");};
document.getElementById("sidebarToggleBtn").onclick=()=>{document.getElementById("sidebar").classList.toggle("open");document.getElementById("sidebarOverlay").classList.toggle("active");};
document.getElementById("sidebarOverlay").onclick=()=>{document.getElementById("sidebar").classList.remove("open");document.getElementById("sidebarOverlay").classList.remove("active");};

/* ========== RESIZERS ========== */
function makeResizable(resizerId,targetId,direction,minW=40){
  const resizer=document.getElementById(resizerId),target=document.getElementById(targetId);
  if(!resizer||!target)return;
  let startX=0,startW=0;
  resizer.addEventListener("mousedown",e=>{startX=e.clientX;startW=parseInt(window.getComputedStyle(target).width,10);document.documentElement.addEventListener("mousemove",onMove);document.documentElement.addEventListener("mouseup",onUp);e.preventDefault();});
  resizer.addEventListener("dblclick",()=>{target.classList.toggle("collapsed");showToast(target.classList.contains("collapsed")?"Collapsed":"Expanded","info");});
  function onMove(e){const dx=e.clientX-startX;target.style.width=Math.max(minW,direction==="right"?startW+dx:startW-dx)+"px";target.classList.remove("collapsed");}
  function onUp(){document.documentElement.removeEventListener("mousemove",onMove);document.documentElement.removeEventListener("mouseup",onUp);}
}
function makeSplitResizable(){
  const resizer=document.getElementById("splitResizer"),left=document.getElementById("editor1"),right=document.getElementById("editor2Wrap");
  if(!resizer)return;let startX=0,leftW=0,rightW=0;
  resizer.addEventListener("mousedown",e=>{startX=e.clientX;leftW=left.getBoundingClientRect().width;rightW=right.getBoundingClientRect().width;document.documentElement.addEventListener("mousemove",onMove);document.documentElement.addEventListener("mouseup",onUp);e.preventDefault();});
  function onMove(e){const dx=e.clientX-startX;left.style.flex="none";right.style.flex="none";left.style.width=Math.max(80,leftW+dx)+"px";right.style.width=Math.max(80,rightW-dx)+"px";}
  function onUp(){document.documentElement.removeEventListener("mousemove",onMove);document.documentElement.removeEventListener("mouseup",onUp);}
}
makeResizable("sidebarResizer","sidebar","right",40);
makeResizable("previewResizer","preview","left",80);
makeResizable("aiResizer","aiPanel","left",80);
makeSplitResizable();

/* ══ GITHUB OAUTH HANDLER ══ */
function loginWithGitHub() {
  const url = "https://backend-forz.onrender.com/auth/github" + (isNativeApp ? "?platform=app" : "");
  if (isNativeApp && window.Capacitor.Plugins.Browser) {
    window.Capacitor.Plugins.Browser.open({ url });
  } else {
    window.location.href = url;
  }
}

function logoutGitHub() {
  if (!confirm("Disconnect GitHub?")) return;
  localStorage.removeItem("gh_token");
  localStorage.removeItem("gh_user");
  showToast("GitHub disconnected", "info");
  const btn = document.getElementById("githubLoginBtn");
  if (btn) { btn.style.display = "flex"; btn.innerHTML = '<svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor" style="vertical-align:-2px;margin-right:5px;"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>Login with GitHub'; }
}

function handleGithubOAuthParams(params) {
  const auth = params.get("auth");
  if (!auth) return;
  if (auth === "success") {
    const token  = params.get("token");
    const login  = params.get("login");
    const name   = params.get("name");
    const avatar = params.get("avatar");
    const repos  = params.get("repos");
    if (token) localStorage.setItem("gh_token", token);
    localStorage.setItem("gh_user", JSON.stringify({
      login, name, avatar_url: avatar, public_repos: parseInt(repos)||0
    }));
    if (!localStorage.getItem("ai_user")) {
      localStorage.setItem("ai_user", JSON.stringify({
        username: login.toLowerCase(), displayName: name||login
      }));
    }
    window.history.replaceState({}, "", "/");
    const btn = document.getElementById("githubLoginBtn");
    if (btn) btn.style.display = "none";
    showToast(`✓ Welcome ${name||login}! GitHub connected 🎉`, "success");
    setTimeout(() => {
      if (typeof ghLoadRepos === "function") ghLoadRepos().then(() => {
        if (typeof renderGithubPanel === "function") renderGithubPanel();
      });
    }, 1000);
  } else if (auth === "error") {
    window.history.replaceState({}, "", "/");
    showToast("GitHub login failed — try again", "error");
  }
}

// run OAuth handler + show/hide login button
handleGithubOAuthParams(new URLSearchParams(window.location.search));

if (window.Capacitor && window.Capacitor.Plugins.App) {
  window.Capacitor.Plugins.App.addListener("appUrlOpen", (data) => {
    try {
      const url = new URL(data.url);
      handleGithubOAuthParams(url.searchParams);
    } catch {}
  });
}

setTimeout(() => {
  const btn = document.getElementById("githubLoginBtn");
  const token = localStorage.getItem("gh_token");
  if (btn) btn.style.display = token ? "none" : "flex";
}, 800);
const VAPID_PUBLIC_KEY = "BJusQFu72CxhqdH2VCJFNPGkPsKUCIRPCLeV51OZM2_hI9lhHxJuW7C2xSdA6bMQxwetcdE0ndXaKpNqN9VAvwQ";

function urlBase64ToUint8Array(base64String){
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g,"+").replace(/_/g,"/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

async function enablePushNotifications(){
  if(!("serviceWorker" in navigator) || !("PushManager" in window)){
    showToast("Push notifications not supported on this browser","error"); return;
  }
  const perm = await Notification.requestPermission();
  if(perm !== "granted"){ showToast("Notification permission denied","error"); return; }
  try{
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    const db = await initAnnounceDB();
    if(!db){ showToast("Firebase not connected","error"); return; }
    const{doc,setDoc}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const id = "sub_"+Date.now()+"_"+Math.random().toString(36).slice(2,8);
    await setDoc(doc(db,"push_subscriptions",id),{ subscription: JSON.stringify(sub), createdAt: Date.now() });
    showToast("✓ Notifications enabled","success");
  }catch(e){ showToast("Failed: "+e.message,"error"); }
}