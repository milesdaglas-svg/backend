/* ══════════════════════════════════════
   ONBOARDING TOUR
   Spotlight walkthrough for new + existing users
══════════════════════════════════════ */

const ONBOARDING_SEEN_KEY = "godmode_onboarding_seen_v1";

const ONBOARDING_STEPS = [
  {
    title: "👋 Welcome to VS Code God Mode",
    text: "This is a full code editor that runs right in your browser. This quick tour will show you what everything does — you can skip it anytime, and replay it later from the ❓ button in the sidebar."
  },
  {
    selector: "#editor1",
    title: "📝 Code Editor",
    text: "This is where you write and edit your code. It works like a real code editor — syntax highlighting, auto-complete, multiple tabs."
  },
  {
    selector: ".activity-btn[data-panel='explorer']",
    title: "📁 Explorer",
    text: "Browse, create, rename, and delete your project's files and folders here."
  },
  {
    selector: ".activity-btn[data-panel='search']",
    title: "🔍 Search",
    text: "Search for text across every file in your project at once — and replace it too."
  },
  {
    selector: ".activity-btn[data-panel='source-control']",
    title: "🌿 Source Control",
    text: "See what's changed since your last commit, write a commit message, and commit your work — like Git, built in."
  },
  {
    selector: ".activity-btn[data-panel='github']",
    title: "🐙 GitHub Panel",
    text: "Connect your GitHub account, pick a repository and branch, then push or pull your code straight to/from GitHub."
  },
  {
    selector: ".activity-btn[data-panel='extensions']",
    title: "🧩 Extensions",
    text: "Browse and install extensions to add new features and tools to your editor."
  },
  {
    selector: ".activity-btn[data-panel='myapps']",
    title: "📦 My Apps",
    text: "Your own app store — add apps here with their name, icon, and link so people can discover and open them."
  },
  {
    selector: "#runBtn",
    title: "▶ Run",
    text: "Runs your project and shows the live result in the preview panel."
  },
  {
    selector: "#saveBtn",
    title: "💾 Save",
    text: "Saves your current file. Your work also saves automatically as you type."
  },
  {
    selector: "#downloadAllBtn",
    title: "⬇ Export ZIP",
    text: "Download your entire project as a ZIP file to your device."
  },
  {
    selector: "#importZipBtn",
    title: "⬆ Import ZIP",
    text: "Already have a project as a ZIP file? Import it here to load it straight into the editor."
  },
  {
    selector: "#terminalToggleBtn",
    title: "⬛ Terminal",
    text: "Opens a real terminal. There's a lightweight Shell for quick commands, and My VM — a full dedicated cloud machine — for real project work."
  },
  {
    selector: "#toggleAiBtn",
    title: "🤖 AI Assistant",
    text: "Chat with an AI assistant that can help you write, explain, and fix your code. You can pick between several AI providers in Settings."
  },
  {
    selector: "#githubLoginBtn",
    title: "🔐 GitHub Login",
    text: "Connect your GitHub account — this powers the Source Control panel, GitHub panel, and My VM feature."
  },
  {
    selector: "#adminBtn",
    title: "🔐 Admin",
    text: "Admin controls for managing the app itself — users, announcements, and settings for everyone."
  },
  {
    selector: "#settingsBtn",
    title: "⚙️ Settings",
    text: "Add your own API keys for AI providers, connect Firebase, and configure custom AI models."
  },
  {
    selector: "#shareBtn",
    title: "🔗 Share",
    text: "Generates a link so you can share your project with someone else."
  },
  {
    selector: "#historyBtn",
    title: "🕐 History",
    text: "See and restore older versions of your files."
  },
  {
    title: "🎉 That's everything!",
    text: "You can replay this tour anytime — just tap the ❓ icon in the sidebar. Now go build something!"
  }
];

let onboardingStepIndex = 0;

function startOnboardingTour() {
  onboardingStepIndex = 0;
  buildOnboardingOverlay();
  showOnboardingStep(0);
}

function buildOnboardingOverlay() {
  if (document.getElementById("onboardingOverlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "onboardingOverlay";
  overlay.className = "onboarding-overlay";
  overlay.innerHTML = `
    <div class="onboarding-highlight" id="onboardingHighlight"></div>
    <div class="onboarding-tooltip" id="onboardingTooltip">
      <div class="onboarding-arrow" id="onboardingArrow"></div>
      <div class="onboarding-step-count" id="onboardingStepCount"></div>
      <div class="onboarding-title" id="onboardingTitle"></div>
      <div class="onboarding-text" id="onboardingText"></div>
      <div class="onboarding-actions">
        <button class="onboarding-btn onboarding-skip" onclick="skipOnboardingTour()">Skip tour</button>
        <div style="flex:1;"></div>
        <button class="onboarding-btn onboarding-back" id="onboardingBackBtn" onclick="onboardingStep(-1)">Back</button>
        <button class="onboarding-btn onboarding-next" id="onboardingNextBtn" onclick="onboardingStep(1)">Next</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

function onboardingStep(dir) {
  const next = onboardingStepIndex + dir;
  if (next < 0) return;
  if (next >= ONBOARDING_STEPS.length) { finishOnboardingTour(); return; }
  onboardingStepIndex = next;
  showOnboardingStep(onboardingStepIndex);
}

function showOnboardingStep(index) {
  const step = ONBOARDING_STEPS[index];
  const highlight = document.getElementById("onboardingHighlight");
  const tooltip = document.getElementById("onboardingTooltip");
  const arrow = document.getElementById("onboardingArrow");

  document.getElementById("onboardingStepCount").innerText = `${index + 1} / ${ONBOARDING_STEPS.length}`;
  document.getElementById("onboardingTitle").innerText = step.title;
  document.getElementById("onboardingText").innerText = step.text;
  document.getElementById("onboardingBackBtn").style.visibility = index === 0 ? "hidden" : "visible";
  document.getElementById("onboardingNextBtn").innerText = index === ONBOARDING_STEPS.length - 1 ? "Finish" : "Next";

  const target = step.selector ? document.querySelector(step.selector) : null;

  if (!target) {
    highlight.style.display = "none";
    arrow.style.display = "none";
    tooltip.classList.add("onboarding-centered");
    tooltip.style.top = "50%";
    tooltip.style.left = "50%";
    tooltip.style.transform = "translate(-50%,-50%)";
    return;
  }

  tooltip.classList.remove("onboarding-centered");
  tooltip.style.transform = "none";
  highlight.style.display = "block";
  arrow.style.display = "block";

  target.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });

  requestAnimationFrame(() => positionOnboarding(target, highlight, tooltip, arrow));
}

function positionOnboarding(target, highlight, tooltip, arrow) {
  const rect = target.getBoundingClientRect();
  const pad = 6;

  highlight.style.top = `${rect.top - pad}px`;
  highlight.style.left = `${rect.left - pad}px`;
  highlight.style.width = `${rect.width + pad * 2}px`;
  highlight.style.height = `${rect.height + pad * 2}px`;

  const margin = 14;
  const tw = tooltip.offsetWidth || 280;
  const th = tooltip.offsetHeight || 140;
  const vw = window.innerWidth, vh = window.innerHeight;
  const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

  let top, left, arrowPos;

  if (rect.bottom + margin + th < vh) {
    top = rect.bottom + margin;
    left = clamp(rect.left + rect.width / 2 - tw / 2, 8, vw - tw - 8);
    arrowPos = "top";
  } else if (rect.top - margin - th > 0) {
    top = rect.top - margin - th;
    left = clamp(rect.left + rect.width / 2 - tw / 2, 8, vw - tw - 8);
    arrowPos = "bottom";
  } else if (rect.right + margin + tw < vw) {
    left = rect.right + margin;
    top = clamp(rect.top + rect.height / 2 - th / 2, 8, vh - th - 8);
    arrowPos = "left";
  } else {
    left = clamp(rect.left - margin - tw, 8, vw - tw - 8);
    top = clamp(rect.top + rect.height / 2 - th / 2, 8, vh - th - 8);
    arrowPos = "right";
  }

  tooltip.style.top = `${top}px`;
  tooltip.style.left = `${left}px`;
  arrow.className = `onboarding-arrow onboarding-arrow-${arrowPos}`;

  if (arrowPos === "top" || arrowPos === "bottom") {
    arrow.style.left = `${clamp(rect.left + rect.width / 2 - left - 8, 10, tw - 26)}px`;
    arrow.style.top = "";
  } else {
    arrow.style.top = `${clamp(rect.top + rect.height / 2 - top - 8, 10, th - 26)}px`;
    arrow.style.left = "";
  }
}

function skipOnboardingTour() { finishOnboardingTour(); }

function finishOnboardingTour() {
  document.getElementById("onboardingOverlay")?.remove();
  try { localStorage.setItem(ONBOARDING_SEEN_KEY, "1"); } catch {}
}

window.addEventListener("resize", () => {
  const overlay = document.getElementById("onboardingOverlay");
  if (!overlay) return;
  const step = ONBOARDING_STEPS[onboardingStepIndex];
  const target = step?.selector ? document.querySelector(step.selector) : null;
  if (target) positionOnboarding(target, document.getElementById("onboardingHighlight"), document.getElementById("onboardingTooltip"), document.getElementById("onboardingArrow"));
});

// Auto-start once — for new AND existing users, since this feature is new to everyone
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    let seen = false;
    try { seen = localStorage.getItem(ONBOARDING_SEEN_KEY) === "1"; } catch {}
    if (!seen) startOnboardingTour();
  }, 1200);
});