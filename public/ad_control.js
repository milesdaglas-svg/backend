/* =========================
   AD CONTROL SYSTEM v1
   - Master on/off switch
   - Per-provider toggle
   - Device targeting
   - Placement control
   - Delay control
   - All saved to localStorage
========================= */

const AD_KEY = "vscode_ad_settings";

const AD_DEFAULTS = {
  enabled:      true,
  propush:      true,
  monetag:      true,
  showMobile:   true,
  showDesktop:  true,
  delay:        3500,
  placements: {
    sidebar:    false,
    preview:    false,
    aiPanel:    false,
  }
};

const AD_LOCAL_OVERRIDE_KEY = "vscode_ads_local_off";

function isAdsLocallyDisabled() {
  return localStorage.getItem(AD_LOCAL_OVERRIDE_KEY) === "1";
}

function getAdSettings() {
  try {
    const s = localStorage.getItem(AD_KEY);
    if (!s) return { ...AD_DEFAULTS };
    const parsed = JSON.parse(s);
    return {
      ...AD_DEFAULTS,
      ...parsed,
      placements: { ...AD_DEFAULTS.placements, ...(parsed.placements||{}) }
    };
  } catch { return { ...AD_DEFAULTS }; }
}

function saveAdSettings(cfg) {
  try { localStorage.setItem(AD_KEY, JSON.stringify(cfg)); } catch {}
  syncAdSettingsToCloud(cfg);
}

/* ── CLOUD SYNC ── */
async function syncAdSettingsToCloud(cfg) {
  try {
    const db = await initAnnounceDB(); if (!db) return;
    const { doc, setDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await setDoc(doc(db, "global_settings", "ads"), { ...cfg, updatedAt: Date.now() });
  } catch {}
}

async function fetchAdSettingsFromCloud() {
  try {
    const db = await initAnnounceDB(); if (!db) return null;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", "ads"));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

/* pull latest ad settings from cloud and cache locally — call on app load */
async function syncAdSettingsFromCloud() {
  const cloud = await fetchAdSettingsFromCloud();
  if (cloud) {
    try { localStorage.setItem(AD_KEY, JSON.stringify(cloud)); } catch {}
  }
  return cloud;
}

/* ══════════════════════
   INIT — called on load
   respects all settings
══════════════════════ */
async function initAdSystem() {
  // pull latest global ad settings from Firestore first (falls back to localStorage if offline)
  await syncAdSettingsFromCloud();

  // local-only override — this device has ads disabled individually
  if (isAdsLocallyDisabled()) return;

  const cfg = getAdSettings();
  if (!cfg.enabled) return;

  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if (isMobile  && !cfg.showMobile)  return;
  if (!isMobile && !cfg.showDesktop) return;

  setTimeout(() => {
    if (cfg.propush) loadScript(
      "//kmnts.com/ab0/19f5f/mw.min.js?z=11076856&sw=/sw-check-permissions-c9415.js"
    );
    if (cfg.monetag) {
      const s = document.createElement("script");
      s.src = "https://quge5.com/88/tag.min.js";
      s.dataset.zone = "244827";
      s.async = true;
      s.dataset.cfasync = "false";
      document.head.appendChild(s);
    }
    injectPlacements(cfg);
  }, cfg.delay || 3500);
}

function loadScript(src) {
  if (document.querySelector(`script[src="${src}"]`)) return;
  const s = document.createElement("script");
  s.src = src; s.async = true;
  document.head.appendChild(s);
}

function injectPlacements(cfg) {
  // These are placeholder divs where ad networks
  // can inject banner ads if configured
  if (cfg.placements.sidebar) {
    const el = document.getElementById("fileList");
    if (el && !document.getElementById("ad-sidebar")) {
      const ad = makeAdSlot("ad-sidebar");
      el.insertAdjacentElement("beforebegin", ad);
    }
  }
  if (cfg.placements.preview) {
    const el = document.getElementById("preview");
    if (el && !document.getElementById("ad-preview")) {
      const ad = makeAdSlot("ad-preview");
      el.insertAdjacentElement("beforebegin", ad);
    }
  }
  if (cfg.placements.aiPanel) {
    const el = document.getElementById("aiChat");
    if (el && !document.getElementById("ad-aipanel")) {
      const ad = makeAdSlot("ad-aipanel");
      el.insertAdjacentElement("beforebegin", ad);
    }
  }
}

function makeAdSlot(id) {
  const d = document.createElement("div");
  d.id = id;
  d.className = "ad-slot";
  d.innerText = "[ Ad ]";
  return d;
}

function removeAllAds() {
  document.querySelectorAll('script[src*="kmnts.com"]').forEach(s => s.remove());
  document.querySelectorAll('script[src*="quge5.com"]').forEach(s => s.remove());
  document.querySelectorAll(".ad-slot").forEach(s => s.remove());
}

function reloadAds() {
  removeAllAds();
  initAdSystem();
  trackAdPageView();
  if (typeof showToast === "function") showToast("✓ Ad settings applied", "success");
}

/* ══════════════════════
   BUILD AD PANEL
   called from admin.js
══════════════════════ */
function buildAdControlPanel() {
  const cfg = getAdSettings();
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);

  return `
    <div class="adm-section-title">// MASTER CONTROL</div>

    <div class="adctl-card">
      <div class="adctl-row adctl-featured">
        <div class="adctl-left">
          <span class="adctl-icon">🌍</span>
          <div>
            <div class="adctl-name">All Ads — ALL Devices (Global)</div>
            <div class="adctl-desc">Turns ads on/off for EVERY user on every device via Firestore</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${cfg.enabled?"checked":""} onchange="adSet('enabled',this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>

      <div class="adctl-divider"></div>

      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">📱</span>
          <div>
            <div class="adctl-name">Ads — THIS Device Only (Local)</div>
            <div class="adctl-desc">Hides ads only on this device — other users still see ads</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${isAdsLocallyDisabled()?"":"checked"} onchange="toggleLocalAdOverride(this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>
    </div>

    <div class="adm-section-title">// AD PROVIDERS</div>
    <div class="adctl-card">
      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">🔔</span>
          <div>
            <div class="adctl-name">Propush (Push Notifications)</div>
            <div class="adctl-desc">kmnts.com — asks users to allow notifications</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${cfg.propush?"checked":""} onchange="adSet('propush',this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>

      <div class="adctl-divider"></div>

      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">🖼</span>
          <div>
            <div class="adctl-name">Monetag (Display Ads)</div>
            <div class="adctl-desc">quge5.com — banner and popunder ads</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${cfg.monetag?"checked":""} onchange="adSet('monetag',this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>
    </div>

    <div class="adm-section-title">// DEVICE TARGETING</div>
    <div class="adctl-card">
      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">📱</span>
          <div>
            <div class="adctl-name">Show on Mobile</div>
            <div class="adctl-desc">Ads visible to phone/tablet users ${isMobile?"<span class='adctl-tag adctl-tag-you'>← you</span>":""}</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${cfg.showMobile?"checked":""} onchange="adSet('showMobile',this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>

      <div class="adctl-divider"></div>

      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">💻</span>
          <div>
            <div class="adctl-name">Show on Desktop</div>
            <div class="adctl-desc">Ads visible to PC/laptop users ${!isMobile?"<span class='adctl-tag adctl-tag-you'>← you</span>":""}</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${cfg.showDesktop?"checked":""} onchange="adSet('showDesktop',this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>
    </div>

    <div class="adm-section-title">// PERFORMANCE</div>
    <div class="adctl-card">
      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">⏱</span>
          <div>
            <div class="adctl-name">Load Delay: <span id="adDelayLabel">${cfg.delay/1000}s</span></div>
            <div class="adctl-desc">How long after page load before ads appear</div>
          </div>
        </div>
        <input type="range" min="1" max="15" value="${cfg.delay/1000}"
          style="width:90px;accent-color:#00ff88;cursor:pointer;"
          oninput="document.getElementById('adDelayLabel').innerText=this.value+'s'"
          onchange="adSet('delay', this.value*1000)">
      </div>
    </div>

    <div class="adm-section-title">// AD PLACEMENTS</div>
    <div class="adctl-card">
      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">📁</span>
          <div>
            <div class="adctl-name">Sidebar (above file list)</div>
            <div class="adctl-desc">Small banner above the file explorer</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${cfg.placements.sidebar?"checked":""} onchange="adSetPlacement('sidebar',this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>

      <div class="adctl-divider"></div>

      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">🌐</span>
          <div>
            <div class="adctl-name">Before Preview Panel</div>
            <div class="adctl-desc">Banner between editor and live preview</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${cfg.placements.preview?"checked":""} onchange="adSetPlacement('preview',this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>

      <div class="adctl-divider"></div>

      <div class="adctl-row">
        <div class="adctl-left">
          <span class="adctl-icon">🤖</span>
          <div>
            <div class="adctl-name">Inside AI Panel</div>
            <div class="adctl-desc">Banner above the AI chat messages</div>
          </div>
        </div>
        <label class="adctl-switch">
          <input type="checkbox" ${cfg.placements.aiPanel?"checked":""} onchange="adSetPlacement('aiPanel',this.checked)">
          <span class="adctl-knob"></span>
        </label>
      </div>
    </div>

    <!-- APPLY -->
    <button onclick="reloadAds()" style="
      width:100%;padding:12px;margin-top:4px;
      background:linear-gradient(135deg,rgba(0,255,136,0.12),rgba(0,200,100,0.06));
      border:1px solid rgba(0,255,136,0.3);color:#00ff88;
      border-radius:8px;font-size:13px;cursor:pointer;
      font-family:inherit;font-weight:600;letter-spacing:1px;
      transition:.2s;">
      ▶ APPLY & RELOAD ADS
    </button>
    <div style="font-size:10px;color:#1a4a3a;text-align:center;margin-top:5px;">
      Changes save instantly · Click Apply to reload ad scripts
    </div>`;
}

/* ── SETTERS ── */
function toggleLocalAdOverride(showAds) {
  // showAds=true means checkbox is checked = ads ON locally
  if (showAds) {
    localStorage.removeItem(AD_LOCAL_OVERRIDE_KEY);
    showToast("Ads enabled on this device", "info");
  } else {
    localStorage.setItem(AD_LOCAL_OVERRIDE_KEY, "1");
    showToast("Ads hidden on this device only", "info");
  }
  // reload the panel to reflect change
  const el = document.getElementById("adm-ads-content");
  if (el && typeof buildAdControlPanel === "function") el.innerHTML = buildAdControlPanel();
}

function adSet(key, value) {
  const cfg = getAdSettings();
  cfg[key] = value;
  saveAdSettings(cfg);
}

function adSetPlacement(key, value) {
  const cfg = getAdSettings();
  cfg.placements[key] = value;
  saveAdSettings(cfg);
}