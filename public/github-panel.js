/* =========================================
   GITHUB INTEGRATION PANEL
   Full GitHub integration:
   - Connect with token
   - Push/Pull all files
   - Branches, Commits, PRs, Issues, Actions
   - Gutter indicators
   - Inline blame
========================================= */

const GH_TOKEN_KEY   = "gh_token";
const GH_USER_KEY    = "gh_user";
const GH_REPO_KEY    = "gh_repo";
const GH_BRANCH_KEY  = "gh_branch";
const SERVER_BASE    = "https://backend-forz.onrender.com";

let ghUser   = null;
let ghRepo   = null;
let ghBranch = "main";
let ghRepos  = [];
let ghBranches = [];
let ghBlameDecorations = [];
let ghCurrentTab = "push";

/* ══════════════════════
   TOKEN STORAGE
══════════════════════ */
function ghGetToken()        { return localStorage.getItem(GH_TOKEN_KEY) || ""; }
function ghSaveToken(t)      { localStorage.setItem(GH_TOKEN_KEY, t); }
function ghGetSavedUser()    { try { return JSON.parse(localStorage.getItem(GH_USER_KEY)||"null"); } catch { return null; } }
function ghSaveUser(u)       { localStorage.setItem(GH_USER_KEY, JSON.stringify(u)); }
function ghGetSavedRepo()    { return localStorage.getItem(GH_REPO_KEY) || ""; }
function ghSaveRepo(r)       { localStorage.setItem(GH_REPO_KEY, r); }
function ghGetSavedBranch()  { return localStorage.getItem(GH_BRANCH_KEY) || "main"; }
function ghSaveBranch(b)     { localStorage.setItem(GH_BRANCH_KEY, b); }

/* ══════════════════════
   API HELPER
══════════════════════ */
async function ghAPI(method, endpoint, body) {
  const token = ghGetToken();
  if (!token) throw new Error("No GitHub token — please connect first");

  const opts = {
    method,
    headers: {
      "Content-Type": "application/json",
      "x-github-token": token
    }
  };
  if (body) opts.body = JSON.stringify(body);

  let res, data;
  try {
    res  = await fetch(SERVER_BASE + "/api/github" + endpoint, opts);
    data = await res.json();
  } catch(e) {
    throw new Error("Network error: " + (e.message || "Could not reach server"));
  }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Server error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* ══════════════════════
   CONNECT TO GITHUB
══════════════════════ */
async function ghConnect() {
  const tokenInput = document.getElementById("gh-token-input");
  const token = tokenInput?.value.trim();
  if (!token) { showToast("Enter your GitHub token", "error"); return; }

  ghSetStatus("Connecting...", "loading");
  try {
    ghSaveToken(token);
    const user = await ghAPI("GET", "/user");
    ghUser = user;
    ghSaveUser(user);
    if (tokenInput) tokenInput.value = "";
    await ghLoadRepos();
    renderGithubPanel();
    showToast(`✓ Connected as ${user.login}`, "success");
  } catch(e) {
    ghSaveToken("");
    ghSetStatus("Invalid token — check and try again", "error");
    showToast("GitHub connection failed: " + e.message, "error");
  }
}

function ghDisconnect() {
  if (!confirm("Disconnect from GitHub?")) return;
  localStorage.removeItem(GH_TOKEN_KEY);
  localStorage.removeItem(GH_USER_KEY);
  ghUser = null; ghRepo = null;
  renderGithubPanel();
  showToast("Disconnected from GitHub", "info");
}

/* ══════════════════════
   LOAD REPOS + BRANCHES
══════════════════════ */
async function ghLoadRepos() {
  try {
    const data = await ghAPI("GET", "/repos");
    ghRepos = Array.isArray(data) ? data : [];
    const savedRepo = ghGetSavedRepo();
    if (savedRepo) {
      ghRepo = ghRepos.find(r => r.full_name === savedRepo) || ghRepos[0] || null;
    } else {
      ghRepo = ghRepos[0] || null;
    }
    if (ghRepo) { ghSaveRepo(ghRepo.full_name); await ghLoadBranches(); }
  } catch(e) { console.warn("Load repos:", e?.message || e?.error || e); }
}

async function ghLoadBranches() {
  if (!ghRepo || !ghUser) return;
  try {
    const [owner, repo] = ghRepo.full_name.split("/");
    ghBranches = await ghAPI("GET", `/branches?owner=${owner}&repo=${repo}`);
    const saved = ghGetSavedBranch();
    ghBranch = ghBranches.find(b => b.name === saved)?.name || ghBranches[0]?.name || "main";
    ghSaveBranch(ghBranch);
    renderGhRepoBranchSelects();
  } catch(e) { ghBranches = []; }
}

function ghOnRepoChange(val) {
  ghRepo = ghRepos.find(r => r.full_name === val) || null;
  if (ghRepo) { ghSaveRepo(ghRepo.full_name); ghLoadBranches(); }
}

function ghOnBranchChange(val) {
  ghBranch = val;
  ghSaveBranch(val);
}

/* ══════════════════════
   RENDER PANEL
══════════════════════ */
function renderGithubPanel() {
  const container = document.getElementById("gh-panel-content");
  if (!container) return;

  const token = ghGetToken();
  const savedUser = ghGetSavedUser();
  if (savedUser && !ghUser) ghUser = savedUser;

  if (!token || !ghUser) {
    container.innerHTML = `
      <div class="gh-connect-box">
        <div style="font-size:12px;color:#555;line-height:1.6;margin-bottom:4px;">
          Connect your GitHub account to push/pull your projects directly to GitHub — works on any device.
        </div>
        <div>
          <label style="font-size:10px;color:#555;display:block;margin-bottom:4px;">GitHub Personal Access Token</label>
          <input id="gh-token-input" type="password" class="gh-input" placeholder="ghp_xxxxxxxxxxxx">
          <div style="font-size:10px;color:#555;margin-top:4px;">
            <a href="https://github.com/settings/tokens/new?scopes=repo,workflow" target="_blank" style="color:#1f6feb;">
              Get a token here →
            </a> (select repo + workflow scopes)
          </div>
        </div>
        <button class="gh-btn gh-btn-green" onclick="ghConnect()">🔗 Connect to GitHub</button>
        <div id="gh-status" class="gh-status-msg"></div>
      </div>`;
    return;
  }

  container.innerHTML = `
    <!-- USER CARD -->
    <div style="padding:10px 14px;border-bottom:1px solid rgba(255,255,255,0.05);">
      <div class="gh-user-card">
        <img class="gh-avatar" src="${ghUser.avatar_url}" alt="${ghUser.login}" onerror="this.style.display='none'">
        <div>
          <div class="gh-user-name">@${ghUser.login}</div>
          <div class="gh-user-meta">${ghUser.public_repos || 0} repos</div>
        </div>
        <button class="gh-disconnect-btn" onclick="ghDisconnect()">Disconnect</button>
      </div>
    </div>

    <!-- REPO + BRANCH SELECTOR -->
    <div class="gh-repo-selector" style="padding-top:10px;">
      <label style="font-size:10px;color:#555;display:block;margin-bottom:4px;">Repository</label>
      <select class="gh-repo-select" id="gh-repo-select" onchange="ghOnRepoChange(this.value)">
        ${ghRepos.map(r=>`<option value="${r.full_name}" ${ghRepo?.full_name===r.full_name?"selected":""}>${r.full_name}${r.private?" 🔒":""}</option>`).join("")}
      </select>
      <button class="gh-btn gh-btn-ghost" style="margin-top:6px;font-size:11px;padding:5px;" onclick="showCreateRepoModal()">➕ New Repository</button>
    </div>

    <div class="gh-branch-row">
      <span class="gh-branch-label">🌿</span>
      <select class="gh-branch-select" id="gh-branch-select" onchange="ghOnBranchChange(this.value)">
        ${ghBranches.map(b=>`<option value="${b.name}" ${ghBranch===b.name?"selected":""}>${b.name}</option>`).join("")}
        ${!ghBranches.length?`<option value="main">main</option>`:""}
      </select>
      <button class="gh-new-branch-btn" onclick="showNewBranchModal()">+ Branch</button>
    </div>

    <!-- PUSH / PULL AREA -->
    <div class="gh-actions-area">
      <textarea id="gh-commit-msg" class="gh-commit-input" rows="2" placeholder="Commit message (e.g. feat: add new page)"></textarea>
      <div class="gh-push-row">
        <button class="gh-push-btn" onclick="ghPushAll()" id="gh-push-btn">⬆ Push All</button>
        <button class="gh-pull-btn" onclick="ghPullAll()" id="gh-pull-btn">⬇ Pull</button>
      </div>
      <div class="gh-progress" id="gh-progress" style="display:none;"><div class="gh-progress-bar" id="gh-progress-bar" style="width:0%"></div></div>
      <div id="gh-status" class="gh-status-msg"></div>
    </div>

    <!-- TABS -->
    <div class="gh-tabs">
      <div class="gh-tab ${ghCurrentTab==='commits'?'active':''}" onclick="ghSwitchTab('commits')">Commits</div>
      <div class="gh-tab ${ghCurrentTab==='prs'?'active':''}" onclick="ghSwitchTab('prs')">Pull Requests</div>
      <div class="gh-tab ${ghCurrentTab==='issues'?'active':''}" onclick="ghSwitchTab('issues')">Issues</div>
      <div class="gh-tab ${ghCurrentTab==='actions'?'active':''}" onclick="ghSwitchTab('actions')">Actions</div>
      <div class="gh-tab ${ghCurrentTab==='blame'?'active':''}" onclick="ghSwitchTab('blame')">Blame</div>
    </div>

    <!-- TAB CONTENT -->
    <div class="gh-panel-body">
      <div id="gh-tab-commits"  class="gh-tab-content ${ghCurrentTab==='commits'?'active':''}"><div class="gh-empty">Click to load commits</div></div>
      <div id="gh-tab-prs"      class="gh-tab-content ${ghCurrentTab==='prs'?'active':''}"><div class="gh-empty">Click to load PRs</div></div>
      <div id="gh-tab-issues"   class="gh-tab-content ${ghCurrentTab==='issues'?'active':''}"><div class="gh-empty">Click to load issues</div></div>
      <div id="gh-tab-actions"  class="gh-tab-content ${ghCurrentTab==='actions'?'active':''}"><div class="gh-empty">Click to load workflow runs</div></div>
      <div id="gh-tab-blame"    class="gh-tab-content ${ghCurrentTab==='blame'?'active':''}"><div class="gh-empty">Open a file then click Refresh</div></div>
    </div>`;

  // load active tab
  if (ghCurrentTab !== "commits" || document.getElementById("gh-tab-commits")?.innerHTML.includes("Click")) {
    ghSwitchTab(ghCurrentTab, false);
  }
}

function renderGhRepoBranchSelects() {
  const branchSel = document.getElementById("gh-branch-select");
  if (branchSel) {
    branchSel.innerHTML = ghBranches.map(b=>`<option value="${b.name}" ${ghBranch===b.name?"selected":""}>${b.name}</option>`).join("");
  }
}

function ghSetStatus(msg, type) {
  const el = document.getElementById("gh-status");
  if (!el) return;
  el.innerText = msg;
  el.className = "gh-status-msg" + (type ? " gh-status-"+type : "");
}

function ghSetProgress(pct) {
  const bar = document.getElementById("gh-progress");
  const fill = document.getElementById("gh-progress-bar");
  if (bar) bar.style.display = pct > 0 && pct < 100 ? "block" : "none";
  if (fill) fill.style.width = pct + "%";
}

/* ══════════════════════
   PUSH ALL FILES
══════════════════════ */
async function ghPushAll() {
  if (!ghRepo || !ghUser) { showToast("Connect GitHub first", "error"); return; }
  const msg = document.getElementById("gh-commit-msg")?.value.trim() || "Update from VS Code God Mode";
  const [owner, repo] = ghRepo.full_name.split("/");

  const pushBtn = document.getElementById("gh-push-btn");
  if (pushBtn) pushBtn.disabled = true;
  ghSetStatus("Pushing files...", "loading");
  ghSetProgress(10);

  try {
    const result = await ghAPI("POST", "/push-all", {
      owner, repo, branch: ghBranch,
      files: window.files || {},
      message: msg
    });

    ghSetProgress(100);
    ghSetStatus(`✓ Pushed ${result.pushed} file${result.pushed!==1?"s":""}${result.failed>0?" ("+result.failed+" failed)":""}`, "success");
    if (document.getElementById("gh-commit-msg")) document.getElementById("gh-commit-msg").value = "";
    showToast(`✓ Pushed to ${ghRepo.full_name}`, "success");

    // refresh commits
    setTimeout(() => ghLoadCommits(), 1000);
  } catch(e) {
    ghSetStatus("Push failed: " + e.message, "error");
    showToast("Push failed: " + e.message, "error");
  } finally {
    if (pushBtn) pushBtn.disabled = false;
    setTimeout(() => ghSetProgress(0), 2000);
  }
}

/* ══════════════════════
   PULL ALL FILES
══════════════════════ */
async function ghPullAll() {
  const token = ghGetToken();
  if (!token) { showToast("No GitHub token — reconnect first", "error"); return; }
  if (!ghUser) { showToast("Connect GitHub first", "error"); return; }
  if (!ghRepo) { showToast("Select a repository first", "error"); return; }

  const branch = ghBranch || ghGetSavedBranch() || "main";
  if (!confirm(`Pull all files from ${ghRepo.full_name}/${branch}?\n\nThis will OVERWRITE your current project files!`)) return;

  const [owner, repo] = ghRepo.full_name.split("/");
  const pullBtn = document.getElementById("gh-pull-btn");
  if (pullBtn) pullBtn.disabled = true;
  ghSetStatus("Pulling files...", "loading");
  ghSetProgress(20);

  try {
    const result = await ghAPI("POST", "/pull-all", { owner, repo, branch });
    ghSetProgress(80);

    if (result.files && Object.keys(result.files).length) {
      // merge pulled files into project
      Object.assign(window.files, result.files);
      if (typeof saveToStorage === "function") saveToStorage();
      if (typeof renderFiles === "function") renderFiles();
      if (typeof renderTabs === "function") renderTabs();
      // reload current file in editor
      if (typeof currentFile !== "undefined" && window.files[currentFile] && window.editor1) {
        window.editor1.setValue(window.files[currentFile]);
      }
      ghSetProgress(100);
      ghSetStatus(`✓ Pulled ${result.count} file${result.count!==1?"s":""}`, "success");
      showToast(`✓ Pulled ${result.count} files from GitHub`, "success");
    } else {
      ghSetStatus("No files found in repo", "error");
    }
  } catch(e) {
    const msg = e?.message || e?.error || JSON.stringify(e) || "Unknown error";
    ghSetStatus("Pull failed: " + msg, "error");
    showToast("Pull failed: " + msg, "error");
  } finally {
    if (pullBtn) pullBtn.disabled = false;
    setTimeout(() => ghSetProgress(0), 2000);
  }
}

/* ══════════════════════
   TAB SWITCHING
══════════════════════ */
function ghSwitchTab(tab, load=true) {
  ghCurrentTab = tab;
  document.querySelectorAll(".gh-tab").forEach(t => t.classList.toggle("active", t.onclick?.toString().includes(`'${tab}'`)));
  document.querySelectorAll(".gh-tab-content").forEach(t => t.classList.remove("active"));
  const el = document.getElementById("gh-tab-"+tab);
  if (el) el.classList.add("active");

  if (!load) return;
  if (tab === "commits") ghLoadCommits();
  if (tab === "prs") ghLoadPRs();
  if (tab === "issues") ghLoadIssues();
  if (tab === "actions") ghLoadActions();
  if (tab === "blame") ghLoadBlame();
}

/* ══════════════════════
   COMMITS
══════════════════════ */
async function ghLoadCommits() {
  const el = document.getElementById("gh-tab-commits"); if (!el) return;
  if (!ghRepo) { el.innerHTML=`<div class="gh-empty">Select a repo first</div>`; return; }
  el.innerHTML = `<div class="gh-empty">Loading...</div>`;
  try {
    const [owner, repo] = ghRepo.full_name.split("/");
    const commits = await ghAPI("GET", `/commits?owner=${owner}&repo=${repo}&branch=${ghBranch}`);
    if (!commits.length) { el.innerHTML=`<div class="gh-empty">No commits yet</div>`; return; }
    el.innerHTML = commits.map(c => `
      <div class="gh-commit-item" onclick="window.open('${c.html_url}','_blank')">
        <span class="gh-commit-sha">${c.sha.slice(0,7)}</span>
        <span class="gh-commit-msg">${c.message.split("\n")[0]}</span>
        <span class="gh-commit-meta">${timeAgoGh(c.date)}</span>
      </div>`).join("");
  } catch(e) { el.innerHTML=`<div class="gh-empty">Error: ${e.message}</div>`; }
}

/* ══════════════════════
   PULL REQUESTS
══════════════════════ */
async function ghLoadPRs() {
  const el = document.getElementById("gh-tab-prs"); if (!el) return;
  if (!ghRepo) { el.innerHTML=`<div class="gh-empty">Select a repo first</div>`; return; }
  el.innerHTML = `<div class="gh-empty">Loading...</div>`;
  try {
    const [owner, repo] = ghRepo.full_name.split("/");
    const prs = await ghAPI("GET", `/prs?owner=${owner}&repo=${repo}&state=open`);
    if (!prs.length) { el.innerHTML=`<div class="gh-empty">No open pull requests</div>`; return; }
    el.innerHTML = `
      <div style="padding:6px 14px;display:flex;justify-content:flex-end;">
        <button class="gh-section-btn" style="font-size:11px;background:#1f6feb;color:#fff;border-radius:4px;padding:4px 10px;" onclick="showCreatePRModal()">+ New PR</button>
      </div>` +
      prs.map(pr => `
      <div class="gh-pr-item" onclick="window.open('${pr.html_url}','_blank')">
        <div class="gh-pr-title">#${pr.number} ${pr.title}</div>
        <div class="gh-pr-meta">
          <span class="gh-pr-open">● open</span> · ${pr.head} → ${pr.base} · by ${pr.user} · ${timeAgoGh(pr.created_at)}
        </div>
      </div>`).join("");
  } catch(e) { el.innerHTML=`<div class="gh-empty">Error: ${e.message}</div>`; }
}

/* ══════════════════════
   ISSUES
══════════════════════ */
async function ghLoadIssues() {
  const el = document.getElementById("gh-tab-issues"); if (!el) return;
  if (!ghRepo) { el.innerHTML=`<div class="gh-empty">Select a repo first</div>`; return; }
  el.innerHTML = `<div class="gh-empty">Loading...</div>`;
  try {
    const [owner, repo] = ghRepo.full_name.split("/");
    const issues = await ghAPI("GET", `/issues?owner=${owner}&repo=${repo}&state=open`);
    el.innerHTML = `
      <div style="padding:6px 14px;display:flex;justify-content:flex-end;">
        <button class="gh-section-btn" style="font-size:11px;background:#1f6feb;color:#fff;border-radius:4px;padding:4px 10px;" onclick="showCreateIssueModal()">+ New Issue</button>
      </div>` +
      (issues.length ? issues.map(i => `
      <div class="gh-issue-item" onclick="window.open('${i.html_url}','_blank')">
        <div class="gh-issue-title">#${i.number} ${i.title}</div>
        <div class="gh-issue-meta">by ${i.user} · ${timeAgoGh(i.created_at)}${i.labels.length?" · "+i.labels.join(", "):""}</div>
      </div>`).join("") : `<div class="gh-empty">No open issues 🎉</div>`);
  } catch(e) { el.innerHTML=`<div class="gh-empty">Error: ${e.message}</div>`; }
}

/* ══════════════════════
   GITHUB ACTIONS
══════════════════════ */
async function ghLoadActions() {
  const el = document.getElementById("gh-tab-actions"); if (!el) return;
  if (!ghRepo) { el.innerHTML=`<div class="gh-empty">Select a repo first</div>`; return; }
  el.innerHTML = `<div class="gh-empty">Loading...</div>`;
  try {
    const [owner, repo] = ghRepo.full_name.split("/");
    const runs = await ghAPI("GET", `/actions?owner=${owner}&repo=${repo}`);
    if (!runs.length) { el.innerHTML=`<div class="gh-empty">No workflow runs found</div>`; return; }
    el.innerHTML = runs.map(r => {
      const icon = r.conclusion==="success"?"✅":r.conclusion==="failure"?"❌":r.status==="in_progress"?"🔄":"⏸";
      return `<div class="gh-run-item" onclick="window.open('${r.html_url}','_blank')">
        <span class="gh-run-status">${icon}</span>
        <span class="gh-run-name">${r.name} — ${r.head_commit||""}</span>
        <span class="gh-run-meta">${timeAgoGh(r.created_at)}</span>
      </div>`;
    }).join("");
  } catch(e) { el.innerHTML=`<div class="gh-empty">Error: ${e.message}<br><small>Make sure your token has 'workflow' scope</small></div>`; }
}

/* ══════════════════════
   BLAME
══════════════════════ */
async function ghLoadBlame() {
  const el = document.getElementById("gh-tab-blame"); if (!el) return;
  if (!ghRepo) { el.innerHTML=`<div class="gh-empty">Select a repo first</div>`; return; }
  const file = typeof currentFile !== "undefined" ? currentFile : "";
  if (!file) { el.innerHTML=`<div class="gh-empty">Open a file in the editor first</div>`; return; }
  el.innerHTML = `<div class="gh-empty">Loading blame for ${file.split("/").pop()}...</div>`;
  try {
    const [owner, repo] = ghRepo.full_name.split("/");
    const blame = await ghAPI("GET", `/blame?owner=${owner}&repo=${repo}&path=${file}&branch=${ghBranch}`);
    if (!blame) { el.innerHTML=`<div class="gh-empty">No blame data — file may not exist in repo yet</div>`; return; }
    el.innerHTML = `
      <div style="padding:10px 14px;">
        <div style="font-size:12px;color:#ccc;font-weight:600;margin-bottom:8px;">📄 ${file.split("/").pop()}</div>
        <div style="font-size:11px;color:#858585;line-height:1.8;">
          <div>Last commit: <span style="color:#ccc;">${blame.message}</span></div>
          <div>Author: <span style="color:#58a6ff;">${blame.author}</span></div>
          <div>Date: <span style="color:#ccc;">${new Date(blame.date).toLocaleString()}</span></div>
          <div>SHA: <span style="font-family:monospace;color:#1f6feb;">${blame.sha.slice(0,12)}</span></div>
        </div>
        <button class="gh-btn gh-btn-ghost" style="margin-top:12px;font-size:11px;padding:6px;" onclick="ghLoadBlame()">↺ Refresh</button>
      </div>`;

    // add gutter decoration to editor
    if (window.editor1 && typeof window.editor1.deltaDecorations === "function") {
      ghBlameDecorations = window.editor1.deltaDecorations(ghBlameDecorations, [{
        range: new monaco.Range(1,1,1,1),
        options: { isWholeLine: false, linesDecorationsClassName: "gh-blame-decoration" }
      }]);
    }
  } catch(e) { el.innerHTML=`<div class="gh-empty">Error: ${e.message}</div>`; }
}

/* ══════════════════════
   MODALS
══════════════════════ */
function showCreateRepoModal() {
  document.getElementById("gh-modal-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "gh-modal-overlay";
  overlay.className = "gh-modal-overlay";
  overlay.innerHTML = `
    <div class="gh-modal" onclick="event.stopPropagation()">
      <div class="gh-modal-title">➕ Create New Repository</div>
      <div>
        <label>Repository Name *</label>
        <input id="gh-new-repo-name" class="gh-input" placeholder="my-awesome-project">
      </div>
      <div>
        <label>Description</label>
        <input id="gh-new-repo-desc" class="gh-input" placeholder="Optional description">
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" id="gh-new-repo-private">
        <label for="gh-new-repo-private" style="font-size:12px;color:#ccc;">Private repository</label>
      </div>
      <div class="gh-modal-row">
        <button class="gh-btn gh-btn-ghost" onclick="document.getElementById('gh-modal-overlay').remove()">Cancel</button>
        <button class="gh-btn gh-btn-green" onclick="ghCreateRepo()">Create</button>
      </div>
      <div id="gh-modal-status" class="gh-status-msg"></div>
    </div>`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
  document.getElementById("gh-new-repo-name")?.focus();
}

async function ghCreateRepo() {
  const name = document.getElementById("gh-new-repo-name")?.value.trim();
  const description = document.getElementById("gh-new-repo-desc")?.value.trim();
  const isPrivate = document.getElementById("gh-new-repo-private")?.checked;
  const st = document.getElementById("gh-modal-status");
  if (!name) { if(st){st.innerText="Repo name required";st.className="gh-status-msg gh-status-error";} return; }
  if(st){st.innerText="Creating...";st.className="gh-status-msg gh-status-loading";}
  try {
    const repo = await ghAPI("POST", "/create-repo", { name, description, isPrivate });
    document.getElementById("gh-modal-overlay")?.remove();
    await ghLoadRepos();
    renderGithubPanel();
    showToast(`✓ Created ${repo.full_name}`, "success");
  } catch(e) { if(st){st.innerText="Error: "+e.message;st.className="gh-status-msg gh-status-error";} }
}

function showNewBranchModal() {
  const name = prompt("New branch name:");
  if (!name || !name.trim()) return;
  const fromBranch = ghBranches.find(b => b.name === ghBranch);
  if (!fromBranch) { showToast("No base branch SHA found", "error"); return; }
  ghCreateBranch(name.trim(), fromBranch.sha);
}

async function ghCreateBranch(name, fromSha) {
  if (!ghRepo) return;
  const [owner, repo] = ghRepo.full_name.split("/");
  try {
    await ghAPI("POST", "/create-branch", { owner, repo, branch: name, fromSha });
    showToast(`✓ Branch "${name}" created`, "success");
    await ghLoadBranches();
    ghBranch = name; ghSaveBranch(name);
    renderGhRepoBranchSelects();
  } catch(e) { showToast("Create branch failed: " + e.message, "error"); }
}

function showCreatePRModal() {
  document.getElementById("gh-modal-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "gh-modal-overlay";
  overlay.className = "gh-modal-overlay";
  overlay.innerHTML = `
    <div class="gh-modal" onclick="event.stopPropagation()">
      <div class="gh-modal-title">🔀 Create Pull Request</div>
      <div><label>Title *</label><input id="gh-pr-title" class="gh-input" placeholder="feat: amazing new feature"></div>
      <div><label>From branch</label>
        <select id="gh-pr-head" class="gh-repo-select">
          ${ghBranches.map(b=>`<option value="${b.name}" ${b.name===ghBranch?"selected":""}>${b.name}</option>`).join("")}
        </select>
      </div>
      <div><label>Into branch</label>
        <select id="gh-pr-base" class="gh-repo-select">
          ${ghBranches.map(b=>`<option value="${b.name}" ${b.name==="main"?"selected":""}>${b.name}</option>`).join("")}
        </select>
      </div>
      <div><label>Description</label><textarea id="gh-pr-body" class="gh-commit-input" rows="3" placeholder="Describe your changes..."></textarea></div>
      <div class="gh-modal-row">
        <button class="gh-btn gh-btn-ghost" onclick="document.getElementById('gh-modal-overlay').remove()">Cancel</button>
        <button class="gh-btn gh-btn-green" onclick="ghCreatePR()">Create PR</button>
      </div>
      <div id="gh-modal-status" class="gh-status-msg"></div>
    </div>`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

async function ghCreatePR() {
  const title = document.getElementById("gh-pr-title")?.value.trim();
  const head  = document.getElementById("gh-pr-head")?.value;
  const base  = document.getElementById("gh-pr-base")?.value;
  const body  = document.getElementById("gh-pr-body")?.value.trim();
  const st = document.getElementById("gh-modal-status");
  if (!title) { if(st){st.innerText="Title required";st.className="gh-status-msg gh-status-error";} return; }
  if(st){st.innerText="Creating PR...";st.className="gh-status-msg gh-status-loading";}
  try {
    const [owner, repo] = ghRepo.full_name.split("/");
    const pr = await ghAPI("POST", "/create-pr", { owner, repo, title, body, head, base });
    document.getElementById("gh-modal-overlay")?.remove();
    showToast(`✓ PR #${pr.number} created`, "success");
    window.open(pr.html_url, "_blank");
    ghLoadPRs();
  } catch(e) { if(st){st.innerText="Error: "+e.message;st.className="gh-status-msg gh-status-error";} }
}

function showCreateIssueModal() {
  document.getElementById("gh-modal-overlay")?.remove();
  const overlay = document.createElement("div");
  overlay.id = "gh-modal-overlay";
  overlay.className = "gh-modal-overlay";
  overlay.innerHTML = `
    <div class="gh-modal" onclick="event.stopPropagation()">
      <div class="gh-modal-title">🐛 Create Issue</div>
      <div><label>Title *</label><input id="gh-issue-title" class="gh-input" placeholder="Bug: something is broken"></div>
      <div><label>Description</label><textarea id="gh-issue-body" class="gh-commit-input" rows="4" placeholder="Describe the issue..."></textarea></div>
      <div class="gh-modal-row">
        <button class="gh-btn gh-btn-ghost" onclick="document.getElementById('gh-modal-overlay').remove()">Cancel</button>
        <button class="gh-btn gh-btn-green" onclick="ghCreateIssue()">Create Issue</button>
      </div>
      <div id="gh-modal-status" class="gh-status-msg"></div>
    </div>`;
  overlay.onclick = () => overlay.remove();
  document.body.appendChild(overlay);
}

async function ghCreateIssue() {
  const title = document.getElementById("gh-issue-title")?.value.trim();
  const body  = document.getElementById("gh-issue-body")?.value.trim();
  const st = document.getElementById("gh-modal-status");
  if (!title) { if(st){st.innerText="Title required";st.className="gh-status-msg gh-status-error";} return; }
  if(st){st.innerText="Creating issue...";st.className="gh-status-msg gh-status-loading";}
  try {
    const [owner, repo] = ghRepo.full_name.split("/");
    const issue = await ghAPI("POST", "/create-issue", { owner, repo, title, body });
    document.getElementById("gh-modal-overlay")?.remove();
    showToast(`✓ Issue #${issue.number} created`, "success");
    window.open(issue.html_url, "_blank");
    ghLoadIssues();
  } catch(e) { if(st){st.innerText="Error: "+e.message;st.className="gh-status-msg gh-status-error";} }
}

/* ══════════════════════
   HELPERS
══════════════════════ */
function timeAgoGh(dateStr) {
  if (!dateStr) return "";
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s/60) + "m ago";
  if (s < 86400) return Math.floor(s/3600) + "h ago";
  return Math.floor(s/86400) + "d ago";
}

/* ══════════════════════
   INIT ON LOAD
══════════════════════ */
window.addEventListener("load", () => {
  setTimeout(async () => {
    const token = ghGetToken();
    const savedUser = ghGetSavedUser();
    if (token && savedUser) {
      ghUser = savedUser;
      await ghLoadRepos();
      const panel = document.querySelector(".sidebar-panel[data-panel='github']");
      if (panel && panel.classList.contains("active")) renderGithubPanel();
    }
  }, 2000);
});