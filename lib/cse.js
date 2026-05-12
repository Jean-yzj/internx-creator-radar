const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map();

function parseProfileUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    const parts = u.pathname.split("/").filter(Boolean);
    if (!parts.length) return null;

    if (host === "instagram.com") {
      const handle = parts[0];
      if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return null;
      const reserved = new Set(["p", "reel", "reels", "stories", "explore", "tv", "accounts", "direct"]);
      if (reserved.has(handle)) return null;
      return { platform: "instagram", handle, url: `https://www.instagram.com/${handle}/` };
    }

    if (host === "threads.net" || host === "threads.com") {
      const seg = parts[0];
      if (!seg || !seg.startsWith("@")) return null;
      const handle = seg.slice(1);
      if (!/^[A-Za-z0-9._]{2,30}$/.test(handle)) return null;
      return { platform: "threads", handle, url: `https://www.threads.net/@${handle}` };
    }

    return null;
  } catch {
    return null;
  }
}

async function searchOnce(query, key, cx) {
  const url = new URL("https://www.googleapis.com/customsearch/v1");
  url.searchParams.set("key", key);
  url.searchParams.set("cx", cx);
  url.searchParams.set("q", query);
  url.searchParams.set("num", "10");

  const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CSE ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return data.items || [];
}

async function discoverViaCse({ keywords, platforms }) {
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_CX;
  if (!key || !cx) return { profiles: [], enabled: false };
  if (!keywords || !keywords.length) return { profiles: [], enabled: true };

  const cacheKey = JSON.stringify({ keywords, platforms });
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { profiles: cached.profiles, enabled: true, cached: true };
  }

  const siteFilters = [];
  if (platforms.includes("instagram")) siteFilters.push("site:instagram.com");
  if (platforms.includes("threads")) siteFilters.push("site:threads.net OR site:threads.com");
  if (!siteFilters.length) return { profiles: [], enabled: true };

  const query = `${keywords.join(" ")} (${siteFilters.join(" OR ")})`;
  let items;
  try {
    items = await searchOnce(query, key, cx);
  } catch (err) {
    console.warn("CSE lookup failed:", err.message);
    return { profiles: [], enabled: true, error: err.message };
  }

  const seen = new Map();
  for (const item of items) {
    const parsed = parseProfileUrl(item.link);
    if (!parsed) continue;
    const id = `${parsed.handle}_${parsed.platform}`;
    if (seen.has(id)) continue;
    seen.set(id, {
      id,
      name: item.title?.split(/[（(•|@]/)[0]?.trim() || parsed.handle,
      handle: parsed.handle,
      platform: parsed.platform,
      url: parsed.url,
      website: null,
      followers: null,
      posts: null,
      score: 50,
      collabAngleShort: "需人工複核",
      bio: item.snippet || "Google 搜尋發現的候選帳號，內容需人工複核。",
      tags: ["待驗證"],
      sourceNotes: ["Google Custom Search"]
    });
  }

  const profiles = [...seen.values()];
  cache.set(cacheKey, { profiles, at: Date.now() });
  return { profiles, enabled: true };
}

export { discoverViaCse };
