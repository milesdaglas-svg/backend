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
let kbCtrl = false;
let kbAlt  = false;
let kbNativeLocked = localStorage.getItem("kb_native_locked") === "true";

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
        '<button class="vkb-hbtn" id="vkbLockBtn" onclick="toggleNativeKeyboardLock()" title="Lock phone keyboard">' + (kbNativeLocked ? "🔒" : "🔓") + '</button>' +
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

      // Ctrl combo — check BEFORE consuming kbShift
      if (kbCtrl) {
        var wasAlt = kbAlt;
        var handled = handleCtrlCombo(ch);
        kbCtrl = false; kbAlt = false;
        updateKbState();
        if (handled) return;
      }

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
  var ed = getActiveEditor();

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
    case "Ctrl":
      kbCtrl = !kbCtrl;
      updateKbState();
      break;
    case "Alt":
      kbAlt = !kbAlt;
      updateKbState();
      break;
    case "ArrowLeft":
      if (kbCtrl) { if(ed) ed.trigger("kb","cursorWordLeft",{}); kbCtrl=false; updateKbState(); }
      else moveCursor("cursorLeft");
      break;
    case "ArrowRight":
      if (kbCtrl) { if(ed) ed.trigger("kb","cursorWordRight",{}); kbCtrl=false; updateKbState(); }
      else moveCursor("cursorRight");
      break;
    case "ArrowUp":    moveCursor("cursorUp");    break;
    case "ArrowDown":  moveCursor("cursorDown");  break;
    case "Delete":
      if (ed) ed.trigger("kb", "deleteRight", {});
      break;
    case "Escape":
      if (ed) ed.trigger("kb", "editor.action.inlineSuggest.hide", {});
      kbCtrl=false; kbAlt=false; kbShift=false; updateKbState();
      break;
    case "F1":
      if (ed) ed.trigger("kb", "editor.action.quickCommand", {});
      break;
    case "F2":
      if (ed) ed.trigger("kb", "editor.action.rename", {});
      break;
    case "F3":
      if (ed) ed.trigger("kb", "editor.action.nextMatchFindAction", {});
      break;
    case "F11":
      // toggle preview fullscreen-ish: just refresh preview
      if (typeof updatePreview === "function" && typeof currentFile !== "undefined") updatePreview(currentFile);
      break;
    case "F12":
      if (ed) ed.trigger("kb", "editor.action.revealDefinition", {});
      break;
    case "F5":
      if (typeof document !== "undefined") {
        var runBtn = document.getElementById("runBtn");
        if (runBtn) runBtn.click();
      }
      break;
    case "F4": case "F6": case "F7": case "F8": case "F9": case "F10":
      // reserved — no default editor action, just consume the press
      break;
    default:
      fireKey(fn);
  }
}

function getActiveEditor() {
  var ed1 = window.editor1, ed2 = window.editor2;
  function valid(ed) { return ed && typeof ed.getSelection === "function" && typeof ed.executeEdits === "function"; }

  // Desktop: prefer whichever has real focus
  if (valid(ed1) && typeof ed1.hasTextFocus === "function" && ed1.hasTextFocus()) return ed1;
  if (valid(ed2) && typeof ed2.hasTextFocus === "function" && ed2.hasTextFocus()) return ed2;

  // Mobile / keyboard locked: if AI chat input or another textarea is focused, don't hijack
  if (kbLastFocus && (kbLastFocus.tagName === "TEXTAREA" || kbLastFocus.tagName === "INPUT")) {
    return null;
  }

  // Otherwise default to whichever editor is visible/active
  if (valid(ed1)) return ed1;
  if (valid(ed2)) return ed2;
  return null;
}


/* ── CTRL/ALT COMBO with letter keys ── */
function handleCtrlCombo(char) {
  var ed = getActiveEditor();
  if (!ed) return false;
  ed.focus();
  var key = char.toLowerCase();

  // Alt+Ctrl combos (e.g. Ctrl+Alt+arrow not handled here)
  switch(key) {
    case "z":
      if (kbAlt) ed.trigger("kb", "redo", {}); // Ctrl+Alt+Z = redo on some setups
      else ed.trigger("kb", "undo", {});
      return true;
    case "y": ed.trigger("kb", "redo", {}); return true;
    case "s":
      if (typeof saveCurrentFile === "function") saveCurrentFile();
      return true;
    case "a": ed.trigger("kb", "editor.action.selectAll", {}); return true;
    case "c":
      execClipboard(ed, "copy");
      return true;
    case "x":
      execClipboard(ed, "cut");
      return true;
    case "v":
      execClipboard(ed, "paste");
      return true;
    case "f": ed.trigger("kb", "actions.find", {}); return true;
    case "h": ed.trigger("kb", "editor.action.startFindReplaceAction", {}); return true;
    case "d": ed.trigger("kb", "editor.action.addSelectionToNextFindMatch", {}); return true;
    case "/": ed.trigger("kb", "editor.action.commentLine", {}); return true;
    case "[": ed.trigger("kb", "editor.action.outdentLines", {}); return true;
    case "]": ed.trigger("kb", "editor.action.indentLines", {}); return true;
    case "l": ed.trigger("kb", "expandLineSelection", {}); return true;
    case "g": ed.trigger("kb", "editor.action.gotoLine", {}); return true;
    default: return false;
  }
}

/* Clipboard helper — Monaco's clipboard actions need real
   document.execCommand or Clipboard API on some browsers */
function execClipboard(ed, action) {
  try {
    if (action === "copy") {
      var sel = ed.getModel().getValueInRange(ed.getSelection());
      if (navigator.clipboard && sel) navigator.clipboard.writeText(sel);
      else ed.trigger("kb", "editor.action.clipboardCopyAction", {});
    } else if (action === "cut") {
      var selText = ed.getModel().getValueInRange(ed.getSelection());
      if (navigator.clipboard && selText) navigator.clipboard.writeText(selText);
      ed.trigger("kb", "editor.action.clipboardCutAction", {});
    } else if (action === "paste") {
      if (navigator.clipboard && navigator.clipboard.readText) {
        navigator.clipboard.readText().then(function(text) {
          if (text) typeChar(text);
        }).catch(function() {
          ed.trigger("kb", "editor.action.clipboardPasteAction", {});
        });
      } else {
        ed.trigger("kb", "editor.action.clipboardPasteAction", {});
      }
    }
  } catch(e) {
    ed.trigger("kb", "editor.action.clipboardCopyAction", {});
  }
}

function typeChar(char) {
  var ed = getActiveEditor();

  if (!ed) {
    var e1 = window.editor1, e2 = window.editor2;
    if (e1 && typeof e1.getSelection === "function" && typeof e1.executeEdits === "function") ed = e1;
    else if (e2 && typeof e2.getSelection === "function" && typeof e2.executeEdits === "function") ed = e2;
  }

  // last resort — ask Monaco directly for any live editor instance
  if (!ed && window.monaco && monaco.editor && typeof monaco.editor.getEditors === "function") {
    var all = monaco.editor.getEditors();
    if (all && all.length) ed = all[0];
  }

  if (ed) {
    try {
      var sel = ed.getSelection();
      ed.executeEdits("kb", [{ range: sel, text: char, forceMoveMarkers: true }]);
      ed.pushUndoStop();
      ed.focus();
      ed.revealLine(sel.endLineNumber);
    } catch(err) {
      if (typeof showToast === "function") showToast("KB error: " + err.message, "error");
    }
    return;
  }

  // Last focused input/textarea (AI chat, settings etc)
  var el = kbLastFocus;
  if (el && (el.tagName === "TEXTAREA" || el.tagName === "INPUT") && !el.readOnly) {
    var s   = el.selectionStart || 0;
    var end = el.selectionEnd   || 0;
    el.value = el.value.slice(0, s) + char + el.value.slice(end);
    var pos = s + char.length;
    el.setSelectionRange(pos, pos);
    el.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  if (typeof showToast === "function") showToast("KB: no target found", "error");
}
/* ══════════════════════
   BACKSPACE
══════════════════════ */
function doBackspace() {
  var ed = getActiveEditor();

  if (!ed) {
    var e1 = window.editor1, e2 = window.editor2;
    if (e1 && typeof e1.getSelection === "function" && typeof e1.executeEdits === "function") ed = e1;
    else if (e2 && typeof e2.getSelection === "function" && typeof e2.executeEdits === "function") ed = e2;
  }
  if (!ed && window.monaco && monaco.editor && typeof monaco.editor.getEditors === "function") {
    var all = monaco.editor.getEditors();
    if (all && all.length) ed = all[0];
  }

  if (ed) {
    try {
      ed.focus();
      ed.trigger("kb", "deleteLeft", {});
    } catch(err) {
      if (typeof showToast === "function") showToast("KB error: " + err.message, "error");
    }
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

  if (typeof showToast === "function") showToast("KB: no target found", "error");
}

/* ══════════════════════
   CURSOR MOVEMENT
══════════════════════ */
function moveCursor(action) {
  var ed = getActiveEditor() || window.editor1;
  if (ed && typeof ed.focus === "function") {
    ed.focus();
    ed.trigger("kb", action, {});
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
  document.querySelectorAll("[data-fn='Ctrl']").forEach(function(b) {
    b.classList.toggle("vkb-active", kbCtrl);
  });
  document.querySelectorAll("[data-fn='Alt']").forEach(function(b) {
    b.classList.toggle("vkb-active", kbAlt);
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

  if (typeof window.updateEditorSafeArea === "function") {
    setTimeout(window.updateEditorSafeArea, 50);
  }
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

  function onEnd() {
    dragging = false;
    if (typeof window.updateEditorSafeArea === "function") window.updateEditorSafeArea();
  }

  handle.addEventListener("mousedown",  onStart);
  handle.addEventListener("touchstart", onStart, {passive: false});
  document.addEventListener("mousemove", onMove);
  document.addEventListener("touchmove", onMove, {passive: false});
  document.addEventListener("mouseup",   onEnd);
  document.addEventListener("touchend",  onEnd);
}


function applyNativeKeyboardLock() {
  document.querySelectorAll(".monaco-editor textarea.inputarea").forEach(function(ta) {
    if (kbNativeLocked) {
      ta.setAttribute("inputmode", "none");
      ta.setAttribute("readonly", "readonly");
    } else {
      ta.removeAttribute("inputmode");
      ta.removeAttribute("readonly");
    }
  });
}

function toggleNativeKeyboardLock() {
  kbNativeLocked = !kbNativeLocked;
  localStorage.setItem("kb_native_locked", kbNativeLocked);
  applyNativeKeyboardLock();

  var btn = document.getElementById("vkbLockBtn");
  if (btn) {
    btn.classList.toggle("vkb-locked", kbNativeLocked);
    btn.innerHTML = kbNativeLocked ? "🔒" : "🔓";
  }

  if (typeof showToast === "function") {
    showToast(kbNativeLocked ? "🔒 Phone keyboard disabled — use virtual keyboard" : "🔓 Phone keyboard enabled", "info");
  }
}

// re-apply lock whenever editor re-renders its textarea (Monaco recreates it sometimes)
const kbLockObserver = new MutationObserver(function() {
  applyNativeKeyboardLock();
});
window.addEventListener("load", function() {
  setTimeout(function() {
    applyNativeKeyboardLock();
    var editorArea = document.querySelector(".editor-area");
    if (editorArea) kbLockObserver.observe(editorArea, { childList: true, subtree: true });
  }, 1500);
});

/* ══════════════════════
   #5 — PHYSICAL KEYBOARD
   SYNC (highlight virtual
   key when real key pressed)
══════════════════════ */
const KB_KEY_MAP = {
  "Backquote":"`","Digit1":"1","Digit2":"2","Digit3":"3","Digit4":"4","Digit5":"5",
  "Digit6":"6","Digit7":"7","Digit8":"8","Digit9":"9","Digit0":"0","Minus":"-","Equal":"=",
  "KeyQ":"q","KeyW":"w","KeyE":"e","KeyR":"r","KeyT":"t","KeyY":"y","KeyU":"u","KeyI":"i","KeyO":"o","KeyP":"p",
  "BracketLeft":"[","BracketRight":"]","Backslash":"\\",
  "KeyA":"a","KeyS":"s","KeyD":"d","KeyF":"f","KeyG":"g","KeyH":"h","KeyJ":"j","KeyK":"k","KeyL":"l",
  "Semicolon":";","Quote":"'",
  "KeyZ":"z","KeyX":"x","KeyC":"c","KeyV":"v","KeyB":"b","KeyN":"n","KeyM":"m",
  "Comma":",","Period":".","Slash":"/",
  "Space":"__space__"
};
const KB_FN_MAP = {
  "Enter":"Enter","Backspace":"Backspace","Tab":"Tab","Escape":"Escape","Delete":"Delete",
  "ArrowLeft":"ArrowLeft","ArrowRight":"ArrowRight","ArrowUp":"ArrowUp","ArrowDown":"ArrowDown",
  "ControlLeft":"Ctrl","ControlRight":"Ctrl","AltLeft":"Alt","AltRight":"Alt",
  "ShiftLeft":"Shift","ShiftRight":"Shift","CapsLock":"Caps",
  "F1":"F1","F2":"F2","F3":"F3","F4":"F4","F5":"F5","F6":"F6","F7":"F7","F8":"F8","F9":"F9","F10":"F10","F11":"F11","F12":"F12"
};

document.addEventListener("keydown", function(e) {
  if (!kbBuilt) return;
  var kb = document.getElementById("virtualKeyboard");
  if (!kb || kb.style.display === "none") return;

  var btn = null;

  if (KB_KEY_MAP[e.code]) {
    var ch = KB_KEY_MAP[e.code];
    if (ch === "__space__") {
      btn = document.getElementById("kb-space");
    } else {
      btn = kb.querySelector('[data-ch="' + ch.replace(/"/g, '\\"') + '"]');
    }
  } else if (KB_FN_MAP[e.code]) {
    var fn = KB_FN_MAP[e.code];
    if (fn === "Shift") btn = kb.querySelector("#kb-shift") || kb.querySelector('[data-fn="Shift"]');
    else if (fn === "Caps") btn = kb.querySelector("#kb-caps");
    else if (fn === "Enter") btn = kb.querySelector("#kb-enter");
    else if (fn === "Backspace") btn = kb.querySelector("#kb-bksp");
    else btn = kb.querySelector('[data-fn="' + fn + '"]');
  }

  if (btn) {
    btn.classList.add("vkb-physical-press");
  }
});

document.addEventListener("keyup", function(e) {
  if (!kbBuilt) return;
  var kb = document.getElementById("virtualKeyboard");
  if (!kb) return;

  var btn = null;
  if (KB_KEY_MAP[e.code]) {
    var ch = KB_KEY_MAP[e.code];
    if (ch === "__space__") btn = document.getElementById("kb-space");
    else btn = kb.querySelector('[data-ch="' + ch.replace(/"/g, '\\"') + '"]');
  } else if (KB_FN_MAP[e.code]) {
    var fn = KB_FN_MAP[e.code];
    if (fn === "Shift") btn = kb.querySelector("#kb-shift") || kb.querySelector('[data-fn="Shift"]');
    else if (fn === "Caps") btn = kb.querySelector("#kb-caps");
    else if (fn === "Enter") btn = kb.querySelector("#kb-enter");
    else if (fn === "Backspace") btn = kb.querySelector("#kb-bksp");
    else btn = kb.querySelector('[data-fn="' + fn + '"]');
  }

  if (btn) {
    setTimeout(function() { btn.classList.remove("vkb-physical-press"); }, 100);
  }
});