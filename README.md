# Surfletics – match my surf

Clickable prototype of **Surfletics**: a surf forecast scored for *your* level, fitness and board, with spot guides, surf lessons, board rental and session ratings that teach the app your sweet spot.

> All spots' forecasts, surf schools, rental shops, prices and reviews are **example data**. Spot guides are summarised from public surf guides and are not safety advice.

## Try it

| How | What you get |
| --- | --- |
| Open `index.html` through any web server (GitHub Pages, `npm start`, or `python3 -m http.server`) | The full app. On a phone it runs full screen; on a desktop it sits in a phone frame with notes and a QR code. |
| On a phone: Share → **Add to Home Screen** | Installs it like an app (own icon, full screen, works offline). |
| Double-click `dist/surfletics.html` | One self-contained file (≈400 KB) – works offline and by e-mail/AirDrop, no server needed. |

Everything a tester enters is stored in their own browser only (`localStorage`). *Profile → Start over* or *Restart sign-up* clears it.

## What to try

1. **Sign up** (or *Explore with an example profile*): level, spots, boards, watch.
2. **Spots**: switch boards and watch every fit score change. Tap a spot.
3. **Day curve**: drag along the curve in the forecast card to see your fit hour by hour – it combines swell, tide and the afternoon wind. The band is your best window.
4. **Lessons / Board rental**: compare schools by how the *conditions* fit you during the lesson, book one, add it to your calendar.
5. **Bookings**: tap *Demo: finish it*, rate the lesson – your sweet spot on the Profile tab moves.
6. **Log session** (button on the Spots tab) for surfs without a lesson.
7. Switch between the **full version** and **phase 1 (MVP)** (desktop sidebar, or *Profile → About this prototype*).

## Project structure

No build step and no dependencies – plain HTML, CSS and JavaScript modules.

```
index.html                 app shell (phone frame on desktop, full screen on phones)
manifest.webmanifest, sw.js  installable app + offline support
assets/fonts, assets/img   self-hosted fonts (no Google requests), icons, logo, share image
src/css/base.css           design tokens, layout shell, buttons, fields
src/css/components.css     tab bar, sheets, toasts, fit badges, map, rows
src/css/screens.css        the individual screens
src/js/data.js             ← all example content: spots, forecasts, schools, rentals, guides, texts
src/js/model.js            the fit model: sweet spot, fit score, day curve, best window
src/js/app.js              navigation, sheets, toasts, all tap actions
src/js/screens/*.js        one file per tab (onboarding, spots, lessons, bookings, profile)
src/js/sheets.js           bottom sheets (booking, log session, info, …)
src/js/state.js            app state + saving to the browser
src/js/morph.js            tiny DOM patcher: screens are template strings, only changes are applied
tests/e2e.spec.mjs         end-to-end + accessibility test suite (Playwright + axe-core)
tools/build-single.mjs     builds dist/surfletics.html
legacy/v1-click-dummy.html the original single-file click dummy, for comparison
```

**Changing content:** almost everything lives in `src/js/data.js` – add a spot, rename a school, change prices or guide texts there. Wave forecasts are 7 numbers per spot (today … +6 days), so dates always start today.

**How the fit score works:** `src/js/model.js`. Each board type has a starting sweet spot (`TEMPL` in `data.js`), shifted by level and fitness, and moved ±0.1 m by every *too easy / too hard* rating. The score drops the further the forecast is outside that range, with a per-spot difficulty `bias`. The day curve adds the tide each spot likes and the afternoon wind.

## Commands

```bash
npm start                 # serve on http://localhost:8080
npm install               # once, for the two commands below
npm run build:single      # → dist/surfletics.html
npm test                  # e2e + accessibility tests (needs Playwright + Chromium)
```

After deploying changes, bump `VERSION` in `sw.js` so installed copies refresh their offline cache.

## Credits

Fonts: Figtree and Bricolage Grotesque (SIL Open Font License, self-hosted). QR codes: qrcode-generator (MIT).
