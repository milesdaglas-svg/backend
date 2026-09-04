/* =========================================
   LIVE SESSION — pair-coding / teaching view
   Anyone in a room can flip "broadcast" on/off.
   Everyone currently broadcasting is shown live
   to everyone else in the room (one-way per
   person, many-way per room — both can show at
   once, or just one, whichever they choose).
========================================= */
let lsRoomCode      = null;
let lsMyId          = localStorage.getItem("ls_myId") || null;
let lsMyName        = localStorage.getItem("ls_myName") || (typeof currentAiUser !== "undefined" && currentAiUser?.username) || "";
let lsBroadcasting  = false;
let lsUnsub         = null;
let lsBroadcastTimer= null;
let lsStaleTimer    = null;
let lsHeartbeatTimer= null;
let lsLastList      = [];
let lsMyPinProof    = null;
let lsPublicUnsub   = null;
let lsExpanded       = false;
let lsDb            = null;
let lsFns           = null; // cached firestore fn refs
const LS_STALE_MS   = 5000; // no update in 5s while marked broadcasting = treat as disconnected

if(!lsMyId){
  lsMyId = "p_"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  localStorage.setItem("ls_myId", lsMyId);
}

/* best-effort cleanup if the tab is closed mid-broadcast */
window.addEventListener("beforeunload", ()=>{
  if(!lsRoomCode) return;
  try{
    if(lsDb && lsFns){
      lsFns.deleteDoc(lsFns.doc(lsDb,"liveRooms",lsRoomCode,"participants",lsMyId)).catch(()=>{});
    }
  }catch{}
});

function lsPanelBody(){ return document.getElementById("ls-panel-body"); }

/* ── EXPAND TO FULLSCREEN ──
   The sidebar is only ~220px wide, so cramming live code + chat in there
   makes everything look sparse/cramped. Rather than rebuild the whole UI
   twice, this MOVES the actual panel-body DOM node into a fullscreen
   overlay (and back on close) — same element, same ids, so every
   onSnapshot listener and getElementById() call in the rest of this file
   just keeps working without any special-casing. */
function lsToggleExpand(){
  lsExpanded ? lsCloseFullscreen() : lsOpenFullscreen();
}

function lsOpenFullscreen(){
  const panelBody = document.getElementById("ls-panel-body");
  if(!panelBody || lsExpanded) return;
  const overlay = document.createElement("div");
  overlay.id = "lsFullscreenOverlay";
  overlay.className = "ls-fullscreen-overlay";
  overlay.innerHTML = `
    <div class="ls-fullscreen-header">
      <span>👥 Live Session${lsRoomCode?' — Room <span class="ls-fs-code">'+lsRoomCode+'</span>':''}</span>
      <button class="ls-btn secondary" onclick="lsToggleExpand()">✕ Exit Fullscreen</button>
    </div>
    <div class="ls-fullscreen-content" id="lsFullscreenContent"></div>`;
  document.body.appendChild(overlay);
  document.getElementById("lsFullscreenContent").appendChild(panelBody);
  panelBody.classList.add("ls-body-fullscreen");
  const btn = panelBody.querySelector(".ls-expand-btn");
  if(btn) btn.textContent = "⛶ Already fullscreen";
  lsExpanded = true;
}

function lsCloseFullscreen(){
  const panelBody = document.getElementById("ls-panel-body");
  const homeSlot = document.querySelector('.sidebar-panel[data-panel="live-session"]');
  if(panelBody && homeSlot){
    panelBody.classList.remove("ls-body-fullscreen");
    homeSlot.appendChild(panelBody);
    const btn = panelBody.querySelector(".ls-expand-btn");
    if(btn) btn.textContent = "⛶ Expand to fullscreen";
  }
  document.getElementById("lsFullscreenOverlay")?.remove();
  lsExpanded = false;
}

async function lsInitDb(){
  if(lsDb) return lsDb;
  lsDb = await initAnnounceDB();
  return lsDb;
}
async function lsFirestoreFns(){
  if(lsFns) return lsFns;
  lsFns = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  return lsFns;
}

function lsGenCode(){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let c = "";
  for(let i=0;i<6;i++) c += chars[Math.floor(Math.random()*chars.length)];
  return c;
}

async function lsHashPin(pin){
  if(!pin) return null;
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

/* ── RENDER ENTRY (called by activitySwitch) ── */
function renderLiveSessionPanel(){
  const body = lsPanelBody(); if(!body) return;
  if(lsPublicUnsub){ lsPublicUnsub(); lsPublicUnsub=null; }
  if(!lsRoomCode){
    body.innerHTML = `
      <div class="ls-intro">
        <div class="ls-intro-title">👥 Live Session</div>
        <div class="ls-intro-sub">Watch each other code in real time — for pairing, teaching, or reviewing together. Anyone in a room can flip broadcast on to show their editor; everyone else watches live.</div>
      </div>

      <div class="ls-box">
        <div class="ls-section-title"><span class="ls-step">1</span> Start a new session</div>
        <div class="ls-section-sub">You'll get a 6-character code to share.</div>
        <div class="ls-row" style="margin:10px 0 8px;">
          <input type="text" id="lsNameInput" placeholder="Your name" value="${lsMyName ? lsMyName.replace(/"/g,'&quot;') : ''}">
        </div>
        <div class="ls-toggle-row" style="margin-bottom:8px;">
          <span>🌐 Public — anyone can find &amp; join, no PIN</span>
          <div class="ls-switch" id="lsPublicSwitch" onclick="lsTogglePublicSwitch()"></div>
        </div>
        <div class="ls-row" style="margin-bottom:10px;" id="lsPinRow">
          <input type="text" id="lsPinInput" placeholder="Optional PIN to lock room" maxlength="8">
        </div>
        <button class="ls-btn" style="width:100%;" onclick="lsCreateRoom()">➕ Create Room</button>
      </div>

      <div class="ls-divider">or</div>

      <div class="ls-box">
        <div class="ls-section-title"><span class="ls-step">2</span> Join with a code</div>
        <div class="ls-section-sub">Got a code from someone? Enter it here.</div>
        <div class="ls-row" style="margin:10px 0 8px;">
          <input type="text" id="lsJoinInput" placeholder="Room code" maxlength="6" style="text-transform:uppercase;">
          <button class="ls-btn secondary" onclick="lsJoinRoom()">Join</button>
        </div>
        <div class="ls-row">
          <input type="text" id="lsJoinPinInput" placeholder="PIN (only if the room has one)" maxlength="8">
        </div>
      </div>

      <div class="ls-divider">or</div>

      <div class="ls-box">
        <div class="ls-section-title">🌐 Browse public sessions</div>
        <div class="ls-section-sub">Open rooms anyone can hop into right now.</div>
        <div class="ls-public-list" id="lsPublicList" style="margin-top:10px;"><div class="ls-empty">Loading…</div></div>
      </div>`;
    lsSubscribePublicRooms();
    return;
  }

  body.innerHTML = `
    <div class="ls-sidebar-col">
      <div class="ls-box ls-room-card">
        <div class="ls-room-status">${lsBroadcasting?'<span class="ls-live-dot"></span>You\'re broadcasting':'In session — not broadcasting'}</div>
        <div class="ls-code">${lsRoomCode}</div>
        <div class="ls-hint" style="text-align:center;margin-top:0;">Share this code — tap to copy</div>
        <div class="ls-row" style="margin-top:10px;">
          <button class="ls-btn secondary" style="flex:1;" onclick="lsCopyCode()">📋 Copy Code</button>
          <button class="ls-btn danger" style="flex:1;" onclick="lsLeaveRoom()">🚪 Leave</button>
        </div>
        <button class="ls-btn secondary ls-expand-btn" onclick="lsToggleExpand()">${lsExpanded?'⛶ Already fullscreen':'⛶ Expand to fullscreen'}</button>
      </div>

      <div class="ls-box">
        <div class="ls-section-title">📡 Your broadcast</div>
        <div class="ls-toggle-row" style="margin-top:8px;">
          <span>Show my editor to the room</span>
          <div class="ls-switch ${lsBroadcasting?'on':''}" id="lsSwitch" onclick="lsToggleBroadcast()"></div>
        </div>
        <div class="ls-section-sub">When on, everyone here sees your current file live, including your cursor.</div>
      </div>

      <div class="ls-box">
        <div class="ls-section-title">👥 People <span class="ls-count-badge" id="lsPeopleCount">1</span></div>
        <div class="ls-presence-list" id="lsPresenceList" style="margin-top:8px;"><div class="ls-empty">Loading…</div></div>
      </div>

      <div class="ls-box">
        <div class="ls-section-title">🖥️ Live editors <span class="ls-count-badge" id="lsLiveCount">0</span></div>
        <div class="ls-section-sub">Anyone with broadcast on shows up here, live.</div>
        <div class="ls-participants" id="lsParticipants" style="margin-top:8px;">
          <div class="ls-empty">Waiting for updates…</div>
        </div>
      </div>
    </div>

    <div class="ls-main-col">
      <div class="ls-chat-box">
        <div class="ls-chat-header">
          <div class="ls-chat-header-title">💬 Room Chat</div>
          <div class="ls-chat-header-sub">Talk through what you're seeing, without interrupting the code</div>
        </div>
        <div class="ls-chat-log" id="lsChatLog"></div>
        <div class="ls-reply-bar" id="lsReplyBar" style="display:none;"></div>
        <div class="ls-chat-input-row">
          <input type="text" id="lsChatInput" placeholder="Message the room…" onkeydown="if(event.key==='Enter')lsSendChat()">
          <button class="ls-send-btn" onclick="lsSendChat()" title="Send">➤</button>
        </div>
      </div>
    </div>`;
  const codeEl = body.querySelector(".ls-code");
  if(codeEl) codeEl.onclick = lsCopyCode;
}

function lsTogglePublicSwitch(){
  const sw = document.getElementById("lsPublicSwitch");
  const pinRow = document.getElementById("lsPinRow");
  const isOn = sw.classList.toggle("on");
  if(pinRow){ pinRow.style.display = isOn ? "none" : "flex"; }
}

/* ── ROOM ACTIONS ── */
async function lsCreateRoom(){
  const nameInput = document.getElementById("lsNameInput");
  lsMyName = (nameInput?.value || "").trim() || ("Guest"+Math.floor(Math.random()*9000+1000));
  localStorage.setItem("ls_myName", lsMyName);
  const isPublic = document.getElementById("lsPublicSwitch")?.classList.contains("on") || false;
  const pin = isPublic ? "" : (document.getElementById("lsPinInput")?.value || "").trim();
  const pinHash = await lsHashPin(pin);

  const db = await lsInitDb(); if(!db){ showToast("Firebase not connected","error"); return; }
  const {doc,setDoc} = await lsFirestoreFns();
  const code = lsGenCode();
  await setDoc(doc(db,"liveRooms",code),{ createdAt: Date.now(), lastActivityAt: Date.now(), pin: pinHash, public: isPublic });
  lsRoomCode = code;
  lsMyPinProof = pinHash;
  await lsJoinAsParticipant();
  showToast(isPublic ? "✓ Public room created: "+code : (pin ? "✓ Room created (PIN-locked): "+code : "✓ Room created: "+code),"success");
  renderLiveSessionPanel();
  lsSubscribe();
  lsSubscribeChat();
  lsMaybeCleanupOldRooms();
}

async function lsJoinRoom(directCode){
  const input = document.getElementById("lsJoinInput");
  const code = (directCode || input?.value || "").trim().toUpperCase();
  if(!code){ showToast("Enter a room code","error"); return; }
  const nameInput = document.getElementById("lsNameInput");
  lsMyName = (nameInput?.value || "").trim() || lsMyName || ("Guest"+Math.floor(Math.random()*9000+1000));
  localStorage.setItem("ls_myName", lsMyName);
  const pinEntered = (document.getElementById("lsJoinPinInput")?.value || "").trim();
  const pinHashEntered = await lsHashPin(pinEntered);

  const db = await lsInitDb(); if(!db){ showToast("Firebase not connected","error"); return; }
  const {doc,getDoc,setDoc} = await lsFirestoreFns();
  const snap = await getDoc(doc(db,"liveRooms",code));
  if(!snap.exists()){ showToast("Room not found","error"); return; }
  const roomData = snap.data();
  if(roomData.pin && roomData.pin !== pinHashEntered){ showToast("Incorrect PIN","error"); return; }
  lsRoomCode = code;
  lsMyPinProof = roomData.pin || null;
  await lsJoinAsParticipant();
  await setDoc(doc(db,"liveRooms",code),{ lastActivityAt: Date.now() }, { merge:true });
  showToast("✓ Joined room "+code,"success");
  renderLiveSessionPanel();
  lsSubscribe();
  lsSubscribeChat();
  lsMaybeCleanupOldRooms();
}

async function lsJoinAsParticipant(){
  const db = await lsInitDb(); if(!db) return;
  const {doc,setDoc} = await lsFirestoreFns();
  await setDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId),{
    name: lsMyName, broadcasting:false, currentFile:"", code:"", updatedAt: Date.now(), joinedAt: Date.now(),
    pinProof: lsMyPinProof
  }, { merge:true });
  if(lsHeartbeatTimer) clearInterval(lsHeartbeatTimer);
  lsHeartbeatTimer = setInterval(lsHeartbeat, 8000);
}

/* keeps `updatedAt` fresh even when not broadcasting, so the presence
   list can tell "online" apart from "broadcasting" apart from "gone" */
async function lsHeartbeat(){
  if(!lsRoomCode || lsBroadcasting) return; // broadcast tick already refreshes updatedAt
  const db = await lsInitDb(); if(!db) return;
  const {doc,setDoc} = await lsFirestoreFns();
  try{ await setDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId),{ updatedAt: Date.now() }, { merge:true }); }catch{}
}

async function lsLeaveRoom(){
  if(lsBroadcasting) await lsToggleBroadcast();
  try{
    const db = await lsInitDb();
    if(db){
      const {doc,deleteDoc} = await lsFirestoreFns();
      await deleteDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId));
    }
  }catch{}
  if(lsUnsub){ lsUnsub(); lsUnsub=null; }
  if(lsChatUnsub){ lsChatUnsub(); lsChatUnsub=null; }
  if(lsStaleTimer){ clearInterval(lsStaleTimer); lsStaleTimer=null; }
  if(lsBroadcastTimer){ clearInterval(lsBroadcastTimer); lsBroadcastTimer=null; }
  if(lsHeartbeatTimer){ clearInterval(lsHeartbeatTimer); lsHeartbeatTimer=null; }
  lsRoomCode = null; lsBroadcasting = false;
  lsReplyingTo = null; lsChatMsgsById = {};
  if(lsExpanded) lsCloseFullscreen();
  renderLiveSessionPanel();
}

function lsCopyCode(){
  if(!lsRoomCode) return;
  navigator.clipboard.writeText(lsRoomCode);
  showToast("Room code copied","success");
}

/* ── PUBLIC ROOMS BROWSE LIST ──
   Single-field equality query (public==true) needs no composite index,
   so this "just works" without any manual Firestore console step.
   Recency/sorting happens client-side after the fetch. */
const LS_PUBLIC_ACTIVE_MS = 30*60*1000; // hide rooms idle 30min+ from the browse list

async function lsSubscribePublicRooms(){
  if(lsPublicUnsub){ lsPublicUnsub(); lsPublicUnsub=null; }
  const db = await lsInitDb(); if(!db) return;
  const {collection,query,where,onSnapshot} = await lsFirestoreFns();
  const q = query(collection(db,"liveRooms"), where("public","==",true));
  lsPublicUnsub = onSnapshot(q, snap => {
    const now = Date.now();
    const rooms = [];
    snap.forEach(d => rooms.push({ id:d.id, ...d.data() }));
    const active = rooms
      .filter(r => (now - (r.lastActivityAt||0)) <= LS_PUBLIC_ACTIVE_MS)
      .sort((a,b) => (b.lastActivityAt||0) - (a.lastActivityAt||0))
      .slice(0,20);
    lsRenderPublicRooms(active);
  }, () => {
    const el = document.getElementById("lsPublicList");
    if(el) el.innerHTML = `<div class="ls-empty">Couldn't load public sessions.</div>`;
  });
}

function lsRenderPublicRooms(rooms){
  const el = document.getElementById("lsPublicList");
  if(!el) return;
  if(!rooms.length){ el.innerHTML = `<div class="ls-empty">No public sessions active right now.</div>`; return; }
  const now = Date.now();
  el.innerHTML = rooms.map(r => {
    const mins = Math.max(0, Math.round((now-(r.lastActivityAt||now))/60000));
    return `<div class="ls-public-item">
      <div>
        <span class="ls-public-code">${r.id}</span>
        <span class="ls-public-age">active ${mins<1?'just now':mins+'m ago'}</span>
      </div>
      <button class="ls-btn secondary" onclick="lsJoinRoom('${r.id}')">Join</button>
    </div>`;
  }).join("");
}

/* ── BROADCASTING ── */
async function lsToggleBroadcast(){
  lsBroadcasting = !lsBroadcasting;
  const sw = document.getElementById("lsSwitch");
  if(sw) sw.classList.toggle("on", lsBroadcasting);
  const statusEl = document.getElementById("ls-panel-body")?.querySelector(".ls-room-status");
  if(statusEl) statusEl.innerHTML = lsBroadcasting ? '<span class="ls-live-dot"></span>You\'re broadcasting' : 'In session — not broadcasting';

  const db = await lsInitDb(); if(!db) return;
  const {doc,setDoc} = await lsFirestoreFns();

  if(lsBroadcasting){
    lsPushMyEditor();
    lsBroadcastTimer = setInterval(lsPushMyEditor, 1500);
  } else {
    if(lsBroadcastTimer){ clearInterval(lsBroadcastTimer); lsBroadcastTimer=null; }
    await setDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId),{ broadcasting:false, updatedAt:Date.now() }, { merge:true });
  }
}

async function lsPushMyEditor(){
  if(!lsRoomCode || !lsBroadcasting) return;
  const db = await lsInitDb(); if(!db) return;
  const {doc,setDoc} = await lsFirestoreFns();
  const cf = typeof currentFile !== "undefined" ? currentFile : "";
  const src = (typeof files !== "undefined" && files && files[cf] !== undefined) ? files[cf] : "";
  let cursorLine = null;
  try{ cursorLine = window.editor1?.getPosition?.()?.lineNumber ?? null; }catch{}
  try{
    await setDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId),{
      name: lsMyName, broadcasting:true, currentFile: cf, code: src, cursorLine, updatedAt: Date.now()
    }, { merge:true });
    await setDoc(doc(db,"liveRooms",lsRoomCode),{ lastActivityAt: Date.now() }, { merge:true });
  }catch{}
}

/* ── LIVE VIEW OF OTHERS (+ SELF) ── */
async function lsSubscribe(){
  if(lsUnsub){ lsUnsub(); lsUnsub=null; }
  const db = await lsInitDb(); if(!db) return;
  const {collection,onSnapshot} = await lsFirestoreFns();
  lsUnsub = onSnapshot(collection(db,"liveRooms",lsRoomCode,"participants"), snap => {
    const list = [];
    snap.forEach(d => list.push({ id:d.id, ...d.data() }));
    lsLastList = list;
    lsRenderParticipants(list);
    lsRenderPresence(list);
  });
  if(lsStaleTimer) clearInterval(lsStaleTimer);
  // re-render on a timer too (not just on new data) so a frozen/disconnected
  // broadcaster's card visibly goes stale even though no new snapshot arrives
  lsStaleTimer = setInterval(()=>{ lsRenderParticipants(lsLastList); lsRenderPresence(lsLastList); }, 2000);
}

/* everyone currently in the room, online/broadcasting/away, not just broadcasters */
function lsRenderPresence(list){
  const el = document.getElementById("lsPresenceList");
  const countEl = document.getElementById("lsPeopleCount");
  if(countEl) countEl.textContent = Math.max(1, list.length);
  if(!el) return;
  const now = Date.now();
  if(!list.length){ el.innerHTML = `<div class="ls-empty">Just you so far</div>`; return; }
  el.innerHTML = list.map(p => {
    const age = now - (p.updatedAt||0);
    const status = p.broadcasting && age <= LS_STALE_MS ? "broadcasting" : age <= LS_STALE_MS*2 ? "online" : "away";
    return `<div class="ls-presence-item">
      <span class="ls-presence-dot ls-presence-${status}"></span>
      ${p.id===lsMyId ? '<span class="ls-you">You</span>' : lsEsc(p.name||"Someone")}
      <span class="ls-presence-status">${status}</span>
    </div>`;
  }).join("");
}

function lsEsc(s){ return (s||"").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

/* Syntax-highlight using Monaco's own colorizer (already loaded for the
   main editor, so this stays visually consistent with it and needs no
   extra library). Falls back to plain escaped text if Monaco isn't ready. */
async function lsHighlight(code, filename, cursorLine){
  if(!code) return "";
  const lang = (typeof getLang === "function") ? getLang(filename||"") : "plaintext";
  if(window.monaco?.editor?.colorize){
    try{
      let html = await monaco.editor.colorize(code, lang, { tabSize:2 });
      if(cursorLine){
        const lines = html.split(/<br\s*\/?>/i);
        const idx = cursorLine - 1;
        if(lines[idx] !== undefined){
          lines[idx] = `<span class="ls-cursor-line">${lines[idx]}<span class="ls-caret"></span></span>`;
        }
        html = lines.join("<br/>");
      }
      return html;
    }catch{ /* fall through to plain escape */ }
  }
  return lsEsc(code);
}

async function lsRenderParticipants(list){
  const el = document.getElementById("lsParticipants");
  const countEl = document.getElementById("lsLiveCount");
  const now0 = Date.now();
  const liveCount = list.filter(p => p.broadcasting && p.code && (now0-(p.updatedAt||0))<=LS_STALE_MS).length;
  if(countEl) countEl.textContent = liveCount;
  if(!el) return;
  const now = Date.now();
  const live = list.filter(p => p.broadcasting && p.code);
  if(!live.length){
    el.innerHTML = `<div class="ls-empty">No one is broadcasting yet. Flip the switch above to show your editor.</div>`;
    return;
  }
  const cards = await Promise.all(live.map(async p => {
    const stale = (now - (p.updatedAt||0)) > LS_STALE_MS;
    const html = await lsHighlight(p.code, p.currentFile, p.cursorLine);
    return `
    <div class="ls-participant live${stale?' stale':''}">
      <div class="ls-participant-head">
        <span>${p.id===lsMyId ? '<span class="ls-you">You</span>' : `<span class="ls-live-dot"></span>${lsEsc(p.name||"Someone")}`}
          ${stale?'<span class="ls-stale-badge">connection lost</span>':''}</span>
        <span class="ls-participant-file">${lsEsc(p.currentFile||"")}${p.cursorLine?` · Ln ${p.cursorLine}`:''}</span>
      </div>
      <pre class="ls-participant-code">${html}</pre>
    </div>`;
  }));
  el.innerHTML = cards.join("");
}

/* ── CHAT ── */
let lsChatUnsub = null;
let lsChatMsgsById = {};
let lsReplyingTo = null;

async function lsSubscribeChat(){
  if(lsChatUnsub){ lsChatUnsub(); lsChatUnsub=null; }
  const db = await lsInitDb(); if(!db) return;
  const {collection,query,orderBy,limit,onSnapshot} = await lsFirestoreFns();
  // order by clientTs (always present the instant a message is sent, even
  // before the server has synced it) so optimistic local messages show up
  // immediately in roughly the right place; final ordering below then uses
  // the authoritative server timestamp once available, which fixes any
  // misordering caused by two devices' clocks disagreeing
  const q = query(collection(db,"liveRooms",lsRoomCode,"messages"), orderBy("clientTs","asc"), limit(100));
  lsChatUnsub = onSnapshot(q, snap => {
    const msgs = [];
    snap.forEach(d => msgs.push({ id:d.id, ...d.data() }));
    msgs.sort((a,b) => {
      const ka = (a.createdAt && typeof a.createdAt.toMillis==="function") ? a.createdAt.toMillis() : (a.clientTs||0);
      const kb = (b.createdAt && typeof b.createdAt.toMillis==="function") ? b.createdAt.toMillis() : (b.clientTs||0);
      return ka - kb;
    });
    lsChatMsgsById = {};
    msgs.forEach(m => lsChatMsgsById[m.id] = m);
    lsRenderChat(msgs);
  });
}

function lsFormatTime(m){
  const ts = (m.createdAt && typeof m.createdAt.toMillis==="function") ? m.createdAt.toMillis() : m.clientTs;
  if(!ts) return "";
  const d = new Date(ts);
  const h = d.getHours(), min = d.getMinutes();
  const h12 = h%12===0 ? 12 : h%12;
  return `${h12}:${String(min).padStart(2,"0")} ${h<12?'AM':'PM'}`;
}

const LS_AVATAR_COLORS = ["#e57373","#ba68c8","#64b5f6","#4db6ac","#f06292","#ffb74d","#81c784","#7986cb"];
function lsAvatarColor(id){
  let h=0; for(const c of (id||"")) h = (h*31 + c.charCodeAt(0)) >>> 0;
  return LS_AVATAR_COLORS[h % LS_AVATAR_COLORS.length];
}
function lsInitial(name){ return (name||"?").trim().charAt(0).toUpperCase() || "?"; }

function lsRenderChat(msgs){
  const log = document.getElementById("lsChatLog");
  if(!log) return;
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  log.innerHTML = msgs.map((m,i) => {
    const mine = m.senderId===lsMyId;
    const prev = msgs[i-1];
    const grouped = prev && prev.senderId===m.senderId && !m.replyTo;
    const replyBlock = m.replyTo ? `
      <div class="ls-chat-reply" onclick="lsScrollToMsg('${m.replyTo.id}')">
        <span class="ls-chat-reply-name">${lsEsc(m.replyTo.name||"Someone")}</span>
        <span class="ls-chat-reply-text">${lsEsc(m.replyTo.text||"")}</span>
      </div>` : '';
    const avatar = !mine ? `<span class="ls-chat-avatar" style="background:${lsAvatarColor(m.senderId)}">${lsInitial(m.name)}</span>` : '';
    return `
    <div class="ls-chat-msg${mine?' mine':''}${grouped?' grouped':''}" data-msg-id="${m.id}">
      ${avatar}
      <button class="ls-chat-reply-btn" onclick="lsStartReply('${m.id}')" title="Reply">↩</button>
      ${(!mine && !grouped) ? `<span class="ls-chat-name">${lsEsc(m.name||"Someone")}</span>` : ''}
      ${replyBlock}
      <span class="ls-chat-text">${lsEsc(m.text||"")}<span class="ls-chat-time">${lsFormatTime(m)}</span></span>
    </div>`;
  }).join("");
  if(nearBottom) log.scrollTop = log.scrollHeight;
}

function lsScrollToMsg(id){
  const el = document.querySelector(`.ls-chat-msg[data-msg-id="${id}"]`);
  if(!el) return;
  el.scrollIntoView({ behavior:"smooth", block:"center" });
  el.classList.add("flash");
  setTimeout(()=>el.classList.remove("flash"), 1200);
}

function lsStartReply(id){
  const m = lsChatMsgsById[id]; if(!m) return;
  lsReplyingTo = { id, name: m.senderId===lsMyId ? "You" : (m.name||"Someone"), text: (m.text||"").slice(0,80) };
  lsRenderReplyBar();
  document.getElementById("lsChatInput")?.focus();
}

function lsCancelReply(){
  lsReplyingTo = null;
  lsRenderReplyBar();
}

function lsRenderReplyBar(){
  const bar = document.getElementById("lsReplyBar");
  if(!bar) return;
  if(!lsReplyingTo){ bar.style.display="none"; bar.innerHTML=""; return; }
  bar.style.display="flex";
  bar.innerHTML = `
    <div class="ls-reply-bar-text">
      <span class="ls-chat-reply-name">Replying to ${lsEsc(lsReplyingTo.name)}</span>
      <span class="ls-chat-reply-text">${lsEsc(lsReplyingTo.text)}</span>
    </div>
    <button class="ls-reply-bar-cancel" onclick="lsCancelReply()">✕</button>`;
}

async function lsSendChat(){
  const input = document.getElementById("lsChatInput");
  const text = (input?.value || "").trim();
  if(!text || !lsRoomCode) return;
  const db = await lsInitDb(); if(!db) return;
  const {collection,addDoc,doc,setDoc,serverTimestamp} = await lsFirestoreFns();
  input.value = "";
  const replyTo = lsReplyingTo ? { ...lsReplyingTo } : null;
  lsReplyingTo = null; lsRenderReplyBar();
  try{
    await addDoc(collection(db,"liveRooms",lsRoomCode,"messages"),{
      senderId: lsMyId, name: lsMyName, text,
      createdAt: serverTimestamp(), clientTs: Date.now(),
      replyTo
    });
    await setDoc(doc(db,"liveRooms",lsRoomCode),{ lastActivityAt: Date.now() }, { merge:true });
  }catch{ showToast("Message failed to send","error"); }
}

/* ── LAZY CLEANUP OF DEAD ROOMS ──
   No cron/scheduler on the backend, so instead: every time someone opens
   a room, there's a small chance we sweep a few rooms that have had no
   activity in 24h+ and delete them (plus their participant docs). Rooms
   with only a handful of docs, so this stays cheap. Not exhaustive, but
   keeps Firestore from accumulating dead rooms forever. */
async function lsMaybeCleanupOldRooms(){
  if(Math.random() > 0.15) return; // ~15% of room-joins trigger a sweep
  try{
    const db = await lsInitDb(); if(!db) return;
    const {collection,query,where,limit,getDocs,collectionGroup,deleteDoc,doc} = await lsFirestoreFns();
    const cutoff = Date.now() - 24*60*60*1000;
    const q = query(collection(db,"liveRooms"), where("lastActivityAt","<",cutoff), limit(10));
    const snap = await getDocs(q);
    for(const roomDoc of snap.docs){
      try{
        const participants = await getDocs(collection(db,"liveRooms",roomDoc.id,"participants"));
        for(const p of participants.docs) await deleteDoc(p.ref);
        const msgs = await getDocs(collection(db,"liveRooms",roomDoc.id,"messages"));
        for(const m of msgs.docs) await deleteDoc(m.ref);
        await deleteDoc(roomDoc.ref);
      }catch{}
    }
  }catch{ /* missing index or offline — skip silently, not user-facing */ }
}
