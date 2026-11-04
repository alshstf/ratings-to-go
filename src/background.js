// The service worker: keeps the job as collectors report, and when an export
// finishes sends it to the user's server if they asked for that.
import { apply, getJob, getSettings, sendJob, setJob } from "./core/job.js";

// Messages from one tab arrive in order; the chain keeps their writes in
// that order too.
let queue = Promise.resolve();

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (sender.id !== chrome.runtime.id || !msg?.type?.startsWith("job:")) return;
  queue = queue.then(() => handle(msg)).catch((e) => console.error("job", e));
});

async function handle(msg) {
  const job = await setJob(apply(await getJob(), msg));
  if (msg.type !== "job:done" || !job) return;
  const settings = await getSettings();
  if (settings.autoSend && settings.server && settings.token) await sendJob(job, settings);
}
