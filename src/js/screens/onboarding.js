/* Sign-up flow: welcome + 5 steps. The form parts are reused by "Edit profile". */
import { SPOTLIST, LEVELS, LEVEL_INFO, BOARD_TYPES, DEVICES } from "../data.js";
import { st, tmp } from "../state.js";
import { thisYear } from "../dates.js";
import { boardLabel } from "../model.js";
import { icon } from "../icons.js";
import { esc, backBtn, boardIcon } from "../ui.js";

const req = `<span class="req" aria-hidden="true">*</span>`;
const err = (k) => (tmp.errors[k] ? `<p class="ferr" id="err-${k}">${icon("warn", 16)}${tmp.errors[k]}</p>` : "");
const inv = (k) => (tmp.errors[k] ? `aria-invalid="true" aria-describedby="err-${k}"` : "");

export const STEPS = 5;

/* ---------- reusable field groups ---------- */

export function aboutFields() {
  const u = st.user;
  return `
  <div class="field"><label for="f-name">Name${req}</label>
    <input id="f-name" data-u="name" value="${esc(u.name)}" autocomplete="given-name" enterkeyhint="next" ${inv("name")} required>${err("name")}</div>
  <div class="field"><label for="f-age">Age${req}</label>
    <div class="unit"><input id="f-age" data-u="age" type="number" inputmode="numeric" min="8" max="90" value="${esc(u.age)}" ${inv("age")} required><span aria-hidden="true">years</span></div>${err("age")}</div>
  <fieldset class="field"><legend>Gender</legend><div class="chips wrap">${["Female", "Male", "Non-binary", "Prefer not to say"]
    .map((g) => `<button type="button" class="chip ${u.gender === g ? "on" : ""}" aria-pressed="${u.gender === g}" data-a="gender" data-v="${g}">${g}</button>`).join("")}</div></fieldset>
  <div class="grid2">
    <div class="field"><label for="f-h">Height</label><div class="unit"><input id="f-h" data-u="height" type="number" inputmode="numeric" min="100" max="230" value="${esc(u.height)}" ${inv("height")}><span aria-hidden="true">cm</span></div>${err("height")}</div>
    <div class="field"><label for="f-w">Weight</label><div class="unit"><input id="f-w" data-u="weight" type="number" inputmode="numeric" min="25" max="200" value="${esc(u.weight)}" ${inv("weight")}><span aria-hidden="true">kg</span></div>${err("weight")}</div>
  </div>
  <p class="hint">${icon("info", 16)}Height and weight help us judge which board volume carries you. Both are optional.</p>`;
}

export function levelFields() {
  const u = st.user;
  return `
  <fieldset class="field" ${inv("fitness")}><legend>Fitness${req}</legend>
    <div class="scale5" role="group">${[1, 2, 3, 4, 5].map((i) => `<button type="button" class="${u.fitness === i ? "on" : ""}" aria-pressed="${u.fitness === i}" data-a="fitness" data-v="${i}" aria-label="Fitness ${i} of 5">${i}</button>`).join("")}</div>
    <div class="scale5-l" aria-hidden="true"><span>Rarely active</span><span>Very fit</span></div>${err("fitness")}</fieldset>
  <fieldset class="field" ${inv("level")}><legend>Surf experience${req}</legend>
    <div class="radios">${LEVELS.map((l) => `<button type="button" role="radio" aria-checked="${u.level === l}" class="radio ${u.level === l ? "on" : ""}" data-a="level" data-v="${l}"><span class="rdot" aria-hidden="true"></span><span><b>${l}</b><small>${LEVEL_INFO[l]}</small></span></button>`).join("")}</div>${err("level")}</fieldset>
  <fieldset class="field"><legend>Stance</legend><div class="chips wrap">${[["Regular", "left foot forward"], ["Goofy", "right foot forward"], ["Not sure yet", ""]]
    .map(([g, d]) => `<button type="button" class="chip ${u.stance === g ? "on" : ""}" aria-pressed="${u.stance === g}" data-a="stance" data-v="${g}">${g}${d ? `<small> · ${d}</small>` : ""}</button>`).join("")}</div></fieldset>
  <div class="field"><label for="f-since">Surfing since</label>
    <span class="selwrap"><select id="f-since" data-u="since"><option value="" ${u.since ? "" : "selected"}>Select year</option>${Array.from({ length: 21 }, (_, i) => thisYear - i)
      .map((y) => `<option value="${y}" ${y == u.since ? "selected" : ""}>${y}</option>`).join("")}</select>${icon("down", 18, "caret")}</span></div>`;
}

export function spotFields() {
  const sel = Object.keys(st.spots);
  return `
  <div class="tiles" role="group" aria-label="Spots">${SPOTLIST.map((n) => {
    const on = !!st.spots[n];
    return `<button type="button" class="tile ${on ? "on" : ""}" aria-pressed="${on}" data-a="spot" data-v="${esc(n)}"><span class="tcheck" aria-hidden="true">${on ? icon("check", 14) : icon("plus", 14)}</span><b>${esc(n)}</b></button>`;
  }).join("")}</div>
  ${sel.length ? `<div class="whenlist"><p class="lbl">When did you last surf there?</p>${sel.map((n) => `<label class="whenrow"><span>${esc(n)}</span><span class="selwrap small"><select data-spotwhen="${esc(n)}" aria-label="Last surfed at ${esc(n)}">${["This month", "This year", "1–2 years ago", "Longer ago"].map((o) => `<option ${o === st.spots[n] ? "selected" : ""}>${o}</option>`).join("")}</select>${icon("down", 16, "caret")}</span></label>`).join("")}</div>` : ""}`;
}

export function boardList(editable = true) {
  if (!st.boards.length) return `<p class="hint">${icon("board", 16)}No boards yet. Add the boards you ride – or skip and add them later.</p>`;
  return `<ul class="boardlist">${st.boards.map((b, i) => `<li class="bitem" data-key="b${i}-${esc(b.len)}">${boardIcon(b, 56)}<div class="bmeta"><b>${esc(boardLabel(b))}</b><span>${[b.len, b.w, b.t].filter((x) => x && x !== "–").map(esc).join(" × ")} · ${esc(b.vol)} L</span></div>${editable ? `<button type="button" class="iconbtn sm" data-a="delboard" data-v="${i}" aria-label="Remove ${esc(boardLabel(b))}">${icon("trash", 20)}</button>` : ""}</li>`).join("")}</ul>`;
}

export function boardForm() {
  const nb = st.nb;
  return `
  <form class="addbox" data-form="board" novalidate>
    <p class="addtitle">${icon("plus", 18)}Add a board</p>
    <fieldset class="field"><legend>Type${req}</legend><div class="chips wrap">${BOARD_TYPES.map((t) => `<button type="button" class="chip ${nb.type === t ? "on" : ""}" aria-pressed="${nb.type === t}" data-a="nbtype" data-v="${t}">${t}</button>`).join("")}</div></fieldset>
    <div class="grid2">
      <div class="field"><label for="nb-len">Length${req}</label><input id="nb-len" data-nb="len" placeholder="e.g. 8'0&quot;" value="${esc(nb.len)}" autocomplete="off" ${inv("len")}>${err("len")}</div>
      <div class="field"><label for="nb-vol">Volume${req}</label><div class="unit"><input id="nb-vol" data-nb="vol" type="number" inputmode="decimal" min="15" max="120" placeholder="e.g. 60" value="${esc(nb.vol)}" ${inv("vol")}><span aria-hidden="true">L</span></div>${err("vol")}</div>
      <div class="field"><label for="nb-w">Width</label><input id="nb-w" data-nb="w" placeholder="e.g. 22&quot;" value="${esc(nb.w)}" autocomplete="off"></div>
      <div class="field"><label for="nb-t">Thickness</label><input id="nb-t" data-nb="t" placeholder="e.g. 3&quot;" value="${esc(nb.t)}" autocomplete="off"></div>
    </div>
    <button type="submit" class="btn tonal">${icon("plus", 18)}Add board</button>
  </form>`;
}

export function watchFields() {
  return `<div class="tiles devs" role="group" aria-label="Watch">${DEVICES.map(([d, s]) => {
    const on = st.device === d;
    return `<button type="button" class="tile dev ${on ? "on" : ""}" aria-pressed="${on}" data-a="device" data-v="${d}"><span class="tcheck" aria-hidden="true">${on ? icon("check", 14) : icon("watch", 14)}</span><b>${d}</b><small>${s}</small></button>`;
  }).join("")}</div>`;
}

export function consentField() {
  return `<label class="consent ${tmp.errors.consent ? "invalid" : ""}" for="f-consent"><input type="checkbox" id="f-consent" data-a="consent" ${st.consent ? "checked" : ""} ${inv("consent")}><span>I agree that Surfletics uses my profile, sessions and ratings to personalise my recommendations. I can delete my data at any time.</span></label>${err("consent")}`;
}

/* ---------- the flow ---------- */

function header(n, optional) {
  return `<header class="ob-top">
    ${backBtn("obback", n === 1 ? "Back to welcome" : "Previous step")}
    <div class="prog" role="progressbar" aria-label="Sign-up progress" aria-valuemin="1" aria-valuemax="${STEPS}" aria-valuenow="${n}">${Array.from({ length: STEPS }, (_, i) => `<i class="${i < n ? "on" : ""}"></i>`).join("")}</div>
    ${optional ? `<button type="button" class="textbtn" data-a="obskip">Skip</button>` : `<span class="stepn">${n} of ${STEPS}</span>`}
  </header>`;
}

const foot = (label, action = "obnext", extra = "") => `<div class="ob-foot">${extra}<button type="button" class="btn" data-a="${action}">${label}</button></div>`;

export function renderOnboarding() {
  const s = st.ob;
  if (s === 0) return `<section class="welcome" data-screen="welcome">
    <div class="wtop">
      <img class="wm" src="assets/img/wordmark-white.png" width="230" height="68" alt="Surfletics – match my surf">
      <span class="proto">Prototype</span>
    </div>
    <h1>Your forecast, matched to your level.</h1>
    <ul class="benefits">
      <li>${icon("spots", 22)}<span><b>The right spot and day</b>Every forecast scored for you and your board</span></li>
      <li>${icon("lessons", 22)}<span><b>Lessons that fit</b>Surf schools matched to the conditions you can handle</span></li>
      <li>${icon("spark", 22)}<span><b>Learns with every session</b>Rate how it went and your matches get sharper</span></li>
    </ul>
    <svg class="wwaves" viewBox="0 0 440 230" preserveAspectRatio="none" aria-hidden="true"><path class="w1" d="M0 58 C55 28 110 28 165 54 S275 92 330 62 S410 28 440 42 L440 230 L0 230Z"/><path class="w2" d="M0 104 C66 78 132 82 187 104 S297 132 352 106 S418 84 440 92 L440 230 L0 230Z"/></svg>
    <div class="wfoot">
      <button type="button" class="btn cyan" data-a="obnext">Create my profile</button>
      <button type="button" class="btn ghost-light" data-a="skipdemo">Explore with an example profile</button>
    </div>
  </section>`;

  if (s === 1) return `<section class="ob" data-screen="ob1">${header(1)}
    <h1 id="ob-title">About you</h1><p class="lead">So we can judge which waves and boards suit you.</p>
    <form class="ob-body" data-form="ob" novalidate>${aboutFields()}</form>
    ${foot("Continue")}</section>`;

  if (s === 2) return `<section class="ob" data-screen="ob2">${header(2)}
    <h1>Fitness and surf level</h1><p class="lead">A first guess is fine – after every session the app learns your real level.</p>
    <div class="ob-body">${levelFields()}</div>
    ${foot("Continue")}</section>`;

  if (s === 3) {
    const n = Object.keys(st.spots).length;
    return `<section class="ob" data-screen="ob3">${header(3, true)}
    <h1>Where have you surfed?</h1><p class="lead">Tells the model which conditions you already know. Optional – you can add spots later.</p>
    <div class="ob-body">${spotFields()}</div>
    ${foot(n ? `Continue with ${n} spot${n === 1 ? "" : "s"}` : "Continue")}</section>`;
  }

  if (s === 4) return `<section class="ob" data-screen="ob4">${header(4, true)}
    <h1>Your boards</h1><p class="lead">Before each session you pick a board and every fit score adapts to it. Optional.</p>
    <div class="ob-body">${boardList()}${boardForm()}</div>
    ${foot(st.boards.length ? `Continue with ${st.boards.length} board${st.boards.length === 1 ? "" : "s"}` : "Continue")}</section>`;

  if (s === 5) return `<section class="ob" data-screen="ob5">${header(5)}
    <h1>Connect a watch</h1><p class="lead">A watch counts waves, rides and paddle time, so your ratings get an objective check. Without one you simply rate sessions yourself.</p>
    <div class="ob-body">${watchFields()}
      <p class="lbl spaced">Privacy${req}</p>${consentField()}</div>
    ${foot(st.device ? `Connect ${esc(st.device)} and finish` : "Create my profile", "finish")}</section>`;
  return "";
}
