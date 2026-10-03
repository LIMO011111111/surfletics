/* Lessons tab: surf schools and board rental, both scored for the user. */
import { SPOTS, SCHOOLS, RENTALS } from "../data.js";
import { st } from "../state.js";
import { dayNameLong } from "../dates.js";
import { fit, cls, clsShort, schoolFit, levelMatch, recBoard, bestWindow } from "../model.js";
import { icon } from "../icons.js";
import { esc, fitBadge, boardSelect, dayChips, seg, plural } from "../ui.js";

const soon = (what) => `<div class="soonbar"><div><span class="pill">Coming soon</span><b>${what} launches soon</b><small>A preview of the partners we are onboarding.</small></div>
  <button type="button" class="btn sm ${st.notify ? "done" : "cyan"}" data-a="notify" aria-pressed="${st.notify}">${st.notify ? `${icon("check", 16)}Notified` : `${icon("bell", 16)}Notify me`}</button></div>`;

function head() {
  return `<header class="pagehead"><div><p class="eyebrow">Cascais coast · ${dayNameLong(st.day)}</p><h1>${st.lmode === "rental" ? "Board rental" : "Surf lessons"}</h1></div>
    <img class="appglyph" src="assets/img/icon.svg" width="36" height="36" alt=""></header>
  ${seg([["lessons", "Lessons"], ["rental", "Board rental"]], st.lmode, "lmode", "Show lessons or board rental")}
  ${dayChips(st.day)}`;
}

export function renderLessons() {
  if (st.lmode === "rental") return renderRental();
  const d = st.day, f = st.lfilter;
  let list = SCHOOLS.map((sc, i) => { const b = schoolFit(sc, d); return { ...sc, i, at: b.spot, f: b.f, lm: levelMatch(sc.levels) }; })
    .filter((x) => !st.vidOnly || x.video);
  if (f === "fit") list.sort((a, b) => (b.lm !== false) - (a.lm !== false) || b.f - a.f);
  if (f === "price") list.sort((a, b) => a.price - b.price);
  if (f === "rating") list.sort((a, b) => b.rating - a.rating);

  const sorts = [["fit", "Best for you"], ["price", "Lowest price"], ["rating", "Top rated"]];
  return `<section class="screen-pad" data-screen="lessons">${head()}
  <div class="toolbar">${boardSelect("ls-board")}</div>
  <div class="hscroll chips" role="group" aria-label="Sort and filter">${sorts.map(([k, l]) => `<button type="button" class="chip ${f === k ? "on" : ""}" aria-pressed="${f === k}" data-a="lfilter" data-v="${k}">${l}</button>`).join("")}<span class="chipdiv" aria-hidden="true"></span><button type="button" class="chip ${st.vidOnly ? "on" : ""}" aria-pressed="${st.vidOnly}" data-a="vidonly">${icon("video", 16)}Video analysis</button></div>
  ${st.mvp ? soon("Lesson booking") : ""}
  <div class="listhead"><h2>${plural(list.length, "lesson")}</h2><span class="muted">Fit = conditions during the lesson</span></div>
  <div class="cards ${st.mvp ? "preview" : ""}">${list.map((x) => lessonCard(x, d)).join("") || `<p class="hint">No lessons match this filter.</p>`}</div>
  </section>`;
}

function lessonCard(x, d) {
  const where = SPOTS[x.at].short;
  const feats = [
    x.lm === null ? `<li>${icon("profile", 16)}${esc(x.levels)}</li>` : x.lm ? `<li class="ok">${icon("check", 16)}${esc(x.levels)}</li>` : `<li class="no">${icon("close", 16)}${esc(x.levels)} only</li>`,
    x.gear ? `<li>${icon("board", 16)}Board &amp; wetsuit included</li>` : `<li class="warn">${icon("board", 16)}Bring your own board</li>`,
    x.video ? `<li>${icon("video", 16)}Video analysis</li>` : "",
    { car: `<li class="warn">${icon("car", 16)}Own car needed</li>`, pickup: `<li>${icon("bus", 16)}Pick-up from Lisbon</li>`, train: `<li>${icon("train", 16)}Reachable by train</li>` }[x.travel] || "",
  ].join("");
  return `<article class="lcard" data-key="school-${x.id}" aria-labelledby="ln-${x.id}">
    <header class="lc-head"><div><h3 id="ln-${x.id}">${esc(x.name)}</h3><p class="rmeta">${esc(x.time)} · ${esc(x.what)}</p></div>
      <p class="lc-rate" aria-label="Rated ${x.rating} out of 5 from ${x.n} reviews">${icon("star", 15)}<b>${x.rating}</b><small>${x.n}</small></p></header>
    <div class="condrow">${fitBadge(x.f, "sm")}<p><b>${x.spots ? `Goes to the best spot: ${esc(where)}` : `At ${esc(where)}`}</b> – ${clsShort(x.f)} for you during the lesson</p></div>
    <p class="focus">${esc(x.focus)}</p>
    <ul class="feats" role="list">${feats}</ul>
    <footer class="lc-foot"><p class="lc-price"><b>€${x.price}</b><small>per person</small></p>
      ${st.mvp ? `<button type="button" class="btn sm muted" data-a="notify">Coming soon</button>` : `<button type="button" class="btn sm" data-a="book" data-v="${x.i}">Book</button>`}</footer>
  </article>`;
}

function renderRental() {
  const d = st.day, rec = recBoard();
  const list = RENTALS.map((r, i) => ({ ...r, i, f: fit(r.spot, d) })).sort((a, b) => b.f - a.f);
  return `<section class="screen-pad" data-screen="rental">${head()}
  ${st.mvp ? soon("Board rental") : ""}
  <div class="recbox">${icon("spark", 18)}<p>Recommended for ${esc((st.user.level || "your level").toLowerCase())}: <b>${rec}</b></p></div>
  <div class="listhead"><h2>${plural(list.length, "shop")} near the spots</h2><span class="muted">Sorted by fit</span></div>
  <div class="cards ${st.mvp ? "preview" : ""}">${list.map((x) => `<article class="lcard" data-key="rent-${x.id}" aria-labelledby="rn-${x.id}">
    <header class="lc-head"><div><h3 id="rn-${x.id}">${esc(x.name)}</h3><p class="rmeta">${esc(SPOTS[x.spot].short)} · ${x.wet ? "wetsuits available" : "boards only"}</p></div>
      <p class="lc-rate" aria-label="Rated ${x.rating} out of 5 from ${x.n} reviews">${icon("star", 15)}<b>${x.rating}</b><small>${x.n}</small></p></header>
    <div class="condrow">${fitBadge(x.f, "sm")}<p><b>${esc(SPOTS[x.spot].short)} ${dayNameLong(d).toLowerCase()}</b> – ${clsShort(x.f)} for you, best ${bestWindow(x.spot, d).label}</p></div>
    <ul class="rboards" role="list">${x.boards.map((b, j) => `<li class="rb ${b[0] === rec ? "rec" : ""}"><span class="rbn"><b>${b[0]} ${b[1]}</b><small>${b[3]}${b[0] === rec ? " · best for you" : ""}</small></span><span class="rbp"><b>€${b[2]}</b><small>half day</small></span>${st.mvp ? `<button type="button" class="btn xs muted" data-a="notify" aria-label="Coming soon">Soon</button>` : `<button type="button" class="btn xs" data-a="rent" data-v="${x.i}|${j}" aria-label="Reserve ${b[0]} ${b[1]} at ${esc(x.name)}">Reserve</button>`}</li>`).join("")}</ul>
  </article>`).join("")}</div>
  </section>`;
}

export { cls };
