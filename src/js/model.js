/* ==========================================================================
   The fit model – how well conditions match a surfer.
   Pure functions: they read the state that is passed in (or the shared
   store) and never touch the DOM.
   ========================================================================== */
import { SPOTS, TEMPL, LEVEL_ADJ, LEVELS, GUIDE } from "./data.js";
import { st } from "./state.js";
import { toMin, toHHMM, sun } from "./dates.js";

/** Energy of one wave per metre of crest, in kJ: ρ·g²·H²·T² / (16π) ≈ 1.96·H²·T² */
export const energy = (h, p) => Math.round(1.962 * h * h * p * p);
export const fmtKJ = (v) => v.toLocaleString("en");

export const currentBoard = () => st.boards[st.board] || null;

/** Personal sweet spot for a board (or the current board). */
export function sweet(board = currentBoard()) {
  const type = board?.type || "Soft-top";
  const t = TEMPL[type] || TEMPL["Soft-top"];
  const a = LEVEL_ADJ[st.user.level] ?? 0;
  const fitAdj = ((st.user.fitness || 3) - 3) * 0.05;
  const learned = st.learn.all || 0; // shift learned from rated sessions (m)
  const lo = Math.max(0.2, +(t.h[0] + a * 0.5 + learned * 0.6).toFixed(1));
  const hi = Math.max(lo + 0.3, +(t.h[1] + a + fitAdj + learned).toFixed(1));
  const e0 = Math.max(30, Math.round((t.e[0] * (1 + a * 0.6) * (1 + learned * 0.5)) / 10) * 10);
  const e1 = Math.round((t.e[1] * (1 + a * 0.9 + fitAdj) * (1 + learned * 0.8)) / 10) * 10;
  return { h: [lo, hi], p: t.p, e: [e0, e1], brk: t.brk, learned, type };
}

/** Fit score 12–98 for wave height h and period p at a spot. */
export function fitHP(h, p, spotId, off = 0, board) {
  const s = SPOTS[spotId], sw = sweet(board);
  const dh = h < sw.h[0] ? sw.h[0] - h : h > sw.h[1] ? h - sw.h[1] : 0;
  const dp = p < sw.p[0] ? sw.p[0] - p : p > sw.p[1] ? p - sw.p[1] : 0;
  const mid = (sw.h[0] + sw.h[1]) / 2, span = (sw.h[1] - sw.h[0]) / 2 || 0.3;
  const sc = 97 - (Math.abs(h - mid) / span) * 6 - dh * 70 - dp * 4 + s.bias + off;
  return Math.max(12, Math.min(98, Math.round(sc)));
}

/** Fit score for a spot on forecast day d (0–6). This is the peak of the day. */
export const fit = (spotId, d, off = 0, board) => fitHP(SPOTS[spotId].h[d], SPOTS[spotId].p[d], spotId, off, board);

export const cls = (v) => (v >= 85 ? "great" : v >= 70 ? "good" : v >= 50 ? "border" : "bad");
export const clsLabel = (v) => (v >= 85 ? "Great fit" : v >= 70 ? "Good fit" : v >= 50 ? "Borderline" : "Not for you");
export const clsShort = (v) => (v >= 85 ? "great" : v >= 70 ? "good" : v >= 50 ? "borderline" : "not for you");

/* ---------- the day curve: fit hour by hour ---------- */

const TIDE_CYCLE = 745; // minutes between two low tides
/** first low tide (minutes) on day d */
export const lowTideMin = (spotId, d) => (toMin(SPOTS[spotId].lowTide) + d * 50) % TIDE_CYCLE;
/** sea level -1 (low) … +1 (high) at minute m */
export const tideLevel = (spotId, d, m) => -Math.cos((2 * Math.PI * (m - lowTideMin(spotId, d))) / TIDE_CYCLE);
/** all low and high tide times within the day */
export function tideTimes(spotId, d) {
  const lows = [], highs = [];
  for (let m = lowTideMin(spotId, d) - TIDE_CYCLE; m < 1440 + TIDE_CYCLE; m += TIDE_CYCLE) {
    if (m >= 0 && m < 1440) lows.push(m);
    const hi = m + TIDE_CYCLE / 2;
    if (hi >= 0 && hi < 1440) highs.push(hi);
  }
  return { lows, highs };
}

const TIDE_PREF = { lowmid: -0.35, midhigh: 0.35, low: -0.7, high: 0.7, mid: 0 };

/** Fit at a minute of day d, or null in the dark. Never above the day's peak. */
export function fitAt(spotId, d, m, off = 0) {
  const { rise, set } = sun(d);
  if (m < rise - 15 || m > set + 15) return null;
  const s = SPOTS[spotId];
  const base = fit(spotId, d, off);
  const lvl = tideLevel(spotId, d, m);
  const tidePen = Math.max(0, Math.abs(lvl - (TIDE_PREF[s.tide] ?? 0)) - 0.3) * 24;
  const windPen = (s.windBuild * 20) / (1 + Math.exp(-(m - 750) / 45)); // wind builds from late morning
  return Math.max(10, Math.round(base - tidePen - windPen));
}

/** Samples every 15 min between sunrise and sunset. */
export function dayCurve(spotId, d, off = 0) {
  const { rise, set } = sun(d);
  const pts = [];
  for (let m = Math.ceil(rise / 15) * 15; m <= set; m += 15) pts.push({ m, f: fitAt(spotId, d, m, off) });
  return pts;
}

/** Best contiguous window around the peak (within 5 points of it). */
export function bestWindow(spotId, d, off = 0) {
  const pts = dayCurve(spotId, d, off);
  let pi = 0;
  pts.forEach((p, i) => { if (p.f > pts[pi].f) pi = i; });
  const peak = pts[pi].f;
  let a = pi, b = pi;
  const MAX = 240; // a window is at most 4 h
  while (pts[b].m - pts[a].m < MAX) {
    const left = a > 0 && pts[a - 1].f >= peak - 4 ? pts[a - 1].f : -1;
    const right = b < pts.length - 1 && pts[b + 1].f >= peak - 4 ? pts[b + 1].f : -1;
    if (left < 0 && right < 0) break;
    if (left >= right) a--; else b++;
  }
  while (pts[b].m - pts[a].m < 90) { if (b < pts.length - 1) b++; else if (a > 0) a--; else break; }
  return { from: pts[a].m, to: pts[b].m, peak, label: `${toHHMM(pts[a].m)}–${toHHMM(pts[b].m)}` };
}

/** Difficulty of the paddle-out today, from the guide threshold. */
export function paddleDifficulty(spotId, d) {
  const g = GUIDE[spotId], h = SPOTS[spotId].h[d];
  return h >= g.paddle[0] * 1.5 ? "tricky" : h >= g.paddle[0] ? "medium" : "easy";
}

/* ---------- lessons & rentals ---------- */

/** For schools that pick the best of several spots. */
export function schoolFit(sc, d) {
  const ids = sc.spots || [sc.spot];
  return ids.map((id) => ({ spot: id, f: fit(id, d, sc.off) })).reduce((a, b) => (b.f > a.f ? b : a));
}

/** true / false, or null when the user has no level yet. */
export function levelMatch(levels) {
  const l = st.user.level === "Expert" ? "Advanced" : st.user.level;
  if (!l) return null;
  if (levels === "All levels" || levels.includes(l)) return true;
  const r = levels.split("–").map((v) => LEVELS.indexOf(v.trim()));
  const i = LEVELS.indexOf(l);
  return r.length === 2 && r[0] >= 0 && i >= r[0] && i <= r[1];
}

export function recBoard() {
  const l = st.user.level;
  return l === "Advanced" || l === "Expert" ? "Shortboard" : l === "Intermediate" ? "Mid-length" : l === "Improver" ? "Longboard" : l === "Beginner" ? "Soft-top" : "Longboard";
}

/** Best spot+day across the coming days (for recommendations). */
export function bestUpcoming(fromDay = 0, toDay = 6) {
  let best = null;
  for (let d = fromDay; d <= toDay; d++) for (const id of Object.keys(SPOTS)) {
    const f = fit(id, d);
    if (!best || f > best.f) best = { spot: id, d, f };
  }
  return best;
}

/* ---------- board helpers ---------- */
export const boardLabel = (b) => (b ? `${b.type} ${b.len || ""}`.trim() : "your own board");
export function boardInches(len) {
  const m = String(len).match(/(\d+)\s*['’]\s*(\d+)?/);
  if (m) return +m[1] * 12 + +(m[2] || 0);
  const n = parseFloat(len);
  return isNaN(n) ? 84 : n < 15 ? n * 12 : n;
}
/** Accepts 8'0", 8’0, 8 0, 8.5, 96 – returns normalised 8'0" or null */
export function normaliseLength(v) {
  v = String(v).trim();
  if (!v) return null;
  let m = v.match(/^(\d{1,2})\s*(?:['’ ]|ft)\s*(\d{1,2})?\s*(?:["”]|in)?$/i);
  if (m && +m[1] >= 4 && +m[1] <= 12 && (+m[2] || 0) < 12) return `${+m[1]}'${+(m[2] || 0)}"`;
  m = v.match(/^(\d{1,2})(?:[.,](\d+))?$/);
  if (m) {
    const n = parseFloat(v.replace(",", "."));
    if (n >= 4 && n <= 12) { const ft = Math.floor(n), inch = Math.round((n - ft) * 12); return `${ft}'${inch}"`; }
    if (n >= 48 && n <= 144) return `${Math.floor(n / 12)}'${Math.round(n % 12)}"`;
  }
  return null;
}

export { toHHMM };
