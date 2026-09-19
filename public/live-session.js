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
let lsMyAvatar       = localStorage.getItem("ls_myAvatar") || null; // small base64 data URL, or null -> falls back to initial circle
let lsBroadcasting  = false;
let lsUnsub         = null;
let lsBroadcastTimer= null;
let lsStaleTimer    = null;
let lsHeartbeatTimer= null;
let lsLastList      = [];
let lsMyPinProof    = null;
let lsPublicUnsub   = null;
let lsExpanded       = false;
let lsRoomPermanent  = false;
let lsRoomName       = "";
let lsRoomIcon       = "";
let lsPickedRoomIcon = "";
let lsCoEditing      = false;
let lsCoEditFile      = null;
let lsCoEditUnsub     = null;
let lsCoEditPushTimer = null;
let lsCoEditApplyingRemote = false;
let lsCoEditLastAppliedAt  = 0;
let lsUnreadCount    = 0;
let lsTalliedMsgIds  = new Set();
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

/* ── UNREAD MESSAGE BADGE ──
   Lets someone deep in the code editor tell, at a glance, that people are
   chatting in Live Session without needing to switch over and check. */
function lsSetVisible(visible){
  if(visible){
    lsUnreadCount = 0;
    Object.keys(lsChatMsgsById).forEach(id => lsTalliedMsgIds.add(id));
    lsUpdateUnreadBadge();
  }
}

function lsUpdateUnreadBadge(){
  const badge = document.getElementById("ls-activity-badge");
  if(!badge) return;
  if(lsUnreadCount > 0){
    badge.textContent = lsUnreadCount > 9 ? "9+" : String(lsUnreadCount);
    badge.style.display = "flex";
  } else {
    badge.style.display = "none";
  }
}

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
      <span>${lsRoomIcon?lsEsc(lsRoomIcon)+' ':'👥 '}${lsRoomName?lsEsc(lsRoomName):'Live Session'}${lsRoomCode?' — Room <span class="ls-fs-code">'+lsRoomCode+'</span>':''}</span>
      <button class="ls-btn secondary" onclick="lsExitFullscreenToEditor()">✕ Exit Fullscreen</button>
    </div>
    <div class="ls-fullscreen-content" id="lsFullscreenContent"></div>`;
  document.body.appendChild(overlay);
  document.getElementById("lsFullscreenContent").appendChild(panelBody);
  panelBody.classList.add("ls-body-fullscreen");
  lsExpanded = true;
}

/* the exit button backs out to the normal editor view entirely — Live
   Session no longer has a narrow sidebar form to fall back into, it's
   fullscreen-or-closed */
function lsExitFullscreenToEditor(){
  lsCloseFullscreen();
  if(typeof activitySwitch==="function") activitySwitch("explorer");
}

function lsCloseFullscreen(){
  const panelBody = document.getElementById("ls-panel-body");
  const homeSlot = document.querySelector('.sidebar-panel[data-panel="live-session"]');
  if(panelBody && homeSlot){
    panelBody.classList.remove("ls-body-fullscreen");
    homeSlot.appendChild(panelBody); // parked here, hidden — this tab has no non-fullscreen view anymore
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
  lsSetVisible(true);
  if(lsPublicUnsub){ lsPublicUnsub(); lsPublicUnsub=null; }
  if(!lsRoomCode){
    body.innerHTML = `
      <div class="ls-intro">
        <div class="ls-intro-title">👥 Live Session</div>
        <div class="ls-intro-sub">Watch each other code in real time — for pairing, teaching, or reviewing together. Anyone in a room can flip broadcast on to show their editor; everyone else watches live.</div>
      </div>

      <div class="ls-box">
        <div class="ls-section-title">👤 Your profile</div>
        <div class="ls-section-sub">Everyone sees this — set it once, works whether you create a room or join one below.</div>
        <div class="ls-row" style="margin:10px 0 2px;align-items:center;">
          <div class="ls-my-avatar-picker" onclick="lsPickAvatar()" title="Click to change your picture">
            ${lsMyAvatar ? `<img src="${lsMyAvatar}">` : `<span>${lsInitial(lsMyName)}</span>`}
            <span class="ls-my-avatar-edit">📷</span>
          </div>
          <input type="text" id="lsNameInput" placeholder="Your name" value="${lsMyName ? lsMyName.replace(/"/g,'&quot;') : ''}">
        </div>
        <div class="ls-hint" style="text-align:left;margin-top:0;">Tap the circle to add a photo</div>
        <input type="file" id="lsAvatarFileInput" accept="image/*" style="display:none;" onchange="lsHandleAvatarFile(this.files[0])">
      </div>

      <div class="ls-box">
        <div class="ls-section-title"><span class="ls-step">1</span> Start a new session</div>
        <div class="ls-section-sub">You'll get a 6-character code to share.</div>
        <div class="ls-row" style="margin-bottom:8px;align-items:center;">
          <div class="ls-room-icon-picker" onclick="document.getElementById('lsRoomIconPop').classList.toggle('open')" title="Pick a server icon">
            <span>${lsPickedRoomIcon||'👥'}</span>
          </div>
          <input type="text" id="lsRoomNameInput" placeholder="Server name (optional)" style="font-family:inherit;letter-spacing:normal;" maxlength="40">
        </div>
        <div class="ls-room-icon-pop" id="lsRoomIconPop">
          ${["👥","🚀","💻","🎮","📚","🔥","⭐","🎨","🐛","🧪","🎯","☕"].map(e=>`<span onclick="lsPickRoomIcon('${e}')">${e}</span>`).join("")}
        </div>
        <div class="ls-setting-row" style="margin-bottom:8px;">
          <div class="ls-setting-icon" style="background:#5865F2;">🌐</div>
          <div class="ls-setting-text">
            <div class="ls-setting-title">Public</div>
            <div class="ls-setting-sub">Anyone can find &amp; join, no PIN</div>
          </div>
          <div class="ls-switch" id="lsPublicSwitch" onclick="lsTogglePublicSwitch()"></div>
        </div>
        <div class="ls-row" style="margin-bottom:10px;" id="lsPinRow">
          <input type="text" id="lsPinInput" placeholder="Optional PIN to lock room" maxlength="8">
        </div>
        <div class="ls-setting-row" style="margin-bottom:10px;">
          <div class="ls-setting-icon" style="background:#e3b341;">📌</div>
          <div class="ls-setting-text">
            <div class="ls-setting-title">Permanent</div>
            <div class="ls-setting-sub">Room stays open when empty, never auto-expires</div>
          </div>
          <div class="ls-switch" id="lsPermanentSwitch" onclick="document.getElementById('lsPermanentSwitch').classList.toggle('on')"></div>
        </div>
        <button class="ls-btn" style="width:100%;" onclick="lsCreateRoom()">➕ Create Room</button>
      </div>

      <div class="ls-divider">or</div>

      <div class="ls-box">
        <div class="ls-section-title"><span class="ls-step">2</span> Join with a code</div>
        <div class="ls-section-sub">Got a code from someone? Enter it here — joins using the name/photo you set above.</div>
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
    body.classList.remove("ls-in-room");
    lsSubscribePublicRooms();
    return;
  }

  body.classList.add("ls-in-room");

  body.innerHTML = `
    <div class="ls-sidebar-col">
      <div class="ls-box ls-room-card ls-room-info-box">
        <div class="ls-status-chips">${lsStatusChipsHtml()}</div>
        ${(lsRoomName||lsRoomIcon) ? `<div class="ls-room-title">${lsRoomIcon?lsEsc(lsRoomIcon)+' ':''}${lsEsc(lsRoomName||'Untitled server')}</div>` : ''}
        <div class="ls-code">${lsRoomCode}</div>
        <div class="ls-hint" style="text-align:center;margin-top:0;">Share this code — tap to copy</div>
        <div class="ls-row" style="margin-top:10px;">
          <button class="ls-btn secondary" style="flex:1;" onclick="lsCopyCode()">📋 Copy Code</button>
          <button class="ls-btn danger" style="flex:1;" onclick="lsLeaveRoom()">🚪 Leave</button>
        </div>
      </div>

      <div class="ls-box ls-room-info-box">
        <div class="ls-section-title">👥 People <span class="ls-count-badge" id="lsPeopleCount">1</span></div>
        <div class="ls-presence-list" id="lsPresenceList" style="margin-top:8px;"><div class="ls-empty">Loading…</div></div>
      </div>

      <div class="ls-box ls-live-editors-box">
        <div class="ls-section-title">🖥️ Live editors <span class="ls-count-badge" id="lsLiveCount">0</span></div>
        <div class="ls-section-sub">Anyone with broadcast on shows up here, live.</div>
        <div class="ls-participants" id="lsParticipants" style="margin-top:8px;">
          <div class="ls-empty">Waiting for updates…</div>
        </div>
      </div>

      <div class="ls-box ls-room-info-box">
        <div class="ls-section-title">📡 Your broadcast</div>
        <div class="ls-setting-row" style="margin-top:8px;">
          <div class="ls-setting-icon" style="background:${lsBroadcasting?'#ED4245':'#3a3d41'};">${lsBroadcasting?'🔴':'📡'}</div>
          <div class="ls-setting-text">
            <div class="ls-setting-title">Show my editor</div>
            <div class="ls-setting-sub">Everyone here sees your current file live, including your cursor</div>
          </div>
          <div class="ls-switch ${lsBroadcasting?'on':''}" id="lsSwitch" onclick="lsToggleBroadcast()"></div>
        </div>
      </div>

      <div class="ls-box ls-room-info-box">
        <div class="ls-section-title">🖊️ Co-Edit</div>
        <div class="ls-setting-sub" style="margin-bottom:2px;">Easiest way in: tap "✏️ Edit this with [name]" on someone who's broadcasting up in Live editors — it opens their file and turns this on for you both automatically.</div>
        <div class="ls-setting-row" style="margin-top:8px;">
          <div class="ls-setting-icon" style="background:${lsCoEditing?'#5865F2':'#3a3d41'};">${lsCoEditing?'✍️':'🖊️'}</div>
          <div class="ls-setting-text">
            <div class="ls-setting-title">Edit together — ${lsEsc(currentFile||"no file open")}</div>
            <div class="ls-setting-sub">${lsCoEditing?'Live: your edits sync with anyone else co-editing this exact file':'Or turn this on manually — then anyone else with it on for the same open file edits it with you live'}</div>
          </div>
          <div class="ls-switch ${lsCoEditing?'on':''}" id="lsCoEditSwitch" onclick="lsToggleCoEdit()"></div>
        </div>
      </div>

      <div class="ls-box ls-room-info-box">
        <div class="ls-section-title">⚙️ Server Profile</div>
        <div class="ls-setting-sub" style="margin-bottom:8px;">Name and icon for this room — different for every server, seen by everyone here</div>
        <div class="ls-row" style="align-items:center;">
          <div class="ls-room-icon-picker" onclick="document.getElementById('lsRoomIconPopLive').classList.toggle('open')" title="Change server icon">
            <span>${lsRoomIcon||'👥'}</span>
          </div>
          <input type="text" id="lsRoomNameEditInput" placeholder="Server name" value="${lsEsc(lsRoomName)}" style="font-family:inherit;letter-spacing:normal;" maxlength="40">
          <button class="ls-btn secondary" onclick="lsSaveRoomProfile()">Save</button>
        </div>
        <div class="ls-room-icon-pop" id="lsRoomIconPopLive">
          ${["👥","🚀","💻","🎮","📚","🔥","⭐","🎨","🐛","🧪","🎯","☕"].map(e=>`<span onclick="lsPickRoomIconLive('${e}')">${e}</span>`).join("")}
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

  // this rebuild just wiped #lsChatLog etc back to empty placeholders —
  // repopulate immediately from what we already know instead of waiting
  // for the next Firestore event (which might not come until someone
  // sends a new message)
  const cachedMsgs = Object.values(lsChatMsgsById);
  if(cachedMsgs.length) lsRenderChat(lsSortMsgs(cachedMsgs));
  lsRenderPresence(lsLastList);
  lsRenderParticipants(lsLastList);
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
  const isPermanent = document.getElementById("lsPermanentSwitch")?.classList.contains("on") || false;
  const pin = isPublic ? "" : (document.getElementById("lsPinInput")?.value || "").trim();
  const pinHash = await lsHashPin(pin);
  const roomName = (document.getElementById("lsRoomNameInput")?.value || "").trim().slice(0,40);
  const roomIcon = (lsPickedRoomIcon || "").trim().slice(0,8);

  const db = await lsInitDb(); if(!db){ showToast("Firebase not connected","error"); return; }
  const {doc,setDoc} = await lsFirestoreFns();
  const code = lsGenCode();
  const roomDoc = { createdAt: Date.now(), lastActivityAt: Date.now(), pin: pinHash, public: isPublic, permanent: isPermanent };
  if(roomName) roomDoc.roomName = roomName;
  if(roomIcon) roomDoc.roomIcon = roomIcon;
  await setDoc(doc(db,"liveRooms",code), roomDoc);
  lsRoomCode = code;
  lsMyPinProof = pinHash;
  lsRoomPermanent = isPermanent;
  lsRoomName = roomName;
  lsRoomIcon = roomIcon;
  await lsJoinAsParticipant();
  showToast((isPermanent ? "📌 Permanent room created: " : (isPublic ? "✓ Public room created: " : (pin ? "✓ Room created (PIN-locked): " : "✓ Room created: ")))+code,"success");
  renderLiveSessionPanel();
  lsSubscribe();
  lsSubscribeChat();
  lsSubscribeIncomingCalls();
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
  lsRoomPermanent = roomData.permanent === true;
  lsRoomName = roomData.roomName || "";
  lsRoomIcon = roomData.roomIcon || "";
  await lsJoinAsParticipant();
  await setDoc(doc(db,"liveRooms",code),{ lastActivityAt: Date.now() }, { merge:true });
  showToast("✓ Joined room "+code,"success");
  renderLiveSessionPanel();
  lsSubscribe();
  lsSubscribeChat();
  lsSubscribeIncomingCalls();
  lsMaybeCleanupOldRooms();
}

/* ── PROFILE PICTURE (small, resized client-side, stored inline in the
   participant doc — same reasoning as the app-intro image fix earlier:
   keep payloads tiny so it's reliable, no separate image-hosting infra
   needed for something this small) ── */
function lsPickAvatar(){ document.getElementById("lsAvatarFileInput")?.click(); }

function lsHandleAvatarFile(file){
  if(!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      const size = 96;
      const canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext("2d");
      // cover-crop to a square so odd-aspect photos don't look squished
      const scale = Math.max(size/img.width, size/img.height);
      const w = img.width*scale, h = img.height*scale;
      ctx.drawImage(img, (size-w)/2, (size-h)/2, w, h);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
      lsMyAvatar = dataUrl;
      try{ localStorage.setItem("ls_myAvatar", dataUrl); }catch{}
      renderLiveSessionPanel();
      if(lsRoomCode) lsPushAvatarUpdate();
    };
    img.onerror = () => showToast("Couldn't read that image","error");
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}

async function lsPushAvatarUpdate(){
  const db = await lsInitDb(); if(!db) return;
  const {doc,setDoc} = await lsFirestoreFns();
  try{ await setDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId),{ avatarImg: lsMyAvatar }, { merge:true }); }catch{}
}

function lsPickRoomIconLive(emoji){
  document.getElementById("lsRoomIconPopLive")?.classList.remove("open");
  const btn = document.querySelector("#ls-panel-body .ls-room-info-box .ls-room-icon-picker span");
  if(btn) btn.textContent = emoji;
  lsSaveRoomProfile(emoji);
}

async function lsSaveRoomProfile(iconOverride){
  const nameVal = (document.getElementById("lsRoomNameEditInput")?.value || "").trim().slice(0,40);
  const iconVal = (iconOverride !== undefined ? iconOverride : document.querySelector("#ls-panel-body .ls-room-info-box .ls-room-icon-picker span")?.textContent || "").trim().slice(0,8);
  const db = await lsInitDb(); if(!db) return;
  const {doc,setDoc} = await lsFirestoreFns();
  try{
    await setDoc(doc(db,"liveRooms",lsRoomCode), { roomName: nameVal, roomIcon: iconVal }, { merge:true });
    lsRoomName = nameVal;
    lsRoomIcon = iconVal;
    showToast("✓ Server profile saved","success");
    renderLiveSessionPanel();
    const header = document.querySelector(".ls-fullscreen-header span");
    if(header) header.innerHTML = `${lsRoomIcon?lsEsc(lsRoomIcon)+' ':'👥 '}${lsRoomName?lsEsc(lsRoomName):'Live Session'}${lsRoomCode?' — Room <span class="ls-fs-code">'+lsRoomCode+'</span>':''}`;
  }catch(e){ showToast("Couldn't save — "+e.message,"error"); }
}

function lsPickRoomIcon(emoji){
  lsPickedRoomIcon = emoji;
  document.getElementById("lsRoomIconPop")?.classList.remove("open");
  // targeted update only — a full re-render here would wipe out whatever
  // the user had already typed into the room-name field next to it
  const btn = document.querySelector(".ls-room-icon-picker span");
  if(btn) btn.textContent = emoji;
}

async function lsJoinAsParticipant(){  const db = await lsInitDb(); if(!db) return;
  const {doc,setDoc} = await lsFirestoreFns();
  await setDoc(doc(db,"liveRooms",lsRoomCode,"participants",lsMyId),{
    name: lsMyName, broadcasting:false, currentFile:"", code:"", updatedAt: Date.now(), joinedAt: Date.now(),
    pinProof: lsMyPinProof, avatarImg: lsMyAvatar
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
  if(lsCallState!=="idle") lsHangupCall();
  if(lsIncomingUnsub){ lsIncomingUnsub(); lsIncomingUnsub=null; }
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
  lsRoomCode = null; lsBroadcasting = false; lsRoomPermanent = false;
  lsRoomName = ""; lsRoomIcon = ""; lsPickedRoomIcon = "";
  lsCoEditing = false; lsUnsubscribeCoEdit();
  lsReplyingTo = null; lsChatMsgsById = {};
  lsUnreadCount = 0; lsTalliedMsgIds = new Set(); lsUpdateUnreadBadge();
  if(lsExpanded){ renderLiveSessionPanel(); return; } // stay fullscreen, just show the create/join screen there
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
        <span class="ls-public-code">${r.roomIcon?lsEsc(r.roomIcon)+' ':''}${r.roomName?lsEsc(r.roomName)+' · ':''}${r.id}</span>
        <span class="ls-public-age">active ${mins<1?'just now':mins+'m ago'}</span>
      </div>
      <button class="ls-btn secondary" onclick="lsJoinRoom('${r.id}')">Join</button>
    </div>`;
  }).join("");
}

/* ── CO-EDIT (multiplayer editing of one file) ──
   Additive to broadcasting, not a replacement: broadcast is one-way
   "watch my screen", co-edit is two-way "we're both typing in this
   file". Scoped per-file on purpose — there's no single "host" in this
   app, so co-editing just naturally happens whenever two or more people
   have the toggle on AND the exact same file open. Switch files while
   it's on and it follows you: unsubscribes from the old file's sync
   doc, subscribes to the new one.

   Conflict handling is last-write-wins at the Firestore layer (no real
   OT/CRDT — out of scope for what can be safely built without live
   multi-client testing), but remote updates are applied as a line-diff
   patch rather than a full setValue(), so an edit on line 80 doesn't
   yank your cursor while you're typing on line 10. */
function lsCoEditDocId(path){
  // Firestore doc IDs can't contain "/" — encode, then also swap the
  // encoded slash-equivalent so it stays a clean single path segment
  return encodeURIComponent(path).replace(/%2F/g, "~");
}

async function lsToggleCoEdit(){
  lsCoEditing = !lsCoEditing;
  const sw = document.getElementById("lsCoEditSwitch");
  if(sw) sw.classList.toggle("on", lsCoEditing);
  if(lsCoEditing) await lsSubscribeCoEdit(typeof currentFile!=="undefined" ? currentFile : null);
  else lsUnsubscribeCoEdit();
  renderLiveSessionPanel();
}

/* called from app.js's openFile() so co-edit follows whichever file
   you actually have open, instead of silently syncing a file you've
   since navigated away from */
async function lsCoEditFileChanged(newFile){
  if(!lsCoEditing) return;
  await lsSubscribeCoEdit(newFile);
  const panelBody = document.getElementById("ls-panel-body");
  if(panelBody) renderLiveSessionPanel();
}

async function lsSubscribeCoEdit(path){
  lsUnsubscribeCoEdit();
  lsCoEditFile = path || null;
  if(!lsCoEditFile || !lsRoomCode) return;
  const db = await lsInitDb(); if(!db) return;
  const {doc, onSnapshot} = await lsFirestoreFns();
  lsCoEditLastAppliedAt = 0;
  lsCoEditUnsub = onSnapshot(doc(db,"liveRooms",lsRoomCode,"sharedFiles",lsCoEditDocId(lsCoEditFile)), snap => {
    if(!snap.exists()) return;
    const data = snap.data();
    if(!data || data.updatedBy===lsMyId) return; // our own write coming back
    if(data.updatedAt && data.updatedAt <= lsCoEditLastAppliedAt) return;
    if(typeof currentFile==="undefined" || currentFile !== lsCoEditFile) return; // navigated away
    lsCoEditLastAppliedAt = data.updatedAt || Date.now();
    lsApplyRemoteCoEdit(typeof editor1!=="undefined" ? editor1.getModel() : null, data.code||"");
  }, err => {
    console.error("[LiveSession] co-edit listener error:", err);
  });
}

function lsUnsubscribeCoEdit(){
  if(lsCoEditUnsub){ lsCoEditUnsub(); lsCoEditUnsub=null; }
  if(lsCoEditPushTimer){ clearTimeout(lsCoEditPushTimer); lsCoEditPushTimer=null; }
  lsCoEditFile = null;
}

/* apply an incoming remote version as a minimal patch (reuses the same
   LCS line-diff app.js already has for the AI change-review diff view)
   instead of setValue(), which would blow away cursor position and
   undo history on every remote keystroke from someone else */
function lsApplyRemoteCoEdit(model, newText){
  if(!model) return;
  const oldText = model.getValue();
  if(oldText === newText) return;
  lsCoEditApplyingRemote = true;
  try{
    const ops = (typeof aiComputeLineDiff==="function") ? aiComputeLineDiff(oldText, newText) : null;
    if(!ops){ model.setValue(newText); return; } // huge-file fallback
    const edits = [];
    let oldLine = 1, i = 0;
    while(i < ops.length){
      if(ops[i].type === "same"){ oldLine++; i++; continue; }
      const startLine = oldLine;
      const addLines = [];
      while(i < ops.length && ops[i].type !== "same"){
        if(ops[i].type === "del") oldLine++;
        else addLines.push(ops[i].line);
        i++;
      }
      edits.push({ range: new monaco.Range(startLine, 1, oldLine, 1), text: addLines.length ? addLines.join("\n")+"\n" : "" });
    }
    if(edits.length) model.pushEditOperations([], edits, () => null);
  } finally {
    lsCoEditApplyingRemote = false;
  }
}

/* called from app.js's editor1.onDidChangeModelContent, debounced */
function lsOnLocalEditForCoEdit(file, model){
  if(!lsCoEditing || lsCoEditApplyingRemote) return;
  if(!lsCoEditFile || file !== lsCoEditFile) return;
  clearTimeout(lsCoEditPushTimer);
  lsCoEditPushTimer = setTimeout(async () => {
    const db = await lsInitDb(); if(!db) return;
    const {doc,setDoc} = await lsFirestoreFns();
    const now = Date.now();
    lsCoEditLastAppliedAt = now;
    try{
      await setDoc(doc(db,"liveRooms",lsRoomCode,"sharedFiles",lsCoEditDocId(lsCoEditFile)),
        { code: model.getValue(), updatedAt: now, updatedBy: lsMyId }, { merge:true });
    }catch(e){ console.error("[LiveSession] co-edit push failed:", e); }
  }, 400);
}

/* the one-click bridge from "watching someone broadcast" to "actually
   co-editing with them" — this is what was missing: broadcasting only
   ever showed a read-only snapshot of someone's code as plain text, with
   no way to actually get into it and start typing together. */
async function lsEditWithThem(pid){
  const p = lsLastList.find(x=>x.id===pid);
  if(!p || !p.currentFile){ showToast("Nothing to open yet","info"); return; }
  const path = p.currentFile;
  if(typeof files!=="undefined" && files[path]===undefined) files[path] = ""; // just so openFile() doesn't no-op below
  if(typeof openFile==="function") openFile(path);

  lsCoEditing = true;
  document.getElementById("lsCoEditSwitch")?.classList.add("on");
  await lsSubscribeCoEdit(path);

  // seed the co-edit sync doc from their current broadcast if nobody's
  // started one for this file yet — if one already exists, the normal
  // subscribe above + remote-apply path takes over automatically instead
  const db = await lsInitDb();
  if(db){
    const {doc,getDoc,setDoc} = await lsFirestoreFns();
    const ref = doc(db,"liveRooms",lsRoomCode,"sharedFiles",lsCoEditDocId(path));
    try{
      const existing = await getDoc(ref);
      if(!existing.exists()) await setDoc(ref, { code: p.code||"", updatedAt: Date.now(), updatedBy: p.id });
    }catch(e){}
  }
  showToast(`✏️ Co-editing ${path} with ${p.name||"them"}`, "success");
  renderLiveSessionPanel();
}

/* ── BROADCASTING ── */
async function lsToggleBroadcast(){
  lsBroadcasting = !lsBroadcasting;
  const sw = document.getElementById("lsSwitch");
  if(sw) sw.classList.toggle("on", lsBroadcasting);
  const statusEl = document.getElementById("ls-panel-body")?.querySelector(".ls-status-chips");
  if(statusEl) statusEl.innerHTML = lsStatusChipsHtml();

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
  }, err => {
    // without this handler a Firestore internal error kills the listener
    // silently — the live editors panel just stays empty forever with no
    // sign anything went wrong. Log it and auto-resubscribe instead.
    console.error("[LiveSession] participants listener error:", err);
    if(lsRoomCode) setTimeout(()=>{ if(lsRoomCode) lsSubscribe(); }, 3000);
  });
  if(lsStaleTimer) clearInterval(lsStaleTimer);
  // re-render on a timer too (not just on new data) so a frozen/disconnected
  // broadcaster's card visibly goes stale even though no new snapshot arrives
  lsStaleTimer = setInterval(()=>{ lsRenderParticipants(lsLastList); lsRenderPresence(lsLastList); }, 2000);
}

/* everyone currently in the room, online/broadcasting/away, not just broadcasters */
function lsAvatarColor(name){
  const colors = ["#5865F2","#57F287","#FEE75C","#EB459E","#ED4245","#3BA55C","#FAA61A","#9B59B6","#1ABC9C","#E67E22"];
  const s = name || "?";
  let hash = 0;
  for(let i=0;i<s.length;i++) hash = s.charCodeAt(i) + ((hash<<5)-hash);
  return colors[Math.abs(hash) % colors.length];
}

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
    const name = p.id===lsMyId ? "You" : lsEsc(p.name||"Someone");
    const initial = (p.name||"?").trim().charAt(0).toUpperCase() || "?";
    const statusLabel = status==="broadcasting" ? "Live" : status==="online" ? "Online" : "Away";
    const canCall = p.id!==lsMyId && status!=="away" && lsCallState==="idle";
    return `<div class="ls-member-row">
      <div class="ls-member-avatar-wrap">
        ${lsAvatarHtml(p, "ls-member-avatar")}
        <span class="ls-member-dot ls-member-dot-${status}"></span>
      </div>
      <div class="ls-member-info">
        <div class="ls-member-name">${name}</div>
        <div class="ls-member-sub">${statusLabel}</div>
      </div>
      ${p.id!==lsMyId ? `<button class="ls-call-btn" ${canCall?'':'disabled'} onclick="lsStartCall('${p.id}')" title="${canCall?'Call '+name:'Unavailable'}">📞</button>` : ''}
    </div>`;
  }).join("");
}

/* ══════════════════════════════════════════
   VOICE CALLING — 1:1 WebRTC audio call between two people in the same
   room. Signaling goes through Firestore (same pattern as everything
   else here — no separate signaling server): a `calls` doc carries the
   SDP offer/answer + status, and a `candidates` subcollection carries
   ICE candidates from each side. STUN-only (no TURN), so it'll fail to
   connect on some strict/symmetric-NAT networks — most home/mobile
   connections are fine.
══════════════════════════════════════════ */
let lsCallState      = "idle"; // idle | outgoing | incoming | active
let lsCallId         = null;
let lsCallOtherId    = null;
let lsCallOtherName  = "";
let lsCallPC         = null;
let lsCallLocalStream= null;
let lsCallRemoteAudio= null;
let lsCallMuted      = false;
let lsCallStartedAt  = null;
let lsCallTimerInt   = null;
let lsIncomingUnsub  = null;
let lsCallDocUnsub   = null;
let lsCallCandUnsub  = null;
let lsCallSeenCandIds= new Set();

/* ---- ringtone — synthesized via Web Audio so no audio asset/network
   request is needed (keeps this working offline like the rest of the PWA).
   This was the actual reported bug: incoming calls only showed a silent
   floating widget, so unless you were staring at the tab you'd never know. */
let lsRingCtx = null, lsRingLoopInt = null, lsRingVibrateInt = null;

function lsBeep(ctx, t, freq, dur, vol){
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = "sine"; osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(vol, t+0.02);
  gain.gain.linearRampToValueAtTime(0, t+dur);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(t); osc.stop(t+dur+0.02);
}

function lsPlayRingCycle(kind){
  try{
    if(!lsRingCtx) lsRingCtx = new (window.AudioContext||window.webkitAudioContext)();
    const ctx = lsRingCtx;
    if(ctx.state==="suspended") ctx.resume().catch(()=>{});
    const now = ctx.currentTime;
    if(kind==="incoming"){
      lsBeep(ctx, now, 880, 0.35, 0.2); lsBeep(ctx, now+0.42, 880, 0.35, 0.2);
    } else {
      lsBeep(ctx, now, 440, 1.0, 0.08); // soft ringback for the caller
    }
  }catch{}
}

function lsStartRingtone(kind){
  lsStopRingtone();
  lsPlayRingCycle(kind);
  lsRingLoopInt = setInterval(()=>lsPlayRingCycle(kind), kind==="incoming" ? 1700 : 3200);
  if(kind==="incoming" && navigator.vibrate){
    navigator.vibrate([400,200,400,200]);
    lsRingVibrateInt = setInterval(()=>navigator.vibrate([400,200,400,200]), 1700);
  }
  if(kind==="incoming" && document.hidden && "Notification" in window && Notification.permission==="granted"){
    try{
      const n = new Notification("Incoming call", { body: (lsCallOtherName||"Someone")+" is calling", tag:"ls-incoming-call", requireInteraction:true });
      n.onclick = () => { window.focus(); n.close(); };
    }catch{}
  }
}

function lsStopRingtone(){
  if(lsRingLoopInt){ clearInterval(lsRingLoopInt); lsRingLoopInt=null; }
  if(lsRingVibrateInt){ clearInterval(lsRingVibrateInt); lsRingVibrateInt=null; }
  if(navigator.vibrate) navigator.vibrate(0);
}

const LS_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" }
];

/* listens room-wide for any call doc where I'm the callee — set up once
   per room join, torn down on leave, same lifecycle as chat/presence */
async function lsSubscribeIncomingCalls(){
  if(lsIncomingUnsub){ lsIncomingUnsub(); lsIncomingUnsub=null; }
  if("Notification" in window && Notification.permission==="default"){ try{ Notification.requestPermission(); }catch{} }
  const db = await lsInitDb(); if(!db) return;
  const {collection,query,where,onSnapshot} = await lsFirestoreFns();
  const q = query(collection(db,"liveRooms",lsRoomCode,"calls"), where("calleeId","==",lsMyId));
  lsIncomingUnsub = onSnapshot(q, snap => {
    snap.docChanges().forEach(ch => {
      const data = ch.doc.data();
      if(ch.type==="added" && data.status==="ringing"){
        if(lsCallState!=="idle"){
          // already on a call / calling someone — auto-decline as busy
          lsFirestoreFns().then(({doc,updateDoc}) => updateDoc(doc(db,"liveRooms",lsRoomCode,"calls",ch.doc.id),{status:"declined"}).catch(()=>{}));
          return;
        }
        lsCallId = ch.doc.id;
        lsCallOtherId = data.callerId;
        lsCallOtherName = data.callerName || "Someone";
        lsCallState = "incoming";
        lsWatchCallDoc();
        lsRenderCallWidget();
        lsStartRingtone("incoming");
      }
    });
  }, err => console.error("[LiveSession] incoming-call listener error:", err));
}

function lsCallDocId(){ return lsCallId; }

async function lsStartCall(calleeId){
  if(lsCallState!=="idle") return;
  const p = lsLastList.find(x=>x.id===calleeId);
  const calleeName = p?.name || "them";
  const db = await lsInitDb(); if(!db){ showToast("Firebase not connected","error"); return; }
  let stream;
  try{
    stream = await navigator.mediaDevices.getUserMedia({ audio:true });
  }catch(e){ showToast("Couldn't access microphone — "+(e.message||"permission denied"),"error"); return; }

  lsCallLocalStream = stream;
  lsCallOtherId = calleeId;
  lsCallOtherName = calleeName;
  lsCallState = "outgoing";
  lsRenderCallWidget();
  lsStartRingtone("outgoing");

  const pc = lsCreatePeerConnection("caller");
  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const {doc,collection,setDoc} = await lsFirestoreFns();
  const callRef = doc(collection(db,"liveRooms",lsRoomCode,"calls"));
  lsCallId = callRef.id;
  await setDoc(callRef, {
    callerId: lsMyId, callerName: lsMyName || "Someone",
    calleeId, calleeName,
    offer: { type: offer.type, sdp: offer.sdp },
    status: "ringing", createdAt: Date.now()
  });
  lsWatchCallDoc();
  lsWatchCandidates("caller");
}

async function lsAcceptCall(){
  if(lsCallState!=="incoming" || !lsCallId) return;
  const db = await lsInitDb(); if(!db) return;
  let stream;
  try{
    stream = await navigator.mediaDevices.getUserMedia({ audio:true });
  }catch(e){ showToast("Couldn't access microphone — "+(e.message||"permission denied"),"error"); lsDeclineCall(); return; }
  lsCallLocalStream = stream;

  const {doc,getDoc,updateDoc} = await lsFirestoreFns();
  const callRef = doc(db,"liveRooms",lsRoomCode,"calls",lsCallId);
  const snap = await getDoc(callRef);
  if(!snap.exists() || snap.data().status!=="ringing"){ lsCleanupCall(); return; }
  const offer = snap.data().offer;

  const pc = lsCreatePeerConnection("callee");
  stream.getTracks().forEach(t => pc.addTrack(t, stream));
  await pc.setRemoteDescription(offer);
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  await updateDoc(callRef, { answer: { type: answer.type, sdp: answer.sdp }, status: "active" });
  lsCallState = "active";
  lsCallStartedAt = Date.now();
  lsStopRingtone();
  lsStartCallTimer();
  lsWatchCandidates("callee");
  lsRenderCallWidget();
}

async function lsDeclineCall(){
  if(lsCallId){
    try{
      const db = await lsInitDb();
      const {doc,updateDoc} = await lsFirestoreFns();
      await updateDoc(doc(db,"liveRooms",lsRoomCode,"calls",lsCallId),{status:"declined"});
    }catch{}
  }
  lsCleanupCall();
}

async function lsHangupCall(){
  if(lsCallId){
    try{
      const db = await lsInitDb();
      const {doc,updateDoc} = await lsFirestoreFns();
      await updateDoc(doc(db,"liveRooms",lsRoomCode,"calls",lsCallId),{status:"ended"});
    }catch{}
  }
  lsCleanupCall();
}

function lsToggleMute(){
  if(!lsCallLocalStream) return;
  lsCallMuted = !lsCallMuted;
  lsCallLocalStream.getAudioTracks().forEach(t => t.enabled = !lsCallMuted);
  lsRenderCallWidget();
}

function lsCreatePeerConnection(role){
  const pc = new RTCPeerConnection({ iceServers: LS_ICE_SERVERS });
  pc.onicecandidate = async (ev) => {
    if(!ev.candidate || !lsCallId) return;
    try{
      const db = await lsInitDb();
      const {collection,addDoc} = await lsFirestoreFns();
      await addDoc(collection(db,"liveRooms",lsRoomCode,"calls",lsCallId,"candidates"), {
        from: role, candidate: ev.candidate.toJSON(), createdAt: Date.now()
      });
    }catch{}
  };
  pc.ontrack = (ev) => {
    if(!lsCallRemoteAudio){
      lsCallRemoteAudio = document.createElement("audio");
      lsCallRemoteAudio.autoplay = true;
      lsCallRemoteAudio.id = "lsCallRemoteAudio";
      document.body.appendChild(lsCallRemoteAudio);
    }
    lsCallRemoteAudio.srcObject = ev.streams[0];
  };
  pc.onconnectionstatechange = () => {
    if(["failed","disconnected","closed"].includes(pc.connectionState) && lsCallState!=="idle"){
      if(pc.connectionState==="failed") showToast("Call connection failed","error");
    }
  };
  lsCallPC = pc;
  return pc;
}

/* watches the call doc itself: caller waits here for the answer + for
   status flips (declined/ended from the other side); callee watches
   for the other side hanging up mid-call */
async function lsWatchCallDoc(){
  if(lsCallDocUnsub){ lsCallDocUnsub(); lsCallDocUnsub=null; }
  const db = await lsInitDb(); if(!db) return;
  const {doc,onSnapshot} = await lsFirestoreFns();
  lsCallDocUnsub = onSnapshot(doc(db,"liveRooms",lsRoomCode,"calls",lsCallId), async snap => {
    if(!snap.exists()){ if(lsCallState!=="idle") lsCleanupCall(); return; }
    const data = snap.data();
    if(data.status==="declined" && lsCallState==="outgoing"){
      showToast(`${lsCallOtherName} declined the call`,"info");
      lsCleanupCall();
      return;
    }
    if(data.status==="ended" && lsCallState!=="idle"){
      lsCleanupCall();
      return;
    }
    if(data.status==="active" && data.answer && lsCallState==="outgoing" && lsCallPC && !lsCallPC.currentRemoteDescription){
      await lsCallPC.setRemoteDescription(data.answer);
      lsCallState = "active";
      lsCallStartedAt = Date.now();
      lsStopRingtone();
      lsStartCallTimer();
      lsRenderCallWidget();
    }
  }, err => console.error("[LiveSession] call-doc listener error:", err));
}

async function lsWatchCandidates(role){
  if(lsCallCandUnsub){ lsCallCandUnsub(); lsCallCandUnsub=null; }
  const db = await lsInitDb(); if(!db) return;
  const {collection,onSnapshot} = await lsFirestoreFns();
  const otherRole = role==="caller" ? "callee" : "caller";
  lsCallSeenCandIds = new Set();
  lsCallCandUnsub = onSnapshot(collection(db,"liveRooms",lsRoomCode,"calls",lsCallId,"candidates"), snap => {
    snap.docChanges().forEach(ch => {
      if(ch.type!=="added") return;
      const data = ch.doc.data();
      if(data.from!==otherRole || lsCallSeenCandIds.has(ch.doc.id)) return;
      lsCallSeenCandIds.add(ch.doc.id);
      if(lsCallPC) lsCallPC.addIceCandidate(data.candidate).catch(()=>{});
    });
  }, err => console.error("[LiveSession] ICE candidate listener error:", err));
}

function lsStartCallTimer(){
  if(lsCallTimerInt) clearInterval(lsCallTimerInt);
  lsCallTimerInt = setInterval(lsRenderCallWidget, 1000);
}

function lsCleanupCall(){
  lsStopRingtone();
  if(lsCallPC){ try{ lsCallPC.close(); }catch{} lsCallPC=null; }
  if(lsCallLocalStream){ lsCallLocalStream.getTracks().forEach(t=>t.stop()); lsCallLocalStream=null; }
  if(lsCallRemoteAudio){ lsCallRemoteAudio.srcObject=null; lsCallRemoteAudio.remove(); lsCallRemoteAudio=null; }
  if(lsCallDocUnsub){ lsCallDocUnsub(); lsCallDocUnsub=null; }
  if(lsCallCandUnsub){ lsCallCandUnsub(); lsCallCandUnsub=null; }
  if(lsCallTimerInt){ clearInterval(lsCallTimerInt); lsCallTimerInt=null; }
  // best-effort: clean up the call doc if it's still there and I'm the one closing it out
  const idToClean = lsCallId;
  if(idToClean){
    lsInitDb().then(async db => {
      try{
        const {doc,deleteDoc} = await lsFirestoreFns();
        await deleteDoc(doc(db,"liveRooms",lsRoomCode,"calls",idToClean));
      }catch{}
    });
  }
  lsCallState = "idle"; lsCallId = null; lsCallOtherId = null; lsCallOtherName = "";
  lsCallMuted = false; lsCallStartedAt = null; lsCallSeenCandIds = new Set();
  lsRenderCallWidget();
  lsRenderPresence(lsLastList);
}

function lsFmtCallDuration(){
  if(!lsCallStartedAt) return "";
  const secs = Math.floor((Date.now()-lsCallStartedAt)/1000);
  const m = Math.floor(secs/60), s = secs%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

/* floating widget, appended straight to <body> (not the panel) so a call
   stays visible/controllable no matter which tab someone's looking at,
   same reasoning as putting the remote <audio> element on body */
function lsRenderCallWidget(){
  let w = document.getElementById("lsCallWidget");
  if(lsCallState==="idle"){ w?.remove(); return; }
  if(!w){
    w = document.createElement("div");
    w.id = "lsCallWidget";
    document.body.appendChild(w);
  }
  const initial = (lsCallOtherName||"?").trim().charAt(0).toUpperCase() || "?";
  const color = lsAvatarColor(lsCallOtherName);
  let body = "";
  if(lsCallState==="outgoing"){
    body = `<div class="ls-call-status">Calling…</div>
      <div class="ls-call-actions">
        <button class="ls-call-icon-btn danger" onclick="lsHangupCall()" title="Cancel">✕</button>
      </div>`;
  } else if(lsCallState==="incoming"){
    body = `<div class="ls-call-status">Incoming call…</div>
      <div class="ls-call-actions">
        <button class="ls-call-icon-btn danger" onclick="lsDeclineCall()" title="Decline">✕</button>
        <button class="ls-call-icon-btn accept" onclick="lsAcceptCall()" title="Accept">📞</button>
      </div>`;
  } else if(lsCallState==="active"){
    body = `<div class="ls-call-status">${lsFmtCallDuration()}</div>
      <div class="ls-call-actions">
        <button class="ls-call-icon-btn ${lsCallMuted?'active':''}" onclick="lsToggleMute()" title="${lsCallMuted?'Unmute':'Mute'}">${lsCallMuted?'🔇':'🎙️'}</button>
        <button class="ls-call-icon-btn danger" onclick="lsHangupCall()" title="Hang up">✕</button>
      </div>`;
  }
  w.innerHTML = `
    <div class="ls-call-avatar" style="background:${color};">${initial}</div>
    <div class="ls-call-info">
      <div class="ls-call-name">${lsEsc(lsCallOtherName)}</div>
      ${body}
    </div>`;
}

function lsEsc(s){ return (s||"").replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c])); }

/* shared avatar renderer: real picture if the person set one, otherwise
   the colored initial circle, used consistently across presence list,
   chat, and live-editor cards */
function lsAvatarHtml(p, sizeClass){
  const initial = lsInitial(p.name);
  const color = lsAvatarColor(p.name||p.id);
  if(p.avatarImg) return `<span class="${sizeClass}" style="background-image:url('${p.avatarImg}');background-size:cover;background-position:center;"></span>`;
  return `<span class="${sizeClass}" style="background:${color};">${initial}</span>`;
}

function lsStatusChipsHtml(){
  const chips = [];
  chips.push(lsBroadcasting
    ? `<span class="ls-chip ls-chip-live"><span class="ls-live-dot"></span>Broadcasting</span>`
    : `<span class="ls-chip">In session</span>`);
  if(lsRoomPermanent) chips.push(`<span class="ls-chip ls-chip-gold">📌 Permanent</span>`);
  return chips.join("");
}

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
  // in fullscreen, once someone's actually broadcasting, the room-code/
  // copy/leave/people sidebar isn't needed anymore (it's all one click
  // away in the header) — give that space to the live editors instead.
  const panelBody = document.getElementById("ls-panel-body");
  if(panelBody) panelBody.classList.toggle("ls-has-broadcast", live.length > 0);
  if(!live.length){
    el.innerHTML = `<div class="ls-empty">No one is broadcasting yet. Flip the switch above to show your editor.</div>`;
    return;
  }
  const cards = await Promise.all(live.map(async p => {
    const stale = (now - (p.updatedAt||0)) > LS_STALE_MS;
    const html = await lsHighlight(p.code, p.currentFile, p.cursorLine);
    const isMe = p.id===lsMyId;
    const alreadyCoEditingThis = lsCoEditing && lsCoEditFile === p.currentFile;
    return `
    <div class="ls-participant live${stale?' stale':''}">
      <div class="ls-participant-head">
        <span>${isMe ? '<span class="ls-you">You</span>' : `<span class="ls-live-dot"></span>${lsEsc(p.name||"Someone")}`}
          ${stale?'<span class="ls-stale-badge">connection lost</span>':''}</span>
        <span class="ls-participant-file">${lsEsc(p.currentFile||"")}${p.cursorLine?` · Ln ${p.cursorLine}`:''}</span>
      </div>
      <pre class="ls-participant-code">${html}</pre>
      ${(!isMe && !stale && p.currentFile) ? `
        <button class="ls-btn ${alreadyCoEditingThis?'secondary':''} ls-edit-with-btn" onclick="lsEditWithThem('${p.id}')" ${alreadyCoEditingThis?'disabled':''}>
          ${alreadyCoEditingThis ? '✓ Co-editing this with you' : `✏️ Edit this with ${lsEsc(p.name||"them")}`}
        </button>` : ''}
    </div>`;
  }));
  el.innerHTML = cards.join("");
}

/* ── CHAT ── */
let lsChatUnsub = null;
let lsChatMsgsById = {};
let lsReplyingTo = null;

function lsSortMsgs(msgs){
  return msgs.slice().sort((a,b) => {
    const ka = (a.createdAt && typeof a.createdAt.toMillis==="function") ? a.createdAt.toMillis() : (a.clientTs||0);
    const kb = (b.createdAt && typeof b.createdAt.toMillis==="function") ? b.createdAt.toMillis() : (b.clientTs||0);
    return ka - kb;
  });
}

/* Ground-truth check instead of trusting a stored flag — reads the actual
   DOM each time, so it can never drift out of sync with what's really on
   screen (e.g. after a re-render swaps elements around). */
function lsIsPanelVisible(){
  if(lsExpanded) return true;
  const el = document.querySelector('.sidebar-panel[data-panel="live-session"]');
  return !!(el && el.classList.contains("active"));
}

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
    const msgs = lsSortMsgs(snap.docs.map(d => ({ id:d.id, ...d.data() })));
    const visible = lsIsPanelVisible();
    lsChatMsgsById = {};
    msgs.forEach(m => {
      lsChatMsgsById[m.id] = m;
      if(!lsTalliedMsgIds.has(m.id)){
        lsTalliedMsgIds.add(m.id);
        if(m.senderId !== lsMyId && !visible) lsUnreadCount++;
      }
    });
    if(visible) { lsUnreadCount = 0; } // caught up just by having it open
    if(document.getElementById("lsChatLog")) lsRenderChat(msgs);
    lsUpdateUnreadBadge();
    lsUpdateUnreadBadge();
  }, err => {
    console.error("[LiveSession] chat listener error:", err);
    if(lsRoomCode) setTimeout(()=>{ if(lsRoomCode) lsSubscribeChat(); }, 3000);
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
    const color = lsAvatarColor(m.senderId);
    const sender = lsLastList.find(p=>p.id===m.senderId) || { name:m.name, id:m.senderId };
    const avatarCol = !grouped
      ? lsAvatarHtml(sender, "ls-chat-avatar")
      : `<span class="ls-chat-gutter-time">${lsFormatTime(m)}</span>`;
    const headerLine = !grouped
      ? `<div class="ls-chat-header-line"><span class="ls-chat-name" style="color:${color}">${mine?'You':lsEsc(m.name||"Someone")}</span><span class="ls-chat-time">${lsFormatTime(m)}</span></div>`
      : '';
    return `
    <div class="ls-chat-msg${grouped?' grouped':''}" data-msg-id="${m.id}">
      ${avatarCol}
      <div class="ls-chat-body-col">
        ${headerLine}
        ${replyBlock}
        <div class="ls-chat-text">${lsEsc(m.text||"")}</div>
      </div>
      <button class="ls-chat-reply-btn" onclick="lsStartReply('${m.id}')" title="Reply">↩</button>
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
      if(roomDoc.data().permanent === true) continue; // never auto-delete a permanent room
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
