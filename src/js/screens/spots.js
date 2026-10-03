/* Spots tab: Discover (map + ranked list), spot forecast and spot guide. */
import { SPOTS, GUIDE, WATER } from "../data.js";
import { st, tmp } from "../state.js";
import { DAYS, dayName, dayNameLong, dayFull, toHHMM, sun } from "../dates.js";
import { fit, cls, clsLabel, clsShort, energy, fmtKJ, bestWindow, dayCurve, fitAt, tideLevel, tideTimes, paddleDifficulty } from "../model.js";
import { icon } from "../icons.js";
import { esc, fitBadge, fitRing, boardSelect, dayChips, mapSvg, backBtn, infoBtn, plural } from "../ui.js";

const ranked = (d) => Object.keys(SPOTS).map((id) => ({ id, s: SPOTS[id], f: fit(id, d) })).sort((a, b) => b.f - a.f);

export function renderDiscover() {
  const d = st.day, list = ranked(d);
  const great = list.filter((x) => x.f >= 85).length, good = list.filter((x) => x.f >= 70).length;
  const head = great ? `${plural(great, "great fit")} ${d === 0 ? "today" : d === 1 ? "tomorrow" : "on " + DAYS[d].wdLong}` : good ? `${plural(good, "good fit")} ${d === 0 ? "today" : d === 1 ? "tomorrow" : "on " + DAYS[d].wdLong}` : `No spot fits you ${d === 0 ? "today" : dayNameLong(d).toLowerCase()}`;
  return `<section class="screen-pad" data-screen="discover">
  <header class="pagehead">
    <div><p class="eyebrow">Cascais coast · ${esc(st.user.level || "all levels")}</p><h1>Best spots for you</h1></div>
    <img class="appglyph" src="assets/img/icon.svg" width="36" height="36" alt="">
  </header>
  <div class="toolbar">${boardSelect("disc-board")}</div>
  ${dayChips(d)}
  <div class="mapcard">${mapSvg(list.map((x) => ({ id: x.id, v: x.f })))}</div>
  <div class="listhead"><h2>${head}</h2>${infoBtn("fitintro", "What is the fit score?")}</div>
  <ul class="rows" role="list">${list.map((x) => {
    const w = bestWindow(x.id, d), s = x.s;
    return `<li data-key="spot-${x.id}"><button type="button" class="row" data-a="pin" data-v="${x.id}">${fitBadge(x.f)}
      <span class="rmain"><b>${esc(s.name)}</b><span class="rmeta">${s.h[d].toFixed(1)} m · ${s.p[d]} s · ${fmtKJ(energy(s.h[d], s.p[d]))} kJ · ${esc(s.brk)}</span>
      <span class="rtags"><span class="tag t-${cls(x.f)}">${clsLabel(x.f)}</span>${x.f >= 50 ? `<span class="tag">${icon("clock", 13)}Best ${w.label}</span>` : ""}</span></span>
      ${icon("chev", 20, "chev")}</button></li>`;
  }).join("")}</ul>
  <button type="button" class="promo" data-a="tab" data-v="lessons"><span class="promoic">${icon("lessons", 22)}</span><span><b>Lessons at these spots</b><small>${st.mvp ? "Coming soon: book a lesson that fits your level." : "Compare surf schools matched to the conditions."}</small></span>${icon("chev", 20, "chev")}</button>
  <p class="fineprint">Example forecast for the prototype – not real conditions.</p>
  </section>`;
}

/* ---------- the day curve (signature chart) ---------- */
function curveChart(id, d) {
  const pts = dayCurve(id, d), w = bestWindow(id, d), { rise, set } = sun(d);
  const W = 320, H = 96, x0 = rise, x1 = set;
  const X = (m) => ((m - x0) / (x1 - x0)) * W;
  const Y = (f) => H - 6 - ((Math.max(30, f) - 30) / 70) * (H - 14);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${X(p.m).toFixed(1)},${Y(p.f).toFixed(1)}`).join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;
  const tide = pts.map((p, i) => `${i ? "L" : "M"}${X(p.m).toFixed(1)},${(H - 10 - (tideLevel(id, d, p.m) + 1) * 0.5 * (H * 0.42)).toFixed(1)}`).join(" ");
  const scrubM = tmp.scrub?.key === `${id}-${d}` ? tmp.scrub.m : Math.round((w.from + w.to) / 2 / 15) * 15;
  const sf = fitAt(id, d, scrubM) ?? 0, lvl = tideLevel(id, d, scrubM);
  const tideWord = lvl < -0.6 ? "low tide" : lvl > 0.6 ? "high tide" : (tideLevel(id, d, scrubM + 30) > lvl ? "rising tide" : "falling tide");
  const windWord = scrubM > 840 && SPOTS[id].windBuild > 0.6 ? "wind picking up" : scrubM > 870 ? "breeze" : "light wind";
  const ticks = [];
  for (let m = Math.ceil(x0 / 180) * 180; m < x1; m += 180) if (m - x0 > 110 && x1 - m > 110) ticks.push(m);
  return `<div class="curve" style="--best-l:${(X(w.from) / W * 100).toFixed(2)}%;--best-w:${((X(w.to) - X(w.from)) / W * 100).toFixed(2)}%;--scrub:${(X(scrubM) / W * 100).toFixed(2)}%">
    <div class="curvehead"><span><b>${toHHMM(scrubM)}</b> · fit ${sf} · ${tideWord}, ${windWord}</span>${infoBtn("curve", "How the day curve works")}</div>
    <div class="curvebox">
      <div class="bestband" aria-hidden="true"></div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <defs><linearGradient id="cfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--cyan)" stop-opacity=".45"/><stop offset="1" stop-color="var(--cyan)" stop-opacity="0"/></linearGradient></defs>
        <path d="${tide}" class="ctide"/>
        <path d="${area}" fill="url(#cfill)"/>
        <path d="${line}" class="cline" pathLength="1"/>
      </svg>
      <span class="scrubline" aria-hidden="true"><i></i></span>
      <input class="scrub" type="range" min="${Math.ceil(x0 / 15) * 15}" max="${Math.floor(x1 / 15) * 15}" step="15" value="${scrubM}" data-scrub="${id}-${d}" aria-label="Time of day" aria-valuetext="${toHHMM(scrubM)}, fit ${sf}, ${tideWord}">
    </div>
    <div class="cticks" aria-hidden="true"><span style="left:0">${icon("sun", 12)}${toHHMM(rise)}</span>${ticks.map((m) => `<span style="left:${(X(m) / W * 100).toFixed(1)}%">${toHHMM(m)}</span>`).join("")}<span style="right:0;left:auto">${toHHMM(set)}</span></div>
    <div class="clegend"><span class="lg-best"><i></i>Best ${w.label}</span><span aria-hidden="true"><i class="lg-fit"></i>Your fit</span><span aria-hidden="true"><i class="lg-tide"></i>Tide</span></div>
  </div>`;
}

export function renderForecast() {
  const id = st.fspot, s = SPOTS[id], d = st.fday, v = fit(id, d), e = energy(s.h[d], s.p[d]);
  const w = bestWindow(id, d), first = !st.spots[s.name];
  const tt = tideTimes(id, d);
  const desc = v >= 85 ? "Clean sets in your sweet spot. Ideal for your level." : v >= 70 ? "Good for you, a bit outside your sweet spot." : v >= 50 ? "Borderline for your level and board. Consider a lesson." : "Too much or too little for you. Try another spot or day.";
  const maxh = Math.max(...s.h);
  const spotChips = `<div class="hscroll chips" role="group" aria-label="Spot">${Object.entries(SPOTS).map(([k, x]) => `<button type="button" class="chip ${k === id ? "on" : ""}" aria-pressed="${k === id}" data-a="fspot" data-v="${k}">${esc(x.short)}</button>`).join("")}</div>`;
  const top = `<header class="subhead">${backBtn("spotsback", "All spots")}<h1>${esc(s.name)}</h1><span class="brkpill">${esc(s.brkLong)}</span></header>`;

  if (st.ftab === "guide") return `<section class="screen-pad" data-screen="guide">${top}${spotChips}${guideHtml(id, d)}</section>`;

  const diff = paddleDifficulty(id, d);
  return `<section class="screen-pad" data-screen="forecast">${top}
  <div class="toolbar"><span class="forline">For ${esc((st.user.level || "you").toLowerCase())} on</span>${boardSelect("fc-board", true)}</div>
  ${spotChips}
  <article class="hero" aria-label="${dayFull(d)} at ${esc(s.name)}">
    <div class="hrow1">
      <div><p class="hday">${dayFull(d)}</p>
        <p class="hbig">${s.h[d].toFixed(1)}<small> m</small></p>
        <p class="hsub">${s.p[d]} s period · ${fmtKJ(e)} kJ ${infoBtn("energy", "What is wave energy?")}</p></div>
      ${fitRing(v, 76)}
    </div>
    <p class="hdesc"><b>${clsLabel(v)}.</b> ${desc}</p>
    ${curveChart(id, d)}
    <dl class="kv">
      <div>${icon("wind", 18)}<dt>Wind</dt><dd>${esc(s.wind)}<small>${esc(s.windNote)}</small></dd></div>
      <div>${icon("tide", 18)}<dt>Low tide</dt><dd>${tt.lows.map(toHHMM).join(" · ")}</dd></div>
      <div>${icon("temp", 18)}<dt>Water</dt><dd>${WATER.temp} °C<small>${WATER.suit}</small></dd></div>
      <div>${icon("crowd", 18)}<dt>Crowd</dt><dd>${esc(s.crowd)}</dd></div>
    </dl>
  </article>
  ${d === 0 ? `<aside class="report"><span class="av" aria-hidden="true">JR</span><p><b>On the water at 07:10</b> · João, surf coach <span class="extag">example</span><br>“Banks are working well. Good for intermediates, a bit strong for first-timers.”</p></aside>` : ""}
  <button type="button" class="promo ${first ? "first" : ""}" data-a="ftab" data-v="guide"><span class="promoic">${icon(first ? "warn" : "tip", 22)}</span><span><b>${first ? `First time at ${esc(s.short)}?` : "Spot guide"}</b><small>Tide, paddle-out (${diff} today), currents and hazards</small></span>${icon("chev", 20, "chev")}</button>
  <div class="listhead"><h2>Next 7 days</h2><span class="muted">Tap a day</span></div>
  <ol class="days" role="list">${DAYS.map((dd, i) => {
    const f = fit(id, i);
    return `<li><button type="button" class="dayrow ${i === d ? "sel" : ""}" aria-pressed="${i === d}" data-a="fday" data-v="${i}">
      <span class="dname"><b>${dayName(i)}</b><small>${dd.dm}</small></span>
      <span class="hbar" aria-hidden="true"><i style="width:${Math.round((s.h[i] / maxh) * 100)}%"></i></span>
      <span class="dval"><b>${s.h[i].toFixed(1)} m</b><small>${s.p[i]} s · ${fmtKJ(energy(s.h[i], s.p[i]))} kJ</small></span>
      ${fitBadge(f, "sm")}</button></li>`;
  }).join("")}</ol>
  </section>`;
}

export function guideHtml(id, d) {
  const g = GUIDE[id], s = SPOTS[id], h = s.h[d];
  const tides = [["low", "Low"], ["mid", "Mid"], ["high", "High"]];
  const diff = paddleDifficulty(id, d);
  const row = (ic, t, body, extra = "") => `<li class="grow"><span class="gic" aria-hidden="true">${icon(ic, 20)}</span><div><h3>${t}${extra}</h3><p>${body}</p></div></li>`;
  return `<h2 class="sectitle">${esc(s.short)} guide <span class="muted">for ${dayNameLong(d).toLowerCase()}</span></h2>
  <ul class="card guide" role="list">
    ${row("tide", "Best tide", g.tideTxt, `<span class="tchips">${tides.map(([k, l]) => `<span class="${g.tide.includes(k) ? "on" : ""}">${l}</span>`).join("")}</span>`)}
    ${row("paddle", "Paddle out", g.paddle[1], `<span class="diff d-${diff}">${diff[0].toUpperCase() + diff.slice(1)} today · ${h.toFixed(1)} m</span>`)}
    ${row("current", "Currents", g.current)}
    ${row("warn", "Watch out", g.caution)}
    ${row("tip", "Local tip", g.tip)}
  </ul>
  <p class="fineprint">Example guide for the prototype. Always check conditions with lifeguards and local schools.</p>
  <button type="button" class="btn sec" data-a="ftab" data-v="fc">Back to the forecast</button>`;
}

export { clsShort };
