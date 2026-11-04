import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { parseHTML } from "linkedom";

// The source file is a classic script for the page; run it in a context of
// its own and take what it leaves.
function loadSource() {
  const ctx = vm.createContext({});
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
