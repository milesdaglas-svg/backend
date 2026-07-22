/* ══════════════════════════════════════
   APP UPDATE CHECK — native app only
   Compares the installed APK version against the version an
   admin last published (Firestore: global_settings/app_update).
   Skippable: "Later" just closes it for this open; it'll ask
   again next time the app is launched if still out of date.
══════════════════════════════════════ */

function versionIsNewer(remote, local) {
  const r = String(remote).replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
  const l = String(local).replace(/^v/i, "").split(".").map(n => parseInt(n, 10) || 0);
  const len = Math.max(r.length, l.length);
  for (let i = 0; i < len; i++) {
    const rv = r[i] || 0, lv = l[i] || 0;
    if (rv > lv) return true;
    if (rv < lv) return false;
  }
  return false;
}

function showUpdatePopup(info) {
  if (document.getElementById("appUpdatePopup")) return;

  const overlay = document.createElement("div");
  overlay.id = "appUpdatePopup";
  overlay.style.cssText = `
    position:fixed; inset:0; z-index:250000;
    background:rgba(0,0,0,0.65);
    display:flex; align-items:center; justify-content:center;
    padding:24px;
  `;
  overlay.innerHTML = `
    <div style="background:#161b22;border:1px solid rgba(88,166,255,0.3);border-radius:16px;
                max-width:360px;width:100%;padding:24px;text-align:center;
                box-shadow:0 20px 60px rgba(0,0,0,0.5);">
      <div style="font-size:40px;margin-bottom:10px;">⬆️</div>
      <div style="color:#fff;font-weight:700;font-size:17px;margin-bottom:8px;">
        Update available — v${info.version.replace(/^v/i,"")}
      </div>
      <div style="color:#c9d1d9;font-size:13.5px;line-height:1.5;margin-bottom:20px;">
        ${(info.message || "A new version is out — install for new and powerful features!").replace(/</g,"&lt;")}
      </div>
      <div style="display:flex;gap:10px;">
        <button id="appUpdateLaterBtn" style="flex:1;background:rgba(255,255,255,0.08);color:#c9d1d9;
                border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:12px;font-size:14px;font-family:inherit;">
          Later
        </button>
        <button id="appUpdateNowBtn" style="flex:1.4;background:#1f6feb;color:#fff;border:none;
                border-radius:10px;padding:12px;font-size:14px;font-weight:600;font-family:inherit;">
          Update Now
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById("appUpdateLaterBtn").onclick = () => overlay.remove();
  document.getElementById("appUpdateNowBtn").onclick = () => installUpdate(info);
}

function installUpdate(info) {
  if (window.Capacitor?.Plugins?.Browser) {
    window.Capacitor.Plugins.Browser.open({ url: info.apkUrl });
  } else {
    window.open(info.apkUrl, "_blank");
  }
}

function showUpdateSideTab(info) {
  if (document.getElementById("appUpdateSideTab")) return;

  const tab = document.createElement("div");
  tab.id = "appUpdateSideTab";
  tab.style.cssText = `
    position:fixed; right:0; top:50%; transform:translateY(-50%);
    z-index:249999;
    background:#1f6feb; color:#fff;
    padding:10px 8px;
    border-radius:10px 0 0 10px;
    box-shadow:-2px 0 10px rgba(0,0,0,0.35);
    display:flex; flex-direction:column; align-items:center; gap:4px;
    cursor:pointer;
    font-family:inherit; font-size:11px; font-weight:700;
    writing-mode:vertical-rl; text-orientation:mixed;
    letter-spacing:0.5px;
  `;
  tab.innerHTML = `<span style="font-size:14px;">⬆️</span><span>INSTALL</span>`;
  tab.onclick = () => showUpdatePopup(info);
  document.body.appendChild(tab);
}

async function checkForAppUpdate() {
  try {
    if (!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) return;
    if (!window.Capacitor.Plugins?.App?.getInfo) return;

    const appInfo = await window.Capacitor.Plugins.App.getInfo();
    const localVersion = appInfo?.version;
    if (!localVersion) return;

    const db = typeof initAnnounceDB === "function" ? await initAnnounceDB() : null;
    if (!db) return;
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", "app_update"));
    if (!snap.exists()) return;

    const info = snap.data();
    if (!info?.version || !info?.apkUrl) return;

    if (versionIsNewer(info.version, localVersion)) {
      setTimeout(() => showUpdatePopup(info), 1500);
      showUpdateSideTab(info);
    }
  } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(checkForAppUpdate, 2000);
});