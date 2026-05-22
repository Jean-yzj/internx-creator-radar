import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = process.env.STATE_DIR || path.join(__dirname, "..", "data");
const STATE_PATH = path.join(DATA_DIR, "state.json");
const TMP_PATH = `${STATE_PATH}.tmp`;

const DEFAULT_STATE = {
  schemaVersion: 1,
  users: [],
  sessions: [],
  creators: {},
  userPrefs: {},
  activity: [],
  nextUserId: 1,
  nextActivityId: 1,
};

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

let state;
if (fs.existsSync(STATE_PATH)) {
  try {
    const raw = fs.readFileSync(STATE_PATH, "utf8");
    state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (err) {
    console.error("[storage] Failed to parse state.json; starting from defaults.", err);
    state = structuredClone(DEFAULT_STATE);
  }
} else {
  state = structuredClone(DEFAULT_STATE);
}

let writeInFlight = false;
let writeQueued = false;

function flush() {
  if (writeInFlight) {
    writeQueued = true;
    return;
  }
  writeInFlight = true;
  const snapshot = JSON.stringify(state, null, 2);
  fs.writeFile(TMP_PATH, snapshot, (err) => {
    if (err) {
      writeInFlight = false;
      console.error("[storage] write failed", err);
      return;
    }
    fs.rename(TMP_PATH, STATE_PATH, (renameErr) => {
      writeInFlight = false;
      if (renameErr) {
        console.error("[storage] rename failed", renameErr);
        return;
      }
      if (writeQueued) {
        writeQueued = false;
        flush();
      }
    });
  });
}

export function readState() {
  return state;
}

/**
 * Apply a synchronous mutation against the in-memory state and persist it.
 * `fn` must NOT be async — Node is single-threaded, so as long as no await
 * happens between read and write, mutations are atomic from the app's POV.
 */
export function mutate(fn) {
  const result = fn(state);
  flush();
  return result;
}

export const __testing = { STATE_PATH };

// ---- Multi-process safety -------------------------------------------------
// storage.js reads state.json once at import time and never reloads. If a
// second process (e.g. scripts/set-password.js) mutates the file while the
// server is running, the server's in-memory state diverges and will overwrite
// the CLI's change on the next flush. To prevent that, the server writes a
// pidfile on startup and the CLI refuses to run while a live server owns it.

const PID_PATH = `${STATE_PATH}.pid`;

export function markServerRunning() {
  fs.writeFileSync(PID_PATH, String(process.pid));
  const cleanup = () => {
    try {
      const owner = fs.readFileSync(PID_PATH, "utf8");
      if (Number(owner) === process.pid) fs.unlinkSync(PID_PATH);
    } catch {
      // pidfile already gone; nothing to clean
    }
  };
  process.on("exit", cleanup);
  process.on("SIGINT", () => { cleanup(); process.exit(130); });
  process.on("SIGTERM", () => { cleanup(); process.exit(143); });
}

export function detectRunningServer() {
  if (!fs.existsSync(PID_PATH)) return null;
  const raw = fs.readFileSync(PID_PATH, "utf8").trim();
  const pid = Number(raw);
  if (!pid) return null;
  try {
    process.kill(pid, 0); // throws ESRCH if no such process
    return pid;
  } catch {
    try { fs.unlinkSync(PID_PATH); } catch {}
    return null;
  }
}
