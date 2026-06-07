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
let kbLastFocus = null;

document.addEventListener("focusin", function(e) {
  if (!e.target.closest("#virtualKeyboard")) {
    kbLastFocus = e.target;
  }
});

/* ══════════════════════
   FULL PC LAYOUT
══════════════════════ */
const KB_LAYOUT = [
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
    {main:"Bksp", fn:"Backspace", w:1.8, sp:true, id:"kb-bksp"},
  ],
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
    {main:"Enter", fn:"Enter", w:2.2, sp:true, id:"kb-enter"},
  ],
  [
    {main:"Shift", fn:"Shift", w:2.0, sp:true, id:"kb-shift"},
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
    {main:"Shift", fn:"Shift", w:2.6, sp:true},
  ],
  [
    {main:"Ctrl", fn:"Ctrl", w:1.4, sp:true},
    {main:"Alt",  fn:"Alt",  w:1.2, sp:true},
    {main:"Space", fn:"Space", w:5.5, sp:true, id:"kb-space"},
    {main:"Alt",  fn:"Alt",  w:1.2, sp:true},
    {main:"<",   fn:"ArrowLeft",  sp:true},
    {main:"^",   fn:"ArrowUp",    sp:true},
    {main:"v",   fn:"ArrowDown",  sp:true},
    {main:">",   fn:"ArrowRight", sp:true},
  ],
];

/* ══════════════════════
   BUILD — runs once
══════════════════════ */
function buildKeyboard() {
  const kb = document.getElementById("virtualKeyboard");
  if (!kb) return;
  kb.className = "vkb vkb-" + kbTheme;

  const rows = KB_LAYOUT.map(function(row) {
    const keys = row.map(function(k) { return buildKey(k); }).join("");
    return '<div class="vkb-row">' + keys + '</div>';
  }).join("");

  kb.innerHTML =
    '<div class="vkb-handle" id="vkb-handle">' +
      '<span class="vkb-handle-icon">&#9000;</span>' +
      '<span class="vkb-handle-title">Keyboard</span>' +
      '<div class="vkb-handle-btns">' +
        '<button class="vkb-hbtn" onclick="vkbToggleTheme()" title="Toggle theme">' + (kbTheme === "dark" ? "☀" : "🌙") + '</button>' +
        '<button class="vkb-hbtn" onclick="toggleKeyboard()" title="Close">✕</button>' +
      '</div>' +
    '</div>' +
    '<div class="vkb-keys">' + rows + '</div>';

  kbBuilt = true;
  setupKbDrag();
  updateKbState();
}

function buildKey(k) {
  var style = k.w ? ('style="flex:' + k.w + '"') : "";
  var id    = k.id ? ('id="' + k.id + '"') : "";
  var cls   = "vkb-key" + (k.sp ? " vkb-sp" : "");

  if (k.fn) {
    return '<button class="' + cls + '" ' + style + ' ' + id + ' data-fn="' + k.fn + '">' + k.main + '</button>';
  }
  return '<button class="' + cls + '" ' + style + ' data-ch="' + esc(k.main) + '" data-sh="' + esc(k.shift || "") + '">' +
    '<span class="vkb-sh">' + (k.shift || "") + '</span>' +
    '<span class="vkb-ch">' + k.main + '</span>' +
  '</button>';
}

function esc(s) {
  return String(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/* ══════════════════════
   SINGLE EVENT LISTENER
══════════════════════ */
function attachKbEvents() {
  var kb = document.getElementById("virtualKeyboard");
  if (!kb || kb._eventsAttached) return;
  kb._eventsAttached = true;

  function handlePress(e) {
    var btn = e.target.closest("button.vkb-key");
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    btn.classList.add("vkb-pressed");
    setTimeout(function() { btn.classList.remove("vkb-pressed"); }, 120);

    var fn = btn.dataset.fn;
    var ch = btn.dataset.ch;
    var sh = btn.dataset.sh;

    if (fn) {
      handleFn(fn, btn);
    } else if (ch !== undefined) {
      var char = (kbShift || kbCaps) && sh ? sh : ch;
      typeChar(char);
      if (kbShift) { kbShift = false; updateKbState(); }
    }
  }

  kb.addEventListener("mousedown",  handlePress, {passive: false});
  kb.addEventListener("touchstart", handlePress, {passive: false});

  var bkspInterval = null;
  kb.addEventListener("mousedown", function(e) {
    if (e.target.closest("#kb-bksp")) {
      bkspInterval = setInterval(function() { doBackspace(); }, 80);
    }
  });
  kb.addEventListener("touchstart", function(e) {
    if (e.target.closest("#kb-bksp")) {
      bkspInterval = setInterval(function() { doBackspace(); }, 80);
    }
  }, {passive: true});
  document.addEventListener("mouseup",  function() { clearInterval(bkspInterval); });
  document.addEventListener("touchend", function() { clearInterval(bkspInterval); });
}

/* ══════════════════════
   HANDLE SPECIAL KEYS
══════════════════════ */
function handleFn(fn, btn) {
  switch(fn) {
    case "Backspace":  doBackspace();             break;
    case "Enter":      typeChar("\n");            break;
    case "Tab":        typeChar("\t");            break;
    case "Space":      typeChar(" ");             break;
    case "Caps":
      kbCaps = !kbCaps;
      updateKbState();
      break;
    case "Shift":
      kbShift = !kbShift;
      updateKbState();
      break;
    case "ArrowLeft":  moveCursor("cursorLeft");  break;
    case "ArrowRight": moveCursor("cursorRight"); break;
    case "ArrowUp":    moveCursor("cursorUp");    break;
    case "ArrowDown":  moveCursor("cursorDown");  break;
    case "Delete":
      if (window.editor1 && typeof window.editor1.trigger === "function") {
        window.editor1.trigger("kb", "deleteRight", {});
      }
      break;
    case "Escape":
      if (window.editor1 && typeof window.editor1.trigger === "function") {
        window.editor1.trigger("kb", "editor.action.inlineSuggest.hide", {});
      }
      break;
    default:
      fireKey(fn);
  }
}

/* ══════════════════════
   TYPE INTO EDITOR
══════════════════════ */
function typeChar(char) {
  var ed1 = window.editor1;
  var ed2 = window.editor2;

  // Monaco editor1
  if (ed1 && typeof ed1.hasTextFocus === "function" && ed1.hasTextFocus()) {
    ed1.trigger("kb", "type", { text: char });
    return;
  }
  // Monaco editor2
  if (ed2 && typeof ed2.hasTextFocus === "function" && ed2.hasTextFocus()) {
    ed2.trigger("kb", "type", { text: char });
    return;
  }

  // Last focused input/textarea (AI chat, settings etc)
  var target = kbLastFocus;
  if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT") && !target.readOnly) {
    var s   = target.selectionStart || 0;
    var end = target.selectionEnd   || 0;
    target.value = target.value.slice(0, s) + char + target.value.slice(end);
    var pos = s + char.length;
    target.setSelectionRange(pos, pos);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // Fallback — focus editor1 and type
  if (ed1 && typeof ed1.focus === "function") {
    ed1.focus();
    if (typeof ed1.trigger === "function") {
      ed1.trigger("kb", "type", { text: char });
    }
  }
}

/* ══════════════════════
   BACKSPACE
══════════════════════ */
function doBackspace() {
  var ed1 = window.editor1;
  var ed2 = window.editor2;

  if (ed1 && typeof ed1.hasTextFocus === "function" && ed1.hasTextFocus()) {
    ed1.trigger("kb", "deleteLeft", {});
    return;
  }
  if (ed2 && typeof ed2.hasTextFocus === "function" && ed2.hasTextFocus()) {
    ed2.trigger("kb", "deleteLeft", {});
    return;
  }

  var target = kbLastFocus;
  if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT") && !target.readOnly) {
    var s = target.selectionStart;
    if (s > 0) {
      target.value = target.value.slice(0, s - 1) + target.value.slice(target.selectionEnd);
      target.setSelectionRange(s - 1, s - 1);
      target.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return;
  }

  if (ed1 && typeof ed1.focus === "function") {
    ed1.focus();
    ed1.trigger("kb", "deleteLeft", {});
  }
}

/* ══════════════════════
   CURSOR MOVEMENT
══════════════════════ */
function moveCursor(action) {
  var ed1 = window.editor1;
  if (ed1 && typeof ed1.focus === "function") {
    ed1.focus();
    ed1.trigger("kb", action, {});
  }
}

function fireKey(code) {
  var target = document.activeElement || document.body;
  target.dispatchEvent(new KeyboardEvent("keydown", {
    code: code, key: code, bubbles: true, cancelable: true
  }));
}

/* ══════════════════════
   UPDATE CAPS/SHIFT UI
══════════════════════ */
function updateKbState() {
  var kb = document.getElementById("virtualKeyboard");
  if (!kb) return;

  kb.querySelectorAll(".vkb-key:not(.vkb-sp)").forEach(function(btn) {
    var ch = btn.dataset.ch;
    var sh = btn.dataset.sh;
    if (!ch) return;
    var chEl = btn.querySelector(".vkb-ch");
    if (!chEl) return;
    var upper = kbShift || kbCaps;
    if (/^[a-z]$/i.test(ch)) {
      chEl.innerText = upper ? ch.toUpperCase() : ch.toLowerCase();
    } else {
      chEl.innerText = (upper && sh) ? sh : ch;
    }
  });

  var capsBtn = document.getElementById("kb-caps");
  if (capsBtn) capsBtn.classList.toggle("vkb-active", kbCaps);

  document.querySelectorAll("[data-fn='Shift']").forEach(function(b) {
    b.classList.toggle("vkb-active", kbShift);
  });
}

/* ══════════════════════
   THEME TOGGLE
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
  var kb = document.getElementById("virtualKeyboard");
  if (!kb) return;
  kbVisible = !kbVisible;

  if (kbVisible) {
    kb.style.display = "block";
    if (!kbBuilt) { buildKeyboard(); attachKbEvents(); }
    if (!kb._positioned) {
      kb._positioned     = true;
      kb.style.bottom    = "58px";
      kb.style.left      = "50%";
      kb.style.transform = "translateX(-50%)";
      kb.style.top       = "auto";
      kb.style.right     = "auto";
    }
  } else {
    kb.style.display = "none";
  }

  var btn = document.getElementById("kbToggleBtn");
  if (btn) btn.classList.toggle("vkb-on", kbVisible);
}

/* ══════════════════════
   DRAG (mouse + touch)
══════════════════════ */
function setupKbDrag() {
  var handle = document.getElementById("vkb-handle");
  var kb     = document.getElementById("virtualKeyboard");
  if (!handle || !kb) return;

  var startX = 0, startY = 0, origL = 0, origT = 0, dragging = false;

  function getPos(e) {
    var t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function onStart(e) {
    if (e.target.closest("button.vkb-hbtn")) return;
    var rect = kb.getBoundingClientRect();
    kb.style.transform = "none";
    kb.style.bottom    = "auto";
    kb.style.right     = "auto";
    kb.style.left = rect.left + "px";
    kb.style.top  = rect.top  + "px";
    var pos = getPos(e);
    startX = pos.x; startY = pos.y;
    origL  = rect.left; origT = rect.top;
    dragging = true;
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    var pos = getPos(e);
    var dx  = pos.x - startX;
    var dy  = pos.y - startY;
    var maxX = window.innerWidth  - kb.offsetWidth;
    var maxY = window.innerHeight - kb.offsetHeight;
    kb.style.left = Math.max(0, Math.min(maxX, origL + dx)) + "px";
    kb.style.top  = Math.max(0, Math.min(maxY, origT + dy)) + "px";
    e.preventDefault();
  }

  function onEnd() { dragging = false; }

  handle.addEventListener("mousedown",  onStart);
  handle.addEventListener("touchstart", onStart, {passive: false});
  document.addEventListener("mousemove", onMove);
  document.addEventListener("touchmove", onMove, {passive: false});
  document.addEventListener("mouseup",   onEnd);
  document.addEventListener("touchend",  onEnd);
}