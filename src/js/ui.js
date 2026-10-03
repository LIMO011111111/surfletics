/* Shared UI building blocks (return HTML strings). */
import { SPOTS } from "./data.js";
import { DAYS, dayName } from "./dates.js";
import { st } from "./state.js";
import { cls, clsLabel, boardLabel, boardInches } from "./model.js";
import { icon } from "./icons.js";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
export const sr = (t) => `<span class="sr">${t}</span>`;

/** Round fit score badge. size: sm | md | lg */
export const fitBadge = (v, size = "md", extra = "") =>
  `<span class="fit fit-${size} f-${cls(v)} ${extra}" role="img" aria-label="Fit ${v} of 100, ${clsLabel(v).toLowerCase()}"><b>${v}</b><small aria-hidden="true">fit</small></span>`;

/** Inline pill with score + label text (never colour alone). */
export const fitPill = (v) => `<span class="fpill f-${cls(v)}"><b>${v}</b>${clsLabel(v)}</span>`;

/** Animated ring for hero cards. */
export function fitRing(v, size = 68, onDark = true) {
  const r = 28, c = 2 * Math.PI * r, off = c * (1 - v / 100);
  return `<span class="ring ring-${cls(v)} ${onDark ? "on-dark" : ""}" style="--sz:${size}px" role="img" aria-label="Fit ${v} of 100, ${clsLabel(v).toLowerCase()}">
    <svg viewBox="0 0 64 64" aria-hidden="true"><circle class="trk" cx="32" cy="32" r="${r}"/><circle class="val" cx="32" cy="32" r="${r}" stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" style="--c:${c.toFixed(1)}"/></svg>
    <b aria-hidden="true">${v}</b><small aria-hidden="true">fit</small></span>`;
}

export const backBtn = (action, label = "Back", extra = "") =>
  `<button type="button" class="iconbtn ${extra}" data-a="${action}" aria-label="${label}">${icon("back", 22)}</button>`;

export const infoBtn = (key, label) =>
  `<button type="button" class="ibtn" data-a="info" data-v="${key}" aria-label="${label}">${icon("info", 18)}</button>`;

/** Native select styled as a pill (keeps the OS picker on phones). */
export function boardSelect(id, compact = false) {
  if (!st.boards.length) return `<button type="button" class="pillbtn" data-a="boards">${icon("plus", 16)}Add a board</button>`;
  return `<span class="selpill ${compact ? "compact" : ""}">${icon("board", 16)}<select id="${id}" data-bind="board" aria-label="Board you ride">${st.boards
    .map((b, i) => `<option value="${i}" ${i == st.board ? "selected" : ""}>${esc(boardLabel(b))}</option>`)
    .join("")}</select>${icon("down", 16, "caret")}</span>`;
}

/** Day chips (today … +n). */
export function dayChips(sel, action = "day", n = 7) {
  return `<div class="hscroll chips" role="group" aria-label="Day">${DAYS.slice(0, n)
    .map((d, i) => `<button type="button" class="chip daychip ${i === sel ? "on" : ""}" aria-pressed="${i === sel}" data-a="${action}" data-v="${i}"><b>${dayName(i)}</b><small>${d.dm}</small></button>`)
    .join("")}</div>`;
}

/** Segmented control. items: [[value,label,badge?]] */
export function seg(items, value, action, label) {
  return `<div class="seg" role="tablist" aria-label="${label}">${items
    .map(([v, l, b]) => `<button type="button" role="tab" aria-selected="${v === value}" class="${v === value ? "on" : ""}" data-a="${action}" data-v="${v}">${l}${b ? `<span class="segbadge">${b}</span>` : ""}</button>`)
    .join("")}</div>`;
}

/** Top-down drawing of a board, true to length (same scale for every board). */
export function boardIcon(b, h = 64) {
  const inch = Math.max(54, Math.min(122, boardInches(b.len)));
  const P = {
    Longboard: { hw: 23, tn: 0.2, pn: 0.42, ts: 0.72, tw: 0.66 },
    "Mid-length": { hw: 21, tn: 0.32, pn: 0.5, ts: 0.58, tw: 0.28 },
    Shortboard: { hw: 19, tn: 0.45, pn: 0.7, ts: 0.52, tw: 0.5 },
    "Soft-top": { hw: 23, tn: 0.2, pn: 0.45, ts: 0.72, tw: 0.7 },
  }[b.type] || { hw: 21, tn: 0.3, pn: 0.58, ts: 0.55, tw: 0.22 };
  const Wd = parseFloat(String(b.w).replace(/[^0-9.]/g, "")) || P.hw;
  const k = (h - 2) / 122;
  const L = Math.round(inch * k), hw = (Wd * k) / 2 * 1.7;
  const W = Math.ceil(hw * 2 + 2), c = W / 2, N = 36;
  const f = (t) => { let v = t < P.tn ? Math.pow(t / P.tn, P.pn) : 1; if (t > P.ts) { const q = (t - P.ts) / (1 - P.ts); v *= 1 - (1 - P.tw) * Math.pow(q, 1.6); } return v * hw; };
  const R = [], Lf = [];
  for (let i = 0; i <= N; i++) { const t = i / N, y = 1 + t * (L - 2); R.push([c + f(t), y]); Lf.push([c - f(t), y]); }
  const pts = R.concat(Lf.reverse()).map((p) => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ");
  const soft = b.type === "Soft-top";
  return `<span class="boardart" style="height:${h}px"><svg width="${W}" height="${L}" viewBox="0 0 ${W} ${L}" aria-hidden="true"><polygon points="${pts}" class="${soft ? "soft" : "hard"}" stroke-linejoin="round"/><line x1="${c}" y1="${(L * 0.06).toFixed(1)}" x2="${c}" y2="${(L - 2).toFixed(1)}" class="stringer"/></svg></span>`;
}

/* ---------- the map ---------- */
const COAST = "M-20,190 L18,200 C22,220 30,238 26,255 C22,275 30,290 36,312 C42,330 38,350 44,370 C50,382 58,393 72,396 C90,400 98,391 112,388 C128,385 135,395 150,398 C170,402 182,389 198,384 C212,380 222,389 238,392 C255,395 268,384 285,388 C300,392 315,384 330,390 C345,398 360,392 406,395";

/** pins: [{id, v, label?}] – v = fit score. interactive: pins are buttons. */
export function mapSvg(pins, { interactive = true, caption = "Map of the Cascais coast" } = {}) {
  const pinSvg = pins.map(({ id, v }) => {
    const s = SPOTS[id], r = v >= 85 ? 17 : 15;
    const d = `M${s.x - r},${s.y - 22} a${r},${r} 0 1,1 ${2 * r},0 c0,${r * 0.75} -${r},${r * 1.4} -${r},${r * 1.4} s-${r},-${r * 0.65} -${r},-${r * 1.4}z`;
    const lx = s.label === "left" ? s.x + r + 6 : s.x, ly = s.label === "left" ? s.y - 18 : s.y + 15;
    const anchor = s.label === "left" ? "start" : "middle";
    const attrs = interactive ? `role="button" tabindex="0" data-a="pin" data-v="${id}" aria-label="${esc(s.name)}, fit ${v}, ${clsLabel(v).toLowerCase()}"` : `aria-hidden="true"`;
    return `<g class="pin p-${cls(v)}" ${attrs}><path class="pinbody" d="${d}"/><text class="pinnum" x="${s.x}" y="${s.y - 18}">${v}</text><text class="pinlbl" x="${lx}" y="${ly}" text-anchor="${anchor}">${esc(s.short)}</text></g>`;
  }).join("");
  return `<svg class="mapsvg" viewBox="0 236 386 196" preserveAspectRatio="xMidYMid slice" role="group" aria-label="${caption}">
    <defs><linearGradient id="sea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--map-sea1)"/><stop offset="1" stop-color="var(--map-sea2)"/></linearGradient></defs>
    <rect x="-20" y="150" width="440" height="320" fill="url(#sea)"/>
    <path class="bathy" d="M-20,215 C10,230 14,270 22,300 C30,340 40,388 80,410 C140,425 220,415 300,412 C340,410 380,412 410,414"/>
    <path class="bathy" d="M-20,235 C-4,260 2,300 8,330 C18,380 40,415 90,428 C160,440 260,432 410,432"/>
    <path class="land" d="${COAST} L406,150 L-20,150 Z"/>
    <path class="shore" d="${COAST}"/>
    <path class="road" d="M40,262 C80,300 130,318 180,330 C240,344 300,344 406,340"/>
    <text class="ocean" x="200" y="425" text-anchor="middle">ATLANTIC OCEAN</text>
    ${pinSvg}
  </svg>`;
}

/** Status of a booking date relative to the forecast window. */
export const dayIndexOf = (iso) => {
  const t = new Date(iso + "T12:00:00");
  const today = new Date(); today.setHours(12, 0, 0, 0);
  return Math.round((t - today) / 86400000);
};

export const emptyState = (ic, title, text, action = "") =>
  `<div class="empty">${icon(ic, 28)}<b>${title}</b><p>${text}</p>${action}</div>`;
