/* =========================
   ANNOUNCEMENTS SYSTEM v2
   Beautiful robot popup
   Admin password redesign
   IP tracking ready
========================= */

const ANNOUNCE_CHECK_INTERVAL = 40 * 60 * 1000;
const ADMIN_PASSWORD = "vscodegodmode2025"; // fallback default

async function getAdminPassword() {
  try {
    const db = await initAnnounceDB(); if (!db) return ADMIN_PASSWORD;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", "config"));
    if (snap.exists() && snap.data().adminPassword) return snap.data().adminPassword;
    return ADMIN_PASSWORD;
  } catch { return ADMIN_PASSWORD; }
}

async function setAdminPassword(newPw) {
  try {
    const db = await initAnnounceDB(); if (!db) return false;
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db, "global_settings", "config"), { adminPassword: newPw }, { merge: true });
    return true;
  } catch { return false; }
}
const ANNOUNCE_COLLECTION = "announcements";
const REPLIES_COLLECTION  = "replies";

let announceDB = null;
let lastSeenAnnouncementId = localStorage.getItem("last_seen_announce") || null;
let announceCheckTimer = null;

/* ── FIREBASE INIT ── */
async function initAnnounceDB() {
  if (announceDB) return announceDB;
  const cfg = typeof getFirebaseConfig === "function" ? getFirebaseConfig() : null;
  if (!cfg?.apiKey) return null;
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const app = getApps().length ? getApps()[0] : initializeApp(cfg);
    announceDB = getFirestore(app);
    return announceDB;
  } catch(e) { return null; }
}

/* ── FETCH ── */
let _announceUnsub = null;

async function fetchLatestAnnouncement() {
  const db = await initAnnounceDB(); if (!db) return null;
  try {
    const { collection, getDocs, query, orderBy, limit, where } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const q = query(collection(db, ANNOUNCE_COLLECTION), where("active","==",true), orderBy("timestamp","desc"), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch(e) { return null; }
}

async function startRealtimeAnnouncements() {
  const db = await initAnnounceDB(); if (!db) return;
  try {
    const { collection, query, orderBy, limit, where, onSnapshot } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    if (_announceUnsub) _announceUnsub();
    const q = query(collection(db, ANNOUNCE_COLLECTION), where("active","==",true), orderBy("timestamp","desc"), limit(1));
    _announceUnsub = onSnapshot(q, snap => {
      if (snap.empty) return;
      const ann = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (ann.id !== lastSeenAnnouncementId) {
        showAnnouncementPopup(ann);
      }
    });
  } catch(e) { console.warn("Realtime announce:", e.message); }
}

async function fetchAllAnnouncements() {
  const db = await initAnnounceDB(); if (!db) return [];
  try {
    const { collection, getDocs, query, orderBy, limit } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDocs(query(collection(db, ANNOUNCE_COLLECTION), orderBy("timestamp","desc"), limit(20)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function fetchReplies(annId) {
  const db = await initAnnounceDB(); if (!db) return [];
  try {
    const { collection, getDocs, query, orderBy, where } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDocs(query(collection(db, REPLIES_COLLECTION), where("announcementId","==",annId), orderBy("timestamp","asc")));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch { return []; }
}

async function postAnnouncement(title, message, type="info") {
  const db = await initAnnounceDB();
  if (!db) { alert("Firebase not configured — go to ⚙ Settings → ☁ Cloud"); return false; }
  try {
    const { collection, addDoc, getDocs, query, updateDoc, doc, where } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const old = await getDocs(query(collection(db, ANNOUNCE_COLLECTION), where("active","==",true)));
    for (const d of old.docs) await updateDoc(doc(db, ANNOUNCE_COLLECTION, d.id), { active: false });
    const ref = await addDoc(collection(db, ANNOUNCE_COLLECTION), {
      title, message, type, active: true,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      version: document.getElementById("announceVersion")?.value || ""
    });
    return ref.id;
  } catch(e) { alert("Error: " + e.message); return false; }
}

async function postReply(announcementId, username, message) {
  const db = await initAnnounceDB(); if (!db) return false;
  try {
    const { collection, addDoc, onSnapshot, query, where, orderBy } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await addDoc(collection(db, REPLIES_COLLECTION), {
      announcementId, username, message, timestamp: Date.now()
    });
    // refresh replies in popup in real time
    const replyBox = document.getElementById("ap-replies-live");
    if (replyBox) {
      const q = query(collection(db, REPLIES_COLLECTION), where("announcementId","==",announcementId), orderBy("timestamp","asc"));
      onSnapshot(q, snap => {
        const replies = snap.docs.map(d => d.data());
        replyBox.innerHTML = replies.map(r =>
          `<div style="padding:4px 0;border-bottom:1px solid rgba(0,255,136,0.05);font-size:11px;">
            <span style="color:#00ff88;">${r.username||"anon"}</span>
            <span style="color:rgba(255,255,255,0.4);margin:0 6px;">${new Date(r.timestamp).toLocaleTimeString()}</span>
            <span style="color:#c0f0d0;">${r.message}</span>
          </div>`
        ).join("") || "<div style='color:rgba(0,255,136,0.2);font-size:11px;'>No replies yet.</div>";
      });
    }
    return true;
  } catch(e) { return false; }
}

/* ── POPUP CHECK ── */
async function checkAndShowPopup(force = false) {
  startRealtimeAnnouncements();
  const ann = await fetchLatestAnnouncement(); if (!ann) return;
  const isNew = ann.id !== lastSeenAnnouncementId;
  const timeKey = "announce_shown_" + ann.id;
  const lastShown = parseInt(localStorage.getItem(timeKey) || "0");
  const shouldShow = force || isNew || (Date.now() - lastShown > ANNOUNCE_CHECK_INTERVAL);
  if (!shouldShow) return;
  localStorage.setItem(timeKey, String(Date.now()));
  showAnnouncementPopup(ann);
}

/* ── BEAUTIFUL ROBOT POPUP ── */
function showAnnouncementPopup(ann) {
  document.getElementById("announcePopup")?.remove();

  const typeColors = { info:"#00d4ff", update:"#00ff88", warning:"#ffaa00", urgent:"#ff4444" };
  const typeIcons  = { info:"ℹ️", update:"🚀", warning:"⚠️", urgent:"🚨" };
  const color = typeColors[ann.type] || "#00d4ff";
  const icon  = typeIcons[ann.type]  || "ℹ️";

  // generate floating bits
  const bits = Array.from({length:18}, (_,i) => {
    const left = Math.random()*100, dur = 4+Math.random()*8, delay = Math.random()*6;
    return `<span class="ap-float-bit" style="left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s">${Math.random()>.5?"1":"0"}</span>`;
  }).join("");

  const popup = document.createElement("div");
  popup.id = "announcePopup";
  popup.innerHTML = `
    <div class="ap-overlay"></div>
    <div class="ap-binary-bg">${bits}</div>

    <div class="ap-terminal">

      <!-- TITLEBAR -->
      <div class="ap-titlebar">
        <div class="ap-dot red"></div>
        <div class="ap-dot yellow"></div>
        <div class="ap-dot green"></div>
        <span class="ap-titlebar-text">vscodegodmode — system.broadcast</span>
      </div>

      <!-- TWO-COLUMN BODY -->
      <div class="ap-body-wrap">

        <!-- LEFT: ROBOT -->
        <div class="ap-robot-side">
          <div class="ap-robot-glow"></div>
          <div class="ap-robot-glow2"></div>
          <div class="ap-float-bits">${bits}</div>

          <!-- ROBOT ART -->
          <div class="ap-robot-art">
            <div class="ap-robot-full">
              <div class="ap-ant">
                <div class="ap-ant-ball"></div>
                <div class="ap-ant-pole"></div>
              </div>
              <div class="ap-head">
                <div class="ap-visor">
                  <div class="ap-eye"></div>
                  <div class="ap-eye"></div>
                  <div class="ap-smile"></div>
                </div>
              </div>
              <div class="ap-neck"></div>
              <div style="display:flex;align-items:flex-start;gap:4px;">
                <div class="ap-arm left"><div class="ap-hand"></div></div>
                <div class="ap-body-r">
                  <div class="ap-chest-icon">⚛</div>
                </div>
                <div class="ap-arm right"><div class="ap-hand"></div></div>
              </div>
              <div class="ap-legs">
                <div class="ap-leg"></div>
                <div class="ap-leg"></div>
              </div>
              <div class="ap-feet">
                <div class="ap-foot"></div>
                <div class="ap-foot"></div>
              </div>
            </div>
            <div class="ap-platform"></div>
          </div>

          <!-- CODE ICONS -->
          <div class="ap-code-icons">
            <div class="ap-code-icon"><span>&lt;/&gt;</span> broadcast.exe</div>
            <div class="ap-code-icon"><span>⚡</span> system.active</div>
            <div class="ap-code-icon"><span>📡</span> uplink.ok</div>
          </div>
          ${ann.version ? `<div class="ap-version">v${ann.version}</div>` : ""}
        </div>

        <!-- RIGHT: MESSAGE -->
        <div class="ap-msg-side">

          <!-- TYPE BADGE -->
          <div class="ap-type-row">
            <div class="ap-pulse-dot" style="color:${color}"></div>
            <div class="ap-type-chip" style="color:${color};border-color:${color}30;background:${color}10">
              ${icon} ${(ann.type||"info").toUpperCase()}
            </div>
          </div>

          <!-- TITLE -->
          <div class="ap-ann-title">${escHtml(ann.title)}</div>

          <!-- META -->
          <div class="ap-ann-meta">
            <span>📅 ${ann.date || ""}</span>
            ${ann.version ? `<span>🏷 v${escHtml(ann.version)}</span>` : ""}
          </div>

          <!-- MESSAGE BOX -->
          <div class="ap-msg-box">
            <div class="ap-prompt-line">
              <span class="ap-prompt">root@vscodegodmode:~$</span>
              <span class="ap-cmd"> cat broadcast.txt</span>
            </div>
            <div class="ap-message-text" id="ap-typewriter"></div>
          </div>

         <!-- REPLY -->
          <div class="ap-reply-box">
            <div class="ap-reply-title">// SEND REPLY / RAISE CONCERN</div>
            <input id="ap-username" class="ap-input" placeholder="your_username" maxlength="30">
            <textarea id="ap-message" class="ap-textarea" placeholder="// Type your message..." rows="3"></textarea>
            <div class="ap-reply-row">
              <button class="ap-send-btn" onclick="submitReply('${ann.id}')">▶ SEND</button>
              <span id="ap-reply-status" class="ap-reply-status"></span>
            </div>
          </div>
          <!-- LIVE REPLIES -->
          <div class="ap-reply-title" style="margin-top:10px;">// LIVE RESPONSES</div>
          <div id="ap-replies-live" style="max-height:120px;overflow-y:auto;padding:6px 0;">
            <div style="color:rgba(0,255,136,0.2);font-size:11px;">No replies yet.</div>
          </div>

          <!-- FOOTER -->
          <div class="ap-footer">
            <button class="ap-btn ap-btn-ghost" onclick="openUpdatesPage()">📋 All Updates</button>
            <button class="ap-btn ap-btn-primary" style="--ac:${color}" onclick="closeAnnouncementPopup()">
              ✓ ACKNOWLEDGED
            </button>
          </div>

          <div class="ap-timer">
            <span class="ap-timer-dot"></span>
            Next check in <span id="ap-countdown">40:00</span>
          </div>

        </div>
      </div>
    </div>`;

  document.body.appendChild(popup);
  requestAnimationFrame(() => popup.querySelector(".ap-terminal").classList.add("ap-in"));

  // typewriter
  const msg = ann.message || "";
  const tw = document.getElementById("ap-typewriter");
  let i = 0;
  const timer = setInterval(() => {
    if (i < msg.length) { tw.innerHTML = escHtml(msg.slice(0, ++i)) + '<span class="ap-cursor-blink">▋</span>'; }
    else { tw.innerHTML = escHtml(msg); clearInterval(timer); }
  }, 16);

  startCountdown();
  lastSeenAnnouncementId = ann.id;
  localStorage.setItem("last_seen_announce", ann.id);
}

function escHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

function startCountdown() {
  let s = ANNOUNCE_CHECK_INTERVAL / 1000;
  const el = document.getElementById("ap-countdown"); if (!el) return;
  const t = setInterval(() => {
    if (!document.getElementById("ap-countdown")) { clearInterval(t); return; }
    s--;
    const m = Math.floor(s/60), sec = s%60;
    el.innerText = `${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;
    if (s <= 0) clearInterval(t);
  }, 1000);
}

async function submitReply(annId) {
  const u = document.getElementById("ap-username")?.value.trim() || "Anonymous";
  const m = document.getElementById("ap-message")?.value.trim();
  const s = document.getElementById("ap-reply-status");
  if (!m) { if(s) s.innerText="// Message required"; return; }
  if (s) s.innerText = "// Sending...";
  const ok = await postReply(annId, u, m);
  if (s) s.innerText = ok ? "// ✓ Sent!" : "// ✗ Failed";
  if (ok && document.getElementById("ap-message")) document.getElementById("ap-message").value = "";
}

function closeAnnouncementPopup() {
  const p = document.getElementById("announcePopup"); if (!p) return;
  p.querySelector(".ap-terminal")?.classList.remove("ap-in");
  setTimeout(() => p.remove(), 400);
}

/* ── UPDATES PAGE ── */
function openUpdatesPage() {
  closeAnnouncementPopup();
  document.getElementById("updatesPage")?.remove();
  const page = document.createElement("div");
  page.id = "updatesPage";
  page.innerHTML = `
    <div class="up-container">
      <div class="up-header">
        <div class="up-header-left">
          <div class="up-robot-emoji">🤖</div>
          <div>
            <div class="up-title">// BROADCAST HISTORY</div>
            <div class="up-sub">vscodegodmode — system announcements</div>
          </div>
        </div>
        <button class="up-close" onclick="document.getElementById('updatesPage').remove()">✕ CLOSE</button>
      </div>
      <div id="up-list" class="up-list"><div class="up-loading">// Loading broadcasts...</div></div>
    </div>`;
  document.body.appendChild(page);
  requestAnimationFrame(() => page.querySelector(".up-container").classList.add("up-in"));
  loadUpdatesPage();
}

async function loadUpdatesPage() {
  const list = document.getElementById("up-list"); if (!list) return;
  const anns = await fetchAllAnnouncements();
  if (!anns.length) { list.innerHTML=`<div class="up-empty">// No broadcasts yet.</div>`; return; }
  list.innerHTML = "";
  const colors = { info:"#00d4ff", update:"#00ff88", warning:"#ffaa00", urgent:"#ff4444" };
  for (const ann of anns) {
    const c = colors[ann.type] || "#00d4ff";
    const replies = await fetchReplies(ann.id);
    const item = document.createElement("div"); item.className = "up-item";
    item.innerHTML = `
      <div class="up-item-header" style="border-left:3px solid ${c}">
        <div class="up-item-meta">
          <span class="up-item-type" style="color:${c}">[${(ann.type||"info").toUpperCase()}]</span>
          <span class="up-item-title">${escHtml(ann.title)}</span>
          ${ann.version?`<span class="up-item-version" style="color:${c}">v${escHtml(ann.version)}</span>`:""}
        </div>
        <span class="up-item-date">${ann.date||""}</span>
      </div>
      <div class="up-item-msg">${escHtml(ann.message||"").replace(/\n/g,"<br>")}</div>
      <div class="up-replies">
        <div class="up-replies-title">// ${replies.length} RESPONSE(S)</div>
        ${replies.map(r=>`
          <div class="up-reply">
            <span class="up-reply-user">${escHtml(r.username||"anon")}:~$</span>
            <span class="up-reply-msg">${escHtml(r.message||"")}</span>
            <span class="up-reply-date">${r.date||""}</span>
          </div>`).join("")}
        <div class="up-reply-form-inline">
          <input class="ap-input" id="up-u-${ann.id}" placeholder="your_username" maxlength="30">
          <textarea class="ap-textarea" id="up-m-${ann.id}" placeholder="// Write reply..." rows="2"></textarea>
          <button class="ap-send-btn" onclick="submitReplyPage('${ann.id}')">▶ REPLY</button>
          <span id="up-s-${ann.id}" style="font-size:11px;color:#00ff88;margin-top:4px;"></span>
        </div>
      </div>`;
    list.appendChild(item);
  }
}

async function submitReplyPage(id) {
  const u=document.getElementById("up-u-"+id)?.value.trim()||"Anonymous";
  const m=document.getElementById("up-m-"+id)?.value.trim();
  const s=document.getElementById("up-s-"+id);
  if(!m){if(s)s.innerText="// required";return;}
  if(s)s.innerText="// Sending...";
  const ok=await postReply(id,u,m);
  if(s)s.innerText=ok?"// ✓ Sent!":"// ✗ Failed";
  if(ok&&document.getElementById("up-m-"+id))document.getElementById("up-m-"+id).value="";
}

/* ── ADMIN PASSWORD — beautiful prompt ── */
function openAdminPanel() {
  document.getElementById("adminPasswordPrompt")?.remove();
  const prompt = document.createElement("div");
  prompt.id = "adminPasswordPrompt";
  prompt.innerHTML = `
    <div class="ap-overlay" onclick="document.getElementById('adminPasswordPrompt').remove()"></div>
    <div class="ap-pw-box">
      <div class="ap-pw-header">
        <div class="ap-pw-robot-mini">🤖</div>
        <div class="ap-pw-title-block">
          <div class="ap-pw-label">// RESTRICTED ACCESS</div>
          <div class="ap-pw-title">ADMIN CONTROL</div>
        </div>
      </div>
      <div class="ap-pw-body">
        <div class="ap-pw-hint">
          <span>🔐</span>
          <span>This area is restricted to administrators only. Enter your access code to continue.</span>
        </div>
        <div class="ap-pw-field">
          <label>Access Code</label>
          <input id="ap-pw-input" class="ap-pw-input" type="password" placeholder="••••••••••••" autocomplete="off">
        </div>
        <div id="ap-pw-error" class="ap-pw-error">// ✗ Invalid access code. Access denied.</div>
        <div class="ap-pw-actions">
          <button class="ap-pw-cancel" onclick="document.getElementById('adminPasswordPrompt').remove()">✕ CANCEL</button>
          <button class="ap-pw-submit" onclick="checkAdminPassword()">🔓 AUTHENTICATE</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(prompt);
  requestAnimationFrame(() => prompt.querySelector(".ap-pw-box").classList.add("ap-in"));
  setTimeout(() => document.getElementById("ap-pw-input")?.focus(), 300);
  document.getElementById("ap-pw-input").addEventListener("keydown", e => {
    if (e.key === "Enter") checkAdminPassword();
  });
}

async function checkAdminPassword() {
  const val = document.getElementById("ap-pw-input")?.value;
  const err = document.getElementById("ap-pw-error");
  const realPw = await getAdminPassword();
  if (val === realPw) {
    document.getElementById("adminPasswordPrompt").remove();
    showAdminPanel();
  } else {
    if (err) { err.style.display="block"; err.style.animation="none"; requestAnimationFrame(()=>err.style.animation=""); }
    document.getElementById("ap-pw-input").value = "";
    document.getElementById("ap-pw-input").focus();
    document.getElementById("ap-pw-input").style.borderColor = "#ff4444";
    setTimeout(() => { if(document.getElementById("ap-pw-input")) document.getElementById("ap-pw-input").style.borderColor=""; }, 1000);
  }
}

/* ── ADMIN PANEL ── */
async function showAdminPanel() {
  document.getElementById("adminPanel")?.remove();
  const panel = document.createElement("div");
  panel.id = "adminPanel";
  panel.innerHTML = `
    <div class="adm-container">
      <div class="adm-header">
        <div>
          <div class="adm-title">🔐 ADMIN BROADCAST PANEL</div>
          <div class="adm-sub">// root access granted — vscodegodmode control center</div>
        </div>
        <button class="up-close" onclick="document.getElementById('adminPanel').remove()">✕</button>
      </div>
      <div class="adm-body">
        <div class="adm-field"><label>Broadcast Title *</label><input id="adminTitle" class="ap-input" placeholder="e.g. 🚀 New Update Coming Soon"></div>
        <div class="adm-field"><label>Version</label><input id="announceVersion" class="ap-input" placeholder="e.g. v2.1.0"></div>
        <div class="adm-field">
          <label>Type</label>
          <select id="adminType" class="ap-input" style="cursor:pointer;background:#010308;">
            <option value="info">ℹ INFO</option>
            <option value="update">🚀 UPDATE</option>
            <option value="warning">⚠ WARNING</option>
            <option value="urgent">🚨 URGENT</option>
          </select>
        </div>
        <div class="adm-field"><label>Message *</label><textarea id="adminMessage" class="ap-textarea" rows="6" placeholder="Write your message to all users..."></textarea></div>
        <div class="adm-actions">
          <button class="ap-btn ap-btn-ghost" onclick="previewBroadcast()">👁 Preview</button>
          <button class="ap-btn ap-btn-primary" style="--ac:#00ff88" onclick="sendBroadcast()">📡 BROADCAST</button>
        </div>
        <div id="adminStatus" class="adm-status"></div>
        <div class="adm-divider">─── PAST BROADCASTS ───</div>
        <div id="adminHistory" class="adm-history"><div class="up-loading">// Loading...</div></div>
      </div>
    </div>`;
  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.querySelector(".adm-container").classList.add("up-in"));
  loadAdminHistory();
}

async function loadAdminHistory() {
  const hist = document.getElementById("adminHistory"); if (!hist) return;
  const anns = await fetchAllAnnouncements();
  if (!anns.length) { hist.innerHTML=`<div class="up-empty">// No broadcasts yet.</div>`; return; }
  const colors = { info:"#00d4ff", update:"#00ff88", warning:"#ffaa00", urgent:"#ff4444" };
  hist.innerHTML = anns.map(a=>`
    <div class="adm-hist-item" style="border-left:3px solid ${colors[a.type]||"#00d4ff"}">
      <span style="color:${colors[a.type]||"#00d4ff"};font-size:9px;font-weight:700">[${(a.type||"").toUpperCase()}]</span>
      <span style="color:#c0d8f0;font-size:11px;">${escHtml(a.title)}</span>
      <span style="font-size:10px;color:#1a3a5a">${a.date||""}</span>
      <span class="adm-hist-status" style="color:${a.active?"#00ff88":"#1a4a6a"}">${a.active?"● LIVE":"○ off"}</span>
    </div>`).join("");
}

async function sendBroadcast() {
  const title   = document.getElementById("adminTitle")?.value.trim();
  const message = document.getElementById("adminMessage")?.value.trim();
  const type    = document.getElementById("adminType")?.value || "info";
  const status  = document.getElementById("adminStatus");
  if (!title||!message) { if(status)status.innerText="// Title and message required"; return; }
  if (!confirm(`Broadcast to ALL users?\n\n"${title}"`)) return;
  if (status) status.innerText = "// Sending...";
  const id = await postAnnouncement(title, message, type);
  if (id) {
    if (status) { status.innerText="// ✓ Broadcast sent!"; status.style.color="#00ff88"; }
    document.getElementById("adminTitle").value="";
    document.getElementById("adminMessage").value="";
    loadAdminHistory();
    if (typeof showToast==="function") showToast("📡 Broadcast sent!","success");
  } else {
    if (status) { status.innerText="// ✗ Failed — check Firebase"; status.style.color="#ff4444"; }
  }
}

function previewBroadcast() {
  const title   = document.getElementById("adminTitle")?.value.trim() || "Preview";
  const message = document.getElementById("adminMessage")?.value.trim() || "Preview message";
  const type    = document.getElementById("adminType")?.value || "info";
  document.getElementById("adminPanel")?.remove();
  showAnnouncementPopup({ id:"preview", title, message, type, date:new Date().toLocaleString(), version:document.getElementById("announceVersion")?.value||"" });
}

/* ── START SYSTEM ── */
function startAnnouncementSystem() {
  setTimeout(() => checkAndShowPopup(), 3000);
  announceCheckTimer = setInterval(() => checkAndShowPopup(), ANNOUNCE_CHECK_INTERVAL);
}