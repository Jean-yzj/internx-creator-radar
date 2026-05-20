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
  kanban: document.getElementById("kanban"),
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
  tagChips: document.getElementById("tagChips"),
  resultCount: document.getElementById("resultCount"),
  viewToggles: [...document.querySelectorAll(".view-toggle-item")],
  sortBy: document.getElementById("sortBy"),
  copyCsv: document.getElementById("copyCsv"),
  downloadCsv: document.getElementById("downloadCsv"),
  toast: document.getElementById("toast"),
  manualAddToggle: document.getElementById("manualAddToggle"),
  manualAddForm: document.getElementById("manualAddForm"),
  manualAddUrl: document.getElementById("manualAddUrl"),
  manualAddCancel: document.getElementById("manualAddCancel"),
  manualAddStatus: document.getElementById("manualAddStatus"),
};

const DM_TEMPLATES = [
  {
    id: "course",
    label: "課程合作",
    tagHints: ["線上課程", "求職課程", "工作坊", "講座課程", "企業內訓", "課程顧問"],
    body: ({ name, topic }) =>
      `Hi ${name} 👋\n\n我是實習通（InternX）的 BD，最近常看到你分享 ${topic} 的內容，特別欣賞你在課程／工作坊累積的深度教材。\n\n我們聚集 5 萬+ 大學生與新鮮人，想跟你聊聊有沒有機會把現有課程上架到實習通的學習區，或做聯名企劃 / 學員限定優惠碼。\n\n方便加 LINE 細聊嗎？我這邊可以先準備幾種合作版本給你看。`,
  },
  {
    id: "consult",
    label: "顧問 / 直播 QA",
    tagHints: ["顧問服務", "職涯諮詢", "Life Coach", "履歷面試"],
    body: ({ name, topic }) =>
      `Hi ${name}！\n\n我是實習通的 BD，看到你在 ${topic} 的觀點很實戰、學員回饋都很正面。\n\n想邀請你和我們合辦一場「履歷面試 QA 直播」或小型線上工作坊，目標族群是 22-28 歲的求職者，流量導入和學員招生交給我們，你只要專心做內容。\n\n有空週內聊 15 分鐘嗎？`,
  },
  {
    id: "recruiter",
    label: "招聘視角專欄",
    tagHints: ["招聘視角", "HR", "獵頭"],
    body: ({ name, topic }) =>
      `Hi ${name}！\n\n我是實習通的 BD，你從 HR / 招聘端分享的 ${topic} 觀點很有差異化，學員需要這種「面試官真實視角」的內容。\n\n想跟你討論「招聘端觀點」內容專欄合作：我們提供平台曝光與企業端題材，你提供面試官 / HR 的真實判斷邏輯。也可以延伸做企業內訓媒合。\n\n要不要先約個 15 分鐘線上聊？`,
  },
  {
    id: "content",
    label: "內容共創",
    tagHints: [],
    body: ({ name, topic }) =>
      `Hi ${name}！\n\n我是實習通的 BD，最近看你分享 ${topic} 的內容很對我們學員的胃口。\n\n想討論看看內容共創的可能（共同企劃 Reels、Threads 串、聯名活動），我們可以提供題材方向和學員社群曝光。\n\n方便加 LINE 細聊嗎？`,
  },
];

const TOPIC_LABELS = {
  履歷面試: "履歷面試",
  求職課程: "求職教學",
  線上課程: "線上課程",
  顧問服務: "職涯顧問",
  職涯諮詢: "職涯諮詢",
  招聘視角: "招聘端觀點",
  個人品牌: "個人品牌",
  "Life Coach": "Life Coach",
  自由工作: "自由工作",
  產業觀點: "產業觀察",
};

function pickTemplateId(tags = []) {
  for (const template of DM_TEMPLATES) {
    if (template.tagHints.some((hint) => tags.includes(hint))) return template.id;
  }
  return "content";
}

function topicFor(profile) {
  const tags = profile.tags || [];
  for (const tag of tags) {
    if (TOPIC_LABELS[tag]) return TOPIC_LABELS[tag];
  }
  return tags[0] || "職涯內容";
}

function activitySignal(profile) {
  let maxPosts = 0;
  let maxFollowers = 0;
  for (const p of profile.platforms || []) {
    const postsNum = parseInt(String(p.posts || "").replace(/[^0-9]/g, ""), 10) || 0;
    if (postsNum > maxPosts) maxPosts = postsNum;
    if (p.followers && p.followers > maxFollowers) maxFollowers = p.followers;
  }
  if (!maxPosts) return null;
  if (maxPosts >= 300) {
    return { level: "high", label: `高活躍 ${maxPosts}+ 篇`, note: "持續產出，穩定更新節奏" };
  }
  if (maxPosts >= 80) {
    return { level: "mid", label: `穩定更新 ${maxPosts} 篇`, note: "已建立內容節奏，適合外洽" };
  }
  return { level: "early", label: `早期帳號 ${maxPosts} 篇`, note: "內容尚少，可作長期觀察名單" };
}

const statusFilterPrefKey = "internx-creator-radar-status-filter";
const courseOnlyPrefKey = "internx-creator-radar-course-only";
const stateMigrationFlagKey = "internx-creator-radar-state-migrated-v2";
const viewModePrefKey = "internx-creator-radar-view";
const sortByPrefKey = "internx-creator-radar-sort";

const PIPELINE_COLUMNS = [
  { value: "new", label: "待評估" },
  { value: "priority", label: "優先接洽" },
  { value: "watchlist", label: "持續追蹤" },
  { value: "contacted", label: "已接洽" },
];
const PIPELINE_LABEL = PIPELINE_COLUMNS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const COURSE_TAGS = new Set(["線上課程", "顧問服務", "講座課程", "求職課程", "課程顧問", "企業內訓"]);
const PIPELINE_ORDER = { contacted: 4, priority: 3, watchlist: 2, new: 1 };

let activeStatusFilter = localStorage.getItem(statusFilterPrefKey) || "all";
let courseOnly = localStorage.getItem(courseOnlyPrefKey) === "1";
let savedState = JSON.parse(localStorage.getItem(stateKey) || "{}");
let viewMode = localStorage.getItem(viewModePrefKey) === "pipeline" ? "pipeline" : "cards";
let sortBy = localStorage.getItem(sortByPrefKey) || "match";
let activeTagFilter = new Set();

// One-time migration: collapse "{platform}:{handle}" keys into "{handle}" so a creator's
// state survives the IG+Threads card merge.
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

let rawProfiles = [];
let mergedProfiles = [];

function mergeProfilesByHandle(profiles) {
  const map = new Map();
  for (const p of profiles) {
    const key = (p.handle || "").toLowerCase();
    if (!key) continue;

    const platformEntry = {
      platform: p.platform,
      url: p.url,
      followers: p.followers,
      posts: p.posts,
    };

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        handle: p.handle,
        name: p.name,
        bio: p.bio || "",
        collabAngleShort: p.collabAngleShort || "",
        website: p.website || "",
        platforms: [platformEntry],
        tags: [...(p.tags || [])],
        sourceNotes: [...(p.sourceNotes || [])],
        bestScore: Number(p.score) || 0,
        totalMatched: Number(p.matchedKeywords) || 0,
      });
      continue;
    }

    existing.platforms.push(platformEntry);
    // Prefer longer bio / name
    if ((p.bio || "").length > (existing.bio || "").length) existing.bio = p.bio;
    if ((p.name || "").length > (existing.name || "").length) existing.name = p.name;
    if (!existing.website && p.website) existing.website = p.website;
    if (!existing.collabAngleShort && p.collabAngleShort) existing.collabAngleShort = p.collabAngleShort;
    existing.tags = [...new Set([...existing.tags, ...(p.tags || [])])];
    existing.sourceNotes = [...new Set([...existing.sourceNotes, ...(p.sourceNotes || [])])];
    existing.bestScore = Math.max(existing.bestScore, Number(p.score) || 0);
    existing.totalMatched += Number(p.matchedKeywords) || 0;
  }

  // Sort platforms so IG always renders first
  for (const profile of map.values()) {
    profile.platforms.sort((a, b) => {
      if (a.platform === b.platform) return 0;
      return a.platform === "instagram" ? -1 : 1;
    });
  }

  // Apply activity bonus to bestScore so sort-by-score reflects update cadence.
  for (const profile of map.values()) {
    const activity = activitySignal(profile);
    if (!activity) continue;
    if (activity.level === "high") profile.bestScore = Math.min(100, profile.bestScore + 5);
    else if (activity.level === "mid") profile.bestScore = Math.min(100, profile.bestScore + 2);
    else if (activity.level === "early") profile.bestScore = Math.max(0, profile.bestScore - 3);
  }

  // Sort merged profiles by matchedKeywords then score
  return [...map.values()].sort((a, b) => {
    if (b.totalMatched !== a.totalMatched) return b.totalMatched - a.totalMatched;
    return b.bestScore - a.bestScore;
  });
}

function hasCourseTag(profile) {
  return (profile.tags || []).some((tag) => COURSE_TAGS.has(tag));
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

function stateKeyFor(profile) {
  return (profile.handle || "").toLowerCase();
}

function pipelineFor(profile) {
  return savedState[stateKeyFor(profile)]?.pipeline || "new";
}

function profilesMatchingFilter({ ignoreStatusFilter = false } = {}) {
  return mergedProfiles.filter((profile) => {
    if (!ignoreStatusFilter && activeStatusFilter !== "all" && pipelineFor(profile) !== activeStatusFilter) return false;
    if (courseOnly && !hasCourseTag(profile)) return false;
    if (activeTagFilter.size > 0) {
      const tags = profile.tags || [];
      let matched = false;
      for (const tag of tags) {
        if (activeTagFilter.has(tag)) {
          matched = true;
          break;
        }
      }
      if (!matched) return false;
    }
    return true;
  });
}

function sortProfiles(profiles) {
  const sorted = [...profiles];
  const followersOf = (p) => {
    let max = 0;
    for (const plat of p.platforms || []) {
      if (plat.followers && plat.followers > max) max = plat.followers;
    }
    return max;
  };
  const updatedAtOf = (p) => savedState[stateKeyFor(p)]?.updatedAt || 0;
  switch (sortBy) {
    case "score":
      sorted.sort((a, b) => (b.bestScore || 0) - (a.bestScore || 0));
      break;
    case "followers":
      sorted.sort((a, b) => followersOf(b) - followersOf(a));
      break;
    case "updated":
      sorted.sort((a, b) => updatedAtOf(b) - updatedAtOf(a));
      break;
    case "name":
      sorted.sort((a, b) => (a.name || "").localeCompare(b.name || "", "zh-Hant"));
      break;
    case "match":
    default:
      sorted.sort((a, b) => {
        if (b.totalMatched !== a.totalMatched) return b.totalMatched - a.totalMatched;
        return (b.bestScore || 0) - (a.bestScore || 0);
      });
  }
  return sorted;
}

function collectAllTags() {
  const counts = new Map();
  for (const profile of mergedProfiles) {
    for (const tag of profile.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "zh-Hant"));
}

function renderTagChips() {
  if (!elements.tagChips) return;
  const entries = collectAllTags();
  if (!entries.length) {
    elements.tagChips.hidden = true;
    elements.tagChips.innerHTML = "";
    return;
  }
  // Drop chips that no longer exist in current results
  const valid = new Set(entries.map(([tag]) => tag));
  for (const tag of [...activeTagFilter]) {
    if (!valid.has(tag)) activeTagFilter.delete(tag);
  }
  const hasActive = activeTagFilter.size > 0;
  const buttons = entries
    .map(([tag, count]) => {
      const active = activeTagFilter.has(tag) ? "active" : "";
      return `<button type="button" class="status-chip tag-chip ${active}" data-tag="${tag}">${tag} <span class="count">${count}</span></button>`;
    })
    .join("");
  const clearBtn = hasActive
    ? `<button type="button" class="tag-clear" id="tagClear">清除標籤篩選</button>`
    : "";
  elements.tagChips.innerHTML = `<span class="tag-chips-label">標籤篩選</span>${buttons}${clearBtn}`;
  elements.tagChips.hidden = false;

  elements.tagChips.querySelectorAll(".tag-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tag = btn.dataset.tag;
      if (activeTagFilter.has(tag)) activeTagFilter.delete(tag);
      else activeTagFilter.add(tag);
      renderTagChips();
      renderStatusFilter();
      renderView();
    });
  });
  const clearEl = document.getElementById("tagClear");
  if (clearEl) {
    clearEl.addEventListener("click", () => {
      activeTagFilter.clear();
      renderTagChips();
      renderStatusFilter();
      renderView();
    });
  }
}

function renderStatusFilter() {
  if (!elements.statusFilter) return;
  // Counts respect tag + course filters but ignore status filter itself
  const pool = profilesMatchingFilter({ ignoreStatusFilter: true });
  const counts = { all: pool.length, priority: 0, watchlist: 0, contacted: 0, new: 0 };
  for (const profile of pool) {
    const status = pipelineFor(profile);
    if (counts[status] != null) counts[status] += 1;
  }
  elements.statusFilter.querySelectorAll("[data-count]").forEach((el) => {
    el.textContent = String(counts[el.dataset.count] || 0);
  });
  elements.statusFilter.querySelectorAll(".status-chip").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.status === activeStatusFilter);
  });
  // Hide status filter row in Kanban mode (columns ARE the statuses)
  elements.statusFilter.hidden = viewMode === "pipeline";

  // Update course-toggle count + state
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
    profile.platforms.some((p) => {
      if (p.followers == null) return true;
      return p.followers >= minFollowers && p.followers <= maxFollowers;
    }),
  ).length;
  const course = mergedProfiles.filter(hasCourseTag).length;
  const priority = mergedProfiles.filter(
    (profile) => pipelineFor(profile) === "priority",
  ).length;

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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function cardHtml(profile, { compact = false } = {}) {
  const key = stateKeyFor(profile);
  const stored = savedState[key] || {};
  const badges = profile.platforms
    .map(
      (p) =>
        `<span class="platform-badge platform-${p.platform}">${p.platform === "instagram" ? "IG" : "Threads"}</span>`,
    )
    .join("");
  const followerBits = profile.platforms
    .map((p) => {
      const label = p.platform === "instagram" ? "IG" : "Threads";
      return `${label} ${formatFollowers(p.followers)}`;
    })
    .join(" · ");
  const postsBits = profile.platforms.map((p) => p.posts || "—").join(" / ");
  const platformLinks = profile.platforms
    .map(
      (p) =>
        `<a href="${p.url}" target="_blank" rel="noreferrer">${p.platform === "instagram" ? "Instagram" : "Threads"}</a>`,
    )
    .join("");
  const compactClass = compact ? " compact" : "";
  const activity = activitySignal(profile);
  const activityPill = activity
    ? `<span class="activity-pill activity-${activity.level}" title="${escapeHtml(activity.note)}">${escapeHtml(activity.label)}</span>`
    : "";
  const defaultTemplateId = pickTemplateId(profile.tags || []);
  const templateOptions = DM_TEMPLATES.map(
    (t) =>
      `<option value="${t.id}" ${t.id === defaultTemplateId ? "selected" : ""}>${t.label}</option>`,
  ).join("");
  const initialTemplate = DM_TEMPLATES.find((t) => t.id === defaultTemplateId) || DM_TEMPLATES[3];
  const initialBody = initialTemplate.body({
    name: profile.name || profile.handle,
    topic: topicFor(profile),
  });
  return `
    <article class="card${compactClass}">
      <div class="card-top">
        <div>
          <div class="platform-row">${badges}</div>
          <h3>${escapeHtml(profile.name)}</h3>
          <p class="handle">@${escapeHtml(profile.handle)}</p>
        </div>
        <div class="score-pill">${profile.bestScore} 分</div>
      </div>
      ${activityPill ? `<div class="activity-row">${activityPill}</div>` : ""}
      <div class="stat-row">
        <div class="stat"><span>粉絲</span><strong>${followerBits || "待確認"}</strong></div>
        <div class="stat"><span>貼文 / 串文</span><strong>${postsBits}</strong></div>
        <div class="stat"><span>合作切角</span><strong>${escapeHtml(profile.collabAngleShort || "—")}</strong></div>
      </div>
      <p class="bio">${escapeHtml(profile.bio)}</p>
      <div class="tag-wrap">${(profile.tags || []).map((tag) => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>
      <div class="source-wrap">${(profile.sourceNotes || []).map((item) => `<span class="source-pill">${escapeHtml(item)}</span>`).join("")}</div>
      <div class="link-row">
        ${platformLinks}
        ${profile.website ? `<a href="${profile.website}" target="_blank" rel="noreferrer">個站 / Link in bio</a>` : ""}
      </div>
      <details class="dm-panel" data-key="${escapeHtml(key)}">
        <summary>外洽訊息範本</summary>
        <div class="dm-body">
          <div class="dm-controls">
            <label>
              <span>模板</span>
              <select class="dm-template-select" data-key="${escapeHtml(key)}">${templateOptions}</select>
            </label>
            <button type="button" class="secondary-action dm-copy" data-key="${escapeHtml(key)}">複製訊息</button>
          </div>
          <textarea
            class="dm-message"
            data-key="${escapeHtml(key)}"
            data-name="${escapeHtml(profile.name || profile.handle)}"
            data-topic="${escapeHtml(topicFor(profile))}"
            rows="7"
          >${escapeHtml(initialBody)}</textarea>
        </div>
      </details>
      <div class="mini-grid">
        <div class="mini-field">
          <label>內部狀態</label>
          <select data-key="${escapeHtml(key)}" class="pipeline-select">
            <option value="new" ${stored.pipeline === "new" || !stored.pipeline ? "selected" : ""}>待評估</option>
            <option value="priority" ${stored.pipeline === "priority" ? "selected" : ""}>優先接洽</option>
            <option value="watchlist" ${stored.pipeline === "watchlist" ? "selected" : ""}>持續追蹤</option>
            <option value="contacted" ${stored.pipeline === "contacted" ? "selected" : ""}>已接洽</option>
          </select>
        </div>
        <div class="mini-field">
          <label>BD 備註</label>
          <textarea data-key="${escapeHtml(key)}" class="memo-input" rows="3" placeholder="例如：適合做職涯問答、可談課程分潤、先從校園主題切入">${escapeHtml(stored.memo || "")}</textarea>
        </div>
      </div>
    </article>
  `;
}

function bindCardInteractions(scope) {
  scope.querySelectorAll(".pipeline-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const key = event.target.dataset.key;
      savedState[key] = {
        ...(savedState[key] || {}),
        pipeline: event.target.value,
        updatedAt: Date.now(),
      };
      persist();
      renderMetrics();
      renderStatusFilter();
      renderView();
    });
  });

  scope.querySelectorAll(".memo-input").forEach((input) => {
    input.addEventListener("input", (event) => {
      const key = event.target.dataset.key;
      savedState[key] = {
        ...(savedState[key] || {}),
        memo: event.target.value,
        updatedAt: Date.now(),
      };
      persist();
    });
  });

  scope.querySelectorAll(".dm-template-select").forEach((select) => {
    select.addEventListener("change", (event) => {
      const key = event.target.dataset.key;
      const textarea = scope.querySelector(`.dm-message[data-key="${CSS.escape(key)}"]`);
      if (!textarea) return;
      const template = DM_TEMPLATES.find((t) => t.id === event.target.value);
      if (!template) return;
      textarea.value = template.body({
        name: textarea.dataset.name,
        topic: textarea.dataset.topic,
      });
    });
  });

  scope.querySelectorAll(".dm-copy").forEach((btn) => {
    btn.addEventListener("click", async (event) => {
      const key = event.currentTarget.dataset.key;
      const textarea = scope.querySelector(`.dm-message[data-key="${CSS.escape(key)}"]`);
      if (!textarea) return;
      try {
        await navigator.clipboard.writeText(textarea.value);
        showToast("已複製外洽訊息");
      } catch (error) {
        textarea.select();
        showToast("瀏覽器拒絕複製，已選取訊息請手動 Cmd+C");
      }
    });
  });
}

function emptyStateMessage() {
  if (activeTagFilter.size > 0 && activeStatusFilter === "all" && !courseOnly) {
    return "目前的標籤篩選下沒有候選人，試著減少幾個標籤或重新搜尋。";
  }
  if (activeStatusFilter !== "all" && !courseOnly && activeTagFilter.size === 0) {
    const label = PIPELINE_LABEL[activeStatusFilter] || activeStatusFilter;
    return `沒有候選人被標記為「${label}」。在卡片上的「內部狀態」下拉選單裡標記後，就會出現在這裡。`;
  }
  if (courseOnly && activeStatusFilter === "all" && activeTagFilter.size === 0) {
    return "目前的候選人都沒有課程合作的標籤，試著放寬主題 chip 或粉絲區間。";
  }
  if (activeStatusFilter !== "all" || courseOnly || activeTagFilter.size > 0) {
    return "目前的篩選交集下沒有候選人，試著清除其中一個。";
  }
  return "目前沒有符合搜尋條件的候選人，試試放寬粉絲區間或多勾幾個主題 chip。";
}

function updateResultCount(visibleCount) {
  if (!elements.resultCount) return;
  if (!mergedProfiles.length) {
    elements.resultCount.hidden = true;
    return;
  }
  const filtered = visibleCount !== mergedProfiles.length;
  elements.resultCount.textContent = filtered
    ? `共 ${visibleCount} 筆（從 ${mergedProfiles.length} 筆中篩選）`
    : `共 ${visibleCount} 筆`;
  elements.resultCount.hidden = false;
}

function renderCards() {
  const visible = sortProfiles(profilesMatchingFilter());
  updateResultCount(visible.length);

  if (!visible.length) {
    elements.cardGrid.innerHTML = `<p class="empty-state">${emptyStateMessage()}</p>`;
    return;
  }

  elements.cardGrid.innerHTML = visible.map((profile) => cardHtml(profile)).join("");
  bindCardInteractions(elements.cardGrid);
}

function renderKanban() {
  const pool = sortProfiles(profilesMatchingFilter({ ignoreStatusFilter: true }));
  updateResultCount(pool.length);

  const groups = PIPELINE_COLUMNS.reduce((acc, col) => {
    acc[col.value] = [];
    return acc;
  }, {});
  for (const profile of pool) {
    const status = pipelineFor(profile);
    if (groups[status]) groups[status].push(profile);
  }

  elements.kanban.innerHTML = PIPELINE_COLUMNS.map((col) => {
    const items = groups[col.value] || [];
    const body = items.length
      ? items.map((p) => cardHtml(p, { compact: true })).join("")
      : `<p class="kanban-empty">還沒有候選人</p>`;
    return `
      <div class="kanban-column" data-pipeline="${col.value}">
        <header class="kanban-header">
          <h3>${col.label}</h3>
          <span class="count">${items.length}</span>
        </header>
        <div class="kanban-list">${body}</div>
      </div>
    `;
  }).join("");
  bindCardInteractions(elements.kanban);
}

function renderView() {
  const isPipeline = viewMode === "pipeline";
  elements.cardGrid.hidden = isPipeline;
  elements.kanban.hidden = !isPipeline;
  elements.viewToggles.forEach((btn) => {
    const active = btn.dataset.view === viewMode;
    btn.classList.toggle("active", active);
    btn.setAttribute("aria-selected", active ? "true" : "false");
  });
  if (isPipeline) renderKanban();
  else renderCards();
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

    rawProfiles = data.profiles || [];
    mergedProfiles = mergeProfilesByHandle(rawProfiles);
    renderMetrics();
    renderTagChips();
    renderStatusFilter();
    renderView();
    renderStatus(data.crawlSummary);
  } catch (error) {
    rawProfiles = [];
    mergedProfiles = [];
    renderMetrics();
    renderTagChips();
    renderStatusFilter();
    renderView();
    renderStatus(null, error.message || "搜尋時發生未知問題");
  } finally {
    elements.runSearch.disabled = false;
    elements.runSearch.textContent = "重新搜尋候選創作者";
  }
}

function escapeCsv(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(profiles) {
  const headers = [
    "名稱",
    "帳號",
    "平台",
    "IG 連結",
    "Threads 連結",
    "IG 粉絲",
    "Threads 粉絲",
    "貼文 / 串文",
    "個站",
    "分數",
    "配對關鍵字數",
    "合作切角",
    "標籤",
    "內部狀態",
    "更新時間",
    "BD 備註",
    "簡介",
  ];
  const rows = profiles.map((profile) => {
    const ig = profile.platforms.find((p) => p.platform === "instagram");
    const th = profile.platforms.find((p) => p.platform === "threads");
    const stored = savedState[stateKeyFor(profile)] || {};
    const updatedAt = stored.updatedAt
      ? new Date(stored.updatedAt).toLocaleString("zh-TW", { hour12: false })
      : "";
    return [
      profile.name,
      profile.handle,
      profile.platforms
        .map((p) => (p.platform === "instagram" ? "IG" : "Threads"))
        .join("/"),
      ig?.url || "",
      th?.url || "",
      ig?.followers ?? "",
      th?.followers ?? "",
      profile.platforms.map((p) => p.posts || "").join(" / "),
      profile.website || "",
      profile.bestScore ?? "",
      profile.totalMatched ?? "",
      profile.collabAngleShort || "",
      (profile.tags || []).join(" / "),
      PIPELINE_LABEL[stored.pipeline || "new"] || "",
      updatedAt,
      stored.memo || "",
      profile.bio || "",
    ]
      .map(escapeCsv)
      .join(",");
  });
  return [headers.join(","), ...rows].join("\r\n");
}

function csvProfiles() {
  // In Kanban mode export all filtered (ignoring the status filter chip);
  // in Cards mode honor the active status filter.
  const profiles = profilesMatchingFilter({
    ignoreStatusFilter: viewMode === "pipeline",
  });
  return sortProfiles(profiles);
}

function showToast(message) {
  if (!elements.toast) return;
  elements.toast.textContent = message;
  elements.toast.hidden = false;
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    elements.toast.hidden = true;
  }, 2400);
}

async function handleCopyCsv() {
  const profiles = csvProfiles();
  if (!profiles.length) {
    showToast("沒有可匯出的候選人");
    return;
  }
  const csv = buildCsv(profiles);
  try {
    await navigator.clipboard.writeText(csv);
    showToast(`已複製 ${profiles.length} 筆到剪貼簿`);
  } catch (error) {
    console.warn("Clipboard copy failed", error);
    showToast("瀏覽器拒絕複製，請改用下載 CSV");
  }
}

function handleDownloadCsv() {
  const profiles = csvProfiles();
  if (!profiles.length) {
    showToast("沒有可匯出的候選人");
    return;
  }
  const csv = buildCsv(profiles);
  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  const d = new Date();
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  anchor.download = `creator-radar-${stamp}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  showToast(`已下載 ${profiles.length} 筆 CSV`);
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
      renderView();
    });
  });
}

if (elements.courseToggle) {
  elements.courseToggle.addEventListener("click", () => {
    courseOnly = !courseOnly;
    localStorage.setItem(courseOnlyPrefKey, courseOnly ? "1" : "0");
    renderStatusFilter();
    renderView();
  });
}

elements.viewToggles.forEach((btn) => {
  btn.addEventListener("click", () => {
    viewMode = btn.dataset.view === "pipeline" ? "pipeline" : "cards";
    localStorage.setItem(viewModePrefKey, viewMode);
    renderStatusFilter();
    renderView();
  });
});

if (elements.sortBy) {
  elements.sortBy.value = sortBy;
  elements.sortBy.addEventListener("change", (event) => {
    sortBy = event.target.value;
    localStorage.setItem(sortByPrefKey, sortBy);
    renderView();
  });
}

if (elements.copyCsv) elements.copyCsv.addEventListener("click", handleCopyCsv);
if (elements.downloadCsv) elements.downloadCsv.addEventListener("click", handleDownloadCsv);

function setManualAddStatus(message, level = "info") {
  if (!elements.manualAddStatus) return;
  if (!message) {
    elements.manualAddStatus.hidden = true;
    elements.manualAddStatus.textContent = "";
    return;
  }
  elements.manualAddStatus.hidden = false;
  elements.manualAddStatus.textContent = message;
  elements.manualAddStatus.dataset.level = level;
}

function openManualAdd() {
  elements.manualAddForm.hidden = false;
  elements.manualAddToggle.hidden = true;
  setManualAddStatus("");
  if (elements.manualAddUrl) elements.manualAddUrl.focus();
}

function closeManualAdd() {
  elements.manualAddForm.hidden = true;
  elements.manualAddToggle.hidden = false;
  setManualAddStatus("");
  if (elements.manualAddUrl) elements.manualAddUrl.value = "";
}

async function submitManualAdd(event) {
  event.preventDefault();
  const url = (elements.manualAddUrl.value || "").trim();
  if (!url) {
    setManualAddStatus("請貼一個 IG 或 Threads 個人頁網址", "error");
    return;
  }

  const submitBtn = elements.manualAddForm.querySelector(".manual-add-submit");
  submitBtn.disabled = true;
  setManualAddStatus("正在讀取公開頁面…", "info");

  try {
    const response = await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url,
        keywords: collectKeywords(),
        minFollowers: elements.minFollowers.value,
        maxFollowers: elements.maxFollowers.value,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "讀取失敗");
    }

    const newProfile = data.profile;
    if (!newProfile?.handle) {
      throw new Error("找不到帳號資訊，請確認網址是個人頁");
    }

    const duplicate = rawProfiles.find(
      (p) =>
        p.platform === newProfile.platform &&
        (p.handle || "").toLowerCase() === (newProfile.handle || "").toLowerCase(),
    );
    if (duplicate) {
      setManualAddStatus(`這個帳號已經在名單裡：@${duplicate.handle}`, "error");
      submitBtn.disabled = false;
      return;
    }

    rawProfiles = [newProfile, ...rawProfiles];
    mergedProfiles = mergeProfilesByHandle(rawProfiles);
    renderMetrics();
    renderTagChips();
    renderStatusFilter();
    renderView();
    showToast(`已加入 @${newProfile.handle}`);
    closeManualAdd();
  } catch (error) {
    setManualAddStatus(error.message || "無法加入，請稍後再試", "error");
  } finally {
    submitBtn.disabled = false;
  }
}

if (elements.manualAddToggle) elements.manualAddToggle.addEventListener("click", openManualAdd);
if (elements.manualAddCancel) elements.manualAddCancel.addEventListener("click", closeManualAdd);
if (elements.manualAddForm) elements.manualAddForm.addEventListener("submit", submitManualAdd);

renderChips();
loadProfiles();
