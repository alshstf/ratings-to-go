# Ratings To Go / Оценки на вынос

A browser extension that exports **your own** movie and TV ratings and watch history from the sites you use
to a CSV file — or straight to your own server (for example [Argoose](#argoose)).

Sources so far: **Kinopoisk** — your votes with their dates, then what you marked as watched without a score
(«Оценки и просмотры»; the site shows no date for those). Built to take more — IMDb, Netflix, streaming services — each one a
small file in `src/sources/`.

## How it works

1. Open the site in a tab and sign in (for Kinopoisk: open your profile, `kinopoisk.ru/user/<id>/`).
2. Press the extension's button and "Export my ratings".
3. The extension reads your rating pages in that tab, slowly, with your session. If the site asks you to
   pass a check ("I'm not a robot"), it stops: pass it in the tab and press "Continue". It never tries to pass
   the check itself.
4. Download the CSV, or have it sent to your server.

Permissions: `activeTab` and `scripting` (to read the open tab when you press the button), `storage` (to keep
the export and the settings). No host permissions, no access to other tabs.

## Format

One item per title, the same in the CSV columns and in the JSON sent to a server:

| field | |
|---|---|
| `source` | the site: `kinopoisk`, `netflix`, … (small letters, digits, `-`, `_`) |
| `source_id` | the title's id on that site |
| `kinopoisk_id`, `imdb_id`, `tmdb_id` | ids in other catalogs, when the site shows them |
| `kind` | `movie`, `series` or empty |
| `title`, `original_title`, `year` | as the site shows them |
| `rating` | your score out of 10; empty when only watched |
| `rated_at`, `watched_at` | ISO 8601 with the offset |
| `url` | the title's page on the site |

The CSV is UTF-8 with a BOM, comma-separated, with a header row.

## Your server

In the settings: the server's address and a token. The extension sends

```
POST <address>/api/ratings/import
Authorization: Bearer <token>
Content-Type: application/json

{"items": [ … ]}
```

and checks the address and token with `GET <address>/api/access/whoami` (answers `{"name": "<token name>"}`).
The server answers CORS for the extension's origin; the token goes in the header, never in a cookie.

### Argoose

[Argoose](https://github.com/alshstf/argoose) (a self-hosted movie and series watcher) takes these items as
its taste signals for recommendations: page «Оценки» → card «Расширение браузера» makes the token.

## Adding a source

1. `src/sources/<id>.js`: a classic script that calls `RatingsToGo.register({ id, collect })`. `collect(ctx)`
   reads the site's pages with `ctx.fetchDocument(url)` (your session; a check page throws), hands items to
   `ctx.add(items)`, reports `ctx.progress({ done, total, resume })`, waits `ctx.pause()` between pages and
   throws `ctx.blocked("login" | "captcha" | "layout")` when it cannot go on. `resume` is what it gets back as
   `ctx.resume` after the user passed a check.
2. An entry in `src/core/sources.js` (hosts, the file) and its name and hint in `_locales/*/messages.json`.
3. A test on a saved page in `test/`.

Keep to the one purpose: the user's own ratings and history, read only when they press the button.

## Development

```sh
npm install
npm test
npm run package   # dist/ratings-to-go-<version>.zip for the Chrome Web Store
```

Load it unpacked: `chrome://extensions` → Developer mode → Load unpacked → this folder.

## License

MIT. Kinopoisk, IMDb, Netflix are trademarks of their owners; this extension is not affiliated with or endorsed
by them.
