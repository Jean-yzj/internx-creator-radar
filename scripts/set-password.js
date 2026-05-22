#!/usr/bin/env node
// Reset a user's password without needing the old one. Use as an admin tool
// when someone forgets, or when rotating the seeded defaults.
//
// Usage:
//   node scripts/set-password.js <username> <newPassword>
//   STATE_DIR=/app/state node scripts/set-password.js ceo new-pass-here
//
// IMPORTANT: stop the server first. The server caches state in memory and
// would overwrite this CLI's change on its next save. The script refuses to
// run while a live server process owns the pidfile.
//
// To change your own password while the server is running, use the "改密碼"
// button in the web UI (calls POST /api/auth/change-password).

import { detectRunningServer } from "../lib/storage.js";
import { ensureSeedUsers, changePasswordByUsername } from "../lib/auth.js";

const [, , username, newPassword] = process.argv;

if (!username || !newPassword) {
  console.error("Usage: node scripts/set-password.js <username> <newPassword>");
  process.exit(2);
}

const runningPid = detectRunningServer();
if (runningPid) {
  console.error(`[set-password] Server process ${runningPid} is running and would overwrite this change.`);
  console.error("  Stop the server first, then re-run this script.");
  console.error("  (Or change your own password via the web UI — that goes through the live server.)");
  process.exit(1);
}

ensureSeedUsers();

const result = changePasswordByUsername({ username, newPassword });
if (result.error) {
  console.error(`[set-password] ${result.error}`);
  process.exit(1);
}

console.log(`[set-password] Updated password for "${username}". All existing sessions invalidated.`);
