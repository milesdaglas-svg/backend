/* =========================
   ANNOUNCEMENTS SYSTEM
   - Firebase realtime storage
   - Admin broadcast
   - User popup every 40 mins
   - Reply/concerns system
========================= */

const ANNOUNCE_CHECK_INTERVAL = 40 * 60 * 1000; // 40 minutes
const ADMIN_PASSWORD = "vscodegodmode2025"; // change this!
const ANNOUNCE_COLLECTION = "announcements";
const REPLIES_COLLECTION  = "replies";

let announceDB = null;
let lastSeenAnnouncementId = localStorage.getItem("last_seen_announce") || null;
let announceCheckTimer = null;

/* =========================
   INIT FIREBASE FOR ANNOUNCEMENTS
========================= */
async function initAnnounceDB() {
  if (announceDB) return announceDB;
  const cfg = getFirebaseConfig ? getFirebaseConfig() : null;
  if (!cfg?.apiKey) return null;
  try {
    const { initializeApp, getApps } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const app = getApps().length ? getApps()[0] : initializeApp(cfg);
    announceDB = getFirestore(app);
    return announceDB;
  } catch(e) { console.warn("Announce DB:", e.message); return null; }
}

async function getFirestoreFns() {
  await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  const m = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
  return m;
}

/* =========================
   FETCH LATEST ANNOUNCEMENT
========================= */
async function fetchLatestAnnouncement() {
  const db = await initAnnounceDB();
  if (!db) return null;
  try {
    const { collection, getDocs, query, orderBy, limit, where } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const q = query(
      collection(db, ANNOUNCE_COLLECTION),
      where("active", "==", true),
      orderBy("timestamp", "desc"),
      limit(1)
    );
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { id: snap.docs[0].id, ...snap.docs[0].data() };
  } catch(e) { console.warn("Fetch announce:", e.message); return null; }
}

async function fetchAllAnnouncements() {
  const db = await initAnnounceDB();
  if (!db) return [];
  try {
    const { collection, getDocs, query, orderBy, limit } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const q = query(collection(db, ANNOUNCE_COLLECTION), orderBy("timestamp","desc"), limit(20));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { return []; }
}

async function fetchReplies(announcementId) {
  const db = await initAnnounceDB();
  if (!db) return [];
  try {
    const { collection, getDocs, query, orderBy, where } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const q = query(collection(db, REPLIES_COLLECTION), where("announcementId","==",announcementId), orderBy("timestamp","asc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) { return []; }
}

/* =========================
   POST ANNOUNCEMENT (admin)
========================= */
async function postAnnouncement(title, message, type="info") {
  const db = await initAnnounceDB();
  if (!db) { alert("Firebase not configured in Settings → Cloud tab"); return false; }
  try {
    const { collection, addDoc, getDocs, query, updateDoc, doc, where } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    // deactivate old ones
    const old = await getDocs(query(collection(db, ANNOUNCE_COLLECTION), where("active","==",true)));
    for (const d of old.docs) await updateDoc(doc(db, ANNOUNCE_COLLECTION, d.id), { active: false });
    // post new
    const ref = await addDoc(collection(db, ANNOUNCE_COLLECTION), {
      title, message, type,
      active: true,
      timestamp: Date.now(),
      date: new Date().toLocaleString(),
      version: document.getElementById("announceVersion")?.value || ""
    });
    return ref.id;
  } catch(e) { alert("Error: " + e.message); return false; }
}

async function postReply(announcementId, username, message) {
  const db = await initAnnounceDB();
  if (!db) return false;
  try {
    const { collection, addDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await addDoc(collection(db, REPLIES_COLLECTION), {
      announcementId, username, message,
      timestamp: Date.now(),
      date: new Date().toLocaleString()
    });
    return true;
  } catch(e) { return false; }
}

/* =========================
   POPUP SYSTEM
   Shows every 40 mins if
   there's a new announcement
========================= */
async function checkAndShowPopup(force = false) {
  const ann = await fetchLatestAnnouncement();
  if (!ann) return;

  const isNew   = ann.id !== lastSeenAnnouncementId;
  const timeKey = "announce_last_shown_" + ann.id;
  const lastShown = parseInt(localStorage.getItem(timeKey) || "0");
  const now = Date.now();
  const shouldShow = force || isNew || (now - lastShown > ANNOUNCE_CHECK_INTERVAL);

  if (!shouldShow) return;

  localStorage.setItem(timeKey, String(now));
  showAnnouncementPopup(ann);
}

function showAnnouncementPopup(ann) {
  // Remove existing popup
  document.getElementById("announcePopup")?.remove();

  const typeColors = { info:"#00d4ff", update:"#00ff88", warning:"#ffaa00", urgent:"#ff4444" };
  const typeIcons  = { info:"ℹ", update:"🚀", warning:"⚠", urgent:"🚨" };
  const color = typeColors[ann.type] || typeColors.info;
  const icon  = typeIcons[ann.type]  || typeIcons.info;

  const popup = document.createElement("div");
  popup.id = "announcePopup";
  popup.innerHTML = `
    <div class="ap-overlay"></div>
    <div class="ap-terminal">

      <!-- SCANLINES -->
      <div class="ap-scanlines"></div>

      <!-- HEADER -->
      <div class="ap-header" style="--ac:${color}">
        <div class="ap-header-left">
          <div class="ap-robot">
            <div class="ap-robot-head">
              <div class="ap-robot-eye left"></div>
              <div class="ap-robot-eye right"></div>
              <div class="ap-robot-mouth"></div>
            </div>
            <div class="ap-robot-body">
              <div class="ap-robot-antenna"></div>
            </div>
          </div>
          <div class="ap-title-block">
            <div class="ap-label">// SYSTEM BROADCAST</div>
            <div class="ap-title">${escapeHtml(ann.title)}</div>
          </div>
        </div>
        <div class="ap-type-badge" style="background:${color}20;border-color:${color};color:${color}">
          ${icon} ${ann.type.toUpperCase()}
        </div>
      </div>

      <!-- TERMINAL BODY -->
      <div class="ap-body">
        <div class="ap-prompt-line">
          <span class="ap-prompt">root@vscodegodmode:~$</span>
          <span class="ap-cmd"> cat /sys/broadcast/latest.txt</span>
        </div>
        <div class="ap-output">
          <div class="ap-output-line">
            <span class="ap-key">DATE    :</span>
            <span class="ap-val">${ann.date}</span>
          </div>
          ${ann.version ? `<div class="ap-output-line"><span class="ap-key">VERSION :</span><span class="ap-val" style="color:${color}">${escapeHtml(ann.version)}</span></div>` : ""}
          <div class="ap-output-line">
            <span class="ap-key">STATUS  :</span>
            <span class="ap-val" style="color:${color}">● ACTIVE</span>
          </div>
          <div class="ap-divider">─────────────────────────────</div>
          <div class="ap-message">${escapeHtml(ann.message).replace(/\n/g,"<br>")}</div>
          <div class="ap-divider">─────────────────────────────</div>
        </div>

        <!-- REPLY SECTION -->
        <div class="ap-reply-section">
          <div class="ap-prompt-line">
            <span class="ap-prompt">root@vscodegodmode:~$</span>
            <span class="ap-cmd"> reply --to broadcast</span>
          </div>
          <div class="ap-reply-form">
            <input id="ap-username" class="ap-input" placeholder="your_username" maxlength="30">
            <textarea id="ap-message" class="ap-textarea" placeholder="// Type your message or concern here..." rows="3"></textarea>
            <button class="ap-send-btn" onclick="submitReply('${ann.id}')">
              <span>▶</span> SEND REPLY
            </button>
          </div>
          <div id="ap-reply-status" class="ap-reply-status"></div>
        </div>

        <!-- FOOTER BUTTONS -->
        <div class="ap-footer">
          <button class="ap-btn ap-btn-secondary" onclick="openUpdatesPage()">
            📋 VIEW ALL UPDATES
          </button>
          <button class="ap-btn ap-btn-primary" onclick="closeAnnouncementPopup()" style="--ac:${color}">
            ✓ ACKNOWLEDGED
          </button>
        </div>

        <!-- TIMER -->
        <div class="ap-timer">
          <span class="ap-timer-dot"></span>
          Next broadcast check in <span id="ap-countdown">40:00</span>
        </div>
      </div>

    </div>`;

  document.body.appendChild(popup);

  // Animate in
  requestAnimationFrame(() => popup.querySelector(".ap-terminal").classList.add("ap-in"));

  // Type out the message character by character
  typewriterEffect();

  // Start countdown
  startCountdown();

  // Mark as seen
  lastSeenAnnouncementId = ann.id;
  localStorage.setItem("last_seen_announce", ann.id);
}

function typewriterEffect() {
  const msg = document.querySelector(".ap-message");
  if (!msg) return;
  const text = msg.innerHTML;
  msg.innerHTML = "";
  msg.style.opacity = "1";
  let i = 0;
  const timer = setInterval(() => {
    if (i < text.length) { msg.innerHTML = text.slice(0, i+1) + '<span class="ap-cursor">▋</span>'; i++; }
    else { msg.innerHTML = text; clearInterval(timer); }
  }, 18);
}

function startCountdown() {
  let seconds = ANNOUNCE_CHECK_INTERVAL / 1000;
  const el = document.getElementById("ap-countdown");
  if (!el) return;
  const t = setInterval(() => {
    seconds--;
    if (seconds <= 0 || !document.getElementById("ap-countdown")) { clearInterval(t); return; }
    const m = Math.floor(seconds/60), s = seconds%60;
    el.innerText = `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;
  }, 1000);
}

async function submitReply(announcementId) {
  const username = document.getElementById("ap-username")?.value.trim() || "Anonymous";
  const message  = document.getElementById("ap-message")?.value.trim();
  const status   = document.getElementById("ap-reply-status");
  if (!message) { if(status) status.innerText="// Please type a message first"; return; }
  if(status) status.innerText = "// Sending...";
  const ok = await postReply(announcementId, username, message);
  if(status) status.innerText = ok ? "// ✓ Reply sent successfully!" : "// ✗ Failed — check Firebase config";
  if(ok && document.getElementById("ap-message")) document.getElementById("ap-message").value = "";
}

function closeAnnouncementPopup() {
  const popup = document.getElementById("announcePopup");
  if (!popup) return;
  popup.querySelector(".ap-terminal")?.classList.remove("ap-in");
  setTimeout(() => popup.remove(), 400);
}

function escapeHtml(s){ return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

/* =========================
   UPDATES PAGE (in-app)
========================= */
function openUpdatesPage() {
  closeAnnouncementPopup();
  document.getElementById("updatesPage")?.remove();

  const page = document.createElement("div");
  page.id = "updatesPage";
  page.innerHTML = `
    <div class="up-container">
      <div class="up-header">
        <div class="up-header-left">
          <div class="up-robot-small">🤖</div>
          <div>
            <div class="up-title">// BROADCAST HISTORY</div>
            <div class="up-sub">root@vscodegodmode — system announcements</div>
          </div>
        </div>
        <button class="up-close" onclick="document.getElementById('updatesPage').remove()">✕ CLOSE</button>
      </div>
      <div id="up-list" class="up-list">
        <div class="up-loading">// Loading broadcasts...</div>
      </div>
    </div>`;
  document.body.appendChild(page);
  requestAnimationFrame(() => page.querySelector(".up-container").classList.add("up-in"));
  loadUpdatesPage();
}

async function loadUpdatesPage() {
  const list = document.getElementById("up-list");
  if (!list) return;
  const anns = await fetchAllAnnouncements();
  if (!anns.length) { list.innerHTML=`<div class="up-empty">// No broadcasts yet.</div>`; return; }

  list.innerHTML = "";
  for (const ann of anns) {
    const typeColors = { info:"#00d4ff", update:"#00ff88", warning:"#ffaa00", urgent:"#ff4444" };
    const color = typeColors[ann.type] || "#00d4ff";
    const replies = await fetchReplies(ann.id);

    const item = document.createElement("div");
    item.className = "up-item";
    item.innerHTML = `
      <div class="up-item-header" style="border-left:3px solid ${color}">
        <div class="up-item-meta">
          <span class="up-item-type" style="color:${color}">[${ann.type?.toUpperCase()||"INFO"}]</span>
          <span class="up-item-title">${escapeHtml(ann.title)}</span>
          ${ann.version?`<span class="up-item-version" style="color:${color}">v${escapeHtml(ann.version)}</span>`:""}
        </div>
        <span class="up-item-date">${ann.date||""}</span>
      </div>
      <div class="up-item-msg">${escapeHtml(ann.message||"").replace(/\n/g,"<br>")}</div>
      <div class="up-replies">
        <div class="up-replies-title">// ${replies.length} USER RESPONSE(S)</div>
        ${replies.map(r=>`
          <div class="up-reply">
            <span class="up-reply-user">${escapeHtml(r.username||"anon")}@user:~$</span>
            <span class="up-reply-msg">${escapeHtml(r.message||"")}</span>
            <span class="up-reply-date">${r.date||""}</span>
          </div>`).join("")}
        <div class="up-reply-form-inline">
          <input class="ap-input" id="up-uname-${ann.id}" placeholder="your_username" maxlength="30">
          <textarea class="ap-textarea" id="up-msg-${ann.id}" placeholder="// Write your reply..." rows="2"></textarea>
          <button class="ap-send-btn" style="font-size:12px;padding:7px 14px;" onclick="submitReplyFromPage('${ann.id}')">▶ REPLY</button>
          <span id="up-status-${ann.id}" style="font-size:11px;color:#666;margin-left:8px;"></span>
        </div>
      </div>`;
    list.appendChild(item);
  }
}

async function submitReplyFromPage(annId) {
  const u = document.getElementById("up-uname-"+annId)?.value.trim()||"Anonymous";
  const m = document.getElementById("up-msg-"+annId)?.value.trim();
  const s = document.getElementById("up-status-"+annId);
  if(!m){if(s)s.innerText="// Message required";return;}
  if(s)s.innerText="// Sending...";
  const ok = await postReply(annId, u, m);
  if(s)s.innerText = ok?"// ✓ Sent!":"// ✗ Failed";
  if(ok&&document.getElementById("up-msg-"+annId)) document.getElementById("up-msg-"+annId).value="";
}

/* =========================
   ADMIN PANEL (in-app)
========================= */
function openAdminPanel() {
  const pw = prompt("Admin password:");
  if (pw !== ADMIN_PASSWORD) { showToast("Wrong password","error"); return; }

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
        <div class="adm-field"><label>Version (optional)</label><input id="announceVersion" class="ap-input" placeholder="e.g. v2.1.0"></div>
        <div class="adm-field">
          <label>Type</label>
          <select id="adminType" class="ap-input" style="cursor:pointer;">
            <option value="info">ℹ INFO — general message</option>
            <option value="update">🚀 UPDATE — new features</option>
            <option value="warning">⚠ WARNING — maintenance</option>
            <option value="urgent">🚨 URGENT — critical notice</option>
          </select>
        </div>
        <div class="adm-field"><label>Message *</label><textarea id="adminMessage" class="ap-textarea" rows="6" placeholder="Write your message to all users here...&#10;&#10;You can use multiple lines."></textarea></div>
        <div class="adm-actions">
          <button class="ap-btn ap-btn-secondary" onclick="previewBroadcast()">👁 Preview</button>
          <button class="ap-btn ap-btn-primary" style="--ac:#00ff88" onclick="sendBroadcast()">📡 BROADCAST TO ALL USERS</button>
        </div>
        <div id="adminStatus" class="adm-status"></div>

        <div class="adm-divider">─── PAST BROADCASTS ───</div>
        <div id="adminHistory" class="adm-history">
          <div class="up-loading">// Loading...</div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(panel);
  requestAnimationFrame(()=>panel.querySelector(".adm-container").classList.add("up-in"));
  loadAdminHistory();
}

async function loadAdminHistory() {
  const hist = document.getElementById("adminHistory"); if(!hist) return;
  const anns = await fetchAllAnnouncements();
  if(!anns.length){hist.innerHTML=`<div class="up-empty">// No broadcasts yet.</div>`;return;}
  const typeColors={info:"#00d4ff",update:"#00ff88",warning:"#ffaa00",urgent:"#ff4444"};
  hist.innerHTML = anns.map(a=>`
    <div class="adm-hist-item" style="border-left:3px solid ${typeColors[a.type]||"#00d4ff"}">
      <span class="up-item-type" style="color:${typeColors[a.type]||"#00d4ff"}">[${a.type?.toUpperCase()||"INFO"}]</span>
      <span class="up-item-title">${escapeHtml(a.title)}</span>
      <span class="up-item-date">${a.date||""}</span>
      <span class="adm-hist-status">${a.active?"● ACTIVE":"○ inactive"}</span>
    </div>`).join("");
}

async function sendBroadcast() {
  const title   = document.getElementById("adminTitle")?.value.trim();
  const message = document.getElementById("adminMessage")?.value.trim();
  const type    = document.getElementById("adminType")?.value||"info";
  const status  = document.getElementById("adminStatus");
  if(!title||!message){if(status)status.innerText="// Title and message required";return;}
  if(!confirm(`Broadcast to ALL users?\n\n"${title}"\n\nThis will pop up on everyone's screen within 40 minutes.`)) return;
  if(status)status.innerText="// Sending broadcast...";
  const id = await postAnnouncement(title, message, type);
  if(id){
    if(status){status.innerText="// ✓ Broadcast sent! ID: "+id;status.style.color="#00ff88";}
    document.getElementById("adminTitle").value="";
    document.getElementById("adminMessage").value="";
    loadAdminHistory();
    showToast("📡 Broadcast sent to all users!","success");
  } else {
    if(status){status.innerText="// ✗ Failed — check Firebase";status.style.color="#ff4444";}
  }
}

function previewBroadcast() {
  const title   = document.getElementById("adminTitle")?.value.trim()||"Preview Title";
  const message = document.getElementById("adminMessage")?.value.trim()||"Preview message...";
  const type    = document.getElementById("adminType")?.value||"info";
  document.getElementById("adminPanel")?.remove();
  showAnnouncementPopup({ id:"preview", title, message, type, date:new Date().toLocaleString(), version:document.getElementById("announceVersion")?.value||"" });
}

/* =========================
   START CHECKING ON LOAD
========================= */
function startAnnouncementSystem() {
  // Check immediately after 3 seconds
  setTimeout(() => checkAndShowPopup(), 3000);
  // Then every 40 minutes
  announceCheckTimer = setInterval(() => checkAndShowPopup(), ANNOUNCE_CHECK_INTERVAL);
}