#!/usr/bin/env node
/* Surfletics end-to-end + a11y + layout QA.
   Run:  node tests/e2e.spec.mjs          (static server must serve the project on :8765)
   Env:  BASE=http://localhost:8765/  HEADED=1  AXE=/path/to/axe.min.js            */
import { createRequire } from "node:module";
import fs from "node:fs";

const require = createRequire("/opt/npm-tools/node_modules/");
const { chromium } = require("playwright");

const BASE = process.env.BASE || "http://localhost:8765/";
const AXE_PATH = process.env.AXE || ["/tmp/claude-0/qa/node_modules/axe-core/axe.min.js", "./node_modules/axe-core/axe.min.js"].find((p) => fs.existsSync(p));
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESKTOP = { viewport: { width: 1440, height: 900 } };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const PAGE_ERRORS = [];
const notes = [];
const AXE = {}; // state -> violations
const LAYOUT = {}; // state -> {doc, scroll, vw}
const SMALL = []; // small touch targets

/* ------------------------------------------------------------------ harness */
function ok(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }
function eq(a, b, msg) { if (a !== b) throw new Error(`${msg || "not equal"}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`); }
function ne(a, b, msg) { if (a === b) throw new Error(`${msg || "unexpectedly equal"}: ${JSON.stringify(a)}`); }

async function test(name, fn) {
  if (process.env.ONLY && !new RegExp(process.env.ONLY).test(name)) return;
  const t0 = Date.now();
  try { await fn(); results.push({ name, pass: true, ms: Date.now() - t0 }); console.log(`  PASS  ${name}`); }
  catch (e) { results.push({ name, pass: false, ms: Date.now() - t0, err: String(e.message || e).split("\n").slice(0, 3).join(" | ") }); console.log(`  FAIL  ${name}\n        ${String(e.message || e).split("\n").slice(0, 4).join(" | ")}`); }
}

let browser;
async function mk(kind, label) {
  const ctx = await browser.newContext(kind === "desktop" ? DESKTOP : MOBILE);
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  page.on("pageerror", (e) => PAGE_ERRORS.push(`[${label}] pageerror: ${e.message}`));
  page.on("console", (m) => { if (m.type() === "error") PAGE_ERRORS.push(`[${label}] console.error: ${m.text()} ${m.location()?.url || ""}`); });
  page.on("requestfailed", (r) => { if (r.url().startsWith(BASE)) PAGE_ERRORS.push(`[${label}] requestfailed: ${r.url()} ${r.failure()?.errorText}`); });
  page.on("response", (r) => { if (r.url().startsWith(BASE) && r.status() >= 400) PAGE_ERRORS.push(`[${label}] HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(BASE);
  await page.waitForSelector("#view .scr");
  await sleep(300);
  return { ctx, page };
}
async function withPage(kind, label, fn) {
  const { ctx, page } = await mk(kind, label);
  try { await fn(page); } finally { await ctx.close(); }
}

/* ------------------------------------------------------------------ helpers */
const waitSheet = async (page) => { await page.waitForSelector("#sheet.open"); await sleep(380); };
const waitSheetGone = async (page) => { await page.waitForSelector("#sheet", { state: "hidden" }); };
const sheetTitle = (page) => page.locator("#sheettitle").innerText();
const toastText = (page) => page.locator("#toast").innerText();
const tab = async (page, t) => { await page.click(`#tabbar [data-v=${t}]`); await page.waitForSelector(`#view .scr[data-key^="${t === "spots" ? "discover" : t}"]`); await sleep(350); };
const fitScores = (page) => page.$$eval(".rows .row .fit b", (els) => els.map((e) => e.textContent.trim()));
const norm = (s) => s.replace(/\s+/g, " ").trim();

async function closeIntro(page) {
  await waitSheet(page);
  await page.keyboard.press("Escape");
  await waitSheetGone(page);
}

const DEFAULT_BOARDS = [["Longboard", "9'0", "70"], ["Shortboard", "6'0", "28"]];

/** Complete the 5-step sign-up through the UI. hooks: {snap(label)} called on arrival at each screen. */
async function signup(page, o = {}) {
  const { name = "Liam", age = 28, boards = DEFAULT_BOARDS, spots = ["Guincho", "Carcavelos"], dismissIntro = true, snap } = o;
  const next = () => page.click(".ob-foot .btn");
  await snap?.("welcome");
  await page.click("[data-a=obnext]");
  await page.waitForSelector("#view [data-screen=ob1]"); await sleep(350);
  await snap?.("step1");
  await page.fill("#f-name", name);
  await page.fill("#f-age", String(age));
  await next();
  await page.waitForSelector("#view [data-screen=ob2]"); await sleep(350);
  await snap?.("step2");
  await page.click("[data-a=fitness][data-v='3']");
  await page.click("[data-a=level][data-v=Intermediate]");
  await next();
  await page.waitForSelector("#view [data-screen=ob3]"); await sleep(350);
  await snap?.("step3");
  for (const s of spots) await page.click(`[data-a=spot][data-v="${s}"]`);
  await next();
  await page.waitForSelector("#view [data-screen=ob4]"); await sleep(350);
  await snap?.("step4");
  for (const [type, len, vol] of boards) {
    await page.click(`[data-a=nbtype][data-v="${type}"]`);
    await page.fill("#nb-len", len);
    await page.fill("#nb-vol", vol);
    await page.click(".addbox button[type=submit]");
    await page.waitForSelector(`.boardlist .bitem`);
  }
  await next();
  await page.waitForSelector("#view [data-screen=ob5]"); await sleep(350);
  await snap?.("step5");
  await page.check("#f-consent");
  await next();
  await page.waitForSelector("#tabbar:not([hidden])");
  await page.waitForSelector("#view [data-screen=discover]");
  await sleep(300);
  if (dismissIntro) await closeIntro(page);
}

async function bookFirstLesson(page) {
  await tab(page, "lessons");
  await page.locator("[data-a=book]").first().click();
  await waitSheet(page);
  const name = await sheetTitle(page);
  await page.click("[data-a=confirmbook]");
  await page.waitForFunction(() => document.querySelector("#sheettitle").textContent === "Lesson booked");
  return name;
}
async function viewBooking(page) {
  await page.click("[data-a=viewbooking]");
  await waitSheetGone(page);
  await page.waitForSelector("#view [data-screen=bookings]");
  await sleep(350);
}
const wave = async (page) => { await tab(page, "profile"); return norm(await page.locator(".swrow", { hasText: "Wave height" }).locator("dd b").innerText()); };

async function rateFirstBooking(page, fitIdx) {
  await page.click("[data-a=markdone]");
  await page.waitForSelector(".ratecard");
  await page.click(`[data-a=ratefit][data-v='${fitIdx}']`);
  await page.click("[data-a=saverate]");
  await page.waitForFunction(() => /Rating saved/.test(document.querySelector("#toast").textContent));
}

/* ------------------------------------------------------------------ a11y + layout probes */
async function runAxe(page, state) {
  if (!AXE_PATH) throw new Error("axe-core not found (npm i axe-core in /tmp/claude-0/qa)");
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ path: AXE_PATH });
  const res = await page.evaluate(async () => {
    const r = await window.axe.run(document, { resultTypes: ["violations"] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 140) })) }));
  });
  // Known false positive: the decorative, aria-hidden fake iOS status bar of the desktop phone frame
  // (axe cannot resolve its gradient background; visually white on dark teal is fine).
  for (const v of res) v.nodes = v.nodes.filter((n) => !/^\.statusbar\b/.test(n.target));
  res.splice(0, res.length, ...res.filter((v) => v.nodes.length));
  AXE[state] = res;
}

async function layoutProbe(page, state) {
  const r = await page.evaluate(() => {
    const sc = document.querySelector("#scroll");
    const out = { vw: window.innerWidth, doc: document.scrollingElement.scrollWidth, scroll: sc.scrollWidth, scrollClient: sc.clientWidth, small: [] };
    const sel = "button, a[href], [role=button]";
    for (const root of document.querySelectorAll("#view, #tabbar, #fab")) {
      if (root.hidden) continue;
      for (const el of root.querySelectorAll(sel)) {
        if (el.closest("[hidden], [inert]") && el.closest("#sheet")) continue;
        const cs = getComputedStyle(el);
        if (cs.visibility === "hidden" || cs.display === "none") continue;
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        if (r.width >= 40 && r.height >= 40) continue;
        const hit = (n) => { const a = getComputedStyle(n, "::after"); return a.content !== "none" && a.content !== "normal" && a.position === "absolute"; };
        const after = hit(el) || (el.parentElement && el.parentElement.id !== "view" && hit(el.parentElement));
        out.small.push({ text: (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40) || `<${el.tagName.toLowerCase()}.${el.className}>`, cls: String(el.className).slice(0, 30), w: Math.round(r.width), h: Math.round(r.height), after });
      }
    }
    return out;
  });
  LAYOUT[state] = { vw: r.vw, doc: r.doc, scroll: r.scroll, scrollClient: r.scrollClient };
  for (const s of r.small) SMALL.push({ state, ...s });
}

/* ================================================================== TESTS */
async function main() {
  browser = await chromium.launch({ headless: !process.env.HEADED });
  console.log(`Surfletics E2E against ${BASE}\n`);

  /* 1 ---------------------------------------------------------------- */
  await test("1a Sign-up: validation (empty name/age, age 5), 2 boards normalised, consent required, lands on Spots", () => withPage("mobile", "T1", async (page) => {
    await page.click("[data-a=obnext]");
    await page.waitForSelector("#view [data-screen=ob1]"); await sleep(350);
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#err-name");
    eq(norm(await page.locator("#err-name").innerText()), "Enter your name.");
    ok(await page.locator("#err-age").count(), "age error missing for empty age");
    eq(await page.locator("#f-name").getAttribute("aria-invalid"), "true", "name aria-invalid");
    await page.fill("#f-name", "Liam");
    await page.fill("#f-age", "5");
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#err-age");
    ok(/between 8 and 90/.test(await page.locator("#err-age").innerText()), "age 5 must be rejected with range message");
    eq(await page.locator("#view [data-screen=ob1]").count(), 1, "must stay on step 1");
    await page.fill("#f-age", "28");
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#view [data-screen=ob2]"); await sleep(350);
    // step 2 validation
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#err-fitness");
    ok(await page.locator("#err-level").count(), "level error missing");
    await page.click("[data-a=fitness][data-v='4']");
    await page.click("[data-a=level][data-v=Improver]");
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#view [data-screen=ob3]"); await sleep(350);
    await page.click("[data-a=spot][data-v=Guincho]");
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#view [data-screen=ob4]"); await sleep(350);
    // invalid board first
    await page.click(".addbox button[type=submit]");
    await page.waitForSelector("#err-len");
    await page.fill("#nb-len", "banana"); await page.fill("#nb-vol", "60");
    await page.click(".addbox button[type=submit]");
    await page.waitForSelector("#err-len");
    ok(/feet and inches/.test(await page.locator("#err-len").innerText()), "invalid length error text");
    // board 1: 8'0 -> 8'0"
    await page.click("[data-a=nbtype][data-v=Longboard]");
    await page.fill("#nb-len", "8'0");
    await page.click(".addbox button[type=submit]");
    await page.waitForSelector(".bitem");
    // board 2: 7.2 -> 7'2"
    await page.click("[data-a=nbtype][data-v=Shortboard]");
    await page.fill("#nb-len", "7.2"); await page.fill("#nb-vol", "35");
    await page.click(".addbox button[type=submit]");
    await page.waitForFunction(() => document.querySelectorAll(".bitem").length === 2);
    const items = await page.$$eval(".bitem .bmeta", (e) => e.map((x) => x.textContent));
    ok(items[0].includes(`8'0"`), `board 1 should show 8'0": ${items[0]}`);
    ok(items[1].includes(`7'2"`), `board 2 should show 7'2": ${items[1]}`);
    ok(/Longboard 8'0"/.test(items[0]) && /Shortboard 7'2"/.test(items[1]), `board labels: ${items.join(" | ")}`);
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#view [data-screen=ob5]"); await sleep(350);
    // consent required
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#err-consent");
    ok(/agree/.test(await page.locator("#err-consent").innerText()), "consent error text");
    eq(await page.locator("#view [data-screen=ob5]").count(), 1, "must stay on step 5 without consent");
    await page.check("#f-consent");
    ok((await page.locator("#err-consent").count()) === 0, "consent error should clear on check");
    await page.click(".ob-foot .btn");
    await page.waitForSelector("#view [data-screen=discover]");
    ok(await page.locator("#tabbar [aria-current=page]").innerText().then((t) => /Spots/.test(t)), "Spots tab active");
    eq(norm(await page.locator("#view h1").first().innerText()), "Best spots for you");
    ok(/Welcome, Liam/.test(await toastText(page)), "welcome toast");
  }));

  /* 2 ---------------------------------------------------------------- */
  await test("2 Skip on optional steps keeps already-entered spots/boards (regression)", () => withPage("mobile", "T2", async (page) => {
    await page.click("[data-a=obnext]"); await page.waitForSelector("#view [data-screen=ob1]"); await sleep(350);
    await page.fill("#f-name", "Skipper"); await page.fill("#f-age", "30");
    await page.click(".ob-foot .btn"); await page.waitForSelector("#view [data-screen=ob2]"); await sleep(350);
    await page.click("[data-a=fitness][data-v='3']"); await page.click("[data-a=level][data-v=Beginner]");
    await page.click(".ob-foot .btn"); await page.waitForSelector("#view [data-screen=ob3]"); await sleep(350);
    await page.click("[data-a=spot][data-v=Guincho]"); await page.click("[data-a=spot][data-v=Peniche]");
    await page.click("[data-a=obskip]"); // skip with spots chosen
    await page.waitForSelector("#view [data-screen=ob4]"); await sleep(350);
    await page.click("[data-a=nbtype][data-v='Mid-length']"); await page.fill("#nb-len", "7'6"); await page.fill("#nb-vol", "48");
    await page.click(".addbox button[type=submit]"); await page.waitForSelector(".bitem");
    await page.click("[data-a=obskip]"); // skip with a board added
    await page.waitForSelector("#view [data-screen=ob5]"); await sleep(350);
    // go back twice – everything must still be there
    await page.click("[data-a=obback]"); await page.waitForSelector("#view [data-screen=ob4]"); await sleep(350);
    eq(await page.locator(".bitem").count(), 1, "board lost after skip");
    await page.click("[data-a=obback]"); await page.waitForSelector("#view [data-screen=ob3]"); await sleep(350);
    eq(await page.locator("[data-a=spot][aria-pressed=true]").count(), 2, "spots lost after skip");
    await page.click("[data-a=obskip]"); await page.waitForSelector("#view [data-screen=ob4]"); await sleep(350);
    await page.click("[data-a=obskip]"); await page.waitForSelector("#view [data-screen=ob5]"); await sleep(350);
    await page.check("#f-consent"); await page.click(".ob-foot .btn");
    await page.waitForSelector("#view [data-screen=discover]");
    await closeIntro(page);
    await tab(page, "profile");
    const stats = await page.$$eval(".pstats > div", (d) => Object.fromEntries(d.map((x) => [x.querySelector("dt").textContent, x.querySelector("dd").textContent])));
    eq(stats.spots, "2", "profile spots count");
    eq(await page.locator(".qcard:not(.add)").count(), 1, "profile quiver count");
  }));

  /* 3 ---------------------------------------------------------------- */
  await test("3 Fit-intro auto-opens once, Escape closes + restores focus, no reopen after reload/nav", () => withPage("mobile", "T3", async (page) => {
    await signup(page, { dismissIntro: false });
    await waitSheet(page);
    eq(await sheetTitle(page), "What is the fit score?");
    eq(await page.locator("#sheetpanel").getAttribute("role"), "dialog");
    ok(await page.evaluate(() => document.activeElement.id === "sheettitle"), "focus should move to sheet title");
    await page.keyboard.press("Escape");
    await waitSheetGone(page);
    const ae = await page.evaluate(() => ({ inSheet: !!document.activeElement.closest("#sheet"), tag: document.activeElement.tagName }));
    ok(!ae.inSheet, "focus still inside the closed sheet");
    if (ae.tag === "BODY") notes.push("Focus falls back to <body> after the auto-opened fit-intro closes (nothing to return to); consider focusing the page h1.");
    // navigating away and back must not reopen
    await tab(page, "lessons"); await tab(page, "spots");
    await sleep(1000);
    ok(await page.locator("#sheet").isHidden(), "intro reopened after navigation");
    await sleep(400);
    await page.reload(); await page.waitForSelector("#view [data-screen=discover]");
    await sleep(1400);
    ok(await page.locator("#sheet").isHidden(), "intro reopened after reload");
  }));

  /* 4 ---------------------------------------------------------------- */
  await test("4 Switching board changes fit scores on Discover", () => withPage("mobile", "T4", async (page) => {
    await signup(page);
    const a = await fitScores(page);
    ok(a.length >= 4, "expected several spots, got " + a.length);
    const cur = await page.inputValue("#disc-board"); await page.selectOption("#disc-board", cur === "0" ? "1" : "0");
    await page.waitForFunction((prev) => JSON.stringify([...document.querySelectorAll(".rows .row .fit b")].map((e) => e.textContent.trim())) !== prev, JSON.stringify(a));
    const b = await fitScores(page);
    ne(JSON.stringify(a), JSON.stringify(b), "scores should differ between Longboard and Shortboard");
    
  }));

  /* 5 ---------------------------------------------------------------- */
  await test("5 Spot detail: day-curve scrubber updates readout, 7-day tap updates hero", () => withPage("mobile", "T5", async (page) => {
    await signup(page);
    await page.locator(".rows .row").first().click();
    await page.waitForSelector(".curvehead"); await sleep(400);
    const before = norm(await page.locator(".curvehead span").first().innerText());
    const min = +await page.getAttribute("input.scrub", "min"), max = +await page.getAttribute("input.scrub", "max");
    const cur = +await page.inputValue("input.scrub");
    const target = Math.abs(cur - min) > Math.abs(max - cur) ? min : max;
    await page.locator("input.scrub").fill(String(target));
    await page.waitForFunction((b) => document.querySelector(".curvehead span").textContent.replace(/\s+/g, " ").trim() !== b, before);
    const after = norm(await page.locator(".curvehead span").first().innerText());
    ne(before, after, "readout should change");
    ok(after.startsWith(`${String(Math.floor(target / 60)).padStart(2, "0")}:${String(target % 60).padStart(2, "0")}`), `readout "${after}" should start with the chosen time ${target}`);
    ok((await page.getAttribute("input.scrub", "aria-valuetext")).startsWith(after.slice(0, 5)), "aria-valuetext in sync");
    // keyboard on the range too
    await page.locator("input.scrub").focus(); await page.keyboard.press("ArrowLeft");
    await page.waitForFunction((b) => document.querySelector(".curvehead span").textContent.replace(/\s+/g, " ").trim() !== b, after);
    // 7-day list
    const hday = norm(await page.locator(".hday").innerText()), hbig = norm(await page.locator(".hbig").innerText());
    await page.locator(".dayrow").nth(3).click();
    await page.waitForFunction((h) => document.querySelector(".hday").textContent.replace(/\s+/g, " ").trim() !== h, hday);
    const hday2 = norm(await page.locator(".hday").innerText()), hbig2 = norm(await page.locator(".hbig").innerText());
    ne(hday, hday2, "hero day label");
    ne(hbig, hbig2, "hero wave height (Day 3 differs from today for Carcavelos/first spot?)");
    eq(await page.locator(".dayrow").nth(3).getAttribute("aria-pressed"), "true");
    // scrub position resets for the new day (different key)
    ok(/\d\d:\d\d/.test(await page.locator(".curvehead").innerText()), "curve readout present for new day");
    // spot chips switch spot
    await page.locator(".chips [data-a=fspot]").nth(2).click();
    await sleep(300);
    // back to Discover
    await page.click("[data-a=spotsback]");
    await page.waitForSelector("#view [data-screen=discover]");
  }));

  /* 6 ---------------------------------------------------------------- */
  await test("6a Booking: book -> success -> View booking -> cancel flow", () => withPage("mobile", "T6a", async (page) => {
    await signup(page);
    const name = await bookFirstLesson(page);
    ok(await page.locator("#sheetbody .success").isVisible(), "success panel");
    ok(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).test(await page.locator("#sheetbody .success").innerText()), "success shows school name");
    await viewBooking(page);
    await page.waitForSelector(".bcard");
    eq(await page.locator(".bcard").count(), 1);
    ok((await page.locator(".bcard h3").innerText()).includes(name), "upcoming card shows booked school");
    // cancel: Keep it first
    await page.click("[data-a=cancelbook]"); await waitSheet(page);
    eq(await sheetTitle(page), "Cancel this booking?");
    await page.click("#sheet .btn.sec"); await waitSheetGone(page);
    eq(await page.locator(".bcard").count(), 1, "Keep it must not cancel");
    await page.click("[data-a=cancelbook]"); await waitSheet(page);
    await page.click("[data-a=confirmcancel]"); await waitSheetGone(page);
    eq(await page.locator(".bcard").count(), 0, "booking should be gone");
    ok(/cancelled/i.test(await toastText(page)), "cancel toast");
    ok(await page.locator(".empty").isVisible(), "empty state shown");
  }));

  await test("6b Rating: Demo finish -> Past with rating card; empty save toasts; save adds session; 'Too easy' widens sweet spot; 'Too hard' narrows", () => withPage("mobile", "T6b", async (page) => {
    await signup(page);
    const w0 = await wave(page);
    await bookFirstLesson(page);
    await viewBooking(page);
    await page.click("[data-a=markdone]");
    await page.waitForSelector("[data-a=btab][aria-selected=true][data-v=past]");
    await page.waitForSelector(".ratecard");
    ok(/How was your lesson/.test(await page.locator(".ratecard h3").innerText()));
    eq(await page.locator(".sess").count(), 0, "no sessions before rating");
    // save without choice (aria-disabled button is still clickable for real users)
    await page.click("[data-a=saverate]", { force: true });
    await page.waitForFunction(() => /Pick how the conditions fit you first/.test(document.querySelector("#toast").textContent));
    eq(await page.locator(".sess").count(), 0, "empty save must not create a session");
    ok(await page.locator(".ratecard").isVisible(), "rating card must remain");
    // choose Too easy
    await page.click("[data-a=ratefit][data-v='0']");
    ok(await page.locator("[data-a=ratereason]").count() > 0, "reason chips appear after choosing fit");
    await page.click("[data-a=ratestar][data-v='4']");
    await page.click("[data-a=saverate]");
    await page.waitForFunction(() => /Rating saved/.test(document.querySelector("#toast").textContent));
    eq(await page.locator(".ratecard").count(), 0, "rating card should be gone after save");
    eq(await page.locator(".sess").count(), 1, "session in Past sessions");
    ok(/Too easy/.test(await page.locator(".sess .srate").innerText()), "session shows 'Too easy'");
    ok(/moved up/.test(await toastText(page)), `toast should say sweet spot moved up: ${await toastText(page)}`);
    const w1 = await wave(page);
    ne(w0, w1, "Wave height range must change after 'Too easy'");
    const hi = (s) => parseFloat(s.split("–")[1]);
    ok(hi(w1) > hi(w0), `upper bound should rise: ${w0} -> ${w1}`);
    // second booking: Too hard
    await bookFirstLesson(page); await viewBooking(page);
    await rateFirstBooking(page, 2);
    const w2 = await wave(page);
    ne(w1, w2, "Wave height range must change after 'Too hard'");
    ok(hi(w2) < hi(w1), `upper bound should fall: ${w1} -> ${w2}`);
    // Right fit leaves it unchanged
    await bookFirstLesson(page); await viewBooking(page);
    await rateFirstBooking(page, 1);
    eq(await wave(page), w2, "'Right fit' must not move the range");
  }));

  /* 7 ---------------------------------------------------------------- */
  await test("7 Log session: end-before-start error; fit required; valid save adds a session", () => withPage("mobile", "T7", async (page) => {
    await signup(page);
    await page.click("#fab"); await waitSheet(page);
    eq(await sheetTitle(page), "Log a session");
    // missing fit (aria-disabled button is still clickable for real users)
    await page.click("[data-a=logsave]", { force: true });
    await page.waitForFunction(() => /Pick how the conditions fit/.test(document.querySelector("#toast").textContent));
    ok(await page.locator("#sheet.open").count(), "sheet stays open");
    await page.fill("#lg-start", "12:00");
    await page.fill("#lg-end", "11:00");
    await page.click("[data-a=logfit][data-v='1']");
    await page.click("[data-a=logsave]");
    await page.waitForSelector("#err-logtime");
    ok(/after the start/.test(await page.locator("#err-logtime").innerText()), "end-before-start message");
    eq(await page.locator("#lg-end").getAttribute("aria-invalid"), "true");
    ok(await page.evaluate(() => document.activeElement.id === "lg-end"), "focus moves to end time");
    ok(await page.locator("#sheet.open").count(), "sheet stays open on error");
    await page.fill("#lg-end", "13:30");
    await page.waitForFunction(() => !document.querySelector("#err-logtime"));
    eq(await page.inputValue("#lg-start"), "12:00", "start time preserved");
    eq(await page.locator("[data-a=logfit][aria-checked=true]").count(), 1, "fit selection preserved");
    await page.click("[data-a=logsave]");
    await waitSheetGone(page);
    ok(/Session saved/.test(await toastText(page)), "saved toast");
    await tab(page, "bookings");
    await page.click("[data-a=btab][data-v=past]"); await sleep(300);
    eq(await page.locator(".sess").count(), 1, "session appears in Past");
    // equal times also invalid
    await page.click("[data-a=logopen]"); await waitSheet(page);
    await page.fill("#lg-start", "10:00"); await page.fill("#lg-end", "10:00");
    await page.click("[data-a=logfit][data-v='0']"); await page.click("[data-a=logsave]");
    await page.waitForSelector("#err-logtime");
    await page.click("[data-a=closesheet]"); await waitSheetGone(page);
  }));

  /* 8 ---------------------------------------------------------------- */
  await test("8 Persistence across reload; Start over clears and returns to welcome", () => withPage("mobile", "T8", async (page) => {
    await signup(page, { name: "Persist Pat" });
    await bookFirstLesson(page); await viewBooking(page);
    await page.click("[data-a=cancelbook]"); await waitSheet(page); await page.click("[data-a=confirmcancel]"); await waitSheetGone(page);
    await bookFirstLesson(page); await viewBooking(page);       // 1 upcoming
    await bookFirstLesson(page); await viewBooking(page);       // 2 upcoming
    await page.locator("[data-a=markdone]").first().click();    // one to rate
    await page.waitForSelector(".ratecard");
    await page.click("[data-a=ratefit][data-v='1']"); await page.click("[data-a=saverate]");
    await page.waitForFunction(() => /Rating saved/.test(document.querySelector("#toast").textContent)); // 1 session
    await sleep(400);
    const snapshot = async () => ({
      up: await (async () => { await page.click("[data-a=btab][data-v=up]"); await sleep(250); return page.locator(".bcard").count(); })(),
      sess: await (async () => { await page.click("[data-a=btab][data-v=past]"); await sleep(250); return page.locator(".sess").count(); })(),
    });
    const s0 = await snapshot();
    eq(s0.up, 1); eq(s0.sess, 1);
    await sleep(300);
    await page.reload(); await page.waitForSelector("#tabbar:not([hidden])"); await sleep(500);
    await tab(page, "bookings");
    const s1 = await snapshot();
    eq(s1.up, 1, "upcoming booking lost on reload"); eq(s1.sess, 1, "session lost on reload");
    await tab(page, "profile");
    eq(norm(await page.locator(".pname h1").innerText()), "Persist Pat", "name lost on reload");
    eq(await page.locator(".qcard:not(.add)").count(), 2, "boards lost on reload");
    eq(await page.locator("#tabbar [aria-current=page]").innerText().then(norm), "Profile");
    // start over
    await page.click("[data-a=restartask]"); await waitSheet(page);
    eq(await sheetTitle(page), "Start over?");
    await page.click("#sheet .btn.sec"); await waitSheetGone(page);
    eq(norm(await page.locator(".pname h1").innerText()), "Persist Pat", "Keep my data must keep the profile");
    await page.click("[data-a=restartask]"); await waitSheet(page);
    await page.click("[data-a=restart]");
    await page.waitForSelector("#view [data-screen=welcome]");
    ok(/matched to your level/.test(await page.locator("#view h1").first().innerText()), "welcome h1");
    ok(await page.locator("#tabbar").isHidden(), "tabbar hidden on welcome");
    await waitSheetGone(page);
    ok(await page.evaluate(() => !document.querySelector("#scroll").inert), "scroll must not stay inert after restart");
    await sleep(400); await page.reload(); await page.waitForSelector("#view [data-screen=welcome]");
    const ls = await page.evaluate(() => JSON.parse(localStorage.getItem("surfletics:v2")));
    eq(ls.done, false); eq(ls.boards.length, 0); eq(ls.bookings.length, 0); eq(ls.sessions.length, 0); eq(ls.user.name, "");
    // And sign-up works again
    await page.click("[data-a=obnext]"); await page.waitForSelector("#view [data-screen=ob1]");
    eq(await page.inputValue("#f-name"), "", "name field must be empty after reset");
  }));

  /* 9 ---------------------------------------------------------------- */
  await test("9 Example profile: Ella R., 3 boards, 1 upcoming + 1 to rate", () => withPage("mobile", "T9", async (page) => {
    await page.click("[data-a=skipdemo]");
    await page.waitForSelector("#tabbar:not([hidden])"); await sleep(400);
    ok(/Exploring as Ella/.test(await toastText(page)), "toast");
    await closeIntro(page);
    await tab(page, "profile");
    eq(norm(await page.locator(".pname h1").innerText()), "Ella R.");
    eq(await page.locator(".qcard:not(.add)").count(), 3, "3 boards");
    await tab(page, "bookings");
    eq(await page.locator(".bcard").count(), 1, "1 upcoming");
    ok(/1 to rate/.test(await page.locator("[data-a=btab][data-v=past]").innerText()), "1 to rate badge");
    ok(await page.locator("#tabbar .dot").count() === 1, "tab bar dot for to-rate");
    await page.click("[data-a=btab][data-v=past]"); await sleep(300);
    eq(await page.locator(".ratecard").count(), 1, "1 rate card");
    eq(await page.locator(".sess").count(), 4, "4 historic sessions");
  }));

  /* 10 --------------------------------------------------------------- */
  await test("10a MVP toggle (desktop aside): Lessons 'Coming soon', Bookings waitlist, toggle back", () => withPage("desktop", "T10a", async (page) => {
    ok(await page.locator(".aside").isVisible(), "aside visible on desktop");
    await page.click("[data-a=skipdemo]"); await page.waitForSelector("#tabbar:not([hidden])"); await sleep(500);
    await closeIntro(page);
    await page.click(".aside [data-a=mode][data-v=mvp]");
    eq(await page.locator(".aside [data-a=mode][data-v=mvp]").getAttribute("aria-pressed"), "true");
    await tab(page, "lessons");
    ok(await page.locator(".soonbar").isVisible(), "soon bar");
    ok(/coming soon/i.test(await page.locator(".soonbar").innerText()), "'Coming soon' pill");
    eq(await page.locator("[data-a=book]").count(), 0, "no Book buttons in MVP");
    ok(await page.locator(".lcard .btn.muted").count() > 0, "cards show Coming soon buttons");
    await page.click("[data-a=lmode][data-v=rental]"); await sleep(300);
    ok(await page.locator(".soonbar").isVisible(), "rental soon bar");
    eq(await page.locator("[data-a=rent]").count(), 0, "no Reserve buttons in MVP");
    await tab(page, "bookings");
    ok(await page.locator(".waitlist").isVisible(), "waitlist");
    ok(/coming soon/i.test(await page.locator(".waitlist .pill").innerText()));
    await page.click(".waitlist [data-a=notify]");
    eq(await page.locator(".waitlist [data-a=notify]").getAttribute("aria-pressed"), "true", "notify toggled");
    eq(await page.locator("#tabbar .dot").count(), 0, "to-rate dot hidden in MVP");
    // back to full
    await page.click(".aside [data-a=mode][data-v=full]"); await sleep(300);
    eq(await page.locator(".waitlist").count(), 0);
    ok(await page.locator(".bcard").count() > 0, "bookings back in full version");
    // MVP survives Start over via aside
    await page.click(".aside [data-a=mode][data-v=mvp]");
    await page.click("#restartBtn"); await page.waitForSelector("#view [data-screen=welcome]");
    eq(await page.locator(".aside [data-a=mode][data-v=mvp]").getAttribute("aria-pressed"), "true", "mvp kept after restart (by design KEEP_ON_RESET)");
  }));

  await test("10b MVP toggle via Profile > About this prototype (mobile)", () => withPage("mobile", "T10b", async (page) => {
    await signup(page);
    await tab(page, "profile");
    await page.click("[data-a=about]"); await waitSheet(page);
    eq(await sheetTitle(page), "About this prototype");
    await page.click("#sheet [data-a=mode][data-v=mvp]"); await sleep(300);
    eq(await page.locator("#sheet [data-a=mode][data-v=mvp]").getAttribute("aria-pressed"), "true", "sheet toggle re-rendered");
    await page.click("#sheet .btn"); await waitSheetGone(page);
    await tab(page, "lessons");
    ok(/coming soon/i.test(await page.locator(".soonbar").innerText()));
    await tab(page, "bookings");
    ok(/notify me when lessons launch/i.test(await page.locator(".waitlist").innerText()));
    // Past tab in MVP must still allow logging sessions
    await page.click("[data-a=btab][data-v=past]"); await sleep(250);
    ok(await page.locator("[data-a=logopen]").count() > 0, "log a session available in MVP");
  }));

  /* 11 --------------------------------------------------------------- */
  await test("11 Sheet a11y: focus trap (Tab/Shift+Tab wrap), background inert, focus return to opener, Escape/backdrop close", () => withPage("mobile", "T11", async (page) => {
    await signup(page);
    await page.click("#fab"); await waitSheet(page);
    ok(await page.evaluate(() => ["#scroll", "#tabbar", "#fab", "#fbk"].every((s) => document.querySelector(s).inert)), "#scroll/#tabbar/#fab/#fbk must be inert while sheet open");
    eq(await page.getAttribute("#sheetpanel", "aria-modal"), "true");
    const labelled = await page.evaluate(() => document.getElementById(document.getElementById("sheetpanel").getAttribute("aria-labelledby")).textContent);
    eq(labelled, "Log a session", "dialog labelled by title");
    const focusables = await page.evaluate(() => [...document.querySelectorAll('#sheetpanel button:not([disabled]), #sheetpanel [href], #sheetpanel input, #sheetpanel select, #sheetpanel [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null).map((x) => x.id || x.textContent.trim().slice(0, 20)));
    ok(focusables.length > 5, `expected many focusables, got ${focusables.length}`);
    // last -> first
    await page.evaluate(() => { const f = [...document.querySelectorAll('#sheetpanel button:not([disabled]), #sheetpanel [href], #sheetpanel input, #sheetpanel select, #sheetpanel [tabindex]:not([tabindex="-1"])')].filter((x) => x.offsetParent !== null); f[f.length - 1].focus(); });
    await page.keyboard.press("Tab");
    eq(await page.evaluate(() => document.activeElement.id), "lg-spot", "Tab from last focusable should wrap to first");
    await page.keyboard.press("Shift+Tab");
    eq(await page.evaluate(() => document.activeElement.textContent.trim()), "Cancel", "Shift+Tab from first should wrap to last");
    // 40 Tabs never escape the dialog
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() => !!document.activeElement.closest("#sheetpanel"));
      ok(inside, `focus escaped the sheet on Tab #${i + 1}`);
    }
    await page.keyboard.press("Escape"); await waitSheetGone(page);
    ok(await page.evaluate(() => ["#scroll", "#tabbar", "#fab", "#fbk"].every((s) => !document.querySelector(s).inert)), "background must be interactive again");
    eq(await page.evaluate(() => document.activeElement.id), "fab", "focus returns to the opener (#fab)");
    // info button opener + backdrop click
    await page.locator(".listhead .ibtn").first().click(); await waitSheet(page);
    await page.mouse.click(195, 40); // backdrop above the panel
    await waitSheetGone(page);
    ok(await page.evaluate(() => document.activeElement.classList.contains("ibtn")), "focus returns to info button after backdrop close");
    // background not reachable by click while open (inert) – open and try a tab click
    await page.click("#fab"); await waitSheet(page);
    const blocked = await page.evaluate(() => { const t = document.querySelector("#tabbar button"); return t.closest("[inert]") !== null; });
    ok(blocked, "tabbar inert");
    await page.keyboard.press("Escape"); await waitSheetGone(page);
  }));

  /* 13 + 14 story: axe + layout on every screen ------------------------ */
  await test("13/14 Story run: visit every screen, collect axe + layout data", () => withPage("mobile", "T13", async (page) => {
    const snap = async (label) => { await sleep(500); await runAxe(page, label); await layoutProbe(page, label); };
    await signup(page, { snap, dismissIntro: false });
    // intro sheet is open now
    await waitSheet(page); await snap("sheet: fit-intro (open)");
    await page.keyboard.press("Escape"); await waitSheetGone(page);
    await snap("Discover");
    await page.locator(".rows .row").first().click(); await page.waitForSelector(".curvehead"); await snap("Spot detail");
    await page.click("[data-a=ftab][data-v=guide]"); await page.waitForSelector("#view [data-screen=guide]"); await snap("Spot guide");
    await page.click("[data-a=spotsback]"); await page.waitForSelector("#view [data-screen=discover]");
    await tab(page, "lessons"); await snap("Lessons");
    await page.click("[data-a=lmode][data-v=rental]"); await page.waitForSelector("#view [data-screen=rental]"); await snap("Rental");
    await page.click("[data-a=lmode][data-v=lessons]"); await page.waitForSelector("#view [data-screen=lessons]");
    await tab(page, "bookings"); await snap("Bookings (empty upcoming)");
    await bookFirstLesson(page); await waitSheet(page); await snap("sheet: booking success");
    await viewBooking(page); await snap("Bookings (upcoming)");
    await page.click("[data-a=markdone]"); await page.waitForSelector(".ratecard"); await snap("Bookings (past + rating card)");
    await page.click("[data-a=ratefit][data-v='1']"); await page.click("[data-a=saverate]"); await page.waitForSelector(".sess"); await snap("Bookings (past + sessions)");
    await page.click("[data-a=logopen]"); await waitSheet(page); await snap("sheet: log session");
    await page.fill("#lg-start", "12:00"); await page.fill("#lg-end", "11:00"); await page.click("[data-a=logfit][data-v='1']"); await page.click("[data-a=logsave]");
    await page.waitForSelector("#err-logtime"); await snap("sheet: log session (error)");
    await page.keyboard.press("Escape"); await waitSheetGone(page);
    await tab(page, "profile"); await snap("Profile");
    await page.click("[data-a=info][data-v=height]"); await waitSheet(page); await snap("sheet: info");
    await page.keyboard.press("Escape"); await waitSheetGone(page);
    await page.click("[data-a=about]"); await waitSheet(page); await snap("sheet: about");
    await page.keyboard.press("Escape"); await waitSheetGone(page);
    await page.click("[data-a=restartask]"); await waitSheet(page); await snap("sheet: start over");
    await page.keyboard.press("Escape"); await waitSheetGone(page);
    await page.click("[data-a=sub][data-v=edit]"); await page.waitForSelector("#view [data-screen=sub-edit]"); await snap("Profile > Edit");
    await page.click("[data-a=subdone]"); await page.waitForSelector("#view [data-screen=profile]");
    await page.click(".settings [data-a=sub][data-v=boards]"); await page.waitForSelector("#view [data-screen=sub-boards]"); await snap("Profile > Boards");
    await page.click("[data-a=subdone]"); await page.waitForSelector("#view [data-screen=profile]");
    await page.click(".settings [data-a=sub][data-v=watch]"); await page.waitForSelector("#view [data-screen=sub-watch]"); await snap("Profile > Watch");
  }));

  // Desktop welcome (aside + phone frame) axe
  await test("13d Desktop (1440x900) welcome loads and axe collected", () => withPage("desktop", "T13d", async (page) => {
    await sleep(400); await runAxe(page, "Desktop welcome");
    ok(await page.locator(".phone").isVisible(), "phone frame visible");
  }));

  /* 13 / 14 assertions ------------------------------------------------- */
  const SEV = new Set(["serious", "critical"]);
  const mustHave = ["welcome", "step1", "step4", "Discover", "Spot detail", "Lessons", "Rental", "Bookings (upcoming)", "Bookings (past + rating card)", "Profile"];
  for (const state of [...mustHave, "sheet: log session"]) {
    await test(`13 axe: no serious/critical violations on "${state}"`, async () => {
      ok(AXE[state], "state was not captured (story aborted earlier)");
      const bad = AXE[state].filter((v) => SEV.has(v.impact));
      ok(!bad.length, bad.map((v) => `${v.id}(${v.impact}, ${v.nodes.length}x)`).join(", "));
    });
  }
  await test("13 axe: no serious/critical violations on remaining captured screens/sheets", async () => {
    const rest = Object.keys(AXE).filter((s) => ![...mustHave, "sheet: log session"].includes(s));
    ok(rest.length > 8, "story captured too few states");
    const bad = rest.flatMap((s) => AXE[s].filter((v) => SEV.has(v.impact)).map((v) => `${s}: ${v.id}(${v.impact})`));
    ok(!bad.length, bad.join("; "));
  });
  await test("14a Mobile layout: no horizontal scroll on any screen (doc <= 390, #scroll scrollWidth <= clientWidth)", async () => {
    const states = Object.keys(LAYOUT);
    ok(states.length > 10, "layout story did not run");
    const bad = states.filter((s) => LAYOUT[s].doc > 390 || LAYOUT[s].scroll > LAYOUT[s].scrollClient).map((s) => `${s} (doc ${LAYOUT[s].doc}, scroll ${LAYOUT[s].scroll}/${LAYOUT[s].scrollClient})`);
    ok(!bad.length, bad.join("; "));
  });

  /* 12 --------------------------------------------------------------- */
  await test("12 No console errors / page errors / failed local requests during the whole run", async () => {
    ok(!PAGE_ERRORS.length, `${PAGE_ERRORS.length} error(s): ${[...new Set(PAGE_ERRORS)].slice(0, 5).join(" || ")}`);
  });

  await browser.close();

  /* ================================================================ REPORT */
  const pass = results.filter((r) => r.pass).length, fail = results.length - pass;
  console.log(`\n==================== RESULTS: ${pass} passed, ${fail} failed ====================`);
  for (const r of results) console.log(`${r.pass ? "PASS" : "FAIL"}  ${r.name}${r.pass ? "" : "\n      -> " + r.err}`);

  if (notes.length) { console.log("\n---- Notes ----"); [...new Set(notes)].forEach((n) => console.log(" * " + n)); }

  console.log("\n==================== AXE-CORE (grouped by rule) ====================");
  const byRule = new Map();
  for (const [state, vs] of Object.entries(AXE)) for (const v of vs) {
    const g = byRule.get(v.id) || { id: v.id, impact: v.impact, help: v.help, count: 0, states: new Set(), example: null };
    g.count += v.nodes.length; g.states.add(state); g.example ||= `${v.nodes[0].target}  [${state}]`; byRule.set(v.id, g);
  }
  const order = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const groups = [...byRule.values()].sort((a, b) => order[a.impact] - order[b.impact] || b.count - a.count);
  if (!groups.length) console.log("no violations");
  for (const g of groups) console.log(`${g.impact.toUpperCase().padEnd(8)} ${g.id}  x${g.count}  in ${g.states.size} state(s): ${g.help}\n         e.g. ${g.example}\n         states: ${[...g.states].join(", ")}`);

  console.log("\n==================== LAYOUT (mobile 390px) ====================");
  for (const [s, l] of Object.entries(LAYOUT)) if (l.doc > 390 || l.scroll > l.scrollClient) console.log(`H-SCROLL  ${s}: doc ${l.doc}, #scroll ${l.scroll}/${l.scrollClient}`);
  console.log(`${Object.keys(LAYOUT).length} screens measured.`);
  console.log("\nSmall touch targets (<40x40, no ::after hit-area on itself/parent), deduped by label+size:");
  const seen = new Map();
  for (const s of SMALL.filter((x) => !x.after)) { const k = `${s.text}|${s.w}x${s.h}`; const e = seen.get(k) || { ...s, states: new Set() }; e.states.add(s.state); seen.set(k, e); }
  for (const e of seen.values()) console.log(` - "${e.text}" ${e.w}x${e.h}  (${e.cls})  on: ${[...e.states].slice(0, 4).join(", ")}${e.states.size > 4 ? ", ..." : ""}`);
  const withAfter = new Set(SMALL.filter((x) => x.after).map((s) => `${s.text}|${s.w}x${s.h}`));
  console.log(`(${withAfter.size} further small targets have a ::after hit-area and are excluded.)`);

  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => { console.error("HARNESS CRASH", e); try { await browser?.close(); } catch {} process.exit(2); });
