/* Bookings tab: upcoming lessons/rentals, ratings and session history. */
import { SPOTS, FIT_OPTS, REASONS } from "../data.js";
import { st, tmp } from "../state.js";
import { DAYS, dayFull, dayName, pastLabel } from "../dates.js";
import { fit, cls, clsLabel, energy, fmtKJ } from "../model.js";
import { icon, starIcon } from "../icons.js";
import { esc, fitBadge, fitRing, seg, dayIndexOf, emptyState } from "../ui.js";

/** fit of a booking on its day (null when it is in the past) */
export function bookingFit(b) {
  const d = dayIndexOf(b.iso);
  if (d < 0 || d > 6) return null;
  return fit(b.spot, d, b.off || 0);
}
export const upcoming = () => st.bookings.filter((b) => b.status === "up" && dayIndexOf(b.iso) >= 0).sort((a, b) => a.iso.localeCompare(b.iso));
export const toRate = () => st.bookings.filter((b) => (b.status === "up" && dayIndexOf(b.iso) < 0) || b.status === "done").sort((a, b) => b.iso.localeCompare(a.iso));

/** A better day at the same spot within the forecast window, if any. */
function betterDay(b, cur) {
  let best = null;
  for (let d = 0; d < 7; d++) {
    const f = fit(b.spot, d, b.off || 0);
    if (f >= cur + 10 && (!best || f > best.f)) best = { d, f };
  }
  return best;
}

function upCard(b) {
  const d = dayIndexOf(b.iso), f = bookingFit(b), better = f < 70 ? betterDay(b, f) : null;
  return `<article class="bcard" data-key="bk-${b.id}" aria-labelledby="bk-${b.id}">
    <header class="bc-top"><div><span class="bkind">${b.kind === "rental" ? "Board rental" : "Lesson"}</span><h3 id="bk-${b.id}">${esc(b.name)}</h3><p>${dayFull(d)} · ${esc(b.time)} · ${esc(SPOTS[b.spot].short)}</p></div>${fitRing(f, 60)}</header>
    <dl class="bc-rows"><div><dt>${b.kind === "rental" ? "Board" : "Gear"}</dt><dd>${esc(b.extra)}</dd></div><div><dt>${b.kind === "rental" ? "Pay at the shop" : "Paid"}</dt><dd>€${b.price}</dd></div></dl>
    ${f >= 70
      ? `<p class="bc-ok">${icon("shield", 18)}<span><b>Still a ${clsLabel(f).toLowerCase()}.</b> Forecast re-checked this morning.</span></p>`
      : better
        ? `<div class="bc-warn">${icon("warn", 18)}<span><b>Conditions dropped to ${f}.</b> ${dayName(better.d)} looks better for you (fit ${better.f}). Moving is free.</span><button type="button" class="btn xs" data-a="movebook" data-v="${b.id}|${better.d}">Move to ${dayName(better.d)}</button></div>`
        : `<p class="bc-warn">${icon("warn", 18)}<span><b>Conditions look ${clsLabel(f).toLowerCase()}.</b> You can cancel for free until the evening before.</span></p>`}
    <footer class="bc-actions"><button type="button" class="textbtn" data-a="cancelbook" data-v="${b.id}">Cancel booking</button><button type="button" class="textbtn subtle" data-a="markdone" data-v="${b.id}" title="Prototype shortcut: skip to after the lesson">Demo: finish it ${icon("chev", 14)}</button></footer>
  </article>`;
}

/* ---------- rating ---------- */
export function ratingForm(prefix, r) {
  return `<fieldset class="rq"><legend>Did the conditions fit your level?<span class="reqtag">required</span></legend>
    <div class="fitopts" role="radiogroup">${FIT_OPTS.map((o, i) => `<button type="button" role="radio" aria-checked="${r.fit === i}" class="${r.fit === i ? "on" : ""}" data-a="${prefix}fit" data-v="${i}">${icon(i === 0 ? "down" : i === 1 ? "check" : "warn", 18)}${o}</button>`).join("")}</div></fieldset>
  ${r.fit !== null && r.fit !== undefined ? `<fieldset class="rq"><legend>${REASONS[r.fit].q}<span class="opttag">optional</span></legend><div class="chips wrap sm">${REASONS[r.fit].r.map((x) => `<button type="button" class="chip ${r.reasons.includes(x) ? "on" : ""}" aria-pressed="${r.reasons.includes(x)}" data-a="${prefix}reason" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div></fieldset>` : ""}
  <fieldset class="rq"><legend>${prefix === "rate" ? "How was the school?" : "Overall session"}<span class="opttag">optional</span></legend>
    <div class="stars" role="radiogroup">${[1, 2, 3, 4, 5].map((i) => `<button type="button" role="radio" aria-checked="${r.stars === i}" data-a="${prefix}star" data-v="${i}" aria-label="${i} star${i > 1 ? "s" : ""}">${starIcon(i <= r.stars, 30)}</button>`).join("")}</div></fieldset>`;
}

function rateCard(b) {
  const r = tmp.rate && tmp.rate.id === b.id ? tmp.rate : (tmp.rate = { id: b.id, fit: null, reasons: [], stars: 0 });
  const boardTxt = b.kind === "rental" ? b.extra.replace("Rental: ", "") : b.extra;
  return `<article class="card ratecard" data-key="rate-${b.id}" aria-labelledby="rt-${b.id}">
    <h3 id="rt-${b.id}">How was ${b.kind === "rental" ? "your session" : "your lesson"}?</h3>
    <p class="rmeta">${esc(b.name)} · ${esc(SPOTS[b.spot].short)} · ${pastLabel(-dayIndexOf(b.iso))} · ${esc(boardTxt)}</p>
    <p class="auto">${icon("check", 16)}Spot, time and board filled in from your booking</p>
    ${st.device ? `<p class="watchbox">${icon("watch", 20)}<span><b>${esc(st.device)} synced:</b> 14 waves · longest ride 12 s · 48 min paddling</span></p>` : ""}
    ${ratingForm("rate", r)}
    <button type="button" class="btn" data-a="saverate" data-v="${b.id}" ${r.fit === null ? "aria-disabled=\"true\"" : ""}>Save rating</button>
    ${r.fit === null ? `<p class="hint center">Pick one answer to save.</p>` : `<p class="hint">${icon("spark", 16)}Every rating fine-tunes your sweet spot.</p>`}
  </article>`;
}

/* ---------- history ---------- */
export function sessionRows(limit) {
  const rows = st.sessions.slice().sort((a, b) => b.iso.localeCompare(a.iso)).slice(0, limit || 999);
  if (!rows.length) return "";
  return `<ul class="sessions" role="list">${rows.map((s) => `<li class="sess" data-key="s-${s.id}">${fitBadge(s.score, "sm")}
    <div class="smain"><b>${esc(SPOTS[s.spot]?.name || s.spot)}</b><span>${pastLabel(-dayIndexOf(s.iso))} · ${s.h.toFixed(1)} m, ${s.p} s, ${fmtKJ(energy(s.h, s.p))} kJ · ${esc(s.board)}</span></div>
    <div class="srate"><span class="t-${["easy", "right", "hard"][s.rating]}">${FIT_OPTS[s.rating]}</span>${s.stars ? `<span class="minis" aria-label="${s.stars} of 5 stars">${[1, 2, 3, 4, 5].map((i) => starIcon(i <= s.stars, 12)).join("")}</span>` : ""}</div></li>`).join("")}</ul>`;
}

export function renderBookings() {
  const up = upcoming(), rate = toRate();
  const tab = st.btab;
  let body;
  if (tab === "past") {
    body = `${!st.mvp && rate.length ? rateCard(rate[0]) + (rate.length > 1 ? `<p class="hint">${rate.length - 1} more to rate after this one.</p>` : "") : ""}
    <div class="listhead"><h2>Sessions</h2><button type="button" class="textbtn" data-a="logopen">${icon("plus", 16)}Log a session</button></div>
    ${sessionRows() || emptyState("wave", "No sessions yet", "Log a surf or finish a booked lesson. Each rating teaches the app your sweet spot.", `<button type="button" class="btn sm" data-a="logopen">Log a session</button>`)}`;
  } else if (st.mvp) {
    body = `<article class="waitlist"><span class="pill">Coming soon</span><h2>Book lessons that fit your level</h2>
      <p>We are onboarding surf schools on the Cascais coast and in Ericeira. Soon you can book the right lesson, on the right day, at the right spot.</p>
      <button type="button" class="btn ${st.notify ? "done" : "cyan"}" data-a="notify" aria-pressed="${st.notify}">${st.notify ? `${icon("check", 18)}We’ll let you know` : `${icon("bell", 18)}Notify me when lessons launch`}</button></article>`;
  } else {
    body = up.length ? up.map(upCard).join("") : emptyState("cal", "No upcoming bookings", "Find a lesson or reserve a board – we re-check the forecast for you every morning.", `<button type="button" class="btn sm" data-a="tab" data-v="lessons">Find a lesson</button>`);
  }
  return `<section class="screen-pad" data-screen="bookings">
    <header class="pagehead"><div><p class="eyebrow">${DAYS[0].wdLong}, ${DAYS[0].dm}</p><h1>Bookings</h1></div><img class="appglyph" src="assets/img/icon.svg" width="36" height="36" alt=""></header>
    ${seg([["up", "Upcoming", !st.mvp && up.length ? up.length : ""], ["past", "Past & ratings", !st.mvp && rate.length ? `${rate.length} to rate` : ""]], tab, "btab", "Bookings")}
    <h2 class="sr">${tab === "past" ? "Past sessions and ratings" : "Upcoming bookings"}</h2>
    <div class="stack">${body}</div>
  </section>`;
}

export { cls };
