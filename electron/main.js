const { app, BrowserWindow, Menu, ipcMain, safeStorage } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");
const { createClient } = require("@supabase/supabase-js");
const { resolveZenformedCoreApiBaseUrl } = require("./zenformedCoreUrlPolicy.cjs");

// Load .env.local so NEXT_PUBLIC_SUPABASE_* are available in main (e.g. for electron:dev)
const root = path.join(__dirname, "..");

/**
 * Single manifest: src/platform/appDefinitions/buildcore-app-runtime.json (same file Next imports via TS).
 * Packaged apps: electron-builder copies it to process.resourcesPath (see package.json build.extraResources).
 * Dev: read from repo src/; optional electron/buildcore-app-runtime.json copy if you add a sync script later.
 */
function loadBuildCoreRuntimeManifest() {
  const candidates = [];
  if (app.isPackaged) {
    candidates.push(path.join(process.resourcesPath, "buildcore-app-runtime.json"));
  } else {
    candidates.push(
      path.join(root, "src", "platform", "appDefinitions", "buildcore-app-runtime.json")
    );
    candidates.push(path.join(__dirname, "buildcore-app-runtime.json"));
  }
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  }
  throw new Error(
    `buildcore-app-runtime.json not found (isPackaged=${app.isPackaged}). Tried:\n${candidates.join("\n")}`
  );
}

const buildCoreDefinition = loadBuildCoreRuntimeManifest();
for (const f of [".env.local", ".env"]) {
  const p = path.join(root, f);
  if (fs.existsSync(p)) {
    try {
      const content = fs.readFileSync(p, "utf8");
      content.split("\n").forEach((line) => {
        const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
      });
    } catch (e) {}
    break;
  }
}

const isDev = process.env.ELECTRON_DEV === "1";
const PORT = process.env.PORT || 3020;
let serverProcess = null;

const iconPath = path.join(__dirname, "..", "public", "app-icon.png");
const SESSION_FILE = path.join(app.getPath("userData"), "supabase-session.enc");
// Stub: local SQLite sync is unused (SaaS uses Supabase directly). Keeps IPC handlers working without better-sqlite3.
const syncService = {
  getJobs: () => [],
  upsertJob: () => {},
  deleteJob: () => {},
  isOnline: () => Promise.resolve(false),
  pushToSupabase: () => Promise.resolve({ pushed: 0 }),
};
let syncIntervalId = null;

function waitForServer(port, maxWaitMs = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tryOnce = () => {
      const req = http.get(
        `http://127.0.0.1:${port}/`,
        { timeout: 2000 },
        (res) => resolve()
      );
      req.on("error", () => {
        if (Date.now() - start > maxWaitMs)
          return reject(new Error("Server did not start"));
        setTimeout(tryOnce, 300);
      });
      req.on("timeout", () => {
        req.destroy();
        if (Date.now() - start > maxWaitMs)
          return reject(new Error("Server did not start"));
        setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

function createWindow() {
  Menu.setApplicationMenu(null);

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: buildCoreDefinition.displayName,
    icon: iconPath,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadURL(`http://localhost:${PORT}`);
  // win.webContents.openDevTools(); // uncomment to debug (dev)

  win.on("closed", () => {
    app.quit();
  });
}

function startProductionServer() {
  const resourcesPath = process.resourcesPath;
  const standalonePath = path.join(resourcesPath, "standalone");
  const nodeBinary = process.platform === "win32"
    ? path.join(resourcesPath, "node", "node.exe")
    : path.join(resourcesPath, "node", "bin", "node");
  const serverJs = path.join(standalonePath, "server.js");
  const userDataPath = app.getPath("userData");

  return new Promise((resolve, reject) => {
    serverProcess = spawn(nodeBinary, [serverJs], {
      cwd: standalonePath,
      env: {
        ...process.env,
        PORT: String(PORT),
        DATA_PATH: userDataPath,
        NODE_ENV: "production",
      },
      stdio: "ignore",
    });

    serverProcess.on("error", (err) => {
      reject(err);
    });
    serverProcess.on("exit", (code, signal) => {
      serverProcess = null;
    });

    waitForServer(PORT).then(resolve).catch(reject);
  });
}

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.warn("Supabase env not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). check-license will fail.");
    return { url: "", key: "" };
  }
  return { url, key };
}

function readStoredSession() {
  try {
    if (!fs.existsSync(SESSION_FILE)) return null;
    const encrypted = fs.readFileSync(SESSION_FILE, "utf8");
    if (!safeStorage.isEncryptionAvailable()) return null;
    const json = safeStorage.decryptString(Buffer.from(encrypted, "base64"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function writeStoredSession(session) {
  try {
    if (!session || !safeStorage.isEncryptionAvailable()) return;
    const json = JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at,
      user_id: session.user_id ?? session.user?.id,
    });
    const encrypted = safeStorage.encryptString(json);
    fs.writeFileSync(SESSION_FILE, encrypted.toString("base64"), "utf8");
  } catch (err) {
    console.error("Failed to store session:", err instanceof Error ? err.message : String(err));
  }
}

ipcMain.handle("save-session", (_, session) => {
  if (!session || typeof session !== "object") return;
  writeStoredSession(session);
});

ipcMain.handle("get-session", () => {
  return Promise.resolve(readStoredSession());
});

ipcMain.handle("clear-session", () => {
  try {
    if (fs.existsSync(SESSION_FILE)) fs.unlinkSync(SESSION_FILE);
  } catch (err) {
    console.error("Failed to clear session file:", err instanceof Error ? err.message : String(err));
  }
  return Promise.resolve();
});

ipcMain.handle("check-license", async () => {
  const session = readStoredSession();
  if (!session) return { licensed: false, error: "Not logged in" };
  const token =
    typeof session.access_token === "string" ? session.access_token.trim() : "";
  if (!token) return { licensed: false, error: "Session invalid" };

  const coreBase = resolveZenformedCoreApiBaseUrl(process.env.ZENFORMED_CORE_API_URL);
  const defaultSlug = buildCoreDefinition.appSlug;
  const appSlug = (process.env.ZENFORMED_APP_SLUG || defaultSlug).trim() || defaultSlug;

  if (coreBase && typeof fetch === "function") {
    try {
      const entUrl = `${coreBase}/apps/${encodeURIComponent(appSlug)}/entitlement`;
      const res = await fetch(entUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.status === 401 || res.status === 403) {
        return { licensed: false, error: "Session invalid" };
      }
      if (res.status === 404) {
        return { licensed: false, error: "No profile" };
      }
      if (res.ok) {
        const j = await res.json();
        if (j && j.entitlement && typeof j.entitlement.subscriptionActive === "boolean") {
          return { licensed: j.entitlement.subscriptionActive };
        }
      }
    } catch (_) {
      /* fall through to temporary direct Supabase read */
    }
  }

  /** @deprecated Temporary — direct `profiles` read when Core URL unset or entitlement request failed */
  const { url, key } = getSupabaseEnv();
  if (!url || !key) return { licensed: false, error: "Supabase not configured" };
  try {
    const supabase = createClient(url, key);
    const { data: { session: current }, error: sessionError } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token || "",
    });
    if (sessionError || !current?.user) return { licensed: false, error: "Session invalid" };
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_status")
      .eq("id", current.user.id)
      .single();
    if (profileError || !profile) return { licensed: false, error: "No profile" };
    return { licensed: profile.subscription_status === "active" };
  } catch (err) {
    return { licensed: false, error: err?.message || "License check failed" };
  }
});

const userDataPath = () => app.getPath("userData");

ipcMain.handle("sync-get-jobs", (_, userId) => {
  return Promise.resolve(syncService.getJobs(userDataPath(), userId));
});

ipcMain.handle("sync-upsert-job", (_, userId, job) => {
  syncService.upsertJob(userDataPath(), userId, job);
  return Promise.resolve();
});

ipcMain.handle("sync-delete-job", (_, userId, jobId) => {
  syncService.deleteJob(userDataPath(), userId, jobId);
  return Promise.resolve();
});

ipcMain.handle("sync-now", async () => {
  const session = readStoredSession();
  const userId = session?.user_id;
  if (!session || !userId) return { pushed: 0, error: "Not logged in" };
  const { url, key } = getSupabaseEnv();
  if (!url || !key) return { pushed: 0, error: "Supabase not configured" };
  const online = await syncService.isOnline();
  if (!online) return { pushed: 0, error: "Offline" };
  try {
    return await syncService.pushToSupabase(session, url, key, userId);
  } catch (err) {
    return { pushed: 0, error: err?.message || "Sync failed" };
  }
});

function startPeriodicSync() {
  if (syncIntervalId) return;
  syncIntervalId = setInterval(async () => {
    const session = readStoredSession();
    if (!session?.user_id) return;
    const { url, key } = getSupabaseEnv();
    if (!url || !key) return;
    const online = await syncService.isOnline();
    if (!online) return;
    try {
      await syncService.pushToSupabase(session, url, key, session.user_id);
    } catch (e) {
      // ignore
    }
  }, 60 * 1000);
}

app.whenReady().then(async () => {
  if (!isDev && app.isPackaged) {
    try {
      await startProductionServer();
    } catch (err) {
      console.error("Failed to start server:", err instanceof Error ? err.message : String(err));
      app.quit();
      return;
    }
  }
  createWindow();
  startPeriodicSync();
});

app.on("window-all-closed", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  app.quit();
});

app.on("before-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
