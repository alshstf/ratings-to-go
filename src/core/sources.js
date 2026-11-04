// The sites the extension exports from. Each entry is what the popup needs
// to know about a source; its collector is src/sources/<id>.js, injected
// into the site's tab only when the user starts an export there.
//
// Adding a source: a file in src/sources/ that calls RatingsToGo.register
// with the same id, and an entry here.
export const sources = [
  {
    id: "kinopoisk",
    nameKey: "sourceKinopoisk",
    hintKey: "hintKinopoisk",
    hosts: ["www.kinopoisk.ru", "kinopoisk.ru"],
    script: "src/sources/kinopoisk.js",
  },
];

export function sourceFor(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  return sources.find((s) => s.hosts.includes(host)) ?? null;
}

export const sourceById = (id) => sources.find((s) => s.id === id) ?? null;
