import { t, localize } from "../core/i18n.js";
import { getJob, getSettings, sendJob, setJob } from "../core/job.js";
import { toCSV } from "../core/items.js";
import { sourceById, sourceFor, sources } from "../core/sources.js";

const $ = (id) => document.getElementById(id);
let tab = null;

async function render() {
  const job = await getJob();
  const settings = await getSettings();
  const here = tab ? sourceFor(tab.url) : null;

  $("elsewhere").hidden = !!here;
  $("here").hidden = !here;
  if (here) {
    const resumable = job?.source === here.id && (job.status === "blocked" || job.status === "error") && job.resume;
    $("here-text").textContent = t(resumable ? "resumeText" : here.hintKey);
    $("start").textContent = t(resumable ? "resume" : "start", t(here.nameKey));
    $("start").disabled = job?.status === "running";
    $("start").dataset.resume = resumable ? "1" : "";
  }

  $("job").hidden = !job;
  if (!job) return;
  const name = t(sourceById(job.source)?.nameKey ?? job.source);
  const count = job.items.length;
  const text = {
    running: t("jobRunning", name, job.done || 0, job.total || "…", count),
    blocked: t("jobBlocked", name, count),
    error: t("jobError", name, count),
    done: t("jobDone", name, count),
  }[job.status];
  $("job-text").textContent = text;
  $("job-progress").hidden = job.status !== "running";
  if (job.total) {
    $("job-progress").max = job.total;
    $("job-progress").value = job.done || 0;
  } else {
    $("job-progress").removeAttribute("value");
  }
  $("job-hint").textContent =
    job.status === "blocked" ? t(`blocked_${job.reason}`) : job.status === "error" ? job.message : "";
  $("download").disabled = count === 0;
  $("send").hidden = !(settings.server && settings.token);
  $("send").disabled = count === 0 || job.status === "running";
  $("sent").textContent = !job.sent
    ? ""
    : job.sent.error
      ? t("sentError", job.sent.error)
      : t("sentOK", job.sent.result?.rows ?? count, job.sent.result?.added ?? 0);
}

async function start() {
  const here = sourceFor(tab.url);
  const prev = await getJob();
  const resume = $("start").dataset.resume ? prev.resume : null;
  await setJob(
    resume
      ? { ...prev, status: "running", reason: "", message: "" }
      : { source: here.id, status: "running", done: 0, total: 0, resume: null, items: [], sent: null },
  );
  // activeTab: opening the popup on this tab is what lets us run in it.
  await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["src/content/runtime.js", here.script] });
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: (id, resume) => {
      globalThis.RatingsToGo.run(id, resume);
    },
    args: [here.id, resume],
  });
}

async function download() {
  const job = await getJob();
  const blob = new Blob([toCSV(job.items)], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `ratings-${job.source}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

async function sendNow() {
  $("send").disabled = true;
  await sendJob(await getJob(), await getSettings());
}

async function main() {
  localize();
  [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  for (const s of sources) {
    const li = document.createElement("li");
    li.textContent = `${t(s.nameKey)} — ${t(s.hintKey)}`;
    $("sites").append(li);
  }
  $("start").addEventListener("click", () =>
    start().catch(async (e) => {
      // The reader never started: the job must not stay "running".
      const job = await getJob();
      if (job?.status === "running") await setJob({ ...job, status: "error", message: String(e?.message ?? e) });
      showError(e);
    }),
  );
  $("download").addEventListener("click", download);
  $("send").addEventListener("click", () => sendNow().catch(showError));
  $("options").addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
  chrome.storage.onChanged.addListener(() => render());
  await render();
}

function showError(e) {
  $("job").hidden = false;
  $("job-hint").textContent = String(e?.message ?? e);
}

main();
