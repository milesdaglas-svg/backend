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
let lsDb            = null;
let lsFns           = null; // cached firestore fn refs

if(!lsMyId){
  lsMyId = "p_"+Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  localStorage.setItem("ls_myId", lsMyId);
}

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

/* ── RENDER ENTRY (called by activitySwitch) ── */
function renderLiveSessionPanel(){
  const body = lsPanelBody(); if(!body) return;
  if(!lsRoomCode){
    body.innerHTML = `
      <div class="ls-box">
        <div class="ls-hint" style="margin:0 0 10px;">Create a room and share the code, or join one someone gave you. Whoever flips "Broadcast" on, everyone in the room watches their editor live.</div>
        <div class="ls-row" style="margin-bottom:10px;">
          <input type="text" id="lsNameInput" placeholder="Your name" value="${lsMyName ? lsMyName.replace(/"/g,'&quot;') : ''}">
        </div>
        <button class="ls-btn" style="width:100%;margin-bottom:10px;" onclick="lsCreateRoom()">➕ Create Room</button>
        <div class="ls-row">
          <input type="text" id="lsJoinInput" placeholder="Enter room code" maxlength="6" style="text-transform:uppercase;">
          <button class="ls-btn secondary" onclick="lsJoinRoom()">Join</button>
        </div>
      </div>`;
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
    <div class="ls-participants" id="lsParticipants">
      <div class="ls-empty">Waiting for updates…</div>
    </div>`;
  document.getElementById("lsRoomCode")?.addEventListener?.(()=>{});
  document.getElementById("lsCode")?.addEventListener?.(()=>{});
  const codeEl = body.querySelector(".ls-code");
  if(codeEl) codeEl.onclick = lsCopyCode;
}

/* ── ROOM ACTIONS ── */
async function lsCreateRoom(){
  const nameInput = document.getElementById("lsNameInput");
  lsMyName = (nameInput?.value || "").trim() || ("Guest"+Math.floor(Math.random()*9000+1000));
  localStorage.setItem("ls_myName", lsMyName);

  const db = await lsInitDb(); if(!db){ showToast("Firebase not connected","error"); return; }
  const {doc,setDoc} = await lsFirestoreFns();
  const code = lsGenCode();
  await setDoc(doc(db,"liveRooms",code),{ createdAt: Date.now() });
  lsRoomCode = code;
  await lsJoinAsParticipant();
  showToast("✓ Room created: "+code,"success");
  renderLiveSessionPanel();
  lsSubscribe();
}

async function lsJoinRoom(){
  const input = document.getElementById("lsJoinInput");
  const code = (input?.value || "").trim().toUpperCase();
  if(!code){ showToast("Enter a room code","error"); return; }
  const nameInput = document.getElementById("lsNameInput");
  lsMyName = (nameInput?.value || "").trim() || lsMyName || ("Guest"+Math.floor(Math.random()*9000+1000));
  localStorage.setItem("ls_myName", lsMyName);

  const db = await lsInitDb(); if(!db){ showToast("Firebase not connected","error"); return; }
  const {doc,getDoc} = await lsFirestoreFns();
  const snap = await getDoc(doc(db,"liveRooms",code));
  if(!snap.exists()){ showToast("Room not found","error"); return; }
  lsRoomCode = code;
  await lsJoinAsParticipant();
  showToast("✓ Joined room "+code,"success");
  renderLiveSessionPanel();
  lsSubscribe();
}

async function lsJoinAsParticipant(){
  const db = await lsInitDb(); if(!db) return;
  const {doc,setDoc} = await lsFirestoreFns();
  await setDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId),{
    name: lsMyName, broadcasting:false, currentFile:"", code:"", updatedAt: Date.now()
  }, { merge:true });
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
  if(lsBroadcastTimer){ clearInterval(lsBroadcastTimer); lsBroadcastTimer=null; }
  lsRoomCode = null; lsBroadcasting = false;
  renderLiveSessionPanel();
}

function lsCopyCode(){
  if(!lsRoomCode) return;
  navigator.clipboard.writeText(lsRoomCode);
  showToast("Room code copied","success");
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
  try{
    await setDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId),{
      name: lsMyName, broadcasting:true, currentFile: cf, code: src, updatedAt: Date.now()
    }, { merge:true });
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
    lsRenderParticipants(list);
  });
}

function lsEsc(s){ return (s||"").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

function lsRenderParticipants(list){
  const el = document.getElementById("lsParticipants");
  if(!el) return;
  const live = list.filter(p => p.broadcasting && p.code);
  if(!live.length){
    el.innerHTML = `<div class="ls-empty">No one is broadcasting yet. Flip the switch above to show your editor.</div>`;
    return;
  }
  el.innerHTML = live.map(p => `
    <div class="ls-participant live">
      <div class="ls-participant-head">
        <span>${p.id===lsMyId ? '<span class="ls-you">You</span>' : `<span class="ls-live-dot"></span>${lsEsc(p.name||"Someone")}`}</span>
        <span class="ls-participant-file">${lsEsc(p.currentFile||"")}</span>
      </div>
      <pre class="ls-participant-code">${lsEsc(p.code||"")}</pre>
    </div>`).join("");
}
