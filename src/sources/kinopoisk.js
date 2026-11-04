// Kinopoisk, in two passes over the user's own profile (the id comes from
// the address of the tab):
//
// 1. Votes, newest first, /user/<id>/votes/list/ord/date/page/<n>/ — 50 a
//    page, each with the film's link (its Kinopoisk id), the Russian and
//    original titles, the year, the score and when it was given.
// 2. «Оценки и просмотры», /user/<id>/movies/voted-watched/?page=<n> — 20 a
//    page, rated and watched together, with no dates. Only what is watched
//    and not rated is taken from it: the votes already came with their dates.
//    The page carries its data as JSON (window.Ya.__ssr_initial_data, an
//    Apollo cache), which is steadier than its generated class names.
(() => {
  const perPage = 50;
  const watchedPerPage = 20;

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

  const watchedURL = (origin, id, page) => `${origin}/user/${id}/movies/voted-watched/?page=${page}`;

  // ssrState is the Apollo cache the page was rendered from, or null.
  function ssrState(doc) {
    const marker = "__ssr_initial_data";
    for (const s of doc.querySelectorAll("script")) {
      const t = s.textContent;
      const at = t.indexOf(marker);
      if (at < 0) continue;
      const json = t.slice(at + marker.length).replace(/^\s*=\s*/, "").replace(/;\s*$/, "");
      try {
        return JSON.parse(json).apolloState ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }

  // reactionsList finds the page of the user's reactions in the cache.
  function reactionsList(state) {
    const seen = new Set();
    const walk = (x) => {
      if (!x || typeof x !== "object" || seen.has(x)) return null;
      seen.add(x);
      if (x.__typename === "PagingList_UserMovieReactions" && Array.isArray(x.items)) return x;
      for (const v of Object.values(x)) {
        const got = walk(v);
        if (got) return got;
      }
      return null;
    };
    return walk(state);
  }

  // parseWatched reads one page of «Оценки и просмотры»: the titles watched
  // and not rated; total is how many the page lists, rated ones too.
  function parseWatched(doc, origin) {
    const state = ssrState(doc);
    const list = state && reactionsList(state);
    if (!list) return null;
    const items = [];
    for (const it of list.items) {
      const movie = state[it.movie?.__ref];
      if (!movie?.id) continue;
      const reactions = Object.entries(it).find(([k]) => k.startsWith("reactions"))?.[1] ?? [];
      const voted = reactions.some((r) => r.__typename === "Vote" && r.value > 0);
      const watched = reactions.some((r) => r.__typename === "Watched" && r.watched);
      if (voted || !watched) continue;
      const film = movie.__typename === "Film";
      const title = movie.title?.russian || movie.title?.original || "";
      const original = movie.title?.original || "";
      const id = String(movie.id);
      const path = film ? "film" : "series";
      items.push({
        source: "kinopoisk",
        source_id: id,
        kinopoisk_id: id,
        kind: film ? "movie" : "series",
        title,
        original_title: original && original !== title ? original : "",
        year: movie.productionYear ?? movie.releaseYears?.[0]?.start ?? 0,
        rating: 0,
        rated_at: "",
        watched_at: "",
        url: `${origin}/${path}/${id}/`,
      });
    }
    return { items, total: list.total ?? 0, count: list.items.length };
  }

  const source = {
    id: "kinopoisk",
    userId,
    parseVotes,
    parseWatched,
    async collect(ctx) {
      const id = ctx.resume?.user ?? userId(location);
      if (!id) {
        throw ctx.blocked("login", "");
      }
      // Progress counts pages of both passes; the second one's size is known
      // once its first page is read.
      let phase = ctx.resume?.phase ?? "votes";
      let page = ctx.resume?.page ?? 1;
      let pages = ctx.resume?.pages ?? 1;
      let watchedPages = ctx.resume?.watchedPages ?? 1;
      const progress = () => {
        const done = phase === "votes" ? page : pages + page;
        const next = { user: id, phase, page: page + 1, pages, watchedPages };
        ctx.progress({ done, total: pages + watchedPages, resume: next });
      };
      while (phase === "votes") {
        const doc = await ctx.fetchDocument(votesURL(location.origin, id, page));
        const got = parseVotes(doc, location.origin);
        if (!got) throw ctx.blocked(page === 1 ? "layout" : "captcha", "");
        if (got.total) pages = Math.ceil(got.total / perPage);
        ctx.add(got.items);
        if (page >= pages || got.items.length === 0) {
          pages = page;
          progress();
          phase = "watched";
          page = 1;
        } else {
          progress();
          page++;
        }
        await ctx.pause();
      }
      for (;;) {
        const doc = await ctx.fetchDocument(watchedURL(location.origin, id, page));
        const got = parseWatched(doc, location.origin);
        if (!got) throw ctx.blocked(page === 1 ? "layout" : "captcha", "");
        if (got.total) watchedPages = Math.ceil(got.total / watchedPerPage);
        ctx.add(got.items);
        progress();
        if (page >= watchedPages || got.count === 0) return;
        page++;
        await ctx.pause();
      }
    },
  };
  if (globalThis.RatingsToGo) globalThis.RatingsToGo.register(source);
  else globalThis.kinopoiskSource = source; // tests
})();
