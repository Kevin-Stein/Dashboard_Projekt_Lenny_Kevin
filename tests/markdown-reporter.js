const fs = require("fs");
const path = require("path");

const OUT_DIR = path.join(__dirname, "..", "testresults");

const DOCS = {
  "zeigt den Sprachwechsler neben dem Farbmodus": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass Farbmodus und Sprache in einer gemeinsamen Fußzeile stehen und beide Sprachen wählbar sind.",
    schritte: [
      "Dashboard auf Deutsch öffnen.",
      "In der Seitenleiste die Zeile mit Theme-Knopf und Sprachmenü suchen.",
    ],
    erwartet: "Theme-Knopf und Sprachmenü sind sichtbar. Das Menü enthält die Einträge Deutsch und English.",
  },
  "startet auf Deutsch und wechselt auf Englisch": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft die Mehrsprachigkeit der Oberfläche inklusive Speichern und Neuladen.",
    schritte: [
      "Dashboard auf Deutsch öffnen.",
      "Titel, Übersichtsüberschrift und Navigationspunkte prüfen.",
      "Im Sprachmenü English wählen und den Reload abwarten.",
    ],
    erwartet: "html lang wechselt von de auf en. Titel, Navigation, Slogan und Übersicht erscheinen auf Englisch. Das Sprachmenü bleibt auf en.",
  },
  "wechselt alle Seiten in der Navigation": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass jeder Navigationspunkt die richtige Seite einblendet.",
    schritte: [
      "Nacheinander Übersicht, Wetter, Wasserpegel, Feuerwehr und Organisation anklicken.",
    ],
    erwartet: "Die angeklickte Seite hat die Klasse active, ebenso der zugehörige Navigationspunkt.",
  },
  "wechselt Seiten mit Tastaturkürzeln 1 bis 5": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft die Standard-Tastaturkürzel der fünf Hauptseiten.",
    schritte: [
      "Taste 2 drücken, Suchfeld auf Wetter fokussieren und 3 drücken, dann 5.",
    ],
    erwartet: "2 öffnet Wetter. Im Suchfeld ändert 3 die Seite nicht. 5 öffnet Organisation.",
  },
  "lässt Tastaturkürzel unter Einstellungen ändern": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass Kürzel im Dialog Einstellungen neu belegt werden.",
    schritte: [
      "Einstellungen öffnen, Wetter-Kürzel anklicken und W drücken.",
      "Dialog mit Escape schließen, W und danach 2 drücken.",
    ],
    erwartet: "W öffnet Wetter. 2 bleibt auf Wetter, weil 2 nicht mehr belegt ist.",
  },
  "öffnet den Widget-Katalog auf Deutsch und Englisch": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft den Widget-Katalog und dessen Übersetzung.",
    schritte: [
      "Auf der Übersicht „+ Widget“ öffnen und Gruppentitel prüfen.",
      "Den Katalog schließen.",
      "Auf Englisch wechseln und den Katalog erneut öffnen.",
    ],
    erwartet: "Deutsch: „Widget hinzufügen“, „Kalender & Organisation“, „Aktuelles Wetter“, Plus statt Haken und Anzahl 1. Englisch: „Add widget“, „Calendar & organisation“, „Current weather“. Schließen blendet den Overlay aus.",
  },
  "öffnet Gegen Langeweile mit Spielkacheln": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft die Spielauswahl unter Gegen Langeweile.",
    schritte: [
      "Gegen Langeweile öffnen und die Kacheln Klondike, Tic Tac Toe und Dino Game prüfen.",
      "Klondike öffnen, zurück, Tic Tac Toe und Dino Game öffnen, Sprache auf Englisch stellen.",
    ],
    erwartet: "Auswahlkacheln sind sichtbar. Klondike lädt solitaire-online.com. Tic Tac Toe und Dino Game liegen als Jotform-Widgets. Englisch: Against boredom, ← Games.",
  },
  "bindet dasselbe Widget mehrfach zum Vergleich ein": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass Wetter und Pegel mehrfach mit eigener Suche liegen können.",
    schritte: [
      "Auf der Übersicht „Aktuelles Wetter“ ein zweites Mal hinzufügen und Lissabon suchen.",
      "„Pegelverlauf“ ein zweites Mal hinzufügen und Dresden suchen.",
    ],
    erwartet: "Die zweite Wetterkachel zeigt Lissabon, die Wetterseite bleibt Berlin. Die zweite Pegelkachel zeigt Dresden, die Pegel-Quelle nicht.",
  },
  "öffnet das Versions-Changelog als Popup": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft den Navigationspunkt Version unter der Dokumentation und das Changelog der Version 2.",
    schritte: [
      "Dashboard auf Deutsch öffnen.",
      "Prüfen, dass Version unter Dokumentation steht und nicht in der Seiten-Navigation.",
      "Version anklicken, Changelog lesen, mit Escape schließen.",
      "Auf Englisch wechseln, erneut öffnen und mit × schließen.",
    ],
    erwartet: "In der Seitenleiste steht dauerhaft „Version 2.0.0“. Der Dialog zeigt Version 2.0.0 und den Hinweis zu Änderungen nach dem 28. September 2026. Escape und Schließen blenden das Fenster aus. Englisch: after 28 September 2026.",
  },
  "zeigt die Standard-Widgets der Übersicht": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft die Standard-Auswahl auf der Übersicht.",
    schritte: [
      "Die Übersicht ohne gespeichertes Layout öffnen.",
      "Die Standard-Widgets zählen und ihre Titel prüfen.",
    ],
    erwartet: "Genau drei Widgets: Aktuelles Wetter, Brandeinsätze pro Tag und Pegel (Verlauf plus Berliner Liste).",
  },
  "hält Notizen und Radar kompakt": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass Notizen und Regenradar nicht die ganze Seitenbreite nutzen.",
    schritte: [
      "Notizen-Widget auf der Übersicht hinzufügen und die Breite messen.",
      "Wetter-Panel auf Übersicht und Wetterseite vergleichen.",
      "Wetterseite öffnen und die Radar-Breite messen.",
    ],
    erwartet: "Notizen sind schmaler als die halbe Übersicht. Das Wetter-Panel ist auf Übersicht und Wetterseite gleich breit. Der Pegelverlauf ist mindestens 500 Pixel breit, das Diagramm nicht gequetscht. Das Radar ist schmaler als 65 Prozent der Wetterseite.",
  },
  "legt Wetter-Kennzahlen im F-Muster aus": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass die Wetter-Kennzahlen in einer Zeile von links nach rechts stehen und das Wetter-Panel darunter links beginnt.",
    schritte: [
      "Wetterseite öffnen und die Positionen von Temperatur, Wind und aktuellem Wetter messen.",
    ],
    erwartet: "Temperatur steht links neben Wind auf gleicher Höhe. Das Wetter-Panel beginnt darunter links.",
  },
  "lässt den Widget-Platzhalter schmal": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass die Fläche „Widget hinzufügen“ nicht die Restbreite der Seite ausfüllt.",
    schritte: [
      "Auf der Übersicht die Breite des Platzhalters messen.",
      "Katastrophenschutz öffnen und den Platzhalter in der Widget-Zeile messen.",
    ],
    erwartet: "Der Platzhalter ist schmaler als 240 Pixel und nimmt auf Katastrophenschutz weniger als 35 Prozent der Seitenbreite ein.",
  },
  "zeigt dasselbe Pegel-Widget auf Übersicht und Wasserseite": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass Übersicht und Wasserpegel dasselbe kombinierte Pegel-Widget nutzen.",
    schritte: [
      "Auf der Übersicht Verlauf und Berliner Liste im Pegel-Widget prüfen.",
      "Wasserpegel öffnen und dieselbe Struktur prüfen.",
    ],
    erwartet: "Beide Seiten zeigen das Panel mit water-combo-grid und der Berliner Pegelliste.",
  },
  "wechselt den Farbmodus": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft den Wechsel vom hellen ins dunkle Farbschema.",
    schritte: [
      "Helles Systemschema erzwingen und neu laden.",
      "Den Theme-Knopf klicken.",
    ],
    erwartet: "data-theme wird dark. Der Knopf zeigt „Modus: Dunkel“.",
  },
  "öffnet das Menü auf dem Smartphone": {
    suite: "Dashboard",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft die mobile Navigation unter 390×844.",
    schritte: [
      "Viewport auf iPhone-Größe setzen.",
      "Das Hamburger-Menü öffnen.",
    ],
    erwartet: "Die Navigation ist zunächst verborgen. Nach dem Klick hat die Seitenleiste menu-open und die Navigation ist sichtbar.",
  },
  "zeigt die deutsche Doku und wechselt auf Englisch": {
    suite: "Dokumentation",
    file: "tests/dashboard.spec.js",
    zweck: "Prüft, dass die Dokumentation dieselbe Sprachwahl wie das Dashboard nutzt.",
    schritte: [
      "docs.html auf Deutsch öffnen und Navigation, Start, Mehrsprachigkeit und Tests prüfen.",
      "Auf English wechseln.",
    ],
    erwartet: "Deutsch: „Dokumentation“, „Erste Schritte“, „Tests“, „Zum Dashboard“. Englisch: „Documentation“, „Getting started“, „Internationalisation“, „Tests“, „Back to dashboard“. Theme-Knopf und Sprachmenü stehen nebeneinander.",
  },
  "leeres Absenden ändert Wetter, Radar und Pegel nicht": {
    suite: "Eingabefelder",
    file: "tests/inputs.spec.js",
    zweck: "Prüft, dass leere Suchfelder nichts auslösen.",
    schritte: [
      "Wetter: nur Leerzeichen absenden.",
      "Radar: leeres Formular absenden.",
      "Pegel: nur Leerzeichen absenden.",
    ],
    erwartet: "Der Wetterort bleibt unverändert, es erscheint keine Ladezeile. Radar und Pegel zeigen keinen Hinweis-Toast.",
  },
  "Wetter- und Radarsuche finden einen Ort und melden unbekannte Namen": {
    suite: "Eingabefelder",
    file: "tests/inputs.spec.js",
    zweck: "Prüft Treffer und Fehlermeldung der Ortssuche.",
    schritte: [
      "Wetter nach Hamburg suchen, danach nach xyzzy.",
      "Radar nach Hamburg und keinort suchen.",
      "Die Schnellwahl Potsdam klicken.",
    ],
    erwartet: "Hamburg erscheint als Ort in Wetter und Seitenleiste. Unbekannte Namen erzeugen eine klare Meldung. Potsdam landet im Radarfeld.",
  },
  "Warnungsfilter und Checkliste reagieren auf Eingaben": {
    suite: "Eingabefelder",
    file: "tests/inputs.spec.js",
    zweck: "Prüft Filter der amtlichen Warnungen und das Abhaken der To-do-Liste.",
    schritte: [
      "Warnungen nach Dresden filtern, danach nach xyzzy.",
      "Den ersten Checklistenpunkt abhaken.",
    ],
    erwartet: "Dresden zeigt genau eine Warnung. xyzzy zeigt die Leer-Meldung. Der erste Listenpunkt hat die Klasse done.",
  },
  "Pegel-Suche zeigt bekannten Pegel und weist unbekannte Namen zurück": {
    suite: "Eingabefelder",
    file: "tests/inputs.spec.js",
    zweck: "Prüft die Pegelsuche mit Treffer und unbekanntem Namen.",
    schritte: [
      "Dresden suchen.",
      "Atlantis suchen.",
    ],
    erwartet: "Bei Dresden leert sich das Feld und der Diagrammtitel enthält Dresden. Bei Atlantis erscheint der Toast „Kein Pegel mit diesem Namen gefunden“.",
  },
  "Aufgaben, Notizen, Kalender und Countdown nehmen Eingaben an": {
    suite: "Eingabefelder",
    file: "tests/inputs.spec.js",
    zweck: "Prüft die Eingaben der Organisations-Widgets.",
    schritte: [
      "Aufgabe: leeren Text verwerfen, „Batterien kaufen“ anlegen, abhaken, löschen.",
      "Notiz mit Umlauten schreiben und Speichern abwarten.",
      "Kalendertermin „Probealarm“ ganztags anlegen.",
      "Countdown „Übungsende“ auf 2099-12-31 starten.",
    ],
    erwartet: "Aufgabenliste, Notiz, Kalendereintrag und Countdown zeigen die eingegebenen Werte. Leere Aufgabe wird nicht angelegt.",
  },
  "Radar-Anbieter und Auto-Aktualisierung lassen sich umschalten": {
    suite: "Eingabefelder",
    file: "tests/inputs.spec.js",
    zweck: "Prüft Select und Toggle in der Seitenleiste bzw. auf der Wetterseite.",
    schritte: [
      "Niederschlagsquelle auf OpenWeather stellen.",
      "Auto-Aktualisierung ausschalten.",
    ],
    erwartet: "Das Select steht auf openweather, die Radar-Wiedergabe ist ausgeblendet. Das Auto-Aktualisierungs-Label enthält AUS.",
  },
  "hält schnelles Umschalten aller Seiten aus": {
    suite: "Belastung",
    file: "tests/stress.spec.js",
    zweck: "Belastet die Navigation durch acht vollständige Durchläufe aller fünf Seiten.",
    schritte: ["40 Seitenwechsel hintereinander auslösen."],
    erwartet: "Danach ist Wasserpegel aktiv. Sprachmenü und Seitentitel bleiben sichtbar. Die Oberfläche stürzt nicht ab.",
  },
  "hält schnelles Umschalten von Theme, Menü und Widget-Auswahl aus": {
    suite: "Belastung",
    file: "tests/stress.spec.js",
    zweck: "Belastet Theme, Widget-Katalog und Anordnen-Modus durch viele Klicks.",
    schritte: [
      "Theme 20-mal umschalten.",
      "Widget-Katalog 15-mal öffnen und schließen.",
      "Anordnen 12-mal umschalten.",
    ],
    erwartet: "Die betroffenen Knöpfe bleiben bedienbar, der Katalog öffnet und schließt zuverlässig.",
  },
  "leere Formulare und lange Texte bringen die Oberfläche nicht zum Absturz": {
    suite: "Belastung",
    file: "tests/stress.spec.js",
    zweck: "Prüft leere Absenden und einen 4000-Zeichen-Text mit HTML und Umlauten.",
    schritte: [
      "Wetter, Radar, Warnungen, Notizen und Pegel mehrfach leer absenden bzw. mit langem Text füllen.",
      "Denselben langen Text in die Felder schreiben.",
    ],
    erwartet: "Unbekannte Orte und Pegel werden gemeldet. Notizen speichern. Das Sprachmenü bleibt sichtbar.",
  },
  "hält viele Aufgaben und schnelles Hinzufügen/Entfernen von Widgets aus": {
    suite: "Belastung",
    file: "tests/stress.spec.js",
    zweck: "Prüft viele Listeneinträge und das Anlegen/Entfernen mehrerer Widgets.",
    schritte: [
      "40 Aufgaben anlegen, 10 wieder löschen.",
      "Notizen, Kalender, Countdown, Weltzeituhr und Radar hinzufügen und wieder entfernen.",
    ],
    erwartet: "Es bleiben 30 Aufgaben. Die Extra-Widgets sind weg, das Aufgaben-Widget bleibt.",
  },
  "hält wiederholtes Aktualisieren und Sprachwechsel aus": {
    suite: "Belastung",
    file: "tests/stress.spec.js",
    zweck: "Belastet Aktualisieren, Auto-Refresh und den Sprachwechsel inkl. Reload.",
    schritte: [
      "Aktualisieren und Auto-Aktualisierung je achtmal klicken.",
      "Vier Sprachwechsel Deutsch/Englisch auslösen.",
    ],
    erwartet: "Die Oberfläche bleibt Deutsch mit der Überschrift „Meine Übersicht“. Der Aktualisieren-Knopf bleibt sichtbar.",
  },
  "Notizen und Aufgaben speichern Payloads nur als Text": {
    suite: "Code-Injection",
    file: "tests/injection.spec.js",
    zweck: "Prüft XSS- und HTML-Payloads in Aufgaben und Notizen. Gespeicherter Text darf nicht als Code laufen.",
    schritte: [
      "Mehrere Payloads (script, img onerror, svg onload, textarea-Breakout, javascript:-URL, Template-Injection) nacheinander als Aufgabe anlegen.",
      "Dieselben Payloads in die Notizen schreiben, speichern und neu laden.",
    ],
    erwartet: "Kein alert/prompt. Kein eingefügtes img/svg/iframe. Werte stehen unverändert als Text in den Feldern bzw. in der Aufgabenliste.",
  },
  "Kalender und Countdown rendern Payloads nicht als HTML": {
    suite: "Code-Injection",
    file: "tests/injection.spec.js",
    zweck: "Prüft, dass Widget-Titel aus Nutzereingaben über textContent und nicht als HTML gerendert werden.",
    schritte: [
      "Kalendertermin mit img-onerror-Payload anlegen.",
      "Countdown mit script-Payload starten.",
    ],
    erwartet: "Die Texte erscheinen wörtlich. Es wird kein img oder script im Titel erzeugt, kein Dialog.",
  },
  "Suchfelder und Warnungsfilter führen Payloads nicht aus": {
    suite: "Code-Injection",
    file: "tests/injection.spec.js",
    zweck: "Prüft Injection in Wetter-, Radar- und Pegelsuche sowie im Warnungsfilter, inklusive Anzeige des Suchbegriffs in Meldungen.",
    schritte: [
      "Wetter nach einem img-onerror- und einem script-Payload suchen (Treffer über die Test-API).",
      "Denselben img-Payload in Radar, Warnungsfilter und Pegelsuche absenden.",
    ],
    erwartet: "Ort, Leer-Meldung und Toast zeigen den Payload als Text. Keine eingefügten img/script-Knoten, kein Dialog.",
  },
};

function slug(title) {
  return title
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function statusLabel(status) {
  if (status === "passed") return "bestanden";
  if (status === "failed") return "fehlgeschlagen";
  if (status === "skipped") return "übersprungen";
  if (status === "timedOut") return "Zeitüberschreitung";
  if (status === "interrupted") return "abgebrochen";
  return status;
}

function escapeMd(text) {
  return String(text || "").replace(/```/g, "'''");
}

class MarkdownReporter {
  constructor() {
    this.results = [];
    this.started = Date.now();
  }

  onTestEnd(test, result) {
    this.results.push({
      title: test.title,
      status: result.status,
      duration: result.duration,
      errors: (result.errors || []).map((err) => err.message || String(err)).filter(Boolean),
      retry: result.retry,
    });
  }

  onEnd(result) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const file of fs.readdirSync(OUT_DIR)) {
      if (file.endsWith(".md")) fs.unlinkSync(path.join(OUT_DIR, file));
    }

    const when = new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" });
    const duration = ((Date.now() - this.started) / 1000).toFixed(1);
    const passed = this.results.filter((r) => r.status === "passed").length;
    const failed = this.results.filter((r) => r.status === "failed" || r.status === "timedOut").length;
    const skipped = this.results.filter((r) => r.status === "skipped").length;

    const bySuite = new Map();
    const files = [];
    this.results.forEach((item) => {
      const doc = DOCS[item.title] || { suite: "Sonstiges", file: "–", zweck: "Keine Beschreibung hinterlegt.", schritte: [], erwartet: "–" };
      const name = `${slug(item.title)}.md`;
      files.push({ name, title: item.title, suite: doc.suite, status: item.status });
      if (!bySuite.has(doc.suite)) bySuite.set(doc.suite, []);
      bySuite.get(doc.suite).push({ ...item, doc, name });

      const steps = (doc.schritte || []).map((s) => `- ${s}`).join("\n") || "- –";
      const errors = item.errors.length
        ? item.errors.map((e) => `\`\`\`\n${escapeMd(e)}\n\`\`\``).join("\n\n")
        : "_Keine._";
      fs.writeFileSync(
        path.join(OUT_DIR, name),
        [
          `# ${item.title}`,
          "",
          `| | |`,
          `| --- | --- |`,
          `| Status | **${statusLabel(item.status)}** |`,
          `| Suite | ${doc.suite} |`,
          `| Testdatei | \`${doc.file}\` |`,
          `| Dauer | ${(item.duration / 1000).toFixed(2)} s |`,
          `| Lauf | ${when} |`,
          "",
          "## Zweck",
          "",
          doc.zweck,
          "",
          "## Ablauf",
          "",
          steps,
          "",
          "## Erwartetes Ergebnis",
          "",
          doc.erwartet,
          "",
          "## Fehler",
          "",
          errors,
          "",
        ].join("\n"),
      );
    });

    const unknown = this.results.filter((r) => !DOCS[r.title]).map((r) => `- ${r.title}`);
    const suiteBlocks = [...bySuite.entries()].map(([suite, items]) => {
      const rows = items
        .map((item) => `| [${item.title}](${item.name}) | ${statusLabel(item.status)} | ${(item.duration / 1000).toFixed(2)} s |`)
        .join("\n");
      return `## ${suite}\n\n| Test | Status | Dauer |\n| --- | --- | --- |\n${rows}`;
    });

    fs.writeFileSync(
      path.join(OUT_DIR, "README.md"),
      [
        "# Testergebnisse",
        "",
        `Letzter Lauf: **${when}** · ${this.results.length} Tests in ${duration} s · ${passed} bestanden, ${failed} fehlgeschlagen, ${skipped} übersprungen.`,
        "",
        "Die Dateien in diesem Ordner werden bei jedem `npm test` neu geschrieben: Übersicht plus eine Markdown-Datei je Test mit Zweck, Ablauf und Ergebnis.",
        "",
        ...suiteBlocks,
        "",
        unknown.length ? "## Ohne Beschreibung\n\n" + unknown.join("\n") + "\n" : "",
        "## Start",
        "",
        "```bash",
        "npm test",
        "```",
        "",
      ].join("\n"),
    );
  }
}

module.exports = MarkdownReporter;
