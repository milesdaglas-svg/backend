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
      <div class="ls-box">
        <div class="ls-hint" style="margin:0 0 10px;">Create a room and share the code, or join one someone gave you. Whoever flips "Broadcast" on, everyone in the room watches their editor live.</div>
        <div class="ls-row" style="margin-bottom:8px;">
          <input type="text" id="lsNameInput" placeholder="Your name" value="${lsMyName ? lsMyName.replace(/"/g,'&quot;') : ''}">
        </div>
        <div class="ls-toggle-row" style="margin-bottom:8px;">
          <span>🌐 Make room public (anyone can join, no PIN)</span>
          <div class="ls-switch" id="lsPublicSwitch" onclick="lsTogglePublicSwitch()"></div>
        </div>
        <div class="ls-row" style="margin-bottom:10px;" id="lsPinRow">
          <input type="text" id="lsPinInput" placeholder="Optional PIN to lock room" maxlength="8">
        </div>
        <button class="ls-btn" style="width:100%;margin-bottom:14px;" onclick="lsCreateRoom()">➕ Create Room</button>
        <div class="ls-row" style="margin-bottom:8px;">
          <input type="text" id="lsJoinInput" placeholder="Enter room code" maxlength="6" style="text-transform:uppercase;">
          <button class="ls-btn secondary" onclick="lsJoinRoom()">Join</button>
        </div>
        <div class="ls-row">
          <input type="text" id="lsJoinPinInput" placeholder="PIN (if room has one)" maxlength="8">
        </div>
      </div>
      <div class="ls-box">
        <div class="ls-presence-title">🌐 Public sessions right now</div>
        <div class="ls-public-list" id="lsPublicList"><div class="ls-empty">Loading…</div></div>
      </div>`;
    lsSubscribePublicRooms();
    return;
  }

  body.innerHTML = `
    <div class="ls-box">
      <div class="ls-code">${lsRoomCode}</div>
      <div class="ls-hint" style="text-align:center;margin-top:0;">Share this code — tap to copy</div>
      <div class="ls-row" style="margin-top:10px;">
        <button class="ls-btn secondary" style="flex:1;" onclick="lsCopyCode()">📋 Copy Code</button>
        <button class="ls-btn danger" style="flex:1;" onclick="lsLeaveRoom()">🚪 Leave</button>
      </div>
    </div>
    <div class="ls-box">
      <div class="ls-toggle-row">
        <span>📡 Broadcast my editor</span>
        <div class="ls-switch ${lsBroadcasting?'on':''}" id="lsSwitch" onclick="lsToggleBroadcast()"></div>
      </div>
      <div class="ls-hint">When on, everyone in this room sees your current file live.</div>
    </div>
    <div class="ls-box">
      <div class="ls-presence-title">In this room</div>
      <div class="ls-presence-list" id="lsPresenceList"><div class="ls-empty">Loading…</div></div>
    </div>
    <div class="ls-participants" id="lsParticipants">
      <div class="ls-empty">Waiting for updates…</div>
    </div>
    <div class="ls-box ls-chat-box">
      <div class="ls-presence-title">💬 Chat</div>
      <div class="ls-chat-log" id="lsChatLog"></div>
      <div class="ls-row" style="margin-top:8px;">
        <input type="text" id="lsChatInput" placeholder="Message the room…" onkeydown="if(event.key==='Enter')lsSendChat()">
        <button class="ls-btn secondary" onclick="lsSendChat()">Send</button>
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

async function lsSubscribeChat(){
  if(lsChatUnsub){ lsChatUnsub(); lsChatUnsub=null; }
  const db = await lsInitDb(); if(!db) return;
  const {collection,query,orderBy,limit,onSnapshot} = await lsFirestoreFns();
  const q = query(collection(db,"liveRooms",lsRoomCode,"messages"), orderBy("createdAt","asc"), limit(100));
  lsChatUnsub = onSnapshot(q, snap => {
    const msgs = [];
    snap.forEach(d => msgs.push(d.data()));
    lsRenderChat(msgs);
  });
}

function lsRenderChat(msgs){
  const log = document.getElementById("lsChatLog");
  if(!log) return;
  const nearBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 60;
  log.innerHTML = msgs.map(m => `
    <div class="ls-chat-msg${m.senderId===lsMyId?' mine':''}">
      <span class="ls-chat-name">${m.senderId===lsMyId?'You':lsEsc(m.name||"Someone")}</span>
      <span class="ls-chat-text">${lsEsc(m.text||"")}</span>
    </div>`).join("");
  if(nearBottom) log.scrollTop = log.scrollHeight;
}

async function lsSendChat(){
  const input = document.getElementById("lsChatInput");
  const text = (input?.value || "").trim();
  if(!text || !lsRoomCode) return;
  const db = await lsInitDb(); if(!db) return;
  const {collection,addDoc,doc,setDoc} = await lsFirestoreFns();
  input.value = "";
  try{
    await addDoc(collection(db,"liveRooms",lsRoomCode,"messages"),{
      senderId: lsMyId, name: lsMyName, text, createdAt: Date.now()
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
