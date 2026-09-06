/* ══════════════════════════════════════════════════════
   REAL FILE ICONS — same icon set VS Code's default
   "VSCode Icons" theme uses, served straight off jsDelivr
   (mirrors the vscode-icons GitHub repo, so it's the exact
   same SVGs, just CDN-cached).

   Overrides getFileIcon()/getFolderIcon() from app.js —
   this script must load AFTER app.js.
══════════════════════════════════════════════════════ */

const VSCI_BASE = "https://cdn.jsdelivr.net/gh/vscode-icons/vscode-icons@master/icons/";

/* exact filename (lowercased) -> icon name, checked before extension */
const FI_NAME_MAP = {
  "package.json": "npm", "package-lock.json": "npm", ".npmrc": "npm",
  "yarn.lock": "yarn",
  "vite.config.js": "vite", "vite.config.ts": "vite",
  "webpack.config.js": "webpack", "webpack.config.ts": "webpack",
  "tailwind.config.js": "tailwind", "tailwind.config.ts": "tailwind",
  "babel.config.js": "babel", ".babelrc": "babel",
  ".eslintrc": "eslint", ".eslintrc.js": "eslint", ".eslintrc.json": "eslint", ".eslintrc.cjs": "eslint",
  ".prettierrc": "prettier", ".prettierrc.json": "prettier", ".prettierrc.js": "prettier",
  ".editorconfig": "editorconfig",
  ".gitignore": "git", ".gitattributes": "git", ".gitmodules": "git",
  ".env": "dotenv", ".env.example": "dotenv", ".env.local": "dotenv", ".env.development": "dotenv", ".env.production": "dotenv",
  "dockerfile": "docker", ".dockerignore": "docker", "docker-compose.yml": "docker", "docker-compose.yaml": "docker",
  "readme.md": "markdown", "readme": "markdown",
  "license": "license", "license.md": "license", "license.txt": "license",
  "firebase.json": "firebase", ".firebaserc": "firebase", "firestore.rules": "firebase",
  "next.config.js": "next", "next.config.mjs": "next",
  "nuxt.config.js": "nuxt", "nuxt.config.ts": "nuxt",
  "angular.json": "angular",
  "makefile": "cmake", "cmakelists.txt": "cmake",
  "capacitor.config.json": "settings", "capacitor.config.ts": "settings",
  "manifest.json": "json"
};

/* extension (no dot, lowercased) -> icon name */
const FI_EXT_MAP = {
  html: "html", htm: "html",
  css: "css", scss: "scss", sass: "sass", less: "less",
  js: "js", mjs: "js", cjs: "js",
  jsx: "reactjs",
  ts: "typescript",
  tsx: "reactts",
  json: "json", json5: "json5",
  md: "markdown", mdx: "markdown",
  py: "python",
  php: "php",
  rb: "ruby",
  java: "java",
  c: "c", h: "c",
  cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp",
  cs: "csharp",
  go: "go",
  rs: "rust",
  sql: "sql",
  xml: "xml",
  svg: "svg",
  yaml: "yaml", yml: "yaml",
  sh: "shell", bash: "shell", zsh: "shell",
  vue: "vue",
  svelte: "svelte",
  toml: "toml",
  ini: "ini", cfg: "ini",
  log: "log",
  txt: "text",
  pdf: "pdf",
  zip: "zip", rar: "zip", "7z": "zip", tar: "zip", gz: "zip",
  png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", bmp: "image", ico: "image",
  mp4: "video", webm: "video", mov: "video",
  mp3: "audio", wav: "audio",
  swift: "swift",
  kt: "kotlin", kts: "kotlin",
  dart: "flutter",
  tf: "terraform",
  wasm: "wasm",
  pug: "pug",
  hbs: "handlebars",
  woff: "font", woff2: "font", ttf: "font", otf: "font", eot: "font",
  graphql: "graphql", gql: "graphql"
};

/* lowercased folder name -> icon name (vscode-icons "folder_type_*" set) */
const FI_FOLDER_MAP = {
  src: "src", client: "src", app: "src",
  components: "component", component: "component",
  hooks: "hook", hook: "hook",
  styles: "style", style: "style",
  public: "public", static: "public",
  assets: "asset", images: "asset", img: "asset",
  tests: "test", test: "test", __tests__: "test", spec: "test",
  config: "config", configs: "config",
  node_modules: "node",
  ".git": "git",
  routes: "route", route: "route", api: "route",
  middleware: "middleware", middlewares: "middleware",
  server: "server", backend: "server",
  dist: "dist", build: "dist"
};

function fiIconName(filename) {
  const base = filename.split("/").pop().toLowerCase();
  if (FI_NAME_MAP[base]) return FI_NAME_MAP[base];
  const ext = base.includes(".") ? base.split(".").pop() : "";
  return FI_EXT_MAP[ext] || null;
}

/* override — real 16px colored SVG instead of the old text-badge icon,
   with a graceful fallback to VS Code's own default-file icon if the
   CDN is ever unreachable */
function getFileIcon(name) {
  const iconName = fiIconName(name);
  const url = VSCI_BASE + (iconName ? `file_type_${iconName}.svg` : "default_file.svg");
  return `<img class="fi-real" src="${url}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${VSCI_BASE}default_file.svg';">`;
}

function getFolderIcon(name, open) {
  const mapped = FI_FOLDER_MAP[name.toLowerCase()];
  const iconName = mapped ? `folder_type_${mapped}${open ? "_opened" : ""}` : `default_folder${open ? "_opened" : ""}`;
  const url = VSCI_BASE + iconName + ".svg";
  const fallback = VSCI_BASE + `default_folder${open ? "_opened" : ""}.svg`;
  return `<img class="fi-real" src="${url}" alt="" loading="lazy" onerror="this.onerror=null;this.src='${fallback}';">`;
}
