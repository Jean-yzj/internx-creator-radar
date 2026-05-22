import crypto from "node:crypto";

import { readState, mutate } from "./storage.js";

const SESSION_TTL_DAYS = 30;

const SEED_USERS = [
  {
    username: process.env.SEED_MARKETING_USER || "marketing",
    displayName: process.env.SEED_MARKETING_NAME || "行銷",
    role: "marketing",
    password: process.env.SEED_MARKETING_PASS || "marketing-2026",
  },
  {
    username: process.env.SEED_OPS_USER || "ops",
    displayName: process.env.SEED_OPS_NAME || "營運",
    role: "ops",
    password: process.env.SEED_OPS_PASS || "ops-2026",
  },
  {
    username: process.env.SEED_CEO_USER || "ceo",
    displayName: process.env.SEED_CEO_NAME || "執行長",
    role: "ceo",
    password: process.env.SEED_CEO_PASS || "ceo-2026",
  },
];

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

function constantTimeEquals(aHex, bHex) {
  const a = Buffer.from(aHex, "hex");
  const b = Buffer.from(bHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function makeUserRecord({ username, displayName, role, password }, id) {
  const salt = crypto.randomBytes(16).toString("hex");
  return {
    id,
    username,
    displayName,
    role,
    passwordHash: hashPassword(password, salt),
    passwordSalt: salt,
    createdAt: new Date().toISOString(),
  };
}

function serializeUser(u) {
  return { id: u.id, username: u.username, displayName: u.displayName, role: u.role };
}

export function ensureSeedUsers() {
  const s = readState();
  if (s.users.length > 0) return;
  mutate((draft) => {
    for (const seed of SEED_USERS) {
      draft.users.push(makeUserRecord(seed, draft.nextUserId++));
    }
  });
  console.log("[auth] Seeded default users (change passwords ASAP):");
  for (const seed of SEED_USERS) {
    console.log(`  - ${seed.username} (${seed.displayName}) password: ${seed.password}`);
  }
  console.log("[auth] Override defaults with SEED_MARKETING_PASS / SEED_OPS_PASS / SEED_CEO_PASS env vars before first run, or edit data/state.json.");
}

export function login(username, password) {
  const s = readState();
  const user = s.users.find((u) => u.username === username);
  if (!user) return null;

  const computed = hashPassword(password, user.passwordSalt);
  if (!constantTimeEquals(computed, user.passwordHash)) return null;

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 3600 * 1000).toISOString();
  mutate((draft) => {
    draft.sessions.push({
      token,
      userId: user.id,
      createdAt: new Date().toISOString(),
      expiresAt,
    });
  });
  return { token, expiresAt, user: serializeUser(user) };
}

export function logout(token) {
  if (!token) return;
  mutate((draft) => {
    draft.sessions = draft.sessions.filter((sess) => sess.token !== token);
  });
}

export function userForToken(token) {
  if (!token) return null;
  const s = readState();
  const session = s.sessions.find((sess) => sess.token === token);
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    mutate((draft) => {
      draft.sessions = draft.sessions.filter((sess) => sess.token !== token);
    });
    return null;
  }
  const user = s.users.find((u) => u.id === session.userId);
  if (!user) return null;
  return serializeUser(user);
}

export function parseCookies(req) {
  const header = req.headers.cookie || "";
  const cookies = {};
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const idx = trimmed.indexOf("=");
    if (idx < 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // leave value as-is if it isn't URI-encoded
    }
    cookies[key] = value;
  }
  return cookies;
}

// Set COOKIE_SECURE=true behind TLS / reverse proxy so the session cookie
// gets the `Secure` flag. Leave unset on plain http://localhost during dev.
const COOKIE_SECURE = process.env.COOKIE_SECURE === "true";
const SECURE_SUFFIX = COOKIE_SECURE ? "; Secure" : "";

export function buildSessionCookie(token, expiresAt) {
  const expires = new Date(expiresAt).toUTCString();
  return `session=${token}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}${SECURE_SUFFIX}`;
}

export function clearSessionCookie() {
  return `session=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT${SECURE_SUFFIX}`;
}

/**
 * Change the password for a given user. If `currentPassword` is provided we
 * verify it first (in-app change). When called from a server-side admin CLI
 * pass `requireCurrent: false` to skip that check.
 *
 * Returns: { ok: true } on success, or { error } describing the failure.
 * All sessions for the user are invalidated on success — they need to log
 * back in everywhere with the new password.
 */
export function changePassword({ userId, currentPassword, newPassword, requireCurrent = true }) {
  if (typeof newPassword !== "string" || newPassword.length < 6) {
    return { error: "新密碼至少要 6 個字元" };
  }
  const s = readState();
  const user = s.users.find((u) => u.id === userId);
  if (!user) return { error: "找不到使用者" };

  if (requireCurrent) {
    if (typeof currentPassword !== "string" || !currentPassword) {
      return { error: "請輸入目前的密碼" };
    }
    const computed = hashPassword(currentPassword, user.passwordSalt);
    if (!constantTimeEquals(computed, user.passwordHash)) {
      return { error: "目前的密碼不對" };
    }
    if (currentPassword === newPassword) {
      return { error: "新密碼跟舊的一樣" };
    }
  }

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = hashPassword(newPassword, salt);
  mutate((draft) => {
    const u = draft.users.find((x) => x.id === userId);
    if (!u) return;
    u.passwordSalt = salt;
    u.passwordHash = hash;
    draft.sessions = draft.sessions.filter((sess) => sess.userId !== userId);
  });
  return { ok: true };
}

export function changePasswordByUsername({ username, newPassword }) {
  const s = readState();
  const user = s.users.find((u) => u.username === username);
  if (!user) return { error: `找不到帳號：${username}` };
  return changePassword({ userId: user.id, newPassword, requireCurrent: false });
}

export function pruneExpiredSessions() {
  const now = Date.now();
  mutate((draft) => {
    draft.sessions = draft.sessions.filter((sess) => new Date(sess.expiresAt).getTime() >= now);
  });
}
