const stateKey = "internx-creator-radar-state";
const chipPrefKey = "internx-creator-radar-chips";

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

const elements = {
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
};

const statusFilterPrefKey = "internx-creator-radar-status-filter";
let activeStatusFilter = localStorage.getItem(statusFilterPrefKey) || "all";

let savedState = JSON.parse(localStorage.getItem(stateKey) || "{}");
let currentProfiles = [];

function loadChipSelection() {
  try {
    const stored = JSON.parse(localStorage.getItem(chipPrefKey) || "null");
    if (Array.isArray(stored)) return new Set(stored);
  } catch (error) {
    // fall through to defaults
  }
  return new Set(TOPIC_CHIPS.filter((chip) => chip.defaultOn).map((chip) => chip.id));
}

let activeChipIds = loadChipSelection();

function persistChips() {
  localStorage.setItem(chipPrefKey, JSON.stringify([...activeChipIds]));
}

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
      persistChips();
    });
  });
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

function persist() {
  localStorage.setItem(stateKey, JSON.stringify(savedState));
}

function pipelineFor(profile) {
  const key = `${profile.platform}:${profile.handle}`;
  return savedState[key]?.pipeline || "new";
}

function profilesMatchingFilter() {
  if (activeStatusFilter === "all") return currentProfiles;
  return currentProfiles.filter((profile) => pipelineFor(profile) === activeStatusFilter);
}

function renderStatusFilter() {
  if (!elements.statusFilter) return;
  const counts = { all: currentProfiles.length, priority: 0, watchlist: 0, contacted: 0, new: 0 };
  for (const profile of currentProfiles) {
    const status = pipelineFor(profile);
    if (counts[status] != null) counts[status] += 1;
  }
  elements.statusFilter.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = String(counts[el.dataset.count] || 0);
  });
  elements.statusFilter.querySelectorAll(".status-chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.status === activeStatusFilter);
  });
}

function renderMetrics() {
  const inRange = currentProfiles.filter(
    (profile) =>
      !profile.followers ||
      (profile.followers >= Number(elements.minFollowers.value) &&
        profile.followers <= Number(elements.maxFollowers.value)),
  ).length;
  const course = currentProfiles.filter((profile) =>
    profile.tags.some((tag) =>
      ["線上課程", "顧問服務", "講座課程", "求職課程"].includes(tag),
    ),
  ).length;
  const priority = Object.values(savedState).filter(
    (item) => item.pipeline === "priority",
  ).length;

  elements.metricTotal.textContent = String(currentProfiles.length);
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

  const refreshed = new Date(summary.refreshedAt).toLocaleString("zh-TW", {
    hour12: false,
  });
  const cacheLabel = summary.fromCache ? "快取" : "即時";
  elements.crawlStatus.dataset.state = summary.fromCache ? "cached" : "live";
  elements.crawlStatus.querySelector(".status-pill").textContent = `${cacheLabel}爬取完成`;
  elements.crawlSummaryText.textContent =
    `${refreshed} 更新，共跑 ${summary.queriesRun} 組查詢、回收 ${summary.returnedProfiles} 筆候選名單，其中 ${summary.discoveredProfiles} 筆是新爬到的帳號。`;
  elements.crawlWarningText.textContent = summary.warningSummary || "";
}

function renderCards() {
  const visible = profilesMatchingFilter();

  if (!visible.length) {
    if (activeStatusFilter === "all") {
      elements.cardGrid.innerHTML = `<p class="empty-state">目前沒有符合搜尋條件的候選人，試試放寬粉絲區間或多勾幾個主題 chip。</p>`;
    } else {
      const label = { priority: "優先接洽", watchlist: "持續追蹤", contacted: "已接洽", new: "待評估" }[activeStatusFilter] || activeStatusFilter;
      elements.cardGrid.innerHTML = `<p class="empty-state">沒有候選人被標記為「${label}」。在卡片上的「內部狀態」下拉選單裡標記後，就會出現在這裡。</p>`;
    }
    return;
  }

  elements.cardGrid.innerHTML = visible
    .map((profile) => {
      const key = `${profile.platform}:${profile.handle}`;
      const stored = savedState[key] || {};
      return `
      <article class="card">
        <div class="card-top">
          <div>
            <span class="platform-badge">${profile.platform === "instagram" ? "IG" : "Threads"}</span>
            <h3>${profile.name}</h3>
            <p class="handle">@${profile.handle}</p>
          </div>
          <div class="score-pill">${profile.score} 分</div>
        </div>
        <div class="stat-row">
          <div class="stat"><span>粉絲</span><strong>${formatFollowers(profile.followers)}</strong></div>
          <div class="stat"><span>貼文 / 串文</span><strong>${profile.posts || "待確認"}</strong></div>
          <div class="stat"><span>合作切角</span><strong>${profile.collabAngleShort}</strong></div>
        </div>
        <p class="bio">${profile.bio}</p>
        <div class="tag-wrap">${(profile.tags || []).map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
        <div class="source-wrap">${(profile.sourceNotes || []).map((item) => `<span class="source-pill">${item}</span>`).join("")}</div>
        <div class="link-row">
          <a href="${profile.url}" target="_blank" rel="noreferrer">開啟檔案</a>
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
            <textarea data-key="${key}" class="memo-input" rows="3" placeholder="例如：適合做職涯問答、可談課程分潤、先從校園主題切入">${stored.memo || ""}</textarea>
          </div>
        </div>
      </article>
    `;
    })
    .join("");

  document.querySelectorAll(".pipeline-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const key = event.target.dataset.key;
      savedState[key] = { ...(savedState[key] || {}), pipeline: event.target.value };
      persist();
      renderMetrics();
      renderStatusFilter();
      if (activeStatusFilter !== "all") {
        renderCards();
      }
    });
  });

  document.querySelectorAll(".memo-input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const key = event.target.dataset.key;
      savedState[key] = { ...(savedState[key] || {}), memo: event.target.value };
      persist();
    });
  });
}

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
    const response = await fetch(`/api/discover?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "搜尋服務暫時無法使用");
    }

    currentProfiles = data.profiles || [];
    renderMetrics();
    renderStatusFilter();
    renderCards();
    renderStatus(data.crawlSummary);
  } catch (error) {
    currentProfiles = [];
    renderMetrics();
    renderStatusFilter();
    renderCards();
    renderStatus(null, error.message || "搜尋時發生未知問題");
  } finally {
    elements.runSearch.disabled = false;
    elements.runSearch.textContent = "重新搜尋候選創作者";
  }
}

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

elements.runSearch.addEventListener("click", loadProfiles);

if (elements.statusFilter) {
  elements.statusFilter.querySelectorAll(".status-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeStatusFilter = btn.dataset.status;
      localStorage.setItem(statusFilterPrefKey, activeStatusFilter);
      renderStatusFilter();
      renderCards();
    });
  });
}

renderChips();
loadProfiles();
