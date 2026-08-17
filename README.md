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
src/
  BibliotheksNavigator.jsx   gesamte Anwendung, beide Oberflächen
  speicher.js               Speicherzugriff, gekapselt
  main.jsx                  Einstiegspunkt
  index.css                 minimale Grundlagen
docs/
  testlauf-und-architektur.md   Testablauf, bekannte Grenzen, Zielarchitektur
```

Die Gestaltung steckt als CSS-Block in `BibliotheksNavigator.jsx`. Kein Tailwind, keine
weiteren Abhängigkeiten außer React und `lucide-react` für die Symbole.

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

## Nächste Schritte

- CSV-Import, damit ein Probeexport aus dem Katalogsystem direkt eingelesen werden kann
- Echte Grundrisse hinterlegen
- Serverdienst mit Datenbank, getrennt nach öffentlicher Lese-App und interner Pflege-App
- Anmeldung mit persönlichen Konten statt geteilter PIN

---

## Beispieldaten

Etagenaufteilung und Bestand im Auslieferungszustand sind **erfunden** und dienen nur der
Veranschaulichung. Vor jedem Test durch die tatsächlichen Gegebenheiten ersetzen.
