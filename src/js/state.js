/* ==========================================================================
   App state – one plain object, saved to localStorage so a reload (or
   coming back tomorrow) keeps your profile, boards, bookings and ratings.
   ========================================================================== */

const KEY = "surfletics:v2";
const VERSION = 2;

export const emptyUser = () => ({ name: "", age: "", gender: "", height: "", weight: "", fitness: 0, level: "", since: "", stance: "" });
export const emptyBoard = () => ({ type: "Longboard", len: "", w: "", t: "", vol: "" });

export function initialState() {
  return {
    v: VERSION,
    /* onboarding */
    ob: 0, done: false, example: false, fitSeen: false,
    /* navigation */
    tab: "spots", spotDetail: null, ftab: "fc", sub: null, btab: "up",
    /* profile */
    user: emptyUser(), spots: {}, boards: [], board: 0, device: null, consent: false,
    nb: emptyBoard(),
    /* forecast & lists */
    day: 0, fday: 0, fspot: "carc",
    lmode: "lessons", lfilter: "fit", vidOnly: false,
    /* things the user did */
    bookings: [],  // {id, kind, ref, name, spot, iso, time, price, extra, rent, status}
    sessions: [],  // {id, iso, spot, board, boardType, h, p, rating, reasons, stars, score, src, waves}
    learn: {},     // { all: shift in m } learned from ratings
    statsBase: { sessions: 0, waves: 0 },
    /* prototype */
    mvp: false, notify: false, fbDismissed: false,
  };
}

export const st = initialState();

/** Keys that survive "Restart sign-up" (prototype settings). */
const KEEP_ON_RESET = ["mvp", "fbDismissed"];

export function resetState() {
  const keep = Object.fromEntries(KEEP_ON_RESET.map((k) => [k, st[k]]));
  for (const k of Object.keys(st)) delete st[k];
  Object.assign(st, initialState(), keep);
  save();
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (!data || data.v !== VERSION) return false;
    Object.assign(st, initialState(), data);
    return true;
  } catch {
    return false;
  }
}

let saveT;
export function save() {
  clearTimeout(saveT);
  saveT = setTimeout(() => {
    try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* private mode etc. – the app still works */ }
  }, 120);
}

export const uid = () => Math.random().toString(36).slice(2, 9);

/** Transient UI state – not saved (validation errors, open sheet, …). */
export const tmp = { errors: {}, sheet: null, booked: null, scrub: null };
