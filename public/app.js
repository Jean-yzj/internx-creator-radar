const TOPIC_CHIPS = [
  { id: "interview", label: "面試 / 履歷", keywords: ["面試", "履歷"], defaultOn: true },
  { id: "jobsearch", label: "求職教學", keywords: ["求職"], defaultOn: true },
  { id: "career_consult", label: "職涯諮詢", keywords: ["職涯", "Life Coach"], defaultOn: true },
  { id: "courses", label: "線上課程 / 工作坊", keywords: ["課程", "工作坊", "講座"], defaultOn: true },
  { id: "resume_review", label: "履歷健檢", keywords: ["履歷健檢"] },
  { id: "career_change", label: "轉職 / 跨領域", keywords: ["轉職", "跨領域"] },
  { id: "internship", label: "大學生實習", keywords: ["實習", "校園", "大學"] },
  { id: "newgrad", label: "應屆 / 新鮮人", keywords: ["應屆", "新鮮人"] },
  { id: "midcareer", label: "中年轉職", keywords: ["中年", "二度就業"] },
  { id: "women", label: "女性職場", keywords: ["女性", "媽媽"] },
  { id: "overseas", label: "海外 / 海歸", keywords: ["海外", "外派"] },
  { id: "humanities", label: "文組求職", keywords: ["文組"] },
  { id: "introvert", label: "內向轉職", keywords: ["內向"] },
  { id: "engineer", label: "軟體工程師", keywords: ["工程師", "軟體", "Leetcode"] },
  { id: "pm", label: "PM 產品經理", keywords: ["PM", "產品經理"] },
  { id: "marketing", label: "行銷 / 廣告", keywords: ["行銷", "廣告", "數位行銷"] },
  { id: "design", label: "設計師 (UI/UX)", keywords: ["設計師", "UI", "UX", "作品集"] },
  { id: "data", label: "數據分析", keywords: ["數據", "Data", "分析師"] },
  { id: "consulting", label: "顧問業", keywords: ["顧問業", "consulting"] },
  { id: "mba", label: "MBA / 商學院", keywords: ["MBA", "商學院"] },
  { id: "finance", label: "金融 / 銀行", keywords: ["金融", "銀行"] },
  { id: "hr", label: "HR 人資", keywords: ["HR", "人資"] },
  { id: "recruiter", label: "獵頭 Recruiter", keywords: ["獵頭", "recruiter"] },
  { id: "foreign", label: "外商求職", keywords: ["外商"] },
  { id: "branding", label: "個人品牌", keywords: ["個人品牌"] },
  { id: "ai", label: "AI × 職涯", keywords: ["AI", "ChatGPT"] },
  { id: "freelance", label: "自由工作 / 接案", keywords: ["freelancer", "接案", "自由工作"] },
  { id: "sidehustle", label: "副業 / 斜槓", keywords: ["副業", "斜槓"] },
  { id: "salary", label: "薪資談判", keywords: ["薪資", "談薪", "薪水"] },
  { id: "workplace", label: "職場觀察", keywords: ["職場", "上班族"] },
];

const COURSE_TAGS = new Set(["線上課程", "顧問服務", "講座課程", "求職課程", "課程顧問", "企業內訓"]);
const PIPELINE_LABELS = {
  new: "待評估",
  priority: "優先接洽",
  watchlist: "持續追蹤",
  contacted: "已接洽",
  rejected: "不合適",
};
const ROLE_LABELS = { marketing: "行銷", ops: "營運", ceo: "執行長" };

const elements = {
  body: document.body,
  topbar: document.getElementById("topbar"),
  appShell: document.getElementById("appShell"),
  loginOverlay: document.getElementById("loginOverlay"),
  loginForm: document.getElementById("loginForm"),
  loginUsername: document.getElementById("loginUsername"),
  loginPassword: document.getElementById("loginPassword"),
  loginError: document.getElementById("loginError"),
  loginSubmit: document.getElementById("loginSubmit"),
  meName: document.getElementById("meName"),
  meRole: document.getElementById("meRole"),
  logoutBtn: document.getElementById("logoutBtn"),
  changePasswordBtn: document.getElementById("changePasswordBtn"),
  passwordModal: document.getElementById("passwordModal"),
  passwordForm: document.getElementById("passwordForm"),
  pwCurrent: document.getElementById("pwCurrent"),
  pwNew: document.getElementById("pwNew"),
  pwConfirm: document.getElementById("pwConfirm"),
  pwError: document.getElementById("pwError"),
  pwSubmit: document.getElementById("pwSubmit"),
  pwCancel: document.getElementById("pwCancel"),
  activityBtn: document.getElementById("activityBtn"),
  activityBadge: document.getElementById("activityBadge"),
  activityDrawer: document.getElementById("activityDrawer"),
  activityList: document.getElementById("activityList"),
  closeActivity: document.getElementById("closeActivity"),
  drawerScrim: document.getElementById("drawerScrim"),
  activityFilterUser: document.getElementById("activityFilterUser"),
  activityFilterHandle: document.getElementById("activityFilterHandle"),
  activityFilterClear: document.getElementById("activityFilterClear"),
  activityHandleList: document.getElementById("activityHandleList"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  keywords: document.getElementById("keywords"),
  minFollowers: document.getElementById("minFollowers"),
  maxFollowers: document.getElementById("maxFollowers"),
  runSearch: document.getElementById("runSearch"),
  cardGrid: document.getElementById("cardGrid"),
  metricTotal: document.getElementById("metric-total"),
  metricRange: document.getElementById("metric-range"),
  metricCourse: document.getElementById("metric-course"),
  metricPriority: document.getElementById("metric-priority"),
  crawlStatus: document.getElementById("crawlStatus"),
  crawlSummaryText: document.getElementById("crawlSummaryText"),
  crawlWarningText: document.getElementById("crawlWarningText"),
  toggles: [...document.querySelectorAll(".toggle")],
  chipGrid: document.getElementById("chipGrid"),
  chipsAll: document.getElementById("chipsAll"),
  chipsNone: document.getElementById("chipsNone"),
  chipsReset: document.getElementById("chipsReset"),
  statusFilter: document.getElementById("statusFilter"),
  courseToggle: document.getElementById("courseToggle"),
};

let me = null;
let members = [];
let creatorStates = {};
let activeChipIds = new Set();
let activeStatusFilter = "all";
let courseOnly = false;
let activityFilter = { username: "", handle: "" };
let handleSuggestions = new Set();

let rawProfiles = [];
let mergedProfiles = [];

let lastSeenActivityId = 0;
let latestActivityId = 0;
let activityPoller = null;

const memoTimers = new Map();
const savingStateByHandle = new Map();

// ----------------- API helpers -----------------

async function handleResponse(res) {
  let data = null;
  try { data = await res.json(); } catch { /* no body */ }
  if (!res.ok) {
    const err = new Error((data && data.error) || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const api = {
  async get(path) {
    const res = await fetch(path, { credentials: "same-origin" });
    return handleResponse(res);
  },
  async post(path, body) {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
    return handleResponse(res);
  },
  async put(path, body) {
    const res = await fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {}),
    });
    return handleResponse(res);
  },
};

// ----------------- Boot / auth -----------------

async function boot() {
  try {
    const snapshot = await api.get("/api/state");
    onAuthenticated(snapshot);
  } catch (err) {
    if (err.status === 401) {
      showLogin();
    } else {
      showLogin(err.message || "無法連線伺服器，請稍後再試。");
    }
  }
}

function showLogin(message) {
  elements.body.dataset.auth = "anon";
  elements.loginOverlay.hidden = false;
  elements.topbar.hidden = true;
  elements.appShell.hidden = true;
  if (message) {
    elements.loginError.textContent = message;
    elements.loginError.hidden = false;
  } else {
    elements.loginError.hidden = true;
    elements.loginError.textContent = "";
  }
  setTimeout(() => elements.loginUsername?.focus(), 30);
}

function onAuthenticated(snapshot) {
  me = snapshot.user;
  members = Array.isArray(snapshot.members) ? snapshot.members : [];
  creatorStates = snapshot.creators || {};
  applyPrefsFromServer(snapshot.prefs || {});
  rebuildHandleSuggestions();

  elements.body.dataset.auth = "user";
  elements.loginOverlay.hidden = true;
  elements.topbar.hidden = false;
  elements.appShell.hidden = false;

  elements.meName.textContent = me.displayName || me.username;
  elements.meRole.textContent = ROLE_LABELS[me.role] || me.role;

  populateMemberFilter();
  renderChips();
  renderStatusFilterButtons();
  renderCourseToggle();
  loadProfiles();
  startActivityPoller();
}

function populateMemberFilter() {
  const opts = ['<option value="">所有人</option>']
    .concat(
      members.map(
        (m) =>
          `<option value="${escapeHtml(m.username)}">${escapeHtml(m.displayName || m.username)}</option>`,
      ),
    )
    .join("");
  elements.activityFilterUser.innerHTML = opts;
  elements.activityFilterUser.value = activityFilter.username;
  elements.activityFilterHandle.value = activityFilter.handle;
}

function rebuildHandleSuggestions() {
  // Seed datalist from any creator we already know about, so the user can
  // autocomplete by handle even on first drawer open.
  handleSuggestions = new Set(Object.keys(creatorStates));
  renderHandleDatalist();
}

function renderHandleDatalist() {
  if (!elements.activityHandleList) return;
  const sorted = [...handleSuggestions].sort();
  elements.activityHandleList.innerHTML = sorted
    .map((h) => `<option value="@${escapeHtml(h)}"></option>`)
    .join("");
}

function applyPrefsFromServer(prefs) {
  if (Array.isArray(prefs.chips)) {
    activeChipIds = new Set(prefs.chips);
  } else {
    activeChipIds = new Set(TOPIC_CHIPS.filter((c) => c.defaultOn).map((c) => c.id));
  }
  activeStatusFilter = typeof prefs.statusFilter === "string" ? prefs.statusFilter : "all";
  courseOnly = prefs.courseOnly === true;
}

elements.loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = elements.loginUsername.value.trim();
  const password = elements.loginPassword.value;
  if (!username || !password) return;
  elements.loginSubmit.disabled = true;
  elements.loginSubmit.textContent = "登入中…";
  elements.loginError.hidden = true;
  try {
    await api.post("/api/auth/login", { username, password });
    const snapshot = await api.get("/api/state");
    elements.loginPassword.value = "";
    onAuthenticated(snapshot);
  } catch (err) {
    elements.loginError.textContent = err.message || "登入失敗，請再試一次。";
    elements.loginError.hidden = false;
  } finally {
    elements.loginSubmit.disabled = false;
    elements.loginSubmit.textContent = "登入";
  }
});

function openPasswordModal() {
  elements.pwCurrent.value = "";
  elements.pwNew.value = "";
  elements.pwConfirm.value = "";
  elements.pwError.hidden = true;
  elements.pwError.textContent = "";
  elements.passwordModal.hidden = false;
  setTimeout(() => elements.pwCurrent.focus(), 30);
}

function closePasswordModal() {
  elements.passwordModal.hidden = true;
}

elements.changePasswordBtn.addEventListener("click", openPasswordModal);
elements.pwCancel.addEventListener("click", closePasswordModal);
elements.passwordModal.addEventListener("click", (event) => {
  if (event.target === elements.passwordModal) closePasswordModal();
});

elements.passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const currentPassword = elements.pwCurrent.value;
  const newPassword = elements.pwNew.value;
  const confirmPassword = elements.pwConfirm.value;

  elements.pwError.hidden = true;
  if (newPassword.length < 6) {
    elements.pwError.textContent = "新密碼至少要 6 個字元";
    elements.pwError.hidden = false;
    return;
  }
  if (newPassword !== confirmPassword) {
    elements.pwError.textContent = "兩次輸入的新密碼不一樣";
    elements.pwError.hidden = false;
    return;
  }

  elements.pwSubmit.disabled = true;
  elements.pwSubmit.textContent = "更新中…";
  try {
    await api.post("/api/auth/change-password", { currentPassword, newPassword });
    closePasswordModal();
    stopActivityPoller();
    me = null;
    creatorStates = {};
    rawProfiles = [];
    mergedProfiles = [];
    showLogin("密碼已更新，請用新密碼重新登入。");
  } catch (err) {
    elements.pwError.textContent = err.message || "更新失敗，請再試一次。";
    elements.pwError.hidden = false;
  } finally {
    elements.pwSubmit.disabled = false;
    elements.pwSubmit.textContent = "更新密碼";
  }
});

elements.logoutBtn.addEventListener("click", async () => {
  try { await api.post("/api/auth/logout"); } catch {}
  closeActivityDrawer();
  stopActivityPoller();
  me = null;
  creatorStates = {};
  rawProfiles = [];
  mergedProfiles = [];
  showLogin();
});

// ----------------- Profile merging -----------------

function mergeProfilesByHandle(profiles) {
  const map = new Map();
  for (const profile of profiles) {
    const handle = (profile.handle || "").toLowerCase();
    if (!handle) continue;
    if (!map.has(handle)) {
      map.set(handle, {
        ...profile,
        handle,
        platforms: [
          {
            platform: profile.platform,
            url: profile.url,
            followers: profile.followers,
            posts: profile.posts,
          },
        ],
        tags: [...(profile.tags || [])],
        bestScore: profile.score ?? 0,
        totalMatched: profile.matchedKeywords?.length || 0,
        collabAngleShort: profile.collabAngle || "",
      });
      continue;
    }
    const existing = map.get(handle);
    if (!existing.platforms.some((p) => p.platform === profile.platform)) {
      existing.platforms.push({
        platform: profile.platform,
        url: profile.url,
        followers: profile.followers,
        posts: profile.posts,
      });
    }
    existing.tags = [...new Set([...existing.tags, ...(profile.tags || [])])];
    existing.bestScore = Math.max(existing.bestScore, profile.score ?? 0);
    existing.totalMatched += profile.matchedKeywords?.length || 0;
    if (!existing.collabAngleShort && profile.collabAngle) {
      existing.collabAngleShort = profile.collabAngle;
    }
  }
  for (const entry of map.values()) {
    entry.platforms.sort((a, b) => {
      if (a.platform === b.platform) return 0;
      return a.platform === "instagram" ? -1 : 1;
    });
  }
  return [...map.values()].sort((a, b) => {
    if (b.totalMatched !== a.totalMatched) return b.totalMatched - a.totalMatched;
    return b.bestScore - a.bestScore;
  });
}

function hasCourseTag(profile) {
  return (profile.tags || []).some((tag) => COURSE_TAGS.has(tag));
}

// ----------------- Chips & filters -----------------

function renderChips() {
  elements.chipGrid.innerHTML = TOPIC_CHIPS.map((chip) => {
    const active = activeChipIds.has(chip.id) ? "active" : "";
    return `<button type="button" class="chip ${active}" data-chip-id="${chip.id}">${chip.label}</button>`;
  }).join("");

  elements.chipGrid.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.chipId;
      if (activeChipIds.has(id)) {
        activeChipIds.delete(id);
        button.classList.remove("active");
      } else {
        activeChipIds.add(id);
        button.classList.add("active");
      }
      persistPrefs({ chips: [...activeChipIds] });
    });
  });
}

function renderStatusFilterButtons() {
  if (!elements.statusFilter) return;
  elements.statusFilter.querySelectorAll(".status-chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.status === activeStatusFilter);
  });
}

function renderCourseToggle() {
  if (!elements.courseToggle) return;
  elements.courseToggle.classList.toggle("active", courseOnly);
}

function collectKeywords() {
  const fromChips = TOPIC_CHIPS.filter((chip) => activeChipIds.has(chip.id)).flatMap((chip) => chip.keywords);
  const fromText = (elements.keywords.value || "")
    .split(/[,\n、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...fromChips, ...fromText])];
}

function formatFollowers(value) {
  if (!value) return "待確認";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

function getPlatforms() {
  return elements.toggles
    .filter((button) => button.classList.contains("active"))
    .map((button) => button.dataset.platform);
}

function stateKeyFor(profile) {
  return (profile.handle || "").toLowerCase();
}

function pipelineFor(profile) {
  return creatorStates[stateKeyFor(profile)]?.pipeline || "new";
}

function profilesMatchingFilter() {
  return mergedProfiles.filter((profile) => {
    const pipeline = pipelineFor(profile);
    // "全部" 隱藏「不合適」— 那些只能在「不合適」分頁下看到。
    // 其他狀態的 filter 都是精確匹配。
    if (activeStatusFilter === "all") {
      if (pipeline === "rejected") return false;
    } else if (pipeline !== activeStatusFilter) {
      return false;
    }
    if (courseOnly && !hasCourseTag(profile)) return false;
    return true;
  });
}

// ----------------- Metrics & status counts -----------------

function renderStatusFilter() {
  if (!elements.statusFilter) return;
  const counts = { all: 0, priority: 0, watchlist: 0, contacted: 0, new: 0, rejected: 0 };
  for (const profile of mergedProfiles) {
    const status = pipelineFor(profile);
    if (counts[status] != null) counts[status] += 1;
  }
  // 「全部」counter 不含「不合適」— 跟 profilesMatchingFilter 的邏輯一致，
  // 避免分子分母對不起來。要看不合適請按專屬 chip。
  counts.all = mergedProfiles.length - counts.rejected;
  elements.statusFilter.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = String(counts[el.dataset.count] || 0);
  });
  renderStatusFilterButtons();

  if (elements.courseToggle) {
    const courseCount = mergedProfiles.filter(hasCourseTag).length;
    const label = elements.courseToggle.querySelector("[data-count='course']");
    if (label) label.textContent = String(courseCount);
    renderCourseToggle();
  }
}

function renderMetrics() {
  const minFollowers = Number(elements.minFollowers.value);
  const maxFollowers = Number(elements.maxFollowers.value);
  const inRange = mergedProfiles.filter((profile) =>
    profile.platforms.some((p) => {
      if (p.followers == null) return true;
      return p.followers >= minFollowers && p.followers <= maxFollowers;
    }),
  ).length;
  const course = mergedProfiles.filter(hasCourseTag).length;
  const priority = mergedProfiles.filter((profile) => pipelineFor(profile) === "priority").length;

  elements.metricTotal.textContent = String(mergedProfiles.length);
  elements.metricRange.textContent = String(inRange);
  elements.metricCourse.textContent = String(course);
  elements.metricPriority.textContent = String(priority);
}

function renderStatus(summary = null, error = "") {
  if (error) {
    elements.crawlStatus.dataset.state = "error";
    elements.crawlStatus.querySelector(".status-pill").textContent = "爬取失敗";
    elements.crawlSummaryText.textContent = error;
    elements.crawlWarningText.textContent = "";
    return;
  }

  if (!summary) {
    elements.crawlStatus.dataset.state = "idle";
    elements.crawlStatus.querySelector(".status-pill").textContent = "等待首次爬取";
    elements.crawlSummaryText.textContent = "尚未執行即時 crawl。";
    elements.crawlWarningText.textContent = "";
    return;
  }

  const refreshed = new Date(summary.refreshedAt).toLocaleString("zh-TW", { hour12: false });
  const cacheLabel = summary.fromCache ? "快取" : "即時";
  elements.crawlStatus.dataset.state = summary.fromCache ? "cached" : "live";
  elements.crawlStatus.querySelector(".status-pill").textContent = `${cacheLabel}爬取完成`;
  elements.crawlSummaryText.textContent =
    `${refreshed} 更新，共跑 ${summary.queriesRun} 組查詢、回收 ${summary.returnedProfiles} 筆候選名單，其中 ${summary.discoveredProfiles} 筆是新爬到的帳號。`;
  elements.crawlWarningText.textContent = summary.warningSummary || "";
}

// ----------------- Cards -----------------

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function editedStampHtml(handle) {
  const meta = creatorStates[handle];
  if (!meta || !meta.updatedBy) return "";
  const who = escapeHtml(meta.updatedBy.displayName || meta.updatedBy.username);
  const when = meta.updatedAt ? formatRelative(new Date(meta.updatedAt)) : "";
  return `<div class="edited-stamp" data-stamp="${handle}">
            <span>最後由 <strong>${who}</strong> 修改</span>
            <span>· ${when}</span>
          </div>`;
}

function renderCards() {
  const visible = profilesMatchingFilter();

  if (!visible.length) {
    let msg = "目前沒有符合搜尋條件的候選人，試試放寬粉絲區間或多勾幾個主題 chip。";
    if (activeStatusFilter !== "all" && !courseOnly) {
      const label = PIPELINE_LABELS[activeStatusFilter] || activeStatusFilter;
      msg = `沒有候選人被標記為「${label}」。在卡片上的「內部狀態」下拉選單裡標記後，就會出現在這裡。`;
    } else if (courseOnly && activeStatusFilter === "all") {
      msg = "目前的候選人都沒有課程合作的標籤，試著放寬主題 chip 或粉絲區間。";
    } else if (courseOnly && activeStatusFilter !== "all") {
      msg = "在目前的「狀態」篩選和「可談課程合作」交集下沒有候選人。試著切換其中一個。";
    }
    elements.cardGrid.innerHTML = `<p class="empty-state">${msg}</p>`;
    return;
  }

  elements.cardGrid.innerHTML = visible
    .map((profile) => {
      const key = stateKeyFor(profile);
      const stored = creatorStates[key] || {};
      const pipeline = stored.pipeline || "new";
      const memo = stored.memo || "";
      const badges = profile.platforms
        .map(
          (p) =>
            `<span class="platform-badge platform-${p.platform}">${p.platform === "instagram" ? "IG" : "Threads"}</span>`,
        )
        .join("");
      const followerBits = profile.platforms
        .map((p) => `${p.platform === "instagram" ? "IG" : "Threads"} ${formatFollowers(p.followers)}`)
        .join(" · ");
      const postsBits = profile.platforms.map((p) => p.posts || "—").join(" / ");
      const platformLinks = profile.platforms
        .map(
          (p) =>
            `<a href="${p.url}" target="_blank" rel="noreferrer">${p.platform === "instagram" ? "Instagram" : "Threads"}</a>`,
        )
        .join("");
      return `
      <article class="card" data-handle="${key}" data-pipeline="${pipeline}">
        <div class="card-top">
          <div>
            <div class="platform-row">${badges}</div>
            <h3>${escapeHtml(profile.name)}</h3>
            <p class="handle">@${escapeHtml(profile.handle)}</p>
          </div>
          <div class="score-pill">${profile.bestScore} 分</div>
        </div>
        <div class="stat-row">
          <div class="stat"><span>粉絲</span><strong>${followerBits || "待確認"}</strong></div>
          <div class="stat"><span>貼文 / 串文</span><strong>${postsBits}</strong></div>
          <div class="stat"><span>合作切角</span><strong>${escapeHtml(profile.collabAngleShort || "—")}</strong></div>
        </div>
        <p class="bio">${escapeHtml(profile.bio || "")}</p>
        <div class="tag-wrap">${(profile.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
        <div class="source-wrap">${(profile.sourceNotes || []).map((item) => `<span class="source-pill">${escapeHtml(item)}</span>`).join("")}</div>
        <div class="link-row">
          ${platformLinks}
          ${profile.website ? `<a href="${profile.website}" target="_blank" rel="noreferrer">個站 / Link in bio</a>` : ""}
        </div>
        <div class="mini-grid">
          <div class="mini-field">
            <label>內部狀態</label>
            <select data-key="${key}" class="pipeline-select">
              <option value="new" ${pipeline === "new" ? "selected" : ""}>${PIPELINE_LABELS.new}</option>
              <option value="priority" ${pipeline === "priority" ? "selected" : ""}>${PIPELINE_LABELS.priority}</option>
              <option value="watchlist" ${pipeline === "watchlist" ? "selected" : ""}>${PIPELINE_LABELS.watchlist}</option>
              <option value="contacted" ${pipeline === "contacted" ? "selected" : ""}>${PIPELINE_LABELS.contacted}</option>
              <option value="rejected" ${pipeline === "rejected" ? "selected" : ""}>${PIPELINE_LABELS.rejected}</option>
            </select>
          </div>
          <div class="mini-field">
            <label>BD 備註</label>
            <textarea data-key="${key}" class="memo-input" rows="3" placeholder="例如：適合做職涯問答、可談課程分潤、先從校園主題切入">${escapeHtml(memo)}</textarea>
          </div>
        </div>
        ${editedStampHtml(key)}
      </article>
    `;
    })
    .join("");

  document.querySelectorAll(".pipeline-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const key = event.target.dataset.key;
      saveCreator(key, { pipeline: event.target.value });
    });
  });

  document.querySelectorAll(".memo-input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const key = event.target.dataset.key;
      const value = event.target.value;
      if (memoTimers.has(key)) clearTimeout(memoTimers.get(key));
      memoTimers.set(
        key,
        setTimeout(() => {
          memoTimers.delete(key);
          saveCreator(key, { memo: value });
        }, 500),
      );
      setSavingState(key, "pending");
    });
  });
}

function setSavingState(handle, state) {
  savingStateByHandle.set(handle, state);
  const card = document.querySelector(`.card[data-handle="${handle}"]`);
  if (!card) return;
  let stamp = card.querySelector(".edited-stamp");
  if (!stamp) {
    stamp = document.createElement("div");
    stamp.className = "edited-stamp";
    stamp.dataset.stamp = handle;
    card.appendChild(stamp);
  }
  let chip = stamp.querySelector(".saving");
  if (!chip) {
    chip = document.createElement("span");
    chip.className = "saving";
    stamp.prepend(chip);
  }
  chip.dataset.state = state;
  chip.textContent =
    state === "pending" ? "儲存中…" : state === "saved" ? "已同步" : state === "error" ? "同步失敗" : "";
  if (state === "saved") {
    setTimeout(() => {
      if (chip && chip.dataset.state === "saved") chip.remove();
    }, 1500);
  }
}

function updateCardStamp(handle) {
  const card = document.querySelector(`.card[data-handle="${handle}"]`);
  if (!card) return;
  const old = card.querySelector(".edited-stamp");
  const html = editedStampHtml(handle).trim();
  if (!html) return;
  const fresh = document.createElement("div");
  fresh.innerHTML = html;
  const newNode = fresh.firstElementChild;
  if (!newNode) return;
  if (old) old.replaceWith(newNode);
  else card.appendChild(newNode);
}

// ----------------- Server mutations -----------------

async function saveCreator(handle, patch) {
  const previous = { ...(creatorStates[handle] || {}) };
  creatorStates[handle] = {
    ...previous,
    ...patch,
    updatedBy: me ? { username: me.username, displayName: me.displayName } : previous.updatedBy,
    updatedAt: new Date().toISOString(),
  };
  if (patch.pipeline !== undefined) {
    renderMetrics();
    renderStatusFilter();
    // Always re-render on pipeline change: "不合適" must disappear from
    // 「全部」immediately, and other pipeline transitions affect filtered
    // views. Cheap enough at this scale.
    renderCards();
  } else {
    updateCardStamp(handle);
  }
  setSavingState(handle, "pending");

  try {
    const row = await api.put(`/api/state/creator/${encodeURIComponent(handle)}`, patch);
    creatorStates[handle] = {
      pipeline: row.pipeline || undefined,
      memo: row.memo || undefined,
      updatedAt: row.updatedAt,
      updatedBy: row.updatedBy,
    };
    updateCardStamp(handle);
    setSavingState(handle, "saved");
    refreshActivity({ silent: true });
  } catch (err) {
    creatorStates[handle] = previous;
    if (patch.pipeline !== undefined) {
      renderMetrics();
      renderStatusFilter();
      renderCards();
    } else {
      updateCardStamp(handle);
    }
    setSavingState(handle, "error");
    console.error("Failed to save creator state", err);
    if (err.status === 401) showLogin("登入已過期，請重新登入。");
  }
}

const prefsQueue = { chips: undefined, statusFilter: undefined, courseOnly: undefined };
let prefsTimer = null;

function persistPrefs(partial) {
  Object.assign(prefsQueue, partial);
  if (prefsTimer) clearTimeout(prefsTimer);
  prefsTimer = setTimeout(flushPrefs, 250);
}

async function flushPrefs() {
  prefsTimer = null;
  const body = {};
  for (const key of Object.keys(prefsQueue)) {
    if (prefsQueue[key] !== undefined) body[key] = prefsQueue[key];
  }
  for (const key of Object.keys(prefsQueue)) prefsQueue[key] = undefined;
  if (Object.keys(body).length === 0) return;
  try {
    await api.put("/api/prefs", body);
  } catch (err) {
    console.error("Failed to save prefs", err);
    if (err.status === 401) showLogin("登入已過期，請重新登入。");
  }
}

// ----------------- Discover -----------------

async function loadProfiles() {
  const keywords = collectKeywords();
  const params = new URLSearchParams({
    keywords: keywords.join(","),
    minFollowers: elements.minFollowers.value,
    maxFollowers: elements.maxFollowers.value,
    platforms: getPlatforms().join(","),
  });

  elements.runSearch.disabled = true;
  elements.runSearch.textContent = "搜尋中...";
  renderStatus(null, "");

  try {
    const data = await api.get(`/api/discover?${params.toString()}`);
    rawProfiles = data.profiles || [];
    mergedProfiles = mergeProfilesByHandle(rawProfiles);
    renderMetrics();
    renderStatusFilter();
    renderCards();
    renderStatus(data.crawlSummary);
  } catch (error) {
    rawProfiles = [];
    mergedProfiles = [];
    renderMetrics();
    renderStatusFilter();
    renderCards();
    renderStatus(null, error.message || "搜尋時發生未知問題");
    if (error.status === 401) showLogin("登入已過期，請重新登入。");
  } finally {
    elements.runSearch.disabled = false;
    elements.runSearch.textContent = "重新搜尋候選創作者";
  }
}

// ----------------- Activity feed -----------------

function startActivityPoller() {
  stopActivityPoller();
  refreshActivity({ silent: true });
  activityPoller = setInterval(() => refreshActivity({ silent: true }), 25000);
}

function stopActivityPoller() {
  if (activityPoller) clearInterval(activityPoller);
  activityPoller = null;
}

async function refreshActivity({ silent } = {}) {
  try {
    const params = new URLSearchParams({ limit: "80" });
    if (activityFilter.username) params.set("user", activityFilter.username);
    if (activityFilter.handle) params.set("handle", activityFilter.handle);
    const data = await api.get(`/api/activity?${params.toString()}`);
    const list = data.activity || [];

    // Track newest unfiltered id so the badge isn't fooled by filters. The
    // server returns newest-first regardless of filter, so any returned id is
    // a valid lower bound — but only when filters are off do we trust it
    // as "latest of everything".
    if (list.length && !activityFilter.username && !activityFilter.handle) {
      latestActivityId = list[0].id;
    }

    // Grow the autocomplete pool from whatever creators show up in activity.
    let suggestionsChanged = false;
    for (const item of list) {
      if (item.handle && !handleSuggestions.has(item.handle)) {
        handleSuggestions.add(item.handle);
        suggestionsChanged = true;
      }
    }
    if (suggestionsChanged) renderHandleDatalist();

    if (!silent || (elements.activityDrawer && !elements.activityDrawer.hidden)) {
      renderActivityList(list);
    }
    updateActivityBadge();
  } catch (err) {
    if (err.status === 401) showLogin("登入已過期，請重新登入。");
  }
}

function normalizeHandleInput(value) {
  return String(value || "").trim().replace(/^@+/, "").toLowerCase();
}

elements.activityFilterUser.addEventListener("change", () => {
  activityFilter.username = elements.activityFilterUser.value;
  refreshActivity();
});

let handleInputTimer = null;
elements.activityFilterHandle.addEventListener("input", () => {
  if (handleInputTimer) clearTimeout(handleInputTimer);
  handleInputTimer = setTimeout(() => {
    activityFilter.handle = normalizeHandleInput(elements.activityFilterHandle.value);
    refreshActivity();
  }, 220);
});

elements.exportCsvBtn.addEventListener("click", async (event) => {
  event.preventDefault();
  const originalText = elements.exportCsvBtn.textContent;
  elements.exportCsvBtn.textContent = "匯出中…";
  try {
    const res = await fetch("/api/export.csv", { credentials: "same-origin" });
    if (res.status === 401) {
      showLogin("登入已過期，請重新登入。");
      return;
    }
    if (!res.ok) throw new Error(`Export failed (${res.status})`);
    const blob = await res.blob();
    const today = new Date().toISOString().slice(0, 10);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `creator-radar-${today}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  } catch (err) {
    console.error("CSV export failed", err);
    alert(`匯出失敗：${err.message || "未知錯誤"}`);
  } finally {
    elements.exportCsvBtn.textContent = originalText;
  }
});

elements.activityFilterClear.addEventListener("click", () => {
  activityFilter = { username: "", handle: "" };
  elements.activityFilterUser.value = "";
  elements.activityFilterHandle.value = "";
  refreshActivity();
});

function updateActivityBadge() {
  const unseen = Math.max(0, latestActivityId - lastSeenActivityId);
  if (unseen > 0) {
    elements.activityBadge.hidden = false;
    elements.activityBadge.textContent = String(unseen);
  } else {
    elements.activityBadge.hidden = true;
  }
}

function renderActivityList(items) {
  if (!items.length) {
    elements.activityList.innerHTML = `<div class="activity-empty">還沒有任何動態，先去標幾位創作者吧。</div>`;
    return;
  }
  elements.activityList.innerHTML = items.map(activityItemHtml).join("");
}

function activityItemHtml(item) {
  const who = escapeHtml(item.user?.displayName || item.user?.username || "未知成員");
  const when = formatRelative(new Date(item.createdAt));
  const handle = escapeHtml(item.handle || "");
  let what = "";
  let extra = "";
  if (item.action === "pipeline") {
    const fromLabel = item.before ? PIPELINE_LABELS[item.before] || item.before : "未標記";
    const toLabel = item.after ? PIPELINE_LABELS[item.after] || item.after : "未標記";
    what = `把 <strong>@${handle}</strong> 從「${escapeHtml(fromLabel)}」改為「${escapeHtml(toLabel)}」`;
  } else if (item.action === "memo") {
    const before = item.before ? String(item.before) : "";
    const after = item.after ? String(item.after) : "";
    if (!before && after) what = `為 <strong>@${handle}</strong> 新增了備註`;
    else if (before && !after) what = `清除了 <strong>@${handle}</strong> 的備註`;
    else what = `更新了 <strong>@${handle}</strong> 的備註`;
    if (after) {
      const truncated = after.length > 240 ? `${after.slice(0, 240)}…` : after;
      extra = `<div class="memo-diff">${escapeHtml(truncated)}</div>`;
    }
  } else {
    what = `操作了 <strong>@${handle}</strong>`;
  }
  return `<div class="activity-item">
            <div class="who">${who}</div>
            <div class="what">${what}</div>
            ${extra}
            <div class="when">${when}</div>
          </div>`;
}

function formatRelative(date) {
  if (!date || Number.isNaN(date.getTime())) return "";
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 30) return "剛剛";
  if (diff < 60) return `${Math.floor(diff)} 秒前`;
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;
  return date.toLocaleString("zh-TW", { hour12: false });
}

function openActivityDrawer() {
  elements.activityDrawer.hidden = false;
  elements.activityDrawer.setAttribute("aria-hidden", "false");
  elements.drawerScrim.hidden = false;
  elements.activityBtn.classList.add("active");
  refreshActivity();
  lastSeenActivityId = latestActivityId;
  updateActivityBadge();
}

function closeActivityDrawer() {
  elements.activityDrawer.hidden = true;
  elements.activityDrawer.setAttribute("aria-hidden", "true");
  elements.drawerScrim.hidden = true;
  elements.activityBtn.classList.remove("active");
}

elements.activityBtn.addEventListener("click", () => {
  if (elements.activityDrawer.hidden) openActivityDrawer();
  else closeActivityDrawer();
});
elements.closeActivity.addEventListener("click", closeActivityDrawer);
elements.drawerScrim.addEventListener("click", closeActivityDrawer);

// ----------------- Top-level UI events -----------------

elements.toggles.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("active");
  });
});

elements.chipsAll.addEventListener("click", () => {
  activeChipIds = new Set(TOPIC_CHIPS.map((chip) => chip.id));
  renderChips();
  persistPrefs({ chips: [...activeChipIds] });
});

elements.chipsNone.addEventListener("click", () => {
  activeChipIds = new Set();
  renderChips();
  persistPrefs({ chips: [...activeChipIds] });
});

elements.chipsReset.addEventListener("click", () => {
  activeChipIds = new Set(TOPIC_CHIPS.filter((chip) => chip.defaultOn).map((chip) => chip.id));
  renderChips();
  persistPrefs({ chips: [...activeChipIds] });
});

elements.runSearch.addEventListener("click", loadProfiles);

if (elements.statusFilter) {
  elements.statusFilter.querySelectorAll(".status-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeStatusFilter = btn.dataset.status;
      renderStatusFilterButtons();
      renderCards();
      persistPrefs({ statusFilter: activeStatusFilter });
    });
  });
}

if (elements.courseToggle) {
  elements.courseToggle.addEventListener("click", () => {
    courseOnly = !courseOnly;
    renderCourseToggle();
    renderStatusFilter();
    renderCards();
    persistPrefs({ courseOnly });
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!elements.passwordModal.hidden) {
    closePasswordModal();
    return;
  }
  if (!elements.activityDrawer.hidden) closeActivityDrawer();
});

boot();
