/* ══════════════════════════════════════
   IN-BROWSER LINTING (JS/JSX only)
   Runs entirely client-side via eslint-linter-browserify — no
   server round-trip, no build step. Squiggly markers show up
   in Monaco the same way its own built-in checker does for
   .ts files, so errors surface before you even hit Run.

   Scoped to real bug-catchers (unreachable code, duplicate
   object keys, accidental reassignment, comparing with NaN,
   etc.) rather than style rules — a linter that nags about
   semicolons gets ignored; one that only flags actual bugs
   gets trusted.

   no-undef is deliberately left off: this app spreads globals
   across many plain <script> files (openFolders, files,
   showToast, etc. are all defined in one file and used in
   others), so linting a single open file in isolation would
   flag a wall of false "undefined variable" positives for
   perfectly valid cross-file globals.
══════════════════════════════════════ */

const LINT_CDN_URL = "https://cdn.jsdelivr.net/npm/eslint-linter-browserify@10.10.0/linter.mjs";

let _eslintLinterInstance = null;
let _eslintLoadFailed = false;
async function getEslintLinter(){
  if(_eslintLinterInstance) return _eslintLinterInstance;
  if(_eslintLoadFailed) return null;
  try{
    const mod = await import(LINT_CDN_URL);
    _eslintLinterInstance = new mod.Linter();
    return _eslintLinterInstance;
  }catch(e){
    _eslintLoadFailed = true;
    console.warn("[lint] could not load ESLint browser bundle (offline, or CDN blocked):", e.message);
    return null;
  }
}

const LINT_CONFIG = [{
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: { ecmaFeatures: { jsx: true } }
  },
  rules: {
    "no-dupe-keys": "error",
    "no-dupe-args": "error",
    "no-unreachable": "error",
    "no-const-assign": "error",
    "no-fallthrough": "warn",
    "no-redeclare": "warn",
    "no-self-assign": "warn",
    "no-cond-assign": "warn",
    "use-isnan": "error",
    "valid-typeof": "error",
    "no-func-assign": "error",
    "no-obj-calls": "error",
    "no-sparse-arrays": "warn",
    "no-import-assign": "error",
    "no-async-promise-executor": "warn",
    "no-compare-neg-zero": "warn",
    "no-dupe-else-if": "warn",
    "no-duplicate-case": "error",
    "no-irregular-whitespace": "warn",
    "no-loss-of-precision": "warn",
    "no-setter-return": "error",
    "no-unsafe-negation": "warn",
    "constructor-super": "error",
    "no-this-before-super": "error",
    "no-unused-vars": "warn"
  }
}];

const LINTABLE_EXT = /\.(js|jsx|mjs|cjs)$/i;

let lintDebounceTimer = null;
function debouncedLint(filename, model){
  clearTimeout(lintDebounceTimer);
  lintDebounceTimer = setTimeout(() => lintNow(filename, model), 500);
}

async function lintNow(filename, model){
  if(!filename || !model) return;
  if(!LINTABLE_EXT.test(filename)){
    try{ monaco.editor.setModelMarkers(model, "eslint", []); }catch{}
    return;
  }
  const linter = await getEslintLinter();
  if(!linter) return;
  const code = model.getValue();
  let messages;
  try{
    messages = linter.verify(code, LINT_CONFIG, filename);
  }catch(e){
    // parse error mid-edit (e.g. an unclosed brace while typing) — don't
    // spam markers over something that isn't a real lint finding
    try{ monaco.editor.setModelMarkers(model, "eslint", []); }catch{}
    return;
  }
  const markers = messages.map(m => ({
    severity: m.severity === 2 ? monaco.MarkerSeverity.Error : monaco.MarkerSeverity.Warning,
    startLineNumber: m.line || 1,
    startColumn: m.column || 1,
    endLineNumber: m.endLine || m.line || 1,
    endColumn: m.endColumn || (m.column||1) + 1,
    message: m.ruleId ? `${m.message} (${m.ruleId})` : m.message,
    source: "eslint"
  }));
  try{ monaco.editor.setModelMarkers(model, "eslint", markers); }catch{}
}
