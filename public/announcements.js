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

/* ── GLASS CARD BROADCAST POPUP ── */
const ADMIN_NAME = "MLD Codes";
const ADMIN_AVATAR_DEFAULT = "images/admin-avatar.png"; // fallback if none uploaded yet
const ADMIN_WHATSAPP = "256751971461"; // no + no leading 0

let _cachedAdminAvatar = null;
async function getAdminAvatarUrl() {
  if (_cachedAdminAvatar) return _cachedAdminAvatar;
  try {
    const db = await initAnnounceDB(); if (!db) return ADMIN_AVATAR_DEFAULT;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", "config"));
    const url = snap.exists() ? snap.data().adminAvatarUrl : null;
    _cachedAdminAvatar = url || ADMIN_AVATAR_DEFAULT;
    return _cachedAdminAvatar;
  } catch { return ADMIN_AVATAR_DEFAULT; }
}

async function showAnnouncementPopup(ann) {
  if (!ann?.message || ann.message.includes("emmetMonaco") || ann.message.includes("function") || ann.message.length > 300) return;
  document.getElementById("announcePopup")?.remove();

  const avatarUrl = await getAdminAvatarUrl();
  const typeColors = { info:"rgba(255,255,255,0.15)", update:"rgba(37,211,102,0.25)", warning:"rgba(255,170,0,0.25)", urgent:"rgba(255,68,68,0.3)" };
  const typeIcons  = { info:"ℹ️", update:"🚀", warning:"⚠️", urgent:"🚨" };
  const badgeBg = typeColors[ann.type] || typeColors.info;
  const icon  = typeIcons[ann.type]  || "ℹ️";
  const waMsg = encodeURIComponent(`Hi, I saw your broadcast: "${ann.title || ""}"`);

  const popup = document.createElement("div");
  popup.id = "announcePopup";
  popup.innerHTML = `
    <div class="gc-overlay" onclick="closeAnnouncementPopup()"></div>

    <div class="gc-card">
      <div class="gc-close" onclick="closeAnnouncementPopup()">✕</div>

      <div class="gc-name-top">${ADMIN_NAME}</div>

      <div class="gc-head2">
        <div class="gc-avatar-ring2"><img src="${avatarUrl}" onerror="this.style.display='none'"></div>
        <div class="gc-stats-row">
          <div class="gc-stat">
            <div class="gc-stat-label">${icon} ${(ann.type||"info").toUpperCase()}</div>
            <div class="gc-stat-value">Broadcast</div>
          </div>
          ${ann.version ? `<div class="gc-stat"><div class="gc-stat-label">version</div><div class="gc-stat-value">v${escHtml(ann.version)}</div></div>` : ""}
          <div class="gc-stat">
            <div class="gc-stat-label">date</div>
            <div class="gc-stat-value" style="font-size:13px;">${ann.date || ""}</div>
          </div>
        </div>
      </div>

      <div class="gc-bio">
        <div class="gc-bio-line"><strong>${escHtml(ann.title)}</strong></div>
        <div class="gc-bio-line" id="ap-typewriter"></div>
      </div>

      <div class="gc-btn-row2">
        <button class="gc-btn2 gc-btn-follow" onclick="closeAnnouncementPopup()">Acknowledge</button>
        <button class="gc-btn2 gc-btn-msg2" onclick="document.getElementById('gc-reply-panel').classList.toggle('gc-open')">Message</button>
        <button class="gc-btn2 gc-btn-wa2" onclick="window.open('https://wa.me/${ADMIN_WHATSAPP}?text=${waMsg}','_blank')">WhatsApp</button>
        <div class="gc-wa-circle" onclick="window.open('https://wa.me/${ADMIN_WHATSAPP}?text=${waMsg}','_blank')">💬</div>
      </div>

      <div class="gc-reply-panel2" id="gc-reply-panel">
        <div class="gc-reply-title">Send a reply</div>
        <input id="ap-username" class="gc-input" placeholder="your_username" maxlength="30">
        <textarea id="ap-message" class="gc-textarea" placeholder="Type your message..." rows="3"></textarea>
        <div class="gc-send-row">
          <button class="gc-send-btn" onclick="submitReply('${ann.id}')">Send</button>
          <span id="ap-reply-status" class="gc-reply-status"></span>
        </div>
        <div class="gc-reply-title" style="margin-top:10px;">Live responses</div>
        <div id="ap-replies-live" class="gc-replies-live">
          <div style="opacity:0.4;">No replies yet.</div>
        </div>
      </div>
    </div>`;

  document.body.appendChild(popup);
  popup.querySelectorAll(".gc-stat-value").forEach(el => {
    let size = 16;
    while (el.scrollWidth > el.clientWidth + 1 && size > 10) {
      size -= 1;
      el.style.fontSize = size + "px";
    }
  });
  requestAnimationFrame(() => popup.querySelector(".gc-card").classList.add("gc-in"));

  // typewriter
  const msg = ann.message || "";
  const tw = document.getElementById("ap-typewriter");
  let i = 0;
  const timer = setInterval(() => {
    if (i < msg.length) { tw.innerHTML = escHtml(msg.slice(0, ++i)) + '<span class="gc-cursor-blink">▋</span>'; }
    else { tw.innerHTML = escHtml(msg); clearInterval(timer); }
  }, 16);

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

async function deleteAnnouncement(id) {
  if (!confirm("Delete this broadcast permanently?")) return;
  try {
    const db = await initAnnounceDB(); if (!db) return;
    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(doc(db, ANNOUNCE_COLLECTION, id));
    if (typeof showToast === "function") showToast("Broadcast deleted", "info");
    loadUpdatesPage();
  } catch(e) { if (typeof showToast === "function") showToast("Failed: " + e.message, "error"); }
}

async function loadUpdatesPage() {
  const list = document.getElementById("up-list"); if (!list) return;
  const anns = await fetchAllAnnouncements();
  if (!anns.length) { list.innerHTML=`<div class="up-empty">// No broadcasts yet.</div>`; return; }
  list.innerHTML = "";
  const colors = { info:"#00d4ff", update:"#00ff88", warning:"#ffaa00", urgent:"#ff4444" };

  // check if admin is logged in (panel was opened this session)
  const isAdmin = typeof adminPanelOpen !== "undefined" && adminPanelOpen === false && localStorage.getItem("adm_authed") === "1";

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
    localStorage.setItem("adm_authed", "1");
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

/* ── START SYSTEM ── */
function startAnnouncementSystem() {
  setTimeout(() => checkAndShowPopup(), 3000);
  announceCheckTimer = setInterval(() => checkAndShowPopup(), ANNOUNCE_CHECK_INTERVAL);
}