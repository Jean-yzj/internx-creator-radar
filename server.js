const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.join(__dirname, "public");

const profiles = [
  {
    id: "stella_ig",
    name: "職涯小夥伴 Stella",
    handle: "stella_shinycareer",
    platform: "instagram",
    followers: 21000,
    posts: 200,
    score: 92,
    website: "https://portaly.cc/stella_shinycareer/",
    url: "https://www.instagram.com/stella_shinycareer/",
    collabAngleShort: "職涯 QA / 直播問答",
    bio: "職涯諮詢、求職技巧與 Life Coach 內容，適合做履歷面試 QA、職涯直播與顧問型合作。",
    tags: ["職涯諮詢", "履歷面試", "Life Coach", "顧問服務"],
    sourceNotes: ["Dcard 職涯小夥伴 Stella", "Portaly"]
  },
  {
    id: "stella_threads",
    name: "職涯小夥伴 Stella",
    handle: "stella_shinycareer",
    platform: "threads",
    followers: 7203,
    posts: 275,
    score: 98,
    website: "https://portaly.cc/stella_shinycareer/",
    url: "https://www.threads.net/@stella_shinycareer",
    collabAngleShort: "職涯 QA / 直播問答",
    bio: "SCPC 國際職業策略規劃師，具資深 HR 與大量諮詢經驗，在 Threads 上有穩定職涯問答內容。",
    tags: ["Threads 活躍", "職涯諮詢", "履歷面試", "QA 互動"],
    sourceNotes: ["Threads 公開頁面"]
  },
  {
    id: "ina",
    name: "Ina Wang",
    handle: "inawang_lifestyle",
    platform: "instagram",
    followers: 17000,
    posts: 412,
    score: 91,
    website: "https://inawang.com/product/resume-interview-lesson/",
    url: "https://www.instagram.com/inawang_lifestyle/",
    collabAngleShort: "課程上架 / 聯名企劃",
    bio: "行銷講師、個人品牌與數位遊牧內容，有明確課程銷售與知識變現能力，適合談課程上架或聯名活動。",
    tags: ["求職課程", "履歷面試", "個人品牌", "線上課程"],
    sourceNotes: ["Ina Wang 求職必修課"]
  },
  {
    id: "recruitexpress",
    name: "立可人事 Recruit Express",
    handle: "recruitexpress_tw",
    platform: "instagram",
    followers: 5824,
    posts: 412,
    score: 90,
    website: "https://flufi.me/profile/recruitexpress_tw",
    url: "https://www.instagram.com/recruitexpress_tw/",
    collabAngleShort: "外商求職專欄 / 問答",
    bio: "外商獵頭顧問、履歷面試與求職內容完整，具招聘視角，適合做外商求職問答或職缺合作內容。",
    tags: ["獵頭顧問", "履歷面試", "外商求職", "職涯平台"],
    sourceNotes: ["Flufi Profile"]
  },
  {
    id: "zizi",
    name: "Zoey Hsueh",
    handle: "zizithinking",
    platform: "instagram",
    followers: 198,
    posts: 35,
    score: 61,
    website: "https://linktr.ee/zoey.cnc",
    url: "https://www.instagram.com/zizithinking/",
    collabAngleShort: "早期合作 / 成長觀察",
    bio: "聚焦職涯內容與個人品牌的小型帳號，目前粉絲較低，但合作門檻相對低，適合追蹤成長性。",
    tags: ["自由工作", "職涯諮詢", "個人品牌", "顧問服務"],
    sourceNotes: ["Linktree zoey.cnc"]
  },
  {
    id: "brenda",
    name: "布姐 Brenda",
    handle: "brenda.lifecoach",
    platform: "instagram",
    followers: 798,
    posts: 366,
    score: 63,
    website: "https://www.coach.com.tw/",
    url: "https://www.instagram.com/brenda.lifecoach/",
    collabAngleShort: "顧問合作 / 小型講座",
    bio: "人生教練與職涯轉型內容為主，雖然粉絲低於目標帶，但適合做深度顧問合作與小型社群活動。",
    tags: ["職涯轉型", "人生教練", "講座課程", "顧問服務"],
    sourceNotes: ["coach.com.tw"]
  },
  {
    id: "emerald",
    name: "豐才管顧 Emerald Talent",
    handle: "emerald_talent",
    platform: "instagram",
    followers: null,
    posts: null,
    score: 78,
    website: "https://linktr.ee/emerald_talent",
    url: "https://www.instagram.com/emerald_talent/",
    collabAngleShort: "求職合作內容",
    bio: "求職輔導與職涯顧問定位明確，資料仍需人工補齊粉絲與內容細節。",
    tags: ["求職輔導", "職涯顧問", "線上服務", "LinkedIn"],
    sourceNotes: ["Emerald Talent Linktree"]
  },
  {
    id: "104academy",
    name: "104 職涯學院",
    handle: "104career_academy",
    platform: "instagram",
    followers: null,
    posts: null,
    score: 74,
    website: "https://portaly.cc/104career_academy",
    url: "https://www.instagram.com/104career_academy/",
    collabAngleShort: "平台合作參考",
    bio: "大型職涯平台帳號，合作價值高但不完全符合中小型創作者區間，適合作為平台合作參考樣本。",
    tags: ["職涯平台", "履歷面試", "課程", "大型品牌"],
    sourceNotes: ["104 職涯學院 Portaly"]
  }
];

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
  const haystack = `${profile.name} ${profile.bio} ${profile.tags.join(" ")}`.toLowerCase();
  return keywords.reduce((total, keyword) => total + (haystack.includes(keyword) ? 1 : 0), 0);
}

function filterProfiles(query) {
  const minFollowers = Number(query.minFollowers || 0);
  const maxFollowers = Number(query.maxFollowers || 999999999);
  const platforms = (query.platforms || "instagram,threads")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const keywords = (query.keywords || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return profiles
    .filter((profile) => platforms.includes(profile.platform))
    .filter((profile) => {
      if (!profile.followers) return true;
      return profile.followers >= minFollowers && profile.followers <= maxFollowers;
    })
    .map((profile) => ({
      ...profile,
      matchedKeywords: scoreMatch(profile, keywords)
    }))
    .sort((a, b) => {
      if (b.matchedKeywords !== a.matchedKeywords) return b.matchedKeywords - a.matchedKeywords;
      return b.score - a.score;
    });
}

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);

  if (requestUrl.pathname === "/api/discover") {
    sendJson(res, { profiles: filterProfiles(Object.fromEntries(requestUrl.searchParams.entries())) });
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
});
