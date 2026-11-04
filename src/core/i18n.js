// t is a message of _locales; localize fills [data-i18n] elements.
export const t = (key, ...subs) => chrome.i18n.getMessage(key, subs.map(String)) || key;

export function localize(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  document.documentElement.lang = chrome.i18n.getUILanguage();
}
