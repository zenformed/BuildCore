const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAuth", {
  checkLicense: () => ipcRenderer.invoke("check-license"),
  saveSession: (session) => ipcRenderer.invoke("save-session", session),
  getSession: () => ipcRenderer.invoke("get-session"),
  clearSession: () => ipcRenderer.invoke("clear-session"),
});

contextBridge.exposeInMainWorld("electronSync", {
  getJobs: (userId) => ipcRenderer.invoke("sync-get-jobs", userId),
  upsertJob: (userId, job) => ipcRenderer.invoke("sync-upsert-job", userId, job),
  deleteJob: (userId, jobId) => ipcRenderer.invoke("sync-delete-job", userId, jobId),
  syncNow: () => ipcRenderer.invoke("sync-now"),
});
