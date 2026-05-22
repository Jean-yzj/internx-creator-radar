import { readState, mutate } from "./storage.js";

const ACTIVITY_LIMIT = 500;

function summarizeUser(u) {
  if (!u) return null;
  return { username: u.username, displayName: u.displayName, role: u.role };
}

function decorateCreator(handle, rec, users) {
  if (!rec) return null;
  const editor = rec.updatedById ? users.find((u) => u.id === rec.updatedById) : null;
  return {
    handle,
    pipeline: rec.pipeline || undefined,
    memo: rec.memo || undefined,
    updatedAt: rec.updatedAt,
    updatedBy: summarizeUser(editor),
  };
}

export function getCreatorStates() {
  const s = readState();
  const result = {};
  for (const [handle, rec] of Object.entries(s.creators)) {
    result[handle] = decorateCreator(handle, rec, s.users);
  }
  return result;
}

function pushActivity(draft, { userId, action, handle, before, after }) {
  draft.activity.push({
    id: draft.nextActivityId++,
    userId,
    action,
    handle,
    before,
    after,
    createdAt: new Date().toISOString(),
  });
  if (draft.activity.length > ACTIVITY_LIMIT) {
    draft.activity = draft.activity.slice(-ACTIVITY_LIMIT);
  }
}

export function updateCreator(handle, patch, userId) {
  let row = null;
  mutate((draft) => {
    const before = draft.creators[handle] || {};
    const nextPipeline = patch.pipeline !== undefined ? patch.pipeline : before.pipeline ?? null;
    const nextMemo = patch.memo !== undefined ? patch.memo : before.memo ?? null;

    draft.creators[handle] = {
      pipeline: nextPipeline,
      memo: nextMemo,
      updatedById: userId,
      updatedAt: new Date().toISOString(),
    };

    if (patch.pipeline !== undefined && (before.pipeline ?? null) !== (patch.pipeline ?? null)) {
      pushActivity(draft, {
        userId,
        action: "pipeline",
        handle,
        before: before.pipeline ?? null,
        after: patch.pipeline ?? null,
      });
    }
    if (patch.memo !== undefined && (before.memo ?? null) !== (patch.memo ?? null)) {
      pushActivity(draft, {
        userId,
        action: "memo",
        handle,
        before: before.memo ?? null,
        after: patch.memo ?? null,
      });
    }

    row = decorateCreator(handle, draft.creators[handle], draft.users);
  });
  return row;
}

export function getUserPrefs(userId) {
  const s = readState();
  return s.userPrefs[userId] || {};
}

export function setUserPrefs(userId, partialPrefs) {
  mutate((draft) => {
    draft.userPrefs[userId] = { ...(draft.userPrefs[userId] || {}), ...partialPrefs };
  });
  return getUserPrefs(userId);
}

export function getActivity({ limit = 50, username, handle } = {}) {
  const s = readState();
  const filterUserId = username
    ? s.users.find((u) => u.username === username)?.id ?? -1
    : null;
  const filterHandle = handle ? handle.toLowerCase() : null;

  // Walk newest-first and stop once we have `limit` matches, so filters don't
  // narrow a tiny pre-sliced window.
  const result = [];
  for (let i = s.activity.length - 1; i >= 0 && result.length < limit; i -= 1) {
    const item = s.activity[i];
    if (filterUserId !== null && item.userId !== filterUserId) continue;
    if (filterHandle !== null && item.handle !== filterHandle) continue;
    const user = s.users.find((u) => u.id === item.userId);
    result.push({
      id: item.id,
      action: item.action,
      handle: item.handle,
      before: item.before,
      after: item.after,
      createdAt: item.createdAt,
      user: summarizeUser(user),
    });
  }
  return result;
}

export function getMembers() {
  const s = readState();
  return s.users
    .slice()
    .sort((a, b) => a.id - b.id)
    .map((u) => ({ username: u.username, displayName: u.displayName, role: u.role }));
}

const PIPELINE_LABELS = {
  new: "待評估",
  priority: "優先接洽",
  watchlist: "持續追蹤",
  contacted: "已接洽",
  rejected: "不合適",
};
const PIPELINE_ORDER = {
  priority: 0,
  watchlist: 1,
  contacted: 2,
  new: 3,
  "": 4,
  null: 4,
  rejected: 5, // sorted last in CSV so the work list comes first
};
const ROLE_LABELS = { marketing: "行銷", ops: "營運", ceo: "執行長" };

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvLine(cells) {
  return cells.map(csvCell).join(",");
}

/**
 * Produce a CSV snapshot of all creators that have any label or memo set.
 * Includes UTF-8 BOM + CRLF line endings so Excel opens it without mojibake.
 */
export function exportCreatorsCsv() {
  const s = readState();
  const rows = Object.entries(s.creators)
    .filter(([, rec]) => rec && (rec.pipeline || rec.memo))
    .map(([handle, rec]) => {
      const editor = rec.updatedById ? s.users.find((u) => u.id === rec.updatedById) : null;
      return {
        handle,
        pipeline: rec.pipeline || "",
        memo: rec.memo || "",
        editor,
        updatedAt: rec.updatedAt || "",
      };
    });

  rows.sort((a, b) => {
    const orderA = PIPELINE_ORDER[a.pipeline] ?? 4;
    const orderB = PIPELINE_ORDER[b.pipeline] ?? 4;
    if (orderA !== orderB) return orderA - orderB;
    return (b.updatedAt || "").localeCompare(a.updatedAt || "");
  });

  const header = ["帳號", "內部狀態", "BD 備註", "最後修改者", "角色", "最後修改時間"];
  const body = rows.map((r) =>
    csvLine([
      `@${r.handle}`,
      PIPELINE_LABELS[r.pipeline] || "",
      r.memo,
      r.editor ? r.editor.displayName : "",
      r.editor ? ROLE_LABELS[r.editor.role] || r.editor.role : "",
      r.updatedAt,
    ]),
  );

  const BOM = "﻿";
  return BOM + [csvLine(header), ...body].join("\r\n") + "\r\n";
}
