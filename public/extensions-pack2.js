/* =========================================
   EXTENSION PACK 2 — GENERATORS
   Tools that generate useful content
========================================= */

const EXT_GENERATORS = {

  "gen-lorem": {
    name: "Lorem Ipsum Generator",
    icon: "📝",
    desc: "Generate placeholder lorem ipsum text.",
    longDesc: "Generates classic lorem ipsum placeholder text in paragraphs, sentences, or words.",
    howTo: "Click Open, choose how much text to generate.",
    example: "Lorem ipsum dolor sit amet, consectetur adipiscing elit...",
    publisher: "vscodegodmode"
  },
  "gen-uuid": {
    name: "UUID Generator",
    icon: "🆔",
    desc: "Generate RFC 4122 compliant UUIDs (v4).",
    longDesc: "Generates one or more random UUIDs (Universally Unique Identifiers) and inserts them at the cursor.",
    howTo: "Click Open, choose how many UUIDs to generate.",
    example: "550e8400-e29b-41d4-a716-446655440000",
    publisher: "vscodegodmode"
  },
  "gen-password": {
    name: "Password Generator",
    icon: "🔑",
    desc: "Generate strong random passwords.",
    longDesc: "Creates secure random passwords with configurable length and character sets (uppercase, lowercase, numbers, symbols).",
    howTo: "Click Open, choose length and options.",
    example: "Kx#9mP$2qL@nR7wZ",
    publisher: "vscodegodmode"
  },
  "gen-color-palette": {
    name: "Color Palette Generator",
    icon: "🎨",
    desc: "Generate harmonious color palettes as CSS variables.",
    longDesc: "Creates a set of complementary colors and outputs them as CSS custom properties ready to paste.",
    howTo: "Click Open, choose a base color and palette style.",
    example: "--color-primary: #6366f1;\n--color-secondary: #8b5cf6;\n--color-accent: #06b6d4;",
    publisher: "vscodegodmode"
  },
  "gen-fake-data": {
    name: "Fake Data Generator",
    icon: "👤",
    desc: "Generate fake user data — names, emails, addresses.",
    longDesc: "Creates realistic-looking fake data for testing: names, emails, phone numbers, addresses, companies — as JSON.",
    howTo: "Click Open, choose data type and count.",
    example: '{"name":"John Smith","email":"john@example.com","phone":"555-0192"}',
    publisher: "vscodegodmode"
  },
  "gen-regex": {
    name: "Regex Generator",
    icon: "🔍",
    desc: "Generate common regex patterns for email, URL, phone, etc.",
    longDesc: "Inserts ready-to-use regex patterns for common validation tasks — email, URL, phone, zip code, IP address, date, and more.",
    howTo: "Click Open, pick the pattern type.",
    example: "/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/",
    publisher: "vscodegodmode"
  },
  "gen-css-gradient": {
    name: "CSS Gradient Generator",
    icon: "🌈",
    desc: "Generate beautiful CSS gradient code.",
    longDesc: "Creates linear or radial CSS gradient declarations with customizable colors and direction.",
    howTo: "Click Open, fill in colors and direction.",
    example: "background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);",
    publisher: "vscodegodmode"
  },
  "gen-json-schema": {
    name: "JSON Schema Generator",
    icon: "📐",
    desc: "Generate a JSON schema from a JSON object.",
    longDesc: "Analyzes selected JSON and automatically generates a JSON Schema (draft-07) with inferred types for each property.",
    howTo: "Select a JSON object, click Open, click Generate.",
    example: '{"type":"object","properties":{"name":{"type":"string"},"age":{"type":"number"}}}',
    publisher: "vscodegodmode"
  },
  "gen-placeholder-img": {
    name: "Placeholder Image Tag",
    icon: "🖼",
    desc: "Insert HTML img tags with placeholder image URLs.",
    longDesc: "Generates <img> tags using placeholder services (placehold.co) at common sizes for wireframing.",
    howTo: "Click Open, choose size and style.",
    example: '<img src="https://placehold.co/400x300" alt="Placeholder">',
    publisher: "vscodegodmode"
  },
  "gen-meta-tags": {
    name: "HTML Meta Tags Generator",
    icon: "🏷",
    desc: "Generate complete SEO + Open Graph meta tags.",
    longDesc: "Creates a full set of HTML meta tags including title, description, Open Graph, Twitter Card, and viewport tags.",
    howTo: "Click Open, fill in title, description, URL, image.",
    example: '<meta name="description" content="...">\n<meta property="og:title" content="...">',
    publisher: "vscodegodmode"
  },
  "gen-box-shadow": {
    name: "Box Shadow Generator",
    icon: "🟦",
    desc: "Generate CSS box-shadow declarations.",
    longDesc: "Creates box-shadow CSS with presets (soft, hard, neon, layered) or custom values.",
    howTo: "Click Open, choose a shadow style.",
    example: "box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);",
    publisher: "vscodegodmode"
  },
  "gen-api-fetch": {
    name: "API Fetch Boilerplate",
    icon: "📡",
    desc: "Generate fetch/axios API call boilerplate code.",
    longDesc: "Creates ready-to-use async fetch or axios code with error handling, loading state, and response parsing.",
    howTo: "Click Open, enter the URL and choose fetch or axios.",
    example: "const res = await fetch('URL');\nif(!res.ok) throw new Error(res.statusText);\nconst data = await res.json();",
    publisher: "vscodegodmode"
  },
  "gen-flexbox": {
    name: "Flexbox Layout Generator",
    icon: "📦",
    desc: "Generate CSS flexbox layout code.",
    longDesc: "Creates complete flexbox CSS for common layouts: centered, space-between, column, wrapping grid, sticky footer.",
    howTo: "Click Open, pick a layout pattern.",
    example: "display: flex;\nflex-wrap: wrap;\ngap: 16px;\njustify-content: space-between;",
    publisher: "vscodegodmode"
  },
  "gen-grid": {
    name: "CSS Grid Generator",
    icon: "⊞",
    desc: "Generate CSS Grid layout code.",
    longDesc: "Creates CSS grid declarations for common layouts: 12-column, auto-fill, named areas, holy grail.",
    howTo: "Click Open, pick a grid layout.",
    example: "display: grid;\ngrid-template-columns: repeat(12, 1fr);\ngap: 24px;",
    publisher: "vscodegodmode"
  },
  "gen-animation": {
    name: "CSS Animation Generator",
    icon: "✨",
    desc: "Generate @keyframe animations ready to use.",
    longDesc: "Creates CSS keyframe animations for common effects: fade, slide, bounce, spin, pulse, shake, typewriter.",
    howTo: "Click Open, pick an animation type.",
    example: "@keyframes fadeIn {\n  from { opacity:0; transform:translateY(10px); }\n  to   { opacity:1; transform:translateY(0); }\n}",
    publisher: "vscodegodmode"
  },
  "gen-table": {
    name: "HTML Table Generator",
    icon: "📊",
    desc: "Generate styled HTML tables from row/column counts.",
    longDesc: "Creates a complete HTML table with thead, tbody, and placeholder content — with optional inline CSS styling.",
    howTo: "Click Open, enter rows and columns.",
    example: "<table>\n  <thead><tr><th>Col 1</th></tr></thead>\n  <tbody><tr><td>Data</td></tr></tbody>\n</table>",
    publisher: "vscodegodmode"
  },
  "gen-form": {
    name: "HTML Form Generator",
    icon: "📋",
    desc: "Generate complete HTML forms with common field types.",
    longDesc: "Creates contact, login, signup, or custom forms with labels, inputs, validation attributes, and a submit button.",
    howTo: "Click Open, choose form type.",
    example: '<form>\n  <input type="email" placeholder="Email" required>\n  <button type="submit">Submit</button>\n</form>',
    publisher: "vscodegodmode"
  },
  "gen-media-query": {
    name: "Media Query Generator",
    icon: "📱",
    desc: "Generate responsive CSS media queries.",
    longDesc: "Creates media query blocks for standard breakpoints (mobile, tablet, desktop, wide) or custom values.",
    howTo: "Click Open, choose breakpoint style.",
    example: "@media(max-width: 768px) {\n  /* mobile styles */\n}",
    publisher: "vscodegodmode"
  },
  "gen-gitignore": {
    name: ".gitignore Generator",
    icon: "🌿",
    desc: "Generate .gitignore files for common project types.",
    longDesc: "Creates a comprehensive .gitignore file for Node.js, Python, React, Vue, Laravel, or general web projects.",
    howTo: "Click Open, choose project type.",
    example: "node_modules/\n.env\ndist/\n*.log\n.DS_Store",
    publisher: "vscodegodmode"
  },
  "gen-readme": {
    name: "README Generator",
    icon: "📖",
    desc: "Generate a Markdown README template.",
    longDesc: "Creates a complete README.md with sections for project title, description, installation, usage, API docs, contributing, and license.",
    howTo: "Click Open, fill in project name and description.",
    example: "# Project Name\n\n## Installation\n```bash\nnpm install\n```",
    publisher: "vscodegodmode"
  }

};

/* ══════════════════════
   GENERATOR ACTIONS
══════════════════════ */
const GENERATOR_ACTIONS = {

  "gen-lorem": [
    { label: "1 Paragraph", fn: () => loremParagraphs(1) },
    { label: "3 Paragraphs", fn: () => loremParagraphs(3) },
    { label: "5 Paragraphs", fn: () => loremParagraphs(5) },
    { label: "5 Sentences", fn: () => loremSentences(5) },
    { label: "20 Words", fn: () => loremWords(20) }
  ],
  "gen-uuid": [
    { label: "1 UUID", fn: () => genUUID() },
    { label: "5 UUIDs", fn: () => Array.from({length:5},genUUID).join("\n") },
    { label: "10 UUIDs", fn: () => Array.from({length:10},genUUID).join("\n") }
  ],
  "gen-password": [
    { label: "12 chars (letters+numbers)", fn: () => genPassword(12, false) },
    { label: "16 chars (letters+numbers+symbols)", fn: () => genPassword(16, true) },
    { label: "24 chars (strong)", fn: () => genPassword(24, true) },
    { label: "5 passwords (16 chars)", fn: () => Array.from({length:5},()=>genPassword(16,true)).join("\n") }
  ],
  "gen-color-palette": [
    { label: "Random Palette (CSS vars)", fn: genColorPalette },
    { label: "Blues Palette", fn: () => genNamedPalette(["#eff6ff","#bfdbfe","#3b82f6","#1d4ed8","#1e3a8a"]) },
    { label: "Greens Palette", fn: () => genNamedPalette(["#f0fdf4","#bbf7d0","#22c55e","#15803d","#14532d"]) },
    { label: "Purples Palette", fn: () => genNamedPalette(["#faf5ff","#e9d5ff","#a855f7","#7e22ce","#3b0764"]) }
  ],
  "gen-fake-data": [
    { label: "1 User (JSON)", fn: () => JSON.stringify(genFakeUser(), null, 2) },
    { label: "5 Users (JSON array)", fn: () => JSON.stringify(Array.from({length:5},genFakeUser), null, 2) },
    { label: "Random Name", fn: () => genFakeName() },
    { label: "Random Email", fn: () => genFakeEmail() },
    { label: "Random Address", fn: () => genFakeAddress() }
  ],
  "gen-regex": [
    { label: "Email", fn: () => "/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$/" },
    { label: "URL", fn: () => "/^(https?:\\/\\/)?([\\da-z.-]+)\\.([a-z.]{2,6})([/\\w .-]*)*\\/?$/" },
    { label: "Phone (US)", fn: () => "/^\\+?1?[-.\\s]?\\(?[0-9]{3}\\)?[-.\\s]?[0-9]{3}[-.\\s]?[0-9]{4}$/" },
    { label: "Zip Code (US)", fn: () => "/^\\d{5}(-\\d{4})?$/" },
    { label: "IP Address", fn: () => "/^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/" },
    { label: "Date (YYYY-MM-DD)", fn: () => "/^\\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/" },
    { label: "Hex Color", fn: () => "/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/" },
    { label: "Strong Password", fn: () => "/^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$/" }
  ],
  "gen-css-gradient": [
    { label: "Random Linear Gradient", fn: genRandomGradient },
    { label: "Sunset", fn: () => "background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);" },
    { label: "Ocean", fn: () => "background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);" },
    { label: "Forest", fn: () => "background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);" },
    { label: "Night", fn: () => "background: linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%);" },
    { label: "Candy", fn: () => "background: linear-gradient(135deg, #f857a6 0%, #ff5858 100%);" }
  ],
  "gen-json-schema": [
    { label: "Generate Schema", fn: genJsonSchema }
  ],
  "gen-placeholder-img": [
    { label: "400x300", fn: () => '<img src="https://placehold.co/400x300" alt="Placeholder" width="400" height="300">' },
    { label: "800x400 (banner)", fn: () => '<img src="https://placehold.co/800x400" alt="Banner" width="800" height="400">' },
    { label: "100x100 (avatar)", fn: () => '<img src="https://placehold.co/100x100" alt="Avatar" width="100" height="100">' },
    { label: "1200x630 (og:image)", fn: () => '<img src="https://placehold.co/1200x630" alt="OG Image" width="1200" height="630">' }
  ],
  "gen-meta-tags": [
    { label: "Basic SEO Tags", fn: () => `<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta name="description" content="Your description here">\n<meta name="keywords" content="keyword1, keyword2">\n<meta name="author" content="Your Name">` },
    { label: "Open Graph Tags", fn: () => `<meta property="og:title" content="Your Title">\n<meta property="og:description" content="Your Description">\n<meta property="og:image" content="https://yoursite.com/image.jpg">\n<meta property="og:url" content="https://yoursite.com">\n<meta property="og:type" content="website">` },
    { label: "Twitter Card Tags", fn: () => `<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="Your Title">\n<meta name="twitter:description" content="Your Description">\n<meta name="twitter:image" content="https://yoursite.com/image.jpg">` },
    { label: "Full SEO Pack (all)", fn: () => `<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width, initial-scale=1.0">\n<meta name="description" content="Your description">\n<meta name="keywords" content="keyword1, keyword2">\n<meta name="author" content="Your Name">\n<meta property="og:title" content="Your Title">\n<meta property="og:description" content="Your Description">\n<meta property="og:image" content="https://yoursite.com/image.jpg">\n<meta property="og:url" content="https://yoursite.com">\n<meta property="og:type" content="website">\n<meta name="twitter:card" content="summary_large_image">\n<meta name="twitter:title" content="Your Title">\n<meta name="twitter:description" content="Your Description">\n<meta name="twitter:image" content="https://yoursite.com/image.jpg">` }
  ],
  "gen-box-shadow": [
    { label: "Soft Shadow", fn: () => "box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);" },
    { label: "Medium Shadow", fn: () => "box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);" },
    { label: "Large Shadow", fn: () => "box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);" },
    { label: "Neon Blue Glow", fn: () => "box-shadow: 0 0 15px rgba(59,130,246,0.5), 0 0 30px rgba(59,130,246,0.3);" },
    { label: "Neon Green Glow", fn: () => "box-shadow: 0 0 15px rgba(34,197,94,0.5), 0 0 30px rgba(34,197,94,0.3);" },
    { label: "Inset Shadow", fn: () => "box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);" },
    { label: "Layered (realistic)", fn: () => "box-shadow: 0 1px 2px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.07), 0 4px 8px rgba(0,0,0,0.07), 0 8px 16px rgba(0,0,0,0.07);" }
  ],
  "gen-api-fetch": [
    { label: "fetch (async/await)", fn: t => genFetchCode(t||"https://api.example.com/data", "fetch") },
    { label: "axios (async/await)", fn: t => genFetchCode(t||"https://api.example.com/data", "axios") },
    { label: "fetch with error handling", fn: t => genFetchCode(t||"https://api.example.com/data", "fetch-full") }
  ],
  "gen-flexbox": [
    { label: "Center everything", fn: () => "display: flex;\nalign-items: center;\njustify-content: center;" },
    { label: "Space between row", fn: () => "display: flex;\nalign-items: center;\njustify-content: space-between;\nflex-wrap: wrap;\ngap: 16px;" },
    { label: "Column layout", fn: () => "display: flex;\nflex-direction: column;\ngap: 16px;" },
    { label: "Responsive wrap grid", fn: () => "display: flex;\nflex-wrap: wrap;\ngap: 16px;" },
    { label: "Sticky footer layout", fn: () => "/* parent */\ndisplay: flex;\nflex-direction: column;\nmin-height: 100vh;\n\n/* main content */\nflex: 1;" }
  ],
  "gen-grid": [
    { label: "12-column grid", fn: () => "display: grid;\ngrid-template-columns: repeat(12, 1fr);\ngap: 24px;" },
    { label: "Auto-fill responsive", fn: () => "display: grid;\ngrid-template-columns: repeat(auto-fill, minmax(280px, 1fr));\ngap: 24px;" },
    { label: "Holy grail layout", fn: () => "display: grid;\ngrid-template: auto 1fr auto / auto 1fr auto;\nmin-height: 100vh;" },
    { label: "2-column sidebar", fn: () => "display: grid;\ngrid-template-columns: 260px 1fr;\ngap: 24px;" }
  ],
  "gen-animation": [
    { label: "Fade In", fn: () => "@keyframes fadeIn {\n  from { opacity: 0; transform: translateY(10px); }\n  to   { opacity: 1; transform: translateY(0); }\n}\n.fade-in { animation: fadeIn 0.4s ease forwards; }" },
    { label: "Slide In Left", fn: () => "@keyframes slideInLeft {\n  from { opacity: 0; transform: translateX(-30px); }\n  to   { opacity: 1; transform: translateX(0); }\n}\n.slide-in { animation: slideInLeft 0.4s ease forwards; }" },
    { label: "Bounce", fn: () => "@keyframes bounce {\n  0%,100% { transform: translateY(0); }\n  50%      { transform: translateY(-20px); }\n}\n.bounce { animation: bounce 0.6s ease infinite; }" },
    { label: "Spin", fn: () => "@keyframes spin {\n  from { transform: rotate(0deg); }\n  to   { transform: rotate(360deg); }\n}\n.spin { animation: spin 1s linear infinite; }" },
    { label: "Pulse", fn: () => "@keyframes pulse {\n  0%,100% { transform: scale(1); opacity: 1; }\n  50%      { transform: scale(1.05); opacity: 0.8; }\n}\n.pulse { animation: pulse 2s ease-in-out infinite; }" },
    { label: "Shake", fn: () => "@keyframes shake {\n  0%,100% { transform: translateX(0); }\n  25%     { transform: translateX(-8px); }\n  75%     { transform: translateX(8px); }\n}\n.shake { animation: shake 0.4s ease; }" }
  ],
  "gen-table": [
    { label: "3x3 Table", fn: () => genHtmlTable(3,3) },
    { label: "5x5 Table", fn: () => genHtmlTable(5,5) },
    { label: "Data Table (styled)", fn: () => genHtmlTable(4,4, true) }
  ],
  "gen-form": [
    { label: "Contact Form", fn: genContactForm },
    { label: "Login Form", fn: genLoginForm },
    { label: "Signup Form", fn: genSignupForm },
    { label: "Search Form", fn: () => '<form class="search-form">\n  <input type="search" name="q" placeholder="Search..." required>\n  <button type="submit">🔍 Search</button>\n</form>' }
  ],
  "gen-media-query": [
    { label: "Mobile (max 768px)", fn: () => "@media(max-width: 768px) {\n  /* mobile styles here */\n}" },
    { label: "Tablet (768px - 1024px)", fn: () => "@media(min-width: 768px) and (max-width: 1024px) {\n  /* tablet styles here */\n}" },
    { label: "Desktop (min 1024px)", fn: () => "@media(min-width: 1024px) {\n  /* desktop styles here */\n}" },
    { label: "All breakpoints", fn: () => "/* Mobile first */\n\n/* Tablet */\n@media(min-width: 768px) {\n\n}\n\n/* Desktop */\n@media(min-width: 1024px) {\n\n}\n\n/* Wide */\n@media(min-width: 1440px) {\n\n}" },
    { label: "Dark mode", fn: () => "@media(prefers-color-scheme: dark) {\n  /* dark mode styles here */\n}" },
    { label: "Print", fn: () => "@media print {\n  /* print styles here */\n  .no-print { display: none; }\n}" }
  ],
  "gen-gitignore": [
    { label: "Node.js", fn: () => "node_modules/\ndist/\nbuild/\n.env\n.env.local\n.env.*.local\n*.log\nnpm-debug.log*\n.DS_Store\nThumbs.db\n.vscode/\n.idea/\ncoverage/" },
    { label: "Python", fn: () => "__pycache__/\n*.py[cod]\n*$py.class\n*.so\n.env\nvenv/\nenv/\n.venv/\ndist/\nbuild/\n*.egg-info/\n.pytest_cache/\n.DS_Store" },
    { label: "React/Vite", fn: () => "node_modules/\ndist/\n.env\n.env.local\n.env.production\n*.log\n.DS_Store\ncoverage/\n.vite/" },
    { label: "General Web", fn: () => "node_modules/\n.env\n.env.*\ndist/\nbuild/\n*.log\n.DS_Store\nThumbs.db\n*.tmp\n*.temp\n.cache/" }
  ],
  "gen-readme": [
    { label: "Basic README", fn: genBasicReadme },
    { label: "Full README (all sections)", fn: genFullReadme }
  ]

};

/* ── helper implementations ── */
const LOREM_WORDS = ["lorem","ipsum","dolor","sit","amet","consectetur","adipiscing","elit","sed","do","eiusmod","tempor","incididunt","ut","labore","et","dolore","magna","aliqua","enim","ad","minim","veniam","quis","nostrud","exercitation","ullamco","laboris","nisi","aliquip","ex","ea","commodo","consequat","duis","aute","irure","in","reprehenderit","voluptate","velit","esse","cillum","fugiat","nulla","pariatur","excepteur","sint","occaecat","cupidatat","non","proident","sunt","culpa","qui","officia","deserunt","mollit","anim","id","est","laborum"];

function loremWords(n) { return Array.from({length:n},()=>LOREM_WORDS[Math.floor(Math.random()*LOREM_WORDS.length)]).join(" "); }
function loremSentences(n) { return Array.from({length:n},()=>{ const s=loremWords(8+Math.floor(Math.random()*10)); return s.charAt(0).toUpperCase()+s.slice(1)+"."; }).join(" "); }
function loremParagraphs(n) { return Array.from({length:n},()=>loremSentences(4+Math.floor(Math.random()*4))).join("\n\n"); }

function genUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,c=>{
    const r=Math.random()*16|0, v=c==="x"?r:(r&0x3|0x8);
    return v.toString(16);
  });
}

function genPassword(len, symbols) {
  let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  if (symbols) chars += "!@#$%^&*()_+-=[]{}|;:,.<>?";
  return Array.from({length:len},()=>chars[Math.floor(Math.random()*chars.length)]).join("");
}

function genColorPalette() {
  const h = Math.floor(Math.random()*360);
  const colors = [0,30,60,180,210].map(offset=>{
    const hue = (h+offset)%360;
    return `--color-${offset===0?"primary":offset===30?"secondary":offset===60?"accent":offset===180?"muted":"dark"}: hsl(${hue}, 65%, 55%);`;
  });
  return ":root {\n  " + colors.join("\n  ") + "\n}";
}
function genNamedPalette(colors) {
  const names = ["50","100","500","700","900"];
  return ":root {\n" + colors.map((c,i)=>`  --color-${names[i]}: ${c};`).join("\n") + "\n}";
}

const FIRST_NAMES = ["James","Emma","Oliver","Sophia","William","Ava","Liam","Isabella","Noah","Mia","John","Alice","Bob","Carol","David","Eve","Frank","Grace","Henry","Iris"];
const LAST_NAMES  = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Wilson","Moore","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin"];
const DOMAINS     = ["gmail.com","yahoo.com","outlook.com","hotmail.com","mail.com","proton.me"];
const STREETS     = ["Main St","Oak Ave","Maple Dr","Cedar Ln","Pine Rd","Elm St","Washington Blvd","Park Ave"];
const CITIES      = ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego"];

function genFakeName() { return FIRST_NAMES[Math.floor(Math.random()*FIRST_NAMES.length)] + " " + LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)]; }
function genFakeEmail() { const n=genFakeName().toLowerCase().replace(" ","."); return n+"@"+DOMAINS[Math.floor(Math.random()*DOMAINS.length)]; }
function genFakeAddress() { return (Math.floor(Math.random()*9000)+1000)+" "+STREETS[Math.floor(Math.random()*STREETS.length)]+", "+CITIES[Math.floor(Math.random()*CITIES.length)]; }
function genFakeUser() {
  const name = genFakeName();
  return {
    id: genUUID(),
    name,
    email: name.toLowerCase().replace(" ",".")+"@"+DOMAINS[Math.floor(Math.random()*DOMAINS.length)],
    phone: `555-${String(Math.floor(Math.random()*9000)+1000).slice(0,4)}`,
    address: genFakeAddress(),
    company: LAST_NAMES[Math.floor(Math.random()*LAST_NAMES.length)]+" Inc",
    username: name.toLowerCase().replace(" ","_")+Math.floor(Math.random()*99)
  };
}

function genRandomGradient() {
  const r=()=>Math.floor(Math.random()*360);
  const h1=r(),h2=(h1+120+Math.floor(Math.random()*60))%360;
  return `background: linear-gradient(135deg, hsl(${h1},70%,60%) 0%, hsl(${h2},70%,50%) 100%);`;
}

function genJsonSchema(json) {
  const obj = JSON.parse(json);
  function inferType(val) {
    if (val === null) return {type:"null"};
    if (Array.isArray(val)) return {type:"array",items:val.length?inferType(val[0]):{}};
    if (typeof val==="object") return {type:"object",properties:Object.fromEntries(Object.entries(val).map(([k,v])=>[k,inferType(v)]))};
    return {type:typeof val};
  }
  return JSON.stringify({$schema:"http://json-schema.org/draft-07/schema#",...inferType(obj)},null,2);
}

function genFetchCode(url, style) {
  if (style==="fetch") return `async function fetchData() {\n  const res = await fetch("${url}");\n  const data = await res.json();\n  return data;\n}`;
  if (style==="axios") return `async function fetchData() {\n  const { data } = await axios.get("${url}");\n  return data;\n}`;
  return `async function fetchData() {\n  try {\n    const res = await fetch("${url}");\n    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);\n    const data = await res.json();\n    return data;\n  } catch (err) {\n    console.error("Fetch error:", err);\n    throw err;\n  }\n}`;
}

function genHtmlTable(rows, cols, styled=false) {
  const style = styled ? ' style="border-collapse:collapse;width:100%"' : "";
  const tdStyle = styled ? ' style="border:1px solid #ddd;padding:8px"' : "";
  let html = `<table${style}>\n  <thead>\n    <tr>\n`;
  for (let c=1;c<=cols;c++) html+=`      <th${tdStyle}>Header ${c}</th>\n`;
  html+=`    </tr>\n  </thead>\n  <tbody>\n`;
  for (let r=1;r<=rows;r++){
    html+=`    <tr>\n`;
    for (let c=1;c<=cols;c++) html+=`      <td${tdStyle}>Row ${r}, Col ${c}</td>\n`;
    html+=`    </tr>\n`;
  }
  html+=`  </tbody>\n</table>`;
  return html;
}

function genContactForm() {
  return `<form class="contact-form">\n  <div class="form-group">\n    <label for="name">Name</label>\n    <input type="text" id="name" name="name" placeholder="Your name" required>\n  </div>\n  <div class="form-group">\n    <label for="email">Email</label>\n    <input type="email" id="email" name="email" placeholder="your@email.com" required>\n  </div>\n  <div class="form-group">\n    <label for="message">Message</label>\n    <textarea id="message" name="message" rows="5" placeholder="Your message..." required></textarea>\n  </div>\n  <button type="submit">Send Message</button>\n</form>`;
}
function genLoginForm() {
  return `<form class="login-form">\n  <h2>Login</h2>\n  <div class="form-group">\n    <label for="email">Email</label>\n    <input type="email" id="email" name="email" placeholder="your@email.com" required>\n  </div>\n  <div class="form-group">\n    <label for="password">Password</label>\n    <input type="password" id="password" name="password" placeholder="••••••••" required>\n  </div>\n  <button type="submit">Log In</button>\n  <p>Don't have an account? <a href="#">Sign up</a></p>\n</form>`;
}
function genSignupForm() {
  return `<form class="signup-form">\n  <h2>Create Account</h2>\n  <div class="form-group">\n    <label for="name">Full Name</label>\n    <input type="text" id="name" name="name" placeholder="John Doe" required>\n  </div>\n  <div class="form-group">\n    <label for="email">Email</label>\n    <input type="email" id="email" name="email" placeholder="your@email.com" required>\n  </div>\n  <div class="form-group">\n    <label for="password">Password</label>\n    <input type="password" id="password" name="password" minlength="8" placeholder="Min. 8 characters" required>\n  </div>\n  <div class="form-group">\n    <label for="confirm">Confirm Password</label>\n    <input type="password" id="confirm" name="confirm" placeholder="Repeat password" required>\n  </div>\n  <button type="submit">Create Account</button>\n  <p>Already have an account? <a href="#">Log in</a></p>\n</form>`;
}

function genBasicReadme() {
  return `# Project Name\n\n> Short description of your project.\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`bash\nnpm start\n\`\`\`\n\n## License\n\nMIT`;
}
function genFullReadme() {
  return `# Project Name\n\n[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)\n\n> A brief, compelling description of what this project does and who it's for.\n\n## ✨ Features\n\n- Feature 1\n- Feature 2\n- Feature 3\n\n## 🚀 Installation\n\n\`\`\`bash\ngit clone https://github.com/username/project.git\ncd project\nnpm install\n\`\`\`\n\n## 📖 Usage\n\n\`\`\`bash\nnpm start\n\`\`\`\n\n\`\`\`javascript\n// Example code\nimport { thing } from 'project';\nthing.doSomething();\n\`\`\`\n\n## ⚙ Configuration\n\nCopy \`.env.example\` to \`.env\` and fill in your values:\n\n\`\`\`env\nAPI_KEY=your_api_key\nDB_URL=your_database_url\n\`\`\`\n\n## 🤝 Contributing\n\n1. Fork the project\n2. Create your feature branch (\`git checkout -b feature/AmazingFeature\`)\n3. Commit your changes (\`git commit -m 'Add AmazingFeature'\`)\n4. Push to the branch (\`git push origin feature/AmazingFeature\`)\n5. Open a Pull Request\n\n## 📄 License\n\nDistributed under the MIT License. See \`LICENSE\` for more information.\n\n## 📬 Contact\n\nYour Name - your@email.com\n\nProject Link: [https://github.com/username/project](https://github.com/username/project)`;
}

/* ══════════════════════
   RUNNER — same pattern as formatters
══════════════════════ */
function runGeneratorTool(id) {
  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  if (!ed) { showToast("No active editor", "error"); return; }
  const { text, sel } = getSelectedTextOrAll(ed);

  const actions = GENERATOR_ACTIONS[id];
  if (!actions) { showToast("Generator not implemented", "error"); return; }

  if (actions.length === 1) {
    try {
      const result = actions[0].fn(text);
      replaceEditorText(ed, sel, String(result));
      showToast(actions[0].label + " inserted ✓", "success");
    } catch(e) { showToast("Error: "+e.message, "error"); }
    return;
  }

  // show choice menu
  document.getElementById("extDetailOverlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "extDetailOverlay";
  overlay.innerHTML = `
    <div class="ext-detail-overlay" onclick="document.getElementById('extDetailOverlay').remove()"></div>
    <div class="ext-detail-modal" style="width:300px;">
      <div class="ext-detail-header">
        <div class="ext-detail-icon">${EXT_GENERATORS[id]?.icon||"⚡"}</div>
        <div class="ext-detail-title">${EXT_GENERATORS[id]?.name||id}</div>
        <button class="ext-detail-close" onclick="document.getElementById('extDetailOverlay').remove()">✕</button>
      </div>
      <div class="ext-detail-body" style="display:flex;flex-direction:column;gap:8px;">
        ${actions.map((a,i)=>`<button class="ext-btn ext-btn-primary" style="width:100%;" onclick="runGeneratorAction('${id}',${i})">${a.label}</button>`).join("")}
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function runGeneratorAction(id, idx) {
  const ed = (typeof getActiveEditor === "function") ? getActiveEditor() : window.editor1;
  const { text, sel } = getSelectedTextOrAll(ed);
  const action = GENERATOR_ACTIONS[id][idx];
  document.getElementById("extDetailOverlay")?.remove();
  try {
    const result = action.fn(text);
    replaceEditorText(ed, sel, String(result));
    showToast(action.label + " inserted ✓", "success");
  } catch(e) { showToast("Error: "+e.message, "error"); }
}