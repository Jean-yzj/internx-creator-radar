import seedProfiles from "../data/seedProfiles.json" with { type: "json" };
import { seedProfiles as expandedSeedProfiles } from "../data/seed_profiles.js";
import { discoverViaCse } from "./cse.js";

const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
  "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
};

const DEFAULT_DISCOVERY_INPUT = {
  minFollowers: 1000,
  maxFollowers: 50000,
  keywords: ["面試", "求職", "職涯", "課程"],
  platforms: ["instagram", "threads"],
};

const CACHE_TTL_MS = 10 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12000;
const MAX_DISCOVERED_PROFILES = 200;
const MAX_FRESH_ENRICH = 18;
const discoveryCache = new Map();

const keywordSignals = {
  course: ["課程", "工作坊", "講座", "academy", "bootcamp", "masterclass"],
  hiring: ["面試", "履歷", "求職", "職涯", "轉職", "工作", "career", "job"],
  industry: ["產品", "工程", "行銷", "外商", "hr", "獵頭", "科技", "創業"],
};

const noisyWarningDomains = [
  "facebook.com",
  "www.facebook.com",
  "jobus.asia",
];

const baseSeedProfiles = mergeSeedProfiles([...expandedSeedProfiles, ...seedProfiles]);

function mergeSeedProfiles(profiles = []) {
  const byKey = new Map();

  for (const profile of profiles) {
    const key = `${profile.platform}:${profile.handle}`;
    const current = byKey.get(key);
    if (!current) {
      byKey.set(key, {
        ...profile,
        sourceNotes: dedupe(profile.sourceNotes || []),
        tags: dedupe(profile.tags || []),
      });
      continue;
    }

    byKey.set(key, {
      ...current,
      ...profile,
      followers: profile.followers ?? current.followers ?? null,
      posts: profile.posts ?? current.posts ?? null,
      bio: profile.bio || current.bio || "",
      website: profile.website || current.website || "",
      sourceNotes: dedupe([...(current.sourceNotes || []), ...(profile.sourceNotes || [])]),
      tags: dedupe([...(current.tags || []), ...(profile.tags || [])]),
    });
  }

  return [...byKey.values()];
}

function normalizeInput(raw = {}) {
  const keywords = Array.isArray(raw.keywords)
    ? raw.keywords
    : String(raw.keywords || "")
        .split(/[,\n、]/)
        .map((item) => item.trim())
        .filter(Boolean);

  const platforms = Array.isArray(raw.platforms)
    ? raw.platforms
    : String(raw.platforms || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

  return {
    minFollowers: Number(raw.minFollowers ?? DEFAULT_DISCOVERY_INPUT.minFollowers) || 0,
    maxFollowers:
      Number(raw.maxFollowers ?? DEFAULT_DISCOVERY_INPUT.maxFollowers) ||
      DEFAULT_DISCOVERY_INPUT.maxFollowers,
    keywords: keywords.length ? keywords : DEFAULT_DISCOVERY_INPUT.keywords,
    platforms: platforms.length ? platforms : DEFAULT_DISCOVERY_INPUT.platforms,
  };
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function shouldSuppressWarning(url = "") {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    return noisyWarningDomains.some((domain) => hostname === domain.replace(/^www\./, ""));
  } catch (error) {
    return false;
  }
}

function pushWarning(crawlLog, message, url = "", severity = "soft") {
  if (severity === "soft" && shouldSuppressWarning(url)) {
    crawlLog.suppressedWarnings += 1;
    return;
  }

  crawlLog.warnings.push(message);
}

function buildWarningSummary(crawlLog) {
  const totalWarningCount = crawlLog.warnings.length + crawlLog.suppressedWarnings;
  if (!totalWarningCount) return "";
  if (!crawlLog.warnings.length) {
    return `部分外部來源未回應，已自動略過 ${totalWarningCount} 筆，不影響主要名單。`;
  }

  return `部分外部來源未回應，已自動略過 ${totalWarningCount} 筆，主要名單仍可正常使用。`;
}

function decodeHtmlEntities(value = "") {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalizeWhitespace(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseCompactNumber(value = "") {
  const normalized = String(value).replace(/,/g, "").trim();
  const match = normalized.match(/([\d.]+)\s*([KMB萬])?/i);
  if (!match) return null;

  const numericValue = Number(match[1]);
  const unit = match[2]?.toUpperCase();
  if (!unit) return Math.round(numericValue);
  if (unit === "K") return Math.round(numericValue * 1000);
  if (unit === "M") return Math.round(numericValue * 1000000);
  if (unit === "B") return Math.round(numericValue * 1000000000);
  if (unit === "萬") return Math.round(numericValue * 10000);
  return Math.round(numericValue);
}

function parseInstagramDescription(description = "") {
  const followersMatch =
    description.match(/^([\d.,KMB萬]+)\s+Followers/i) ||
    description.match(/^([\d.,KMB萬]+)\s*位粉絲/i);
  const postsMatch =
    description.match(/,\s*([\d.,KMB萬]+)\s+Posts/i) ||
    description.match(/、\s*([\d.,KMB萬]+)\s*則貼文/);
  const bio =
    description.includes(" - ")
      ? normalizeWhitespace(description.split(" - ").slice(1).join(" - "))
      : normalizeWhitespace(description);

  return {
    followers: followersMatch ? parseCompactNumber(followersMatch[1]) : null,
    posts: postsMatch ? normalizeWhitespace(postsMatch[1]) : null,
    bio,
  };
}

function parseThreadsDescription(description = "") {
  const followersMatch =
    description.match(/^([\d.,KMB萬]+)\s+Followers/i) ||
    description.match(/^([\d.,KMB萬]+)\s*位粉絲/i);
  const postsMatch =
    description.match(/•\s*([\d.,KMB萬]+)\s+Threads/i) ||
    description.match(/•\s*([\d.,KMB萬]+)\s*則串文/);
  const bio =
    description.includes("•")
      ? description.split("•").slice(2).join("•")
      : description;

  return {
    followers: followersMatch ? parseCompactNumber(followersMatch[1]) : null,
    posts: postsMatch ? normalizeWhitespace(postsMatch[1]) : null,
    bio: normalizeWhitespace(bio),
  };
}

function parseMeta(html = "") {
  const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/i);
  const descriptionMatch = html.match(
    /<meta property="og:description" content="([^"]+)"/i,
  );
  const canonicalMatch = html.match(/<link rel="canonical" href="([^"]+)"/i);

  return {
    title: decodeHtmlEntities(titleMatch?.[1] || ""),
    description: decodeHtmlEntities(descriptionMatch?.[1] || ""),
    canonicalUrl: decodeHtmlEntities(canonicalMatch?.[1] || ""),
  };
}

function parseDocumentHead(html = "") {
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descriptionMatch =
    html.match(/<meta name="description" content="([^"]+)"/i) ||
    html.match(/<meta property="og:description" content="([^"]+)"/i);

  return {
    title: decodeHtmlEntities(titleMatch?.[1] || ""),
    description: decodeHtmlEntities(descriptionMatch?.[1] || ""),
  };
}

function createSearchQueries(keywords, platforms) {
  const keywordList = (keywords.length ? keywords : DEFAULT_DISCOVERY_INPUT.keywords).slice(0, 3);
  const queries = [];

  for (const keyword of keywordList) {
    if (platforms.includes("instagram")) {
      queries.push(`site:instagram.com ${keyword} 職涯 OR 求職 OR 面試`);
      queries.push(`${keyword} IG 職涯 課程`);
    }
    if (platforms.includes("threads")) {
      queries.push(`site:threads.net ${keyword} 職涯 OR 求職 OR 面試`);
      queries.push(`${keyword} Threads 求職 面試`);
    }
  }

  return dedupe(queries);
}

function extractUrlsFromSearch(html = "") {
  const urls = new Set();
  const matches = [
    ...html.matchAll(/uddg=([^"&]+)["&]/g),
    ...html.matchAll(/result__a[^>]*href="([^"]+)"/g),
  ];

  for (const match of matches) {
    const raw = decodeURIComponent(decodeHtmlEntities(match[1]));
    if (!raw.startsWith("http")) continue;
    if (raw.includes("duckduckgo.com/y.js?")) continue;
    urls.add(raw);
  }

  return [...urls];
}

function extractProfileLinks(html = "") {
  const urls = new Set();
  for (const match of html.matchAll(/https:\/\/(?:www\.)?(instagram\.com\/[^"'\\<\s]+|threads\.net\/@[^"'\\<\s]+)/g)) {
    urls.add(match[0].replace(/[),.;]+$/, ""));
  }
  return [...urls];
}

function extractExternalUrlFromHtml(html = "", platform) {
  const redirectPattern =
    platform === "threads"
      ? /https:\/\/l\.threads\.com\/\?u=([^"'&<\s]+)/gi
      : /https:\/\/l\.instagram\.com\/\?u=([^"'&<\s]+)/gi;

  const redirectMatch = redirectPattern.exec(html);
  if (redirectMatch?.[1]) {
    try {
      return decodeURIComponent(redirectMatch[1]);
    } catch (error) {
      return redirectMatch[1];
    }
  }

  const anchorMatch = html.match(/href="(https:\/\/[^"]+)"/i);
  return anchorMatch?.[1] || "";
}

function normalizeCandidateUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");

    if (hostname === "instagram.com") {
      const [handle] = parsed.pathname.split("/").filter(Boolean);
      if (!handle || ["p", "reel", "reels", "stories", "explore"].includes(handle)) {
        return null;
      }

      return {
        platform: "instagram",
        handle,
        url: `https://www.instagram.com/${handle}/`,
      };
    }

    if (hostname === "threads.net") {
      const handle = parsed.pathname.replace(/^\/@/, "").split("/")[0];
      if (!handle) return null;

      return {
        platform: "threads",
        handle,
        url: `https://www.threads.net/@${handle}`,
      };
    }
  } catch (error) {
    return null;
  }

  return null;
}

function inferTags(text = "") {
  const normalized = text.toLowerCase();
  const tags = new Set();

  if (keywordSignals.course.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    tags.add("線上課程");
  }
  if (keywordSignals.hiring.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    tags.add("履歷面試");
  }
  if (keywordSignals.industry.some((keyword) => normalized.includes(keyword.toLowerCase()))) {
    tags.add("產業觀點");
  }
  if (normalized.includes("諮詢") || normalized.includes("coach")) {
    tags.add("顧問服務");
  }
  if (normalized.includes("hr") || normalized.includes("獵頭")) {
    tags.add("招聘視角");
  }

  return [...tags];
}

function buildCollabAngle(tags = []) {
  if (tags.includes("線上課程")) return "課程上架 / 聯名企劃";
  if (tags.includes("顧問服務")) return "職涯 QA / 直播問答";
  if (tags.includes("招聘視角")) return "面試內容專欄";
  return "內容共創";
}

function countKeywordMatches(profile, keywords = []) {
  const haystack = `${profile.name || ""} ${profile.bio || ""} ${(profile.tags || []).join(" ")}`.toLowerCase();
  return keywords.reduce(
    (total, keyword) => total + (haystack.includes(String(keyword).toLowerCase()) ? 1 : 0),
    0,
  );
}

function scoreProfile(profile, input) {
  let score = 45;
  const text = `${profile.name || ""} ${profile.bio || ""} ${(profile.tags || []).join(" ")}`.toLowerCase();

  if (profile.followers >= input.minFollowers && profile.followers <= input.maxFollowers) {
    score += 20;
  } else if (!profile.followers) {
    score += 8;
  } else if (profile.followers < input.minFollowers) {
    score -= 8;
  } else {
    score -= 4;
  }

  if (keywordSignals.course.some((keyword) => text.includes(keyword.toLowerCase()))) score += 15;
  if (keywordSignals.hiring.some((keyword) => text.includes(keyword.toLowerCase()))) score += 12;
  if (keywordSignals.industry.some((keyword) => text.includes(keyword.toLowerCase()))) score += 8;
  if (profile.platform === "threads") score += 4;
  score += Math.min(10, (profile.matchedKeywords || 0) * 2);

  return Math.min(98, Math.max(28, score));
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: REQUEST_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function searchDuckDuckGo(query, crawlLog) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        ...REQUEST_HEADERS,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ q: query }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo search failed with ${response.status}`);
    }

    const html = await response.text();
    const directUrls = extractUrlsFromSearch(html);
    const expansionTargets = directUrls
      .filter((url) => !url.includes("instagram.com/") && !url.includes("threads.net/@"))
      .slice(0, 4);
    const expandedUrls = [];

    await Promise.all(
      expansionTargets.map(async (url) => {
        try {
          const pageHtml = await fetchText(url);
          expandedUrls.push(...extractProfileLinks(pageHtml));
        } catch (error) {
          pushWarning(crawlLog, `無法展開搜尋結果頁：${url}`, url, "soft");
        }
      }),
    );

    const discovered = dedupe([...directUrls, ...expandedUrls]);
    crawlLog.queries.push({ query, rawResults: directUrls.length, expandedResults: expandedUrls.length });

    return discovered;
  } finally {
    clearTimeout(timer);
  }
}

async function enrichWebsite(candidate, crawlLog) {
  if (!candidate.website) {
    return { website: "", title: "", description: "", sourceNote: "" };
  }

  try {
    const html = await fetchText(candidate.website);
    const parsed = parseDocumentHead(html);

    return {
      website: candidate.website,
      title: parsed.title,
      description: parsed.description,
      sourceNote: "個站 / link-in-bio 已同步",
    };
  } catch (error) {
    pushWarning(
      crawlLog,
      `無法讀取外部網站：${candidate.website}`,
      candidate.website,
      "soft",
    );
    return {
      website: candidate.website,
      title: "",
      description: "",
      sourceNote: "個站讀取失敗",
    };
  }
}

function extractProfileName(title = "", handle = "") {
  const pattern = escapeRegExp(handle);
  return normalizeWhitespace(
    title
      .replace(new RegExp(`（@${pattern}）.*$`), "")
      .replace(new RegExp(`\\(@${pattern}\\).*$`), "")
      .replace(/•.*/g, "")
      .replace(/，.*/g, ""),
  );
}

async function enrichProfile(candidate, input, crawlLog) {
  try {
    const html = await fetchText(candidate.url);
    const meta = parseMeta(html);
    const parsed =
      candidate.platform === "instagram"
        ? parseInstagramDescription(meta.description)
        : parseThreadsDescription(meta.description);
    const discoveredWebsite =
      candidate.website || extractExternalUrlFromHtml(html, candidate.platform) || "";
    const websiteSignals = await enrichWebsite(
      { ...candidate, website: discoveredWebsite || candidate.website || "" },
      crawlLog,
    );
    const mergedBio = normalizeWhitespace(
      [parsed.bio, candidate.bio, websiteSignals.description].filter(Boolean).join(" "),
    );
    const tags = dedupe([
      ...(candidate.tags || []),
      ...inferTags(
        [candidate.name, mergedBio, websiteSignals.title, websiteSignals.description]
          .filter(Boolean)
          .join(" "),
      ),
    ]);
    const profile = {
      ...candidate,
      name:
        extractProfileName(meta.title, candidate.handle) ||
        candidate.name ||
        candidate.handle,
      followers: parsed.followers ?? candidate.followers ?? null,
      posts: parsed.posts ?? candidate.posts ?? null,
      bio:
        mergedBio || "目前無法自動擷取完整簡介，建議人工打開檢查。",
      website: websiteSignals.website || candidate.website || "",
      tags,
      matchedKeywords: countKeywordMatches(
        { ...candidate, bio: mergedBio, tags },
        input.keywords,
      ),
      sourceNotes: dedupe([
        ...(candidate.sourceNotes || []),
        candidate.discoveryQuery ? `DuckDuckGo：${candidate.discoveryQuery}` : "",
        websiteSignals.sourceNote,
        "公開頁面即時爬取",
      ]),
      collabAngleShort: buildCollabAngle(tags),
      lastCrawledAt: new Date().toISOString(),
    };

    return {
      ...profile,
      score: scoreProfile(profile, input),
    };
  } catch (error) {
    pushWarning(
      crawlLog,
      `無法讀取公開個人頁：${candidate.url}`,
      candidate.url,
      "soft",
    );
    const tags = dedupe([...(candidate.tags || []), ...inferTags(candidate.bio || "")]);
    const fallback = {
      ...candidate,
      name: candidate.name || candidate.handle,
      followers: candidate.followers || null,
      posts: candidate.posts || null,
      bio: candidate.bio || "目前無法自動讀取公開簡介，建議人工複核。",
      tags,
      matchedKeywords: countKeywordMatches(
        { ...candidate, tags, bio: candidate.bio || "" },
        input.keywords,
      ),
      sourceNotes: dedupe([
        ...(candidate.sourceNotes || []),
        candidate.discoveryQuery ? `DuckDuckGo：${candidate.discoveryQuery}` : "",
        "公開頁面讀取失敗",
      ]),
      collabAngleShort: buildCollabAngle(tags),
      lastCrawledAt: new Date().toISOString(),
    };

    return {
      ...fallback,
      score: scoreProfile(fallback, input),
    };
  }
}

function shouldIncludeByFollowerRange(profile, input) {
  if (!profile.followers) return true;
  return profile.followers >= input.minFollowers && profile.followers <= input.maxFollowers;
}

async function discoverCreators(rawInput = DEFAULT_DISCOVERY_INPUT) {
  const input = normalizeInput(rawInput);
  const cacheKey = JSON.stringify(input);
  const cached = discoveryCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
    return {
      ...cached.payload,
      crawlSummary: {
        ...cached.payload.crawlSummary,
        fromCache: true,
      },
    };
  }

  const crawlStartedAt = Date.now();
  const crawlLog = {
    queries: [],
    warnings: [],
    suppressedWarnings: 0,
  };
  const queries = createSearchQueries(input.keywords, input.platforms);
  const discoveredUrls = (
    await Promise.all(queries.map((query) => searchDuckDuckGo(query, crawlLog)))
  ).flat();

  const seedKeys = new Set(
    baseSeedProfiles.map((profile) => `${profile.platform}:${profile.handle}`),
  );

  const seedList = [];
  for (const seed of baseSeedProfiles) {
    if (!input.platforms.includes(seed.platform)) continue;
    seedList.push({ ...seed });
  }

  const freshMap = new Map();

  const cse = await discoverViaCse({ keywords: input.keywords, platforms: input.platforms });
  for (const profile of cse.profiles || []) {
    const key = `${profile.platform}:${profile.handle}`;
    if (seedKeys.has(key) || freshMap.has(key)) continue;
    freshMap.set(key, {
      ...profile,
      sourceNotes: dedupe([...(profile.sourceNotes || []), "Google CSE 即時搜尋"]),
    });
  }

  for (const url of discoveredUrls) {
    const normalized = normalizeCandidateUrl(url);
    if (!normalized) continue;
    if (!input.platforms.includes(normalized.platform)) continue;
    const key = `${normalized.platform}:${normalized.handle}`;
    if (seedKeys.has(key) || freshMap.has(key)) continue;

    const queryHit =
      crawlLog.queries.find((item) =>
        url.includes("instagram.com/")
          ? item.query.includes("instagram.com")
          : item.query.includes("threads.net"),
      )?.query || "";
    freshMap.set(key, {
      ...normalized,
      sourceNotes: ["DuckDuckGo 即時搜尋"],
      discoveryQuery: queryHit,
    });
  }

  const enrichedFresh = await Promise.all(
    [...freshMap.values()]
      .slice(0, MAX_FRESH_ENRICH)
      .map((candidate) => enrichProfile(candidate, input, crawlLog)),
  );

  const scoredSeed = seedList.map((profile) => {
    const matchedKeywords = countKeywordMatches(profile, input.keywords);
    return {
      ...profile,
      matchedKeywords,
      score:
        typeof profile.score === "number"
          ? profile.score
          : scoreProfile({ ...profile, matchedKeywords }, input),
    };
  });

  const profiles = [...scoredSeed, ...enrichedFresh]
    .filter((profile) => input.platforms.includes(profile.platform))
    .filter((profile) => shouldIncludeByFollowerRange(profile, input))
    .sort((left, right) => {
      if ((right.matchedKeywords || 0) !== (left.matchedKeywords || 0)) {
        return (right.matchedKeywords || 0) - (left.matchedKeywords || 0);
      }
      if (right.score !== left.score) return right.score - left.score;
      return (right.followers || 0) - (left.followers || 0);
    })
    .slice(0, MAX_DISCOVERED_PROFILES);

  const discoveredProfiles = profiles.filter(
    (profile) => !seedKeys.has(`${profile.platform}:${profile.handle}`),
  ).length;

  const payload = {
    profiles,
    crawlSummary: {
      fromCache: false,
      refreshedAt: new Date().toISOString(),
      durationMs: Date.now() - crawlStartedAt,
      queriesRun: queries.length,
      seedProfiles: seedList.length,
      cseEnabled: cse.enabled,
      cseError: cse.error || null,
      discoveredProfiles,
      returnedProfiles: profiles.length,
      warningCount: crawlLog.warnings.length + crawlLog.suppressedWarnings,
      warningSummary: buildWarningSummary(crawlLog),
      warnings: crawlLog.warnings,
    },
  };

  discoveryCache.set(cacheKey, {
    createdAt: Date.now(),
    payload,
  });

  return payload;
}

export {
  DEFAULT_DISCOVERY_INPUT,
  discoverCreators,
  normalizeInput,
};
