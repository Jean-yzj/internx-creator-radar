import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedProfiles } from "./data/seed_profiles.js";
import { discoverViaCse } from "./lib/cse.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");

function sendJson(res, payload, statusCode = 200) {
  res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath, contentType) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not Found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
}

function scoreMatch(profile, keywords) {
  if (!keywords.length) return 0;
  const haystack = `${profile.name} ${profile.bio} ${(profile.tags || []).join(" ")}`.toLowerCase();
  return keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
}

function filterAndRank(profiles, { minFollowers, maxFollowers, platforms, keywords }) {
  return profiles
    .filter((profile) => platforms.includes(profile.platform))
    .filter((profile) => {
      if (profile.followers == null) return true;
      return profile.followers >= minFollowers && profile.followers <= maxFollowers;
    })
    .map((profile) => ({
      ...profile,
      matchedKeywords: scoreMatch(profile, keywords)
    }))
    .sort((a, b) => {
      if (b.matchedKeywords !== a.matchedKeywords) return b.matchedKeywords - a.matchedKeywords;
      return (b.score || 0) - (a.score || 0);
    });
}

async function handleDiscover(query) {
  const minFollowers = Number(query.minFollowers || 0);
  const maxFollowers = Number(query.maxFollowers || 999_999_999);
  const platforms = (query.platforms || "instagram,threads")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const keywords = (query.keywords || "")
    .split(/[,\s]+/)
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const seedFiltered = filterAndRank(seedProfiles, { minFollowers, maxFollowers, platforms, keywords });

  const cse = await discoverViaCse({ keywords, platforms });
  const seenIds = new Set(seedFiltered.map((p) => p.id));
  const cseFresh = cse.profiles.filter((p) => !seenIds.has(p.id));

  return {
    profiles: [...seedFiltered, ...cseFresh],
    meta: {
      seedTotal: seedProfiles.length,
      seedMatched: seedFiltered.length,
      cseEnabled: cse.enabled,
      cseAdded: cseFresh.length,
      cseError: cse.error || null
    }
  };
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === "/api/discover") {
    try {
      const payload = await handleDiscover(Object.fromEntries(requestUrl.searchParams.entries()));
      sendJson(res, payload);
    } catch (err) {
      console.error("discover error:", err);
      sendJson(res, { profiles: [], error: err.message }, 500);
    }
    return;
  }

  if (requestUrl.pathname === "/" || requestUrl.pathname === "/index.html") {
    sendFile(res, path.join(publicDir, "index.html"), "text/html; charset=utf-8");
    return;
  }

  const assetPath = path.join(publicDir, requestUrl.pathname);
  const ext = path.extname(assetPath);
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };
  sendFile(res, assetPath, contentTypes[ext] || "text/plain; charset=utf-8");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Creator Radar running on http://0.0.0.0:${PORT}`);
  console.log(`Seed profiles: ${seedProfiles.length}`);
  console.log(`Google CSE: ${process.env.GOOGLE_CSE_KEY && process.env.GOOGLE_CSE_CX ? "enabled" : "disabled"}`);
});
