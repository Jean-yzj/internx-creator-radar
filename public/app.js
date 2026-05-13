const stateKey = "internx-creator-radar-state";
const chipPrefKey = "internx-creator-radar-chips";
const statusFilterPrefKey = "internx-creator-radar-status-filter";
const courseOnlyPrefKey = "internx-creator-radar-course-only";
const stateMigrationFlagKey = "internx-creator-radar-state-migrated-v2";

const pageMeta = {
  overview: {
    eyebrow: "總覽",
    title: "手機版 Creator Radar",
    hint: "快速掌握合作名單狀態",
  },
  discover: {
    eyebrow: "探索搜尋",
    title: "公開資料探索",
    hint: "重跑爬取並整理新候選人",
  },
  workspace: {
    eyebrow: "合作工作台",
    title: "逐一評估候選創作者",
    hint: "保留單手可操作的卡片工作流",
  },
  crawler: {
    eyebrow: "爬取狀態",
    title: "同步品質與資料來源",
    hint: "確認本次搜尋是否抓到新名單",
  },
};

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

const COURSE_TAGS = new Set([
  "線上課程",
  "顧問服務",
  "講座課程",
  "求職課程",
  "課程顧問",
  "企業內訓",
]);
const PIPELINE_ORDER = { contacted: 4, priority: 3, watchlist: 2, new: 1 };

const elements = {
  pageEyebrow: document.getElementById("pageEyebrow"),
  pageTitle: document.getElementById("pageTitle"),
  pageHint: document.getElementById("pageHint"),
  menuToggle: document.getElementById("menuToggle"),
  sidebar: document.getElementById("sidebar"),
  sidebarOverlay: document.getElementById("sidebarOverlay"),
  navItems: [...document.querySelectorAll(".nav-item")],
  jumpButtons: [...document.querySelectorAll("[data-jump-view]")],
  viewPanels: [...document.querySelectorAll(".view-panel")],
  keywords: document.getElementById("keywords"),
  minFollowers: document.getElementById("minFollowers"),
  maxFollowers: document.getElementById("maxFollowers"),
  runSearch: document.getElementById("runSearch"),
  cardGrid: document.getElementById("cardGrid"),
  topCandidates: document.getElementById("topCandidates"),
  crawlMetrics: document.getElementById("crawlMetrics"),
  crawlDetails: document.getElementById("crawlDetails"),
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

let activeStatusFilter = localStorage.getItem(statusFilterPrefKey) || "all";
let courseOnly = localStorage.getItem(courseOnlyPrefKey) === "1";
let savedState = JSON.parse(localStorage.getItem(stateKey) || "{}");
let activeView = window.location.hash.replace("#", "") || "overview";
let activeChipIds = loadChipSelection();
let rawProfiles = [];
let mergedProfiles = [];
let crawlSummary = null;

if (!localStorage.getItem(stateMigrationFlagKey)) {
  const migrated = {};
  for (const [key, value] of Object.entries(savedState)) {
    const handle = (key.includes(":") ? key.split(":").pop() : key).toLowerCase();
    if (!migrated[handle]) {
      migrated[handle] = { ...value };
      continue;
    }

    const existing = migrated[handle];
    const newPipelineRank = PIPELINE_ORDER[value.pipeline] || 0;
    const existingPipelineRank = PIPELINE_ORDER[existing.pipeline] || 0;
    if (newPipelineRank > existingPipelineRank) existing.pipeline = value.pipeline;

    const memos = [existing.memo, value.memo].filter(Boolean);
    if (memos.length === 2 && memos[0] !== memos[1]) {
      existing.memo = memos.join("\n---\n");
    } else if (memos[0]) {
      existing.memo = memos[0];
    }
  }

  savedState = migrated;
  localStorage.setItem(stateKey, JSON.stringify(savedState));
  localStorage.setItem(stateMigrationFlagKey, "1");
}

function loadChipSelection() {
  try {
    const stored = JSON.parse(localStorage.getItem(chipPrefKey) || "null");
    if (Array.isArray(stored)) return new Set(stored);
  } catch (error) {
    // fall through to defaults
  }

  return new Set(TOPIC_CHIPS.filter((chip) => chip.defaultOn).map((chip) => chip.id));
}

function persist() {
  localStorage.setItem(stateKey, JSON.stringify(savedState));
}

function persistChips() {
  localStorage.setItem(chipPrefKey, JSON.stringify([...activeChipIds]));
}

function formatFollowers(value) {
  if (value == null || value === "") return "待確認";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

function getPlatforms() {
  return elements.toggles
    .filter((button) => button.classList.contains("active"))
    .map((button) => button.dataset.platform);
}

function getStoredPipelineCount(target) {
  return Object.values(savedState).filter((item) => item.pipeline === target).length;
}

function setSidebarOpen(isOpen) {
  document.body.classList.toggle("sidebar-open", isOpen);
}

function setActiveView(view) {
  const nextView = pageMeta[view] ? view : "overview";
  activeView = nextView;
  window.location.hash = nextView;

  elements.navItems.forEach((button) => {
    button.classList.toggle("active", button.dataset.viewTarget === nextView);
  });

  elements.viewPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.view === nextView);
  });

  const meta = pageMeta[nextView];
  elements.pageEyebrow.textContent = meta.eyebrow;
  elements.pageTitle.textContent = meta.title;
  elements.pageHint.textContent = meta.hint;

  setSidebarOpen(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function mergeProfilesByHandle(profiles) {
  const map = new Map();

  for (const profile of profiles) {
    const key = (profile.handle || "").toLowerCase();
    if (!key) continue;

    const platformEntry = {
      platform: profile.platform,
      url: profile.url,
      followers: profile.followers,
      posts: profile.posts,
    };

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        handle: profile.handle,
        name: profile.name,
        bio: profile.bio || "",
        collabAngleShort: profile.collabAngleShort || "",
        website: profile.website || "",
        platforms: [platformEntry],
        tags: [...(profile.tags || [])],
        sourceNotes: [...(profile.sourceNotes || [])],
        bestScore: Number(profile.score) || 0,
        totalMatched: Number(profile.matchedKeywords) || 0,
      });
      continue;
    }

    existing.platforms.push(platformEntry);
    if ((profile.bio || "").length > (existing.bio || "").length) existing.bio = profile.bio;
    if ((profile.name || "").length > (existing.name || "").length) existing.name = profile.name;
    if (!existing.website && profile.website) existing.website = profile.website;
    if (!existing.collabAngleShort && profile.collabAngleShort) {
      existing.collabAngleShort = profile.collabAngleShort;
    }
    existing.tags = [...new Set([...existing.tags, ...(profile.tags || [])])];
    existing.sourceNotes = [...new Set([...existing.sourceNotes, ...(profile.sourceNotes || [])])];
    existing.bestScore = Math.max(existing.bestScore, Number(profile.score) || 0);
    existing.totalMatched += Number(profile.matchedKeywords) || 0;
  }

  for (const profile of map.values()) {
    profile.platforms.sort((a, b) => {
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

function collectKeywords() {
  const fromChips = TOPIC_CHIPS.filter((chip) => activeChipIds.has(chip.id)).flatMap(
    (chip) => chip.keywords,
  );
  const fromText = (elements.keywords.value || "")
    .split(/[,\n、\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return [...new Set([...fromChips, ...fromText])];
}

function renderChips() {
  elements.chipGrid.innerHTML = TOPIC_CHIPS.map((chip) => {
    const active = activeChipIds.has(chip.id) ? "active" : "";
    return `<button type="button" class="chip ${active}" data-chip-id="${chip.id}">${chip.label}</button>`;
  }).join("");

  elements.chipGrid.querySelectorAll(".chip").forEach((button) => {
    button.addEventListener("click", () => {
      const { chipId } = button.dataset;
      if (activeChipIds.has(chipId)) {
        activeChipIds.delete(chipId);
        button.classList.remove("active");
      } else {
        activeChipIds.add(chipId);
        button.classList.add("active");
      }
      persistChips();
    });
  });
}

function stateKeyFor(profile) {
  return (profile.handle || "").toLowerCase();
}

function pipelineFor(profile) {
  return savedState[stateKeyFor(profile)]?.pipeline || "new";
}

function profilesMatchingFilter() {
  return mergedProfiles.filter((profile) => {
    if (activeStatusFilter !== "all" && pipelineFor(profile) !== activeStatusFilter) return false;
    if (courseOnly && !hasCourseTag(profile)) return false;
    return true;
  });
}

function renderStatusFilter() {
  if (!elements.statusFilter) return;

  const counts = { all: mergedProfiles.length, priority: 0, watchlist: 0, contacted: 0, new: 0 };
  for (const profile of mergedProfiles) {
    const status = pipelineFor(profile);
    if (counts[status] != null) counts[status] += 1;
  }

  elements.statusFilter.querySelectorAll("[data-count]").forEach((element) => {
    element.textContent = String(counts[element.dataset.count] || 0);
  });

  elements.statusFilter.querySelectorAll(".status-chip").forEach((button) => {
    button.classList.toggle("active", button.dataset.status === activeStatusFilter);
  });

  if (elements.courseToggle) {
    const courseCount = mergedProfiles.filter(hasCourseTag).length;
    const courseLabel = elements.courseToggle.querySelector("[data-count='course']");
    if (courseLabel) courseLabel.textContent = String(courseCount);
    elements.courseToggle.classList.toggle("active", courseOnly);
  }
}

function renderMetrics() {
  const minFollowers = Number(elements.minFollowers.value);
  const maxFollowers = Number(elements.maxFollowers.value);

  const inRange = mergedProfiles.filter((profile) =>
    profile.platforms.some((platform) => {
      if (platform.followers == null) return true;
      return platform.followers >= minFollowers && platform.followers <= maxFollowers;
    }),
  ).length;
  const course = mergedProfiles.filter(hasCourseTag).length;

  elements.metricTotal.textContent = String(mergedProfiles.length);
  elements.metricRange.textContent = String(inRange);
  elements.metricCourse.textContent = String(course);
  elements.metricPriority.textContent = String(getStoredPipelineCount("priority"));
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

function renderTopCandidates() {
  const topProfiles = mergedProfiles.slice(0, 4);
  elements.topCandidates.innerHTML = topProfiles.length
    ? topProfiles
        .map((profile) => {
          const badges = profile.platforms
            .map(
              (platform) =>
                `<span class="platform-badge platform-${platform.platform}">${platform.platform === "instagram" ? "IG" : "Threads"}</span>`,
            )
            .join("");
          const followerBits = profile.platforms
            .map((platform) => `${platform.platform === "instagram" ? "IG" : "Threads"} ${formatFollowers(platform.followers)}`)
            .join(" · ");

          return `
            <article class="list-card">
              <div>
                <div class="list-head">
                  <div class="platform-row">${badges}</div>
                  <strong>${profile.name}</strong>
                </div>
                <p>@${profile.handle}</p>
              </div>
              <div class="list-meta">
                <span>${followerBits || "粉絲待確認"}</span>
                <span>${profile.bestScore} 分</span>
              </div>
            </article>
          `;
        })
        .join("")
    : `
      <article class="empty-card">
        <strong>尚未有候選名單</strong>
        <p>先去「探索搜尋」跑一次公開爬取，就會在這裡看到優先名單。</p>
      </article>
    `;
}

function renderCrawlerPage() {
  if (!crawlSummary) {
    elements.crawlMetrics.innerHTML = `
      <article class="metric-card">
        <span>同步狀態</span>
        <strong>尚未開始</strong>
        <p>先去探索搜尋執行一次爬取。</p>
      </article>
    `;
    elements.crawlDetails.innerHTML = `
      <article class="empty-card">
        <strong>還沒有同步紀錄</strong>
        <p>完成第一次搜尋後，這裡會顯示查詢數、回收名單數與警告摘要。</p>
      </article>
    `;
    return;
  }

  elements.crawlMetrics.innerHTML = [
    { label: "查詢數", value: crawlSummary.queriesRun, hint: "本次跑出的搜尋組數" },
    { label: "回收名單", value: crawlSummary.returnedProfiles, hint: "可進入工作台檢查的候選數" },
    { label: "新帳號", value: crawlSummary.discoveredProfiles, hint: "不是種子名單的即時發現" },
    { label: "提示數", value: crawlSummary.warningCount || 0, hint: "不影響主要名單的外部來源提醒" },
  ]
    .map(
      (item) => `
        <article class="metric-card compact-card">
          <span>${item.label}</span>
          <strong>${item.value}</strong>
          <p>${item.hint}</p>
        </article>
      `,
    )
    .join("");

  elements.crawlDetails.innerHTML = [
    {
      title: "同步摘要",
      body: crawlSummary.warningSummary || "這次同步沒有額外提醒，公開資料流程順利完成。",
    },
    {
      title: "資料來源",
      body: crawlSummary.cseEnabled
        ? "目前同時檢查種子名單、DuckDuckGo 公開搜尋與 Google CSE。"
        : "目前以種子名單與 DuckDuckGo 公開搜尋為主，Google CSE 尚未啟用。",
    },
    {
      title: "手機版體驗",
      body: "搜尋頁只保留必要欄位與摘要狀態，避免手機螢幕上直接出現冗長錯誤網址。",
    },
  ]
    .map(
      (item) => `
        <article class="list-card detail-card">
          <strong>${item.title}</strong>
          <p>${item.body}</p>
        </article>
      `,
    )
    .join("");
}

function renderCards() {
  const visible = profilesMatchingFilter();

  if (!visible.length) {
    let message = "目前沒有符合搜尋條件的候選人，試試放寬粉絲區間或多勾幾個主題 chip。";
    if (activeStatusFilter !== "all" && !courseOnly) {
      const label =
        {
          priority: "優先接洽",
          watchlist: "持續追蹤",
          contacted: "已接洽",
          new: "待評估",
        }[activeStatusFilter] || activeStatusFilter;
      message = `沒有候選人被標記為「${label}」。在卡片上的「內部狀態」下拉選單裡標記後，就會出現在這裡。`;
    } else if (courseOnly && activeStatusFilter === "all") {
      message = "目前的候選人都沒有課程合作的標籤，試著放寬主題 chip 或粉絲區間。";
    } else if (courseOnly && activeStatusFilter !== "all") {
      message = "在目前的「狀態」篩選和「可談課程合作」交集下沒有候選人。試著切換其中一個。";
    }

    elements.cardGrid.innerHTML = `<p class="empty-state">${message}</p>`;
    return;
  }

  elements.cardGrid.innerHTML = visible
    .map((profile) => {
      const key = stateKeyFor(profile);
      const stored = savedState[key] || {};
      const badges = profile.platforms
        .map(
          (platform) =>
            `<span class="platform-badge platform-${platform.platform}">${platform.platform === "instagram" ? "IG" : "Threads"}</span>`,
        )
        .join("");
      const followerBits = profile.platforms
        .map((platform) => `${platform.platform === "instagram" ? "IG" : "Threads"} ${formatFollowers(platform.followers)}`)
        .join(" · ");
      const postsBits = profile.platforms.map((platform) => platform.posts || "—").join(" / ");
      const platformLinks = profile.platforms
        .map(
          (platform) =>
            `<a href="${platform.url}" target="_blank" rel="noreferrer">${platform.platform === "instagram" ? "Instagram" : "Threads"}</a>`,
        )
        .join("");
      return `
        <article class="card">
          <div class="card-top">
            <div>
              <div class="platform-row">${badges}</div>
              <h3>${profile.name}</h3>
              <p class="handle">@${profile.handle}</p>
            </div>
            <div class="score-pill">${profile.bestScore} 分</div>
          </div>
          <div class="stat-row">
            <div class="stat"><span>粉絲</span><strong>${followerBits || "待確認"}</strong></div>
            <div class="stat"><span>貼文 / 串文</span><strong>${postsBits}</strong></div>
            <div class="stat"><span>合作切角</span><strong>${profile.collabAngleShort || "—"}</strong></div>
          </div>
          <p class="bio">${profile.bio}</p>
          <div class="tag-wrap">${(profile.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
          <div class="source-wrap">${(profile.sourceNotes || []).map((item) => `<span class="source-pill">${item}</span>`).join("")}</div>
          <div class="link-row">
            ${platformLinks}
            ${profile.website ? `<a href="${profile.website}" target="_blank" rel="noreferrer">個站 / Link in bio</a>` : ""}
          </div>
          <div class="mini-grid">
            <div class="mini-field">
              <label>內部狀態</label>
              <select data-key="${key}" class="pipeline-select">
                <option value="new" ${stored.pipeline === "new" || !stored.pipeline ? "selected" : ""}>待評估</option>
                <option value="priority" ${stored.pipeline === "priority" ? "selected" : ""}>優先接洽</option>
                <option value="watchlist" ${stored.pipeline === "watchlist" ? "selected" : ""}>持續追蹤</option>
                <option value="contacted" ${stored.pipeline === "contacted" ? "selected" : ""}>已接洽</option>
              </select>
            </div>
            <div class="mini-field">
              <label>BD 備註</label>
              <textarea
                data-key="${key}"
                class="memo-input"
                rows="3"
                placeholder="例如：適合做職涯問答、可談課程分潤、先從校園主題切入"
              >${stored.memo || ""}</textarea>
            </div>
          </div>
        </article>
      `;
    })
    .join("");

  document.querySelectorAll(".pipeline-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const { key } = event.target.dataset;
      savedState[key] = { ...(savedState[key] || {}), pipeline: event.target.value };
      persist();
      renderMetrics();
      renderStatusFilter();
      if (activeStatusFilter !== "all" || courseOnly) renderCards();
    });
  });

  document.querySelectorAll(".memo-input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const { key } = event.target.dataset;
      savedState[key] = { ...(savedState[key] || {}), memo: event.target.value };
      persist();
    });
  });
}

function renderEverything() {
  renderMetrics();
  renderStatusFilter();
  renderTopCandidates();
  renderCards();
  renderCrawlerPage();
  renderStatus(crawlSummary);
}

async function loadProfiles(options = {}) {
  const { jumpToWorkspace = false } = options;
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
    const response = await fetch(`/api/discover?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "搜尋服務暫時無法使用");
    }

    rawProfiles = data.profiles || [];
    mergedProfiles = mergeProfilesByHandle(rawProfiles);
    crawlSummary = data.crawlSummary || null;
    renderEverything();
    if (jumpToWorkspace) setActiveView("workspace");
  } catch (error) {
    rawProfiles = [];
    mergedProfiles = [];
    crawlSummary = null;
    renderEverything();
    renderStatus(null, error.message || "搜尋時發生未知問題");
  } finally {
    elements.runSearch.disabled = false;
    elements.runSearch.textContent = "重新搜尋候選創作者";
  }
}

elements.menuToggle.addEventListener("click", () => {
  setSidebarOpen(!document.body.classList.contains("sidebar-open"));
});

elements.sidebarOverlay.addEventListener("click", () => {
  setSidebarOpen(false);
});

elements.navItems.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.viewTarget);
  });
});

elements.jumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveView(button.dataset.jumpView);
  });
});

elements.toggles.forEach((button) => {
  button.addEventListener("click", () => {
    button.classList.toggle("active");
  });
});

elements.chipsAll.addEventListener("click", () => {
  activeChipIds = new Set(TOPIC_CHIPS.map((chip) => chip.id));
  persistChips();
  renderChips();
});

elements.chipsNone.addEventListener("click", () => {
  activeChipIds = new Set();
  persistChips();
  renderChips();
});

elements.chipsReset.addEventListener("click", () => {
  activeChipIds = new Set(TOPIC_CHIPS.filter((chip) => chip.defaultOn).map((chip) => chip.id));
  persistChips();
  renderChips();
});

elements.runSearch.addEventListener("click", () => {
  loadProfiles({ jumpToWorkspace: true });
});

if (elements.statusFilter) {
  elements.statusFilter.querySelectorAll(".status-chip").forEach((button) => {
    button.addEventListener("click", () => {
      activeStatusFilter = button.dataset.status;
      localStorage.setItem(statusFilterPrefKey, activeStatusFilter);
      renderStatusFilter();
      renderCards();
    });
  });
}

if (elements.courseToggle) {
  elements.courseToggle.addEventListener("click", () => {
    courseOnly = !courseOnly;
    localStorage.setItem(courseOnlyPrefKey, courseOnly ? "1" : "0");
    renderStatusFilter();
    renderCards();
  });
}

window.addEventListener("hashchange", () => {
  setActiveView(window.location.hash.replace("#", "") || "overview");
});

renderChips();
setActiveView(activeView);
loadProfiles();
