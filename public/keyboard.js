/* =========================
   VIRTUAL KEYBOARD v1
   - All computer keys + symbols
   - Draggable anywhere
   - Black / White theme toggle
   - Phone friendly
   - Optional (toggle on/off)
   - Types into active editor
========================= */

let kbVisible   = false;
let kbTheme     = localStorage.getItem("kb_theme") || "dark";
let kbDragging  = false;
let kbDragOffX  = 0, kbDragOffY = 0;
let kbCapsLock  = false;
let kbShift     = false;
let kbAlt       = false; // for symbols layer

/* ══════════════════════
   KEY LAYOUT
══════════════════════ */
const KB_ROWS = [
  // Row 0 — function + special
  [
    {label:"Esc",   code:"Escape",    w:1.2},
    {label:"F1",    code:"F1"},
    {label:"F2",    code:"F2"},
    {label:"F3",    code:"F3"},
    {label:"F4",    code:"F4"},
    {label:"F5",    code:"F5"},
    {label:"F6",    code:"F6"},
    {label:"F7",    code:"F7"},
    {label:"F8",    code:"F8"},
    {label:"F9",    code:"F9"},
    {label:"F10",   code:"F10"},
    {label:"F11",   code:"F11"},
    {label:"F12",   code:"F12"},
    {label:"Del",   code:"Delete",    w:1.2}
  ],
  // Row 1 — numbers
  [
    {label:"`",  shift:"~",  char:"`",  shift_char:"~"},
    {label:"1",  shift:"!",  char:"1",  shift_char:"!"},
    {label:"2",  shift:"@",  char:"2",  shift_char:"@"},
    {label:"3",  shift:"#",  char:"3",  shift_char:"#"},
    {label:"4",  shift:"$",  char:"4",  shift_char:"$"},
    {label:"5",  shift:"%",  char:"5",  shift_char:"%"},
    {label:"6",  shift:"^",  char:"6",  shift_char:"^"},
    {label:"7",  shift:"&",  char:"7",  shift_char:"&"},
    {label:"8",  shift:"*",  char:"8",  shift_char:"*"},
    {label:"9",  shift:"(",  char:"9",  shift_char:"("},
    {label:"0",  shift:")",  char:"0",  shift_char:")"},
    {label:"-",  shift:"_",  char:"-",  shift_char:"_"},
    {label:"=",  shift:"+",  char:"=",  shift_char:"+"},
    {label:"⌫",  code:"Backspace",    w:1.8, special:true}
  ],
  // Row 2 — qwerty
  [
    {label:"Tab", code:"Tab", w:1.5, special:true},
    {label:"q", shift:"Q", char:"q", shift_char:"Q"},
    {label:"w", shift:"W", char:"w", shift_char:"W"},
    {label:"e", shift:"E", char:"e", shift_char:"E"},
    {label:"r", shift:"R", char:"r", shift_char:"R"},
    {label:"t", shift:"T", char:"t", shift_char:"T"},
    {label:"y", shift:"Y", char:"y", shift_char:"Y"},
    {label:"u", shift:"U", char:"u", shift_char:"U"},
    {label:"i", shift:"I", char:"i", shift_char:"I"},
    {label:"o", shift:"O", char:"o", shift_char:"O"},
    {label:"p", shift:"P", char:"p", shift_char:"P"},
    {label:"[", shift:"{", char:"[", shift_char:"{"},
    {label:"]", shift:"}", char:"]", shift_char:"}"},
    {label:"\\",shift:"|", char:"\\",shift_char:"|", w:1.5}
  ],
  // Row 3 — asdf
  [
    {label:"Caps", code:"CapsLock", w:1.8, special:true, id:"kb-caps"},
    {label:"a", shift:"A", char:"a", shift_char:"A"},
    {label:"s", shift:"S", char:"s", shift_char:"S"},
    {label:"d", shift:"D", char:"d", shift_char:"D"},
    {label:"f", shift:"F", char:"f", shift_char:"F"},
    {label:"g", shift:"G", char:"g", shift_char:"G"},
    {label:"h", shift:"H", char:"h", shift_char:"H"},
    {label:"j", shift:"J", char:"j", shift_char:"J"},
    {label:"k", shift:"K", char:"k", shift_char:"K"},
    {label:"l", shift:"L", char:"l", shift_char:"L"},
    {label:";", shift:":", char:";", shift_char:":"},
    {label:"'", shift:'"', char:"'", shift_char:'"'},
    {label:"↵ Enter", code:"Enter", w:2.3, special:true}
  ],
  // Row 4 — zxcv
  [
    {label:"⇧ Shift", code:"ShiftLeft", w:2.2, special:true, id:"kb-shift"},
    {label:"z", shift:"Z", char:"z", shift_char:"Z"},
    {label:"x", shift:"X", char:"x", shift_char:"X"},
    {label:"c", shift:"C", char:"c", shift_char:"C"},
    {label:"v", shift:"V", char:"v", shift_char:"V"},
    {label:"b", shift:"B", char:"b", shift_char:"B"},
    {label:"n", shift:"N", char:"n", shift_char:"N"},
    {label:"m", shift:"M", char:"m", shift_char:"M"},
    {label:",", shift:"<", char:",", shift_char:"<"},
    {label:".", shift:">", char:".", shift_char:">"},
    {label:"/", shift:"?", char:"/", shift_char:"?"},
    {label:"⇧ Shift", code:"ShiftRight", w:2.2, special:true}
  ],
  // Row 5 — bottom
  [
    {label:"Ctrl", code:"ControlLeft", w:1.4, special:true},
    {label:"⌘", code:"MetaLeft", w:1.2, special:true},
    {label:"Alt", code:"AltLeft", w:1.2, special:true},
    {label:"", char:" ", w:5.5, id:"kb-space"},
    {label:"Alt", code:"AltRight", w:1.2, special:true},
    {label:"◀", code:"ArrowLeft", special:true},
    {label:"▲", code:"ArrowUp", special:true},
    {label:"▼", code:"ArrowDown", special:true},
    {label:"▶", code:"ArrowRight", special:true}
  ]
];

// Extra symbols row shown as tab
const SYMBOLS_ROW = [
  ["€","£","¥","©","®","™","°","µ","§","¶","†","‡"],
  ["α","β","γ","δ","ε","π","σ","φ","ω","λ","θ","ψ"],
  ["←","→","↑","↓","↔","↕","⇒","⇐","⇔","∞","√","∑"],
  ["≠","≤","≥","≈","±","×","÷","∈","∉","⊂","⊃","∅"],
  ["{","}","[","]","<",">","(",")","/*","*/","//","#!"]
];

/* ══════════════════════
   BUILD KEYBOARD
══════════════════════ */
function buildKeyboard() {
  const kb = document.getElementById("virtualKeyboard"); if (!kb) return;
  kb.className = `vkb vkb-${kbTheme}`;

  kb.innerHTML = `
    <!-- DRAG HANDLE / HEADER -->
    <div class="vkb-header" id="vkb-drag-handle">
      <div class="vkb-header-left">
        <span class="vkb-icon">⌨</span>
        <span class="vkb-title">Virtual Keyboard</span>
        <div class="vkb-tabs">
          <button class="vkb-tab active" id="vkb-tab-keys" onclick="vkbSwitchTab('keys')">Keys</button>
          <button class="vkb-tab" id="vkb-tab-sym"  onclick="vkbSwitchTab('sym')">Symbols</button>
        </div>
      </div>
      <div class="vkb-header-right">
        <button class="vkb-ctrl-btn" onclick="vkbToggleTheme()" title="Toggle theme">
          ${kbTheme==="dark"?"☀":"🌙"}
        </button>
        <button class="vkb-ctrl-btn" onclick="toggleKeyboard()" title="Close">✕</button>
      </div>
    </div>

    <!-- MAIN KEYS -->
    <div class="vkb-keys-panel" id="vkb-panel-keys">
      ${KB_ROWS.map(row => `
        <div class="vkb-row">
          ${row.map(key => buildKey(key)).join("")}
        </div>`).join("")}
    </div>

    <!-- SYMBOLS PANEL -->
    <div class="vkb-keys-panel vkb-hidden" id="vkb-panel-sym">
      <div class="vkb-sym-label">// Special characters — tap to insert</div>
      ${SYMBOLS_ROW.map(row => `
        <div class="vkb-row">
          ${row.map(ch => `<button class="vkb-key vkb-sym-key" onclick="vkbType('${ch}')">${ch}</button>`).join("")}
        </div>`).join("")}
    </div>`;

  setupDrag();
  updateCapsShiftUI();
}

function buildKey(key) {
  const style = key.w ? `style="flex:${key.w}"` : "";
  const id    = key.id ? `id="${key.id}"` : "";
  const cls   = key.special ? "vkb-key vkb-special" : "vkb-key";

  if (key.code && !key.char) {
    // pure action key
    return `<button class="${cls}" ${style} ${id} onclick="vkbAction('${key.code}','${key.label}')">${key.label}</button>`;
  } else {
    // typeable key
    const top  = key.shift || "";
    const main = key.char  || key.label;
    return `<button class="${cls}" ${style} ${id} onclick="vkbType('${escAttr(main)}','${escAttr(key.shift_char||"")}')">
      ${top ? `<span class="vkb-shift-label">${top}</span>` : ""}
      <span class="vkb-main-label">${key.label}</span>
    </button>`;
  }
}

function escAttr(s){ return String(s).replace(/'/g,"\\'"); }

/* ══════════════════════
   KEY ACTIONS
══════════════════════ */
function vkbType(normal, shifted="") {
  const ch = (kbShift || kbCapsLock) && shifted ? shifted : normal;
  insertIntoEditor(ch);
  if (kbShift) { kbShift=false; updateCapsShiftUI(); }
}

function vkbAction(code, label) {
  switch(code) {
    case "Backspace":
      deleteInEditor(); break;
    case "Enter":
      insertIntoEditor("\n"); break;
    case "Tab":
      insertIntoEditor("  "); break;
    case "CapsLock":
      kbCapsLock = !kbCapsLock; updateCapsShiftUI(); break;
    case "ShiftLeft":
    case "ShiftRight":
      kbShift = !kbShift; updateCapsShiftUI(); break;
    case "ArrowLeft":
    case "ArrowRight":
    case "ArrowUp":
    case "ArrowDown":
      moveEditorCursor(code); break;
    default:
      // fire real keyboard event for ctrl, alt etc
      fireKeyEvent(code);
  }
}

function insertIntoEditor(text) {
  // Try Monaco editor1 first
  if (window.editor1) {
    const sel = window.editor1.getSelection();
    window.editor1.executeEdits("vkb", [{
      range: sel,
      text,
      forceMoveMarkers: true
    }]);
    window.editor1.focus();
    return;
  }
  // Fallback: focused input/textarea
  const el = document.activeElement;
  if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
    const s = el.selectionStart, e = el.selectionEnd;
    el.value = el.value.slice(0,s) + text + el.value.slice(e);
    el.setSelectionRange(s+text.length, s+text.length);
    el.dispatchEvent(new Event("input",{bubbles:true}));
  }
}

function deleteInEditor() {
  if (window.editor1) {
    const sel = window.editor1.getSelection();
    if (!sel.isEmpty()) {
      window.editor1.executeEdits("vkb",[{range:sel,text:""}]);
    } else {
      window.editor1.trigger("vkb","deleteLeft",{});
    }
    window.editor1.focus();
    return;
  }
  const el = document.activeElement;
  if (el && (el.tagName==="TEXTAREA"||el.tagName==="INPUT")) {
    const s=el.selectionStart;
    if(s>0){ el.value=el.value.slice(0,s-1)+el.value.slice(s); el.setSelectionRange(s-1,s-1); }
  }
}

function moveEditorCursor(code) {
  if (window.editor1) {
    const map = {
      ArrowLeft:"cursorLeft", ArrowRight:"cursorRight",
      ArrowUp:"cursorUp", ArrowDown:"cursorDown"
    };
    window.editor1.trigger("vkb", map[code], {});
    window.editor1.focus();
  }
}

function fireKeyEvent(code) {
  const el = window.editor1 ? document.getElementById("editor1") : document.activeElement;
  if (el) el.dispatchEvent(new KeyboardEvent("keydown",{code,bubbles:true,cancelable:true}));
}

function updateCapsShiftUI() {
  const caps  = document.getElementById("kb-caps");
  const shift1 = document.getElementById("kb-shift");
  if (caps)  caps.classList.toggle("vkb-active", kbCapsLock);
  if (shift1) shift1.classList.toggle("vkb-active", kbShift);

  // update all letter keys to show uppercase/lowercase
  document.querySelectorAll(".vkb-key:not(.vkb-special) .vkb-main-label").forEach(el => {
    const txt = el.innerText;
    if (txt.length === 1 && /[a-z]/i.test(txt)) {
      el.innerText = (kbShift||kbCapsLock) ? txt.toUpperCase() : txt.toLowerCase();
    }
  });
}

/* ══════════════════════
   TABS
══════════════════════ */
function vkbSwitchTab(tab) {
  document.querySelectorAll(".vkb-tab").forEach(b => b.classList.remove("active"));
  document.getElementById("vkb-tab-"+tab)?.classList.add("active");
  document.getElementById("vkb-panel-keys")?.classList.toggle("vkb-hidden", tab!=="keys");
  document.getElementById("vkb-panel-sym")?.classList.toggle("vkb-hidden",  tab!=="sym");
}

/* ══════════════════════
   THEME
══════════════════════ */
function vkbToggleTheme() {
  kbTheme = kbTheme==="dark" ? "light" : "dark";
  localStorage.setItem("kb_theme", kbTheme);
  buildKeyboard();
  if (typeof showToast==="function") showToast("Keyboard: "+kbTheme+" theme","info");
}

/* ══════════════════════
   SHOW / HIDE
══════════════════════ */
function toggleKeyboard() {
  const kb = document.getElementById("virtualKeyboard");
  if (!kb) return;
  kbVisible = !kbVisible;
  if (kbVisible) {
    kb.style.display = "block";
    buildKeyboard();
    // default position — bottom center
    if (!kb.style.bottom) {
      kb.style.bottom = "60px";
      kb.style.left   = "50%";
      kb.style.transform = "translateX(-50%)";
    }
  } else {
    kb.style.display = "none";
  }
  // update toggle button
  const btn = document.getElementById("kbToggleBtn");
  if (btn) btn.classList.toggle("active", kbVisible);
}

/* ══════════════════════
   DRAG
══════════════════════ */
function setupDrag() {
  const handle = document.getElementById("vkb-drag-handle");
  const kb     = document.getElementById("virtualKeyboard");
  if (!handle || !kb) return;

  let ox=0, oy=0, kx=0, ky=0;

  function startDrag(e) {
    kbDragging = true;
    const touch = e.touches ? e.touches[0] : e;
    const rect  = kb.getBoundingClientRect();

    // convert to top/left positioning
    kb.style.transform = "none";
    kb.style.bottom    = "auto";
    kb.style.right     = "auto";
    kb.style.top  = rect.top  + "px";
    kb.style.left = rect.left + "px";

    ox = touch.clientX - rect.left;
    oy = touch.clientY - rect.top;
    e.preventDefault();
  }

  function onDrag(e) {
    if (!kbDragging) return;
    const touch = e.touches ? e.touches[0] : e;
    const x = touch.clientX - ox;
    const y = touch.clientY - oy;
    const maxX = window.innerWidth  - kb.offsetWidth;
    const maxY = window.innerHeight - kb.offsetHeight;
    kb.style.left = Math.max(0, Math.min(maxX, x)) + "px";
    kb.style.top  = Math.max(0, Math.min(maxY, y)) + "px";
    e.preventDefault();
  }

  function stopDrag() { kbDragging = false; }

  handle.addEventListener("mousedown",  startDrag);
  handle.addEventListener("touchstart", startDrag, {passive:false});
  document.addEventListener("mousemove", onDrag);
  document.addEventListener("touchmove", onDrag, {passive:false});
  document.addEventListener("mouseup",  stopDrag);
  document.addEventListener("touchend", stopDrag);
}