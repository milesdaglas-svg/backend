require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: "100mb" }));
app.use(express.static(path.join(__dirname, "public")));
/* ══════════════════════
   GITHUB OAUTH
══════════════════════ */
app.get("/auth/github", (req, res) => {
  const isApp = req.query.platform === "app";
  const params = new URLSearchParams({
    client_id: process.env.GITHUB_CLIENT_ID,
    redirect_uri: "https://backend-forz.onrender.com/auth/github/callback",
    scope: "repo user workflow read:org codespace",
    state: (isApp ? "app_" : "web_") + Math.random().toString(36).slice(2)
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
});

app.get("/auth/github/callback", async (req, res) => {
  const { code } = req.query;
  if (!code) return res.redirect("/?auth=error");
  try {
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: "https://backend-forz.onrender.com/auth/github/callback"
      })
    });
    const tokenData = await tokenRes.json();
    if (tokenData.error) return res.redirect("/?auth=error&msg=" + tokenData.error_description);
    const token = tokenData.access_token;
    // get user info
    const userRes = await fetch("https://api.github.com/user", {
      headers: { "Authorization": `token ${token}`, "User-Agent": "VSCodeGodMode" }
    });
    const user = await userRes.json();
    // redirect back to app with token and user info
    const params = new URLSearchParams({
      auth: "success",
      token,
      login: user.login,
      name: user.name || user.login,
      avatar: user.avatar_url,
      repos: user.public_repos || 0
    });
    const isApp = (req.query.state || "").startsWith("app_");
    if (isApp) {
      res.redirect(`com.vscodegodmode.app://auth?${params}`);
    } else {
      res.redirect(`/?${params}`);
    }
  } catch(e) {
    res.redirect("/?auth=error&msg=" + encodeURIComponent(e.message));
  }
});

app.get("/auth/github/logout", (req, res) => {
  res.redirect("/?auth=logout");
});
app.get("/api/myip", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress || "unknown";
  res.json({ ip });
});
/* =========================
   SYSTEM PROMPT
========================= */

const systemPrompt = `
You are a CODE AI inside a VS Code clone.

Return ONLY valid JSON with NO markdown, NO backticks, NO explanation outside the JSON:

{
  "reply": "short message to user",
  "changes": [
    {
      "file": "index.html",
      "code": "FULL FILE CODE HERE"
    }
  ]
}

RULES:
- Return ONLY the JSON object, nothing else
- No markdown code blocks
- No backticks
- Always return full file contents, never partial
- If no file changes needed, return empty changes array []
- Always valid JSON
`;

/* =========================
   HELPERS
========================= */

function extractText(provider, data) {
  if (provider === "gemini") {
    if (data?.error) return { error: data.error.message || "Gemini API error" };
    if (data?.promptFeedback?.blockReason)
      return { error: `Blocked: ${data.promptFeedback.blockReason}` };

    return {
      text:
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || ""
    };
  }

  if (provider === "huggingface") {
    if (data?.error) return { error: data.error };
    if (Array.isArray(data)) return { text: data[0]?.generated_text || "" };
    return { text: data?.generated_text || JSON.stringify(data) };
  }

  if (data?.error) return { error: data.error.message || JSON.stringify(data.error) };

  return {
    text: data?.choices?.[0]?.message?.content || ""
  };
}

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {}

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {}
  }

  return { reply: text || "AI returned unreadable response", changes: [] };
}

/* =========================
   AI ROUTE
========================= */

app.post("/ai", async (req, res) => {
  try {
    const { provider, model, prompt, currentFile, currentCode, files, aiUser } = req.body;

    if (!provider || !model || !prompt) {
      return res.json({ reply: "Missing provider, model or prompt", changes: [] });
    }

    // verify user is logged in via Firebase before giving free AI access
    if (!aiUser || !aiUser.username) {
      return res.json({ reply: "⚠ Please log in to the AI chat to use the AI assistant.", changes: [] });
    }

    const userMessage = `
USER REQUEST: ${prompt}

CURRENT FILE: ${currentFile}

CURRENT CODE:
${currentCode}

ALL FILES:
${JSON.stringify(files).slice(0, 12000)}
`;

    let endpoint = "";
    let headers = {};
    let body = {};

    /* --- GEMINI --- */
    if (provider === "gemini") {
      const apiVersion = "v1beta";

      endpoint = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;

      headers = { "Content-Type": "application/json" };

      body = {
        contents: [
          {
            parts: [{ text: systemPrompt + "\n\n" + userMessage }]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      };
    }

    /* --- GROQ --- */
    else if (provider === "groq") {
      endpoint = "https://api.groq.com/openai/v1/chat/completions";

      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`
      };

      body = {
        model,
        temperature: 0.7,
        max_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      };
    }

    /* --- DEEPSEEK --- */
    else if (provider === "deepseek") {
      endpoint = "https://api.deepseek.com/v1/chat/completions";

      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`
      };

      body = {
        model,
        temperature: 0.7,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      };
    }

    /* --- HUGGINGFACE --- */
    else if (provider === "huggingface") {
      endpoint = `https://api-inference.huggingface.co/models/${model}`;

      headers = {
        Authorization: `Bearer ${process.env.HF_API_KEY}`,
        "Content-Type": "application/json"
      };

      body = {
        inputs: systemPrompt + "\n\n" + userMessage,
        parameters: {
          max_new_tokens: 1000,
          temperature: 0.7,
          return_full_text: false
        }
      };
    }

    /* --- OPENROUTER (DEFAULT) --- */
    else {
      endpoint = "https://openrouter.ai/api/v1/chat/completions";

      headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://your-app.onrender.com",
        "X-Title": "VS CODE ULTRA PRO MAX"
      };

      body = {
        model,
        temperature: 0.7,
        max_tokens: 8192,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage }
        ]
      };
    }

    /* --- FETCH --- */
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body)
    });

    console.log(`[${provider}] HTTP ${response.status}`);

    if (!response.ok) {
      const errText = await response.text();
      return res.json({
        reply: `${provider} API error ${response.status}: ${errText.slice(0, 200)}`,
        changes: []
      });
    }

    const data = await response.json();
    const result = extractText(provider, data);

    if (result.error) {
      return res.json({ reply: `${provider} error: ${result.error}`, changes: [] });
    }

    let text = (result.text || "").replace(/```json/gi, "").replace(/```/g, "").trim();

    if (!text) {
      return res.json({ reply: "AI returned empty response", changes: [] });
    }

    const parsed = safeParseJSON(text);

    res.json({
      reply: parsed.reply || "Done",
      changes: Array.isArray(parsed.changes) ? parsed.changes : []
    });

  } catch (err) {
    res.json({ reply: `Server error: ${err.message}`, changes: [] });
  }
});

/* =========================
   START (FIXED FOR RENDER)
========================= */

const https = require("https");

/* =========================================
   GITHUB API ROUTES
   Add these to your ROOT app.js (server)
   AFTER your existing routes but BEFORE
   app.listen()
========================================= */

/* ── Helper: call GitHub API ── */
function githubAPI(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "api.github.com",
      path: path,
      method: method,
      headers: {
        "Authorization": `token ${token}`,
        "User-Agent": "VSCodeGodMode/1.0",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
        ...(data ? { "Content-Length": Buffer.byteLength(data) } : {})
      }
    };
    const req = https.request(options, res => {
      let raw = "";
      res.on("data", chunk => raw += chunk);
      res.on("end", () => {
        try {
          const parsed = raw ? JSON.parse(raw) : {};
          if (res.statusCode >= 400) reject(new Error(parsed.message || `GitHub API error ${res.statusCode}`));
          else resolve(parsed);
        } catch(e) { resolve(raw); }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

/* ── GET /api/github/user ──
   Verify token + get user info */
app.get("/api/github/user", async (req, res) => {
  const token = req.headers["x-github-token"];
  if (!token) return res.status(401).json({ error: "No token provided" });
  try {
    const user = await githubAPI("GET", "/user", token);
    res.json({ login: user.login, name: user.name, avatar_url: user.avatar_url, public_repos: user.public_repos });
  } catch(e) { res.status(401).json({ error: e.message || "Invalid token" }); }
});

/* ── GET /api/github/repos ──
   List user's repos */
app.get("/api/github/repos", async (req, res) => {
  const token = req.headers["x-github-token"];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const repos = await githubAPI("GET", "/user/repos?sort=updated&per_page=50&type=all", token);
    res.json(repos.map(r => ({
      id: r.id, name: r.name, full_name: r.full_name,
      private: r.private, description: r.description,
      default_branch: r.default_branch, updated_at: r.updated_at,
      html_url: r.html_url
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── POST /api/github/create-repo ──
   Create a new repo */
app.post("/api/github/create-repo", async (req, res) => {
  const token = req.headers["x-github-token"];
  if (!token) return res.status(401).json({ error: "No token" });
  const { name, description, isPrivate } = req.body;
  if (!name) return res.status(400).json({ error: "Repo name required" });
  try {
    const repo = await githubAPI("POST", "/user/repos", token, {
      name, description: description || "",
      private: isPrivate || false,
      auto_init: false
    });
    res.json({ full_name: repo.full_name, html_url: repo.html_url, default_branch: repo.default_branch });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET /api/github/branches ──
   List branches for a repo */
app.get("/api/github/branches", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo } = req.query;
  if (!token || !owner || !repo) return res.status(400).json({ error: "Missing params" });
  try {
    const branches = await githubAPI("GET", `/repos/${owner}/${repo}/branches`, token);
    res.json(branches.map(b => ({ name: b.name, sha: b.commit.sha })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── POST /api/github/create-branch ──
   Create a new branch */
app.post("/api/github/create-branch", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, branch, fromSha } = req.body;
  if (!token || !owner || !repo || !branch || !fromSha) return res.status(400).json({ error: "Missing params" });
  try {
    await githubAPI("POST", `/repos/${owner}/${repo}/git/refs`, token, {
      ref: `refs/heads/${branch}`,
      sha: fromSha
    });
    res.json({ success: true, branch });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET /api/github/commits ──
   Get commit history */
app.get("/api/github/commits", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, branch } = req.query;
  if (!token || !owner || !repo) return res.status(400).json({ error: "Missing params" });
  try {
    const commits = await githubAPI("GET", `/repos/${owner}/${repo}/commits?sha=${branch||"main"}&per_page=20`, token);
    res.json(commits.map(c => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
      html_url: c.html_url
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET /api/github/contents ──
   Get files from a repo (pull) */
app.get("/api/github/contents", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, branch, path: filePath } = req.query;
  if (!token || !owner || !repo) return res.status(400).json({ error: "Missing params" });
  try {
    const p = filePath ? `/repos/${owner}/${repo}/contents/${filePath}` : `/repos/${owner}/${repo}/contents`;
    const result = await githubAPI("GET", `${p}?ref=${branch||"main"}`, token);
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── POST /api/github/push ──
   Push ONE file to GitHub */
app.post("/api/github/push", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, branch, path: filePath, content, message, sha } = req.body;
  if (!token || !owner || !repo || !filePath || content === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    // base64 encode content
    const encoded = Buffer.from(content, "utf8").toString("base64");
    const body = {
      message: message || `Update ${filePath}`,
      content: encoded,
      branch: branch || "main"
    };
    if (sha) body.sha = sha; // needed for updates (not new files)

    const result = await githubAPI("PUT", `/repos/${owner}/${repo}/contents/${filePath}`, token, body);
    res.json({ success: true, commit: result.commit?.sha, content_sha: result.content?.sha });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── POST /api/github/push-all ──
   Push ALL project files to GitHub at once */
app.post("/api/github/push-all", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, branch, files, message } = req.body;
  if (!token || !owner || !repo || !files) return res.status(400).json({ error: "Missing params" });

  const results = { success: [], failed: [] };
  const targetBranch = branch || "main";

  // get existing file SHAs first (to update existing files)
  let existingShas = {};
  try {
    const tree = await githubAPI("GET", `/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`, token);
    if (tree.tree) {
      tree.tree.forEach(item => { if (item.type === "blob") existingShas[item.path] = item.sha; });
    }
  } catch {}

  // push each file
  for (const [filePath, content] of Object.entries(files)) {
    if (!filePath || filePath.endsWith("/.gitkeep")) continue;
    if (/\.(png|jpg|jpeg|gif|webp|ico|mp3|mp4|wav|webm)$/i.test(filePath)) {
      // skip binary/media files
      continue;
    }
    try {
      const encoded = Buffer.from(String(content || ""), "utf8").toString("base64");
      const body = {
        message: message || `Update ${filePath}`,
        content: encoded,
        branch: targetBranch
      };
      const existingSha = existingShas[filePath];
      if (existingSha) body.sha = existingSha;

      await githubAPI("PUT", `/repos/${owner}/${repo}/contents/${filePath}`, token, body);
      results.success.push(filePath);

      // small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    } catch(e) {
      results.failed.push({ file: filePath, error: e.message });
    }
  }

  res.json({ success: true, pushed: results.success.length, failed: results.failed.length, details: results });
});

/* ── POST /api/github/pull-all ──
   Pull all files from a GitHub repo */
app.post("/api/github/pull-all", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, branch } = req.body;
  if (!token || !owner || !repo) return res.status(400).json({ error: "Missing params" });

  try {
    const targetBranch = branch || "main";
    // get full tree
    const tree = await githubAPI("GET", `/repos/${owner}/${repo}/git/trees/${targetBranch}?recursive=1`, token);
    if (!tree.tree) return res.status(404).json({ error: "Branch not found or empty repo" });

    const files = {};
    const blobs = tree.tree.filter(item => item.type === "blob" && item.size < 500000); // skip files > 500kb

    // fetch each file content
    for (const item of blobs) {
      if (/\.(png|jpg|jpeg|gif|webp|ico|mp3|mp4|wav|webm)$/i.test(item.path)) continue;
      try {
        const fileData = await githubAPI("GET", `/repos/${owner}/${repo}/contents/${item.path}?ref=${targetBranch}`, token);
        if (fileData.content) {
          files[item.path] = Buffer.from(fileData.content.replace(/\n/g,""), "base64").toString("utf8");
        }
        await new Promise(r => setTimeout(r, 50));
      } catch {}
    }

    res.json({ success: true, files, count: Object.keys(files).length });
  } catch(e) { res.status(500).json({ error: e.message || e.toString() || "Unknown error" }); }
});

/* ── GET /api/github/prs ──
   List Pull Requests */
app.get("/api/github/prs", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, state } = req.query;
  if (!token || !owner || !repo) return res.status(400).json({ error: "Missing params" });
  try {
    const prs = await githubAPI("GET", `/repos/${owner}/${repo}/pulls?state=${state||"open"}&per_page=20`, token);
    res.json(prs.map(pr => ({
      number: pr.number, title: pr.title, state: pr.state,
      user: pr.user.login, created_at: pr.created_at,
      html_url: pr.html_url, body: pr.body,
      head: pr.head.ref, base: pr.base.ref
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── POST /api/github/create-pr ──
   Create a Pull Request */
app.post("/api/github/create-pr", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, title, body, head, base } = req.body;
  if (!token || !owner || !repo || !title || !head) return res.status(400).json({ error: "Missing params" });
  try {
    const pr = await githubAPI("POST", `/repos/${owner}/${repo}/pulls`, token, {
      title, body: body || "", head, base: base || "main"
    });
    res.json({ number: pr.number, html_url: pr.html_url, title: pr.title });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET /api/github/issues ──
   List Issues */
app.get("/api/github/issues", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, state } = req.query;
  if (!token || !owner || !repo) return res.status(400).json({ error: "Missing params" });
  try {
    const issues = await githubAPI("GET", `/repos/${owner}/${repo}/issues?state=${state||"open"}&per_page=20`, token);
    res.json(issues.filter(i => !i.pull_request).map(i => ({
      number: i.number, title: i.title, state: i.state,
      user: i.user.login, created_at: i.created_at,
      html_url: i.html_url, body: i.body, labels: i.labels.map(l=>l.name)
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── POST /api/github/create-issue ──
   Create an Issue */
app.post("/api/github/create-issue", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, title, body, labels } = req.body;
  if (!token || !owner || !repo || !title) return res.status(400).json({ error: "Missing params" });
  try {
    const issue = await githubAPI("POST", `/repos/${owner}/${repo}/issues`, token, {
      title, body: body || "", labels: labels || []
    });
    res.json({ number: issue.number, html_url: issue.html_url, title: issue.title });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET /api/github/actions ──
   List GitHub Actions workflow runs */
app.get("/api/github/actions", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo } = req.query;
  if (!token || !owner || !repo) return res.status(400).json({ error: "Missing params" });
  try {
    const runs = await githubAPI("GET", `/repos/${owner}/${repo}/actions/runs?per_page=10`, token);
    res.json((runs.workflow_runs||[]).map(r => ({
      id: r.id, name: r.name, status: r.status,
      conclusion: r.conclusion, created_at: r.created_at,
      html_url: r.html_url, head_branch: r.head_branch,
      head_commit: r.head_commit?.message
    })));
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET /api/github/diff ──
   Get diff of a file between two commits */
app.get("/api/github/diff", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, base, head } = req.query;
  if (!token || !owner || !repo) return res.status(400).json({ error: "Missing params" });
  try {
    const compare = await githubAPI("GET", `/repos/${owner}/${repo}/compare/${base||"main"}...${head||"HEAD"}`, token);
    res.json({
      files: (compare.files||[]).map(f => ({
        filename: f.filename, status: f.status,
        additions: f.additions, deletions: f.deletions,
        patch: f.patch
      })),
      commits: (compare.commits||[]).map(c=>({ sha:c.sha, message:c.commit.message }))
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ── GET /api/github/blame ──
   Get blame info (latest commit per file) */
app.get("/api/github/blame", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { owner, repo, path: filePath, branch } = req.query;
  if (!token || !owner || !repo || !filePath) return res.status(400).json({ error: "Missing params" });
  try {
    const commits = await githubAPI("GET", `/repos/${owner}/${repo}/commits?path=${filePath}&sha=${branch||"main"}&per_page=1`, token);
    res.json(commits[0] ? {
      sha: commits[0].sha,
      message: commits[0].commit.message,
      author: commits[0].commit.author.name,
      date: commits[0].commit.author.date
    } : null);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* =========================
   TERMINAL — REAL SHELL
========================= */
const { exec, spawn } = require("child_process");
const fs  = require("fs");
const os  = require("os");
const http = require("http");

const PROJECT_DIR = path.join(os.tmpdir(), "vscode_godmode_project");
if (!fs.existsSync(PROJECT_DIR)) fs.mkdirSync(PROJECT_DIR, { recursive: true });

const runningProcesses = {};

app.post("/api/terminal/sync", (req, res) => {
  const { files } = req.body;
  if (!files || typeof files !== "object") return res.status(400).json({ error: "No files provided" });
  try {
    Object.entries(files).forEach(([filePath, content]) => {
      if (filePath.endsWith("/.gitkeep")) return;
      const full = path.join(PROJECT_DIR, filePath);
      const dir  = path.dirname(full);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(full, content || "", "utf8");
    });
    res.json({ success: true, synced: Object.keys(files).length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/terminal/exec", (req, res) => {
  const { command, cwd } = req.body;
  if (!command) return res.status(400).json({ error: "No command" });
  const blocked = /^(rm\s+-rf\s+\/|mkfs|dd\s+if=)/.test(command.trim());
  if (blocked) return res.status(403).json({ error: "Command blocked for safety" });
  const workDir = cwd || PROJECT_DIR;
  if (!fs.existsSync(workDir)) fs.mkdirSync(workDir, { recursive: true });
  exec(command, {
    cwd: workDir, timeout: 60000, maxBuffer: 1024 * 1024,
    env: { ...process.env, PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", HOME: os.homedir(), TERM: "xterm" }
  }, (err, stdout, stderr) => {
    res.json({ stdout: stdout || "", stderr: stderr || "", exitCode: err?.code ?? 0, error: err && err.killed ? "Command timed out" : null });
  });
});

app.post("/api/terminal/start", (req, res) => {
  const { command, port, cwd } = req.body;
  if (!command || !port) return res.status(400).json({ error: "command and port required" });
  const workDir = cwd || PROJECT_DIR;
  const key = `proc_${port}`;
  if (runningProcesses[key]) { try { runningProcesses[key].kill(); } catch {} delete runningProcesses[key]; }
  const parts = command.split(" ");
  const proc  = spawn(parts[0], parts.slice(1), {
    cwd: workDir, shell: true,
    env: { ...process.env, PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin", HOME: os.homedir(), PORT: String(port) }
  });
  runningProcesses[key] = proc;
  const logs = [];
  proc.stdout.on("data", d => logs.push(d.toString()));
  proc.stderr.on("data", d => logs.push(d.toString()));
  proc.on("exit", code => { logs.push(`Process exited with code ${code}`); delete runningProcesses[key]; });
  setTimeout(() => {
    res.json({ success: true, pid: proc.pid, port, logs: logs.join(""), previewUrl: `https://backend-forz.onrender.com/preview/${port}/` });
  }, 3000);
});

app.get("/api/terminal/logs/:port", (req, res) => {
  const key = `proc_${req.params.port}`;
  const proc = runningProcesses[key];
  if (!proc) return res.json({ running: false, logs: "No process running on that port" });
  res.json({ running: true, pid: proc.pid });
});

app.post("/api/terminal/kill", (req, res) => {
  const { port } = req.body;
  const key = `proc_${port}`;
  if (runningProcesses[key]) {
    try { runningProcesses[key].kill(); } catch {}
    delete runningProcesses[key];
    res.json({ success: true, message: `Process on port ${port} killed` });
  } else {
    res.json({ success: false, message: "No process found" });
  }
});

app.use("/preview/:port", (req, res) => {
  const port = parseInt(req.params.port);
  if (isNaN(port) || port < 1024 || port > 65535) return res.status(400).send("Invalid port");
  const options = {
    hostname: "127.0.0.1", port,
    path: req.url.replace(`/preview/${port}`, "") || "/",
    method: req.method,
    headers: { ...req.headers, host: `localhost:${port}` }
  };
  const proxy = http.request(options, proxyRes => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });
  proxy.on("error", () => {
    res.status(502).send(`<html><body style="background:#0d1117;color:#ff5050;font-family:monospace;padding:40px;text-align:center;"><h2>⚠ Server not ready yet</h2><p>Your server on port ${port} isn't responding.</p><button onclick="location.reload()" style="margin-top:20px;padding:10px 24px;background:#1f6feb;color:white;border:none;border-radius:8px;cursor:pointer;">🔄 Retry</button></body></html>`);
  });
  if (req.body) proxy.write(JSON.stringify(req.body));
  proxy.end();
});

app.get("/api/terminal/listfiles", (req, res) => {
  // support custom cwd — so git cloned folders are read correctly
  const customCwd = req.query.cwd;
  const readDir = (customCwd && fs.existsSync(customCwd)) ? customCwd : PROJECT_DIR;

  function walk(dir, base = "") {
    const result = {};
    if (!fs.existsSync(dir)) return result;
    try {
      fs.readdirSync(dir).forEach(name => {
        if (name === "node_modules" || name === ".git" || name === ".gitignore") return;
        const full = path.join(dir, name);
        const rel  = base ? base + "/" + name : name;
        try {
          if (fs.statSync(full).isDirectory()) {
            Object.assign(result, walk(full, rel));
          } else {
            // skip binary files
            if (/\.(png|jpg|jpeg|gif|webp|ico|mp3|mp4|wav|webm|zip|tar|gz|bin|exe)$/i.test(name)) return;
            result[rel] = fs.readFileSync(full, "utf8");
          }
        } catch {}
      });
    } catch {}
    return result;
  }
  res.json({ files: walk(readDir), dir: readDir });
});

/* ══════════════════════
   USER VM — GITHUB CODESPACES
══════════════════════ */
const SANDBOX_REPO = "godmode-sandbox";

app.post("/api/vm/create", async (req, res) => {
  const token = req.headers["x-github-token"];
  if (!token) return res.status(401).json({ error: "No GitHub token" });
  try {
    const user = await githubAPI("GET", "/user", token);
    let repo;
    try {
      repo = await githubAPI("GET", `/repos/${user.login}/${SANDBOX_REPO}`, token);
    } catch {
      repo = await githubAPI("POST", "/user/repos", token, {
        name: SANDBOX_REPO, private: true, auto_init: true
      });
    }
    const codespace = await githubAPI("POST", "/user/codespaces", token, {
      repository_id: repo.id, machine: "basicLinux32gb"
    });
    res.json({ name: codespace.name, state: codespace.state, web_url: codespace.web_url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/vm/status/:name", async (req, res) => {
  const token = req.headers["x-github-token"];
  if (!token) return res.status(401).json({ error: "No token" });
  try {
    const cs = await githubAPI("GET", `/user/codespaces/${req.params.name}`, token);
    res.json({ state: cs.state, web_url: cs.web_url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
/* ══════════════════════
   EXPORT AS APK
══════════════════════ */
app.post("/api/export-app/build", async (req, res) => {
  const token = req.headers["x-github-token"];
  const { files } = req.body;
  if (!token || !files) return res.status(400).json({ error: "Missing token or files" });
  try {
    const user = await githubAPI("GET", "/user", token);
    try { await githubAPI("GET", `/repos/${user.login}/${SANDBOX_REPO}`, token); }
    catch { await githubAPI("POST", "/user/repos", token, { name: SANDBOX_REPO, private:true, auto_init:true }); }

    let existingShas = {};
    try {
      const tree = await githubAPI("GET", `/repos/${user.login}/${SANDBOX_REPO}/git/trees/main?recursive=1`, token);
      if (tree.tree) tree.tree.forEach(item=>{ if(item.type==="blob") existingShas[item.path]=item.sha; });
    } catch {}

    for (const [filePath, content] of Object.entries(files)) {
      if (!filePath || filePath.endsWith("/.gitkeep")) continue;
      if (/\.(png|jpg|jpeg|gif|webp|ico|mp3|mp4|wav|webm)$/i.test(filePath)) continue;
      const dest = `www/${filePath}`;
      const encoded = Buffer.from(String(content||""), "utf8").toString("base64");
      const body = { message:"Export app files", content: encoded, branch:"main" };
      if (existingShas[dest]) body.sha = existingShas[dest];
      await githubAPI("PUT", `/repos/${user.login}/${SANDBOX_REPO}/contents/${dest}`, token, body);
      await new Promise(r=>setTimeout(r,80));
    }

    const workflowYml = `name: Build APK
on:
  workflow_dispatch:
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '17' }
      - uses: android-actions/setup-android@v3
      - run: npm init -y
      - run: npm install @capacitor/core @capacitor/cli @capacitor/android
      - run: npx cap init godmode-app com.godmode.app --web-dir=www
      - run: npx cap add android
      - run: npx cap sync android
      - run: cd android && chmod +x gradlew && ./gradlew assembleDebug
      - uses: actions/upload-artifact@v4
        with:
          name: app-debug-apk
          path: android/app/build/outputs/apk/debug/app-debug.apk
`;
    const wfPath = ".github/workflows/build-apk.yml";
    const wfBody = { message:"Add APK build workflow", content: Buffer.from(workflowYml,"utf8").toString("base64"), branch:"main" };
    if (existingShas[wfPath]) wfBody.sha = existingShas[wfPath];
    await githubAPI("PUT", `/repos/${user.login}/${SANDBOX_REPO}/contents/${wfPath}`, token, wfBody);

    await githubAPI("POST", `/repos/${user.login}/${SANDBOX_REPO}/actions/workflows/build-apk.yml/dispatches`, token, { ref:"main" });
    res.json({ success:true, repo: `${user.login}/${SANDBOX_REPO}` });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get("/api/export-app/status", async (req, res) => {
  const token = req.headers["x-github-token"];
  if (!token) return res.status(401).json({ error:"No token" });
  try {
    const user = await githubAPI("GET", "/user", token);
    const runs = await githubAPI("GET", `/repos/${user.login}/${SANDBOX_REPO}/actions/runs?per_page=1`, token);
    const run = runs.workflow_runs?.[0];
    if (!run) return res.json({ status:"none" });
    res.json({ status: run.status, conclusion: run.conclusion, html_url: run.html_url });
  } catch(e) { res.status(500).json({ error: e.message }); }
});
/* ══════════════════════
   PUSH NOTIFICATIONS
══════════════════════ */
const webpush = require("web-push");
webpush.setVapidDetails("mailto:admin@vscodegodmode.app", process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);

app.post("/api/push/send", async (req, res) => {
  const { title, message } = req.body;
  if (!title || !message) return res.status(400).json({ error: "Missing title/message" });
  try {
    const projectId = req.body.projectId || "vsc-clone";
    const apiKey = req.body.apiKey;
    const listUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/push_subscriptions${apiKey ? "?key="+apiKey : ""}`;
    const listRes = await fetch(listUrl);
    const listData = await listRes.json();
    const docs = listData.documents || [];
    let sent = 0, failed = 0;
    for (const doc of docs) {
      try {
        const fields = doc.fields;
        const sub = JSON.parse(fields.subscription.stringValue);
        await webpush.sendNotification(sub, JSON.stringify({ title, body: message }));
        sent++;
      } catch(e) { failed++; }
    }
    res.json({ sent, failed, total: docs.length });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

/* ══════════════════════
   REAL PTY TERMINAL
   WebSocket + node-pty
   Full interactive shell
══════════════════════ */
const { WebSocketServer } = require("ws");
const pty = require("node-pty");

const ptyProcesses = {};

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Running on port ${PORT}`);
});

// WebSocket PTY server
const wss = new WebSocketServer({ server, path: "/pty" });

wss.on("connection", (ws) => {
  const sessionId = "pty_" + Date.now();
  console.log(`PTY session started: ${sessionId}`);

  let ptyProcess;
  try {
    ptyProcess = pty.spawn("bash", [], {
      name: "xterm-color",
      cols: 120,
      rows: 30,
      cwd: PROJECT_DIR,
      env: {
        ...process.env,
        TERM: "xterm-color",
        COLORTERM: "truecolor",
        HOME: os.homedir(),
        PATH: "/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
      }
    });
  } catch(e) {
    ws.send(JSON.stringify({ type: "output", data: `\r\n\x1b[31m✗ Could not start shell: ${e.message}\x1b[0m\r\n` }));
    ws.close();
    return;
  }

  ptyProcesses[sessionId] = ptyProcess;

  // terminal output → browser
  ptyProcess.onData(data => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "output", data }));
    }
  });

  ptyProcess.onExit(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify({ type: "exit" }));
      ws.close();
    }
    delete ptyProcesses[sessionId];
  });

  // browser input → terminal
  ws.on("message", msg => {
    try {
      const parsed = JSON.parse(msg.toString());
      if (parsed.type === "input")  ptyProcess.write(parsed.data);
      if (parsed.type === "resize") ptyProcess.resize(
        Math.max(1, parsed.cols),
        Math.max(1, parsed.rows)
      );
    } catch {
      ptyProcess.write(msg.toString());
    }
  });

  ws.on("close", () => {
    try { ptyProcess.kill(); } catch {}
    delete ptyProcesses[sessionId];
    console.log(`PTY session ended: ${sessionId}`);
  });

  ws.send(JSON.stringify({ type: "output", data: "\r\n\x1b[32m✓ Real Linux shell connected\x1b[0m\r\n\r\n" }));
});
/* ══════════════════════
   VM TERMINAL — gh codespace ssh
══════════════════════ */
const ghPath = path.join(__dirname, "gh_2.62.0_linux_amd64", "bin", "gh");
const vmWss = new WebSocketServer({ server, path: "/vm-pty" });

vmWss.on("connection", (ws, req) => {
  const params = new URLSearchParams(req.url.split("?")[1] || "");
  const token = params.get("token");
  const csName = params.get("name");
  if (!token || !csName) { ws.send(JSON.stringify({type:"output",data:"✗ missing token/codespace name\r\n"})); ws.close(); return; }

  if (!fs.existsSync(ghPath)) {
    console.error(`✗ gh binary missing at ${ghPath}`);
    ws.send(JSON.stringify({type:"output",data:`\r\n✗ gh CLI not found on server at ${ghPath}\r\n`}));
    ws.close();
    return;
  }

  let vmPty;
  try {
    vmPty = pty.spawn(ghPath, ["codespace", "ssh", "-c", csName], {
      name: "xterm-color", cols: 120, rows: 30,
      env: { ...process.env, GH_TOKEN: token }
    });
  } catch (err) {
    console.error("✗ vm pty spawn failed:", err);
    ws.send(JSON.stringify({type:"output",data:`\r\n✗ Failed to start VM shell: ${err.message}\r\n`}));
    ws.close();
    return;
  }

  vmPty.onData(data => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify({type:"output",data})); });
  vmPty.onExit(({exitCode, signal}) => {
    console.log(`VM pty exited: code=${exitCode} signal=${signal}`);
    if (ws.readyState === ws.OPEN) { ws.send(JSON.stringify({type:"exit"})); ws.close(); }
  });

  ws.on("message", msg => {
    try {
      const p = JSON.parse(msg.toString());
      if (p.type === "input") vmPty.write(p.data);
      if (p.type === "resize") vmPty.resize(Math.max(1,p.cols), Math.max(1,p.rows));
    } catch { vmPty.write(msg.toString()); }
  });

  ws.on("close", () => { try { vmPty.kill(); } catch {} });
});