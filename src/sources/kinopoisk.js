// Kinopoisk: the user's votes, newest first, from
// /user/<id>/votes/list/ord/date/page/<n>/ — 50 a page, each with the film's
// link (its Kinopoisk id), the Russian and original titles, the year, the
// score and when it was given. The user opens their own profile; the id
// comes from its address.
(() => {
  const perPage = 50;

  // userId is the profile the tab shows: /user/<id>/…
  function userId(loc) {
    return loc.pathname.match(/^\/user\/(\d+)(\/|$)/)?.[1] ?? "";
  }

  const votesURL = (origin, id, page) => `${origin}/user/${id}/votes/list/ord/date/page/${page}/`;

  // «Конклав (2024)», «Очень странные дела (сериал, 2016 – 2025)»,
  // «Чернобыль (мини-сериал, 2019)», «Ирония судьбы (ТВ, 1975)».
  const nameYear = /^(.*\S)\s*\((?:([^,()]*?),\s*)?(\d{4})[^()]*\)\s*$/;

  // «18.05.2025, 13:10» on Moscow time.
  function moscowTime(text) {
    const m = text.match(/(\d{2})\.(\d{2})\.(\d{4}),?\s*(\d{2}):(\d{2})/);
    return m ? `${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:00+03:00` : "";
  }

  function score(item) {
    const shown = item.querySelector(".vote")?.textContent.trim() ?? "";
    if (/^\d+$/.test(shown)) return Number(shown);
    // The owner's own list fills the score in with a script.
    for (const s of item.querySelectorAll("script")) {
      const m = s.textContent.match(/rating:\s*'(\d+)'/);
      if (m) return Number(m[1]);
    }
    return 0;
  }

  // parseVotes reads one page of votes; total is how many the user has.
  function parseVotes(doc, origin) {
    const list = doc.querySelector(".profileFilmsList");
    if (!list) return null;
    const items = [];
    for (const item of list.querySelectorAll(":scope > .item")) {
      const link = item.querySelector(".nameRus a");
      const m = link?.getAttribute("href")?.match(/\/(film|series)\/(\d+)/);
      if (!m) continue;
      const text = link.textContent.replace(/\s+/g, " ").trim();
      const ny = text.match(nameYear);
      const note = ny?.[2]?.toLowerCase() ?? "";
      const original = item.querySelector(".nameEng")?.textContent.replace(/\s+/g, " ").trim() ?? "";
      const title = ny ? ny[1] : text;
      items.push({
        source: "kinopoisk",
        source_id: m[2],
        kinopoisk_id: m[2],
        kind: m[1] === "series" || note.includes("сериал") ? "series" : "movie",
        title,
        original_title: original && original !== title ? original : "",
        year: ny ? Number(ny[3]) : 0,
        rating: score(item),
        rated_at: moscowTime(item.querySelector(".date")?.textContent ?? ""),
        watched_at: "",
        url: `${origin}/${m[1]}/${m[2]}/`,
      });
    }
    // «1—50 из 812»
    const total = Number(doc.querySelector(".pagesFromTo")?.textContent.match(/(\d[\d\s]*)\s*$/)?.[1].replace(/\s/g, "") ?? 0);
    return { items, total };
  }

  const source = {
    id: "kinopoisk",
    userId,
    parseVotes,
    async collect(ctx) {
      const id = ctx.resume?.user ?? userId(location);
      if (!id) {
        throw ctx.blocked("login", "");
      }
      let page = ctx.resume?.page ?? 1;
      let pages = ctx.resume?.pages ?? 1;
      for (;;) {
        const doc = await ctx.fetchDocument(votesURL(location.origin, id, page));
        const got = parseVotes(doc, location.origin);
        if (!got) throw ctx.blocked(page === 1 ? "layout" : "captcha", "");
        if (got.total) pages = Math.ceil(got.total / perPage);
        ctx.add(got.items);
        ctx.progress({ done: page, total: pages, resume: { user: id, page: page + 1, pages } });
        if (page >= pages || got.items.length === 0) return;
        page++;
        await ctx.pause();
      }
    },
  };
  if (globalThis.RatingsToGo) globalThis.RatingsToGo.register(source);
  else globalThis.kinopoiskSource = source; // tests
})();
