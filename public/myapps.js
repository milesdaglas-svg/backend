/* =========================================
   MY APPS — showcase admin's other apps
========================================= */

async function getMyApps(){
  try{
    const db = await initAnnounceDB(); if(!db) return [];
    const{doc,getDoc}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db,"global_settings","myapps"));
    return snap.exists() ? (snap.data().list||[]) : [];
  }catch{ return []; }
}

async function saveMyApps(list){
  try{
    const db = await initAnnounceDB(); if(!db) return false;
    const{doc,setDoc}=await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db,"global_settings","myapps"),{ list, updatedAt: Date.now() });
    return true;
  }catch{ return false; }
}

/* ── SIDEBAR PANEL (all users see this) ── */
async function renderMyAppsPanel(){
  const container = document.getElementById("myapps-list");
  if(!container) return;
  container.innerHTML = `<div class="myapps-empty">// Loading...</div>`;
  const apps = await getMyApps();
  if(!apps.length){ container.innerHTML = `<div class="myapps-empty">No apps added yet</div>`; return; }
  container.innerHTML = apps.map(a=>`
    <div class="myapps-card" onclick="window.open('${a.url.replace(/'/g,"\\'")}','_blank')">
      <div class="myapps-card-icon">${a.image?`<img src="${a.image}" style="width:24px;height:24px;object-fit:cover;border-radius:${a.shape==='circle'?'50%':a.shape==='rounded'?'6px':'0'};">`:(a.icon||"🚀")}</div>
      <div class="myapps-card-body">
        <div class="myapps-card-name">${escapeHtml(a.name)}</div>
        <div class="myapps-card-desc">${escapeHtml(a.description||"")}</div>
      </div>
      <div class="myapps-card-arrow">→</div>
    </div>`).join("");
}

/* ── ADMIN TAB (add/edit/delete) ── */
async function loadAdminMyAppsTab(){
  const el = document.getElementById("adm-myapps-content");
  if(!el) return;
  el.innerHTML = `<div class="adm-feed-loading">// Loading...</div>`;
  const apps = await getMyApps();
  el.innerHTML = `
    <div class="adm-section-title">// YOUR APPS</div>
    <div class="myapps-adm-list" id="myapps-adm-list">
      ${apps.length ? apps.map((a,i)=>`
        <div class="myapps-adm-item">
          <div class="myapps-adm-item-icon">${a.image?`<img src="${a.image}" style="width:20px;height:20px;object-fit:cover;border-radius:${a.shape==='circle'?'50%':a.shape==='rounded'?'6px':'0'};">`:(a.icon||"🚀")}</div>
          <div class="myapps-adm-item-info">
            <div class="myapps-adm-item-name">${escapeHtml(a.name)}</div>
            <div class="myapps-adm-item-url">${escapeHtml(a.url)}</div>
          </div>
          <div class="myapps-adm-item-actions">
            <button class="adm-btn-danger" onclick="deleteMyApp(${i})">✕ Remove</button>
          </div>
        </div>`).join("") : `<div class="adm-feed-empty">No apps added yet</div>`}
    </div>

    <div class="adm-section-title">// ADD NEW APP</div>
    <div class="adm-form">
      <div class="adm-field"><label>App Name *</label><input id="myapp-name" class="adm-input" placeholder="e.g. My Portfolio Site"></div>
      <div class="adm-field"><label>URL *</label><input id="myapp-url" class="adm-input" placeholder="https://..."></div>
      <div class="adm-field"><label>Image URL (optional — leave empty to use emoji instead)</label><input id="myapp-image" class="adm-input" placeholder="https://example.com/logo.png"></div>
      <div class="adm-field"><label>Image Shape</label>
        <select id="myapp-shape" class="adm-input">
          <option value="circle">⚪ Circle</option>
          <option value="rounded">▢ Rounded Square</option>
          <option value="square">⬛ Square (no rounding)</option>
        </select>
      </div>
      <div class="adm-field"><label>Icon (emoji — used only if no image URL given)</label><input id="myapp-icon" class="adm-input" placeholder="🚀" maxlength="4"></div>
      <div class="adm-field"><label>Description</label><textarea id="myapp-desc" class="adm-textarea" rows="2" placeholder="Short description users will see"></textarea></div>
      <div class="adm-form-actions">
        <button class="adm-btn adm-btn-primary" onclick="addMyApp()">➕ Add App</button>
      </div>
      <div id="myapp-status" class="adm-form-status"></div>
    </div>`;
}

async function addMyApp(){
  const name = document.getElementById("myapp-name")?.value.trim();
  const url = document.getElementById("myapp-url")?.value.trim();
  const image = document.getElementById("myapp-image")?.value.trim();
  const shape = document.getElementById("myapp-shape")?.value || "circle";
  const icon = document.getElementById("myapp-icon")?.value.trim();
  const description = document.getElementById("myapp-desc")?.value.trim();
  const statusEl = document.getElementById("myapp-status");
  if(!name || !url){ if(statusEl) statusEl.innerText = "Name and URL are required"; return; }
  const apps = await getMyApps();
  apps.push({ name, url, image, shape, icon: icon||"🚀", description });
  const ok = await saveMyApps(apps);
  if(statusEl) statusEl.innerText = ok ? "✓ Added" : "✗ Failed to save";
  loadAdminMyAppsTab();
}

async function deleteMyApp(index){
  if(!confirm("Remove this app from the list?")) return;
  const apps = await getMyApps();
  apps.splice(index,1);
  await saveMyApps(apps);
  loadAdminMyAppsTab();
}
document.addEventListener("keydown", e=>{
  if(e.ctrlKey && e.shiftKey && e.key==="P"){ e.preventDefault(); openCommandPalette(); }
});

const COMMAND_LIST = [
  { name:"New File", fn:()=>document.getElementById("newFileBtn").click() },
  { name:"New Folder", fn:()=>document.getElementById("newFolderBtn").click() },
  { name:"Save", fn:()=>document.getElementById("saveBtn").click() },
  { name:"Run", fn:smartRun },
  { name:"Toggle Terminal", fn:toggleTerminal },
  { name:"Toggle AI Panel", fn:()=>document.getElementById("toggleAiBtn").click() },
  { name:"Download ZIP", fn:downloadProjectZip },
  { name:"Open Template Menu", fn:openTemplateMenu },
  { name:"Toggle Theme", fn:()=>document.getElementById("themeBtn").click() },
  { name:"Open Admin Panel", fn:openAdminPanel },
];

function openCommandPalette(){
  document.querySelector(".snippet-overlay")?.remove();
  document.querySelector(".snippet-menu")?.remove();
  const overlay=document.createElement("div");
  overlay.className="snippet-overlay";
  overlay.onclick=()=>{overlay.remove();menu.remove();};
  const menu=document.createElement("div");
  menu.className="snippet-menu";
  menu.innerHTML=`
    <div class="snippet-menu-header"><span>⌘ Command Palette</span></div>
    <div style="padding:8px;"><input id="cmdPaletteInput" placeholder="Type a command..." style="width:100%;background:#0d1117;border:1px solid #333;color:#ccc;padding:8px;border-radius:6px;" autofocus></div>
    <div class="snippet-menu-list" id="cmdPaletteList"></div>`;
  document.body.append(overlay,menu);
  const renderList=(q="")=>{
    const list=document.getElementById("cmdPaletteList");
    const filtered=COMMAND_LIST.filter(c=>c.name.toLowerCase().includes(q.toLowerCase()));
    list.innerHTML=filtered.map((c,i)=>`<div class="snippet-item" onclick="COMMAND_LIST.find(x=>x.name==='${c.name}').fn();document.querySelector('.snippet-menu').remove();document.querySelector('.snippet-overlay').remove();"><div class="snippet-item-name">${c.name}</div></div>`).join("")||`<div class="snippet-menu-empty">No matches</div>`;
  };
  renderList();
  document.getElementById("cmdPaletteInput").addEventListener("input",e=>renderList(e.target.value));
  setTimeout(()=>document.getElementById("cmdPaletteInput")?.focus(),50);
}