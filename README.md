# NavBib — Bibliotheks-Wegweiser

Prototyp eines Systems, mit dem Besucher einer Bibliothek sehen, **wo genau** ein Medium
steht: Etage, Bereich, Regal, Reihe, Fach — dazu ein schematischer Lageplan und eine
Ansicht des Gebäudes nach Stockwerken.

Zwei Oberflächen in einer Anwendung:

- **Besuch** — Suche und Standortanzeige, ohne Anmeldung.
- **Verwaltung** — Bestand pflegen, Bereiche im Plan positionieren, Etagen benennen,
  Daten sichern und einlesen. Hinter einer PIN (Voreinstellung `2580`).

> **Dies ist ein Prototyp.** Die Daten liegen im Browser des jeweiligen Geräts, nicht auf
> einem Server. Die PIN ist Sichtschutz gegen neugierige Besucher, kein Schutz gegen einen
> Angriff. Beides ändert sich erst mit dem Serverdienst — siehe
> [`docs/testlauf-und-architektur.md`](docs/testlauf-und-architektur.md).

---

## Lokal starten

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
npm run dev
```

Die Adresse steht danach im Terminal, üblicherweise `http://localhost:5173`.

Produktionsbuild erzeugen und ansehen:

```bash
npm run build
npm run preview
```

---

## Online stellen (GitHub Pages)

Der Workflow unter `.github/workflows/deploy.yml` baut und veröffentlicht bei jedem Push
auf `main` automatisch.

Einmalig einzurichten:

1. Im Repo auf **Settings → Pages** gehen.
2. Unter **Source** den Eintrag **GitHub Actions** wählen.
3. Pushen. Nach ein bis zwei Minuten liegt die Seite unter
   `https://<benutzername>.github.io/NavBib/`.

Heißt das Repo anders als `NavBib`, muss `base` in `vite.config.js` entsprechend
angepasst werden — sonst laden die Dateien nicht.

---

## Aufbau

```
index.html                   Besuch und Verwaltung
erfassung.html               Werkzeug zum Einzeichnen (siehe unten)
src/
  BibliotheksNavigator.jsx   gesamte Anwendung, beide Oberflächen
  speicher.js               Speicherzugriff, gekapselt
  main.jsx                  Einstiegspunkt
  index.css                 minimale Grundlagen
  erfassung.js              Grundriss-Erfassung, ohne Framework
  erfassung.css             Gestaltung dazu
  assets/grundrisse/        Lagepläne EG, 1. OG, 2. OG
docs/
  testlauf-und-architektur.md   Testablauf, bekannte Grenzen, Zielarchitektur
```

Die Gestaltung steckt als CSS-Block in `BibliotheksNavigator.jsx`. Kein Tailwind, keine
weiteren Abhängigkeiten außer React und `@phosphor-icons/react` für die Symbole.

Die Formsprache lehnt sich an den öffentlichen Auftritt von Stadtbibliotheken an: warmer
Sandstein-/Taupe-Ton als Leitfarbe, scharfe Kanten statt Rundungen, zurückhaltende
Bewegung. Terrakotta markiert aktive Standorte und Interaktion.

---

## Datenmodell

```jsonc
{
  "einrichtung": "Stadtbibliothek",
  "verwaltungPin": "2580",
  "etagen":   [{ "id", "nr", "kurz", "name", "zweck", "bildUrl" }],
  "bereiche": [{ "id", "name", "etageId", "x", "y" }],   // x, y in Prozent des Plans
  "buecher":  [{ "id", "titel", "autor", "signatur", "medienart",
                 "bereichId", "regal", "reihe", "fach" }]
}
```

Bereichspositionen sind bewusst Prozentwerte, keine Pixel. Sobald echte Grundrisse
vorliegen, wird pro Etage nur `bildUrl` gefüllt — die gesetzten Punkte bleiben stimmen.

Über **Verwaltung → Daten** lässt sich dieser Baum als JSON exportieren und wieder
einlesen. Dasselbe Format ist der geplante Übergabepunkt an den späteren Serverdienst.

---

## Grundriss-Erfassung

`npm run dev`, dann `/erfassung.html` öffnen. Damit werden **Bereiche, Regale, Treppen,
Aufzüge und Theken** direkt auf den echten Grundrissen eingezeichnet.

Die Bibliothek ist ein **Großraum**: außer Aufzug und Treppenhaus gibt es kaum
umschlossene Räume. „Kinderbibliothek“ ist ein Stück offener Halle, keine Kante im Plan.
Dafür gibt es zwei Wege, und der zweite ist der ehrlichere:

- **Bereich zeichnen:** ein Rechteck über die Fläche ziehen, danach den Namen aus einer
  Liste bestätigen. Die Liste stammt aus dem „Wo finde ich was?“-Wegweiser der Bibliothek,
  ein eigener Name geht auch. Die Grenze ist dann eine Festlegung, keine bauliche Tatsache —
  das ist für einen Wegweiser völlig ausreichend.
- **Bereich aus Regalen bilden:** erst die Regale einzeichnen (die sind im Plan sichtbar),
  dann **Sammeln** einschalten, die zusammengehörigen Regale antippen und **Bereich
  bilden…** wählen. Die Fläche wird um die Regale herum gelegt, und jedes Regal merkt sich
  seine Zugehörigkeit. So muss keine Grenze erfunden werden.
- **Regal/Theke** sind Strecken (Anfang antippen, Ende antippen), **Treppe/Aufzug**
  ebenfalls Rechtecke. **Fläche frei** zeichnet Ecke für Ecke, für unregelmäßige Zuschnitte;
  abgeschlossen wird über den sichtbaren **Fertig**-Knopf.
- **Reihe…** vervielfältigt ein Regal senkrecht zu sich selbst — acht parallele Regale
  mit 1,2 m Abstand sind zwei Eingaben statt acht Zeichenvorgängen.
- **Maßstab ist optional.** Ohne ihn läuft alles weiter, Längen stehen dann in relativen
  Einheiten. Wer ihn setzen will, wählt etwas mit bekanntem Maß (Zimmertür 88,5 cm,
  Eingangstür 101 cm, Treppenstufe 28 cm) und zeichnet es im Plan nach; danach stehen alle
  Längen in Metern. Genauer wird es, wenn man die Gebäudelänge in Google Maps über
  „Entfernung messen“ abgreift.
- Erfasst wird laufend im Browserspeicher; **JSON sichern** gibt den Stand heraus,
  **Laden** liest ihn wieder ein.

Alles funktioniert per Maus und per Touch (Ziehen zeichnet, zwei Finger zoomen) — die
Erfassung ist als Tablet-Arbeit vor Ort gedacht.

Jedes Regal trägt neben der Geometrie zwei Felder: **Signatur von / bis**. Das ist der
Kern des geplanten Modells (siehe unten).

---

## Wohin das führt: Signaturbereiche statt Einzelstandorte

Im aktuellen Datenmodell hängt der Standort am Buch. Das ist für 14 Beispielmedien
handhabbar und für einen echten Bestand unmöglich zu pflegen.

Der Umbau dreht das um:

- Ein **Regal** trägt einen Signaturbereich, z. B. `SL Kaa` bis `SL Kul`.
- Ein **Buch** trägt nur seine Signatur — die kommt ohnehin aus dem Katalog.
- Der Standort wird **berechnet**, nicht gespeichert.

Damit genügt ein Katalog-Import, Neuzugänge sind automatisch verortet, und eine
Umstellung im Regal ist eine geänderte Bereichsgrenze statt hunderter Datensätze.
Lücken und Überschneidungen lassen sich maschinell prüfen.

Zwei Dinge sind dafür noch zu bauen: ein Signatur-Vergleicher, der `Ges 100` korrekt
hinter `Ges 99` einsortiert, und der Katalog-Import.

---

## Nächste Schritte

- Signatur-Vergleicher und Standortberechnung über Signaturbereiche
- CSV-Import, damit ein Probeexport aus dem Katalogsystem direkt eingelesen werden kann
- Erfassung und App zusammenführen: erfasste Regale als Standortquelle nutzen
- Serverdienst mit Datenbank, getrennt nach öffentlicher Lese-App und interner Pflege-App
- Anmeldung mit persönlichen Konten statt geteilter PIN

---

## Beispieldaten

Die Lagepläne für EG, 1. OG und 2. OG (`src/assets/grundrisse/`) sind echte Grundrisse, die
Bereichsnamen (Infotheke, Kinderbibliothek, Michael-Ende-Kabinett, Gaming-Room, Romane,
Graphothek, Lernstudio, …) stammen aus dem echten „Wo finde ich was?“-Wegweiser der
Bibliothek. Die genaue **Position** der Bereiche auf dem Plan sowie der Bestand selbst sind
weiterhin **erfunden** und dienen nur der Veranschaulichung. Vor jedem Test über
**Verwaltung → Bereiche & Plan** durch die tatsächliche Positionierung ersetzen.
