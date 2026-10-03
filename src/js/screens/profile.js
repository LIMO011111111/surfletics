/* Profile tab: who you are, your sweet spot per board, quiver, sessions, settings. */
import { SPOTS, EXAMPLE, FEEDBACK_URL } from "../data.js";
import { st } from "../state.js";
import { dayFull } from "../dates.js";
import { sweet, currentBoard, bestUpcoming, fmtKJ } from "../model.js";
import { icon } from "../icons.js";
import { esc, boardSelect, infoBtn, boardIcon, backBtn, fitBadge, plural } from "../ui.js";
import { sessionRows } from "./bookings.js";
import { aboutFields, levelFields, spotFields, boardList, boardForm, watchFields } from "./onboarding.js";

const initials = (n) => String(n).trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase() || "?";

export function stats() {
  const n = st.statsBase.sessions + st.sessions.length;
  const waves = st.statsBase.waves + st.sessions.reduce((a, s) => a + (s.waves || 0), 0);
  const rated = st.sessions.length;
  const right = rated ? Math.round((st.sessions.filter((s) => s.rating === 1).length / rated) * 100) : null;
  return { n, waves, right, spots: Object.keys(st.spots).length };
}

/** How many sessions the sweet spot for this board type is based on. */
function learnedFrom(type) {
  const own = st.sessions.filter((s) => s.boardType === type).length;
  const base = st.example ? { Longboard: 11, "Mid-length": 8, Shortboard: 4, "Soft-top": 3 }[type] || 0 : 0;
  return own + base;
}

function sweetCard() {
  const b = currentBoard(), sw = sweet(b), n = b ? learnedFrom(b.type) : 0;
  const scale = (lo, hi, min, max) => ({ l: Math.max(0, ((lo - min) / (max - min)) * 100), w: Math.max(4, ((hi - lo) / (max - min)) * 100) });
  const H = scale(sw.h[0], sw.h[1], 0, 3), P = scale(sw.p[0], sw.p[1], 5, 17), E = scale(sw.e[0], sw.e[1], 0, 2000);
  const type = b?.type || "";
  const shp = { Longboard: [0, 45, "Mellow to punchy"], "Mid-length": [0, 65, "Mellow to punchy"], Shortboard: [40, 100, "Punchy to hollow"], "Soft-top": [0, 30, "Mellow"] }[type] || [0, 50, "Mellow to punchy"];
  const SH = scale(shp[0], shp[1], 0, 100);
  const bfit = { Longboard: [3, 1, 2], "Mid-length": [3, 2, 1], Shortboard: [2, 3, 3], "Soft-top": [3, 0, 0] }[type] || [3, 1, 1];
  const words = ["Avoid", "OK", "Good", "Best"];
  const bar = (key, label, X, val, ticks) => `<div class="swrow"><dt>${label}${infoBtn(key, `What does ${label.toLowerCase()} mean?`)}</dt><dd><span class="swbar" aria-hidden="true"><i style="left:${X.l}%;width:${X.w}%"></i></span><span class="swticks" aria-hidden="true">${ticks.map((t) => `<span>${t}</span>`).join("")}</span><b>${val}</b></dd></div>`;
  const tiles = (arr) => arr.map(([n, l]) => `<span class="lvt l${l}"><b>${n}</b><small>${words[l]}</small></span>`).join("");
  return `<article class="card sweet" aria-labelledby="sw-h">
    <header class="sw-head"><h2 id="sw-h" class="sectitle inline">Your sweet spot</h2>${boardSelect("pf-board", true)}</header>
    <p class="swsrc">${icon(n ? "spark" : "info", 16)}${n ? `Learned from ${plural(n, "session")} on your ${esc(type.toLowerCase())}${sw.learned ? ` · adjusted ${sw.learned > 0 ? "+" : ""}${sw.learned.toFixed(1)} m by your ratings` : ""}` : b ? "Starting estimate from your level – rate sessions to personalise it" : "Add a board to see your sweet spot per board"}</p>
    <dl class="swlist">
      ${bar("height", "Wave height", H, `${sw.h[0].toFixed(1)}–${sw.h[1].toFixed(1)} m`, ["0", "1", "2", "3 m"])}
      ${bar("period", "Period", P, `${sw.p[0]}–${sw.p[1]} s`, ["5", "9", "13", "17 s"])}
      ${bar("energy", "Energy", E, `${fmtKJ(sw.e[0])}–${fmtKJ(sw.e[1])} kJ`, ["0", "", "1k", "2k kJ"])}
      ${bar("shape", "Wave shape", SH, shp[2], ["mellow", "", "punchy", "hollow"])}
      <div class="swrow tiles3"><dt>Break${infoBtn("break", "What does break mean?")}</dt><dd class="lvts">${tiles([["Beach", bfit[0]], ["Reef", bfit[1]], ["Point", bfit[2]]])}</dd></div>
      <div class="swrow tiles3"><dt>Direction${infoBtn("direction", "What does wave direction mean?")}</dt><dd class="lvts two">${tiles([["Lefts", 2], ["Rights", 3]])}</dd></div>
    </dl>
  </article>`;
}

export function renderProfile() {
  if (st.sub) return renderSub();
  const u = st.user, S = stats(), best = bestUpcoming(0, 3);
  const meta = [u.age ? `${u.age}\u00a0y` : "", u.height ? `${u.height}\u00a0cm` : "", u.weight ? `${u.weight}\u00a0kg` : "", u.stance && u.stance !== "Not sure yet" ? `${u.stance}\u00a0foot` : ""].filter(Boolean).join(" · ");
  return `<section data-screen="profile">
  <header class="phero">
    <div class="prow"><span class="avatar" aria-hidden="true">${esc(initials(u.name))}</span>
      <div class="pname"><h1>${esc(u.name || "Surfer")}</h1><p>${u.since ? `Surfing since ${u.since}` : "New to surfing"}${meta ? ` · ${meta}` : ""}</p></div>
      <span class="lvlbadge">${esc(u.level || "–")}</span></div>
    <dl class="pstats">
      <div><dd>${S.n}</dd><dt>sessions</dt></div>
      <div><dd>${S.spots}</dd><dt>spots</dt></div>
      <div><dd>${S.waves || "–"}</dd><dt>waves</dt></div>
      <div><dd>${S.right === null ? "–" : S.right + "%"}</dd><dt>right fit</dt></div>
    </dl>
    <button type="button" class="btn sm ghost-light" data-a="sub" data-v="edit">${icon("edit", 16)}Edit profile</button>
  </header>
  <div class="screen-pad">
  ${!S.n ? `<button type="button" class="promo first" data-a="logopen"><span class="promoic">${icon("spark", 22)}</span><span><b>Rate your first session</b><small>Tell us how a surf went and your fit scores start learning.</small></span>${icon("chev", 20, "chev")}</button>` : ""}
  ${sweetCard()}
  <div class="listhead"><h2>My quiver</h2><button type="button" class="textbtn" data-a="sub" data-v="boards">Manage</button></div>
  <div class="hscroll quiver" role="group" aria-label="Pick today’s board">${st.boards.map((b, i) => `<button type="button" class="qcard ${i == st.board ? "on" : ""}" aria-pressed="${i == st.board}" data-a="pickboard" data-v="${i}">${boardIcon(b, 70)}<span><b>${esc(b.type)}</b><small>${esc(b.len)}${b.vol ? ` · ${esc(b.vol)} L` : ""}</small>${i == st.board ? `<em>Today</em>` : ""}</span></button>`).join("")}<button type="button" class="qcard add" data-a="sub" data-v="boards">${icon("plus", 22)}<span><b>Add board</b></span></button></div>
  ${best && best.f >= 70 ? `<button type="button" class="reco" data-a="openspot" data-v="${best.spot}|${best.d}">${fitBadge(best.f)}<span><small>Your best match in the next days</small><b>${esc(SPOTS[best.spot].name)}, ${dayFull(best.d)}</b></span>${icon("chev", 20, "chev")}</button>` : ""}
  <div class="listhead"><h2>Recent sessions</h2>${st.sessions.length ? `<button type="button" class="textbtn" data-a="allsessions">See all</button>` : ""}</div>
  ${sessionRows(3) || `<p class="hint">${icon("wave", 16)}No sessions yet. Use “Log session” on the Spots tab after your next surf.</p>`}
  <h2 class="sectitle">Settings</h2>
  <ul class="settings" role="list">
    <li><button type="button" data-a="sub" data-v="edit">${icon("profile", 20)}<span>Personal details & level</span>${icon("chev", 18, "chev")}</button></li>
    <li><button type="button" data-a="sub" data-v="boards">${icon("board", 20)}<span>Boards</span><small>${st.boards.length}</small>${icon("chev", 18, "chev")}</button></li>
    <li><button type="button" data-a="sub" data-v="watch">${icon("watch", 20)}<span>Watch</span><small>${esc(st.device || "Not connected")}</small>${icon("chev", 18, "chev")}</button></li>
    ${matchMedia("(display-mode: standalone)").matches ? "" : `<li><button type="button" data-a="install">${icon("phone", 20)}<span>Install as an app</span>${icon("chev", 18, "chev")}</button></li>`}
    <li><a href="${FEEDBACK_URL}" target="_blank" rel="noopener">${icon("chat", 20)}<span>Send feedback on the prototype</span>${icon("external", 18, "chev")}</a></li>
    <li><button type="button" data-a="about">${icon("info", 20)}<span>About this prototype</span>${icon("chev", 18, "chev")}</button></li>
    <li><button type="button" class="danger" data-a="restartask">${icon("refresh", 20)}<span>Start over</span></button></li>
  </ul>
  <p class="fineprint">Surfletics prototype · all schools, prices and forecasts are examples.</p>
  </div>
  </section>`;
}

function renderSub() {
  const title = { edit: "Edit profile", boards: "Your boards", watch: "Watch" }[st.sub];
  const body = {
    edit: () => `<form class="ob-body" data-form="ob" novalidate>${aboutFields()}<button type="submit" class="sr" tabindex="-1" aria-hidden="true">Continue</button></form>${levelFields()}<h2 class="sectitle">Spots you know</h2>${spotFields()}`,
    boards: () => `${boardList()}${boardForm()}`,
    watch: () => `<p class="lead">A watch counts waves and paddle time, so your ratings get an objective check.</p>${watchFields()}`,
  }[st.sub]();
  return `<section class="screen-pad" data-screen="sub-${st.sub}">
    <header class="subhead">${backBtn("subdone", "Back to profile")}<h1>${title}</h1></header>
    <div class="ob-body">${body}</div>
    <div class="ob-foot"><button type="button" class="btn" data-a="subdone">Done</button></div>
  </section>`;
}

export { EXAMPLE };
