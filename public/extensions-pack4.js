/* =========================================
   EXTENSION PACK 4 — MORE THEMES (20)
========================================= */

/* Merge into EXT_THEMES if it exists */
(function() {
  const NEW_THEMES = {
    "theme-tokyo-night": {
      name: "Tokyo Night",
      icon: "🌃",
      desc: "A clean dark theme inspired by Tokyo city at night.",
      publisher: "enkia",
      monacoName: "tokyo-night",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#1a1b2e","editor.foreground":"#a9b1d6","editorLineNumber.foreground":"#3b3f5c","editor.selectionBackground":"#283457","editorCursor.foreground":"#c0caf5" },
        tokenRules: [ {token:"comment",foreground:"3b3f5c",fontStyle:"italic"},{token:"keyword",foreground:"bb9af7"},{token:"string",foreground:"9ece6a"},{token:"number",foreground:"ff9e64"},{token:"type",foreground:"2ac3de"},{token:"function",foreground:"7aa2f7"} ]
      }
    },
    "theme-catppuccin": {
      name: "Catppuccin Mocha",
      icon: "🐱",
      desc: "Soothing pastel theme — the cozy corner of code editors.",
      publisher: "Catppuccin",
      monacoName: "catppuccin-mocha",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#1e1e2e","editor.foreground":"#cdd6f4","editorLineNumber.foreground":"#45475a","editor.selectionBackground":"#313244","editorCursor.foreground":"#f5e0dc" },
        tokenRules: [ {token:"comment",foreground:"585b70",fontStyle:"italic"},{token:"keyword",foreground:"cba6f7"},{token:"string",foreground:"a6e3a1"},{token:"number",foreground:"fab387"},{token:"type",foreground:"89dceb"},{token:"function",foreground:"89b4fa"} ]
      }
    },
    "theme-ayu-dark": {
      name: "Ayu Dark",
      icon: "🌑",
      desc: "Simple and bright with vivid colors on a dark background.",
      publisher: "teabyii",
      monacoName: "ayu-dark",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#0d1017","editor.foreground":"#bfbdb6","editorLineNumber.foreground":"#2d3640","editor.selectionBackground":"#253340","editorCursor.foreground":"#e6b450" },
        tokenRules: [ {token:"comment",foreground:"3d4751",fontStyle:"italic"},{token:"keyword",foreground:"ff8f40"},{token:"string",foreground:"aad94c"},{token:"number",foreground:"d2a6ff"},{token:"type",foreground:"39bae6"},{token:"function",foreground:"ffb454"} ]
      }
    },
    "theme-cobalt2": {
      name: "Cobalt2",
      icon: "💙",
      desc: "Wes Bos's iconic blue-heavy theme. Vivid and energetic.",
      publisher: "wesbos",
      monacoName: "cobalt2",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#193549","editor.foreground":"#ffffff","editorLineNumber.foreground":"#0d3a58","editor.selectionBackground":"#0050a4","editorCursor.foreground":"#f8d000" },
        tokenRules: [ {token:"comment",foreground:"0088ff",fontStyle:"italic"},{token:"keyword",foreground:"ff9d00"},{token:"string",foreground:"3ad900"},{token:"number",foreground:"ff628c"},{token:"type",foreground:"80ffbb"},{token:"function",foreground:"ffc600"} ]
      }
    },
    "theme-night-owl": {
      name: "Night Owl",
      icon: "🦉",
      desc: "Sarah Drasner's fine-tuned theme for night-time coding.",
      publisher: "sdras",
      monacoName: "night-owl",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#011627","editor.foreground":"#d6deeb","editorLineNumber.foreground":"#1d3b53","editor.selectionBackground":"#1d3b53","editorCursor.foreground":"#80a4c2" },
        tokenRules: [ {token:"comment",foreground:"637777",fontStyle:"italic"},{token:"keyword",foreground:"c792ea"},{token:"string",foreground:"addb67"},{token:"number",foreground:"f78c6c"},{token:"type",foreground:"ffcb8b"},{token:"function",foreground:"82aaff"} ]
      }
    },
    "theme-palenight": {
      name: "Material Palenight",
      icon: "🌙",
      desc: "Material Design-inspired palenight with soft contrasts.",
      publisher: "Equinusocio",
      monacoName: "palenight",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#292d3e","editor.foreground":"#a6accd","editorLineNumber.foreground":"#3a3f58","editor.selectionBackground":"#3c435e","editorCursor.foreground":"#ffcb6b" },
        tokenRules: [ {token:"comment",foreground:"676e95",fontStyle:"italic"},{token:"keyword",foreground:"c792ea"},{token:"string",foreground:"c3e88d"},{token:"number",foreground:"f78c6c"},{token:"type",foreground:"ffcb6b"},{token:"function",foreground:"82aaff"} ]
      }
    },
    "theme-synthwave84": {
      name: "Synthwave '84",
      icon: "🌆",
      desc: "Neon-lit retro synthwave aesthetic from the '80s.",
      publisher: "RobbOwen",
      monacoName: "synthwave84",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#262335","editor.foreground":"#ffffff","editorLineNumber.foreground":"#495495","editor.selectionBackground":"#3a3361","editorCursor.foreground":"#f92aad" },
        tokenRules: [ {token:"comment",foreground:"848bbd",fontStyle:"italic"},{token:"keyword",foreground:"fede5d"},{token:"string",foreground:"ff8b39"},{token:"number",foreground:"f97e72"},{token:"type",foreground:"36f9f6"},{token:"function",foreground:"e2a0ff"} ]
      }
    },
    "theme-gruvbox": {
      name: "Gruvbox Dark",
      icon: "🟤",
      desc: "Retro groove color scheme — warm tones, muted palette.",
      publisher: "jdinhlife",
      monacoName: "gruvbox-dark",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#282828","editor.foreground":"#ebdbb2","editorLineNumber.foreground":"#665c54","editor.selectionBackground":"#504945","editorCursor.foreground":"#ebdbb2" },
        tokenRules: [ {token:"comment",foreground:"928374",fontStyle:"italic"},{token:"keyword",foreground:"fb4934"},{token:"string",foreground:"b8bb26"},{token:"number",foreground:"d3869b"},{token:"type",foreground:"fabd2f"},{token:"function",foreground:"8ec07c"} ]
      }
    },
    "theme-everforest": {
      name: "Everforest Dark",
      icon: "🌲",
      desc: "Green-based nature-inspired theme — soft on the eyes.",
      publisher: "sainnhe",
      monacoName: "everforest",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#272e33","editor.foreground":"#d3c6aa","editorLineNumber.foreground":"#4a555b","editor.selectionBackground":"#374247","editorCursor.foreground":"#d3c6aa" },
        tokenRules: [ {token:"comment",foreground:"5c6a72",fontStyle:"italic"},{token:"keyword",foreground:"e67e80"},{token:"string",foreground:"a7c080"},{token:"number",foreground:"d699b6"},{token:"type",foreground:"dbbc7f"},{token:"function",foreground:"7fbbb3"} ]
      }
    },
    "theme-ayu-light": {
      name: "Ayu Light",
      icon: "☀",
      desc: "Clean bright theme with carefully chosen contrast.",
      publisher: "teabyii",
      monacoName: "ayu-light",
      rules: {
        base: "vs",
        colors: { "editor.background":"#fafafa","editor.foreground":"#575f66","editorLineNumber.foreground":"#8a9199","editor.selectionBackground":"#d1e4f4","editorCursor.foreground":"#ff9940" },
        tokenRules: [ {token:"comment",foreground:"abb0b6",fontStyle:"italic"},{token:"keyword",foreground:"fa8d3e"},{token:"string",foreground:"86b300"},{token:"number",foreground:"a37acc"},{token:"type",foreground:"399ee6"},{token:"function",foreground:"f2ae49"} ]
      }
    },
    "theme-solarized-light": {
      name: "Solarized Light",
      icon: "🌤",
      desc: "The light counterpart of Solarized — warm and calm.",
      publisher: "Ethan Schoonover",
      monacoName: "solarized-light",
      rules: {
        base: "vs",
        colors: { "editor.background":"#fdf6e3","editor.foreground":"#657b83","editorLineNumber.foreground":"#93a1a1","editor.selectionBackground":"#eee8d5","editorCursor.foreground":"#657b83" },
        tokenRules: [ {token:"comment",foreground:"93a1a1",fontStyle:"italic"},{token:"keyword",foreground:"859900"},{token:"string",foreground:"2aa198"},{token:"number",foreground:"d33682"},{token:"type",foreground:"b58900"},{token:"function",foreground:"268bd2"} ]
      }
    },
    "theme-rose-pine": {
      name: "Rosé Pine",
      icon: "🌹",
      desc: "All natural pine, faux fur and a bit of soho vibes.",
      publisher: "Rosé Pine",
      monacoName: "rose-pine",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#191724","editor.foreground":"#e0def4","editorLineNumber.foreground":"#393552","editor.selectionBackground":"#2a2837","editorCursor.foreground":"#e0def4" },
        tokenRules: [ {token:"comment",foreground:"524f67",fontStyle:"italic"},{token:"keyword",foreground:"31748f"},{token:"string",foreground:"f6c177"},{token:"number",foreground:"eb6f92"},{token:"type",foreground:"9ccfd8"},{token:"function",foreground:"c4a7e7"} ]
      }
    },
    "theme-kanagawa": {
      name: "Kanagawa",
      icon: "🌊",
      desc: "Dark colorscheme inspired by Katsushika Hokusai's The Great Wave.",
      publisher: "rebelot",
      monacoName: "kanagawa",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#1f1f28","editor.foreground":"#dcd7ba","editorLineNumber.foreground":"#363646","editor.selectionBackground":"#2d4f67","editorCursor.foreground":"#c8c093" },
        tokenRules: [ {token:"comment",foreground:"717c7c",fontStyle:"italic"},{token:"keyword",foreground:"957fb8"},{token:"string",foreground:"98bb6c"},{token:"number",foreground:"ff5d62"},{token:"type",foreground:"7e9cd8"},{token:"function",foreground:"7aa89f"} ]
      }
    },
    "theme-panda": {
      name: "Panda",
      icon: "🐼",
      desc: "Superminimal dark theme — dark teal with vibrant pops.",
      publisher: "thedaviddias",
      monacoName: "panda",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#292a2b","editor.foreground":"#e6e6e6","editorLineNumber.foreground":"#3e4040","editor.selectionBackground":"#434546","editorCursor.foreground":"#ff2c6d" },
        tokenRules: [ {token:"comment",foreground:"676b79",fontStyle:"italic"},{token:"keyword",foreground:"ff75b5"},{token:"string",foreground:"19f9d8"},{token:"number",foreground:"ffb86c"},{token:"type",foreground:"45a9f9"},{token:"function",foreground:"b084eb"} ]
      }
    },
    "theme-material-ocean": {
      name: "Material Ocean",
      icon: "🌊",
      desc: "Material Design ocean blue dark theme.",
      publisher: "Equinusocio",
      monacoName: "material-ocean",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#0f111a","editor.foreground":"#8f93a2","editorLineNumber.foreground":"#3b3f5c","editor.selectionBackground":"#1f2233","editorCursor.foreground":"#ffcb6b" },
        tokenRules: [ {token:"comment",foreground:"464b5d",fontStyle:"italic"},{token:"keyword",foreground:"c792ea"},{token:"string",foreground:"c3e88d"},{token:"number",foreground:"f78c6c"},{token:"type",foreground:"ffcb6b"},{token:"function",foreground:"82aaff"} ]
      }
    },
    "theme-dracula-soft": {
      name: "Dracula Soft",
      icon: "🦇",
      desc: "A softer variant of Dracula with less contrast.",
      publisher: "Dracula Theme",
      monacoName: "dracula-soft",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#22212c","editor.foreground":"#f8f8f2","editorLineNumber.foreground":"#4d4563","editor.selectionBackground":"#454158","editorCursor.foreground":"#f8f8f0" },
        tokenRules: [ {token:"comment",foreground:"7970a9",fontStyle:"italic"},{token:"keyword",foreground:"ff79c6"},{token:"string",foreground:"f1fa8c"},{token:"number",foreground:"bd93f9"},{token:"type",foreground:"8be9fd"},{token:"function",foreground:"50fa7b"} ]
      }
    },
    "theme-horizon": {
      name: "Horizon Dark",
      icon: "🌄",
      desc: "Beautifully warm dark theme with vibrant highlights.",
      publisher: "jolaleye",
      monacoName: "horizon-dark",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#1c1e26","editor.foreground":"#d5d8da","editorLineNumber.foreground":"#3d4455","editor.selectionBackground":"#2e303e","editorCursor.foreground":"#e95678" },
        tokenRules: [ {token:"comment",foreground:"6c6f93",fontStyle:"italic"},{token:"keyword",foreground:"e95678"},{token:"string",foreground:"fab795"},{token:"number",foreground:"f09383"},{token:"type",foreground:"25b0bc"},{token:"function",foreground:"26bbd9"} ]
      }
    },
    "theme-moonlight": {
      name: "Moonlight",
      icon: "🌙",
      desc: "Cool dark theme based on moonlight blues.",
      publisher: "atomiks",
      monacoName: "moonlight",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#212337","editor.foreground":"#c8d3f5","editorLineNumber.foreground":"#3b4261","editor.selectionBackground":"#2d3f76","editorCursor.foreground":"#c8d3f5" },
        tokenRules: [ {token:"comment",foreground:"7a88cf",fontStyle:"italic"},{token:"keyword",foreground:"ff757f"},{token:"string",foreground:"c3e88d"},{token:"number",foreground:"ff966c"},{token:"type",foreground:"4fd6be"},{token:"function",foreground:"82aaff"} ]
      }
    },
    "theme-cyberpunk": {
      name: "Cyberpunk 2077",
      icon: "🤖",
      desc: "Neon yellow on dark — inspired by Cyberpunk 2077.",
      publisher: "max-SS",
      monacoName: "cyberpunk2077",
      rules: {
        base: "vs-dark",
        colors: { "editor.background":"#000d1f","editor.foreground":"#fcee0a","editorLineNumber.foreground":"#1a3a5c","editor.selectionBackground":"#0a2040","editorCursor.foreground":"#fcee0a" },
        tokenRules: [ {token:"comment",foreground:"2a5a8a",fontStyle:"italic"},{token:"keyword",foreground:"ff2a6d"},{token:"string",foreground:"05d9e8"},{token:"number",foreground:"d1f7ff"},{token:"type",foreground:"ff9900"},{token:"function",foreground:"fcee0a"} ]
      }
    },
    "theme-ice": {
      name: "Ice & Snow",
      icon: "❄",
      desc: "Crystal clear light theme — white and icy blues.",
      publisher: "vscodegodmode",
      monacoName: "ice-snow",
      rules: {
        base: "vs",
        colors: { "editor.background":"#f0f8ff","editor.foreground":"#2c3e50","editorLineNumber.foreground":"#bdc3c7","editor.selectionBackground":"#d6eaf8","editorCursor.foreground":"#2980b9" },
        tokenRules: [ {token:"comment",foreground:"95a5a6",fontStyle:"italic"},{token:"keyword",foreground:"2980b9"},{token:"string",foreground:"27ae60"},{token:"number",foreground:"8e44ad"},{token:"type",foreground:"e67e22"},{token:"function",foreground:"2471a3"} ]
      }
    }
  };

  /* merge into existing EXT_THEMES */
  if (typeof EXT_THEMES !== "undefined") {
    Object.assign(EXT_THEMES, NEW_THEMES);
  }

  /* also re-apply saved theme if it's one of the new ones */
  window.addEventListener("load", () => {
    setTimeout(() => {
      const active = localStorage.getItem("vscode_active_ext_theme");
      if (active && NEW_THEMES[active] && typeof applyExtensionTheme === "function") {
        applyExtensionTheme(active);
      }
    }, 1800);
  });
})();