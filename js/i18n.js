// ---- Mehrsprachigkeit ----
// Sprachdateien (js/lang/<code>.js) registrieren sich per I18N.register(), die Dokumentation per I18N.registerDocs().
(function () {
  const STORAGE_KEY = "dashboard-lang";
  const FALLBACK = "de";
  const languages = {};
  const missing = new Set();
  let current = null;

  function register(code, { name, locale, strings }) {
    languages[code] = { ...languages[code], code, name, locale, strings: strings || {} };
  }

  function registerDocs(code, html) {
    languages[code] = { ...languages[code], code, docs: html };
  }

  function storedLang() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return null;
    }
  }

  function detect() {
    const stored = storedLang();
    if (stored && languages[stored]?.strings) return stored;
    for (const tag of navigator.languages || [navigator.language || ""]) {
      const base = String(tag).toLowerCase().split("-")[0];
      if (languages[base]?.strings) return base;
    }
    return FALLBACK;
  }

  function lang() {
    if (!current) current = detect();
    return current;
  }

  function t(key, params) {
    let text = languages[lang()]?.strings[key];
    if (text == null) text = languages[FALLBACK]?.strings[key];
    if (text == null) {
      if (!missing.has(key)) {
        missing.add(key);
        console.warn(`[i18n] Fehlender Text: ${key}`);
      }
      return key;
    }
    if (!params) return text;
    return text.replace(/\{(\w+)\}/g, (match, name) => (params[name] != null ? String(params[name]) : match));
  }

  function has(key) {
    return languages[lang()]?.strings[key] != null || languages[FALLBACK]?.strings[key] != null;
  }

  function locale() {
    return languages[lang()]?.locale || languages[FALLBACK]?.locale || "de-DE";
  }

  // data-i18n="key" (Text), data-i18n-html="key" (eigene, vertrauenswürdige Auszeichnung),
  // data-i18n-attr="placeholder=key;aria-label=key2"
  function apply(root = document) {
    if (root === document) document.documentElement.lang = lang();
    root.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    root.querySelectorAll("[data-i18n-html]").forEach((el) => {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    root.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      el.dataset.i18nAttr.split(";").forEach((pair) => {
        const [attr, key] = pair.split("=").map((s) => s && s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  function setLanguage(code) {
    if (!languages[code]?.strings || code === lang()) return;
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch (err) {
      console.warn("[i18n] Sprache konnte nicht gespeichert werden:", err);
    }
    location.reload();
  }

  function mountSwitcher(select) {
    if (!select) return;
    const codes = Object.keys(languages).filter((code) => languages[code].strings);
    select.replaceChildren(
      ...codes.map((code) => {
        const option = document.createElement("option");
        option.value = code;
        option.textContent = languages[code].name || code;
        return option;
      }),
    );
    select.value = lang();
    select.hidden = codes.length < 2;
    select.addEventListener("change", () => setLanguage(select.value));
  }

  // Sprachwechsel in einem anderen Fenster (Dashboard/Dokumentation) übernehmen
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY && e.newValue && e.newValue !== lang() && languages[e.newValue]?.strings) {
      location.reload();
    }
  });

  window.I18N = {
    register,
    registerDocs,
    t,
    has,
    lang,
    locale,
    apply,
    setLanguage,
    mountSwitcher,
    docs: (code = lang()) => languages[code]?.docs || null,
    languages: () => Object.values(languages).filter((l) => l.strings),
  };
  window.t = t;
})();
