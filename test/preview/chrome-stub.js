// A stand-in for the chrome.* API, so the popup and the settings open in a
// plain page (http://localhost, `npm run preview`) for a look and for the
// store's screenshots. #state=running|blocked|done|none picks the export
// shown; ?lang=ru|en the language.
const params = new URLSearchParams(location.hash.slice(1) || location.search);
const lang = params.get("lang") ?? "ru";
const messages = await (await fetch(`/_locales/${lang}/messages.json`)).json();
const now = new Date().toISOString();
const items = Array.from({ length: 812 }, (_, i) => ({ source: "kinopoisk", source_id: String(i), title: `Фильм ${i}`, rating: 8 }));
const jobs = {
  none: null,
  running: { source: "kinopoisk", status: "running", done: 7, total: 17, items: items.slice(0, 350), sent: null },
  blocked: { source: "kinopoisk", status: "blocked", reason: "captcha", done: 7, total: 17, resume: { page: 8 }, items: items.slice(0, 350), sent: null },
  done: { source: "kinopoisk", status: "done", done: 17, total: 17, items, sent: { at: now, result: { rows: 812, added: 812 } } },
};
const store = {
  job: jobs[params.get("state") ?? "done"],
  settings: { server: "https://argoose.example.com", token: "argoose_example", autoSend: true },
};
globalThis.chrome = {
  i18n: {
    getUILanguage: () => lang,
    getMessage: (key, subs = []) => {
      const m = messages[key];
      if (!m) return "";
      return m.message.replace(/\$(\w+)\$/g, (_, name) => {
        const n = Number(m.placeholders?.[name]?.content.slice(1));
        return subs[n - 1] ?? "";
      });
    },
  },
  storage: {
    local: { get: async (k) => ({ [k]: store[k] }), set: async (o) => Object.assign(store, o) },
    onChanged: { addListener() {} },
  },
  tabs: { query: async () => [{ id: 1, url: params.get("url") ?? "https://www.kinopoisk.ru/user/123456/votes/" }] },
  scripting: { executeScript: async () => [] },
  runtime: { id: "preview", openOptionsPage() {}, sendMessage: async () => {} },
};
