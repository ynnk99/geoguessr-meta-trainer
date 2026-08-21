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

## Eigene Daten einbinden

Es gibt zwei Wege, deine echten Daten reinzubekommen:

### A — Direkt aus dem Google Sheet laden (empfohlen)

1. Im Sheet oben rechts auf **Teilen** → Zugriff auf „Jeder mit dem Link“ →
   Rolle „Betrachter“ stellen.
2. Den normalen Link aus der Adresszeile kopieren (z. B.
   `https://docs.google.com/spreadsheets/d/ABC123.../edit#gid=456`).
3. In der App unter **Einstellungen → Datenquelle** den Link einfügen und auf
   „Laden“ klicken.

Die App merkt sich den Link (lokal in deinem Browser) und lädt bei jedem
Besuch automatisch die aktuelle Version des Sheets — du musst nichts
exportieren oder committen. Es gibt keine separate „Sheet-ID“ einzutragen,
einfach den kompletten Link aus der Adresszeile verwenden.

Falls das Laden fehlschlägt, liegt es fast immer an der Freigabe (Schritt 1)
— ohne „Jeder mit dem Link“ kann der Browser die Daten nicht lesen.

### B — CSV hochladen / ins Repo legen

Alternativ **Datei → Herunterladen → Kommaseparierte Werte (.csv)** und die
Datei entweder unter **Einstellungen → CSV hochladen** einmalig testen, oder
dauerhaft nach `data/data.csv` legen (überschreibt die Beispieldaten).

### Bilder

Wichtig in beiden Fällen: Bilder, die du **direkt ins Sheet eingefügt** hast
(Bild einfügen → in Zelle), werden nicht mit übertragen — sowohl CSV-Export
als auch das Live-Lesen können nur Text-Inhalte lesen, keine eingebetteten
Bilder. Damit deine Bollards/Chevrons/Zebrastreifen im Trainer erscheinen,
müssen die Zellen eine **Bild-URL als Text** enthalten, nicht das Bild
selbst.

Zwei Wege dahin:

**A — Bilder extern hosten und URL eintragen**
Lade die Bilder z. B. bei [imgur.com](https://imgur.com) hoch (oder in einen
`assets/`-Ordner in diesem Repo, siehe unten) und trage den Direktlink
(`https://…/bild.jpg`) als Zelleninhalt ein statt des eingefügten Bildes.

**B — GitHub als Bild-Host nutzen**
Lade deine Bilder in einen Ordner `data/images/` in diesem Repo hoch und
verlinke sie im Sheet als
`https://raw.githubusercontent.com/<user>/<repo>/main/data/images/<datei>.jpg`.

Die mitgelieferte `data/data.csv` benutzt bewusst Platzhalterbilder von
`placehold.co`, die als Bild einfach ihren eigenen Namen zeigen (z. B.
„Chevron ES“) — das ist kein Fehler, sondern nur eine Demo dafür, dass die
Bildanzeige funktioniert. Mit echten URLs erscheinen echte Screenshots.

Die erste Zeile (egal ob CSV oder Sheet) muss die Spaltenüberschriften
enthalten. Die Spalte **„Land“** ist Pflicht und wird als Antwort verwendet.
Die Spalte **„Kontinent“** wird nie als Frage benutzt (fest ausgeschlossen,
da meist zu generisch/eindeutig). Alle übrigen Spalten (Bollard, Road Lines,
Chevrons, Plates, Sprache, …) werden automatisch als mögliche Fragen
erkannt — unter **Einstellungen** kannst du einzelne davon für den
gemischten Modus an- oder abschalten, oder direkt im Quiz-Dropdown eine
einzelne Kategorie gezielt üben.

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
