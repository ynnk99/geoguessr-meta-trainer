# Meta Atlas — GeoGuessr Meta Trainer

Eine kleine statische Web-App, um GeoGuessr-Metas zu üben: Sie zeigt dir eine
zufällige Meta (Bild oder Text) aus deiner Sammlung und du musst das Land
erraten. Falsch beantwortete Metas kommen häufiger dran, gemeisterte seltener
— dein Fortschritt bleibt lokal in deinem Browser gespeichert.

Kein Build-Schritt, kein Backend. Nur `index.html` + `data.csv`.

## Schnellstart

1. Repo klonen bzw. Ordner herunterladen.
2. `index.html` **nicht** einfach per Doppelklick öffnen — manche Browser
   blockieren dann das Nachladen der CSV (`fetch` unter `file://`).
   Stattdessen einen simplen lokalen Server starten, z. B.:
   ```bash
   npx serve .
   # oder
   python3 -m http.server 8080
   ```
   und dann `http://localhost:8080` (bzw. den angezeigten Port) öffnen.
3. Alternativ: die Seite trotzdem direkt öffnen und unter **Einstellungen →
   Datenquelle** deine CSV-Datei manuell hochladen (funktioniert auch ohne
   Server, weil das per `FileReader` statt `fetch` läuft).

## Eigene Daten aus dem Google Sheet exportieren

Wichtig: Bilder, die du **direkt ins Sheet eingefügt** hast (Bild einfügen →
in Zelle), gehen beim CSV-Export verloren — CSV kann nur Text speichern.
Damit deine Bollards/Chevrons/Zebrastreifen im Trainer erscheinen, müssen die
Zellen eine **Bild-URL als Text** enthalten, nicht das Bild selbst.

Zwei Wege dahin:

**A — Bilder extern hosten und URL eintragen**
Lade die Bilder z. B. bei [imgur.com](https://imgur.com) hoch (oder in einen
`assets/`-Ordner in diesem Repo, siehe unten) und trage den Direktlink
(`https://…/bild.jpg`) als Zelleninhalt ein statt des eingefügten Bildes.

**B — GitHub als Bild-Host nutzen**
Lade deine Bilder in einen Ordner `data/images/` in diesem Repo hoch und
verlinke sie im Sheet als
`https://raw.githubusercontent.com/<user>/<repo>/main/data/images/<datei>.jpg`.

Sobald alle Bild-Zellen echte URLs (Text, beginnend mit `http`) enthalten:

1. Google Sheet → **Datei → Herunterladen → Kommaseparierte Werte (.csv)**
2. Die Datei nach `data/data.csv` legen (überschreibt die Beispieldaten) —
   oder direkt im laufenden Trainer unter **Einstellungen → Datenquelle**
   hochladen, um sie ohne Commit zu testen.

Die erste Zeile der CSV muss die Spaltenüberschriften enthalten. Die Spalte
**„Land“** ist Pflicht und wird als Antwort verwendet — alle anderen Spalten
(Bollard, Road Lines, Chevrons, Plates, Sprache, …) werden automatisch als
mögliche Fragen erkannt. Unter **Einstellungen** kannst du einzelne Spalten
für den Trainer an- oder abschalten (z. B. „Kontinent“ oder „sonstiges“, wenn
sie dir zu einfach/zu unspezifisch sind).

Zellen, deren Inhalt mit `http` beginnt, werden automatisch als Bild
gerendert; alles andere wird als Text angezeigt. Leere Zellen oder `-` werden
übersprungen.

## Wie der Trainer funktiniert

- **Zufällige Frage**: Für eine zufällige Länder/Meta-Kombination (aus den
  aktivierten Spalten) wird der Inhalt der Zelle angezeigt.
- **Zwei Antwortmodi**: Land eintippen (mit Autovervollständigung) oder aus
  4 Optionen auswählen — jederzeit umschaltbar.
- **Gewichtete Wiederholung**: Noch nie gesehene und zuletzt falsch
  beantwortete Metas kommen häufiger dran als bereits mehrfach richtig
  beantwortete („Merkstärke“, angezeigt als 0–3 Punkte).
- **Fortschritt**: Unter „Fortschritt“ siehst du alle bisherigen Ergebnisse
  je Land/Meta-Kombination, inkl. Trefferquote. Alles liegt nur in
  `localStorage` deines Browsers — kein Server, kein Account.

## Deployment (GitHub Pages)

1. Repo auf GitHub pushen.
2. **Settings → Pages → Source**: `main`-Branch, Ordner `/ (root)`.
3. Seite ist danach unter `https://<user>.github.io/<repo>/` erreichbar.

## Projektstruktur

```
├── index.html
├── css/style.css
├── js/app.js           # gesamte Logik (CSV laden, Quiz, Fortschritt)
├── data/data.csv        # deine Daten (4 Beispielzeilen als Vorlage)
└── README.md
```
