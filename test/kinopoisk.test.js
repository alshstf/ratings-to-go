import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseHTML } from "linkedom";

// The source file is a classic script for the page; run it in a context of
// its own and take what it leaves.
function loadSource(globals = {}) {
  const ctx = vm.createContext({ ...globals });
  vm.runInContext(readFileSync(new URL("../src/sources/kinopoisk.js", import.meta.url), "utf8"), ctx);
  return ctx.kinopoiskSource;
}

test("votes page", () => {
  const kp = loadSource();
  const { document } = parseHTML(readFileSync(new URL("./fixtures/kinopoisk-votes.html", import.meta.url), "utf8"));
  const got = kp.parseVotes(document, "https://www.kinopoisk.ru");
  assert.equal(got.total, 812);
  assert.equal(got.items.length, 3);
  assert.deepEqual({ ...got.items[0] }, {
    source: "kinopoisk",
    source_id: "4664634",
    kinopoisk_id: "4664634",
    kind: "movie",
    title: "Конклав",
    original_title: "Conclave",
    year: 2024,
    rating: 9,
    rated_at: "2025-05-18T13:10:00+03:00",
    watched_at: "",
    url: "https://www.kinopoisk.ru/film/4664634/",
  });
  const [, series, brat] = got.items;
  assert.equal(series.kind, "series");
  assert.equal(series.title, "Очень странные дела");
  assert.equal(series.year, 2016);
  assert.equal(series.rating, 8, "the owner's own list: the score from the script");
  assert.equal(brat.original_title, "", "no original title");
  assert.equal(brat.rating, 10);
});

test("not a votes page", () => {
  const kp = loadSource();
  const { document } = parseHTML("<html><body><p>Ой!</p></body></html>");
  assert.equal(kp.parseVotes(document, "https://www.kinopoisk.ru"), null);
});

test("profile id from the address", () => {
  const kp = loadSource();
  assert.equal(kp.userId({ pathname: "/user/123456/votes/" }), "123456");
  assert.equal(kp.userId({ pathname: "/user/123456" }), "123456");
  assert.equal(kp.userId({ pathname: "/film/4664634/" }), "");
});

test("watched page: only what is watched and not rated", () => {
  const kp = loadSource();
  const { document } = parseHTML(readFileSync(new URL("./fixtures/kinopoisk-watched.html", import.meta.url), "utf8"));
  const got = kp.parseWatched(document, "https://www.kinopoisk.ru");
  assert.equal(got.total, 157);
  assert.equal(got.count, 6, "every item of the page counts for paging");
  assert.deepEqual(JSON.parse(JSON.stringify(got.items)), [
    {
      source: "kinopoisk", source_id: "5000001", kinopoisk_id: "5000001", kind: "movie", title: "Ёлки на районе",
      original_title: "", year: 2023, rating: 0, rated_at: "", watched_at: "", url: "https://www.kinopoisk.ru/film/5000001/",
    },
    {
      source: "kinopoisk", source_id: "5000002", kinopoisk_id: "5000002", kind: "series", title: "Тихий берег",
      original_title: "Still Shore", year: 2023, rating: 0, rated_at: "", watched_at: "", url: "https://www.kinopoisk.ru/series/5000002/",
    },
    {
      source: "kinopoisk", source_id: "5000003", kinopoisk_id: "5000003", kind: "series", title: "Пять зим",
      original_title: "Five Winters", year: 2019, rating: 0, rated_at: "", watched_at: "", url: "https://www.kinopoisk.ru/series/5000003/",
    },
  ]);
});

test("watched page without the data: not this layout", () => {
  const kp = loadSource();
  const { document } = parseHTML("<html><body><script>window.Ya={}</script></body></html>");
  assert.equal(kp.parseWatched(document, "https://www.kinopoisk.ru"), null);
});

test("collect: votes, then watched, resumable", async () => {
  const kp = loadSource({ location: { pathname: "/user/1000001/", origin: "https://www.kinopoisk.ru" } });
  const votes = parseHTML(readFileSync(new URL("./fixtures/kinopoisk-votes.html", import.meta.url), "utf8")).document;
  const watched = parseHTML(readFileSync(new URL("./fixtures/kinopoisk-watched.html", import.meta.url), "utf8")).document;
  const run = async (resume, failAt) => {
    const urls = [];
    const added = [];
    const progress = [];
    const ctx = {
      resume,
      add: (items) => added.push(...items),
      progress: (p) => progress.push(p),
      pause: async () => {},
      blocked: (reason) => Object.assign(new Error(reason), { reason }),
      fetchDocument: async (url) => {
        urls.push(url.replace("https://www.kinopoisk.ru", ""));
        if (urls.length === failAt) throw Object.assign(new Error("captcha"), { reason: "captcha" });
        return url.includes("/votes/") ? votes : watched;
      },
    };
    let err = null;
    try {
      await kp.collect(ctx);
    } catch (e) {
      err = e;
    }
    return { urls, added, progress, err };
  };
  // The votes fixture says 812 (17 pages), the watched one 157 (8 pages).
  const full = await run(null);
  assert.equal(full.err, null);
  assert.equal(full.urls.length, 17 + 8);
  assert.equal(full.urls[17], "/user/1000001/movies/voted-watched/?page=1");
  assert.equal(full.urls.at(-1), "/user/1000001/movies/voted-watched/?page=8");
  assert.deepEqual(full.progress.at(-1).done, 25);
  assert.deepEqual(full.progress.at(-1).total, 25);

  // Stopped on the third watched page: it starts there again.
  const stopped = await run(null, 17 + 3);
  assert.equal(stopped.err.reason, "captcha");
  const resume = stopped.progress.at(-1).resume;
  assert.deepEqual({ phase: resume.phase, page: resume.page }, { phase: "watched", page: 3 });
  const again = await run(resume);
  assert.equal(again.urls[0], "/user/1000001/movies/voted-watched/?page=3");
  assert.equal(again.urls.length, 6);
});
