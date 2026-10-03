# Changelog

## v2 – rebuild of the click dummy

The original single-file prototype (`legacy/v1-click-dummy.html`) had a strong concept – the fit score, sweet spot per board and spot guides all stay. v2 rebuilds the structure around it and fixes what got in the way of testing it with real people.

### New
- **Day curve** on every spot: fit hour by hour from swell, tide and afternoon wind, with your best window. Drag to check any hour (keyboard accessible).
- **Sweet spot that learns**: *too easy / too hard* ratings move your range, and the Profile shows what it was learned from.
- **Saved progress**: profile, boards, bookings and ratings survive a reload.
- **Installable app** (PWA): home-screen icon, full screen, offline. *Profile → Install as an app* explains how.
- **Real dates**: the forecast always starts today; bookings that are over move to *Past & ratings* by themselves.
- **Booking flow**: confirmation with price and cancellation policy, success screen, *Add to calendar* (.ics), cancel, and a free "move to a better day" suggestion when the forecast drops.
- **Desktop presentation**: phone frame, notes for testers, version switch, feedback button and a QR code to open the prototype on a phone.
- Single-file build (`dist/surfletics.html`) for sharing without a server.

### Fixed
- *Skip this step* deleted spots and boards that had already been entered.
- Every new user saw a made-up "Maré Alta" lesson to rate. Ratings now only appear for your own finished bookings.
- *Log session* always saved tomorrow's wave data and fixed scores (55/93); it now uses the chosen day and computes the score.
- *Restart* only reset part of the state; *Edit profile* sent you back through sign-up.
- Dates were fixed to "Fri 11 Oct" (a Sunday in 2026).
- Toasts, the *Log session* button and the feedback button covered each other and the content.
- Fake status bar was invisible on the welcome screen; no safe areas on iPhones; iOS zoomed into every input.
- Board length/volume are validated ("8'0", "7.2" and "96" all work); clear inline errors everywhere.

### Accessibility
- Sheets are real dialogs: focus moves in and back, Escape closes, focus is trapped, background is inert.
- Every text and badge passes WCAG AA contrast (was e.g. 2.2:1 for white on orange, 2.7:1 for inactive tabs).
- Readable text is at least 11.5 px (was down to 7.5 px) – only the decorative “fit” tags inside badges are smaller; touch targets enlarged to 40–48 px; selected states announced (`aria-pressed`, tabs, radios).
- Toasts are announced to screen readers; map pins work with the keyboard; reduced motion respected.
- Automated axe-core scan of every screen: no violations.

### Content
- Spot facts checked against surf guides: São Pedro is a right-hand point; crowd levels for Carcavelos, Guincho and Parede corrected; Guincho's rocks are mid-beach and the Nortada picks up from late morning; Cascais only works on big swells.
- Wave energy now uses the physical constant (≈ 1.96 · H² · T² kJ per metre of crest), explained in the app.
- Copy tightened throughout (sentence case, active buttons, no "Diverse"/"Pretend" wording, empty states that say what to do next).

### Under the hood
- Split into modules (data, model, screens, sheets, state) – no build step, works on GitHub Pages as before.
- Screens update by patching the DOM instead of re-rendering everything: keyboard focus, scroll and chip positions survive every tap.
- Fonts self-hosted (no requests to Google before consent).
- End-to-end + accessibility test suite (29 checks).
