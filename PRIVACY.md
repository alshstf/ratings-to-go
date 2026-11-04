# Privacy policy — Ratings To Go / Оценки на вынос

_Last updated: 2026-11-04._ [По-русски — ниже.](#по-русски)

Ratings To Go is a browser extension that exports **your own** movie and TV ratings and watch history from
sites where you have an account (Kinopoisk for now) to a CSV file, and optionally to a server you run yourself.

## What it reads

- Only the pages that list your ratings on the site whose tab is open, and only after you press the export
  button in that tab. It reads them with the session you are already signed in with, at a slow pace (one
  page every few seconds), and stops if the site asks you to pass a check.
- For each title: its id and address on the site, its title, original title, year, kind (movie or series),
  your score, and when you rated or watched it.
- It does not read other tabs, your browsing history, passwords, cookies, payment data or anything outside
  those pages.

## Where it goes

- **Your computer.** What was exported is kept in the extension's local storage in this browser until the
  next export, so you can download it as a CSV file.
- **Your server, if you set one.** In the settings you may enter the address of your own server and a token
  made on it. The extension then sends the exported list there, over HTTPS (plain HTTP only to `localhost`),
  either when you press "Send" or automatically if you turn that on. The address and the token are stored in
  this browser only.
- **Nowhere else.** No analytics, no telemetry, no servers of the extension's author, no third parties. The
  author never receives your data.

## Your control

- Remove the server and the token with "Forget the server" in the settings.
- Removing the extension deletes everything it stored.
- The code is open: <https://github.com/alshstf/ratings-to-go>.

## Contact

Questions: open an issue at <https://github.com/alshstf/ratings-to-go/issues>.

---

## По-русски

Оценки на вынос — расширение браузера. Оно выгружает **ваши собственные** оценки фильмов и сериалов и
историю просмотров с сайтов, где у вас есть аккаунт (пока — Кинопоиск), в файл CSV и, по желанию, на сервер,
который вы держите сами.

**Что читает.** Только страницы со списком ваших оценок на сайте, открытом во вкладке, и только после того,
как вы нажали кнопку выгрузки в этой вкладке. Читает с той сессией, с которой вы уже вошли, неспешно (страница
в несколько секунд) и останавливается, если сайт просит пройти проверку. Для каждого тайтла: его id и адрес
на сайте, название, оригинальное название, год, тип (фильм или сериал), вашу оценку и когда вы её поставили
или посмотрели. Другие вкладки, история браузера, пароли, cookie, платёжные данные — не читаются.

**Куда уходит.** На ваш компьютер: выгрузка хранится в локальном хранилище расширения в этом браузере до
следующей выгрузки, чтобы её можно было скачать файлом CSV. На ваш сервер, если вы его указали: адрес и токен
хранятся только в этом браузере, данные уходят по HTTPS (HTTP — только на `localhost`) по кнопке «Отправить»
или автоматически, если вы это включили. Больше никуда: ни аналитики, ни телеметрии, ни серверов автора, ни
третьих лиц. Автор ваши данные не получает.

**Управление.** «Забыть сервер» в настройках удаляет адрес и токен. Удаление расширения удаляет всё, что оно
хранило. Код открыт: <https://github.com/alshstf/ratings-to-go>.
