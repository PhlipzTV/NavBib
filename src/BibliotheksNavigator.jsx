import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  MagnifyingGlass,
  MapPin,
  ArrowLeft,
  Plus,
  PencilSimple,
  Trash,
  FloppyDisk,
  X,
  DownloadSimple,
  UploadSimple,
  ArrowCounterClockwise,
  Stack,
  BookOpen,
  Gear,
  Crosshair,
  Check,
  Warning,
  Lock,
  ShieldWarning,
  SignOut,
} from "@phosphor-icons/react";
import { lesen, schreiben } from "./speicher";
import grundrissEG from "./assets/grundrisse/eg.png";
import grundriss1OG from "./assets/grundrisse/1og.png";
import grundriss2OG from "./assets/grundrisse/2og.png";

/* ------------------------------------------------------------------
   Bibliotheks-Navigator — Grundgerüst ohne eigenes Backend
   Daten liegen im lokalen Speicher des Geraets (siehe speicher.js).
   Import/Export als JSON ist der Übergabepunkt für einen späteren
   echten Datenimport (CSV / MARC aus dem Katalogsystem).
------------------------------------------------------------------- */

const STORAGE_KEY = "bibnav:daten:v2";

/* ---------------------------- Beispieldaten ---------------------- */

const SEED = {
  einrichtung: "Stadtbibliothek",
  verwaltungPin: "2580",
  etagen: [
    { id: "e0", nr: 0, kurz: "EG", name: "Erdgeschoss", zweck: "Eingang, Ausleihe, Rückgabe, Café", bildUrl: grundrissEG },
    { id: "e1", nr: 1, kurz: "1. OG", name: "1. Obergeschoss", zweck: "Kinder- und Jugendbibliothek, Gaming-Room", bildUrl: grundriss1OG },
    { id: "e2", nr: 2, kurz: "2. OG", name: "2. Obergeschoss", zweck: "Romane, Sachliteratur, Graphothek, Lernstudios", bildUrl: grundriss2OG },
  ],
  bereiche: [
    // Reihenfolge und ungefähre Position an den echten Grundriss abgeglichen: der
    // Treppen-/Aufzugskern liegt auf allen drei Etagen bei ~68–73% der Gebäudelänge,
    // ein Verbindungskorridor bei ~45–58%. Exakte Werte bitte über Verwaltung → Bereiche
    // & Plan direkt auf dem Grundriss nachjustieren.
    { id: "b04", name: "Café", etageId: "e0", x: 8, y: 55 },
    { id: "b02", name: "Zeitschriften & Bestseller", etageId: "e0", x: 32, y: 45 },
    { id: "b01", name: "Infotheke", etageId: "e0", x: 60, y: 50 },
    { id: "b03", name: "Ausleihe & Rückgabe", etageId: "e0", x: 85, y: 50 },
    { id: "b05", name: "Kinderbibliothek", etageId: "e1", x: 10, y: 40 },
    { id: "b06", name: "Michael-Ende-Kabinett", etageId: "e1", x: 22, y: 40 },
    { id: "b07", name: "Jugendbibliothek", etageId: "e1", x: 40, y: 55 },
    { id: "b08", name: "Gaming-Room", etageId: "e1", x: 58, y: 60 },
    { id: "b09", name: "Non-Book-Bereich", etageId: "e1", x: 85, y: 45 },
    { id: "b10", name: "Romane A–H", etageId: "e2", x: 12, y: 32 },
    { id: "b11", name: "Romane I–R", etageId: "e2", x: 28, y: 30 },
    { id: "b12", name: "Romane S–Z", etageId: "e2", x: 42, y: 34 },
    { id: "b13", name: "Graphothek", etageId: "e2", x: 55, y: 65 },
    { id: "b14", name: "Sachliteratur", etageId: "e2", x: 80, y: 32 },
    { id: "b15", name: "Lernstudios", etageId: "e2", x: 92, y: 62 },
  ],
  buecher: [
    { id: "m01", titel: "Die Vermessung der Welt", autor: "Daniel Kehlmann", signatur: "SL Kehl", medienart: "Buch", bereichId: "b11", regal: "14", reihe: "3", fach: "B" },
    { id: "m02", titel: "Der Vorleser", autor: "Bernhard Schlink", signatur: "SL Schl", medienart: "Buch", bereichId: "b12", regal: "21", reihe: "2", fach: "C" },
    { id: "m03", titel: "Tschick", autor: "Wolfgang Herrndorf", signatur: "JU Herr", medienart: "Buch", bereichId: "b07", regal: "07", reihe: "1", fach: "A" },
    { id: "m04", titel: "Die kleine Raupe Nimmersatt", autor: "Eric Carle", signatur: "BB Carl", medienart: "Bilderbuch", bereichId: "b05", regal: "02", reihe: "1", fach: "A" },
    { id: "m05", titel: "Der Report der Magd", autor: "Margaret Atwood", signatur: "SL Atwo", medienart: "Buch", bereichId: "b10", regal: "03", reihe: "4", fach: "D" },
    { id: "m06", titel: "Eine kurze Geschichte der Zeit", autor: "Stephen Hawking", signatur: "Nat 210", medienart: "Sachbuch", bereichId: "b14", regal: "11", reihe: "2", fach: "B" },
    { id: "m07", titel: "Die Wohlgesinnten", autor: "Jonathan Littell", signatur: "SL Litt", medienart: "Buch", bereichId: "b11", regal: "15", reihe: "1", fach: "A" },
    { id: "m08", titel: "Sapiens", autor: "Yuval Noah Harari", signatur: "Ges 100", medienart: "Sachbuch", bereichId: "b14", regal: "05", reihe: "3", fach: "C" },
    { id: "m09", titel: "Der Herr der Ringe", autor: "J. R. R. Tolkien", signatur: "SL Tolk", medienart: "Buch", bereichId: "b12", regal: "23", reihe: "1", fach: "A" },
    { id: "m10", titel: "Momo", autor: "Michael Ende", signatur: "KI Ende", medienart: "Buch", bereichId: "b06", regal: "09", reihe: "2", fach: "B" },
    { id: "m11", titel: "Der Schwarm", autor: "Frank Schätzing", signatur: "SL Schä", medienart: "Buch", bereichId: "b12", regal: "20", reihe: "4", fach: "D" },
    { id: "m12", titel: "Kochen für Anfänger", autor: "Sarah Wiener", signatur: "Hau 320", medienart: "Sachbuch", bereichId: "b14", regal: "13", reihe: "1", fach: "A" },
    { id: "m13", titel: "Das Cabinet des Dr. Caligari", autor: "Robert Wiene", signatur: "Film 44", medienart: "DVD", bereichId: "b09", regal: "04", reihe: "2", fach: "B" },
    { id: "m14", titel: "Kafka am Strand", autor: "Haruki Murakami", signatur: "SL Mura", medienart: "Buch", bereichId: "b11", regal: "17", reihe: "3", fach: "C" },
  ],
};

/* ---------------------------- Hilfsfunktionen -------------------- */

const uid = (p) => p + Math.random().toString(36).slice(2, 9);

const norm = (s) => (s || "").toString().toLowerCase().trim();

function suche(buecher, bereiche, q) {
  const tokens = norm(q).split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  return buecher.filter((b) => {
    const bereich = bereiche.find((x) => x.id === b.bereichId);
    const heu = norm([b.titel, b.autor, b.signatur, b.medienart, bereich?.name].join(" "));
    return tokens.every((t) => heu.includes(t));
  });
}

/* ---------------------------- Design-Tokens ---------------------- */

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500&display=swap');

.bn {
  --stone:      #F5F0E6;
  --paper:      #FFFFFF;
  --ink:        #241F18;
  --ink2:       #675C4C;
  --concrete:   #A89A80;
  --line:       #E3DAC9;
  --taupe:      #8C7C5E;
  --taupe-deep: #5B4E39;
  --signal:     #A6482A;
  --signal-2:   #F4E3D6;
  --warn:       #7A2E1C;
  --ui: 'Manrope', ui-sans-serif, system-ui, 'Segoe UI', sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, 'SF Mono', monospace;

  font-family: var(--ui);
  color: var(--ink);
  background: var(--stone);
  min-height: 100%;
  -webkit-font-smoothing: antialiased;
}
@media (prefers-color-scheme: dark) {
  .bn {
    --stone:      #1C1712;
    --paper:      #241E17;
    --ink:        #F1E9DC;
    --ink2:       #C1B29B;
    --concrete:   #8C7F68;
    --line:       #3B3226;
    --taupe:      #A08D6B;
    --taupe-deep: #241E17;
    --signal:     #E0855C;
    --signal-2:   #3E2B21;
    --warn:       #E3866A;
  }
}
.bn *, .bn *::before, .bn *::after { box-sizing: border-box; }
.bn button { font: inherit; color: inherit; cursor: pointer; }
.bn input, .bn select, .bn textarea { font: inherit; color: inherit; }

/* --- Grundraster --- */
.bn-shell { max-width: 62rem; margin: 0 auto; padding: 0 1rem 5rem; }
.bn-head {
  position: sticky; top: 0; z-index: 30;
  background: var(--taupe);
  border-bottom: 1px solid var(--taupe-deep);
}
.bn-head, .bn-head button { color: #fff; }
.bn-head-in {
  max-width: 62rem; margin: 0 auto; padding: .7rem 1rem;
  display: flex; align-items: center; gap: .75rem; justify-content: space-between;
}
.bn-wordmark { display: flex; align-items: center; gap: .5rem; min-width: 0; }
.bn-wordmark svg { flex: none; color: #fff; }
.bn-wordmark b {
  font-weight: 700; font-size: .95rem; letter-spacing: -.01em;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.bn-wordmark span {
  font-family: var(--mono); font-size: .62rem; letter-spacing: .14em;
  text-transform: uppercase; color: rgba(255,255,255,.68); white-space: nowrap;
}

/* --- Umschalter --- */
.bn-toggle { display: flex; border: 1px solid rgba(255,255,255,.38); border-radius: 0; background: transparent; flex: none; }
.bn-toggle button {
  border: 0; background: transparent; padding: .42rem .7rem;
  font-size: .74rem; font-weight: 600; letter-spacing: .02em; color: rgba(255,255,255,.82);
  display: flex; align-items: center; gap: .35rem;
}
.bn-toggle button[aria-pressed="true"] { background: #fff; color: var(--taupe-deep); }

/* --- Typo --- */
.bn-eyebrow {
  font-family: var(--mono); font-size: .64rem; letter-spacing: .16em;
  text-transform: uppercase; color: var(--concrete);
}
.bn-h1 { font-size: 1.55rem; font-weight: 700; letter-spacing: -.02em; line-height: 1.15; margin: .35rem 0 0; }
.bn-h2 { font-size: 1rem; font-weight: 600; letter-spacing: -.01em; margin: 0; }
.bn-mono { font-family: var(--mono); }
.bn-muted { color: var(--ink2); }

/* --- Suchfeld --- */
.bn-searchwrap { position: relative; margin-top: 1rem; }
.bn-searchwrap > svg { position: absolute; left: .85rem; top: 50%; transform: translateY(-50%); color: var(--concrete); }
.bn-search {
  width: 100%; padding: .95rem 2.6rem .95rem 2.75rem;
  border: 1px solid var(--line); border-radius: 0; background: var(--paper);
  font-size: 1rem; outline: none;
}
.bn-search:focus-visible { border-color: var(--signal); box-shadow: 0 0 0 3px var(--signal-2); }
.bn-clear {
  position: absolute; right: .45rem; top: 50%; transform: translateY(-50%);
  border: 0; background: transparent; padding: .45rem; color: var(--concrete); line-height: 0;
}

/* --- Trefferliste --- */
.bn-list { list-style: none; margin: 1rem 0 0; padding: 0; border-top: 1px solid var(--line); }
.bn-hit {
  width: 100%; text-align: left; background: transparent; border: 0;
  border-bottom: 1px solid var(--line);
  padding: .85rem .25rem; display: flex; gap: .85rem; align-items: baseline;
}
.bn-hit:hover, .bn-hit:focus-visible { background: var(--paper); outline: none; }
.bn-hit:focus-visible { box-shadow: inset 3px 0 0 var(--signal); }
.bn-hit-sig {
  font-family: var(--mono); font-size: .72rem; color: var(--signal);
  flex: none; width: 5.2rem; padding-top: .12rem;
}
.bn-hit-t { font-weight: 600; font-size: .95rem; line-height: 1.3; }
.bn-hit-a { font-size: .82rem; color: var(--ink2); margin-top: .1rem; }
.bn-hit-loc { font-size: .74rem; color: var(--concrete); margin-top: .25rem; }

/* --- Karten --- */
.bn-card { background: var(--paper); border: 1px solid var(--line); border-radius: 0; }
.bn-pad { padding: 1rem; }

/* --- Wegweiser-Zeile --- */
.bn-crumbs { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .9rem; }
.bn-crumb {
  border: 1px solid var(--line); background: var(--paper);
  padding: .4rem .6rem; border-radius: 0; line-height: 1.1;
}
.bn-crumb dt {
  font-family: var(--mono); font-size: .58rem; letter-spacing: .12em;
  text-transform: uppercase; color: var(--concrete);
}
.bn-crumb dd { margin: .2rem 0 0; font-weight: 600; font-size: .95rem; }
.bn-crumb.is-signal { border-color: var(--signal); background: var(--signal-2); }
.bn-crumb.is-signal dd { color: var(--signal); }

/* --- Formulare --- */
.bn-field { display: block; margin-bottom: .7rem; }
.bn-field > span {
  display: block; font-family: var(--mono); font-size: .6rem; letter-spacing: .12em;
  text-transform: uppercase; color: var(--concrete); margin-bottom: .28rem;
}
.bn-input, .bn-select {
  width: 100%; padding: .55rem .6rem; border: 1px solid var(--line);
  border-radius: 0; background: var(--paper); outline: none;
  font-size: .92rem;
}
.bn-input:focus-visible, .bn-select:focus-visible { border-color: var(--signal); box-shadow: 0 0 0 3px var(--signal-2); }
.bn-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0 .6rem; }
.bn-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0 .6rem; }

/* --- Buttons --- */
.bn-btn {
  border: 1px solid var(--line); background: var(--paper); color: var(--ink);
  padding: .5rem .8rem; border-radius: 0; font-size: .82rem; font-weight: 600;
  display: inline-flex; align-items: center; gap: .4rem;
}
.bn-btn:hover { border-color: var(--ink2); }
.bn-btn:focus-visible { outline: none; border-color: var(--signal); box-shadow: 0 0 0 3px var(--signal-2); }
.bn-btn.is-primary { background: var(--ink); border-color: var(--ink); color: #fff; }
.bn-btn.is-danger { color: var(--warn); }
.bn-btn.is-ghost { background: transparent; border-color: transparent; }
.bn-btn[disabled] { opacity: .45; cursor: not-allowed; }
.bn-iconbtn {
  border: 1px solid transparent; background: transparent; padding: .4rem;
  border-radius: 0; line-height: 0; color: var(--ink2);
}
.bn-iconbtn:hover { border-color: var(--line); background: var(--paper); }
.bn-iconbtn:focus-visible { outline: none; border-color: var(--signal); box-shadow: 0 0 0 3px var(--signal-2); }

/* --- Tabs --- */
.bn-tabs { display: flex; gap: .1rem; border-bottom: 1px solid var(--line); margin-top: 1rem; overflow-x: auto; }
.bn-tab {
  border: 0; background: transparent; padding: .6rem .75rem; font-size: .82rem; font-weight: 600;
  color: var(--ink2); border-bottom: 2px solid transparent; white-space: nowrap;
}
.bn-tab[aria-selected="true"] { color: var(--ink); border-bottom-color: var(--signal); }

/* --- Zeilen in der Verwaltung --- */
.bn-row {
  display: flex; align-items: center; gap: .7rem;
  padding: .6rem .25rem; border-bottom: 1px solid var(--line);
}
.bn-row-main { min-width: 0; flex: 1; }
.bn-row-t { font-weight: 600; font-size: .9rem; line-height: 1.25; }
.bn-row-s { font-size: .76rem; color: var(--ink2); margin-top: .12rem; }

/* --- Hinweisstreifen --- */
.bn-note {
  display: flex; gap: .55rem; align-items: flex-start;
  border: 1px solid var(--line); border-left: 3px solid var(--concrete);
  background: var(--paper); padding: .65rem .75rem; font-size: .8rem; color: var(--ink2);
  border-radius: 0;
}
.bn-note.is-signal { border-left-color: var(--signal); }

/* --- Leerzustand --- */
.bn-empty { padding: 2.5rem 1rem; text-align: center; color: var(--ink2); font-size: .9rem; }

/* --- Etagenstapel (Signature) --- */
.bn-stack { display: block; width: 100%; height: auto; }
.bn-slab { transition: opacity .25s ease; }
.bn-pulse { transform-origin: center; animation: bnPulse 2.2s ease-out infinite; }
@keyframes bnPulse {
  0%   { r: 2.2; opacity: .55; }
  70%  { r: 7.5; opacity: 0; }
  100% { r: 7.5; opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .bn-pulse { animation: none; opacity: .3; }
  .bn-slab { transition: none; }
}

.bn-planwrap { position: relative; background: var(--paper); border: 1px solid var(--line); border-radius: 0; }
.bn-plan { display: block; width: 100%; height: auto; }
.bn-plan.is-picking { cursor: crosshair; }

.bn-scroll { max-height: 24rem; overflow-y: auto; }

/* --- Ankunft: Hero-Band --- */
.bn-heroband {
  position: relative; margin: 0 -1rem; overflow: hidden;
  min-height: 9.5rem; display: flex; align-items: flex-end;
  animation: bnRise .5s cubic-bezier(.16,1,.3,1) both;
}
.bn-heroband-deco { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 0; display: block; }
.bn-heroband-in { position: relative; z-index: 1; padding: 1.5rem 1rem 1.7rem; }
.bn-heroband .bn-eyebrow { color: rgba(255,255,255,.72); }
.bn-heroband .bn-h1 { color: #fff; }

.bn-search-raised {
  margin-top: -1.6rem !important; position: relative; z-index: 2;
  box-shadow: 0 14px 30px -20px rgba(36,31,24,.45);
}

/* --- Auf einen Blick --- */
.bn-glance {
  display: grid; grid-template-columns: 1.2fr 1fr; border: 1px solid var(--line);
  margin-top: 1.6rem; animation: bnRise .5s cubic-bezier(.16,1,.3,1) both;
}
.bn-glance-list { background: var(--taupe); color: #fff; padding: 1.1rem 1.1rem 1.2rem; }
.bn-glance-h {
  font-family: var(--mono); font-size: .6rem; letter-spacing: .14em; text-transform: uppercase;
  color: rgba(255,255,255,.68); margin: 0 0 .6rem;
}
.bn-glance-list ul { list-style: none; margin: 0; padding: 0; }
.bn-glance-list li {
  display: flex; gap: .6rem; align-items: baseline; padding: .4rem 0;
  border-top: 1px solid rgba(255,255,255,.16);
}
.bn-glance-list li:first-child { border-top: 0; }
.bn-glance-kurz { font-family: var(--mono); font-size: .72rem; color: rgba(255,255,255,.75); flex: none; width: 2.6rem; }
.bn-glance-txt { min-width: 0; display: flex; flex-direction: column; }
.bn-glance-txt b { font-size: .88rem; font-weight: 600; }
.bn-glance-txt small { font-size: .74rem; color: rgba(255,255,255,.7); }
.bn-glance-stat { background: var(--paper); padding: 1.1rem; display: flex; flex-direction: column; gap: .2rem; }
.bn-glance-num { font-family: var(--mono); font-size: 2.3rem; font-weight: 500; line-height: 1; margin: 0; color: var(--signal); }
.bn-glance-cap { font-size: .82rem; color: var(--ink2); margin: 0 0 .8rem; }
.bn-glance-hint { font-size: .78rem; color: var(--concrete); margin: auto 0 0; }
@media (max-width: 640px) { .bn-glance { grid-template-columns: 1fr; } }

/* --- Zugangssperre --- */
.bn-gatepage { background: var(--taupe-deep); margin: 0 -1rem; padding: 0 1rem; }
.bn-gate { max-width: 22rem; margin: 0 auto; padding: 3rem 0; text-align: left; }
.bn-gate-icon {
  width: 2.4rem; height: 2.4rem; border: 1px solid rgba(255,255,255,.28); background: rgba(255,255,255,.08);
  border-radius: 0; display: flex; align-items: center; justify-content: center; color: #fff;
}
.bn-gate .bn-eyebrow { color: rgba(255,255,255,.62); }
.bn-gate .bn-h1 { color: #fff; }
.bn-gate .bn-btn.is-primary { background: #fff; border-color: #fff; color: var(--taupe-deep); }
.bn-gate .bn-btn:not(.is-primary) { color: #fff; border-color: rgba(255,255,255,.38); background: transparent; }
.bn-gate .bn-note { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.2); color: rgba(255,255,255,.78); }
.bn-pin {
  width: 100%; padding: .8rem .7rem; border: 1px solid var(--line); border-radius: 0;
  background: var(--paper); color: var(--ink); font-family: var(--mono); font-size: 1.4rem;
  letter-spacing: .5em; text-align: center; outline: none;
}
.bn-pin:focus-visible { border-color: var(--signal); box-shadow: 0 0 0 3px var(--signal-2); }
.bn-pin.is-fehler { border-color: #E8A98F; }
.bn-gate-fehler { color: #F0B49C; font-size: .8rem; margin: .5rem 0 0; }

@keyframes bnRise { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .bn-heroband, .bn-glance { animation: none; }
}

@media (max-width: 560px) {
  .bn-grid3 { grid-template-columns: 1fr 1fr; }
  .bn-h1 { font-size: 1.3rem; }
  .bn-hit-sig { width: 4.4rem; font-size: .68rem; }
}
`;

/* ---------------------------- Etagenstapel ------------------------ */

function EtagenStapel({ etagen, aktivEtageId, marker, onSelect }) {
  const sortiert = [...etagen].sort((a, b) => b.nr - a.nr);
  const W = 74;
  const H = 26;
  const cx = 100;
  const step = 34;
  const top = 34;
  const hoehe = top + step * (sortiert.length - 1) + H + 16;

  const isoPunkt = (px, py, cy) => {
    const u = px / 100;
    const v = py / 100;
    return { x: cx + u * W - v * W, y: cy - H + u * H + v * H };
  };

  return (
    <svg
      className="bn-stack"
      viewBox={`-32 0 232 ${hoehe}`}
      role="img"
      aria-label="Schematischer Aufbau des Gebäudes nach Etagen"
    >
      {sortiert.map((et, i) => {
        const cy = top + i * step;
        const aktiv = et.id === aktivEtageId;
        const pts = `${cx},${cy - H} ${cx + W},${cy} ${cx},${cy + H} ${cx - W},${cy}`;
        const p = aktiv && marker ? isoPunkt(marker.x, marker.y, cy) : null;
        return (
          <g key={et.id} className="bn-slab" style={{ opacity: aktiv ? 1 : 0.32 }}>
            <polygon
              points={pts}
              fill={aktiv ? "var(--signal-2)" : "var(--paper)"}
              stroke={aktiv ? "var(--signal)" : "var(--line)"}
              strokeWidth={aktiv ? 1.4 : 1}
              onClick={onSelect ? () => onSelect(et.id) : undefined}
              style={{ cursor: onSelect ? "pointer" : "default" }}
            />
            <text
              x={cx - W - 6}
              y={cy + 3}
              textAnchor="end"
              fontSize="9"
              fontFamily="'IBM Plex Mono', monospace"
              fill={aktiv ? "var(--signal)" : "var(--concrete)"}
              fontWeight={aktiv ? 500 : 400}
            >
              {et.kurz}
            </text>
            {p && (
              <>
                <circle className="bn-pulse" cx={p.x} cy={p.y} r="2.2" fill="var(--signal)" />
                <circle cx={p.x} cy={p.y} r="3.2" fill="var(--signal)" />
                <line x1={p.x} y1={p.y - 3.2} x2={p.x} y2={p.y - 14} stroke="var(--signal)" strokeWidth="1.2" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------------------------- Grundriss --------------------------- */

function Grundriss({ etage, bereiche, aktivBereichId, picking, onPick, kompakt }) {
  const ref = useRef(null);

  const klick = (e) => {
    if (!picking || !onPick) return;
    const r = ref.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - r.left) / r.width) * 1000) / 10;
    const y = Math.round(((e.clientY - r.top) / r.height) * 1000) / 10;
    onPick({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  };

  return (
    <div className="bn-planwrap">
      <svg
        ref={ref}
        className={"bn-plan" + (picking ? " is-picking" : "")}
        viewBox="0 0 100 22"
        onClick={klick}
        role="img"
        aria-label={`${etage?.bildUrl ? "Lageplan" : "Schematischer Lageplan"} ${etage?.name || ""}`}
      >
        {etage?.bildUrl ? (
          <image href={etage.bildUrl} x="0" y="0" width="100" height="22" preserveAspectRatio="xMidYMid slice" />
        ) : (
          <>
            <rect x="1" y="1" width="98" height="20" fill="var(--stone)" stroke="var(--line)" strokeWidth="0.4" />
            {/* Erschließungskern: Treppe und Aufzug */}
            <rect x="44" y="15.5" width="12" height="5" fill="var(--line)" stroke="var(--concrete)" strokeWidth="0.3" />
            <text x="50" y="18.6" textAnchor="middle" fontSize="2.2" fill="var(--concrete)" fontFamily="'IBM Plex Mono', monospace">
              TREPPE
            </text>
            <path d="M1 13.5 H99" stroke="var(--line)" strokeWidth="0.3" />
            <path d="M50 1 V13.5" stroke="var(--line)" strokeWidth="0.3" />
          </>
        )}

        {bereiche.map((b) => {
          const aktiv = b.id === aktivBereichId;
          const x = (b.x / 100) * 98 + 1;
          const y = (b.y / 100) * 20 + 1;
          return (
            <g key={b.id}>
              <circle
                cx={x}
                cy={y}
                r={aktiv ? 2.6 : 1.5}
                fill={aktiv ? "var(--signal)" : "var(--concrete)"}
                stroke="var(--paper)"
                strokeWidth="0.6"
              />
              {aktiv && <circle className="bn-pulse" cx={x} cy={y} r="2.6" fill="var(--signal)" />}
              {(!kompakt || aktiv) && (
                <text
                  x={x}
                  y={y - (aktiv ? 4.6 : 3.2)}
                  textAnchor="middle"
                  fontSize={aktiv ? "3.4" : "2.6"}
                  fontWeight={aktiv ? 600 : 400}
                  fill={aktiv ? "var(--signal)" : "var(--ink2)"}
                  fontFamily="'Manrope', sans-serif"
                  paintOrder="stroke"
                  stroke="var(--paper)"
                  strokeWidth="2.2"
                  strokeLinejoin="round"
                >
                  {b.name}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* ---------------------------- Besucheransicht --------------------- */

function BesucherAnsicht({ daten }) {
  const [q, setQ] = useState("");
  const [gewaehlt, setGewaehlt] = useState(null);

  const treffer = useMemo(() => suche(daten.buecher, daten.bereiche, q), [daten, q]);
  const buch = gewaehlt ? daten.buecher.find((b) => b.id === gewaehlt) : null;
  const bereich = buch ? daten.bereiche.find((b) => b.id === buch.bereichId) : null;
  const etage = bereich ? daten.etagen.find((e) => e.id === bereich.etageId) : null;
  const nachbarn = bereich ? daten.bereiche.filter((b) => b.etageId === bereich.etageId) : [];

  if (buch) {
    return (
      <div className="bn-shell">
        <button className="bn-btn is-ghost" style={{ marginTop: "1rem", paddingLeft: 0 }} onClick={() => setGewaehlt(null)}>
          <ArrowLeft size={15} weight="regular" /> Zurück zur Suche
        </button>

        <p className="bn-eyebrow" style={{ marginTop: ".9rem" }}>
          {buch.medienart} · <span className="bn-mono">{buch.signatur}</span>
        </p>
        <h1 className="bn-h1">{buch.titel}</h1>
        <p className="bn-muted" style={{ margin: ".25rem 0 0", fontSize: ".92rem" }}>
          {buch.autor}
        </p>

        {!bereich || !etage ? (
          <div className="bn-note" style={{ marginTop: "1rem" }}>
            <Warning size={16} weight="regular" />
            <span>Für dieses Medium ist noch kein Standort hinterlegt. Bitte an der Information nachfragen.</span>
          </div>
        ) : (
          <>
            <dl className="bn-crumbs">
              <div className="bn-crumb is-signal">
                <dt>Etage</dt>
                <dd>{etage.kurz}</dd>
              </div>
              <div className="bn-crumb">
                <dt>Bereich</dt>
                <dd>{bereich.name}</dd>
              </div>
              <div className="bn-crumb">
                <dt>Regal</dt>
                <dd className="bn-mono">{buch.regal || "–"}</dd>
              </div>
              <div className="bn-crumb">
                <dt>Reihe</dt>
                <dd className="bn-mono">{buch.reihe || "–"}</dd>
              </div>
              <div className="bn-crumb">
                <dt>Fach</dt>
                <dd className="bn-mono">{buch.fach || "–"}</dd>
              </div>
            </dl>

            <div className="bn-card" style={{ marginTop: "1rem", padding: ".85rem" }}>
              <p className="bn-eyebrow">Gebäude</p>
              <EtagenStapel etagen={daten.etagen} aktivEtageId={etage.id} marker={{ x: bereich.x, y: bereich.y }} />
              <p style={{ margin: ".2rem 0 0", fontSize: ".84rem", textAlign: "center" }} className="bn-muted">
                {etage.name} — {etage.zweck}
              </p>
            </div>

            <div style={{ marginTop: "1rem" }}>
              <p className="bn-eyebrow" style={{ marginBottom: ".4rem" }}>
                Lageplan {etage.kurz}
              </p>
              <Grundriss etage={etage} bereiche={nachbarn} aktivBereichId={bereich.id} kompakt />
              {!etage.bildUrl && (
                <p className="bn-muted" style={{ fontSize: ".74rem", marginTop: ".4rem" }}>
                  Schematische Darstellung. Echter Grundriss lässt sich in der Verwaltung hinterlegen.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="bn-shell">
      <div className="bn-heroband">
        <svg className="bn-heroband-deco" viewBox="0 0 400 140" preserveAspectRatio="none" aria-hidden="true">
          <polygon points="0,0 400,0 400,78 0,140" fill="var(--taupe)" />
          <polygon points="0,0 400,0 400,44 0,96" fill="var(--taupe-deep)" opacity="0.5" />
          {Array.from({ length: 6 }).map((_, i) => (
            <line key={i} x1="0" y1={20 + i * 18} x2="400" y2={6 + i * 18} stroke="rgba(255,255,255,.1)" strokeWidth="1" />
          ))}
        </svg>
        <div className="bn-heroband-in">
          <p className="bn-eyebrow">Medium finden</p>
          <h1 className="bn-h1">Wo steht mein Buch?</h1>
        </div>
      </div>

      <div className="bn-searchwrap bn-search-raised">
        <MagnifyingGlass size={18} weight="regular" />
        <input
          className="bn-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Titel, Autor oder Signatur"
          aria-label="Suche nach Titel, Autor oder Signatur"
          autoComplete="off"
        />
        {q && (
          <button className="bn-clear" onClick={() => setQ("")} aria-label="Eingabe löschen">
            <X size={17} weight="regular" />
          </button>
        )}
      </div>

      {!q && (
        <div className="bn-glance">
          <div className="bn-glance-list">
            <p className="bn-glance-h">Etagen</p>
            <ul>
              {[...daten.etagen]
                .sort((a, b) => a.nr - b.nr)
                .map((e) => (
                  <li key={e.id}>
                    <span className="bn-glance-kurz">{e.kurz}</span>
                    <span className="bn-glance-txt">
                      <b>{e.name}</b>
                      <small>{e.zweck}</small>
                    </span>
                  </li>
                ))}
            </ul>
          </div>
          <div className="bn-glance-stat">
            <p className="bn-glance-h">Bestand</p>
            <p className="bn-glance-num">{daten.buecher.length}</p>
            <p className="bn-glance-cap">Medien in {daten.bereiche.length} Bereichen</p>
            <p className="bn-glance-hint">Titel, Autor oder Signatur oben eingeben, um den Standort zu finden.</p>
          </div>
        </div>
      )}

      {q && treffer.length === 0 && (
        <div className="bn-empty">
          Kein Treffer für „{q}“. Prüfen Sie die Schreibweise oder fragen Sie an der Information nach.
        </div>
      )}

      {treffer.length > 0 && (
        <>
          <p className="bn-eyebrow" style={{ marginTop: "1.1rem" }}>
            {treffer.length} {treffer.length === 1 ? "Treffer" : "Treffer"}
          </p>
          <ul className="bn-list">
            {treffer.map((b) => {
              const be = daten.bereiche.find((x) => x.id === b.bereichId);
              const et = be ? daten.etagen.find((e) => e.id === be.etageId) : null;
              return (
                <li key={b.id}>
                  <button className="bn-hit" onClick={() => setGewaehlt(b.id)}>
                    <span className="bn-hit-sig">{b.signatur}</span>
                    <span style={{ minWidth: 0 }}>
                      <span className="bn-hit-t" style={{ display: "block" }}>
                        {b.titel}
                      </span>
                      <span className="bn-hit-a" style={{ display: "block" }}>
                        {b.autor}
                      </span>
                      <span className="bn-hit-loc" style={{ display: "block" }}>
                        {et ? `${et.kurz} · ${be.name} · Regal ${b.regal}` : "Standort offen"}
                      </span>
                    </span>
                    <MapPin size={16} weight="regular" style={{ marginLeft: "auto", flex: "none", color: "var(--signal)" }} />
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}

/* ---------------------------- Verwaltung: Bücher ------------------ */

const LEER_BUCH = { titel: "", autor: "", signatur: "", medienart: "Buch", bereichId: "", regal: "", reihe: "", fach: "" };

function BuchFormular({ start, bereiche, etagen, onSpeichern, onAbbrechen }) {
  const [f, setF] = useState(start);
  const setz = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const gueltig = f.titel.trim().length > 0;

  return (
    <div className="bn-card bn-pad" style={{ marginTop: ".8rem" }}>
      <label className="bn-field">
        <span>Titel</span>
        <input className="bn-input" value={f.titel} onChange={setz("titel")} autoFocus />
      </label>
      <div className="bn-grid2">
        <label className="bn-field">
          <span>Autor</span>
          <input className="bn-input" value={f.autor} onChange={setz("autor")} />
        </label>
        <label className="bn-field">
          <span>Signatur</span>
          <input className="bn-input bn-mono" value={f.signatur} onChange={setz("signatur")} />
        </label>
      </div>
      <div className="bn-grid2">
        <label className="bn-field">
          <span>Medienart</span>
          <select className="bn-select" value={f.medienart} onChange={setz("medienart")}>
            {["Buch", "Bilderbuch", "Sachbuch", "Zeitschrift", "DVD", "CD", "Spiel"].map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </label>
        <label className="bn-field">
          <span>Bereich</span>
          <select className="bn-select" value={f.bereichId} onChange={setz("bereichId")}>
            <option value="">— nicht zugeordnet —</option>
            {bereiche.map((b) => {
              const et = etagen.find((e) => e.id === b.etageId);
              return (
                <option key={b.id} value={b.id}>
                  {et ? et.kurz + " · " : ""}
                  {b.name}
                </option>
              );
            })}
          </select>
        </label>
      </div>
      <div className="bn-grid3">
        <label className="bn-field">
          <span>Regal</span>
          <input className="bn-input bn-mono" value={f.regal} onChange={setz("regal")} />
        </label>
        <label className="bn-field">
          <span>Reihe</span>
          <input className="bn-input bn-mono" value={f.reihe} onChange={setz("reihe")} />
        </label>
        <label className="bn-field">
          <span>Fach</span>
          <input className="bn-input bn-mono" value={f.fach} onChange={setz("fach")} />
        </label>
      </div>
      <div style={{ display: "flex", gap: ".45rem", marginTop: ".3rem" }}>
        <button className="bn-btn is-primary" disabled={!gueltig} onClick={() => onSpeichern(f)}>
          <FloppyDisk size={15} weight="regular" /> Speichern
        </button>
        <button className="bn-btn" onClick={onAbbrechen}>
          Abbrechen
        </button>
      </div>
    </div>
  );
}

function BuecherTab({ daten, setDaten }) {
  const [q, setQ] = useState("");
  const [bearbeite, setBearbeite] = useState(null); // id | "neu" | null

  const liste = useMemo(() => {
    if (!q.trim()) return daten.buecher;
    return suche(daten.buecher, daten.bereiche, q);
  }, [daten, q]);

  const speichern = (f) => {
    if (bearbeite === "neu") {
      setDaten({ ...daten, buecher: [{ ...f, id: uid("m") }, ...daten.buecher] });
    } else {
      setDaten({ ...daten, buecher: daten.buecher.map((b) => (b.id === bearbeite ? { ...f, id: b.id } : b)) });
    }
    setBearbeite(null);
  };

  const loeschen = (id) => setDaten({ ...daten, buecher: daten.buecher.filter((b) => b.id !== id) });

  return (
    <div>
      <div style={{ display: "flex", gap: ".5rem", alignItems: "center", marginTop: ".9rem" }}>
        <input
          className="bn-input"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Bestand durchsuchen"
          aria-label="Bestand durchsuchen"
        />
        <button className="bn-btn is-primary" style={{ flex: "none" }} onClick={() => setBearbeite("neu")}>
          <Plus size={15} weight="regular" /> Neu
        </button>
      </div>

      {bearbeite === "neu" && (
        <BuchFormular
          start={LEER_BUCH}
          bereiche={daten.bereiche}
          etagen={daten.etagen}
          onSpeichern={speichern}
          onAbbrechen={() => setBearbeite(null)}
        />
      )}

      <p className="bn-eyebrow" style={{ marginTop: "1rem" }}>
        {liste.length} von {daten.buecher.length} Medien
      </p>

      <div className="bn-scroll" style={{ borderTop: "1px solid var(--line)", marginTop: ".4rem" }}>
        {liste.map((b) => {
          const be = daten.bereiche.find((x) => x.id === b.bereichId);
          const et = be ? daten.etagen.find((e) => e.id === be.etageId) : null;
          if (bearbeite === b.id) {
            return (
              <BuchFormular
                key={b.id}
                start={b}
                bereiche={daten.bereiche}
                etagen={daten.etagen}
                onSpeichern={speichern}
                onAbbrechen={() => setBearbeite(null)}
              />
            );
          }
          return (
            <div className="bn-row" key={b.id}>
              <div className="bn-row-main">
                <div className="bn-row-t">{b.titel}</div>
                <div className="bn-row-s">
                  <span className="bn-mono">{b.signatur}</span> · {b.autor || "ohne Autor"} ·{" "}
                  {et && be ? `${et.kurz} · ${be.name} · R${b.regal}/${b.reihe}/${b.fach}` : "kein Standort"}
                </div>
              </div>
              <button className="bn-iconbtn" onClick={() => setBearbeite(b.id)} aria-label={`${b.titel} bearbeiten`}>
                <PencilSimple size={15} weight="regular" />
              </button>
              <button className="bn-iconbtn" onClick={() => loeschen(b.id)} aria-label={`${b.titel} löschen`}>
                <Trash size={15} weight="regular" />
              </button>
            </div>
          );
        })}
        {liste.length === 0 && <div className="bn-empty">Keine Medien gefunden.</div>}
      </div>
    </div>
  );
}

/* ---------------------------- Verwaltung: Bereiche ---------------- */

function BereicheTab({ daten, setDaten }) {
  const [etageId, setEtageId] = useState(daten.etagen[0]?.id || "");
  const [aktiv, setAktiv] = useState(null);
  const [neuName, setNeuName] = useState("");

  const etage = daten.etagen.find((e) => e.id === etageId);
  const bereiche = daten.bereiche.filter((b) => b.etageId === etageId);

  const setzePosition = (pos) => {
    if (!aktiv) return;
    setDaten({ ...daten, bereiche: daten.bereiche.map((b) => (b.id === aktiv ? { ...b, ...pos } : b)) });
  };

  const anlegen = () => {
    if (!neuName.trim()) return;
    const id = uid("b");
    setDaten({ ...daten, bereiche: [...daten.bereiche, { id, name: neuName.trim(), etageId, x: 50, y: 50 }] });
    setNeuName("");
    setAktiv(id);
  };

  const loeschen = (id) => {
    setDaten({
      ...daten,
      bereiche: daten.bereiche.filter((b) => b.id !== id),
      buecher: daten.buecher.map((b) => (b.bereichId === id ? { ...b, bereichId: "" } : b)),
    });
    if (aktiv === id) setAktiv(null);
  };

  return (
    <div>
      <label className="bn-field" style={{ marginTop: ".9rem" }}>
        <span>Etage</span>
        <select className="bn-select" value={etageId} onChange={(e) => { setEtageId(e.target.value); setAktiv(null); }}>
          {daten.etagen.map((e) => (
            <option key={e.id} value={e.id}>
              {e.kurz} — {e.name}
            </option>
          ))}
        </select>
      </label>

      <div className={"bn-note" + (aktiv ? " is-signal" : "")} style={{ marginBottom: ".7rem" }}>
        <Crosshair size={15} weight="regular" style={{ flex: "none", marginTop: ".1rem" }} />
        <span>
          {aktiv
            ? `„${daten.bereiche.find((b) => b.id === aktiv)?.name}“ ist ausgewählt — in den Plan tippen, um die Position zu setzen.`
            : "Bereich auswählen, dann in den Plan tippen, um seine Position zu setzen."}
        </span>
      </div>

      <Grundriss etage={etage} bereiche={bereiche} aktivBereichId={aktiv} picking={!!aktiv} onPick={setzePosition} />

      <div style={{ display: "flex", gap: ".5rem", marginTop: ".9rem" }}>
        <input
          className="bn-input"
          value={neuName}
          onChange={(e) => setNeuName(e.target.value)}
          placeholder="Neuer Bereich, z. B. Belletristik A–H"
          aria-label="Name des neuen Bereichs"
        />
        <button className="bn-btn is-primary" style={{ flex: "none" }} onClick={anlegen} disabled={!neuName.trim()}>
          <Plus size={15} weight="regular" /> Anlegen
        </button>
      </div>

      <div style={{ borderTop: "1px solid var(--line)", marginTop: ".9rem" }}>
        {bereiche.map((b) => {
          const anzahl = daten.buecher.filter((x) => x.bereichId === b.id).length;
          return (
            <div className="bn-row" key={b.id}>
              <button
                className="bn-iconbtn"
                onClick={() => setAktiv(aktiv === b.id ? null : b.id)}
                aria-label={`${b.name} auswählen`}
                style={{ color: aktiv === b.id ? "var(--signal)" : undefined }}
              >
                {aktiv === b.id ? <Check size={15} weight="regular" /> : <MapPin size={15} weight="regular" />}
              </button>
              <div className="bn-row-main">
                <div className="bn-row-t">{b.name}</div>
                <div className="bn-row-s bn-mono">
                  x {b.x} / y {b.y} · {anzahl} {anzahl === 1 ? "Medium" : "Medien"}
                </div>
              </div>
              <button className="bn-iconbtn" onClick={() => loeschen(b.id)} aria-label={`${b.name} löschen`}>
                <Trash size={15} weight="regular" />
              </button>
            </div>
          );
        })}
        {bereiche.length === 0 && <div className="bn-empty">Für diese Etage ist noch kein Bereich angelegt.</div>}
      </div>
    </div>
  );
}

/* ---------------------------- Verwaltung: Etagen ------------------ */

function EtagenTab({ daten, setDaten }) {
  const aendern = (id, k, v) =>
    setDaten({ ...daten, etagen: daten.etagen.map((e) => (e.id === id ? { ...e, [k]: v } : e)) });

  return (
    <div style={{ marginTop: ".9rem" }}>
      <div className="bn-note" style={{ marginBottom: ".8rem" }}>
        <Stack size={15} weight="regular" style={{ flex: "none", marginTop: ".1rem" }} />
        <span>
          Sobald echte Lagepläne vorliegen: Bild-URL pro Etage eintragen. Der Plan ersetzt dann die schematische
          Darstellung, die Bereichspunkte bleiben an ihrer Position.
        </span>
      </div>

      {[...daten.etagen]
        .sort((a, b) => a.nr - b.nr)
        .map((e) => (
          <div className="bn-card bn-pad" key={e.id} style={{ marginBottom: ".6rem" }}>
            <div className="bn-grid2">
              <label className="bn-field">
                <span>Kurzform</span>
                <input className="bn-input bn-mono" value={e.kurz} onChange={(ev) => aendern(e.id, "kurz", ev.target.value)} />
              </label>
              <label className="bn-field">
                <span>Bezeichnung</span>
                <input className="bn-input" value={e.name} onChange={(ev) => aendern(e.id, "name", ev.target.value)} />
              </label>
            </div>
            <label className="bn-field">
              <span>Was es hier gibt</span>
              <input className="bn-input" value={e.zweck} onChange={(ev) => aendern(e.id, "zweck", ev.target.value)} />
            </label>
            <label className="bn-field" style={{ marginBottom: 0 }}>
              <span>Grundriss-Bild (URL)</span>
              <input
                className="bn-input"
                value={e.bildUrl}
                onChange={(ev) => aendern(e.id, "bildUrl", ev.target.value)}
                placeholder="noch keiner hinterlegt"
              />
            </label>
          </div>
        ))}
    </div>
  );
}

/* ---------------------------- Verwaltung: Daten ------------------- */

function DatenTab({ daten, setDaten, status }) {
  const [meldung, setMeldung] = useState("");
  const fileRef = useRef(null);

  const exportieren = () => {
    const blob = new Blob([JSON.stringify(daten, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bibliotheksdaten-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMeldung("Datei wurde erzeugt.");
  };

  const importieren = (e) => {
    const datei = e.target.files?.[0];
    if (!datei) return;
    const leser = new FileReader();
    leser.onload = () => {
      try {
        const neu = JSON.parse(leser.result);
        if (!neu.etagen || !neu.bereiche || !neu.buecher) throw new Error("Struktur passt nicht");
        setDaten(neu);
        setMeldung(`Übernommen: ${neu.buecher.length} Medien, ${neu.bereiche.length} Bereiche.`);
      } catch (err) {
        setMeldung("Die Datei ließ sich nicht lesen. Erwartet wird eine JSON-Datei aus diesem Export.");
      }
    };
    leser.readAsText(datei);
    e.target.value = "";
  };

  const zuruecksetzen = () => {
    setDaten(JSON.parse(JSON.stringify(SEED)));
    setMeldung("Beispieldaten wiederhergestellt.");
  };

  const ohneStandort = daten.buecher.filter((b) => !b.bereichId).length;

  return (
    <div style={{ marginTop: ".9rem" }}>
      <div className="bn-card bn-pad">
        <p className="bn-eyebrow">Bestand</p>
        <p style={{ margin: ".35rem 0 0", fontSize: ".9rem" }}>
          {daten.buecher.length} Medien · {daten.bereiche.length} Bereiche · {daten.etagen.length} Etagen
          {ohneStandort > 0 && (
            <>
              <br />
              <span style={{ color: "var(--warn)" }}>{ohneStandort} Medien ohne Standort</span>
            </>
          )}
        </p>
      </div>

      <div className="bn-card bn-pad" style={{ marginTop: ".8rem" }}>
        <label className="bn-field" style={{ marginBottom: 0 }}>
          <span>PIN für die Verwaltung (4–8 Ziffern)</span>
          <input
            className="bn-input bn-mono"
            value={daten.verwaltungPin || ""}
            onChange={(e) =>
              setDaten({ ...daten, verwaltungPin: e.target.value.replace(/\D/g, "").slice(0, 8) })
            }
            inputMode="numeric"
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: ".45rem", marginTop: ".8rem" }}>
        <button className="bn-btn" onClick={exportieren}>
          <DownloadSimple size={15} weight="regular" /> Daten sichern
        </button>
        <button className="bn-btn" onClick={() => fileRef.current?.click()}>
          <UploadSimple size={15} weight="regular" /> Daten einlesen
        </button>
        <button className="bn-btn is-danger" onClick={zuruecksetzen}>
          <ArrowCounterClockwise size={15} weight="regular" /> Auf Beispieldaten zurücksetzen
        </button>
        <input ref={fileRef} type="file" accept="application/json" onChange={importieren} style={{ display: "none" }} />
      </div>

      {meldung && (
        <div className="bn-note is-signal" style={{ marginTop: ".8rem" }}>
          <Check size={15} weight="regular" style={{ flex: "none", marginTop: ".1rem" }} />
          <span>{meldung}</span>
        </div>
      )}

      <div className="bn-note" style={{ marginTop: ".8rem" }}>
        <Warning size={15} weight="regular" style={{ flex: "none", marginTop: ".1rem" }} />
        <span>
          Dieser Stand läuft ohne eigenen Server. Die Daten liegen im Browserspeicher dieses Geräts —
          gut zum Erproben, nicht für den Echtbetrieb mit mehreren Arbeitsplätzen. Der JSON-Export ist der
          Übergabepunkt: dasselbe Format nimmt später ein Serverdienst entgegen.
          {status && <> Speicherstatus: {status}.</>}
        </span>
      </div>
    </div>
  );
}

/* ---------------------------- Zugangssperre ---------------------- */

function PinSperre({ erwartet, onEntsperrt, onZurueck }) {
  const [pin, setPin] = useState("");
  const [fehler, setFehler] = useState(false);
  const [versuche, setVersuche] = useState(0);

  const pruefen = () => {
    if (pin === erwartet) {
      onEntsperrt();
    } else {
      setFehler(true);
      setVersuche((v) => v + 1);
      setPin("");
    }
  };

  return (
    <div className="bn-gatepage">
    <div className="bn-shell">
      <div className="bn-gate">
        <div className="bn-gate-icon">
          <Lock size={17} weight="regular" />
        </div>
        <p className="bn-eyebrow" style={{ marginTop: ".8rem" }}>
          Nur für Mitarbeitende
        </p>
        <h1 className="bn-h1" style={{ marginBottom: ".9rem" }}>
          PIN eingeben
        </h1>

        <input
          className={"bn-pin" + (fehler ? " is-fehler" : "")}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
            setFehler(false);
          }}
          onKeyDown={(e) => e.key === "Enter" && pruefen()}
          inputMode="numeric"
          autoComplete="off"
          aria-label="PIN für die Verwaltung"
          autoFocus
        />
        {fehler && (
          <p className="bn-gate-fehler">
            PIN stimmt nicht. {versuche >= 3 ? "Die PIN steht an der Information." : "Bitte erneut eingeben."}
          </p>
        )}

        <div style={{ display: "flex", gap: ".45rem", marginTop: ".9rem" }}>
          <button className="bn-btn is-primary" onClick={pruefen} disabled={pin.length < 4}>
            Öffnen
          </button>
          <button className="bn-btn" onClick={onZurueck}>
            Zurück zur Suche
          </button>
        </div>

        <div className="bn-note" style={{ marginTop: "1.2rem" }}>
          <ShieldWarning size={15} weight="regular" style={{ flex: "none", marginTop: ".1rem" }} />
          <span>
            Diese PIN hält neugierige Besucher vom Bearbeiten ab. Sie ist kein Schutz gegen einen Angriff —
            im Testbetrieb liegt sie im Browser und ist auslesbar. Echter Zugriffsschutz kommt mit dem Serverdienst.
          </span>
        </div>
      </div>
    </div>
    </div>
  );
}

/* ---------------------------- Verwaltung ------------------------- */

function VerwaltungsAnsicht({ daten, setDaten, status, onAbmelden }) {
  const [tab, setTab] = useState("buecher");
  const tabs = [
    ["buecher", "Medien", BookOpen],
    ["bereiche", "Bereiche & Plan", MapPin],
    ["etagen", "Etagen", Stack],
    ["daten", "Daten", Gear],
  ];

  return (
    <div className="bn-shell">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: ".7rem" }}>
        <div>
          <p className="bn-eyebrow" style={{ marginTop: "1.4rem" }}>
            Verwaltung
          </p>
          <h1 className="bn-h1">Bestand und Standorte pflegen</h1>
        </div>
        <button className="bn-btn" style={{ flex: "none" }} onClick={onAbmelden}>
          <SignOut size={15} weight="regular" /> Sperren
        </button>
      </div>

      <div className="bn-tabs" role="tablist">
        {tabs.map(([id, label, Icon]) => (
          <button
            key={id}
            className="bn-tab"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: ".35rem" }}>
              <Icon size={14} weight="regular" /> {label}
            </span>
          </button>
        ))}
      </div>

      {tab === "buecher" && <BuecherTab daten={daten} setDaten={setDaten} />}
      {tab === "bereiche" && <BereicheTab daten={daten} setDaten={setDaten} />}
      {tab === "etagen" && <EtagenTab daten={daten} setDaten={setDaten} />}
      {tab === "daten" && <DatenTab daten={daten} setDaten={setDaten} status={status} />}
    </div>
  );
}

/* ---------------------------- Signet ------------------------------ */

function Signet() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <polygon points="2,20 9,20 9,10 2,16" fill="currentColor" opacity=".5" />
      <polygon points="9,20 15,20 15,6 9,10" fill="currentColor" opacity=".8" />
      <polygon points="15,20 22,20 22,12 15,6" fill="currentColor" />
    </svg>
  );
}

/* ---------------------------- App -------------------------------- */

export default function BibliotheksNavigator() {
  const [daten, setDatenRoh] = useState(null);
  const [modus, setModus] = useState("besucher");
  const [entsperrt, setEntsperrt] = useState(false);
  const [status, setStatus] = useState("");
  const geladen = useRef(false);

  useEffect(() => {
    let abgebrochen = false;
    (async () => {
      let start = null;
      try {
        const roh = await lesen(STORAGE_KEY);
        if (roh) start = JSON.parse(roh);
      } catch {
        start = null;
      }
      if (abgebrochen) return;
      setDatenRoh(start || JSON.parse(JSON.stringify(SEED)));
      geladen.current = true;
    })();
    return () => {
      abgebrochen = true;
    };
  }, []);

  const setDaten = useCallback((neu) => {
    setDatenRoh(neu);
    (async () => {
      try {
        await schreiben(STORAGE_KEY, JSON.stringify(neu));
        setStatus("gespeichert");
      } catch {
        setStatus("nicht gespeichert");
      }
    })();
  }, []);

  return (
    <div className="bn">
      <style>{CSS}</style>

      <header className="bn-head">
        <div className="bn-head-in">
          <div className="bn-wordmark">
            <Signet />
            <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
              <b>{daten?.einrichtung || "Stadtbibliothek"}</b>
              <span>Wegweiser</span>
            </span>
          </div>
          <div className="bn-toggle" role="group" aria-label="Ansicht wechseln">
            <button aria-pressed={modus === "besucher"} onClick={() => setModus("besucher")}>
              <MagnifyingGlass size={13} weight="regular" /> Besuch
            </button>
            <button aria-pressed={modus === "verwaltung"} onClick={() => setModus("verwaltung")}>
              <Gear size={13} weight="regular" /> Verwaltung
            </button>
          </div>
        </div>
      </header>

      {!daten ? (
        <div className="bn-shell">
          <div className="bn-empty">Daten werden geladen …</div>
        </div>
      ) : modus === "besucher" ? (
        <BesucherAnsicht daten={daten} />
      ) : entsperrt ? (
        <VerwaltungsAnsicht
          daten={daten}
          setDaten={setDaten}
          status={status}
          onAbmelden={() => {
            setEntsperrt(false);
            setModus("besucher");
          }}
        />
      ) : (
        <PinSperre
          erwartet={daten.verwaltungPin || "2580"}
          onEntsperrt={() => setEntsperrt(true)}
          onZurueck={() => setModus("besucher")}
        />
      )}
    </div>
  );
}
