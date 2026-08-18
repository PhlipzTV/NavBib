/*
  Grundriss-Erfassung — Regale, Treppen, Aufzüge, Theken und Zonen auf den
  echten Grundrissen einzeichnen. Ergebnis ist ein JSON-Baum, der später den
  Signaturbereich je Regal traegt (siehe README).

  Bewusst ohne Framework: die Seite ist ein eigenstaendiges Werkzeug und soll
  auch dann noch laufen, wenn die React-App darunter umgebaut wird.
*/
import "./erfassung.css";
import planEG from "./assets/grundrisse/eg.png";
import plan1OG from "./assets/grundrisse/1og.png";
import plan2OG from "./assets/grundrisse/2og.png";

const PLANS = {
  eg:    { kurz: "EG",    name: "Erdgeschoss",     src: planEG,  w: 1067, h: 236 },
  "1og": { kurz: "1. OG", name: "1. Obergeschoss", src: plan1OG, w: 1068, h: 235 },
  "2og": { kurz: "2. OG", name: "2. Obergeschoss", src: plan2OG, w: 1068, h: 236 },
};
const FLOOR_IDS = ["eg", "1og", "2og"];

const TYPES = {
  regal:  { label: "Regal",  form: "linie",   color: "var(--t-regal)"  },
  treppe: { label: "Treppe", form: "polygon", color: "var(--t-treppe)" },
  aufzug: { label: "Aufzug", form: "polygon", color: "var(--t-aufzug)" },
  theke:  { label: "Theke",  form: "linie",   color: "var(--t-theke)"  },
  zone:   { label: "Zone",   form: "polygon", color: "var(--t-zone)"   },
};
const STORE_KEY = "bibnav:erfassung:v1";

const unitH = (f) => 100 * PLANS[f].h / PLANS[f].w;

/* ---------------- state ---------------- */
let state = {
  floor: "eg",
  tool: "select",
  data: {},          // floorId -> { objekte: [], kalibrierung: null }
  selectedId: null,
  view: {},          // floorId -> {x,y,k}
  draft: null,       // in-progress geometry
  calibrating: false,
};
FLOOR_IDS.forEach((f) => {
  state.data[f] = { objekte: [], kalibrierung: null };
  state.view[f] = { x: 0, y: 0, k: 1 };
});

let history = [];
const snapshot = () => {
  history.push(JSON.stringify(state.data));
  if (history.length > 60) history.shift();
  syncUndo();
};
const undo = () => {
  if (!history.length) return;
  state.data = JSON.parse(history.pop());
  state.selectedId = null;
  syncUndo(); render(); renderSide(); save();
};
const syncUndo = () => { document.getElementById("undoBtn").disabled = history.length === 0; };

const save = () => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(state.data)); } catch {}
};
const load = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    FLOOR_IDS.forEach((f) => { if (parsed[f]) state.data[f] = parsed[f]; });
  } catch {}
};

const uid = () => "o" + Math.random().toString(36).slice(2, 9);
const cur = () => state.data[state.floor];
const selected = () => cur().objekte.find((o) => o.id === state.selectedId) || null;

/* ---------------- geometry helpers ---------------- */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const lineLen = (pts) => { let s = 0; for (let i = 1; i < pts.length; i++) s += dist(pts[i-1], pts[i]); return s; };
function polyCentroid(pts) {
  let x = 0, y = 0;
  pts.forEach((p) => { x += p[0]; y += p[1]; });
  return [x / pts.length, y / pts.length];
}
function objCentroid(o) {
  return o.form === "linie" ? polyCentroid(o.punkte) : polyCentroid(o.punkte);
}
/** metres per canvas unit for the active floor, or null */
function metersPerUnit() {
  const k = cur().kalibrierung;
  if (!k || !k.einheiten || !k.meter) return null;
  return k.meter / k.einheiten;
}
function fmtLen(units) {
  const mpu = metersPerUnit();
  if (mpu == null) return units.toFixed(1) + " E";
  return (units * mpu).toFixed(2) + " m";
}

/* ---------------- svg scaffolding ---------------- */
const svg = document.getElementById("svg");
const NS = "http://www.w3.org/2000/svg";
const el = (n, attrs = {}) => {
  const e = document.createElementNS(NS, n);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
};

let gRoot, gImg, gObj, gDraft;
function buildSvg() {
  svg.textContent = "";
  gRoot = el("g");
  gImg = el("g"); gObj = el("g"); gDraft = el("g");
  gRoot.append(gImg, gObj, gDraft);
  svg.append(gRoot);
}
buildSvg();

/** convert a pointer event to canvas-space coords */
function toCanvas(evt) {
  const r = svg.getBoundingClientRect();
  const v = state.view[state.floor];
  const sx = evt.clientX - r.left, sy = evt.clientY - r.top;
  return [(sx - v.x) / v.k, (sy - v.y) / v.k];
}

function fitView() {
  const r = svg.getBoundingClientRect();
  const uh = unitH(state.floor);
  const pad = 24;
  const k = Math.min((r.width - pad * 2) / 100, (r.height - pad * 2) / uh);
  state.view[state.floor] = {
    k,
    x: (r.width - 100 * k) / 2,
    y: (r.height - uh * k) / 2,
  };
}

/* ---------------- rendering ---------------- */
function render() {
  const f = state.floor;
  const v = state.view[f];
  const uh = unitH(f);
  gRoot.setAttribute("transform", `translate(${v.x} ${v.y}) scale(${v.k})`);

  gImg.textContent = "";
  const img = el("image", { x: 0, y: 0, width: 100, height: uh, href: PLANS[f].src });
  img.setAttribute("preserveAspectRatio", "none");
  gImg.append(img);

  gObj.textContent = "";
  const strokeW = 0.9 / v.k;
  cur().objekte.forEach((o) => {
    const t = TYPES[o.typ];
    const isSel = o.id === state.selectedId;
    const g = el("g");
    g.style.cursor = "pointer";

    if (o.form === "linie") {
      const d = o.punkte.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ");
      const hit = el("path", { d, fill: "none", stroke: "transparent", "stroke-width": Math.max(2.5, 8 / v.k), "stroke-linecap": "round" });
      const vis = el("path", {
        d, fill: "none", stroke: t.color,
        "stroke-width": isSel ? strokeW * 2.6 : strokeW * 1.8,
        "stroke-linecap": "round", opacity: isSel ? 1 : .85,
      });
      g.append(hit, vis);
    } else {
      const d = o.punkte.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ") + " Z";
      const vis = el("path", {
        d, fill: t.color, "fill-opacity": isSel ? .34 : .2,
        stroke: t.color, "stroke-width": isSel ? strokeW * 2 : strokeW,
      });
      g.append(vis);
    }

    if (isSel) {
      o.punkte.forEach((p, i) => {
        const h = el("circle", {
          cx: p[0], cy: p[1], r: Math.max(0.7, 5 / v.k),
          fill: "var(--panel)", stroke: t.color, "stroke-width": strokeW * 1.4,
        });
        h.dataset.handle = String(i);
        h.style.cursor = "move";
        g.append(h);
      });
    }

    g.addEventListener("pointerdown", (e) => {
      if (state.tool !== "select") return;
      e.stopPropagation();
      const hi = e.target.dataset && e.target.dataset.handle;
      state.selectedId = o.id;
      beginDrag(e, o, hi != null ? Number(hi) : null);
      render(); renderSide();
    });
    gObj.append(g);
  });

  // draft preview
  gDraft.textContent = "";
  if (state.draft && state.draft.punkte.length) {
    const pts = state.draft.punkte.concat(state.draft.hover ? [state.draft.hover] : []);
    const col = state.calibrating ? "var(--ink)" : TYPES[state.draft.typ].color;
    if (pts.length > 1) {
      const closing = !state.calibrating && TYPES[state.draft.typ].form === "polygon" && pts.length > 2;
      const d = pts.map((p, i) => (i ? "L" : "M") + p[0] + " " + p[1]).join(" ") + (closing ? " Z" : "");
      gDraft.append(el("path", {
        d, fill: closing ? col : "none", "fill-opacity": .16,
        stroke: col, "stroke-width": strokeW * 1.8, "stroke-dasharray": `${strokeW*3} ${strokeW*2}`,
      }));
    }
    state.draft.punkte.forEach((p) => gDraft.append(el("circle", {
      cx: p[0], cy: p[1], r: Math.max(0.6, 4 / v.k), fill: col,
    })));
  }

  svg.className.baseVal = state.tool === "select" ? "" : (state.tool === "pan" ? "pan" : "draw");
  updateScaleBadge();
}

function updateScaleBadge() {
  const mpu = metersPerUnit();
  const badge = document.getElementById("scaleBadge");
  badge.textContent = mpu == null
    ? "Maßstab nicht gesetzt"
    : `1 Einheit = ${mpu.toFixed(3)} m · Gebäude ≈ ${(100 * mpu).toFixed(1)} m`;
}

/* ---------------- dragging ---------------- */
let drag = null;
function beginDrag(e, obj, handleIndex) {
  const p = toCanvas(e);
  drag = { obj, handleIndex, last: p, moved: false };
  svg.setPointerCapture(e.pointerId);
}

/* ---------------- pointer interaction ---------------- */
const pointers = new Map();
let pinch = null;

svg.addEventListener("pointerdown", (e) => {
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const v = state.view[state.floor];
    pinch = { d: Math.hypot(a[0]-b[0], a[1]-b[1]), c: [(a[0]+b[0])/2, (a[1]+b[1])/2], k: v.k, x: v.x, y: v.y };
    drag = null; return;
  }
  if (pinch) return;

  if (state.tool === "pan") {
    drag = { pan: true, last: [e.clientX, e.clientY] };
    svg.setPointerCapture(e.pointerId);
    return;
  }
  if (state.tool === "select") {
    state.selectedId = null; render(); renderSide();
    return;
  }
  // drawing tools
  const p = toCanvas(e);
  const typ = state.calibrating ? "regal" : state.tool;
  if (!state.draft) state.draft = { typ, punkte: [], hover: null };
  state.draft.punkte.push(p);

  const form = state.calibrating ? "linie" : TYPES[typ].form;
  if (form === "linie" && state.draft.punkte.length === 2) finishDraft();
  render(); renderSide();
});

svg.addEventListener("pointermove", (e) => {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, [e.clientX, e.clientY]);

  if (pinch && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a[0]-b[0], a[1]-b[1]);
    const c = [(a[0]+b[0])/2, (a[1]+b[1])/2];
    const r = svg.getBoundingClientRect();
    const ratio = d / (pinch.d || 1);
    const nk = Math.max(0.2, Math.min(80, pinch.k * ratio));
    const cx = pinch.c[0] - r.left, cy = pinch.c[1] - r.top;
    const wx = (cx - pinch.x) / pinch.k, wy = (cy - pinch.y) / pinch.k;
    state.view[state.floor] = {
      k: nk,
      x: (c[0] - r.left) - wx * nk,
      y: (c[1] - r.top) - wy * nk,
    };
    render(); return;
  }

  if (drag && drag.pan) {
    const v = state.view[state.floor];
    v.x += e.clientX - drag.last[0];
    v.y += e.clientY - drag.last[1];
    drag.last = [e.clientX, e.clientY];
    render(); return;
  }

  if (drag && drag.obj) {
    const p = toCanvas(e);
    const dx = p[0] - drag.last[0], dy = p[1] - drag.last[1];
    if (!drag.moved) { snapshot(); drag.moved = true; }
    if (drag.handleIndex != null) {
      drag.obj.punkte[drag.handleIndex] = p;
    } else {
      drag.obj.punkte = drag.obj.punkte.map((q) => [q[0] + dx, q[1] + dy]);
    }
    drag.last = p;
    render(); renderSide();
    return;
  }

  if (state.draft) {
    state.draft.hover = toCanvas(e);
    render();
  }
});

function endPointer(e) {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinch = null;
  if (drag) { if (drag.moved) save(); drag = null; }
}
svg.addEventListener("pointerup", endPointer);
svg.addEventListener("pointercancel", endPointer);
svg.addEventListener("pointerleave", (e) => { if (drag && drag.pan) endPointer(e); });

svg.addEventListener("wheel", (e) => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  const v = state.view[state.floor];
  const cx = e.clientX - r.left, cy = e.clientY - r.top;
  const wx = (cx - v.x) / v.k, wy = (cy - v.y) / v.k;
  const nk = Math.max(0.2, Math.min(80, v.k * (e.deltaY < 0 ? 1.15 : 1 / 1.15)));
  state.view[state.floor] = { k: nk, x: cx - wx * nk, y: cy - wy * nk };
  render();
}, { passive: false });

svg.addEventListener("dblclick", () => { if (state.draft) finishDraft(); });

/* ---------------- draft completion ---------------- */
function finishDraft() {
  const d = state.draft;
  if (!d) return;
  const form = state.calibrating ? "linie" : TYPES[d.typ].form;
  const min = form === "linie" ? 2 : 3;
  if (d.punkte.length < min) { state.draft = null; render(); renderSide(); return; }

  if (state.calibrating) {
    const units = lineLen(d.punkte);
    state.draft = null;
    const answer = prompt(
      `Wie lang ist diese Strecke in echt?\nAngabe in Metern, z. B. 45.0`,
      cur().kalibrierung ? String(cur().kalibrierung.meter) : ""
    );
    const meter = parseFloat((answer || "").replace(",", "."));
    if (isFinite(meter) && meter > 0) {
      snapshot();
      cur().kalibrierung = { einheiten: units, meter };
      save();
    }
    state.calibrating = false;
    setTool("select");
    render(); renderSide();
    return;
  }

  snapshot();
  const count = cur().objekte.filter((o) => o.typ === d.typ).length + 1;
  const obj = {
    id: uid(), typ: d.typ, form,
    punkte: d.punkte.map((p) => [round(p[0]), round(p[1])]),
    name: TYPES[d.typ].label + " " + count,
  };
  if (d.typ === "regal") { obj.signaturVon = ""; obj.signaturBis = ""; obj.faecher = 5; }
  cur().objekte.push(obj);
  state.selectedId = obj.id;
  state.draft = null;
  save(); render(); renderSide();
}
const round = (n) => Math.round(n * 100) / 100;

/* ---------------- toolbar ---------------- */
function setTool(t) {
  state.tool = t;
  if (t !== "select") state.selectedId = null;
  state.draft = null;
  [...document.querySelectorAll("#toolGroup button")].forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.tool === t)));
  render(); renderSide(); renderHint();
}

function buildToolbar() {
  const fg = document.getElementById("floorGroup");
  fg.textContent = "";
  FLOOR_IDS.forEach((f) => {
    const b = document.createElement("button");
    b.textContent = PLANS[f].kurz;
    b.setAttribute("aria-pressed", String(f === state.floor));
    b.addEventListener("click", () => {
      state.floor = f; state.selectedId = null; state.draft = null;
      [...fg.children].forEach((c, i) => c.setAttribute("aria-pressed", String(FLOOR_IDS[i] === f)));
      if (!state.view[f].k || state.view[f].k === 1) fitView();
      render(); renderSide();
    });
    fg.append(b);
  });

  const tg = document.getElementById("toolGroup");
  tg.textContent = "";
  const tools = [
    ["select", "Auswahl", null],
    ["pan", "Verschieben", null],
    ["regal", "Regal", "var(--t-regal)"],
    ["treppe", "Treppe", "var(--t-treppe)"],
    ["aufzug", "Aufzug", "var(--t-aufzug)"],
    ["theke", "Theke", "var(--t-theke)"],
    ["zone", "Zone", "var(--t-zone)"],
  ];
  tools.forEach(([t, label, col]) => {
    const b = document.createElement("button");
    b.dataset.tool = t;
    if (col) {
      const d = document.createElement("span");
      d.className = "dot"; d.style.background = col;
      b.append(d);
    }
    b.append(document.createTextNode(label));
    b.setAttribute("aria-pressed", String(t === state.tool));
    b.addEventListener("click", () => { state.calibrating = false; setTool(t); });
    tg.append(b);
  });
}

function renderHint() {
  const h = document.getElementById("hint");
  if (state.calibrating) {
    h.textContent = "Maßstab: eine Strecke ziehen, deren echte Länge du kennst (z. B. die lange Außenwand). Danach die Länge in Metern eingeben.";
    return;
  }
  const nothingYet = FLOOR_IDS.every((f) => !state.data[f].objekte.length) && !cur().kalibrierung;
  if (state.tool === "select" && nothingYet) {
    h.textContent = "Zuerst „Maßstab“ antippen und eine Strecke mit bekannter Länge einmessen — danach stimmen alle Regallängen in Metern. Dann mit „Regal“ loslegen.";
    return;
  }
  const map = {
    select: "Objekt antippen zum Auswählen. Ziehen verschiebt es, die Punkte an den Enden ziehen ändert die Form.",
    pan: "Ziehen verschiebt den Plan. Zwei Finger oder Mausrad zoomen — das geht in jedem Werkzeug.",
    regal: "Regal: Anfang antippen, Ende antippen. Fertig.",
    theke: "Theke: Anfang antippen, Ende antippen.",
    treppe: "Treppe: Ecken nacheinander antippen, Doppeltipp schließt die Fläche.",
    aufzug: "Aufzug: Ecken nacheinander antippen, Doppeltipp schließt die Fläche.",
    zone: "Zone: Ecken der Fläche antippen (z. B. Kinderbibliothek), Doppeltipp schließt sie.",
  };
  h.textContent = map[state.tool] || "";
}

/* ---------------- sidebar ---------------- */
function renderSide() {
  const list = document.getElementById("objList");
  list.textContent = "";
  const objs = cur().objekte;
  if (!objs.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Noch nichts erfasst. Werkzeug oben wählen und im Plan zeichnen.";
    list.append(p);
  } else {
    objs.forEach((o) => {
      const b = document.createElement("button");
      b.className = "objrow";
      b.setAttribute("aria-selected", String(o.id === state.selectedId));
      const dot = document.createElement("span");
      dot.className = "dot"; dot.style.background = TYPES[o.typ].color;
      const nm = document.createElement("span");
      nm.className = "nm"; nm.textContent = o.name;
      const meta = document.createElement("span");
      meta.className = "meta";
      meta.textContent = o.form === "linie" ? fmtLen(lineLen(o.punkte)) : TYPES[o.typ].label;
      b.append(dot, nm, meta);
      b.addEventListener("click", () => {
        state.selectedId = o.id; setTool("select"); render(); renderSide();
      });
      list.append(b);
    });
  }
  renderProps();
}

function renderProps() {
  const box = document.getElementById("props");
  box.textContent = "";
  const o = selected();
  if (!o) {
    const p = document.createElement("p");
    p.className = "empty"; p.style.padding = ".3rem 0";
    p.textContent = "Nichts ausgewählt.";
    box.append(p);
    return;
  }

  box.append(field("Bezeichnung", o.name, (v) => { o.name = v; save(); renderSide(); }));

  const typeSel = document.createElement("label");
  typeSel.className = "f";
  const ts = document.createElement("span"); ts.textContent = "Art";
  const sel = document.createElement("select");
  sel.className = "inp";
  Object.entries(TYPES).forEach(([k, t]) => {
    if (t.form !== o.form) return;
    const op = document.createElement("option");
    op.value = k; op.textContent = t.label; op.selected = k === o.typ;
    sel.append(op);
  });
  sel.addEventListener("change", () => { snapshot(); o.typ = sel.value; save(); render(); renderSide(); });
  typeSel.append(ts, sel);
  box.append(typeSel);

  if (o.typ === "regal") {
    const wrap = document.createElement("div");
    wrap.className = "row2";
    wrap.append(
      field("Signatur von", o.signaturVon || "", (v) => { o.signaturVon = v; save(); }, true),
      field("Signatur bis", o.signaturBis || "", (v) => { o.signaturBis = v; save(); }, true),
    );
    box.append(wrap);
    box.append(field("Fächer", String(o.faecher ?? ""), (v) => {
      const n = parseInt(v, 10); o.faecher = isFinite(n) ? n : null; save();
    }, true));
  }

  const info = document.createElement("p");
  info.className = "mono";
  info.style.cssText = "font-size:.66rem;color:var(--faint);margin:.1rem 0 .5rem";
  const c = objCentroid(o);
  info.textContent = o.form === "linie"
    ? `Länge ${fmtLen(lineLen(o.punkte))} · Mitte ${c[0].toFixed(1)} / ${c[1].toFixed(1)}`
    : `${o.punkte.length} Ecken · Mitte ${c[0].toFixed(1)} / ${c[1].toFixed(1)}`;
  box.append(info);

  const acts = document.createElement("div");
  acts.className = "act";
  if (o.form === "linie") {
    const arr = document.createElement("button");
    arr.className = "btn"; arr.textContent = "Reihe…";
    arr.addEventListener("click", () => makeRow(o));
    acts.append(arr);
  }
  const dup = document.createElement("button");
  dup.className = "btn"; dup.textContent = "Kopie";
  dup.addEventListener("click", () => {
    snapshot();
    const copy = JSON.parse(JSON.stringify(o));
    copy.id = uid();
    copy.name = o.name + " (Kopie)";
    copy.punkte = copy.punkte.map((p) => [p[0], p[1] + 2]);
    cur().objekte.push(copy);
    state.selectedId = copy.id;
    save(); render(); renderSide();
  });
  const del = document.createElement("button");
  del.className = "btn danger"; del.textContent = "Löschen";
  del.addEventListener("click", () => {
    snapshot();
    cur().objekte = cur().objekte.filter((x) => x.id !== o.id);
    state.selectedId = null;
    save(); render(); renderSide();
  });
  acts.append(dup, del);
  box.append(acts);
}

function field(label, value, onInput, mono) {
  const l = document.createElement("label");
  l.className = "f";
  const s = document.createElement("span"); s.textContent = label;
  const i = document.createElement("input");
  i.className = "inp" + (mono ? " mono" : "");
  i.value = value;
  i.addEventListener("input", () => onInput(i.value));
  l.append(s, i);
  return l;
}

/** duplicate a shelf line N times, offset perpendicular to itself */
function makeRow(o) {
  const nRaw = prompt("Wie viele Regale insgesamt in dieser Reihe?", "6");
  const n = parseInt(nRaw, 10);
  if (!isFinite(n) || n < 2) return;
  const mpu = metersPerUnit();
  const defGap = mpu ? (1.2 / mpu) : 3;
  const gRaw = prompt(
    mpu ? "Abstand zwischen den Regalen in Metern?" : "Abstand in Einheiten? (Maßstab ist nicht gesetzt)",
    mpu ? "1.2" : defGap.toFixed(1)
  );
  const gVal = parseFloat((gRaw || "").replace(",", "."));
  if (!isFinite(gVal) || gVal === 0) return;
  const gap = mpu ? gVal / mpu : gVal;

  const a = o.punkte[0], b = o.punkte[o.punkte.length - 1];
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;   // perpendicular unit vector

  snapshot();
  for (let i = 1; i < n; i++) {
    const copy = JSON.parse(JSON.stringify(o));
    copy.id = uid();
    copy.name = `${TYPES[o.typ].label} ${cur().objekte.filter((x) => x.typ === o.typ).length + 1}`;
    copy.punkte = o.punkte.map((p) => [round(p[0] + nx * gap * i), round(p[1] + ny * gap * i)]);
    copy.signaturVon = ""; copy.signaturBis = "";
    cur().objekte.push(copy);
  }
  save(); render(); renderSide();
}

/* ---------------- export / import ---------------- */
function buildExport() {
  const out = {
    format: "navbib-erfassung",
    version: 1,
    erstellt: new Date().toISOString().slice(0, 10),
    etagen: FLOOR_IDS.map((f) => {
      const d = state.data[f];
      const uh = unitH(f);
      const mpu = d.kalibrierung && d.kalibrierung.einheiten
        ? d.kalibrierung.meter / d.kalibrierung.einheiten : null;
      return {
        id: f,
        kurz: PLANS[f].kurz,
        name: PLANS[f].name,
        planBreite: PLANS[f].w,
        planHoehe: PLANS[f].h,
        einheitenHoehe: round(uh),
        meterProEinheit: mpu ? Math.round(mpu * 1e5) / 1e5 : null,
        objekte: d.objekte.map((o) => {
          const c = objCentroid(o);
          const rec = {
            id: o.id, typ: o.typ, form: o.form, name: o.name,
            punkte: o.punkte,
            mitteProzent: [round(c[0]), round(c[1] / uh * 100)],
          };
          if (o.form === "linie") {
            const L = lineLen(o.punkte);
            rec.laengeEinheiten = round(L);
            if (mpu) rec.laengeMeter = Math.round(L * mpu * 100) / 100;
          }
          if (o.typ === "regal") {
            rec.signaturVon = o.signaturVon || null;
            rec.signaturBis = o.signaturBis || null;
            rec.faecher = o.faecher ?? null;
          }
          return rec;
        }),
      };
    }),
  };
  return out;
}

document.getElementById("exportBtn").addEventListener("click", async () => {
  const json = JSON.stringify(buildExport(), null, 2);
  const filename = `erfassung-${new Date().toISOString().slice(0, 10)}.json`;

  // In der Artefakt-Vorschau laeuft der Download ueber die Host-Bruecke,
  // im normalen Browser ueber einen Blob. Klappt beides nicht: zum Kopieren anzeigen.
  const downloads = await window.claude?.use?.("downloads");
  if (downloads) {
    try {
      await downloads.save({ filename, data: json });
      return;
    } catch (err) {
      if (err && err.code === "declined") return;
    }
  } else {
    try {
      const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      return;
    } catch {}
  }
  showJsonFallback(json);
});

function showJsonFallback(json) {
  const back = document.createElement("div");
  back.style.cssText = "position:fixed;inset:0;background:rgba(20,16,12,.6);z-index:50;display:flex;align-items:center;justify-content:center;padding:1.2rem";
  const card = document.createElement("div");
  card.style.cssText = "background:var(--panel);border:1px solid var(--line);max-width:44rem;width:100%;padding:1rem;display:flex;flex-direction:column;gap:.6rem;max-height:80dvh";
  const h = document.createElement("h2");
  h.style.cssText = "margin:0;font-size:.95rem";
  h.textContent = "Daten zum Kopieren";
  const ta = document.createElement("textarea");
  ta.className = "inp mono";
  ta.style.cssText = "flex:1;min-height:16rem;font-size:.7rem;resize:vertical";
  ta.value = json;
  const acts = document.createElement("div");
  acts.style.cssText = "display:flex;gap:.4rem;justify-content:flex-end";
  const copy = document.createElement("button");
  copy.className = "btn primary"; copy.textContent = "Kopieren";
  copy.addEventListener("click", async () => {
    ta.select();
    try { await navigator.clipboard.writeText(json); copy.textContent = "Kopiert"; }
    catch { document.execCommand("copy"); copy.textContent = "Kopiert"; }
  });
  const close = document.createElement("button");
  close.className = "btn"; close.textContent = "Schließen";
  close.addEventListener("click", () => back.remove());
  acts.append(copy, close);
  card.append(h, ta, acts);
  back.append(card);
  document.body.append(back);
  ta.focus();
}

document.getElementById("importBtn").addEventListener("click", () => document.getElementById("fileInput").click());
document.getElementById("fileInput").addEventListener("change", (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  const fr = new FileReader();
  fr.onload = () => {
    try {
      const parsed = JSON.parse(fr.result);
      if (!parsed.etagen) throw new Error("kein Erfassungs-JSON");
      snapshot();
      parsed.etagen.forEach((et) => {
        if (!state.data[et.id]) return;
        state.data[et.id].objekte = (et.objekte || []).map((o) => ({
          id: o.id || uid(), typ: o.typ, form: o.form, name: o.name,
          punkte: o.punkte,
          signaturVon: o.signaturVon || "", signaturBis: o.signaturBis || "",
          faecher: o.faecher ?? null,
        }));
        state.data[et.id].kalibrierung = et.meterProEinheit
          ? { einheiten: 1, meter: et.meterProEinheit } : null;
      });
      save(); render(); renderSide();
    } catch (err) {
      alert("Die Datei ließ sich nicht lesen. Erwartet wird ein Export aus diesem Werkzeug.");
    }
  };
  fr.readAsText(file);
  e.target.value = "";
});

document.getElementById("calibBtn").addEventListener("click", () => {
  state.calibrating = true;
  state.tool = "calib";
  state.draft = null;
  [...document.querySelectorAll("#toolGroup button")].forEach((b) => b.setAttribute("aria-pressed", "false"));
  render(); renderHint();
});

document.getElementById("undoBtn").addEventListener("click", undo);

window.addEventListener("keydown", (e) => {
  if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); }
  else if (e.key === "Escape") { state.draft = null; state.calibrating = false; setTool("select"); }
  else if (e.key === "Enter" && state.draft) finishDraft();
  else if ((e.key === "Delete" || e.key === "Backspace") && selected()) {
    snapshot();
    cur().objekte = cur().objekte.filter((x) => x.id !== state.selectedId);
    state.selectedId = null; save(); render(); renderSide();
  }
});

window.addEventListener("resize", () => render());

/* ---------------- boot ---------------- */
load();
buildToolbar();
requestAnimationFrame(() => {
  FLOOR_IDS.forEach((f) => { const keep = state.floor; state.floor = f; fitView(); state.floor = keep; });
  render(); renderSide(); renderHint(); syncUndo();
});
