// Dokumentation: Farbmodus wie im Dashboard, Menü auf dem Smartphone, aktiver Abschnitt im Inhaltsverzeichnis
const THEME_KEY = "dashboard-theme";
const themeBtn = document.getElementById("themeToggle");
const SUN_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="4.2"/><path d="M12 3v2.2M12 18.8V21M4.2 4.2l1.5 1.5M18.3 18.3l1.5 1.5M3 12h2.2M18.8 12H21M4.2 19.8l1.5-1.5M18.3 5.7l1.5-1.5" stroke-linecap="round"/></svg>';
const MOON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.5 14.8A8.5 8.5 0 1 1 9.2 3.5a6.8 6.8 0 0 0 11.3 11.3z"/></svg>';

function storedTheme() {
  try {
    return localStorage.getItem(THEME_KEY);
  } catch (err) {
    return null;
  }
}
function effectiveTheme() {
  const t = storedTheme();
  if (t === "light" || t === "dark") return t;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme() {
  const t = storedTheme();
  if (t === "light" || t === "dark") document.documentElement.setAttribute("data-theme", t);
  else document.documentElement.removeAttribute("data-theme");
  const dark = effectiveTheme() === "dark";
  themeBtn.innerHTML = dark ? `${MOON_SVG}<span>Modus: Dunkel</span>` : `${SUN_SVG}<span>Modus: Hell</span>`;
}
themeBtn.addEventListener("click", () => {
  try {
    localStorage.setItem(THEME_KEY, effectiveTheme() === "dark" ? "light" : "dark");
  } catch (err) {}
  applyTheme();
});
// Wechsel im Dashboard-Fenster sofort übernehmen
window.addEventListener("storage", (e) => {
  if (e.key === THEME_KEY) applyTheme();
});
applyTheme();

// Aus dem Dashboard als eigenes Fenster geöffnet: zurück zum vorhandenen Dashboard statt es hier neu zu laden
document.getElementById("backToDashboard").addEventListener("click", (e) => {
  if (window.opener && !window.opener.closed) {
    e.preventDefault();
    window.opener.focus();
    window.close();
  }
});

const sidebar = document.querySelector(".sidebar");
const menuBtn = document.getElementById("menuToggle");
function setMenuOpen(open) {
  sidebar.classList.toggle("menu-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Menü schließen" : "Menü öffnen");
}
menuBtn.addEventListener("click", () => setMenuOpen(!sidebar.classList.contains("menu-open")));

// Screenshots per Klick vergrößern
const lightbox = document.getElementById("docsLightbox");
const lightboxImg = lightbox.querySelector("img");
const lightboxText = lightbox.querySelector("p");
function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.removeAttribute("src");
}
document.querySelectorAll(".docs-shot img").forEach((img) => {
  img.addEventListener("click", () => {
    lightboxImg.src = img.src;
    lightboxImg.alt = img.alt;
    lightboxText.textContent = img.closest("figure")?.querySelector("figcaption")?.textContent || "";
    lightbox.hidden = false;
  });
});
lightbox.addEventListener("click", closeLightbox);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});

const navLinks = [...document.querySelectorAll("#docsNav .nav-item")];
const sections = navLinks.map((a) => document.querySelector(a.getAttribute("href"))).filter(Boolean);
const docsMain = document.getElementById("docsMain");
function markActive(id) {
  navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === "#" + id));
}

// Nach einem Klick bleibt der Eintrag markiert, bis das sanfte Scrollen fertig ist
let clickLock = 0;
navLinks.forEach((a) =>
  a.addEventListener("click", () => {
    setMenuOpen(false);
    markActive(a.getAttribute("href").slice(1));
    clearTimeout(clickLock);
    clickLock = setTimeout(() => (clickLock = 0), 1500);
  }),
);

function atBottom() {
  // Desktop scrollt im Inhaltsbereich, mobil die ganze Seite
  const inner = docsMain.scrollHeight > docsMain.clientHeight + 1;
  return inner
    ? docsMain.scrollTop + docsMain.clientHeight >= docsMain.scrollHeight - 4
    : window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
}
// Aktiv ist der letzte Abschnitt, dessen Anfang das obere Drittel erreicht hat
let scrollFrame = 0;
function updateActive() {
  scrollFrame = 0;
  if (clickLock) return;
  let current = sections[0];
  if (atBottom()) current = sections[sections.length - 1];
  else {
    const limit = window.innerHeight / 3;
    sections.forEach((s) => {
      if (s.getBoundingClientRect().top <= limit) current = s;
    });
  }
  if (current) markActive(current.id);
}
function onScroll() {
  if (!scrollFrame) scrollFrame = requestAnimationFrame(updateActive);
}
function onScrollEnd() {
  if (!clickLock) return;
  clearTimeout(clickLock);
  clickLock = 0;
}
[docsMain, window].forEach((el) => {
  el.addEventListener("scroll", onScroll, { passive: true });
  el.addEventListener("scrollend", onScrollEnd);
});
if (location.hash) markActive(location.hash.slice(1));
else updateActive();
