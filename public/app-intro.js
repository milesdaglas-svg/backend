/* ══════════════════════════════════════
   APP INTRO — swipe-through splash (native app only)
   Shows once on first launch of the packaged app.
   Ends on the Visual Studio Code slide, then reveals the app.
══════════════════════════════════════ */

const APP_INTRO_SEEN_KEY = "godmode_app_intro_seen_v1";

const APP_INTRO_SLIDES = [
  "app-intro/slide1.jpg",
  "app-intro/slide2.jpg",
  "app-intro/slide3.jpg",
  "app-intro/slide4.jpg" // Visual Studio Code logo — last slide
];

function isNativeGodModeApp() {
  return !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
}

function buildAppIntroOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "appIntroOverlay";
  overlay.className = "app-intro-overlay";

  const slidesHtml = APP_INTRO_SLIDES.map((src, i) =>
    `<div class="app-intro-slide"><img src="${src}" alt="slide ${i + 1}"></div>`
  ).join("");

  const dotsHtml = APP_INTRO_SLIDES.map((_, i) =>
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
  const lastIndex = APP_INTRO_SLIDES.length - 1;

  function updateActiveSlide() {
    const index = Math.round(track.scrollLeft / track.clientWidth);
    dots.forEach((d, i) => d.classList.toggle("active", i === index));
    cta.classList.toggle("show", index === lastIndex);
  }

  track.addEventListener("scroll", () => {
    requestAnimationFrame(updateActiveSlide);
  }, { passive: true });

  cta.addEventListener("click", finishAppIntro);
  skip.addEventListener("click", finishAppIntro);

  window.addEventListener("resize", () => {
    track.scrollLeft = Math.round(track.scrollLeft / track.clientWidth) * track.clientWidth;
  });
}

function finishAppIntro() {
  const overlay = document.getElementById("appIntroOverlay");
  if (overlay) overlay.remove();
  try { localStorage.setItem(APP_INTRO_SEEN_KEY, "1"); } catch {}
}

document.addEventListener("DOMContentLoaded", () => {
  if (!isNativeGodModeApp()) return;

  let seen = false;
  try { seen = localStorage.getItem(APP_INTRO_SEEN_KEY) === "1"; } catch {}
  if (seen) return;

  buildAppIntroOverlay();
});
