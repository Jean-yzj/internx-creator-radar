const stateKey = "internx-creator-radar-state";
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

const pipelineOptions = [
  { value: "new", label: "待評估" },
  { value: "priority", label: "優先接洽" },
  { value: "watchlist", label: "持續追蹤" },
  { value: "contacted", label: "已接洽" },
];

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
};

let savedState = JSON.parse(localStorage.getItem(stateKey) || "{}");
let currentProfiles = [];
let crawlSummary = null;
let activeView = window.location.hash.replace("#", "") || "overview";

function formatFollowers(value) {
  if (!value && value !== 0) return "待確認";
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

function persist() {
  localStorage.setItem(stateKey, JSON.stringify(savedState));
}

function getPlatforms() {
  return elements.toggles
    .filter((button) => button.classList.contains("active"))
    .map((button) => button.dataset.platform);
}

function getProfileKey(profile) {
  return `${profile.platform}:${profile.handle}`;
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
    button.classList.toggle(
      "active",
      button.dataset.viewTarget === nextView,
    );
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

function renderMetrics() {
  const inRange = currentProfiles.filter(
    (profile) =>
      !profile.followers ||
      (profile.followers >= Number(elements.minFollowers.value) &&
        profile.followers <= Number(elements.maxFollowers.value)),
  ).length;
  const course = currentProfiles.filter((profile) =>
    profile.tags?.some((tag) =>
      ["線上課程", "顧問服務", "講座課程", "求職課程"].includes(tag),
    ),
  ).length;

  elements.metricTotal.textContent = String(currentProfiles.length);
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

function renderTopCandidates() {
  const topProfiles = currentProfiles.slice(0, 4);
  elements.topCandidates.innerHTML = topProfiles.length
    ? topProfiles
        .map(
          (profile) => `
        <article class="list-card">
          <div>
            <div class="list-head">
              <span class="platform-badge">${profile.platform === "instagram" ? "IG" : "Threads"}</span>
              <strong>${profile.name}</strong>
            </div>
            <p>@${profile.handle}</p>
          </div>
          <div class="list-meta">
            <span>${formatFollowers(profile.followers)} 粉絲</span>
            <span>${profile.score} 分</span>
          </div>
        </article>
      `,
        )
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
    {
      label: "查詢數",
      value: crawlSummary.queriesRun,
      hint: "本次跑出的搜尋組數",
    },
    {
      label: "回收名單",
      value: crawlSummary.returnedProfiles,
      hint: "可進入工作台檢查的候選數",
    },
    {
      label: "新帳號",
      value: crawlSummary.discoveredProfiles,
      hint: "不是種子名單的即時發現",
    },
    {
      label: "提示數",
      value: crawlSummary.warningCount || 0,
      hint: "不影響主要名單的外部來源提醒",
    },
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
      body:
        crawlSummary.warningSummary ||
        "這次同步沒有額外提醒，公開資料流程順利完成。",
    },
    {
      title: "資料來源",
      body: crawlSummary.cseEnabled
        ? "目前同時檢查種子名單、DuckDuckGo 公開搜尋與 Google CSE。"
        : "目前以種子名單與 DuckDuckGo 公開搜尋為主，Google CSE 尚未啟用。",
    },
    {
      title: "手機版體驗",
      body:
        "搜尋頁只保留必要欄位與摘要狀態，避免手機螢幕上直接出現冗長錯誤網址。",
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
  elements.cardGrid.innerHTML = currentProfiles.length
    ? currentProfiles
        .map((profile) => {
          const profileKey = getProfileKey(profile);
          const stored = savedState[profileKey] || {};
          return `
          <article class="card">
            <div class="card-top">
              <div>
                <div class="list-head">
                  <span class="platform-badge">${profile.platform === "instagram" ? "IG" : "Threads"}</span>
                  <h3>${profile.name}</h3>
                </div>
                <p class="handle">@${profile.handle}</p>
              </div>
              <div class="score-pill">${profile.score} 分</div>
            </div>

            <div class="stat-row">
              <div class="stat">
                <span>粉絲</span>
                <strong>${formatFollowers(profile.followers)}</strong>
              </div>
              <div class="stat">
                <span>貼文 / 串文</span>
                <strong>${profile.posts || "待確認"}</strong>
              </div>
              <div class="stat">
                <span>合作切角</span>
                <strong>${profile.collabAngleShort || "內容共創"}</strong>
              </div>
            </div>

            <p class="bio">${profile.bio}</p>

            <div class="tag-wrap">
              ${(profile.tags || [])
                .slice(0, 6)
                .map((tag) => `<span class="tag">${tag}</span>`)
                .join("")}
            </div>

            <div class="source-wrap">
              ${(profile.sourceNotes || [])
                .slice(0, 3)
                .map((item) => `<span class="source-pill">${item}</span>`)
                .join("")}
            </div>

            <div class="link-row">
              <a href="${profile.url}" target="_blank" rel="noreferrer">開啟公開頁面</a>
              ${
                profile.website
                  ? `<a href="${profile.website}" target="_blank" rel="noreferrer">個站 / Link in bio</a>`
                  : ""
              }
            </div>

            <div class="mini-grid">
              <div class="mini-field">
                <label>內部狀態</label>
                <select data-key="${profileKey}" class="pipeline-select">
                  ${pipelineOptions
                    .map(
                      (option) => `
                    <option value="${option.value}" ${
                        stored.pipeline === option.value ||
                        (!stored.pipeline && option.value === "new")
                          ? "selected"
                          : ""
                      }>${option.label}</option>
                  `,
                    )
                    .join("")}
                </select>
              </div>

              <div class="mini-field">
                <label>BD 備註</label>
                <textarea
                  data-key="${profileKey}"
                  class="memo-input"
                  rows="3"
                  placeholder="例如：先談校園履歷主題、適合直播問答、可談課程分潤"
                >${stored.memo || ""}</textarea>
              </div>
            </div>
          </article>
        `;
        })
        .join("")
    : `
      <article class="empty-card">
        <strong>目前沒有符合條件的候選人</strong>
        <p>先調整搜尋主題或粉絲區間，再重新跑一次探索搜尋。</p>
      </article>
    `;

  document.querySelectorAll(".pipeline-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const key = event.target.dataset.key;
      savedState[key] = { ...(savedState[key] || {}), pipeline: event.target.value };
      persist();
      renderMetrics();
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

function renderEverything() {
  renderMetrics();
  renderTopCandidates();
  renderCards();
  renderCrawlerPage();
  renderStatus(crawlSummary);
}

async function loadProfiles(options = {}) {
  const { jumpToWorkspace = false } = options;
  const params = new URLSearchParams({
    keywords: elements.keywords.value,
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
    crawlSummary = data.crawlSummary || null;
    renderEverything();
    if (jumpToWorkspace) {
      setActiveView("workspace");
    }
  } catch (error) {
    currentProfiles = [];
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

window.addEventListener("hashchange", () => {
  const nextView = window.location.hash.replace("#", "") || "overview";
  setActiveView(nextView);
});

elements.runSearch.addEventListener("click", () => {
  loadProfiles({ jumpToWorkspace: true });
});

renderEverything();
setActiveView(activeView);
loadProfiles();
