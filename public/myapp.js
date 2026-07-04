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
      <div class="myapps-card-icon">${a.icon||"🚀"}</div>
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
          <div class="myapps-adm-item-icon">${a.icon||"🚀"}</div>
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
      <div class="adm-field"><label>Icon (emoji)</label><input id="myapp-icon" class="adm-input" placeholder="🚀" maxlength="4"></div>
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
  const icon = document.getElementById("myapp-icon")?.value.trim();
  const description = document.getElementById("myapp-desc")?.value.trim();
  const statusEl = document.getElementById("myapp-status");
  if(!name || !url){ if(statusEl) statusEl.innerText = "Name and URL are required"; return; }
  const apps = await getMyApps();
  apps.push({ name, url, icon: icon||"🚀", description });
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