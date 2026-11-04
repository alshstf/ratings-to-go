// Runs in the site's tab, injected when the user starts an export there
// (activeTab): it reads the user's own pages the way the open tab would,
// with the user's session, one page at a time with a pause, and reports to
// the extension as it goes. When the site asks for a check (a captcha) or a
// sign-in, it stops and says so — the user passes it in the tab and goes on.
(() => {
  if (globalThis.RatingsToGo) return;

  class Blocked extends Error {
    constructor(reason, message) {
      super(message);
      this.reason = reason; // "captcha" | "login" | "layout"
    }
  }

  const report = (msg) => chrome.runtime.sendMessage(msg).catch(() => {});

  const RatingsToGo = {
    sources: {},
    Blocked,

    register(source) {
      RatingsToGo.sources[source.id] = source;
    },

    // run collects with the source's collector; resume is where a stopped
    // run left off.
    async run(id, resume) {
      const source = RatingsToGo.sources[id];
      if (!source) return;
      const ctx = {
        resume: resume ?? null,
        add: (items) => items.length && report({ type: "job:items", source: id, items }),
        progress: (p) => report({ type: "job:progress", source: id, ...p }),
        pause: () => new Promise((r) => setTimeout(r, 1500 + Math.random() * 1500)),
        blocked: (reason, message) => new Blocked(reason, message),
        fetchDocument: RatingsToGo.fetchDocument,
      };
      try {
        await source.collect(ctx);
        report({ type: "job:done", source: id });
      } catch (e) {
        if (e instanceof Blocked) {
          report({ type: "job:blocked", source: id, reason: e.reason, message: e.message });
        } else {
          report({ type: "job:error", source: id, message: String(e?.message ?? e) });
        }
      }
    },

    // fetchDocument reads a page of the same site with the user's session.
    // A redirect to a check page or a check form in the answer is Blocked.
    async fetchDocument(url) {
      const res = await fetch(url, { credentials: "include" });
      if (/captcha/i.test(res.url)) throw new Blocked("captcha", "");
      if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
      const doc = new DOMParser().parseFromString(await res.text(), "text/html");
      if (doc.querySelector('form[action*="captcha" i], #checkbox-captcha-form')) {
        throw new Blocked("captcha", "");
      }
      return doc;
    },
  };
  globalThis.RatingsToGo = RatingsToGo;
})();
