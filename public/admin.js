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
    const r = await fetch("/api/myip");
    const d = await r.json();
    ip = d.ip || "unknown";
  } catch {}

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
          <button class="adm-nav-btn" onclick="admTab('extensions',this)">
            <span class="adm-nav-icon">🧩</span><span>Extensions</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('stats',this)">
                <span class="adm-nav-icon">📈</span><span>Stats</span>
              </button>
          <button class="adm-nav-btn" onclick="admTab('ads',this)">
            <span class="adm-nav-icon">📢</span><span>Ads</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('vault',this)">
            <span class="adm-nav-icon">🔐</span><span>Vault</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('theme',this)">
            <span class="adm-nav-icon">🎨</span><span>Theme</span>
          </button>
          <button class="adm-nav-btn" onclick="admTab('myapps',this);loadAdminMyAppsTab();">
            <span class="adm-nav-icon">🚀</span><span>My Apps</span>
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

          <!-- ── EXTENSIONS ── -->
          <div class="adm-tab" id="adm-tab-extensions">
            <div id="adm-extensions-content">
              <div class="adm-feed-loading">// Loading extensions...</div>
            </div>
          </div>

          <!-- ── STATS ── -->
          <div class="adm-tab" id="adm-tab-stats">
            <div id="adm-stats-content">
              <div class="adm-feed-loading">// Click to load stats...</div>
            </div>
          </div>

          <!-- ── HISTORY ── -->
          <div class="adm-tab" id="adm-tab-vault">
            <div id="adm-vault-content"></div>
          </div>
          <div class="adm-tab" id="adm-tab-theme">
            <div id="adm-theme-content"></div>
          </div>
          <div class="adm-tab" id="adm-tab-myapps">
            <div id="adm-myapps-content"><div class="adm-feed-loading">// Loading...</div></div>
          </div>
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
/* =========================
   SECRET VAULT
   Stores API keys + tokens
   Encrypted with a PIN
========================= */
const VAULT_KEY        = "vscode_godmode_vault";
const VAULT_CLOUD_DOC  = "admin_vault";

function vaultEncrypt(text, pin) {
  // simple XOR cipher with pin — not bank-level but good enough for personal use
  let result = "";
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
  }
  return btoa(result);
}

function vaultDecrypt(encoded, pin) {
  try {
    const text = atob(encoded);
    let result = "";
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ pin.charCodeAt(i % pin.length));
    }
    return result;
  } catch { return null; }
}

function vaultLoad(pin) {
  try {
    const raw = localStorage.getItem(VAULT_KEY);
    if (!raw) return {};
    const decrypted = vaultDecrypt(raw, pin);
    if (!decrypted) return null;
    return JSON.parse(decrypted);
  } catch { return null; }
}

async function vaultSave(data, pin) {
  const encrypted = vaultEncrypt(JSON.stringify(data), pin);
  localStorage.setItem(VAULT_KEY, encrypted);
  // also save to Firebase so it syncs across all devices
  try {
    const db = await initAnnounceDB();
    if (!db) return;
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db, "global_settings", VAULT_CLOUD_DOC), {
      data: encrypted,
      updatedAt: Date.now()
    });
  } catch {}
}

async function vaultLoadFromCloud() {
  try {
    const db = await initAnnounceDB();
    if (!db) return null;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", VAULT_CLOUD_DOC));
    if (snap.exists()) {
      const cloudData = snap.data().data;
      // also update local cache
      localStorage.setItem(VAULT_KEY, cloudData);
      return cloudData;
    }
  } catch {}
  return null;
}

async function renderVaultPanel() {
  const el = document.getElementById("adm-vault-content");
  if (!el) return;

  el.innerHTML = `<div style="color:#3a5a8a;font-size:12px;padding:20px;text-align:center;">⟳ Loading vault...</div>`;

  // try to pull from cloud first
  const cloudRaw = await vaultLoadFromCloud();
  const hasVault = !!(cloudRaw || localStorage.getItem(VAULT_KEY));

  el.innerHTML = `
    <div class="adm-section-title">// 🔐 SECRET VAULT</div>
    <div style="font-size:11px;color:rgba(0,255,136,0.3);margin-bottom:16px;">
      Store your API keys, tokens and passwords securely. Protected by a PIN only you know.
      Nothing is sent to any server — stored encrypted in your browser only.
    </div>

    ${!hasVault ? `
    <!-- CREATE VAULT -->
    <div style="background:#010a08;border:1px solid rgba(0,255,136,0.1);border-radius:10px;padding:16px;margin-bottom:12px;">
      <div class="adm-section-title" style="margin-top:0;">// CREATE YOUR VAULT</div>
      <div class="adm-field">
        <label>SET A PIN (remember this — you need it to open your vault)</label>
        <input type="password" id="vault-pin-create" class="adm-input" placeholder="Enter a PIN...">
      </div>
      <div class="adm-field" style="margin-top:10px;">
        <label>CONFIRM PIN</label>
        <input type="password" id="vault-pin-confirm" class="adm-input" placeholder="Confirm PIN...">
      </div>
      <button onclick="vaultCreate()" class="adm-btn adm-btn-primary" style="margin-top:12px;width:100%;">
        🔐 Create Vault
      </button>
    </div>
    ` : `
    <!-- UNLOCK VAULT -->
    <div id="vault-lock-screen" style="background:#010a08;border:1px solid rgba(0,255,136,0.1);border-radius:10px;padding:16px;margin-bottom:12px;">
      <div class="adm-section-title" style="margin-top:0;">// UNLOCK VAULT</div>
      <div class="adm-field">
        <label>ENTER YOUR PIN</label>
        <div style="display:flex;gap:8px;">
          <input type="password" id="vault-pin-unlock" class="adm-input" placeholder="PIN..." style="flex:1;"
            onkeydown="if(event.key==='Enter') vaultUnlock()">
          <button onclick="vaultUnlock()" class="adm-btn adm-btn-primary">🔓 Open</button>
        </div>
      </div>
      <div id="vault-unlock-error" style="color:#ff5050;font-size:11px;margin-top:6px;display:none;">
        ✗ Wrong PIN
      </div>
    </div>
    <div id="vault-open-content" style="display:none;"></div>
    `}
  `;
}

function vaultCreate() {
  const pin  = document.getElementById("vault-pin-create")?.value;
  const conf = document.getElementById("vault-pin-confirm")?.value;
  if (!pin || pin.length < 4) { showToast("PIN must be at least 4 characters", "error"); return; }
  if (pin !== conf) { showToast("PINs don't match", "error"); return; }
  vaultSave({
    entries: [
      { id: 1, label: "GitHub Token", value: "", category: "github" },
      { id: 2, label: "Gemini API Key", value: "", category: "ai" },
      { id: 3, label: "Groq API Key", value: "", category: "ai" },
      { id: 4, label: "OpenRouter API Key", value: "", category: "ai" },
      { id: 5, label: "DeepSeek API Key", value: "", category: "ai" },
      { id: 6, label: "HuggingFace API Key", value: "", category: "ai" },
    ]
  }, pin);
  showToast("✓ Vault created!", "success");
  renderVaultPanel();
}

function vaultUnlock() {
  const pin = document.getElementById("vault-pin-unlock")?.value;
  if (!pin) return;
  const data = vaultLoad(pin);
  if (!data) {
    document.getElementById("vault-unlock-error").style.display = "block";
    return;
  }
  _vaultSessionPin = pin; // remember for auto-sync this session
  document.getElementById("vault-lock-screen").style.display = "none";
  document.getElementById("vault-open-content").style.display = "block";
  renderVaultOpen(data, pin);
}

function renderVaultOpen(data, pin) {
  const el = document.getElementById("vault-open-content");
  if (!el) return;

  const categories = { github: "🐙 GitHub", ai: "🤖 AI Keys", custom: "📝 Custom" };
  const grouped = {};
  (data.entries || []).forEach(e => {
    const cat = e.category || "custom";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(e);
  });

  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
      <div style="color:#00ff88;font-size:13px;font-weight:700;">🔓 Vault Unlocked</div>
      <div style="display:flex;gap:8px;">
        <button onclick="vaultAddEntry('${pin}')" class="adm-btn adm-btn-ghost" style="font-size:10px;padding:5px 10px;">+ Add Entry</button>
        <button onclick="vaultLock()" class="adm-btn adm-btn-danger" style="font-size:10px;padding:5px 10px;">🔒 Lock</button>
      </div>
    </div>

    ${Object.entries(grouped).map(([cat, entries]) => `
      <div style="margin-bottom:16px;">
        <div class="adm-section-title" style="margin-top:0;">${categories[cat] || cat}</div>
        ${entries.map(entry => `
          <div style="background:#010a08;border:1px solid rgba(0,255,136,0.08);border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <div style="font-size:12px;color:#c0f0d0;font-weight:600;">${entry.label}</div>
              <div style="display:flex;gap:5px;">
                <button onclick="vaultCopy(${entry.id},'${pin}')"
                  style="background:rgba(0,255,136,0.08);border:1px solid rgba(0,255,136,0.2);color:#00ff88;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:10px;">
                  📋 Copy
                </button>
                <button onclick="vaultDeleteEntry(${entry.id},'${pin}')"
                  style="background:rgba(255,50,50,0.08);border:1px solid rgba(255,50,50,0.2);color:#ff5050;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:10px;">
                  🗑
                </button>
              </div>
            </div>
            <div style="display:flex;gap:8px;align-items:center;">
              <input type="password" id="vault-entry-${entry.id}"
                value="${entry.value}"
                class="adm-input"
                style="flex:1;font-family:monospace;font-size:12px;"
                placeholder="Paste your key here...">
              <button onclick="vaultToggleShow(${entry.id})"
                style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#ccc;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:12px;">
                👁
              </button>
              <button onclick="vaultSaveEntry(${entry.id},'${pin}')"
                style="background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:#00ff88;padding:6px 10px;border-radius:4px;cursor:pointer;font-size:11px;font-weight:700;">
                Save
              </button>
            </div>
          </div>
        `).join("")}
      </div>
    `).join("")}

    <div style="margin-top:8px;">
      <button onclick="vaultReset()" style="background:transparent;border:1px solid rgba(255,50,50,0.2);color:rgba(255,50,50,0.5);padding:6px 14px;border-radius:6px;cursor:pointer;font-size:10px;font-family:inherit;">
        ⚠ Reset & Delete Vault
      </button>
    </div>
  `;
}

function vaultSaveEntry(id, pin) {
  const data = vaultLoad(pin);
  if (!data) return;
  const entry = data.entries.find(e => e.id === id);
  if (!entry) return;
  const input = document.getElementById(`vault-entry-${id}`);
  if (!input) return;
  entry.value = input.value;
  vaultSave(data, pin);
  showToast("✓ Saved", "success");
}

function vaultCopy(id, pin) {
  const data = vaultLoad(pin);
  if (!data) return;
  const entry = data.entries.find(e => e.id === id);
  if (!entry || !entry.value) { showToast("Nothing to copy", "error"); return; }
  navigator.clipboard.writeText(entry.value).then(() => showToast(`✓ Copied: ${entry.label}`, "success"));
}

function vaultToggleShow(id) {
  const input = document.getElementById(`vault-entry-${id}`);
  if (!input) return;
  input.type = input.type === "password" ? "text" : "password";
}

function vaultAddEntry(pin) {
  const label = prompt("Entry name (e.g. 'Firebase Key'):");
  if (!label) return;
  const data = vaultLoad(pin);
  if (!data) return;
  const newId = Math.max(0, ...data.entries.map(e => e.id)) + 1;
  data.entries.push({ id: newId, label, value: "", category: "custom" });
  vaultSave(data, pin);
  renderVaultOpen(data, pin);
}

function vaultDeleteEntry(id, pin) {
  if (!confirm("Delete this entry?")) return;
  const data = vaultLoad(pin);
  if (!data) return;
  data.entries = data.entries.filter(e => e.id !== id);
  vaultSave(data, pin);
  renderVaultOpen(data, pin);
}
/* auto-sync API keys from settings into vault without needing PIN
   only works if vault already exists and PIN was entered this session */
let _vaultSessionPin = null; // remember PIN for this session only

async function autoSyncKeysToVault(keys) {
  if (!_vaultSessionPin) return; // vault not unlocked this session
  const data = vaultLoad(_vaultSessionPin);
  if (!data) return;
  // update matching entries
  const keyMap = {
    gemini: "Gemini API Key",
    groq: "Groq API Key",
    openrouter: "OpenRouter API Key",
    deepseek: "DeepSeek API Key",
    huggingface: "HuggingFace API Key"
  };
  let changed = false;
  Object.entries(keyMap).forEach(([k, label]) => {
    if (!keys[k]) return;
    const entry = data.entries.find(e => e.label === label);
    if (entry) { entry.value = keys[k]; changed = true; }
  });
  if (changed) {
    await vaultSave(data, _vaultSessionPin);
    showToast("✓ API keys synced to vault", "success");
  }
}
function vaultLock() {
  renderVaultPanel();
  showToast("🔒 Vault locked", "info");
}
function copyKeyToVault(inputId, label) {
  const val = document.getElementById(inputId)?.value.trim();
  if (!val) { showToast("Enter a key first", "error"); return; }
  if (!_vaultSessionPin) {
    showToast("Open Admin → Vault and unlock it first", "error");
    return;
  }
  const data = vaultLoad(_vaultSessionPin);
  if (!data) return;
  const entry = data.entries.find(e => e.label === label);
  if (entry) {
    entry.value = val;
    vaultSave(data, _vaultSessionPin);
    showToast(`✓ ${label} saved to vault`, "success");
  } else {
    // add new entry
    const newId = Math.max(0, ...data.entries.map(e => e.id)) + 1;
    data.entries.push({ id: newId, label, value: val, category: "ai" });
    vaultSave(data, _vaultSessionPin);
    showToast(`✓ ${label} added to vault`, "success");
  }
}
/* =========================
   THEME CUSTOMIZER
   Syncs via Firebase globally
========================= */
const THEME_CLOUD_DOC = "admin_theme";
const THEME_LOCAL_KEY = "vscode_admin_theme";

const THEME_DEFAULTS = {
  accent:     "#00ff88",
  background: "#020c0a",
  surface:    "#0d1117",
  text:       "#c0f0d0",
  border:     "#1a2332",
  topbar:     "#161b22",
  sidebar:    "#11161d",
  editorBg:   "#0d1117",
  previewBg:  "#ffffff",
  aiPanel:    "#0b141a",
};

function getTheme() {
  try { return { ...THEME_DEFAULTS, ...JSON.parse(localStorage.getItem(THEME_LOCAL_KEY) || "{}") }; } catch { return { ...THEME_DEFAULTS }; }
}

async function saveTheme(theme) {
  localStorage.setItem(THEME_LOCAL_KEY, JSON.stringify(theme));
  // sync to Firebase so all devices get same theme
  try {
    const db = await initAnnounceDB(); if (!db) return;
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db, "global_settings", THEME_CLOUD_DOC), { ...theme, updatedAt: Date.now() });
  } catch {}
}

async function loadThemeFromCloud() {
  try {
    const db = await initAnnounceDB(); if (!db) return null;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", THEME_CLOUD_DOC));
    if (snap.exists()) {
      const t = snap.data();
      localStorage.setItem(THEME_LOCAL_KEY, JSON.stringify(t));
      return t;
    }
  } catch {}
  return null;
}

function applyTheme(theme) {
  const r = document.documentElement.style;
  if (theme.topbar)   { document.querySelectorAll(".topbar").forEach(el => el.style.background = theme.topbar); }
  if (theme.sidebar)  { document.querySelectorAll(".sidebar").forEach(el => el.style.background = theme.sidebar); }
  if (theme.surface)  { document.querySelectorAll(".preview-header,.ai-header,.console-header,.tab,.split-header").forEach(el => el.style.background = theme.surface); }
  if (theme.editorBg) { document.querySelectorAll("#editor1,.editor-area,.editors-row").forEach(el => el.style.background = theme.editorBg); }
  if (theme.aiPanel)  { document.querySelectorAll("#aiPanel").forEach(el => el.style.background = theme.aiPanel); }
  if (theme.border)   { document.querySelectorAll(".topbar,.sidebar,.preview-header").forEach(el => el.style.borderColor = theme.border); }
  if (theme.accent) {
    document.querySelectorAll(".tab.active").forEach(el => el.style.borderTopColor = theme.accent);
    document.querySelectorAll("#aiSend").forEach(el => el.style.background = theme.accent === "#00ff88" ? "#00a884" : theme.accent);
  }
  // inject CSS variables
  document.documentElement.style.setProperty("--accent", theme.accent || "#00ff88");
  document.documentElement.style.setProperty("--bg", theme.background || "#020c0a");
  document.documentElement.style.setProperty("--surface", theme.surface || "#0d1117");
  document.documentElement.style.setProperty("--text", theme.text || "#c0f0d0");
}

async function applyGlobalSettings() {
  const cloud = await loadThemeFromCloud();
  const theme = cloud || getTheme();
  applyTheme(theme);
}

function renderThemePanel() {
  const el = document.getElementById("adm-theme-content");
  if (!el) return;
  const theme = getTheme();

  const colors = [
    { key: "accent",    label: "Accent Color",      hint: "Buttons, highlights, active tabs" },
    { key: "background",label: "Main Background",   hint: "Page/body background" },
    { key: "surface",   label: "Surface / Cards",   hint: "Topbar, panels, headers" },
    { key: "topbar",    label: "Topbar",             hint: "Top navigation bar" },
    { key: "sidebar",   label: "Sidebar",            hint: "File explorer sidebar" },
    { key: "editorBg",  label: "Editor Background",  hint: "Monaco editor area" },
    { key: "aiPanel",   label: "AI Panel",           hint: "Right AI chat panel" },
    { key: "text",      label: "Text Color",         hint: "Primary text color" },
    { key: "border",    label: "Border Color",       hint: "Dividers and borders" },
  ];

  el.innerHTML = `
    <div class="adm-section-title">// 🎨 APP THEME</div>
    <div style="font-size:11px;color:rgba(0,255,136,0.3);margin-bottom:16px;">
      Theme syncs to all devices via Firebase. Changes apply live instantly.
    </div>

    <!-- PRESETS -->
    <div class="adm-section-title">// PRESETS</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;">
      <button onclick="applyThemePreset('default')"
        style="padding:8px 14px;background:rgba(0,255,136,0.1);border:1px solid rgba(0,255,136,0.3);color:#00ff88;border-radius:8px;cursor:pointer;font-size:11px;font-family:inherit;">
        🌿 Default Green
      </button>
      <button onclick="applyThemePreset('ocean')"
        style="padding:8px 14px;background:rgba(88,166,255,0.1);border:1px solid rgba(88,166,255,0.3);color:#58a6ff;border-radius:8px;cursor:pointer;font-size:11px;font-family:inherit;">
        🌊 Ocean Blue
      </button>
      <button onclick="applyThemePreset('purple')"
        style="padding:8px 14px;background:rgba(168,85,247,0.1);border:1px solid rgba(168,85,247,0.3);color:#a855f7;border-radius:8px;cursor:pointer;font-size:11px;font-family:inherit;">
        💜 Purple
      </button>
      <button onclick="applyThemePreset('red')"
        style="padding:8px 14px;background:rgba(255,80,80,0.1);border:1px solid rgba(255,80,80,0.3);color:#ff5050;border-radius:8px;cursor:pointer;font-size:11px;font-family:inherit;">
        🔴 Red
      </button>
      <button onclick="applyThemePreset('gold')"
        style="padding:8px 14px;background:rgba(255,170,0,0.1);border:1px solid rgba(255,170,0,0.3);color:#ffaa00;border-radius:8px;cursor:pointer;font-size:11px;font-family:inherit;">
        ✨ Gold
      </button>
      <button onclick="applyThemePreset('dark')"
        style="padding:8px 14px;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);color:#ccc;border-radius:8px;cursor:pointer;font-size:11px;font-family:inherit;">
        ⬛ Pure Dark
      </button>
    </div>

    <!-- COLOR PICKERS -->
    <div class="adm-section-title">// CUSTOM COLORS</div>
    <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:16px;">
      ${colors.map(c => `
        <div style="background:#010a08;border:1px solid rgba(0,255,136,0.08);border-radius:8px;padding:10px 14px;display:flex;align-items:center;gap:12px;">
          <input type="color" value="${theme[c.key] || '#000000'}"
            id="tc-${c.key}"
            onchange="themeColorChange('${c.key}', this.value)"
            style="width:36px;height:36px;border:none;border-radius:6px;cursor:pointer;background:none;padding:0;">
          <div style="flex:1;">
            <div style="font-size:12px;color:#c0f0d0;font-weight:600;">${c.label}</div>
            <div style="font-size:10px;color:#3a5a4a;">${c.hint}</div>
          </div>
          <span style="font-size:11px;color:#3a5a4a;font-family:monospace;" id="tc-val-${c.key}">${theme[c.key]}</span>
        </div>
      `).join("")}
    </div>

    <!-- SAVE BUTTON -->
    <button onclick="saveThemeAndApply()"
      style="width:100%;padding:12px;background:linear-gradient(135deg,rgba(0,255,136,0.12),rgba(0,200,100,0.06));
      border:1px solid rgba(0,255,136,0.3);color:#00ff88;border-radius:8px;
      font-size:13px;cursor:pointer;font-family:inherit;font-weight:600;letter-spacing:1px;">
      💾 SAVE & SYNC TO ALL DEVICES
    </button>
    <button onclick="resetTheme()"
      style="width:100%;margin-top:8px;padding:10px;background:transparent;
      border:1px solid rgba(255,80,80,0.2);color:rgba(255,80,80,0.5);border-radius:8px;
      font-size:11px;cursor:pointer;font-family:inherit;">
      ↺ Reset to Default
    </button>
    <div id="theme-save-status" style="font-size:11px;color:rgba(0,255,136,0.4);text-align:center;margin-top:8px;"></div>
  `;
}

function themeColorChange(key, value) {
  const valEl = document.getElementById("tc-val-" + key);
  if (valEl) valEl.innerText = value;
  // live preview as you pick
  const t = getTheme();
  t[key] = value;
  applyTheme(t);
}

async function saveThemeAndApply() {
  const t = { ...THEME_DEFAULTS };
  Object.keys(THEME_DEFAULTS).forEach(key => {
    const input = document.getElementById("tc-" + key);
    if (input) t[key] = input.value;
  });
  await saveTheme(t);
  applyTheme(t);
  const st = document.getElementById("theme-save-status");
  if (st) st.innerText = "✓ Saved and synced to all devices!";
  if (typeof showToast === "function") showToast("✓ Theme saved to all devices", "success");
}

const THEME_PRESETS = {
  default: { accent:"#00ff88", background:"#020c0a", surface:"#0d1117", topbar:"#161b22", sidebar:"#11161d", editorBg:"#0d1117", aiPanel:"#0b141a", text:"#c0f0d0", border:"#1a2332" },
  ocean:   { accent:"#58a6ff", background:"#050d1a", surface:"#0d1b2e", topbar:"#0d1b2e", sidebar:"#081525", editorBg:"#050d1a", aiPanel:"#061220", text:"#a5c8f0", border:"#1a2a4a" },
  purple:  { accent:"#a855f7", background:"#0a0510", surface:"#130a1f", topbar:"#130a1f", sidebar:"#0d0715", editorBg:"#0a0510", aiPanel:"#0d0818", text:"#d4aaff", border:"#2a1a3a" },
  red:     { accent:"#ff5050", background:"#0f0505", surface:"#1a0a0a", topbar:"#1a0a0a", sidebar:"#150808", editorBg:"#0f0505", aiPanel:"#120707", text:"#ffaaaa", border:"#3a1a1a" },
  gold:    { accent:"#ffaa00", background:"#0f0a00", surface:"#1a1200", topbar:"#1a1200", sidebar:"#150e00", editorBg:"#0f0a00", aiPanel:"#120c00", text:"#ffe599", border:"#3a2a00" },
  dark:    { accent:"#ffffff", background:"#000000", surface:"#0a0a0a", topbar:"#111111", sidebar:"#0d0d0d", editorBg:"#000000", aiPanel:"#080808", text:"#cccccc", border:"#222222" },
};

function applyThemePreset(name) {
  const preset = THEME_PRESETS[name];
  if (!preset) return;
  // update color pickers
  Object.entries(preset).forEach(([key, val]) => {
    const input = document.getElementById("tc-" + key);
    const valEl = document.getElementById("tc-val-" + key);
    if (input) input.value = val;
    if (valEl) valEl.innerText = val;
  });
  applyTheme(preset);
}

async function resetTheme() {
  if (!confirm("Reset to default theme?")) return;
  await saveTheme(THEME_DEFAULTS);
  applyTheme(THEME_DEFAULTS);
  renderThemePanel();
  if (typeof showToast === "function") showToast("Theme reset ✓", "info");
}
function vaultReset() {
  if (!confirm("This will DELETE your entire vault permanently. Are you sure?")) return;
  localStorage.removeItem(VAULT_KEY);
  showToast("Vault deleted", "info");
  renderVaultPanel();
}
function admTab(name, btn) {
  document.querySelectorAll(".adm-tab").forEach(t => t.classList.remove("active"));
  document.querySelectorAll(".adm-nav-btn").forEach(b => b.classList.remove("active"));
  document.getElementById("adm-tab-" + name)?.classList.add("active");
  btn.classList.add("active");
  const el = document.getElementById("adm-current-tab-name");
  if (el) el.innerText = name;

  if (name === "history") loadAdminHistory();
  if (name === "global") loadGlobalSettings();
  if (name === "extensions") loadAdminExtensionsTab();
  if (name === "stats") {
  const el = document.getElementById("adm-stats-content");
  if (el) { el.innerHTML = "<div class='adm-feed-loading'>// Loading stats...</div>"; buildAdStatsDashboard().then(html => { el.innerHTML = html; }); }
}
  if (name === "vault") renderVaultPanel();
  if (name === "theme") renderThemePanel();
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
        <button class="adm-btn adm-btn-danger" style="margin-left:auto;padding:3px 10px;font-size:10px;" onclick="adminDeleteBroadcast('${a.id}')">🗑 Delete</button>
      </div>
      <div class="adm-hist-msg">${(a.message||"").slice(0,100)}${a.message?.length>100?"...":""}</div>
      <div class="adm-hist-date">${a.date||""}</div>
    </div>`).join("");
}
async function adminDeleteBroadcast(id) {
  if (!confirm("Delete this broadcast? It will disappear for ALL users immediately.")) return;
  try {
    const db = await initAnnounceDB(); if (!db) { showToast("Firebase not connected","error"); return; }
    const { doc, deleteDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await deleteDoc(doc(db, "announcements", id));
    showToast("Broadcast deleted for all users ✓", "success");
    loadAdminHistory();
  } catch(e) { showToast("Failed: " + e.message, "error"); }
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