/* =========================================
   SOURCE CONTROL + OUTLINE PANELS
========================================= */

const SC_BASELINE_KEY = "sc_baseline";
const SC_LAST_COMMIT_KEY = "sc_last_commit";
let scChanges = {};

function scInit() {
  if (!window.files) return;
  const baseline = scGetBaseline();
  if (!Object.keys(baseline).length && Object.keys(window.files).length) scSaveBaseline();
  scRefresh();
}

function scGetBaseline() {
  try { return JSON.parse(localStorage.getItem(SC_BASELINE_KEY) || "{}"); } catch { return {}; }
}

function scSaveBaseline() {
  try {
    const snapshot = {};
    Object.keys(window.files || {}).forEach(f => { snapshot[f] = (window.files[f] || "").slice(0,5000); });
    localStorage.setItem(SC_BASELINE_KEY, JSON.stringify(snapshot));
  } catch {}
}

function scComputeChanges() {
  const baseline = scGetBaseline();
  const current = window.files || {};
  const changes = {};
  Object.keys(current).forEach(f => {
    if (f.endsWith("/.gitkeep")) return;
    const base = baseline[f];
    const cur = current[f] || "";
    if (base === undefined) changes[f] = { status:"A" };
    else if (base !== cur.slice(0,5000)) changes[f] = { status:"M" };
  });
  Object.keys(baseline).forEach(f => {
    if (!current[f] && !f.endsWith("/.gitkeep")) changes[f] = { status:"D" };
  });
  return changes;
}

function scRefresh() {
  scChanges = scComputeChanges();
  renderSourceControl();
  updateScActivityBadge();
}

function updateScActivityBadge() {
  const badge = document.getElementById("sc-activity-badge");
  const count = Object.keys(scChanges).length;
  if (badge) { badge.innerText = count; badge.style.display = count > 0 ? "flex" : "none"; }
}

function renderSourceControl() {
  const container = document.getElementById("sc-file-list");
  if (!container) return;
  const entries = Object.entries(scChanges);
  const lastCommit = (() => { try { return JSON.parse(localStorage.getItem(SC_LAST_COMMIT_KEY)||"null"); } catch { return null; } })();

  if (!entries.length) {
    container.innerHTML = `
      <div class="sc-empty">✓ No changes<br><span style="font-size:10px;">All files match baseline</span></div>
      ${lastCommit?`<div class="sc-last-commit"><div class="sc-last-commit-msg">💬 ${lastCommit.message}</div><div class="sc-last-commit-meta">${lastCommit.time}</div></div>`:""}`;
    return;
  }

  const statusOrder = {M:0,A:1,D:2};
  const sorted = entries.sort((a,b)=>(statusOrder[a[1].status]||9)-(statusOrder[b[1].status]||9));
  container.innerHTML = sorted.map(([file,info]) => {
    const parts = file.split("/"); const name = parts.pop(); const path = parts.join("/"); const s = info.status;
    return `<div class="sc-file-item" onclick="scOpenFile('${file}')">
      <span class="sc-file-status sc-status-${s}">${s}</span>
      <span class="sc-file-name">${name}</span>
      ${path?`<span class="sc-file-path">${path}</span>`:""}
      <div class="sc-file-actions">
        <button class="sc-file-action-btn" title="Discard" onclick="event.stopPropagation();scDiscardFile('${file}')">↩</button>
        <button class="sc-file-action-btn" title="Stage" onclick="event.stopPropagation();showToast('Staged: ${file}','success')">+</button>
      </div>
    </div>`;
  }).join("") + (lastCommit?`<div class="sc-last-commit" style="margin-top:12px;"><div class="sc-last-commit-msg">💬 ${lastCommit.message}</div><div class="sc-last-commit-meta">Last commit · ${lastCommit.time}</div></div>`:"");
}

function scOpenFile(file) { if (typeof openFile==="function") openFile(file); }

function scDiscardFile(file) {
  if (!confirm(`Discard changes to "${file}"?`)) return;
  const baseline = scGetBaseline();
  if (baseline[file] !== undefined) {
    if (window.files) window.files[file] = baseline[file];
    if (typeof saveToStorage==="function") saveToStorage();
    if (typeof renderFiles==="function") renderFiles();
    if (file === (typeof currentFile!=="undefined"&&currentFile) && window.editor1) window.editor1.setValue(baseline[file]);
    showToast("↩ "+file+" restored","info");
  } else {
    if (window.files) delete window.files[file];
    if (typeof saveToStorage==="function") saveToStorage();
    if (typeof renderFiles==="function") renderFiles();
    showToast("🗑 "+file+" removed","info");
  }
  scRefresh();
}

function scCommit() {
  const msg = document.getElementById("sc-commit-msg")?.value.trim();
  if (!msg) { showToast("Enter a commit message","error"); return; }
  if (!Object.keys(scChanges).length) { showToast("Nothing to commit","info"); return; }
  const commitData = {message:msg, time:new Date().toLocaleString(), files:Object.keys(scChanges).length};
  localStorage.setItem(SC_LAST_COMMIT_KEY, JSON.stringify(commitData));
  scSaveBaseline(); scRefresh();
  const msgEl = document.getElementById("sc-commit-msg"); if (msgEl) msgEl.value="";
  showToast(`✓ Committed "${msg}" (${commitData.files} file${commitData.files!==1?"s":""})`, "success");
}

function scResetBaseline() {
  if (!confirm("Reset baseline to current state?")) return;
  scSaveBaseline(); scRefresh(); showToast("Baseline reset ✓","success");
}

setInterval(() => {
  const panel = document.querySelector(".sidebar-panel[data-panel='source-control']");
  if (panel && panel.classList.contains("active")) scRefresh();
}, 6000);

/* ══════════════════════
   OUTLINE PANEL
══════════════════════ */
function buildOutline() {
  const container = document.getElementById("outline-list");
  if (!container) return;
  const ed = window.editor1;
  const file = typeof currentFile!=="undefined" ? currentFile : "";
  if (!ed || !file) { container.innerHTML=`<div class="outline-empty">// Open a file to see outline</div>`; return; }
  const content = ed.getValue();
  const ext = file.split(".").pop().toLowerCase();
  let symbols = [];
  if (["js","jsx","ts","tsx","mjs"].includes(ext)) symbols = parseJsOutline(content);
  else if (["css","scss","less"].includes(ext)) symbols = parseCssOutline(content);
  else if (["html","htm"].includes(ext)) symbols = parseHtmlOutline(content);
  else if (ext==="py") symbols = parsePyOutline(content);
  else if (ext==="json") symbols = parseJsonOutline(content);
  else symbols = parseGenericOutline(content);
  if (!symbols.length) { container.innerHTML=`<div class="outline-empty">// No symbols found in ${file.split("/").pop()}</div>`; return; }
  container.innerHTML = symbols.map(s=>`
    <div class="outline-item${s.indent?" outline-indent-"+s.indent:""}" onclick="outlineJump(${s.line})" title="${s.name} (line ${s.line})">
      <span class="outline-icon ${s.colorClass}">${s.icon}</span>
      <span class="outline-name">${String(s.name).replace(/</g,"&lt;").replace(/>/g,"&gt;")}</span>
      <span class="outline-line">${s.line}</span>
    </div>`).join("");
}

function outlineJump(lineNo) {
  const ed = window.editor1; if (!ed) return;
  ed.revealLineInCenter(lineNo); ed.setPosition({lineNumber:lineNo,column:1}); ed.focus();
}

function parseJsOutline(content) {
  const symbols=[]; const lines=content.split("\n");
  const patterns=[
    {re:/^(export\s+)?(async\s+)?function\s+(\w+)\s*\(/,icon:"ƒ",colorClass:"outline-kind-function",nameIdx:3},
    {re:/^(export\s+)?class\s+(\w+)/,icon:"C",colorClass:"outline-kind-class",nameIdx:2},
    {re:/^(export\s+)?const\s+(\w+)\s*=\s*(async\s*)?\(/,icon:"λ",colorClass:"outline-kind-arrow",nameIdx:2},
    {re:/^(export\s+)?const\s+(\w+)\s*=\s*function/,icon:"ƒ",colorClass:"outline-kind-function",nameIdx:2},
    {re:/^(export\s+)?(const|let|var)\s+(\w+)\s*=(?!=)/,icon:"▣",colorClass:"outline-kind-variable",nameIdx:3},
  ];
  lines.forEach((line,idx)=>{
    for(const p of patterns){
      const m=line.match(p.re);
      if(m){const name=m[p.nameIdx];if(name&&name.length>1&&!/^(if|for|while|switch|return|import|export)$/.test(name)){symbols.push({name,line:idx+1,icon:p.icon,colorClass:p.colorClass,indent:p.indent||0});} break;}
    }
  });
  return symbols;
}

function parseCssOutline(content) {
  const symbols=[]; const lines=content.split("\n");
  lines.forEach((line,idx)=>{
    const t=line.trim(); if(!t||t.startsWith("//")||t.startsWith("*")) return;
    const at=t.match(/^(@\w+)\s+([^{]+)/);
    if(at){symbols.push({name:at[1]+" "+at[2].trim(),line:idx+1,icon:"@",colorClass:"outline-kind-class"});return;}
    if(t.endsWith("{")){const sel=t.replace("{","").trim();if(sel.length<80)symbols.push({name:sel,line:idx+1,icon:"⬡",colorClass:"outline-kind-id"});}
  });
  return symbols.slice(0,80);
}

function parseHtmlOutline(content) {
  const symbols=[]; const lines=content.split("\n");
  lines.forEach((line,idx)=>{
    const m=line.match(/<(h[1-6]|title|nav|header|footer|main|section|article|aside|form|table)[^>]*>(.*?)</i);
    if(m){const tag=m[1].toLowerCase();const text=m[2].replace(/<[^>]+>/g,"").trim().slice(0,50);const icon=tag.startsWith("h")?"#":"⬡";const indent=tag.startsWith("h")?parseInt(tag[1])-1:0;symbols.push({name:text||`<${tag}>`,line:idx+1,icon,colorClass:"outline-kind-class2",indent:Math.min(indent,2)});}
    const idMatch=line.match(/id=["']([^"']+)["']/);
    if(idMatch)symbols.push({name:"#"+idMatch[1],line:idx+1,icon:"⚓",colorClass:"outline-kind-id",indent:1});
  });
  return symbols;
}

function parsePyOutline(content) {
  const symbols=[]; const lines=content.split("\n");
  lines.forEach((line,idx)=>{
    const fn=line.match(/^(\s*)(async\s+)?def\s+(\w+)\s*\(/);
    if(fn){symbols.push({name:fn[3]+"()",line:idx+1,icon:"ƒ",colorClass:"outline-kind-function",indent:fn[1].length>0?1:0});return;}
    const cl=line.match(/^class\s+(\w+)/);
    if(cl)symbols.push({name:cl[1],line:idx+1,icon:"C",colorClass:"outline-kind-class"});
  });
  return symbols;
}

function parseJsonOutline(content) {
  const symbols=[]; const lines=content.split("\n");
  lines.forEach((line,idx)=>{
    const m=line.match(/^\s*"([^"]+)"\s*:/);
    if(m){const depth=(line.match(/^\s*/)[0].length/2);symbols.push({name:m[1],line:idx+1,icon:depth===0?"{}":"▣",colorClass:depth===0?"outline-kind-class":"outline-kind-variable",indent:Math.min(depth,2)});}
  });
  return symbols.slice(0,60);
}

function parseGenericOutline(content) {
  const symbols=[]; const lines=content.split("\n");
  lines.forEach((line,idx)=>{
    const m=line.match(/^#{1,3}\s+(.+)/);
    if(m){const level=(line.match(/^(#+)/)||["",""])[1].length;symbols.push({name:m[1].trim(),line:idx+1,icon:"#",colorClass:"outline-kind-class2",indent:Math.min(level-1,2)});}
  });
  return symbols;
}

/* ══════════════════════
   ACTIVITY SWITCH (override)
══════════════════════ */
function activitySwitch(panel) {
  document.querySelectorAll(".activity-btn").forEach(b=>b.classList.toggle("active",b.dataset.panel===panel));
  document.querySelectorAll(".sidebar-panel").forEach(p=>p.classList.toggle("active",p.dataset.panel===panel));
  const sidebar=document.getElementById("sidebar");
  if(window.innerWidth<=768&&sidebar&&!sidebar.classList.contains("open")){sidebar.classList.add("open");document.getElementById("sidebarOverlay")?.classList.add("active");}
  if(panel==="search") setTimeout(()=>document.getElementById("searchInput")?.focus(),50);
  if(panel==="source-control") scRefresh();
  if(panel==="outline") buildOutline();
  if(panel==="extensions") setTimeout(()=>{if(typeof renderExtensionsPanel==="function")renderExtensionsPanel();},50);
}

/* ══════════════════════
   AUTO-INIT ON LOAD
══════════════════════ */
window.addEventListener("load",()=>{
  setTimeout(()=>{
    scInit();
    if(window.editor1){
      if(typeof window.editor1.onDidChangeCursorPosition==="function"){
        window.editor1.onDidChangeCursorPosition(()=>{
          const p=document.querySelector(".sidebar-panel[data-panel='outline']");
          if(p&&p.classList.contains("active")) buildOutline();
        });
      }
      if(typeof window.editor1.onDidChangeModelContent==="function"){
        window.editor1.onDidChangeModelContent(()=>{
          const p=document.querySelector(".sidebar-panel[data-panel='outline']");
          if(p&&p.classList.contains("active")) setTimeout(buildOutline,500);
          scRefresh();
        });
      }
    }
  },2500);
});