import { test } from "node:test";
import assert from "node:assert/strict";
import { columns, compact, merge, toCSV } from "../src/core/items.js";
import { checkServer } from "../src/core/server.js";
import { sourceFor } from "../src/core/sources.js";

test("CSV", () => {
  const csv = toCSV([
    { source: "kinopoisk", source_id: "1", title: 'Он сказал "да", а', year: 2020, rating: 8, rated_at: "2025-01-01T10:00:00+03:00" },
    { source: "netflix", source_id: "2", title: "X", rating: 0, watched_at: "2024-01-02T00:00:00Z" },
  ]);
  assert.ok(csv.startsWith("﻿" + columns.join(",") + "\r\n"));
  const lines = csv.slice(1).trim().split("\r\n");
  assert.equal(lines[1], '"kinopoisk","1",,,,,"Он сказал ""да"", а",,2020,8,"2025-01-01T10:00:00+03:00",,');
  assert.equal(lines[2], '"netflix","2",,,,,"X",,,,,"2024-01-02T00:00:00Z",');
});

test("merge: a page read again replaces, not doubles", () => {
  const all = merge([], [{ source: "kinopoisk", source_id: "1", rating: 7 }]);
  merge(all, [{ source: "kinopoisk", source_id: "1", rating: 9 }, { source: "kinopoisk", source_id: "2" }]);
  assert.equal(all.length, 2);
  assert.equal(all[0].rating, 9);
});

test("server address", () => {
  assert.equal(checkServer("https://argoose.example.com"), "");
  assert.equal(checkServer("http://localhost:8080"), "");
  assert.equal(checkServer("http://192.168.0.21"), "errServerHttps");
  assert.equal(checkServer("argoose"), "errServerAddress");
});

test("sources by address", () => {
  assert.equal(sourceFor("https://www.kinopoisk.ru/user/1/votes/")?.id, "kinopoisk");
  assert.equal(sourceFor("https://example.com/"), null);
  assert.equal(sourceFor("chrome://extensions"), null);
});

test("compact leaves out empty fields, keeps the rest", () => {
  const it = { source: "kinopoisk", source_id: "1", title: "Дурак", original_title: "", year: 2014, rating: 9, watched_at: "", imdb_id: null };
  assert.deepEqual(compact(it), { source: "kinopoisk", source_id: "1", title: "Дурак", year: 2014, rating: 9 });
});

test("send posts compact items with the token", async () => {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    return new Response(JSON.stringify({ rows: 1 }), { status: 200 });
  };
  const { send } = await import("../src/core/server.js");
  await send({ server: "https://argoose.example/", token: "argoose_x" }, [{ source: "kinopoisk", title: "Дурак", watched_at: "" }]);
  assert.equal(calls[0].url, "https://argoose.example/api/ratings/import");
  assert.equal(calls[0].init.headers.Authorization, "Bearer argoose_x");
  assert.deepEqual(JSON.parse(calls[0].init.body), { items: [{ source: "kinopoisk", title: "Дурак" }] });
});
