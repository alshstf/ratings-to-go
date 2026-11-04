# Chrome Web Store: what goes in the dashboard

## Store listing

- **Name:** from the manifest (`Ratings To Go` / `Оценки на вынос`).
- **Category:** Tools (Инструменты). **Language:** Russian, English.
- **Short description:** from the manifest.
- **Detailed description (ru):**

  Оценки на вынос выгружает ваши собственные оценки фильмов и сериалов с сайтов, где вы ими пользуетесь, —
  пока с Кинопоиска — в файл CSV. По желанию отправляет их на ваш собственный сервер (например, Argoose),
  чтобы ваш багаж оценок был у вас, а не только на сайте.

  Как пользоваться: откройте свой профиль на сайте (войдите в аккаунт), нажмите на кнопку расширения и
  «Выгрузить мои оценки». Расширение неспешно прочитает страницы ваших оценок и просмотренного в этой вкладке. Если сайт
  попросит проверку «я не робот», расширение остановится: пройдите её во вкладке и нажмите «Продолжить».

  Что получаете: CSV с названием, оригинальным названием, годом, типом, вашей оценкой (или отметкой «просмотрено»), датой, ссылкой и id
  фильма на сайте.

  Конфиденциальность: ничего не уходит автору или третьим лицам. Данные хранятся в вашем браузере и
  отправляются только на сервер, который вы сами укажете в настройках. Код открыт.

  Расширение не связано с Кинопоиском и не одобрено им.

- **Detailed description (en):** the same in English (see README).
- **Icon:** `icons/icon128.png`. **Screenshots:** 1280×800, the popup during and after an export and the
  settings — to be taken on a live export. **Small promo tile:** 440×280 (optional).

## Privacy practices

- **Single purpose:** Export the user's own movie and TV ratings and watch history from sites they use to a
  CSV file or to a server the user runs.
- **activeTab:** to read the rating pages of the site open in the current tab, only when the user presses the
  export button there.
- **scripting:** to run the reader in that tab after the user presses the button (with activeTab, no host
  permissions).
- **storage:** to keep the last export until it is downloaded or sent, and the user's server address and
  token.
- **Remote code:** No.
- **Data usage:** collects "Personally identifiable information"? No. "Web history"? No. "User activity"?
  No. "Website content": yes — the user's own ratings shown on the site. Not sold, not used for anything but
  the single purpose, not used for creditworthiness, not transferred except to the server the user sets.
- **Privacy policy URL:** https://github.com/alshstf/ratings-to-go/blob/main/PRIVACY.md

## Account

The developer account (one-time registration fee) is the owner's: register at
https://chrome.google.com/webstore/devconsole, then upload `dist/ratings-to-go-<version>.zip`.
