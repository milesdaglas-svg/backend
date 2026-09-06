/* ══════════════════════════════════════════════════════
   FEATURE SPOTLIGHT
   Periodically pops up a small card nudging the user toward
   a feature they haven't used in a while — AI Assistant, Live
   Session, Extensions, etc. — with a one-line pitch and a
   "Try it" button that jumps straight there.

   Nothing here is server-driven; it all runs off localStorage,
   so it works offline and costs nothing to run.
══════════════════════════════════════════════════════ */

/* ---- tunables: adjust freely, nothing else needs to change ---- */
const FS_FIRST_DELAY_MS      = 45  * 1000;              // wait this long after page load before the very first popup
const FS_REPEAT_INTERVAL_MS  = 8   * 60 * 1000;          // re-check this often while the tab stays open ("oftenly")
const FS_MIN_GAP_MS          = 6   * 60 * 1000;          // hard floor between any two popups, even across reloads
const FS_RECENTLY_USED_MS    = 3   * 24 * 60 * 60 * 1000;// don't spotlight something used in the last N days
const FS_AUTO_HIDE_MS        = 16  * 1000;               // popup auto-dismisses itself if ignored

const FS_USAGE_KEY     = "godmode_feature_usage_v1";      // {featureId: lastUsedTimestamp}
const FS_DISMISSED_KEY = "godmode_feature_dismissed_v1";  // [featureId, ...] permanently opted out
const FS_LASTSHOWN_KEY = "godmode_feature_lastshown_v1";  // timestamp of the last popup shown, any feature

/* ---- the catalog: what to promote, in plain, inviting language ---- */
const FS_FEATURES = [
  { id: "ai-assistant",   panel: null,             icon: "🤖", name: "AI Assistant",
    blurb: "Describe what you want built or fixed in plain English — it writes the code for you, right in your editor." },
  { id: "live-session",   panel: "live-session",   icon: "👥", name: "Live Session",
    blurb: "Pair up with someone and watch each other code in real time, with chat built right in." },
  { id: "github",         panel: "github",         icon: "🐙", name: "GitHub",
    blurb: "Clone any repo straight into your workspace in one tap — no separate git client needed." },
  { id: "source-control", panel: "source-control", icon: "🔀", name: "Source Control",
    blurb: "See exactly what changed, stage it, and commit — without ever leaving the editor." },
  { id: "extensions",     panel: "extensions",     icon: "🧩", name: "Extensions",
    blurb: "Themes, snippets, language packs — make the editor feel like yours." },
  { id: "myapps",         panel: "myapps",         icon: "📦", name: "My Apps",
    blurb: "Manage and launch every app you've built, all from one screen." },
  { id: "terminal",       panel: null,             icon: "💻", name: "Shell",
    blurb: "A full terminal, right inside the app — no separate SSH client needed." },
  { id: "search",         panel: "search",         icon: "🔍", name: "Project Search",
    blurb: "Find and replace across every file at once, not just the one you have open." },
  { id: "outline",        panel: "outline",        icon: "⊟", name: "Outline",
    blurb: "Jump straight to any function or section in a big file without scrolling to find it." }
];

/* ---- tiny localStorage helpers ---- */
function fsGetUsage(){ try{ return JSON.parse(localStorage.getItem(FS_USAGE_KEY)) || {}; }catch(e){ return {}; } }
function fsSetUsage(map){ try{ localStorage.setItem(FS_USAGE_KEY, JSON.stringify(map)); }catch(e){} }
function fsGetDismissed(){ try{ return JSON.parse(localStorage.getItem(FS_DISMISSED_KEY)) || []; }catch(e){ return []; } }
function fsSetDismissed(arr){ try{ localStorage.setItem(FS_DISMISSED_KEY, JSON.stringify(arr)); }catch(e){} }

/* call this whenever a feature is genuinely used, not just glanced at */
function fsRecordFeatureUse(featureId){
  if(!featureId) return;
  const usage = fsGetUsage();
  usage[featureId] = Date.now();
  fsSetUsage(usage);
  // if a popup for this exact feature is on screen, it just did its job
  fsCloseCurrentPopup();
}

/* ---- wire usage tracking into the app's existing switch/open functions,
   without touching those files — capture whatever they currently are and
   wrap them, so this keeps working even if those functions get edited later. ---- */
(function fsHookUsageTracking(){
  const panelIds = new Set(FS_FEATURES.filter(f=>f.panel).map(f=>f.panel));
  if(typeof window.activitySwitch === "function"){
    const originalSwitch = window.activitySwitch;
    window.activitySwitch = function(panel){
      const r = originalSwitch.apply(this, arguments);
      if(panelIds.has(panel)) fsRecordFeatureUse(FS_FEATURES.find(f=>f.panel===panel).id);
      return r;
    };
  }
  if(typeof window.toggleTerminal === "function"){
    const originalTerm = window.toggleTerminal;
    window.toggleTerminal = function(){ const r = originalTerm.apply(this, arguments); fsRecordFeatureUse("terminal"); return r; };
  }
  // AI Assistant: opening the panel isn't really "using" it — count an
  // actual send instead, so it keeps getting spotlighted until they do.
  const aiSendBtn = document.getElementById("aiSend");
  if(aiSendBtn) aiSendBtn.addEventListener("click", ()=>fsRecordFeatureUse("ai-assistant"));
})();

/* ---- picking what to spotlight next ---- */
function fsCurrentPanel(){
  const active = document.querySelector(".activity-btn.active");
  return active ? active.dataset.panel : null;
}

function fsPickFeature(){
  const usage = fsGetUsage();
  const dismissed = new Set(fsGetDismissed());
  const now = Date.now();
  const activePanel = fsCurrentPanel();

  const candidates = FS_FEATURES.filter(f => {
    if(dismissed.has(f.id)) return false;
    if(f.panel && f.panel === activePanel) return false; // already doing it
    const last = usage[f.id] || 0;
    return (now - last) >= FS_RECENTLY_USED_MS;
  });
  if(!candidates.length) return null;

  // spotlight whichever's gone longest without use (never-used sorts first);
  // pick randomly among the least-used handful so it doesn't feel robotic
  candidates.sort((a,b) => (usage[a.id]||0) - (usage[b.id]||0));
  const pool = candidates.slice(0, Math.min(3, candidates.length));
  return pool[Math.floor(Math.random()*pool.length)];
}

/* ---- the popup itself ---- */
let fsActiveTimer = null;

function fsCloseCurrentPopup(){
  const el = document.getElementById("fsPopup");
  if(!el) return;
  if(fsActiveTimer){ clearTimeout(fsActiveTimer); fsActiveTimer = null; }
  el.classList.remove("fs-show");
  setTimeout(()=>el.remove(), 250);
}

function fsOpenFeature(feature){
  if(feature.panel && typeof window.activitySwitch === "function"){
    window.activitySwitch(feature.panel);
  } else if(feature.id === "ai-assistant"){
    const panel = document.getElementById("aiPanel");
    if(panel && panel.classList.contains("collapsed")) document.getElementById("toggleAiBtn")?.click();
    setTimeout(()=>document.getElementById("aiInput")?.focus(), 150);
  } else if(feature.id === "terminal" && typeof window.toggleTerminal === "function"){
    const panel = document.getElementById("terminalPanel");
    if(!panel || panel.style.display === "none" || !panel.innerHTML.trim()) window.toggleTerminal();
  }
}

function fsShowPopup(feature){
  fsCloseCurrentPopup();
  try{ localStorage.setItem(FS_LASTSHOWN_KEY, String(Date.now())); }catch(e){}

  const card = document.createElement("div");
  card.id = "fsPopup";
  card.className = "fs-popup";
  card.innerHTML = `
    <button class="fs-close" title="Not now">✕</button>
    <div class="fs-icon">${feature.icon}</div>
    <div class="fs-body">
      <div class="fs-eyebrow">Psst — have you tried…</div>
      <div class="fs-name">${feature.name}</div>
      <div class="fs-blurb">${feature.blurb}</div>
      <div class="fs-actions">
        <button class="fs-try">✨ Try it now</button>
        <button class="fs-later">Not now</button>
      </div>
      <div class="fs-dismiss">Don't show me this again</div>
    </div>`;
  document.body.appendChild(card);
  requestAnimationFrame(()=>card.classList.add("fs-show"));

  card.querySelector(".fs-try").onclick = () => { fsOpenFeature(feature); fsCloseCurrentPopup(); };
  card.querySelector(".fs-close").onclick = () => fsCloseCurrentPopup();
  card.querySelector(".fs-later").onclick = () => fsCloseCurrentPopup();
  card.querySelector(".fs-dismiss").onclick = () => {
    const d = fsGetDismissed();
    if(!d.includes(feature.id)){ d.push(feature.id); fsSetDismissed(d); }
    fsCloseCurrentPopup();
  };

  fsActiveTimer = setTimeout(fsCloseCurrentPopup, FS_AUTO_HIDE_MS);
}

function fsMaybeShow(){
  if(document.hidden) return;               // don't pop up in a background tab
  if(document.getElementById("fsPopup")) return; // one at a time
  let lastShown = 0;
  try{ lastShown = Number(localStorage.getItem(FS_LASTSHOWN_KEY)) || 0; }catch(e){}
  if(Date.now() - lastShown < FS_MIN_GAP_MS) return;
  const feature = fsPickFeature();
  if(feature) fsShowPopup(feature);
}

/* ---- schedule ---- */
window.addEventListener("load", () => {
  setTimeout(fsMaybeShow, FS_FIRST_DELAY_MS);
  setInterval(fsMaybeShow, FS_REPEAT_INTERVAL_MS);
});
