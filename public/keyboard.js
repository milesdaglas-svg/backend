/* =========================
   VIRTUAL KEYBOARD v2
   - Real PC keyboard layout
   - Letters + symbols together
   - No separate tabs
   - Ultra fast (no re-renders)
   - Phone optimized
   - Draggable
   - Dark / Light theme
========================= */

let kbVisible  = false;
let kbTheme    = localStorage.getItem("kb_theme") || "dark";
let kbCaps     = false;
let kbShift    = false;
let kbBuilt    = false;

/* ══════════════════════
   FULL PC LAYOUT
   Each key: { main, shift, w }
   w = flex width multiplier
══════════════════════ */
const KB_LAYOUT = [
  // ── ROW 0: ESC + F KEYS ──
  [
    {main:"Esc",  fn:"Escape",   w:1.0, sp:true},
    {main:"F1",   fn:"F1",       w:1.0, sp:true},
    {main:"F2",   fn:"F2",       w:1.0, sp:true},
    {main:"F3",   fn:"F3",       w:1.0, sp:true},
    {main:"F4",   fn:"F4",       w:1.0, sp:true},
    {main:"F5",   fn:"F5",       w:1.0, sp:true},
    {main:"F6",   fn:"F6",       w:1.0, sp:true},
    {main:"F7",   fn:"F7",       w:1.0, sp:true},
    {main:"F8",   fn:"F8",       w:1.0, sp:true},
    {main:"F9",   fn:"F9",       w:1.0, sp:true},
    {main:"F10",  fn:"F10",      w:1.0, sp:true},
    {main:"F11",  fn:"F11",      w:1.0, sp:true},
    {main:"F12",  fn:"F12",      w:1.0, sp:true},
    {main:"Del",  fn:"Delete",   w:1.0, sp:true},
  ],
  // ── ROW 1: NUMBERS ──
  [
    {main:"`",  shift:"~",  w:1.0},
    {main:"1",  shift:"!",  w:1.0},
    {main:"2",  shift:"@",  w:1.0},
    {main:"3",  shift:"#",  w:1.0},
    {main:"4",  shift:"$",  w:1.0},
    {main:"5",  shift:"%",  w:1.0},
    {main:"6",  shift:"^",  w:1.0},
    {main:"7",  shift:"&",  w:1.0},
    {main:"8",  shift:"*",  w:1.0},
    {main:"9",  shift:"(",  w:1.0},
    {main:"0",  shift:")",  w:1.0},
    {main:"-",  shift:"_",  w:1.0},
    {main:"=",  shift:"+",  w:1.0},
    {main:"⌫",  fn:"Backspace", w:1.8, sp:true, id:"kb-bksp"},
  ],
  // ── ROW 2: QWERTY ──
  [
    {main:"Tab", fn:"Tab",  w:1.4, sp:true},
    {main:"q",  shift:"Q",  w:1.0},
    {main:"w",  shift:"W",  w:1.0},
    {main:"e",  shift:"E",  w:1.0},
    {main:"r",  shift:"R",  w:1.0},
    {main:"t",  shift:"T",  w:1.0},
    {main:"y",  shift:"Y",  w:1.0},
    {main:"u",  shift:"U",  w:1.0},
    {main:"i",  shift:"I",  w:1.0},
    {main:"o",  shift:"O",  w:1.0},
    {main:"p",  shift:"P",  w:1.0},
    {main:"[",  shift:"{",  w:1.0},
    {main:"]",  shift:"}",  w:1.0},
    {main:"\\", shift:"|",  w:1.4},
  ],
  // ── ROW 3: ASDF ──
  [
    {main:"Caps", fn:"Caps", w:1.6, sp:true, id:"kb-caps"},
    {main:"a",  shift:"A",  w:1.0},
    {main:"s",  shift:"S",  w:1.0},
    {main:"d",  shift:"D",  w:1.0},
    {main:"f",  shift:"F",  w:1.0},
    {main:"g",  shift:"G",  w:1.0},
    {main:"h",  shift:"H",  w:1.0},
    {main:"j",  shift:"J",  w:1.0},
    {main:"k",  shift:"K",  w:1.0},
    {main:"l",  shift:"L",  w:1.0},
    {main:";",  shift:":",  w:1.0},
    {main:"'",  shift:'"',  w:1.0},
    {main:"↵",  fn:"Enter", w:2.2, sp:true, id:"kb-enter"},
  ],
  // ── ROW 4: ZXCV ──
  [
    {main:"⇧",  fn:"Shift", w:2.0, sp:true, id:"kb-shift"},
    {main:"z",  shift:"Z",  w:1.0},
    {main:"x",  shift:"X",  w:1.0},
    {main:"c",  shift:"C",  w:1.0},
    {main:"v",  shift:"V",  w:1.0},
    {main:"b",  shift:"B",  w:1.0},
    {main:"n",  shift:"N",  w:1.0},
    {main:"m",  shift:"M",  w:1.0},
    {main:",",  shift:"<",  w:1.0},
    {main:".",  shift:">",  w:1.0},
    {main:"/",  shift:"?",  w:1.0},
    {main:"⇧",  fn:"Shift", w:2.6, sp:true},
  ],
  // ── ROW 5: BOTTOM ──
  [
    {main:"Ctrl", fn:"Ctrl", w:1.4, sp:true},
    {main:"Alt",  fn:"Alt",  w:1.2, sp:true},
    {main:"",     fn:"Space",w:5.5, sp:true, id:"kb-space"},
    {main:"Alt",  fn:"Alt",  w:1.2, sp:true},
    {main:"◀",   fn:"ArrowLeft",  sp:true},
    {main:"▲",   fn:"ArrowUp",    sp:true},
    {main:"▼",   fn:"ArrowDown",  sp:true},
    {main:"▶",   fn:"ArrowRight", sp:true},
  ],
];

/* ══════════════════════
   BUILD — runs once
══════════════════════ */
function buildKeyboard() {
  const kb = document.getElementById("virtualKeyboard");
  if (!kb) return;
  kb.className = "vkb vkb-" + kbTheme;

  const rows = KB_LAYOUT.map(row => {
    const keys = row.map(k => buildKey(k)).join("");
    return `<div class="vkb-row">${keys}</div>`;
  }).join("");

  kb.innerHTML = `
    <div class="vkb-handle" id="vkb-handle">
      <span class="vkb-handle-icon">⌨</span>
      <span class="vkb-handle-title">Keyboard</span>
      <div class="vkb-handle-btns">
        <button class="vkb-hbtn" onclick="vkbToggleTheme()" title="Toggle theme">${kbTheme==="dark"?"☀":"🌙"}</button>
        <button class="vkb-hbtn" onclick="toggleKeyboard()" title="Close">✕</button>
      </div>
    </div>
    <div class="vkb-keys">${rows}</div>`;

  kbBuilt = true;
  setupKbDrag();
  updateKbState();
}

function buildKey(k) {
  const style = k.w ? `style="flex:${k.w}"` : "";
  const id    = k.id ? `id="${k.id}"` : "";
  const cls   = "vkb-key" + (k.sp ? " vkb-sp" : "");

  if (k.fn) {
    // special / action key
    return `<button class="${cls}" ${style} ${id} data-fn="${k.fn}">${k.main}</button>`;
  }
  // typeable key — show shift char top-right
  return `<button class="${cls}" ${style} data-ch="${esc(k.main)}" data-sh="${esc(k.shift||"")}">
    <span class="vkb-sh">${k.shift||""}</span>
    <span class="vkb-ch">${k.main}</span>
  </button>`;
}

function esc(s){ return String(s).replace(/"/g,"&quot;").replace(/'/g,"&#39;"); }

/* ══════════════════════
   SINGLE EVENT LISTENER
   on the whole keyboard
   (no per-key listeners
    = zero lag)
══════════════════════ */
function attachKbEvents() {
  const kb = document.getElementById("virtualKeyboard");
  if (!kb || kb._eventsAttached) return;
  kb._eventsAttached = true;

  // Unified handler for both mouse and touch
  function handlePress(e) {
    const btn = e.target.closest("button.vkb-key");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    // visual feedback
    btn.classList.add("vkb-pressed");
    setTimeout(() => btn.classList.remove("vkb-pressed"), 120);

    const fn = btn.dataset.fn;
    const ch = btn.dataset.ch;
    const sh = btn.dataset.sh;

    if (fn) {
      handleFn(fn, btn);
    } else if (ch !== undefined) {
      const char = (kbShift || kbCaps) && sh ? sh : ch;
      typeChar(char);
      if (kbShift) { kbShift = false; updateKbState(); }
    }
  }

  kb.addEventListener("mousedown",  handlePress, {passive:false});
  kb.addEventListener("touchstart", handlePress, {passive:false});

  // backspace repeat on hold
  let bkspInterval = null;
  kb.addEventListener("mousedown", e => {
    if (e.target.closest("#kb-bksp")) {
      bkspInterval = setInterval(() => doBackspace(), 80);
    }
  });
  kb.addEventListener("touchstart", e => {
    if (e.target.closest("#kb-bksp")) {
      bkspInterval = setInterval(() => doBackspace(), 80);
    }
  }, {passive:true});
  document.addEventListener("mouseup",  () => clearInterval(bkspInterval));
  document.addEventListener("touchend", () => clearInterval(bkspInterval));
}

/* ══════════════════════
   HANDLE SPECIAL KEYS
══════════════════════ */
function handleFn(fn, btn) {
  switch(fn) {
    case "Backspace":  doBackspace();                break;
    case "Enter":      typeChar("\n");               break;
    case "Tab":        typeChar("\t");               break;
    case "Space":      typeChar(" ");                break;
    case "Caps":
      kbCaps = !kbCaps;
      updateKbState();
      break;
    case "Shift":
      kbShift = !kbShift;
      updateKbState();
      break;
    case "ArrowLeft":  moveCursor("cursorLeft");     break;
    case "ArrowRight": moveCursor("cursorRight");    break;
    case "ArrowUp":    moveCursor("cursorUp");       break;
    case "ArrowDown":  moveCursor("cursorDown");     break;
    case "Delete":
      if (window.editor1) window.editor1.trigger("kb","deleteRight",{});
      break;
    case "Escape":
      if (window.editor1) window.editor1.trigger("kb","editor.action.inlineSuggest.hide",{});
      break;
    default:
      // F1-F12, Ctrl, Alt — fire real keyboard event
      fireKey(fn);
  }
}

/* ══════════════════════
   TYPE INTO EDITOR
   Uses execCommand for
   instant no-lag insert
══════════════════════ */
function typeChar(char) {
  // Monaco editor — fastest path
  if (window.editor1 && window.editor1.hasTextFocus()) {
    window.editor1.trigger("kb", "type", { text: char });
    return;
  }
  if (window.editor2 && window.editor2.hasTextFocus()) {
    window.editor2.trigger("kb", "type", { text: char });
    return;
  }

  // Try focused Monaco (even without hasTextFocus)
  if (window.editor1) {
    window.editor1.focus();
    window.editor1.trigger("kb", "type", { text: char });
    return;
  }

  // Fallback: any focused input/textarea
  const el = document.activeElement;
  if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT") && !el.readOnly) {
    const s = el.selectionStart || 0;
    const e = el.selectionEnd   || 0;
    const v = el.value;
    el.value = v.slice(0, s) + char + v.slice(e);
    const pos = s + char.length;
    el.setSelectionRange(pos, pos);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // Last resort: document.execCommand (works in contenteditable)
  document.execCommand("insertText", false, char);
}

function doBackspace() {
  if (window.editor1 && window.editor1.hasTextFocus()) {
    window.editor1.trigger("kb","deleteLeft",{});
    return;
  }
  if (window.editor2 && window.editor2.hasTextFocus()) {
    window.editor2.trigger("kb","deleteLeft",{});
    return;
  }
  if (window.editor1) {
    window.editor1.focus();
    window.editor1.trigger("kb","deleteLeft",{});
    return;
  }
  const el = document.activeElement;
  if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT")) {
    const s = el.selectionStart;
    if (s > 0) {
      el.value = el.value.slice(0,s-1) + el.value.slice(el.selectionEnd);
      el.setSelectionRange(s-1, s-1);
      el.dispatchEvent(new Event("input",{bubbles:true}));
    }
  }
}

function moveCursor(action) {
  if (window.editor1) {
    window.editor1.focus();
    window.editor1.trigger("kb", action, {});
  }
}

function fireKey(code) {
  const target = document.activeElement || document.body;
  target.dispatchEvent(new KeyboardEvent("keydown",{
    code, key: code, bubbles: true, cancelable: true
  }));
}

/* ══════════════════════
   UPDATE CAPS/SHIFT UI
══════════════════════ */
function updateKbState() {
  const kb = document.getElementById("virtualKeyboard"); if (!kb) return;

  // update all letter keys
  kb.querySelectorAll(".vkb-key:not(.vkb-sp)").forEach(btn => {
    const ch = btn.dataset.ch;
    const sh = btn.dataset.sh;
    if (!ch) return;
    const chEl = btn.querySelector(".vkb-ch");
    if (!chEl) return;
    const upper = kbShift || kbCaps;
    if (/^[a-z]$/i.test(ch)) {
      chEl.innerText = upper ? ch.toUpperCase() : ch.toLowerCase();
    } else {
      chEl.innerText = upper && sh ? sh : ch;
    }
  });

  // caps key glow
  const capsBtn = document.getElementById("kb-caps");
  if (capsBtn) capsBtn.classList.toggle("vkb-active", kbCaps);

  // shift key glow
  document.querySelectorAll("[data-fn='Shift']").forEach(b => {
    b.classList.toggle("vkb-active", kbShift);
  });
}

/* ══════════════════════
   THEME
══════════════════════ */
function vkbToggleTheme() {
  kbTheme = kbTheme === "dark" ? "light" : "dark";
  localStorage.setItem("kb_theme", kbTheme);
  buildKeyboard();
  attachKbEvents();
  if (typeof showToast === "function") showToast("Keyboard: " + kbTheme + " theme", "info");
}

/* ══════════════════════
   SHOW / HIDE
══════════════════════ */
function toggleKeyboard() {
  const kb = document.getElementById("virtualKeyboard"); if (!kb) return;
  kbVisible = !kbVisible;

  if (kbVisible) {
    kb.style.display = "block";
    if (!kbBuilt) { buildKeyboard(); attachKbEvents(); }
    // default position bottom center
    if (!kb._positioned) {
      kb._positioned = true;
      kb.style.bottom    = "58px";
      kb.style.left      = "50%";
      kb.style.transform = "translateX(-50%)";
      kb.style.top       = "auto";
      kb.style.right     = "auto";
    }
  } else {
    kb.style.display = "none";
  }

  const btn = document.getElementById("kbToggleBtn");
  if (btn) btn.classList.toggle("vkb-on", kbVisible);
}

/* ══════════════════════
   DRAG (mouse + touch)
══════════════════════ */
function setupKbDrag() {
  const handle = document.getElementById("vkb-handle");
  const kb     = document.getElementById("virtualKeyboard");
  if (!handle || !kb) return;

  let startX = 0, startY = 0, origL = 0, origT = 0, dragging = false;

  function getPos(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function onStart(e) {
    if (e.target.closest("button.vkb-hbtn")) return;
    const rect = kb.getBoundingClientRect();
    // switch to absolute positioning
    kb.style.transform = "none";
    kb.style.bottom    = "auto";
    kb.style.right     = "auto";
    kb.style.left = rect.left + "px";
    kb.style.top  = rect.top  + "px";

    const pos = getPos(e);
    startX = pos.x; startY = pos.y;
    origL  = rect.left; origT  = rect.top;
    dragging = true;
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    const pos = getPos(e);
    const dx  = pos.x - startX;
    const dy  = pos.y - startY;
    const maxX = window.innerWidth  - kb.offsetWidth;
    const maxY = window.innerHeight - kb.offsetHeight;
    kb.style.left = Math.max(0, Math.min(maxX, origL + dx)) + "px";
    kb.style.top  = Math.max(0, Math.min(maxY, origT + dy)) + "px";
    e.preventDefault();
  }

  function onEnd() { dragging = false; }

  handle.addEventListener("mousedown",  onStart);
  handle.addEventListener("touchstart", onStart, {passive:false});
  document.addEventListener("mousemove", onMove);
  document.addEventListener("touchmove", onMove, {passive:false});
  document.addEventListener("mouseup",   onEnd);
  document.addEventListener("touchend",  onEnd);
}