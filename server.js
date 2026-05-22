import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { discoverCreators, normalizeInput } from "./lib/runtimeDiscovery.js";
import { markServerRunning } from "./lib/storage.js";
import {
  ensureSeedUsers,
  login,
  logout,
  userForToken,
  parseCookies,
  buildSessionCookie,
  clearSessionCookie,
  pruneExpiredSessions,
  changePassword,
} from "./lib/auth.js";
import {
  getCreatorStates,
  updateCreator,
  getUserPrefs,
  setUserPrefs,
  getActivity,
  getMembers,
  exportCreatorsCsv,
} from "./lib/team-state.js";

markServerRunning();
ensureSeedUsers();
pruneExpiredSessions();

const PORT = Number(process.env.PORT || 3000);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");

const ALLOWED_PIPELINES = new Set(["new", "priority", "watchlist", "contacted", "rejected"]);

function sendJson(res, payload, statusCode = 200, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...extraHeaders,
  });
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

async function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    req.on("error", reject);
  });
}

function getUser(req) {
  const cookies = parseCookies(req);
  return userForToken(cookies.session);
}

function requireUser(req, res) {
  const user = getUser(req);
  if (!user) {
    sendJson(res, { error: "Not authenticated" }, 401);
    return null;
  }
  return user;
}

async function handleDiscover(req, res, requestUrl) {
  try {
    const body = req.method === "POST" ? await parseRequestBody(req) : {};
    const input = normalizeInput({
      ...Object.fromEntries(requestUrl.searchParams.entries()),
      ...body,
    });
    const data = await discoverCreators(input);

    sendJson(res, data);
  } catch (error) {
    sendJson(
      res,
      { error: error.message || "Discovery failed" },
      error.message === "Invalid JSON body" ? 400 : 500,
    );
  }
}

async function handleLogin(req, res) {
  try {
    const body = await parseRequestBody(req);
    const username = String(body.username || "").trim();
    const password = String(body.password || "");
    if (!username || !password) {
      return sendJson(res, { error: "請輸入帳號與密碼" }, 400);
    }
    const result = login(username, password);
    if (!result) {
      return sendJson(res, { error: "帳號或密碼錯誤" }, 401);
    }
    sendJson(res, { user: result.user }, 200, {
      "Set-Cookie": buildSessionCookie(result.token, result.expiresAt),
    });
  } catch (error) {
    sendJson(res, { error: error.message }, 400);
  }
}

function handleLogout(req, res) {
  const cookies = parseCookies(req);
  logout(cookies.session);
  sendJson(res, { ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
}

function handleMe(req, res) {
  const user = getUser(req);
  if (!user) return sendJson(res, { error: "Not authenticated" }, 401);
  sendJson(res, { user });
}

async function handleChangePassword(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const body = await parseRequestBody(req);
    const result = changePassword({
      userId: user.id,
      currentPassword: String(body.currentPassword || ""),
      newPassword: String(body.newPassword || ""),
    });
    if (result.error) {
      return sendJson(res, { error: result.error }, 400);
    }
    // changePassword invalidates ALL sessions for this user, including the
    // current one. Clear the cookie so the client falls back to the login UI.
    sendJson(res, { ok: true }, 200, { "Set-Cookie": clearSessionCookie() });
  } catch (error) {
    sendJson(res, { error: error.message }, 400);
  }
}

function handleStateGet(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  sendJson(res, {
    user,
    creators: getCreatorStates(),
    prefs: getUserPrefs(user.id),
    members: getMembers(),
  });
}

async function handleStateCreator(req, res, handleRaw) {
  const user = requireUser(req, res);
  if (!user) return;
  const handle = handleRaw.toLowerCase();
  try {
    const body = await parseRequestBody(req);
    const patch = {};
    if (body.pipeline !== undefined) {
      const val = body.pipeline;
      if (val !== null && val !== "" && !ALLOWED_PIPELINES.has(val)) {
        return sendJson(res, { error: "Invalid pipeline value" }, 400);
      }
      patch.pipeline = val || null;
    }
    if (body.memo !== undefined) {
      patch.memo = body.memo == null ? null : String(body.memo);
    }
    if (Object.keys(patch).length === 0) {
      return sendJson(res, { error: "No fields to update" }, 400);
    }
    const row = updateCreator(handle, patch, user.id);
    sendJson(res, row);
  } catch (error) {
    sendJson(res, { error: error.message }, 400);
  }
}

async function handlePrefs(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  try {
    const body = await parseRequestBody(req);
    const allowed = {};
    if (Array.isArray(body.chips)) {
      allowed.chips = body.chips.map((v) => String(v));
    }
    if (typeof body.statusFilter === "string") {
      allowed.statusFilter = body.statusFilter;
    }
    if (typeof body.courseOnly === "boolean") {
      allowed.courseOnly = body.courseOnly;
    }
    if (Object.keys(allowed).length === 0) {
      return sendJson(res, { error: "No prefs to update" }, 400);
    }
    const prefs = setUserPrefs(user.id, allowed);
    sendJson(res, { prefs });
  } catch (error) {
    sendJson(res, { error: error.message }, 400);
  }
}

function handleActivity(req, res, requestUrl) {
  const user = requireUser(req, res);
  if (!user) return;
  const rawLimit = Number(requestUrl.searchParams.get("limit"));
  const limit = Math.min(200, Math.max(1, Number.isFinite(rawLimit) ? rawLimit : 50));
  const username = requestUrl.searchParams.get("user") || undefined;
  const handle = requestUrl.searchParams.get("handle") || undefined;
  sendJson(res, { activity: getActivity({ limit, username, handle }) });
}

function handleExportCsv(req, res) {
  const user = requireUser(req, res);
  if (!user) return;
  const csv = exportCreatorsCsv();
  const today = new Date().toISOString().slice(0, 10);
  res.writeHead(200, {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="creator-radar-${today}.csv"`,
    "Cache-Control": "no-store",
  });
  res.end(csv);
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = requestUrl;

  if (pathname === "/api/discover") {
    await handleDiscover(req, res, requestUrl);
    return;
  }

  if (pathname === "/api/auth/login" && req.method === "POST") {
    await handleLogin(req, res);
    return;
  }
  if (pathname === "/api/auth/logout" && req.method === "POST") {
    handleLogout(req, res);
    return;
  }
  if (pathname === "/api/auth/me" && req.method === "GET") {
    handleMe(req, res);
    return;
  }
  if (pathname === "/api/auth/change-password" && req.method === "POST") {
    await handleChangePassword(req, res);
    return;
  }

  if (pathname === "/api/state" && req.method === "GET") {
    handleStateGet(req, res);
    return;
  }

  const creatorMatch = pathname.match(/^\/api\/state\/creator\/([^/]+)$/);
  if (creatorMatch && req.method === "PUT") {
    await handleStateCreator(req, res, decodeURIComponent(creatorMatch[1]));
    return;
  }

  if (pathname === "/api/prefs" && req.method === "PUT") {
    await handlePrefs(req, res);
    return;
  }

  if (pathname === "/api/activity" && req.method === "GET") {
    handleActivity(req, res, requestUrl);
    return;
  }

  if (pathname === "/api/export.csv" && req.method === "GET") {
    handleExportCsv(req, res);
    return;
  }

  if (pathname === "/" || pathname === "/index.html") {
    sendFile(res, path.join(publicDir, "index.html"), "text/html; charset=utf-8");
    return;
  }

  const assetPath = path.join(publicDir, pathname);
  const ext = path.extname(assetPath);
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
  };
  sendFile(res, assetPath, contentTypes[ext] || "text/plain; charset=utf-8");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Creator Radar running on http://0.0.0.0:${PORT}`);
});
