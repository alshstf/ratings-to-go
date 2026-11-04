// An item is one title the user rated or watched on a site — the same shape
// for every source, and the same names as the columns of the CSV and the
// JSON the extension sends to a server:
//
//   source         "kinopoisk", "netflix", … (small letters, digits, - and _)
//   source_id      the title's id on that site
//   kinopoisk_id, imdb_id, tmdb_id   ids in other catalogs, when the site shows them
//   kind           "movie" | "series" | ""
//   title, original_title, year
//   rating         the user's score out of 10 (0 or empty: only watched)
//   rated_at, watched_at   ISO 8601 with the offset
//   url            the title's page on the site
export const columns = [
  "source",
  "source_id",
  "kinopoisk_id",
  "imdb_id",
  "tmdb_id",
  "kind",
  "title",
  "original_title",
  "year",
  "rating",
  "rated_at",
  "watched_at",
  "url",
];

// key is what makes two items the same title of the same site.
export const key = (item) => `${item.source}:${item.source_id || `${item.title}|${item.year ?? ""}`}`;

// merge adds items, the later of two equal ones winning (a page read again
// after a captcha).
export function merge(into, items) {
  const at = new Map(into.map((it, i) => [key(it), i]));
  for (const it of items) {
    const i = at.get(key(it));
    if (i === undefined) {
      at.set(key(it), into.length);
      into.push(it);
    } else {
      into[i] = it;
    }
  }
  return into;
}

// toCSV is the items as CSV: UTF-8 with a BOM (Excel then shows Cyrillic),
// commas, every text field quoted.
export function toCSV(items) {
  const cell = (v) => {
    if (v === undefined || v === null || v === "" || v === 0) return "";
    if (typeof v === "number") return String(v);
    return `"${String(v).replaceAll('"', '""')}"`;
  };
  const lines = [columns.join(",")];
  for (const it of items) lines.push(columns.map((c) => cell(it[c])).join(","));
  return "﻿" + lines.join("\r\n") + "\r\n";
}
