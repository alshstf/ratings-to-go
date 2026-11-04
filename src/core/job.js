// The export in progress or last finished, kept in chrome.storage.local so
// it outlives the popup and the service worker:
//
//   { source, status: "running" | "blocked" | "done" | "error",
//     done, total,        pages read, pages in all
//     resume,             where the collector goes on after a stop
//     reason, message,    why it stopped
//     items,              what is collected so far
//     sent }              the server's answer: { at, result } or { at, error }
import { merge } from "./items.js";
import { send } from "./server.js";

export async function getJob() {
  return (await chrome.storage.local.get("job")).job ?? null;
}

export async function setJob(job) {
  await chrome.storage.local.set({ job });
  return job;
}

export async function updateJob(fn) {
  const job = await getJob();
  return setJob(fn(job));
}

// apply is a collector's message folded into the job.
export function apply(job, msg) {
  if (!job || job.source !== msg.source) return job;
  switch (msg.type) {
    case "job:items":
      return { ...job, items: merge([...job.items], msg.items) };
    case "job:progress":
      return { ...job, done: msg.done, total: msg.total, resume: msg.resume };
    case "job:blocked":
      return { ...job, status: "blocked", reason: msg.reason, message: msg.message };
    case "job:error":
      return { ...job, status: "error", message: msg.message };
    case "job:done":
      return { ...job, status: "done", resume: null };
  }
  return job;
}

export async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { server: "", token: "", autoSend: false, ...settings };
}

export const saveSettings = (settings) => chrome.storage.local.set({ settings });

// sendJob sends what the job collected and keeps the server's answer.
export async function sendJob(job, settings) {
  try {
    const result = await send(settings, job.items);
    return setJob({ ...job, sent: { at: new Date().toISOString(), result } });
  } catch (e) {
    return setJob({ ...job, sent: { at: new Date().toISOString(), error: e.message } });
  }
}
