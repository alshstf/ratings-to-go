import { t, localize } from "../core/i18n.js";
import { getSettings, saveSettings } from "../core/job.js";
import { checkServer, whoami } from "../core/server.js";

const $ = (id) => document.getElementById(id);
const say = (text) => ($("status").textContent = text);

function read() {
  return { server: $("server").value.trim(), token: $("token").value.trim(), autoSend: $("auto").checked };
}

async function save() {
  const s = read();
  if (s.server) {
    const bad = checkServer(s.server);
    if (bad) return say(t(bad));
  }
  await saveSettings(s);
  say(t("saved"));
}

async function check() {
  const s = read();
  const bad = s.server ? checkServer(s.server) : "errServerAddress";
  if (bad) return say(t(bad));
  say(t("checking"));
  try {
    const me = await whoami(s);
    say(t("checkOK", me?.name ?? ""));
  } catch (e) {
    say(t(e.status === 401 ? "checkBadToken" : "checkFailed", e.message));
  }
}

async function forget() {
  await saveSettings({ server: "", token: "", autoSend: false });
  $("server").value = $("token").value = "";
  $("auto").checked = false;
  say(t("forgotten"));
}

async function main() {
  localize();
  const s = await getSettings();
  $("server").value = s.server;
  $("token").value = s.token;
  $("auto").checked = s.autoSend;
  $("save").addEventListener("click", save);
  $("check").addEventListener("click", check);
  $("forget").addEventListener("click", forget);
}

main();
