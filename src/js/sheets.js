/* Bottom sheets (modal dialogs). Each returns {title, body}. */
import { SPOTS, SCHOOLS, RENTALS, INFO } from "./data.js";
import { st, tmp } from "./state.js";
import { DAYS, dayFull, pastLabel } from "./dates.js";
import { fit, cls, clsLabel, clsShort, sweet, currentBoard, boardLabel, schoolFit, bestWindow, fmtKJ } from "./model.js";
import { icon } from "./icons.js";
import { esc, fitBadge, boardSelect } from "./ui.js";
import { ratingForm } from "./screens/bookings.js";

const btnRow = (...b) => `<div class="sheetbtns">${b.join("")}</div>`;
const closeBtn = (label = "Cancel", cls = "sec") => `<button type="button" class="btn ${cls}" data-a="closesheet">${label}</button>`;

export const SHEETS = {
  fitintro: () => ({
    title: "What is the fit score?",
    body: `<div class="fi-hero">${fitBadge(94, "lg")}<p>A number from 0 to 100 that shows how well the <b>conditions</b> at a spot fit <b>you</b> – for free sessions and lessons alike.</p></div>
      <ol class="fisrc">
        <li><b>The forecast</b><span>wave height, period, energy, wind and tide</span></li>
        <li><b>You</b><span>your level, fitness and the board you ride</span></li>
        <li><b>Your ratings</b><span>every session you rate teaches the app what works for you</span></li>
      </ol>
      <ul class="bands" role="list"><li class="f-great"><b>85–100</b>Great fit · go for it</li><li class="f-good"><b>70–84</b>Good fit · a bit outside your sweet spot</li><li class="f-border"><b>50–69</b>Borderline · maybe with a lesson</li><li class="f-bad"><b>under 50</b>Not for you today</li></ul>
      <p class="fineprint left">Surf schools are rated separately, with stars from other surfers.</p>
      ${btnRow(closeBtn("Got it", ""))}`,
  }),

  info: (k) => {
    const sw = sweet(), b = currentBoard(), i = INFO[k];
    const you = { height: `${sw.h[0].toFixed(1)}–${sw.h[1].toFixed(1)} m`, period: `${sw.p[0]}–${sw.p[1]} s`, energy: `${fmtKJ(sw.e[0])}–${fmtKJ(sw.e[1])} kJ`, break: sw.brk, direction: "rights best, lefts good", shape: { Longboard: "mellow to punchy", Shortboard: "punchy to hollow", "Mid-length": "mellow to punchy", "Soft-top": "mellow" }[b?.type] || "mellow to punchy" }[k];
    return {
      title: i.t,
      body: `<div class="explain">${i.body}</div>${you ? `<p class="foryou">${icon("spark", 18)}<span><b>Your sweet spot${b ? ` on your ${esc(boardLabel(b))}` : ""}:</b> ${you}. Surfletics refines this range from your rated sessions.</span></p>` : ""}${btnRow(closeBtn("Got it", ""))}`,
    };
  },

  log: () => {
    const L = tmp.log;
    const err = tmp.errors.logtime ? `<p class="ferr" id="err-logtime">${icon("warn", 16)}${tmp.errors.logtime}</p>` : "";
    return {
      title: "Log a session",
      body: `<p class="sheetsub">${st.device ? `Imported from your ${esc(st.device)} – check it and rate it.` : "Where and when did you surf? Then tell us how it felt."}</p>
      ${st.device ? `<p class="watchbox">${icon("watch", 20)}<span><b>Watch data:</b> 11 waves · longest ride 9 s · 52 min paddling</span></p>` : ""}
      <div class="grid2">
        <div class="field"><label for="lg-spot">Spot</label><span class="selwrap"><select id="lg-spot" data-log="spot">${Object.entries(SPOTS).map(([id, x]) => `<option value="${id}" ${id === L.spot ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select>${icon("down", 18, "caret")}</span></div>
        <div class="field"><label for="lg-date">Day</label><span class="selwrap"><select id="lg-date" data-log="ago">${[0, 1, 2, 3].map((a) => `<option value="${a}" ${a === L.ago ? "selected" : ""}>${pastLabel(a)}</option>`).join("")}</select>${icon("down", 18, "caret")}</span></div>
        <div class="field"><label for="lg-start">Start</label><input id="lg-start" type="time" data-log="start" value="${L.start}" ${tmp.errors.logtime ? 'aria-invalid="true" aria-describedby="err-logtime"' : ""}></div>
        <div class="field"><label for="lg-end">End</label><input id="lg-end" type="time" data-log="end" value="${L.end}" ${tmp.errors.logtime ? 'aria-invalid="true" aria-describedby="err-logtime"' : ""}></div>
      </div>${err}
      ${st.boards.length ? `<div class="field"><label for="lg-board">Board</label><span class="selwrap"><select id="lg-board" data-log="board">${st.boards.map((b, i) => `<option value="${i}" ${i == L.board ? "selected" : ""}>${esc(boardLabel(b))}</option>`).join("")}</select>${icon("down", 18, "caret")}</span></div>` : ""}
      ${ratingForm("log", L)}
      ${btnRow(`<button type="button" class="btn" data-a="logsave" ${L.fit === null ? 'aria-disabled="true"' : ""}>Save session</button>`, closeBtn())}`,
    };
  },

  book: (i) => {
    const sc = SCHOOLS[i], b = schoolFit(sc, st.day), f = b.f, s = SPOTS[b.spot];
    if (tmp.booked) return successSheet();
    const rent = tmp.bookRent;
    return {
      title: sc.name,
      body: `<p class="sheetsub">${dayFull(st.day)} · ${esc(sc.time)} · ${esc(s.name)}${sc.spots ? `<br><span class="flex">${icon("refresh", 14)}Picks the best of ${sc.spots.map((id) => SPOTS[id].short).join(", ")} on the day</span>` : ""}</p>
      <div class="condrow big">${fitBadge(f)}<p><b class="t-${cls(f)}">Conditions: ${clsShort(f)}</b> for you on ${esc(boardLabel(currentBoard()))}<br><small>${s.h[st.day].toFixed(1)} m · ${s.p[st.day]} s · best ${bestWindow(b.spot, st.day).label}</small></p></div>
      <p class="focus">${esc(sc.focus)} · ${esc(sc.levels)}</p>
      <fieldset class="bopts"><legend class="sr">Board</legend>
        ${sc.gear ? `<label><input type="radio" name="bopt" data-a="bookrent" value="0" ${!rent ? "checked" : ""}><span>Board &amp; wetsuit included</span><b>€${sc.price}</b></label>` : `<label><input type="radio" name="bopt" data-a="bookrent" value="0" ${!rent ? "checked" : ""}><span>Bring my own board</span><b>€${sc.price}</b></label><label><input type="radio" name="bopt" data-a="bookrent" value="1" ${rent ? "checked" : ""}><span>Rent board &amp; wetsuit</span><b>€${sc.price + 10}</b></label>`}
      </fieldset>
      <p class="policy">${icon("shield", 16)}Free cancellation until 18:00 the evening before. If the forecast drops, you can move the lesson for free.</p>
      ${btnRow(`<button type="button" class="btn" data-a="confirmbook" data-v="${i}">Book for €${sc.price + (rent && !sc.gear ? 10 : 0)}</button>`, closeBtn())}`,
    };
  },

  rent: (v) => {
    if (tmp.booked) return successSheet();
    const [i, j] = v.split("|").map(Number), r = RENTALS[i], bd = r.boards[j], f = fit(r.spot, st.day);
    return {
      title: `${bd[0]} ${bd[1]}`,
      body: `<p class="sheetsub">${esc(r.name)} · ${esc(SPOTS[r.spot].name)}<br>${dayFull(st.day)} · half day from 09:00</p>
      <div class="condrow big">${fitBadge(f)}<p><b class="t-${cls(f)}">${clsLabel(f)}</b> at ${esc(SPOTS[r.spot].short)} for you<br><small>best window ${bestWindow(r.spot, st.day).label}</small></p></div>
      <p class="policy">${icon("shield", 16)}Reserve now, pay at the shop. Free cancellation until the morning.</p>
      ${btnRow(`<button type="button" class="btn" data-a="confirmrent" data-v="${v}">Reserve for €${bd[2]}</button>`, closeBtn())}`,
    };
  },

  cancel: (id) => {
    const b = st.bookings.find((x) => x.id === id);
    if (!b) return { title: "Booking not found", body: btnRow(closeBtn("Close", "")) };
    return {
      title: "Cancel this booking?",
      body: `<p class="sheetsub">${esc(b.name)} · ${esc(b.time)}<br>You will get a full refund of €${b.price}.</p>${btnRow(`<button type="button" class="btn danger" data-a="confirmcancel" data-v="${id}">Cancel booking</button>`, closeBtn("Keep it"))}`,
    };
  },

  restart: () => ({
    title: "Start over?",
    body: `<p class="sheetsub">This clears the profile, boards, bookings and ratings on this device, and opens the sign-up again.</p>${btnRow(`<button type="button" class="btn danger" data-a="restart">Clear and start over</button>`, closeBtn("Keep my data"))}`,
  }),

  install: () => {
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    const can = !!tmp.installPrompt;
    return {
      title: "Install Surfletics",
      body: `<p class="sheetsub">Use the prototype like a real app: full screen, its own icon, and it works offline.</p>
        ${can ? "" : `<ol class="fisrc">${ios
          ? `<li><b>Tap the Share button</b><span>in Safari’s toolbar</span></li><li><b>Choose “Add to Home Screen”</b><span>scroll down in the share sheet if you don’t see it</span></li><li><b>Open Surfletics from your home screen</b><span>your profile comes along</span></li>`
          : `<li><b>Open the browser menu</b><span>⋮ in Chrome, or the share menu</span></li><li><b>Choose “Install app” or “Add to Home screen”</b><span>the wording depends on your browser</span></li><li><b>Open Surfletics from your home screen</b><span>your profile comes along</span></li>`}</ol>`}
        ${btnRow(can ? `<button type="button" class="btn" data-a="installnow">${icon("phone", 18)}Install now</button>` : "", closeBtn(can ? "Not now" : "Got it", can ? "sec" : ""))}`,
    };
  },

  about: () => ({
    title: "About this prototype",
    body: `<div class="explain"><p>Surfletics is a clickable prototype. Everything you enter stays in this browser.</p>
      <p><b>Example data:</b> forecasts, surf schools, rental shops, prices and reviews are invented for the demo. Spot guides are summarised from public surf guides and are not safety advice.</p>
      <p><b>Two versions:</b> the full app, and phase 1 (MVP) where lessons and rental are still “coming soon”.</p></div>
      <div class="modesw" role="group" aria-label="App version"><button type="button" class="${!st.mvp ? "on" : ""}" aria-pressed="${!st.mvp}" data-a="mode" data-v="full">Full version</button><button type="button" class="${st.mvp ? "on" : ""}" aria-pressed="${st.mvp}" data-a="mode" data-v="mvp">Phase 1 (MVP)</button></div>
      ${btnRow(closeBtn("Close", ""))}`,
  }),
};

/** Embedded previews (iframes) block file downloads, so the calendar button is hidden there. */
const framed = () => { try { return window.self !== window.top; } catch { return true; } };

function successSheet() {
  const b = tmp.booked, d = DAYS.findIndex((x) => x.iso === b.iso);
  return {
    title: b.kind === "rental" ? "Board reserved" : "Lesson booked",
    body: `<div class="success"><span class="tick" aria-hidden="true">${icon("check", 34)}</span>
      <p><b>${esc(b.name)}</b><br>${dayFull(Math.max(0, d))} · ${esc(b.time)} · ${esc(SPOTS[b.spot].short)}</p></div>
      <p class="policy">${icon("bell", 16)}We re-check the forecast every morning and tell you if a better day comes up.</p>
      ${btnRow(`<button type="button" class="btn" data-a="viewbooking">View booking</button>`, framed() ? closeBtn("Done") : `<button type="button" class="btn sec" data-a="ics" data-v="${b.id}">${icon("cal", 18)}Add to calendar</button>`)}`,
  };
}

export { boardSelect };
