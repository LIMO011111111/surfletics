/* ==========================================================================
   Surfletics – app shell: rendering, navigation, sheets, toasts, events.
   ========================================================================== */
import { SPOTS, SCHOOLS, RENTALS, EXAMPLE, REASONS, BOARD_TYPES } from "./data.js";
import { st, tmp, load, save, resetState, uid, emptyBoard, initialState } from "./state.js";
import { DAYS, dayDate, dayName, toMin, isoOf, refreshDays } from "./dates.js";
import { fit, fitHP, schoolFit, boardLabel, normaliseLength, currentBoard } from "./model.js";
import { morph } from "./morph.js";
import { icon } from "./icons.js";
import { renderOnboarding } from "./screens/onboarding.js";
import { renderDiscover, renderForecast } from "./screens/spots.js";
import { renderLessons } from "./screens/lessons.js";
import { renderBookings, toRate } from "./screens/bookings.js";
import { renderProfile } from "./screens/profile.js";
import { SHEETS } from "./sheets.js";
import { dayIndexOf } from "./ui.js";

const $ = (s, r = document) => r.querySelector(s);
const view = $("#view"), scroller = $("#scroll"), tabbar = $("#tabbar"), screenEl = $("#screen");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const haptic = () => { try { navigator.vibrate?.(8); } catch { /* not supported */ } };
const isoAgo = (n) => isoOf(dayDate(-n));

/* ---------- rendering ---------- */

const TABS = [["spots", "Spots", "spots"], ["lessons", "Lessons", "lessons"], ["bookings", "Bookings", "bookings"], ["profile", "Profile", "profile"]];
let lastKey = null;

function screenKey() {
  if (!st.done) return `ob${st.ob}`;
  if (st.tab === "spots") return st.spotDetail ? `spot:${st.ftab}` : "discover";
  if (st.tab === "profile") return st.sub ? `sub:${st.sub}` : "profile";
  return st.tab;
}

function screenHtml() {
  if (!st.done) return renderOnboarding();
  switch (st.tab) {
    case "spots": return st.spotDetail ? renderForecast() : renderDiscover();
    case "lessons": return renderLessons();
    case "bookings": return renderBookings();
    case "profile": return renderProfile();
  }
  return "";
}

/** Light status-bar text on dark screen tops. */
const darkTop = () => (!st.done && st.ob === 0) || (st.done && st.tab === "profile" && !st.sub);

export function render(dir) {
  const key = screenKey();
  const nav = key !== lastKey;
  if (nav) view.dataset.nav = lastKey === null ? "none" : dir || "fade";
  morph(view, `<div class="scr" data-key="${key}">${screenHtml()}</div>`);
  if (nav) scroller.scrollTop = 0;
  screenEl.dataset.tone = darkTop() ? "dark" : "light";
  screenEl.dataset.screen = key.split(":")[0];
  renderChrome();
  if (nav) { lastKey = key; hideToast(); afterNav(key); }
  save();
}

function renderChrome() {
  const rateN = toRate().length;
  tabbar.hidden = !st.done;
  morph(tabbar, TABS.map(([t, l, ic]) => `<button type="button" class="${st.tab === t ? "on" : ""}" ${st.tab === t ? 'aria-current="page"' : ""} data-a="tab" data-v="${t}">${icon(ic, 26)}<span>${l}</span>${t === "bookings" && rateN && !st.mvp ? `<i class="dot" aria-label="${rateN} to rate"></i>` : ""}</button>`).join(""));
  $("#fab").hidden = !(st.done && st.tab === "spots" && !st.spotDetail);
  screenEl.classList.toggle("has-tabbar", st.done);
  syncAside();
  placeFeedback();
}

let introT;
function afterNav(key) {
  // Move focus to the new screen's heading for screen-reader users (not on first load).
  requestAnimationFrame(() => {
    const h = view.querySelector("h1");
    if (h && document.activeElement && document.activeElement !== document.body && !view.contains(document.activeElement)) {
      h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true });
    }
  });
  clearTimeout(introT);
  if (st.done && !st.fitSeen && (key === "discover" || key === "lessons")) {
    introT = setTimeout(() => { if (!tmp.sheet && !st.fitSeen) { st.fitSeen = true; save(); openSheet("fitintro"); } }, 600);
  }
}

/* ---------- sheets ---------- */

const sheetEl = $("#sheet"), sheetPanel = $("#sheetpanel"), sheetBody = $("#sheetbody"), sheetTitle = $("#sheettitle");
let lastFocus = null, closeT;

export function openSheet(name, arg) {
  clearTimeout(closeT);
  const wasOpen = !!tmp.sheet;
  hideToast(); // a toast would sit on top of the sheet title
  tmp.sheet = { name, arg };
  tmp.errors = {};
  renderSheet();
  if (!wasOpen) {
    lastFocus = document.activeElement;
    sheetEl.hidden = false;
    sheetEl.classList.remove("closing");
    for (const el of [$("#scroll"), tabbar, $("#fab"), $("#fbk")]) el.inert = true;
    requestAnimationFrame(() => { sheetEl.classList.add("open"); sheetTitle.focus({ preventScroll: true }); });
  }
}

function renderSheet() {
  if (!tmp.sheet) return;
  const { name, arg } = tmp.sheet;
  const s = SHEETS[name](arg);
  sheetTitle.textContent = s.title;
  morph(sheetBody, s.body);
}

export function closeSheet() {
  if (!tmp.sheet) return;
  tmp.sheet = null; tmp.booked = null; tmp.bookRent = false; tmp.errors = {};
  sheetEl.classList.remove("open");
  sheetEl.classList.add("closing");
  sheetPanel.style.transform = ""; // slide out from where a drag left it
  for (const el of [$("#scroll"), tabbar, $("#fab"), $("#fbk")]) el.inert = false;
  closeT = setTimeout(() => { sheetEl.hidden = true; sheetEl.classList.remove("closing"); sheetPanel.style.transform = ""; }, reduceMotion.matches ? 0 : 260);
  const back = lastFocus && lastFocus !== document.body && document.contains(lastFocus) ? lastFocus : view.querySelector("h1");
  if (back) { if (back.tagName === "H1") back.setAttribute("tabindex", "-1"); back.focus({ preventScroll: true }); }
}

// drag the handle down to dismiss
(() => {
  let y0 = null, dy = 0;
  const grab = $("#sheetgrab");
  const start = (e) => { y0 = e.clientY; dy = 0; sheetPanel.classList.add("dragging"); grab.setPointerCapture?.(e.pointerId); };
  const move = (e) => { if (y0 === null) return; dy = Math.max(0, e.clientY - y0); sheetPanel.style.transform = `translateY(${dy}px)`; };
  const end = () => { if (y0 === null) return; sheetPanel.classList.remove("dragging"); y0 = null; if (dy > 90) closeSheet(); else sheetPanel.style.transform = ""; };
  grab.addEventListener("pointerdown", start);
  grab.addEventListener("pointermove", move);
  grab.addEventListener("pointerup", end);
  grab.addEventListener("pointercancel", end);
})();

/* ---------- toast ---------- */

const toastEl = $("#toast");
let toastT;
export function toast(msg) {
  clearTimeout(toastT);
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  toastT = setTimeout(hideToast, 3200);
}
function hideToast() { clearTimeout(toastT); toastEl.classList.remove("show"); }

/* ---------- validation ---------- */

function validateAbout() {
  const u = st.user, e = {};
  if (!String(u.name).trim()) e.name = "Enter your name.";
  const age = +u.age;
  if (u.age === "" || u.age === null) e.age = "Enter your age.";
  else if (!Number.isInteger(age) || age < 8 || age > 90) e.age = "Enter an age between 8 and 90.";
  if (u.height !== "" && (+u.height < 100 || +u.height > 230)) e.height = "Between 100 and 230 cm.";
  if (u.weight !== "" && (+u.weight < 25 || +u.weight > 200)) e.weight = "Between 25 and 200 kg.";
  return e;
}
function validateLevel() {
  const e = {};
  if (!st.user.fitness) e.fitness = "Pick how fit you are.";
  if (!st.user.level) e.level = "Pick your surf experience.";
  return e;
}
/** Show errors and focus the first invalid control. Returns true when valid. */
function check(errors) {
  tmp.errors = errors;
  render();
  const first = Object.keys(errors)[0];
  if (!first) return true;
  requestAnimationFrame(() => {
    const el = view.querySelector('[aria-invalid="true"] button, [aria-invalid="true"], .ferr');
    const target = el?.closest("fieldset")?.querySelector("button") || el;
    target?.focus({ preventScroll: true });
    (el?.closest(".field, fieldset, .consent") || el)?.scrollIntoView({ block: "center", behavior: reduceMotion.matches ? "auto" : "smooth" });
  });
  return false;
}

/* ---------- actions ---------- */

function addBoard() {
  const nb = st.nb, e = {};
  const len = normaliseLength(nb.len);
  if (!len) e.len = nb.len.trim() ? "Use feet and inches, e.g. 8'0\"." : "Enter the length.";
  const vol = parseFloat(String(nb.vol).replace(",", "."));
  if (!vol) e.vol = "Enter the volume in litres.";
  else if (vol < 15 || vol > 120) e.vol = "Between 15 and 120 L.";
  const num = (v) => parseFloat(String(v).replace(",", "."));
  if (nb.w.trim() && !(num(nb.w) >= 14 && num(nb.w) <= 32)) e.w = "Width in inches, between 14 and 32.";
  if (nb.t.trim() && !(num(nb.t) >= 1.5 && num(nb.t) <= 5)) e.t = "Thickness in inches, between 1.5 and 5.";
  if (!check(e)) return;
  st.boards.push({ type: nb.type, len, w: nb.w.trim(), t: nb.t.trim(), vol: Math.round(vol * 10) / 10 });
  st.board = st.boards.length - 1;
  st.nb = emptyBoard();
  render();
  toast(`${nb.type} ${len} added.`);
}

function loadExample() {
  resetState();
  const ex = EXAMPLE;
  Object.assign(st, {
    example: true, done: true, tab: "spots", consent: true, device: ex.device,
    user: { ...ex.user }, spots: { ...ex.spots }, boards: ex.boards.map((b) => ({ ...b })), board: 0,
    statsBase: { sessions: ex.sessionsBefore, waves: ex.wavesBefore },
  });
  st.sessions = ex.history.map(([ago, spot, bi, h, p, rating, stars]) => {
    const b = st.boards[bi];
    return { id: uid(), iso: isoAgo(ago), spot, board: boardLabel(b), boardType: b.type, h, p, rating, reasons: [], stars, score: fitHP(h, p, spot, 0, b), src: "log", waves: 12 };
  });
  const mare = SCHOOLS[0];
  st.bookings = [
    { id: uid(), kind: "lesson", ref: mare.id, name: mare.name, spot: mare.spot, off: mare.off, iso: isoAgo(2), time: mare.time, price: mare.price, extra: "Board & wetsuit included", ride: SCHOOL_BOARD, status: "up", h: 1.0, p: 10 },
    { id: uid(), kind: "lesson", ref: "lsc", name: SCHOOLS[3].name, spot: schoolFit(SCHOOLS[3], 1).spot, off: 0, iso: DAYS[1].iso, time: SCHOOLS[3].time, price: SCHOOLS[3].price, extra: "Board & wetsuit included", ride: SCHOOL_BOARD, status: "up" },
  ];
}

/** A rating nudges your sweet spot (on every board – it is your level that moved). */
function learnFrom(rating, type) {
  const step = rating === 0 ? 0.1 : rating === 2 ? -0.1 : 0;
  if (!step || !type) return 0;
  const old = st.learn.all || 0;
  st.learn.all = Math.max(-0.5, Math.min(0.5, +(old + step).toFixed(2)));
  return +(st.learn.all - old).toFixed(2);
}
const learnedMsg = (delta, type, rating) => delta ? `Your sweet spot moved ${delta > 0 ? "up" : "down"} ${Math.abs(delta).toFixed(1)} m.` : rating === 1 ? "Your sweet spot is confirmed." : "Your sweet spot is already at its limit.";

function newRate(id) { return { id, fit: null, reasons: [], stars: 0 }; }

function saveLog() {
  const L = tmp.log;
  if (L.fit === null) { toast("Pick how the conditions fit you first."); return; }
  if (!L.start || !L.end || isNaN(toMin(L.start)) || isNaN(toMin(L.end))) { tmp.errors = { logtime: "Enter a start and an end time." }; renderSheet(); $(L.start ? "#lg-end" : "#lg-start")?.focus(); return; }
  if (toMin(L.end) <= toMin(L.start)) { tmp.errors = { logtime: "The end time has to be after the start." }; renderSheet(); $("#lg-end")?.focus(); return; }
  const s = SPOTS[L.spot], b = st.boards[L.board] || null;
  const h = +(s.h[0] * (1 - 0.06 * L.ago)).toFixed(1), p = Math.max(6, s.p[0] - (L.ago > 1 ? 1 : 0));
  const score = fitHP(h, p, L.spot, 0, b);
  st.sessions.push({ id: uid(), iso: isoAgo(L.ago), spot: L.spot, board: boardLabel(b), boardType: b?.type || "", h, p, rating: L.fit, reasons: L.reasons.slice(), stars: L.stars, score, src: "log", waves: st.device ? 11 : 0, start: L.start, end: L.end });
  const delta = learnFrom(L.fit, b?.type);
  closeSheet();
  render();
  toast(`Session saved. ${b ? learnedMsg(delta, b.type, L.fit) : "Add a board to learn a sweet spot per board."}`);
}

function saveRating(id) {
  const r = tmp.rate, b = st.bookings.find((x) => x.id === id);
  if (!b || !r || r.id !== id) return;
  if (r.fit === null) { toast("Pick how the conditions fit you first."); return; }
  // the board actually ridden was stored with the booking (school board, rental or own board)
  const board = b.ride !== undefined ? b.ride : currentBoard();
  const d = DAYS.findIndex((x) => x.iso === b.iso);
  const h = b.h ?? SPOTS[b.spot].h[Math.max(0, d)], p = b.p ?? SPOTS[b.spot].p[Math.max(0, d)];
  const label = board ? `${board.school ? "School " : ""}${boardLabel(board)}` : "own board";
  st.sessions.push({ id: uid(), iso: b.iso > DAYS[0].iso ? DAYS[0].iso : b.iso, spot: b.spot, board: label, boardType: board?.type || "", h, p, rating: r.fit, reasons: r.reasons.slice(), stars: r.stars, score: fitHP(h, p, b.spot, b.off || 0, board || undefined), src: b.kind, waves: st.device ? 14 : 0 });
  b.status = "rated";
  const delta = learnFrom(r.fit, board?.type);
  tmp.rate = null;
  render();
  toast(`Rating saved. ${board ? learnedMsg(delta, board.type, r.fit) : "Add a board to learn a sweet spot per board."}`);
}

const SCHOOL_BOARD = { type: "Soft-top", len: "8'0\"", school: true };

function bookingFromSchool(i) {
  const sc = SCHOOLS[i], at = schoolFit(sc, st.day).spot, rent = !!tmp.bookRent && !sc.gear;
  const b = currentBoard();
  const ride = sc.gear || rent ? SCHOOL_BOARD : b ? { type: b.type, len: b.len, w: b.w } : null;
  return { id: uid(), kind: "lesson", ref: sc.id, name: sc.name, spot: at, off: sc.off, iso: DAYS[st.day].iso, time: sc.time, price: sc.price + (rent ? 10 : 0),
    extra: sc.gear ? "Board & wetsuit included" : rent ? "Board & wetsuit rented" : b ? `Own ${boardLabel(b)}` : "Own board", ride, status: "up",
    h: SPOTS[at].h[st.day], p: SPOTS[at].p[st.day] };
}

function downloadIcs(id) {
  const b = st.bookings.find((x) => x.id === id);
  if (!b) return;
  const [t0, t1] = b.time.includes("–") ? b.time.split("–") : ["09:00", "13:00"];
  const ymd = b.iso.replace(/-/g, ""), hm = (t) => t.replace(":", "") + "00";
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Surfletics prototype//EN", "BEGIN:VEVENT", `UID:${b.id}@surfletics.example`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    `DTSTART;TZID=Europe/Lisbon:${ymd}T${hm(t0.trim())}`, `DTEND;TZID=Europe/Lisbon:${ymd}T${hm(t1.trim().slice(0, 5))}`, `SUMMARY:${b.kind === "rental" ? "Board rental" : "Surf lesson"}: ${b.name}`, `LOCATION:${SPOTS[b.spot].name}, Portugal`, "DESCRIPTION:Booked in the Surfletics prototype (example booking).", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = `surfletics-${b.iso}.ics`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Calendar file downloaded.");
}

const ACTIONS = {
  /* onboarding */
  obnext() {
    if (st.ob === 1 && !check(validateAbout())) return;
    if (st.ob === 2 && !check(validateLevel())) return;
    tmp.errors = {}; st.ob++; render("fwd");
  },
  obback() { tmp.errors = {}; st.ob = Math.max(0, st.ob - 1); render("back"); },
  obskip() { tmp.errors = {}; st.ob++; render("fwd"); },
  skipdemo() { loadExample(); render("fwd"); toast("Exploring as Ella, an intermediate surfer."); },
  gender: (v) => { st.user.gender = st.user.gender === v ? "" : v; render(); },
  fitness: (v) => { st.user.fitness = +v; delete tmp.errors.fitness; render(); },
  level: (v) => { st.user.level = v; delete tmp.errors.level; render(); },
  stance: (v) => { st.user.stance = st.user.stance === v ? "" : v; render(); },
  spot: (v) => { if (st.spots[v]) delete st.spots[v]; else st.spots[v] = "This year"; render(); },
  nbtype: (v) => { st.nb.type = v; render(); },
  delboard(v) {
    const i = +v, b = st.boards[i];
    st.boards.splice(i, 1);
    if (st.board > i) st.board--; else if (st.board === i) st.board = 0;
    if (st.board >= st.boards.length) st.board = 0;
    render(); toast(`${boardLabel(b)} removed.`);
  },
  device: (v) => { st.device = st.device === v ? null : v; render(); },
  finish() {
    if (!st.consent) { check({ consent: "Please agree so we can personalise your matches." }); return; }
    tmp.errors = {}; st.done = true; st.tab = "spots"; st.spotDetail = null; render("fwd");
    toast(`Welcome, ${String(st.user.name).trim().split(" ")[0]}! Here are today’s spots for you.`);
  },

  /* navigation */
  tab(v) {
    if (st.sub === "edit" && !check({ ...validateAbout(), ...validateLevel() })) return;
    if (v === st.tab && v === "spots" && st.spotDetail) { st.spotDetail = null; render("back"); return; }
    if (v === st.tab && !st.sub) { scroller.scrollTo({ top: 0, behavior: reduceMotion.matches ? "auto" : "smooth" }); return; }
    st.tab = v; st.sub = null; if (v === "spots") st.spotDetail = null; render("tab");
  },
  day: (v) => { st.day = +v; render(); },
  pin: (v) => { st.fspot = v; st.fday = st.day; st.spotDetail = v; st.ftab = "fc"; st.tab = "spots"; render("fwd"); },
  openspot(v) { const [id, d] = v.split("|"); st.fspot = id; st.fday = +d; st.day = +d; st.spotDetail = id; st.ftab = "fc"; st.tab = "spots"; render("fwd"); },
  spotsback() { st.spotDetail = null; st.ftab = "fc"; render("back"); },
  fspot: (v) => { st.fspot = v; render(); },
  fday: (v) => { st.fday = +v; render(); },
  ftab: (v) => { st.ftab = v; render(v === "guide" ? "fwd" : "back"); },
  lmode: (v) => { st.lmode = v; render(); },
  lfilter: (v) => { st.lfilter = v; render(); },
  vidonly() { st.vidOnly = !st.vidOnly; render(); },
  btab: (v) => { st.btab = v; render(); },
  allsessions() { st.tab = "bookings"; st.btab = "past"; render("tab"); },
  sub: (v) => { st.sub = v; tmp.errors = {}; render("fwd"); },
  subdone() {
    if (st.sub === "edit") { const e = { ...validateAbout(), ...validateLevel() }; if (!check(e)) return; }
    tmp.errors = {}; st.sub = null; render("back");
  },
  boards() { st.tab = "profile"; st.sub = "boards"; render("fwd"); },
  pickboard: (v) => { st.board = +v; render(); },
  mode(v) { st.mvp = v === "mvp"; if (tmp.sheet && tmp.sheet.name !== "about") closeSheet(); render(); if (tmp.sheet) renderSheet(); toast(st.mvp ? "Showing phase 1: lessons and rental are “coming soon”." : "Showing the full version."); },
  notify() { st.notify = !st.notify; render(); toast(st.notify ? "Done – we’ll tell you when booking launches at your spots." : "Notifications turned off."); },

  /* sheets */
  closesheet: closeSheet,
  info: (v) => openSheet(v === "fitintro" ? "fitintro" : "info", v),
  fitintro: () => openSheet("fitintro"),
  about: () => openSheet("about"),
  install: () => openSheet("install"),
  async installnow() {
    const p = tmp.installPrompt;
    if (!p) return;
    p.prompt();
    const { outcome } = await p.userChoice.catch(() => ({}));
    tmp.installPrompt = null; closeSheet();
    if (outcome === "accepted") toast("Installed – find Surfletics on your home screen.");
  },
  restartask: () => openSheet("restart"),
  restart() { closeSheet(); resetState(); Object.assign(tmp, { errors: {}, rate: null, log: null, scrub: null }); lastKey = null; render(); },
  book: (v) => { tmp.bookRent = false; tmp.booked = null; openSheet("book", +v); },
  rent: (v) => { tmp.booked = null; openSheet("rent", v); },
  confirmbook(v) {
    const b = bookingFromSchool(+v);
    st.bookings.push(b); tmp.booked = b; haptic();
    render(); renderSheet(); sheetTitle.focus();
  },
  confirmrent(v) {
    const [i, j] = v.split("|").map(Number), r = RENTALS[i], bd = r.boards[j];
    const b = { id: uid(), kind: "rental", ref: r.id, name: r.name, spot: r.spot, off: 0, iso: DAYS[st.day].iso, time: "09:00–13:00", price: bd[2], extra: `Rental: ${bd[0]} ${bd[1]}`, ride: { type: bd[0], len: bd[1] }, status: "up", h: SPOTS[r.spot].h[st.day], p: SPOTS[r.spot].p[st.day] };
    st.bookings.push(b); tmp.booked = b; haptic();
    render(); renderSheet(); sheetTitle.focus();
  },
  viewbooking() { closeSheet(); st.tab = "bookings"; st.btab = "up"; render("tab"); },
  ics: (v) => downloadIcs(v),
  cancelbook: (v) => openSheet("cancel", v),
  confirmcancel(v) { const b = st.bookings.find((x) => x.id === v); st.bookings = st.bookings.filter((x) => x.id !== v); closeSheet(); render(); toast(b?.kind === "rental" ? "Reservation cancelled." : "Booking cancelled. Refund on its way."); },
  movebook(v) {
    const [id, d] = v.split("|"), b = st.bookings.find((x) => x.id === id);
    if (!b) return;
    b.iso = DAYS[+d].iso; b.h = SPOTS[b.spot].h[+d]; b.p = SPOTS[b.spot].p[+d];
    render(); toast(`Moved to ${+d <= 1 ? dayName(+d).toLowerCase() : DAYS[+d].wdLong} – fit ${fit(b.spot, +d, b.off || 0)}.`);
  },
  markdone(v) { const b = st.bookings.find((x) => x.id === v); if (b) { b.status = "done"; if (b.iso > DAYS[0].iso) b.iso = DAYS[0].iso; st.btab = "past"; tmp.rate = newRate(v); render(); toast("It’s over – how did it go?"); } },

  /* log a session */
  logopen() {
    tmp.log = { spot: st.fspot || "carc", ago: 0, start: "09:30", end: "11:00", board: st.board, fit: null, reasons: [], stars: 0 };
    openSheet("log");
  },
  logfit: (v) => { if (tmp.log.fit !== +v) tmp.log.reasons = []; tmp.log.fit = +v; renderSheet(); },
  logreason: (v) => { toggle(tmp.log.reasons, v); renderSheet(); },
  logstar: (v) => { tmp.log.stars = tmp.log.stars === +v ? 0 : +v; renderSheet(); },
  logsave: saveLog,

  /* rating a finished booking */
  ratefit: (v) => { if (tmp.rate.fit !== +v) tmp.rate.reasons = []; tmp.rate.fit = +v; render(); },
  ratereason: (v) => { toggle(tmp.rate.reasons, v); render(); },
  ratestar: (v) => { tmp.rate.stars = tmp.rate.stars === +v ? 0 : +v; render(); },
  saverate: saveRating,
};
const toggle = (arr, v) => { const i = arr.indexOf(v); if (i < 0) arr.push(v); else arr.splice(i, 1); };

/* ---------- events ---------- */

/* A fast double-tap must not hit the NEW button that appeared under the finger
   (next sign-up step, next board's trash icon, "View booking", the sheet backdrop):
   the second tap of a double-tap (event.detail > 1) is ignored everywhere. */
document.addEventListener("click", (e) => {
  const repeat = e.detail > 1;
  if (e.target === sheetEl) { if (!repeat && sheetEl.classList.contains("open")) closeSheet(); return; }
  const el = e.target.closest("[data-a]");
  if (!el || el.matches("input[type=radio], input[type=checkbox]")) return;
  const fn = ACTIONS[el.dataset.a];
  if (!fn) return;
  e.preventDefault();
  if (repeat) return;
  fn(el.dataset.v, el);
});

// keyboard for non-button controls with role=button (map pins)
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && tmp.sheet) { e.preventDefault(); closeSheet(); return; }
  if (e.key === "Tab" && tmp.sheet) {
    const f = Array.from(sheetPanel.querySelectorAll('button:not([disabled]), [href], input, select, [tabindex]:not([tabindex="-1"])')).filter((x) => x.offsetParent !== null);
    if (!f.length) return;
    if (e.shiftKey && (document.activeElement === f[0] || document.activeElement === sheetTitle)) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    return;
  }
  const t = e.target;
  if ((e.key === "Enter" || e.key === " ") && t.getAttribute?.("role") === "button" && t.tagName !== "BUTTON") { e.preventDefault(); t.dispatchEvent(new MouseEvent("click", { bubbles: true })); }
});

document.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target.dataset.form;
  if (f === "board") addBoard();
  if (f === "ob") { if (!st.done) ACTIONS.obnext(); else ACTIONS.subdone(); }
});

document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.dataset.u) {
    const k = t.dataset.u;
    st.user[k] = t.type === "number" || k === "since" ? (t.value === "" ? "" : +t.value) : t.value;
    if (tmp.errors[k]) { delete tmp.errors[k]; render(); } else save();
  }
  if (t.dataset.nb) { st.nb[t.dataset.nb] = t.value; if (tmp.errors[t.dataset.nb]) { delete tmp.errors[t.dataset.nb]; render(); } }
  if (t.dataset.scrub) { tmp.scrub = { key: t.dataset.scrub, m: +t.value }; render(); }
});

document.addEventListener("change", (e) => {
  const t = e.target;
  if (t.dataset.log) {
    const k = t.dataset.log;
    tmp.log[k] = k === "board" || k === "ago" ? +t.value : t.value;
    if (k === "start" || k === "end") delete tmp.errors.logtime;
    renderSheet();
  }
  if (t.dataset.bind === "board") { st.board = +t.value; render(); }
  if (t.dataset.spotwhen) { st.spots[t.dataset.spotwhen] = t.value; save(); }
  if (t.dataset.a === "consent") { st.consent = t.checked; delete tmp.errors.consent; render(); }
  if (t.dataset.a === "bookrent") { tmp.bookRent = t.value === "1"; renderSheet(); }
});

/* ---------- desktop aside, feedback, PWA ---------- */

function syncAside() {
  document.querySelectorAll("[data-a=mode]").forEach((b) => { const on = (b.dataset.v === "mvp") === st.mvp; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
}

const fbk = $("#fbk");
function placeFeedback() {
  fbk.classList.toggle("above-tabs", st.done);
  // only on the main tab screens – never over sign-up or form footers
  fbk.classList.toggle("off", !st.done || !!st.sub);
  screenEl.classList.toggle("fbk-on", !fbk.hidden && fbk.classList.contains("show") && !fbk.classList.contains("off"));
  fbk.classList.toggle("above-fab", !$("#fab").hidden && screenEl.clientWidth < 360);
}
setTimeout(() => { if (st.fbDismissed) return; fbk.hidden = false; requestAnimationFrame(() => { fbk.classList.add("show"); placeFeedback(); }); }, 25000);
$("#fbx").addEventListener("click", () => { fbk.classList.remove("show"); st.fbDismissed = true; save(); placeFeedback(); setTimeout(() => (fbk.hidden = true), 300); });

async function setupAside() {
  const qrBox = $("#qr");
  if (!qrBox) return;
  const url = location.href.split("#")[0];
  let framed = true; try { framed = window.self !== window.top; } catch { /* cross-origin frame */ }
  if (framed || !/^https?:/.test(url) || /localhost|127\.0\.0\.1/.test(url)) { qrBox.closest(".qrwrap").hidden = true; return; }
  try {
    const { qrSvg } = await import("../vendor/qrcode.js");
    qrBox.innerHTML = qrSvg(url, { size: 112, margin: 2 });
  } catch { qrBox.closest(".qrwrap").hidden = true; }
}
$("#restartBtn")?.addEventListener("click", () => { if (tmp.sheet) closeSheet(); ACTIONS.restart(); });

if ("serviceWorker" in navigator && /^https:/.test(location.protocol)) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); tmp.installPrompt = e; });

/* the app may stay open across midnight (installed on a home screen) */
const dayCheck = () => { if (refreshDays()) { tmp.scrub = null; render(); } };
document.addEventListener("visibilitychange", () => { if (!document.hidden) dayCheck(); });
setInterval(dayCheck, 60000);

/* ---------- boot ---------- */

/** Repair anything in saved state that the current code can't render (old versions, edits, corruption). */
function sanitize() {
  const isObj = (x) => x && typeof x === "object" && !Array.isArray(x);
  const ISO = /^\d{4}-\d{2}-\d{2}$/;
  const clampInt = (v, lo, hi, dflt) => (Number.isInteger(v) && v >= lo && v <= hi ? v : dflt);
  const fresh = initialState();
  for (const k of ["user", "spots", "learn", "statsBase", "nb"]) if (!isObj(st[k])) st[k] = fresh[k];
  for (const k of ["boards", "bookings", "sessions"]) if (!Array.isArray(st[k])) st[k] = [];
  st.boards = st.boards.filter((b) => isObj(b) && typeof b.type === "string");
  st.bookings = st.bookings.filter((b) => isObj(b) && ISO.test(b.iso) && SPOTS[b.spot] && dayIndexOf(b.iso) <= 6);
  st.sessions = st.sessions.filter((s) => isObj(s) && ISO.test(s.iso) && SPOTS[s.spot] && isFinite(s.h) && isFinite(s.p) && [0, 1, 2].includes(s.rating));
  st.ob = clampInt(st.ob, 0, 5, 0);
  st.day = clampInt(st.day, 0, 6, 0); st.fday = clampInt(st.fday, 0, 6, 0);
  st.board = clampInt(st.board, 0, Math.max(0, st.boards.length - 1), 0);
  if (!["spots", "lessons", "bookings", "profile"].includes(st.tab)) st.tab = "spots";
  if (!["edit", "boards", "watch", null].includes(st.sub)) st.sub = null;
  if (!SPOTS[st.fspot]) st.fspot = "carc";
  if (st.spotDetail && !SPOTS[st.spotDetail]) st.spotDetail = null;
  if (!["fc", "guide"].includes(st.ftab)) st.ftab = "fc";
  if (!["lessons", "rental"].includes(st.lmode)) st.lmode = "lessons";
  if (!["up", "past"].includes(st.btab)) st.btab = "up";
}

load();
sanitize();
try {
  render();
} catch (err) {
  // never leave a tester on a blank screen: start fresh instead
  console.warn("Surfletics: saved state could not be shown, starting over.", err);
  resetState(); lastKey = null; render();
}
setupAside();
document.documentElement.classList.add("ready");

export { REASONS };
