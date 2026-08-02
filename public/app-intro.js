/* ══════════════════════════════════════
   APP INTRO — swipe-through splash (native app only)
   Slides + captions are managed live from the Admin Panel.
   Re-shows automatically whenever admin publishes changes.
══════════════════════════════════════ */

const APP_INTRO_CACHE_KEY     = "godmode_app_intro_cache_v2";
const APP_INTRO_LASTSEEN_KEY  = "godmode_app_intro_lastseen_v2";

// Fallback slides used only if Firestore has never been configured yet
const APP_INTRO_FALLBACK_SLIDES = [
  { url: "app-intro/slide1.jpg", caption: "" },
  { url: "app-intro/slide2.jpg", caption: "" },
  { url: "app-intro/slide3.jpg", caption: "" },
  { url: "app-intro/slide4.jpg", caption: "" }
];

function isNativeGodModeApp() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

async function fetchAppIntroSlides() {
  try {
    const db = typeof initAnnounceDB === "function" ? await initAnnounceDB() : null;
    if (!db) throw new Error("no db");
    const { doc, getDoc } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const snap = await getDoc(doc(db, "global_settings", "app_intro"));
    if (!snap.exists()) throw new Error("no doc");
    const data = snap.data();
    if (!Array.isArray(data.slides) || !data.slides.length) throw new Error("empty");
    const result = { slides: data.slides, updatedAt: data.updatedAt || 0 };
    try { localStorage.setItem(APP_INTRO_CACHE_KEY, JSON.stringify(result)); } catch {}
    return result;
  } catch (e) {
    try {
      const cached = localStorage.getItem(APP_INTRO_CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return { slides: APP_INTRO_FALLBACK_SLIDES, updatedAt: 0 };
  }
}

function buildAppIntroOverlay(slides, updatedAt) {
  const overlay = document.createElement("div");
  overlay.id = "appIntroOverlay";
  overlay.className = "app-intro-overlay";

  const slidesHtml = slides.map((s, i) =>
    `<div class="app-intro-slide">
       <img src="${s.url}" alt="slide ${i + 1}">
       ${s.caption ? `<div class="app-intro-caption">${s.caption.replace(/</g,"&lt;")}</div>` : ""}
     </div>`
  ).join("");

  const dotsHtml = slides.map((_, i) =>
    `<div class="app-intro-dot${i === 0 ? " active" : ""}" data-dot="${i}"></div>`
  ).join("");

  overlay.innerHTML = `
    <button class="app-intro-skip" id="appIntroSkip">Skip</button>
    <div class="app-intro-track" id="appIntroTrack">${slidesHtml}</div>
    <div class="app-intro-dots" id="appIntroDots">${dotsHtml}</div>
    <button class="app-intro-cta" id="appIntroCta">Get Started</button>
  `;
  document.body.appendChild(overlay);

  const track = overlay.querySelector("#appIntroTrack");
  const dots = overlay.querySelectorAll(".app-intro-dot");
  const cta = overlay.querySelector("#appIntroCta");
  const skip = overlay.querySelector("#appIntroSkip");
  const lastIndex = slides.length - 1;

  function updateActiveSlide() {
    const index = Math.round(track.scrollLeft / track.clientWidth);
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
    cta.classList.toggle("show", index === lastIndex);
  }

  track.addEventListener("scroll", () => {
    requestAnimationFrame(updateActiveSlide);
  }, { passive: true });

  cta.addEventListener("click", () => finishAppIntro(updatedAt));
  skip.addEventListener("click", () => finishAppIntro(updatedAt));

  window.addEventListener("resize", () => {
    track.scrollLeft = Math.round(track.scrollLeft / track.clientWidth) * track.clientWidth;
  });

  if (slides.length === 1) cta.classList.add("show");
}

function finishAppIntro(updatedAt) {
  const overlay = document.getElementById("appIntroOverlay");
  if (overlay) overlay.remove();
  try { localStorage.setItem(APP_INTRO_LASTSEEN_KEY, String(updatedAt || 0)); } catch {}
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!isNativeGodModeApp()) return;

  const { slides, updatedAt } = await fetchAppIntroSlides();
  if (!slides || !slides.length) return;

  let lastSeen = 0;
  try { lastSeen = Number(localStorage.getItem(APP_INTRO_LASTSEEN_KEY) || 0); } catch {}

  if (updatedAt && updatedAt <= lastSeen) return;

  buildAppIntroOverlay(slides, updatedAt);
});