/* =========================
   AD REVENUE STATS v1
   - Track page views
   - Track ad impressions
   - Track estimated earnings
   - Session analytics
   - All stored in Firebase
     + localStorage backup
   - Beautiful dashboard
========================= */

const AD_STATS_KEY   = "vscode_ad_stats_local";
const AD_STATS_COL   = "ad_stats";
const AD_DAILY_COL   = "ad_daily";

/* ══════════════════════
   TRACK PAGE VIEW
   Called on every load
══════════════════════ */
async function trackAdPageView() {
  const today = getToday();
  const stats  = getLocalStats();

  stats.totalViews = (stats.totalViews || 0) + 1;
  stats.daily[today] = stats.daily[today] || { views:0, impressions:0, clicks:0, sessions:0 };
  stats.daily[today].views++;
  stats.daily[today].sessions++;
  stats.lastSeen = Date.now();

  saveLocalStats(stats);
  await pushStatsToCloud({ type:"view", date:today });
}

/* ══════════════════════
   TRACK AD IMPRESSION
   Call this when an ad
   becomes visible
══════════════════════ */
async function trackAdImpression(provider="unknown") {
  const today = getToday();
  const stats  = getLocalStats();

  stats.totalImpressions = (stats.totalImpressions||0) + 1;
  stats.daily[today] = stats.daily[today] || { views:0, impressions:0, clicks:0 };
  stats.daily[today].impressions++;
  if (!stats.byProvider) stats.byProvider = {};
  stats.byProvider[provider] = (stats.byProvider[provider]||0) + 1;

  saveLocalStats(stats);
  await pushStatsToCloud({ type:"impression", provider, date:today });
}

/* ══════════════════════
   TRACK AD CLICK
══════════════════════ */
async function trackAdClick(provider="unknown") {
  const today = getToday();
  const stats  = getLocalStats();

  stats.totalClicks = (stats.totalClicks||0) + 1;
  stats.daily[today] = stats.daily[today] || { views:0, impressions:0, clicks:0 };
  stats.daily[today].clicks++;

  saveLocalStats(stats);
  await pushStatsToCloud({ type:"click", provider, date:today });
}

/* ══════════════════════
   ESTIMATED EARNINGS
   Based on industry avg:
   CPM $1.5 (per 1000 imp)
   CPC $0.05 (per click)
══════════════════════ */
function estimateEarnings(impressions, clicks) {
  const cpm = 1.5;
  const cpc = 0.05;
  return ((impressions / 1000) * cpm) + (clicks * cpc);
}

/* ══════════════════════
   LOCAL STATS
══════════════════════ */
function getLocalStats() {
  try {
    const s = localStorage.getItem(AD_STATS_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { totalViews:0, totalImpressions:0, totalClicks:0, daily:{}, byProvider:{}, lastSeen:null };
}

function saveLocalStats(stats) {
  try {
    // only keep last 30 days
    const keys = Object.keys(stats.daily || {}).sort().reverse();
    if (keys.length > 30) {
      const keep = keys.slice(0, 30);
      const newDaily = {};
      keep.forEach(k => { newDaily[k] = stats.daily[k]; });
      stats.daily = newDaily;
    }
    localStorage.setItem(AD_STATS_KEY, JSON.stringify(stats));
  } catch {}
}

/* ══════════════════════
   FIREBASE CLOUD STATS
══════════════════════ */
async function pushStatsToCloud(event) {
  const db = typeof initAnnounceDB === "function" ? await initAnnounceDB() : null;
  if (!db) return;
  try {
    const { collection, addDoc } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    await addDoc(collection(db, AD_STATS_COL), {
      ...event,
      timestamp: Date.now(),
      userAgent: navigator.userAgent.slice(0, 80),
      device: /Mobi|Android/i.test(navigator.userAgent) ? "mobile" : "desktop"
    });
  } catch {}
}

async function getCloudStats() {
  const db = typeof initAnnounceDB === "function" ? await initAnnounceDB() : null;
  if (!db) return null;
  try {
    const { collection, getDocs, query, orderBy, limit } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDocs(
      query(collection(db, AD_STATS_COL), orderBy("timestamp","desc"), limit(500))
    );
    return snap.docs.map(d => d.data());
  } catch { return null; }
}

/* ══════════════════════
   BUILD STATS DASHBOARD
   rendered in admin panel
══════════════════════ */
async function buildAdStatsDashboard() {
  const local  = getLocalStats();
  const today  = getToday();
  const todayD = local.daily[today] || { views:0, impressions:0, clicks:0 };

  // last 7 days data
  const last7 = getLast7Days().map(d => ({
    date:  d,
    label: formatDateLabel(d),
    ...( local.daily[d] || { views:0, impressions:0, clicks:0 })
  }));

  const totalEst  = estimateEarnings(local.totalImpressions||0, local.totalClicks||0);
  const todayEst  = estimateEarnings(todayD.impressions||0, todayD.clicks||0);
  const ctr       = local.totalImpressions
    ? ((local.totalClicks / local.totalImpressions) * 100).toFixed(2)
    : "0.00";

  // device split from visitor tracking
  const visitorStats = typeof fetchAdminStats === "function" ? await fetchAdminStats() : null;
  const mobileCount  = visitorStats?.mobile  || 0;
  const desktopCount = visitorStats?.desktop || 0;

  return `
    <div class="adm-section-title">// TODAY — ${formatDateLabel(today)}</div>
    <div class="adst-grid">
      <div class="adst-card adst-green">
        <div class="adst-icon">💰</div>
        <div class="adst-val">$${todayEst.toFixed(4)}</div>
        <div class="adst-label">Est. Today</div>
      </div>
      <div class="adst-card adst-blue">
        <div class="adst-icon">👁</div>
        <div class="adst-val">${(todayD.views||0).toLocaleString()}</div>
        <div class="adst-label">Page Views</div>
      </div>
      <div class="adst-card adst-purple">
        <div class="adst-icon">📢</div>
        <div class="adst-val">${(todayD.impressions||0).toLocaleString()}</div>
        <div class="adst-label">Impressions</div>
      </div>
      <div class="adst-card adst-orange">
        <div class="adst-icon">🖱</div>
        <div class="adst-val">${(todayD.clicks||0).toLocaleString()}</div>
        <div class="adst-label">Clicks</div>
      </div>
    </div>

    <div class="adm-section-title">// ALL TIME TOTALS</div>
    <div class="adst-grid">
      <div class="adst-card adst-green adst-big">
        <div class="adst-icon">💵</div>
        <div class="adst-val">$${totalEst.toFixed(2)}</div>
        <div class="adst-label">Est. Total Revenue</div>
        <div class="adst-note">Based on avg CPM $1.50</div>
      </div>
      <div class="adst-card adst-blue adst-big">
        <div class="adst-icon">📊</div>
        <div class="adst-val">${(local.totalViews||0).toLocaleString()}</div>
        <div class="adst-label">Total Page Views</div>
      </div>
      <div class="adst-card adst-teal adst-big">
        <div class="adst-icon">%</div>
        <div class="adst-val">${ctr}%</div>
        <div class="adst-label">Click-Through Rate</div>
        <div class="adst-note">Industry avg: 0.1%</div>
      </div>
      <div class="adst-card adst-orange adst-big">
        <div class="adst-icon">📱</div>
        <div class="adst-val">${mobileCount}</div>
        <div class="adst-label">Mobile Users</div>
        <div class="adst-note">${desktopCount} desktop</div>
      </div>
    </div>

    <div class="adm-section-title">// LAST 7 DAYS</div>
    <div class="adst-chart-wrap">
      <div class="adst-chart">
        ${buildBarChart(last7)}
      </div>
      <div class="adst-chart-labels">
        ${last7.map(d=>`<span>${d.label}</span>`).join("")}
      </div>
    </div>

    <div class="adm-section-title">// DAILY BREAKDOWN</div>
    <div class="adst-table-wrap">
      <table class="adst-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Views</th>
            <th>Impressions</th>
            <th>Clicks</th>
            <th>CTR</th>
            <th>Est. Revenue</th>
          </tr>
        </thead>
        <tbody>
          ${last7.map(d => {
            const dctr = d.impressions ? ((d.clicks/d.impressions)*100).toFixed(2) : "0.00";
            const dest = estimateEarnings(d.impressions||0, d.clicks||0);
            return `<tr>
              <td>${d.label}</td>
              <td>${(d.views||0).toLocaleString()}</td>
              <td>${(d.impressions||0).toLocaleString()}</td>
              <td>${(d.clicks||0).toLocaleString()}</td>
              <td>${dctr}%</td>
              <td style="color:#00ff88">$${dest.toFixed(4)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>

    <div class="adst-disclaimer">
      ⚠ Revenue estimates are approximations based on industry average CPM ($1.50) and CPC ($0.05).
      Actual earnings depend on your ad network rates, region, and ad quality score.
      Check your Monetag and Propush dashboards for real figures.
    </div>

    <button onclick="refreshAdStats()" style="
      width:100%;padding:10px;margin-top:6px;
      background:rgba(0,212,255,0.08);border:1px solid rgba(0,212,255,0.2);
      color:#00d4ff;border-radius:8px;font-size:12px;
      cursor:pointer;font-family:inherit;">
      🔄 Refresh Stats
    </button>`;
}

function buildBarChart(days) {
  const maxViews = Math.max(...days.map(d=>d.views||0), 1);
  return days.map(d => {
    const h = Math.max(4, Math.round(((d.views||0)/maxViews)*80));
    return `<div class="adst-bar-wrap">
      <div class="adst-bar" style="height:${h}px" title="${d.label}: ${d.views} views"></div>
    </div>`;
  }).join("");
}

async function refreshAdStats() {
  const el = document.getElementById("adm-stats-content");
  if (!el) return;
  el.innerHTML = `<div class="adm-feed-loading">// Refreshing...</div>`;
  el.innerHTML = await buildAdStatsDashboard();
}

/* ══════════════════════
   DATE HELPERS
══════════════════════ */
function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getLast7Days() {
  const days = [];
  for (let i=6; i>=0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

function formatDateLabel(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en",{ month:"short", day:"numeric" });
}
