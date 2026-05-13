const stateKey = "internx-creator-radar-state";
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
};

let savedState = JSON.parse(localStorage.getItem(stateKey) || "{}");
let currentProfiles = [];

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
  elements.crawlWarningText.textContent = (summary.warnings || []).slice(0, 3).join("；");
}

function renderCards() {
  elements.cardGrid.innerHTML = currentProfiles
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
    renderMetrics();
    renderCards();
    renderStatus(data.crawlSummary);
  } catch (error) {
    currentProfiles = [];
    renderMetrics();
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

elements.runSearch.addEventListener("click", loadProfiles);
loadProfiles();
