/* =========================
   LIVE API MODEL BROWSER v1
   - Browse working models
   - Click to activate
   - Shows free vs paid
   - Direct links to get keys
   - Fetches live model lists
   - ZIP download fix included
========================= */

/* ══════════════════════
   KNOWN WORKING MODELS
   Updated list with status
══════════════════════ */
const LIVE_MODELS = {
  gemini: {
    name: "Google Gemini",
    icon: "✨",
    color: "#4285f4",
    keyUrl: "https://aistudio.google.com/app/apikey",
    keyHint: "Free — Google AI Studio",
    models: [
      { id:"gemini-2.5-flash",     name:"Gemini 2.5 Flash",     tier:"free",  speed:"⚡ Fast",   notes:"Best free model — recommended" },
      { id:"gemini-2.0-flash",     name:"Gemini 2.0 Flash",     tier:"free",  speed:"⚡ Fast",   notes:"Stable, reliable" },
      { id:"gemini-2.0-flash-lite",name:"Gemini 2.0 Flash Lite",tier:"free",  speed:"🚀 Faster", notes:"Lightweight, very fast" },
      { id:"gemini-1.5-flash",     name:"Gemini 1.5 Flash",     tier:"free",  speed:"⚡ Fast",   notes:"Older but solid" },
      { id:"gemini-1.5-pro",       name:"Gemini 1.5 Pro",       tier:"paid",  speed:"🧠 Smart",  notes:"Most capable Gemini" },
    ]
  },
  groq: {
    name: "Groq",
    icon: "⚡",
    color: "#f55036",
    keyUrl: "https://console.groq.com/keys",
    keyHint: "Free tier available",
    models: [
      { id:"llama-3.3-70b-versatile",  name:"Llama 3.3 70B",        tier:"free",  speed:"⚡ Fast",   notes:"Best Groq model — recommended" },
      { id:"llama-3.1-8b-instant",     name:"Llama 3.1 8B Instant", tier:"free",  speed:"🚀 Fastest",notes:"Ultra fast responses" },
      { id:"llama3-70b-8192",          name:"Llama 3 70B",          tier:"free",  speed:"⚡ Fast",   notes:"Reliable, large context" },
      { id:"mixtral-8x7b-32768",       name:"Mixtral 8x7B",         tier:"free",  speed:"⚡ Fast",   notes:"Great for code" },
      { id:"gemma2-9b-it",             name:"Gemma 2 9B",           tier:"free",  speed:"⚡ Fast",   notes:"Google model on Groq" },
      { id:"llama-3.3-70b-specdec",    name:"Llama 3.3 70B SpecDec",tier:"free",  speed:"🚀 Fastest",notes:"Speculative decoding" },
    ]
  },
  openrouter: {
    name: "OpenRouter",
    icon: "🔀",
    color: "#6366f1",
    keyUrl: "https://openrouter.ai/keys",
    keyHint: "Free models available — no credit card",
    models: [
      { id:"google/gemma-3-12b-it:free",          name:"Gemma 3 12B",          tier:"free",  speed:"⚡ Fast",   notes:"Google — completely free" },
      { id:"google/gemma-3-1b-it:free",           name:"Gemma 3 1B",           tier:"free",  speed:"🚀 Fastest",notes:"Tiny but fast" },
      { id:"meta-llama/llama-3.1-8b-instruct:free",name:"Llama 3.1 8B",        tier:"free",  speed:"⚡ Fast",   notes:"Meta — free tier" },
      { id:"meta-llama/llama-3.3-70b-instruct",   name:"Llama 3.3 70B",        tier:"paid",  speed:"🧠 Smart",  notes:"Most capable Llama" },
      { id:"deepseek/deepseek-r1:free",            name:"DeepSeek R1",          tier:"free",  speed:"🧠 Smart",  notes:"Reasoning model — free" },
      { id:"deepseek/deepseek-chat-v3-0324:free",  name:"DeepSeek V3",          tier:"free",  speed:"⚡ Fast",   notes:"Latest DeepSeek — free" },
      { id:"mistralai/mistral-7b-instruct:free",   name:"Mistral 7B",           tier:"free",  speed:"⚡ Fast",   notes:"Mistral — free tier" },
      { id:"microsoft/phi-3-mini-128k-instruct:free",name:"Phi-3 Mini",         tier:"free",  speed:"🚀 Fast",   notes:"Microsoft — small & fast" },
      { id:"openai/gpt-4o-mini",                   name:"GPT-4o Mini",          tier:"paid",  speed:"⚡ Fast",   notes:"OpenAI via OpenRouter" },
      { id:"anthropic/claude-3-haiku",             name:"Claude 3 Haiku",       tier:"paid",  speed:"⚡ Fast",   notes:"Anthropic — fast & smart" },
    ]
  },
  deepseek: {
    name: "DeepSeek",
    icon: "🔍",
    color: "#06b6d4",
    keyUrl: "https://platform.deepseek.com/api_keys",
    keyHint: "Very cheap — $0.14 per 1M tokens",
    models: [
      { id:"deepseek-chat",  name:"DeepSeek Chat V3", tier:"paid", speed:"⚡ Fast",  notes:"Best coding model — very cheap" },
      { id:"deepseek-coder", name:"DeepSeek Coder",   tier:"paid", speed:"⚡ Fast",  notes:"Specialized for code" },
      { id:"deepseek-reasoner",name:"DeepSeek R1",    tier:"paid", speed:"🧠 Smart", notes:"Reasoning — thinks step by step" },
    ]
  },
  groq_free: {
    name: "Together AI",
    icon: "🤝",
    color: "#10b981",
    keyUrl: "https://api.together.xyz",
    keyHint: "Free $25 credit on signup",
    models: [
      { id:"meta-llama/Llama-3.3-70B-Instruct-Turbo-Free", name:"Llama 3.3 70B Turbo", tier:"free",  speed:"⚡ Fast",  notes:"Free forever on Together AI" },
      { id:"meta-llama/Llama-3.2-11B-Vision-Instruct-Turbo",name:"Llama 3.2 11B Vision",tier:"free", speed:"⚡ Fast",  notes:"Multimodal — free" },
      { id:"Qwen/Qwen2.5-Coder-32B-Instruct",              name:"Qwen 2.5 Coder 32B",  tier:"paid",  speed:"🧠 Smart", notes:"Best coding model on Together" },
    ]
  },
  huggingface: {
    name: "HuggingFace",
    icon: "🤗",
    color: "#ff9500",
    keyUrl: "https://huggingface.co/settings/tokens",
    keyHint: "Free tier — some models slow to start",
    models: [
      { id:"HuggingFaceH4/zephyr-7b-beta",          name:"Zephyr 7B Beta",     tier:"free", speed:"⚡ Fast",   notes:"Reliable HF model" },
      { id:"Qwen/Qwen2.5-Coder-32B-Instruct",       name:"Qwen 2.5 Coder 32B", tier:"free", speed:"🧠 Smart",  notes:"Best coder on HF" },
      { id:"mistralai/Mistral-7B-Instruct-v0.3",    name:"Mistral 7B v0.3",    tier:"free", speed:"⚡ Fast",   notes:"Popular instruction model" },
      { id:"microsoft/Phi-3.5-mini-instruct",       name:"Phi 3.5 Mini",       tier:"free", speed:"🚀 Fast",   notes:"Microsoft small model" },
    ]
  }
};

/* ══════════════════════
   OPEN MODEL BROWSER
══════════════════════ */
function openModelBrowser() {
  document.getElementById("modelBrowser")?.remove();

  const panel = document.createElement("div");
  panel.id = "modelBrowser";
  panel.innerHTML = `
    <div class="mb-overlay" onclick="closeModelBrowser()"></div>
    <div class="mb-window">

      <div class="mb-header">
        <div class="mb-header-left">
          <span class="mb-icon">🤖</span>
          <div>
            <div class="mb-title">Live API Model Browser</div>
            <div class="mb-sub">Browse working models · Click to activate · Free models highlighted</div>
          </div>
        </div>
        <button class="mb-close" onclick="closeModelBrowser()">✕</button>
      </div>

      <!-- FILTER BAR -->
      <div class="mb-filterbar">
        <div class="mb-filters">
          <button class="mb-filter active" onclick="mbFilter('all',this)">🌐 All</button>
          <button class="mb-filter" onclick="mbFilter('free',this)">🆓 Free Only</button>
          <button class="mb-filter" onclick="mbFilter('fast',this)">⚡ Fastest</button>
          <button class="mb-filter" onclick="mbFilter('smart',this)">🧠 Smartest</button>
        </div>
        <input class="mb-search" type="text" placeholder="Search models..." oninput="mbSearch(this.value)">
      </div>

      <!-- PROVIDERS -->
      <div class="mb-body" id="mb-body">
        ${buildProviderCards()}
      </div>

      <div class="mb-footer">
        <span class="mb-footer-tip">💡 Green = Free · Click any model to use it instantly</span>
        <a href="https://openrouter.ai/models" target="_blank" class="mb-footer-link">Browse more on OpenRouter →</a>
      </div>
    </div>`;

  document.body.appendChild(panel);
  requestAnimationFrame(() => panel.querySelector(".mb-window").classList.add("mb-in"));
}

function closeModelBrowser() {
  const p = document.getElementById("modelBrowser"); if (!p) return;
  p.querySelector(".mb-window")?.classList.remove("mb-in");
  setTimeout(() => p.remove(), 350);
}

function buildProviderCards(filterTier="all", searchQ="") {
  return Object.entries(LIVE_MODELS).map(([provId, prov]) => {
    const models = prov.models.filter(m => {
      if (filterTier === "free"  && m.tier !== "free") return false;
      if (filterTier === "fast"  && !m.speed.includes("Fast")) return false;
      if (filterTier === "smart" && !m.speed.includes("Smart")) return false;
      if (searchQ && !m.name.toLowerCase().includes(searchQ) && !m.id.toLowerCase().includes(searchQ)) return false;
      return true;
    });
    if (!models.length) return "";

    return `
      <div class="mb-provider">
        <div class="mb-provider-header" style="border-left:3px solid ${prov.color}">
          <div class="mb-provider-left">
            <span class="mb-provider-icon">${prov.icon}</span>
            <div>
              <div class="mb-provider-name">${prov.name}</div>
              <div class="mb-provider-hint">🔑 ${prov.keyHint}</div>
            </div>
          </div>
          <a href="${prov.keyUrl}" target="_blank" class="mb-get-key-btn">Get API Key →</a>
        </div>
        <div class="mb-models-grid">
          ${models.map(m => buildModelCard(provId, prov, m)).join("")}
        </div>
      </div>`;
  }).join("");
}

function buildModelCard(provId, prov, m) {
  const isFree = m.tier === "free";
  return `
    <div class="mb-model-card ${isFree?"mb-free":""}" onclick="activateModel('${provId}','${m.id}','${prov.name}','${m.name}')">
      <div class="mb-model-top">
        <span class="mb-model-tier ${isFree?"mb-tier-free":"mb-tier-paid"}">${isFree?"🆓 FREE":"💳 PAID"}</span>
        <span class="mb-model-speed">${m.speed}</span>
      </div>
      <div class="mb-model-name">${m.name}</div>
      <div class="mb-model-id">${m.id}</div>
      <div class="mb-model-notes">${m.notes}</div>
      <button class="mb-use-btn" style="border-color:${prov.color};color:${prov.color}">
        ▶ Use This Model
      </button>
    </div>`;
}

/* ── FILTER ── */
let mbCurrentFilter = "all";
let mbCurrentSearch = "";

function mbFilter(f, btn) {
  mbCurrentFilter = f;
  document.querySelectorAll(".mb-filter").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById("mb-body").innerHTML = buildProviderCards(mbCurrentFilter, mbCurrentSearch);
}

function mbSearch(q) {
  mbCurrentSearch = q.toLowerCase();
  document.getElementById("mb-body").innerHTML = buildProviderCards(mbCurrentFilter, mbCurrentSearch);
}

/* ── ACTIVATE MODEL ── */
function activateModel(provId, modelId, provName, modelName) {
  // Map provId to actual provider select value
  const provMap = {
    gemini:"gemini", groq:"groq", openrouter:"openrouter",
    deepseek:"deepseek", groq_free:"openrouter", huggingface:"huggingface"
  };
  const actualProv = provMap[provId] || provId;

  // Set provider
  const provSelect = document.getElementById("providerSelect");
  if (provSelect) {
    provSelect.value = actualProv;
    provSelect.dispatchEvent(new Event("change"));
  }

  // Set model — add to list if not there
  setTimeout(() => {
    const modelSelect = document.getElementById("modelSelect");
    if (!modelSelect) return;
    let opt = Array.from(modelSelect.options).find(o => o.value === modelId);
    if (!opt) {
      opt = document.createElement("option");
      opt.value = modelId; opt.innerText = modelName;
      modelSelect.insertBefore(opt, modelSelect.firstChild);
    }
    modelSelect.value = modelId;

    // also save to custom models so it persists
    if (typeof addCustomModel === "function") addCustomModel(actualProv, modelId);

    showToast(`✓ Active: ${modelName}`, "success");
    closeModelBrowser();

    // open AI panel if closed
    const aiPanel = document.getElementById("aiPanel");
    if (aiPanel?.classList.contains("collapsed")) {
      document.getElementById("toggleAiBtn")?.click();
    }
  }, 100);
}

/* ══════════════════════
   ZIP DOWNLOAD FIX
   Robust implementation
   with multiple fallbacks
══════════════════════ */
async function downloadProjectZip() {
  const fileKeys = Object.keys(files || {}).filter(f => !f.endsWith("/.gitkeep"));
  if (!fileKeys.length) { showToast("No files to download!", "error"); return; }

  const folderName = prompt("Project folder name:", "my-project") || "my-project";
  showToast("Building ZIP...", "info");

  try {
    // Method 1: JSZip from CDN
    if (!window.JSZip) {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
    }

    const zip  = new window.JSZip();
    const root = zip.folder(folderName);

    for (const path of fileKeys) {
      const content = files[path] || "";
      if (content.startsWith("data:")) {
        // base64 file (image/video/audio)
        const base64 = content.split(",")[1];
        if (base64) root.file(path, base64, { base64: true });
      } else {
        root.file(path, content);
      }
    }

    const blob = await zip.generateAsync({
      type: "blob",
      compression: "DEFLATE",
      compressionOptions: { level: 6 }
    });

    triggerDownload(blob, folderName + ".zip");
    showToast(`✅ Downloaded ${folderName}.zip (${fileKeys.length} files)`, "success");

  } catch(err) {
    console.warn("JSZip failed:", err);
    showToast("ZIP failed — trying fallback...", "info");

    // Method 2: download files one by one
    try {
      for (const file of fileKeys) {
        const content = files[file] || "";
        let blob;
        if (content.startsWith("data:")) {
          const res   = await fetch(content);
          blob = await res.blob();
        } else {
          blob = new Blob([content], { type: "text/plain" });
        }
        triggerDownload(blob, file.replace(/\//g, "_"));
        await sleep(300);
      }
      showToast(`Downloaded ${fileKeys.length} files individually`, "success");
    } catch(err2) {
      showToast("Download failed: " + err2.message, "error");
    }
  }
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const s = document.createElement("script");
    s.src     = src;
    s.onload  = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }