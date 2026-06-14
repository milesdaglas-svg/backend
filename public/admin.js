/* =========================
   ADMIN PANEL v2
   - Full cool redesign
   - IP tracking
   - Online members / visitors
   - Real-time stats
   - Access from anywhere in app
========================= */

const ADMIN_PASS        = "vscodegodmode2025"; // change this!
const VISITORS_COL      = "visitors";
const SESSIONS_COL      = "sessions";
let adminDB             = null;
let visitorSessionId    = localStorage.getItem("visitor_session") || null;
let adminPanelOpen      = false;
let adminStatsTimer     = null;

/* ══════════════════════════════
   VISITOR TRACKING
   Runs for every user on load
══════════════════════════════ */
async function initVisitorTracking() {
  // get user IP from free API
  let ip = "unknown", country = "", city = "", isp = "";
  try {
    const r = await fetch("https://ipapi.co/json/");
    const d = await r.json();
    ip = d.ip || "unknown";
    country = d.country_name || "";
    city    = d.city || "";
    isp     = d.org || "";
  } catch {
    try {
      const r2 = await fetch("https://api.ipify.org?format=json");
      const d2 = await r2.json();
      ip = d2.ip || "unknown";
    } catch {}
  }

  const db = await initAnnounceDB(); if (!db) return;

  try {
    const { collection, addDoc, doc, setDoc, serverTimestamp, updateDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    const sessionData = {
      ip, country, city, isp,
      userAgent:  navigator.userAgent,
      platform:   navigator.platform,
      language:   navigator.language,
      screen:     `${screen.width}x${screen.height}`,
      referrer:   document.referrer || "direct",
      page:       window.location.href,
      online:     true,
      lastSeen:   Date.now(),
      firstSeen:  Date.now(),
      visitCount: 1,
      device:     /Mobi|Android/i.test(navigator.userAgent) ? "📱 Mobile" : "💻 Desktop"
    };

    if (!visitorSessionId) {
      // new session
      const ref = await addDoc(collection(db, SESSIONS_COL), sessionData);
      visitorSessionId = ref.id;
      localStorage.setItem("visitor_session", ref.id);
      // also log to visitors collection
      await addDoc(collection(db, VISITORS_COL), { ...sessionData, sessionId: ref.id });
    } else {
      // update existing session
      try {
        await updateDoc(doc(db, SESSIONS_COL, visitorSessionId), {
          online: true, lastSeen: Date.now(), page: window.location.href
        });
      } catch {
        // session expired, create new
        const ref = await addDoc(collection(db, SESSIONS_COL), sessionData);
        visitorSessionId = ref.id;
        localStorage.setItem("visitor_session", ref.id);
      }
    }

    // heartbeat — keeps "online" status fresh every 10 seconds
    async function sendHeartbeat() {
      try {
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        if (visitorSessionId) {
          await updateDoc(doc(db, SESSIONS_COL, visitorSessionId), {
            online: true, lastSeen: Date.now()
          });
        }
      } catch {}
    }
    setInterval(sendHeartbeat, 10000);

    // also send heartbeat instantly when tab becomes visible/focused again
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") sendHeartbeat();
    });
    window.addEventListener("focus", sendHeartbeat);

    // mark offline on page leave
    window.addEventListener("beforeunload", async () => {
      try {
        const { doc, updateDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
        if (visitorSessionId) {
          await updateDoc(doc(db, SESSIONS_COL, visitorSessionId), { online: false });
        }
      } catch {}
    });

  } catch(e) { console.warn("Visitor tracking:", e.message); }
}

/* ══════════════════════════════
   FETCH STATS FOR ADMIN
══════════════════════════════ */
async function fetchAdminStats() {
  const db = await initAnnounceDB(); if (!db) return null;
  try {
    const { collection, getDocs, query, orderBy, limit, where } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");

    // online now = sessions with lastSeen in last 60 seconds
    const onlineThresh = Date.now() - 25000;
    const allSessions  = await getDocs(collection(db, SESSIONS_COL));
    const sessions     = allSessions.docs.map(d => ({ id: d.id, ...d.data() }));
    const online       = sessions.filter(s => s.lastSeen > onlineThresh);
    const allVisitors  = await getDocs(collection(db, VISITORS_COL));

    // count by country
    const byCountry = {};
    sessions.forEach(s => {
      const c = s.country || "Unknown";
      byCountry[c] = (byCountry[c] || 0) + 1;
    });

    // count by device
    const mobile  = sessions.filter(s => s.device?.includes("Mobile")).length;
    const desktop = sessions.length - mobile;

    return {
      totalSessions:  sessions.length,
      totalVisitors:  allVisitors.size,
      onlineNow:      online,
      onlineCount:    online.length,
      byCountry,
      mobile, desktop,
      recentSessions: sessions.sort((a,b) => (b.lastSeen||0)-(a.lastSeen||0)).slice(0,20)
    };
  } catch(e) { console.warn("Stats:", e.message); return null; }
}

/* ══════════════════════════════
   SHOW ADMIN PANEL
══════════════════════════════ */
async function showAdminPanel() {
  document.getElementById("adminPanel")?.remove();
  adminPanelOpen = true;

  const panel = document.createElement("div");
  panel.id = "adminPanel";
  panel.innerHTML = `
    <div class="adm-overlay" onclick="closeAdminPanel()"></div>
    <div class="adm-window">

      <!-- SIDEBAR NAV -->
      <div class="adm-sidebar">
        <div class="adm-sidebar-logo">
          <div class="adm-logo-robot">🤖</div>
          <div class="adm-logo-text">
            <div class="adm-logo-title">ADMIN</div>
            <div class="adm-logo-sub">vscodegodmode</div>
          </div>
        </div>

        <nav class="adm-nav">
          <button class="adm-nav-btn active" onclick="admTab('dashboard',this)">
            <span class="adm-nav-icon">📊</span><span>Dashboard</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('visitors',this)">
            <span class="adm-nav-icon">👥</span><span>Visitors</span>
            <span id="adm-online-badge" class="adm-badge">0</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('broadcast',this)">
            <span class="adm-nav-icon">📡</span><span>Broadcast</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('history',this)">
            <span class="adm-nav-icon">📋</span><span>History</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('global',this)">
  <span class="adm-nav-icon">🌍</span><span>Global</span>
</button>
          <button class="adm-nav-btn" onclick="admTab('stats',this)">
                <span class="adm-nav-icon">📈</span><span>Stats</span>
              </button>
          <button class="adm-nav-btn" onclick="admTab('ads',this)">
            <span class="adm-nav-icon">📢</span><span>Ads</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('ads',this)">
            <span class="adm-nav-icon">📢</span><span>Ads</span>
          </button>
        </nav>

        <div class="adm-sidebar-footer">
          <div class="adm-status-dot"></div>
          <span>Admin Connected</span>
        </div>
      </div>

      <!-- MAIN CONTENT -->
      <div class="adm-main">

        <!-- TOP BAR -->
        <div class="adm-topbar">
          <div class="adm-topbar-left">
            <div class="adm-breadcrumb">root@vscodegodmode <span class="adm-bc-sep">/</span> <span id="adm-current-tab-name">dashboard</span></div>
          </div>
          <div class="adm-topbar-right">
            <div class="adm-time" id="adm-clock"></div>
            <button class="adm-close-btn" onclick="closeAdminPanel()">✕ EXIT</button>
          </div>
        </div>

        <!-- TABS CONTENT -->
        <div class="adm-content">

          <!-- ── DASHBOARD ── -->
          <div class="adm-tab active" id="adm-tab-dashboard">
            <div class="adm-stats-grid" id="adm-stats-grid">
              <div class="adm-stat-card loading">
                <div class="adm-stat-icon">⟳</div>
                <div class="adm-stat-val">—</div>
                <div class="adm-stat-label">Loading...</div>
              </div>
            </div>

            <div class="adm-section-title">// LIVE FEED</div>
            <div id="adm-live-feed" class="adm-live-feed">
              <div class="adm-feed-loading">// Connecting to live feed...</div>
            </div>
          </div>

          <!-- ── VISITORS ── -->
          <div class="adm-tab" id="adm-tab-visitors">
            <div class="adm-section-title">// ONLINE NOW <span id="adm-online-count" class="adm-online-count">0</span></div>
            <div id="adm-online-list" class="adm-visitor-list">
              <div class="adm-feed-loading">// Loading...</div>
            </div>
            <div class="adm-section-title" style="margin-top:16px;">// ALL SESSIONS</div>
            <div id="adm-all-sessions" class="adm-visitor-list">
              <div class="adm-feed-loading">// Loading...</div>
            </div>
          </div>

          <!-- ── BROADCAST ── -->
          <div class="adm-tab" id="adm-tab-broadcast">
            <div class="adm-section-title">// SEND BROADCAST</div>
            <div class="adm-form">
              <div class="adm-field"><label>Title *</label><input id="adminTitle" class="adm-input" placeholder="e.g. 🚀 New Update Coming Soon"></div>
              <div class="adm-field"><label>Version</label><input id="announceVersion" class="adm-input" placeholder="e.g. v2.1.0"></div>
              <div class="adm-field">
                <label>Type</label>
                <select id="adminType" class="adm-input" style="cursor:pointer;">
                  <option value="info">ℹ INFO — general message</option>
                  <option value="update">🚀 UPDATE — new features</option>
                  <option value="warning">⚠ WARNING — maintenance</option>
                  <option value="urgent">🚨 URGENT — critical</option>
                </select>
              </div>
              <div class="adm-field"><label>Message *</label><textarea id="adminMessage" class="adm-textarea" rows="6" placeholder="Write your message to all users...&#10;&#10;Supports multiple lines."></textarea></div>
              <div class="adm-form-actions">
                <button class="adm-btn adm-btn-ghost" onclick="previewBroadcast()">👁 Preview</button>
                <button class="adm-btn adm-btn-primary" onclick="sendBroadcast()">📡 BROADCAST TO ALL</button>
              </div>
              <div id="adminStatus" class="adm-form-status"></div>
            </div>
          </div>

          <!-- ── ADS ── -->
          <div class="adm-tab" id="adm-tab-ads">
            <div id="adm-ads-content">// Loading ad controls...</div>
          </div>

          <!-- ── ADS ── -->
          <div class="adm-tab" id="adm-tab-ads">
            <div id="adm-ads-content">
              <div class="adm-feed-loading">// Loading ad controls...</div>
            </div>
          </div>

          <!-- ── GLOBAL ── -->
          <div class="adm-tab" id="adm-tab-global">
            <div id="adm-global-content">
              <div class="adm-feed-loading">// Loading global settings...</div>
            </div>
          </div>

          <!-- ── STATS ── -->
          <div class="adm-tab" id="adm-tab-stats">
            <div id="adm-stats-content">
              <div class="adm-feed-loading">// Click to load stats...</div>
            </div>
          </div>

          <!-- ── HISTORY ── -->
          <div class="adm-tab" id="adm-tab-history">
            <div class="adm-section-title">// BROADCAST HISTORY</div>
            <div id="adminHistory" class="adm-history-list">
              <div class="adm-feed-loading">// Loading...</div>
            </div>
          </div>

        </div>
      </div>
    </div>`;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.querySelector(".adm-window").classList.add("adm-in"));

  // clock
  const clockEl = document.getElementById("adm-clock");
  const clockTick = () => { if(clockEl) clockEl.innerText = new Date().toLocaleTimeString(); };
  clockTick(); setInterval(clockTick, 1000);

  // load data
  await loadAdminDashboard();

  // auto-refresh stats every 15 seconds
  adminStatsTimer = setInterval(loadAdminDashboard, 15000);
}

function closeAdminPanel() {
  const p = document.getElementById("adminPanel"); if (!p) return;
  p.querySelector(".adm-window")?.classList.remove("adm-in");
  clearInterval(adminStatsTimer);
  adminPanelOpen = false;
  setTimeout(() => p.remove(), 400);
}

/* ── TAB SWITCH ── */
function admTab(name, btn) {
  document.querySelectorAll(".adm-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".adm-nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("adm-tab-" + name)?.classList.add("active");
  btn.classList.add("active");
  const el = document.getElementById("adm-current-tab-name");
  if (el) el.innerText = name;

  if (name === "history") loadAdminHistory();
  if (name === "global") loadGlobalSettings();
  if (name === "stats") {
  const el = document.getElementById("adm-stats-content");
  if (el) { el.innerHTML = "<div class='adm-feed-loading'>// Loading stats...</div>"; buildAdStatsDashboard().then(html => { el.innerHTML = html; }); }
}
  if (name === "ads") {
    const el = document.getElementById("adm-ads-content");
    if (el && typeof buildAdControlPanel === "function") {
      el.innerHTML = buildAdControlPanel();
    }
  }
  if (name === "ads") { const el=document.getElementById('adm-ads-content'); if(el&&typeof buildAdControlPanel==="function") el.innerHTML=buildAdControlPanel(); }
  if (name === "visitors") loadVisitorsList();
}

/* ── DASHBOARD ── */
async function loadAdminDashboard() {
  const stats = await fetchAdminStats();
  const grid  = document.getElementById("adm-stats-grid");
  const feed  = document.getElementById("adm-live-feed");
  const badge = document.getElementById("adm-online-badge");
  if (!stats) {
    if (grid) grid.innerHTML = `<div class="adm-stat-card"><div class="adm-stat-icon">⚠</div><div class="adm-stat-val">—</div><div class="adm-stat-label">Firebase not configured</div></div>`;
    return;
  }
  if (badge) badge.innerText = stats.onlineCount;

  if (grid) grid.innerHTML = `
    <div class="adm-stat-card green">
      <div class="adm-stat-icon">🟢</div>
      <div class="adm-stat-val">${stats.onlineCount}</div>
      <div class="adm-stat-label">Online Now</div>
    </div>
    <div class="adm-stat-card blue">
      <div class="adm-stat-icon">👥</div>
      <div class="adm-stat-val">${stats.totalSessions}</div>
      <div class="adm-stat-label">Total Sessions</div>
    </div>
    <div class="adm-stat-card purple">
      <div class="adm-stat-icon">📱</div>
      <div class="adm-stat-val">${stats.mobile}</div>
      <div class="adm-stat-label">Mobile Users</div>
    </div>
    <div class="adm-stat-card orange">
      <div class="adm-stat-icon">💻</div>
      <div class="adm-stat-val">${stats.desktop}</div>
      <div class="adm-stat-label">Desktop Users</div>
    </div>
    ${Object.entries(stats.byCountry).sort((a,b)=>b[1]-a[1]).slice(0,2).map(([c,n])=>`
    <div class="adm-stat-card teal">
      <div class="adm-stat-icon">🌍</div>
      <div class="adm-stat-val">${n}</div>
      <div class="adm-stat-label">${c}</div>
    </div>`).join("")}`;

  // live feed — recent sessions
  if (feed) {
    feed.innerHTML = stats.recentSessions.length
      ? stats.recentSessions.map(s => renderSessionRow(s)).join("")
      : `<div class="adm-feed-loading">// No sessions yet</div>`;
  }
}

/* ── VISITORS LIST ── */
async function loadVisitorsList() {
  const stats = await fetchAdminStats();
  const onlineEl = document.getElementById("adm-online-list");
  const allEl    = document.getElementById("adm-all-sessions");
  const countEl  = document.getElementById("adm-online-count");
  if (!stats) return;

  if (countEl) countEl.innerText = stats.onlineCount;

  if (onlineEl) {
    onlineEl.innerHTML = stats.onlineNow.length
      ? stats.onlineNow.map(s => renderSessionCard(s, true)).join("")
      : `<div class="adm-feed-empty">// Nobody online right now</div>`;
  }

  if (allEl) {
    allEl.innerHTML = stats.recentSessions.length
      ? stats.recentSessions.map(s => renderSessionCard(s, false)).join("")
      : `<div class="adm-feed-empty">// No sessions</div>`;
  }
}

function renderSessionRow(s) {
  const onlineThresh = Date.now() - 25000;
  const isOnline = s.lastSeen > onlineThresh;
  const ago = timeAgo(s.lastSeen);
  return `
    <div class="adm-feed-row">
      <span class="adm-feed-dot" style="color:${isOnline?"#00ff88":"#333"}">●</span>
      <span class="adm-feed-ip">${s.ip||"?"}</span>
      <span class="adm-feed-loc">${[s.city,s.country].filter(Boolean).join(", ")||"Unknown"}</span>
      <span class="adm-feed-device">${s.device||"?"}</span>
      <span class="adm-feed-time">${ago}</span>
    </div>`;
}

function renderSessionCard(s, isOnline) {
  const onlineThresh = Date.now() - 25000;
  const online = isOnline || s.lastSeen > onlineThresh;
  return `
    <div class="adm-visitor-card ${online?"adm-visitor-online":""}">
      <div class="adm-visitor-header">
        <div class="adm-visitor-status">
          <span style="color:${online?"#00ff88":"#444"}">●</span>
          <span class="adm-visitor-ip">${s.ip||"unknown"}</span>
        </div>
        <span class="adm-visitor-time">${timeAgo(s.lastSeen)}</span>
      </div>
      <div class="adm-visitor-details">
        <div class="adm-visitor-detail"><span>🌍</span><span>${[s.city,s.country].filter(Boolean).join(", ")||"Unknown"}</span></div>
        <div class="adm-visitor-detail"><span>${s.device?.includes("Mobile")?"📱":"💻"}</span><span>${s.device||"Unknown"}</span></div>
        ${s.isp?`<div class="adm-visitor-detail"><span>🌐</span><span>${s.isp}</span></div>`:""}
        <div class="adm-visitor-detail"><span>🖥</span><span>${s.screen||"?"}</span></div>
        <div class="adm-visitor-detail"><span>🔗</span><span>${(s.referrer||"direct").slice(0,40)}</span></div>
      </div>
      <div class="adm-visitor-ua">${(s.userAgent||"").slice(0,80)}...</div>
    </div>`;
}

function timeAgo(ts) {
  if (!ts) return "never";
  const s = Math.floor((Date.now()-ts)/1000);
  if (s < 10)  return "just now";
  if (s < 60)  return s+"s ago";
  if (s < 3600) return Math.floor(s/60)+"m ago";
  if (s < 86400) return Math.floor(s/3600)+"h ago";
  return Math.floor(s/86400)+"d ago";
}

/* ── HISTORY ── */
async function loadAdminHistory() {
  const hist = document.getElementById("adminHistory"); if (!hist) return;
  const anns = await fetchAllAnnouncements();
  if (!anns.length) { hist.innerHTML=`<div class="adm-feed-empty">// No broadcasts yet.</div>`; return; }
  const colors={info:"#00d4ff",update:"#00ff88",warning:"#ffaa00",urgent:"#ff4444"};
  hist.innerHTML = anns.map(a=>`
    <div class="adm-hist-card" style="border-left:3px solid ${colors[a.type]||"#00d4ff"}">
      <div class="adm-hist-top">
        <span class="adm-hist-type" style="color:${colors[a.type]||"#00d4ff"}">[${(a.type||"").toUpperCase()}]</span>
        <span class="adm-hist-title">${a.title||""}</span>
        <span class="adm-hist-status ${a.active?"adm-live":""}">${a.active?"● LIVE":"○ off"}</span>
      </div>
      <div class="adm-hist-msg">${(a.message||"").slice(0,100)}${a.message?.length>100?"...":""}</div>
      <div class="adm-hist-date">${a.date||""}</div>
    </div>`).join("");
}

async function sendBroadcast() {
  const title   = document.getElementById("adminTitle")?.value.trim();
  const message = document.getElementById("adminMessage")?.value.trim();
  const type    = document.getElementById("adminType")?.value || "info";
  const status  = document.getElementById("adminStatus");
  if (!title||!message) { if(status){status.innerText="// Title and message required";status.style.color="#ff4444";} return; }
  if (!confirm(`Broadcast to ALL users?\n\n"${title}"`)) return;
  if (status) { status.innerText="// Transmitting..."; status.style.color="#ffaa00"; }
  const id = await postAnnouncement(title, message, type);
  if (id) {
    if (status) { status.innerText="// ✓ Broadcast live! ID: "+id; status.style.color="#00ff88"; }
    document.getElementById("adminTitle").value="";
    document.getElementById("adminMessage").value="";
    if (typeof showToast==="function") showToast("📡 Broadcast sent!","success");
  } else {
    if (status) { status.innerText="// ✗ Failed — configure Firebase in Settings → Cloud"; status.style.color="#ff4444"; }
  }
}

function previewBroadcast() {
  const title   = document.getElementById("adminTitle")?.value.trim() || "Preview Title";
  const message = document.getElementById("adminMessage")?.value.trim() || "Preview message.";
  const type    = document.getElementById("adminType")?.value || "info";
  showAnnouncementPopup({ id:"preview", title, message, type, date: new Date().toLocaleString(), version: document.getElementById("announceVersion")?.value||"" });
}

/* ── ADMIN BUTTON accessible from anywhere ── */
// keyboard shortcut: Ctrl+Shift+A
document.addEventListener("keydown", e => {
  if (e.ctrlKey && e.shiftKey && e.key === "A") {
    e.preventDefault();
    if (adminPanelOpen) closeAdminPanel();
    else openAdminPanel();
  }
});
/* ══ GLOBAL SETTINGS ══ */
async function loadGlobalSettings() {
  const el = document.getElementById("adm-global-content"); if (!el) return;
  const cfg = await fetchGlobalSettings();
  el.innerHTML = `
    <div class="adm-section-title">// GLOBAL APP SETTINGS</div>
    <div style="font-size:11px;color:rgba(0,255,136,0.3);margin-bottom:16px;">Changes here apply to ALL users instantly via Firebase.</div>
    <div class="adm-form" style="max-width:500px;">
      <div class="adm-field">
        <label>EDITOR THEME</label>
        <select class="adm-input" id="g-theme">
          <option value="vs-dark" ${cfg.theme==="vs-dark"?"selected":""}>Dark (default)</option>
          <option value="vs" ${cfg.theme==="vs"?"selected":""}>Light</option>
          <option value="hc-black" ${cfg.theme==="hc-black"?"selected":""}>High Contrast</option>
        </select>
      </div>
      <div class="adm-field">
        <label>SITE ACCENT COLOR</label>
        <input class="adm-input" type="color" id="g-accent" value="${cfg.accent||"#58a6ff"}">
      </div>
      <div class="adm-field">
        <label>ANNOUNCEMENT BANNER (shown top of app)</label>
        <input class="adm-input" type="text" id="g-banner" placeholder="Leave empty to hide" value="${cfg.banner||""}">
      </div>
      <div class="adm-field">
        <label>DISABLE AI FOR USERS</label>
        <select class="adm-input" id="g-disableai">
          <option value="0" ${!cfg.disableAI?"selected":""}>No — AI enabled</option>
          <option value="1" ${cfg.disableAI?"selected":""}>Yes — disable AI panel</option>
        </select>
      </div>
      <div class="adm-form-actions">
        <button class="adm-btn adm-btn-primary" onclick="saveGlobalSettings()">🌍 APPLY TO ALL USERS</button>
      </div>
      <div id="g-status" class="adm-form-status"></div>

      <div class="adm-divider">─── ADMIN PASSWORD ───</div>
      <div class="adm-field"><label>New Admin Password</label><input id="g-newpass" class="adm-input" type="password" placeholder="Enter new password (min 4 chars)"></div>
      <div class="adm-form-actions">
        <button class="adm-btn adm-btn-primary" onclick="changeAdminPassword()">🔑 Change Password</button>
      </div>
      <div id="g-pass-status" class="adm-form-status"></div>
    </div>`;
}

async function changeAdminPassword() {
  const val = document.getElementById("g-newpass")?.value.trim();
  const st  = document.getElementById("g-pass-status");
  if (!val || val.length < 4) {
    if (st) { st.innerText = "// Password must be at least 4 characters"; st.style.color = "#ff4444"; }
    return;
  }
  if (!confirm("Change admin password for ALL devices?")) return;
  if (st) st.innerText = "// Saving...";
  const ok = await setAdminPassword(val);
  if (ok) {
    if (st) { st.innerText = "// ✓ Password changed!"; st.style.color = "#00ff88"; }
    document.getElementById("g-newpass").value = "";
    if (typeof showToast === "function") showToast("🔑 Admin password updated", "success");
  } else {
    if (st) { st.innerText = "// ✗ Failed — check Firebase connection"; st.style.color = "#ff4444"; }
  }
}

async function fetchGlobalSettings() {
  try {
    const db = await initAnnounceDB(); if (!db) return {};
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", "config"));
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

async function saveGlobalSettings() {
  const st = document.getElementById("g-status");
  try {
    const db = await initAnnounceDB();
    if (!db) { if(st) st.innerText = "⚠ Firebase not configured in Settings → Cloud"; return; }
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const cfg = {
      theme:     document.getElementById("g-theme").value,
      accent:    document.getElementById("g-accent").value,
      banner:    document.getElementById("g-banner").value,
      disableAI: document.getElementById("g-disableai").value === "1",
      updatedAt: Date.now()
    };
    await setDoc(doc(db, "global_settings", "config"), cfg);
    if(st) st.innerText = "✅ Applied to all users!";
    setTimeout(() => { if(st) st.innerText = ""; }, 3000);
  } catch(e) { if(st) st.innerText = "❌ Error: " + e.message; }
}

async function applyGlobalSettings() {
  try {
    const db = await initAnnounceDB(); if (!db) return;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", "config"));
    if (!snap.exists()) return;
    const cfg = snap.data();
    if (cfg.theme && window.monaco) monaco.editor.setTheme(cfg.theme);
    if (cfg.accent) document.documentElement.style.setProperty("--accent", cfg.accent);
    if (cfg.banner) {
      let b = document.getElementById("global-banner");
      if (!b) { b = document.createElement("div"); b.id = "global-banner"; b.style.cssText = "background:#1f3a1f;color:#00ff88;text-align:center;padding:6px 12px;font-size:12px;z-index:9999;position:relative;"; document.body.prepend(b); }
      b.innerText = cfg.banner;
    }
    if (cfg.disableAI) {
      const ai = document.getElementById("toggleAiBtn"); if(ai) ai.style.display = "none";
    }
  } catch {}
}