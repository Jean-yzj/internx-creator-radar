import { seedProfiles } from "@/data/seedProfiles";

const REQUEST_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "accept-language": "zh-TW,zh;q=0.9,en;q=0.8",
};

const keywordSignals = {
  course: ["課程", "工作坊", "講座", "顧問", "academy", "bootcamp", "教練", "consult"],
  hiring: ["面試", "履歷", "求職", "職涯", "轉職", "工作", "career", "job"],
  industry: ["產品", "工程", "行銷", "外商", "HR", "獵頭", "科技", "創業"],
};

export const DEFAULT_DISCOVERY_INPUT = {
  minFollowers: 1000,
  maxFollowers: 50000,
  keywords: ["面試", "求職", "職涯", "課程"],
  platforms: ["instagram", "threads"],
};

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

function parseCompactNumber(value = "") {
  const match = value.replace(/,/g, "").match(/([\d.]+)\s*([KMB])?/i);
  if (!match) return null;

  const numericValue = Number(match[1]);
  const unit = match[2]?.toUpperCase();
  if (!unit) return Math.round(numericValue);
  if (unit === "K") return Math.round(numericValue * 1000);
  if (unit === "M") return Math.round(numericValue * 1000000);
  if (unit === "B") return Math.round(numericValue * 1000000000);
  return Math.round(numericValue);
}

function parseInstagramDescription(description = "") {
  const followersMatch =
    description.match(/^([\d.,KM]+)\s+Followers/i) ||
    description.match(/^([\d.,KM]+)\s*位粉絲/);
  const postsMatch =
    description.match(/,\s*([\d.,KM]+)\s+Posts/i) ||
    description.match(/、\s*([\d.,KM]+)\s*則貼文/);
  const bio =
    description.includes(" - ")
      ? normalizeWhitespace(description.split(" - ").slice(1).join(" - "))
      : "";

  return {
    followers: followersMatch ? parseCompactNumber(followersMatch[1]) : null,
    posts: postsMatch ? postsMatch[1] : null,
    bio,
  };
}

function parseThreadsDescription(description = "") {
  const followersMatch =
    description.match(/^([\d.,KM]+)\s+Followers/i) ||
    description.match(/^([\d.,KM]+)\s*位粉絲/);
  const postsMatch =
    description.match(/•\s*([\d.,KM]+)\s+Threads/i) ||
    description.match(/•\s*([\d.,KM]+)\s*則串文/);
  const bio = description.split("•").slice(2).join("•");

  return {
    followers: followersMatch ? parseCompactNumber(followersMatch[1]) : null,
    posts: postsMatch ? postsMatch[1] : null,
    bio: normalizeWhitespace(bio),
  };
}

function extractProfileName(title = "", handle = "") {
  return normalizeWhitespace(
    title
      .replace(new RegExp(`（@${handle}）.*$`), "")
      .replace(new RegExp(`\\(@${handle}\\).*$`), "")
      .replace(/•.*/g, "")
      .replace(/，.*/g, ""),
  );
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: REQUEST_HEADERS,
    next: { revalidate: 0 },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  return response.text();
}

function parseMeta(html) {
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

function createSearchQueries(keywords, platforms) {
  const keywordList = keywords.length ? keywords : DEFAULT_DISCOVERY_INPUT.keywords;
  const baseQueries = keywordList.slice(0, 4).flatMap((keyword) => [
    `${keyword} IG 職涯 課程`,
    `${keyword} Threads 求職 面試`,
  ]);

  return baseQueries.filter((query) =>
    platforms.some((platform) =>
      platform === "instagram" ? query.includes("IG") : query.includes("Threads"),
    ),
  );
}

function extractUrlsFromSearch(html) {
  const matches = [
    ...html.matchAll(/uddg=([^"&]+)["&]/g),
    ...html.matchAll(/result__url[^>]*>([^<]+)</g),
  ];

  const urls = new Set();
  for (const match of matches) {
    const raw = decodeURIComponent(decodeHtmlEntities(match[1]));
    if (raw.startsWith("http")) {
      urls.add(raw);
    }
  }

  return [...urls];
}

function extractProfileLinks(html) {
  const urls = new Set();
  for (const match of html.matchAll(/https:\/\/www\.(instagram\.com\/[^"'\\<\s]+|threads\.net\/@[^"'\\<\s]+)/g)) {
    urls.add(match[0].replace(/[),.;]+$/, ""));
  }
  return [...urls];
}

function normalizeCandidateUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (hostname === "instagram.com") {
      const [handle] = parsed.pathname.split("/").filter(Boolean);
      if (!handle || ["p", "reel", "stories"].includes(handle)) return null;
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

function buildCollabAngle(tags) {
  if (tags.includes("線上課程")) return "課程上架 / 聯名企劃";
  if (tags.includes("顧問服務")) return "職涯 QA / 直播問答";
  if (tags.includes("招聘視角")) return "面試內容專欄";
  return "內容共創";
}

function scoreProfile(profile, input) {
  let score = 45;
  const text = `${profile.name} ${profile.bio} ${(profile.tags || []).join(" ")}`.toLowerCase();

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

  return Math.min(98, Math.max(28, score));
}

async function enrichProfile(candidate) {
  try {
    const html = await fetchText(candidate.url);
    const meta = parseMeta(html);
    const parsed =
      candidate.platform === "instagram"
        ? parseInstagramDescription(meta.description)
        : parseThreadsDescription(meta.description);

    return {
      ...candidate,
      name:
        extractProfileName(meta.title, candidate.handle) ||
        candidate.name ||
        candidate.handle,
      followers: parsed.followers ?? candidate.followers ?? null,
      posts: parsed.posts ?? candidate.posts ?? null,
      bio:
        parsed.bio ||
        candidate.bio ||
        "目前無法自動擷取完整簡介，建議人工打開檢查。",
      website: candidate.website,
      sourceNotes: candidate.sourceNotes || [],
    };
  } catch (error) {
    return {
      ...candidate,
      name: candidate.name || candidate.handle,
      followers: candidate.followers || null,
      posts: candidate.posts || null,
      bio: candidate.bio || "目前無法自動讀取公開簡介，建議人工複核。",
      website: candidate.website,
      sourceNotes: [...(candidate.sourceNotes || []), "公開頁面讀取失敗"],
    };
  }
}

async function searchDuckDuckGo(query) {
  const response = await fetch("https://html.duckduckgo.com/html/", {
    method: "POST",
    headers: {
      ...REQUEST_HEADERS,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ q: query }),
    next: { revalidate: 0 },
  });

  if (!response.ok) return [];
  const html = await response.text();
  const directUrls = extractUrlsFromSearch(html);
  const extraUrls = [];

  await Promise.all(
    directUrls.slice(0, 6).map(async (url) => {
      if (url.includes("instagram.com/") || url.includes("threads.net/@")) return;
      try {
        const pageHtml = await fetchText(url);
        extraUrls.push(...extractProfileLinks(pageHtml));
      } catch (error) {
        return null;
      }
    }),
  );

  return [...new Set([...directUrls, ...extraUrls])];
}

export async function getSeedProfiles(input = DEFAULT_DISCOVERY_INPUT) {
  const enriched = await Promise.all(seedProfiles.map(enrichProfile));

  return enriched
    .map((profile) => {
      const tags = [...new Set([...(profile.tags || []), ...inferTags(profile.bio)])];
      return {
        ...profile,
        tags,
        collabAngleShort: buildCollabAngle(tags),
        score: scoreProfile({ ...profile, tags }, input),
      };
    })
    .sort((left, right) => right.score - left.score);
}

export async function discoverCreators(input = DEFAULT_DISCOVERY_INPUT) {
  const seeds = await getSeedProfiles(input);
  const queries = createSearchQueries(input.keywords || [], input.platforms || []);
  const discoveredUrls = (
    await Promise.all(queries.map(searchDuckDuckGo))
  ).flat();

  const candidateMap = new Map(
    seeds.map((profile) => [
      `${profile.platform}:${profile.handle}`,
      {
        ...profile,
      },
    ]),
  );

  for (const url of discoveredUrls) {
    const normalized = normalizeCandidateUrl(url);
    if (!normalized) continue;
    if (!(input.platforms || []).includes(normalized.platform)) continue;

    const key = `${normalized.platform}:${normalized.handle}`;
    if (!candidateMap.has(key)) {
      candidateMap.set(key, {
        ...normalized,
        sourceNotes: ["DuckDuckGo 即時搜尋"],
      });
    }
  }

  const enriched = await Promise.all(
    [...candidateMap.values()].slice(0, 24).map(enrichProfile),
  );

  return enriched
    .map((profile) => {
      const tags = [...new Set([...(profile.tags || []), ...inferTags(profile.bio)])];
      return {
        ...profile,
        tags,
        collabAngleShort: buildCollabAngle(tags),
        score: scoreProfile({ ...profile, tags }, input),
      };
    })
    .sort((left, right) => right.score - left.score);
}
