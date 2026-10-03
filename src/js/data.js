/* ==========================================================================
   Surfletics – example data
   Everything in this file is EXAMPLE content for the prototype: spots,
   forecasts, schools, prices and reviews are invented or approximated.
   Edit freely – the UI reads everything from here.
   ========================================================================== */

/* Seven-day forecast per spot. Index 0 = today, 6 = in six days.
   h = wave height (m), p = period (s).
   x/y = position on the illustrated map (SVG units, see ui.js > mapSvg).
   lowTide = time of the first low tide today (shifts ~50 min per day).
   tide = which tide the spot likes (used for the hourly fit curve).
   windBuild = how strongly the afternoon wind spoils it (0–1).
   bias = how forgiving the spot is in general (negative = harder than the
   numbers suggest, e.g. shallow reef or rarely breaking). */
export const SPOTS = {
  guin: {
    name: "Guincho", short: "Guincho", x: 52, y: 312, label: "left",
    brk: "beach", brkLong: "exposed beach break",
    h: [1.4, 2.0, 2.1, 3.0, 2.6, 1.8, 1.6], p: [10, 12, 11, 15, 13, 11, 11],
    wind: "N 16 kn", windNote: "Nortada, cross-onshore", lowTide: "10:30",
    tide: "lowmid", windBuild: 0.9, crowd: "Medium", bias: -6,
  },
  casc: {
    name: "Cascais", short: "Cascais", x: 104, y: 398, label: "below",
    brk: "beach", brkLong: "sheltered bay",
    h: [0.3, 0.5, 0.6, 1.2, 0.9, 0.5, 0.4], p: [8, 9, 9, 12, 11, 9, 8],
    wind: "NE 7 kn", windNote: "offshore", lowTide: "10:40",
    tide: "midhigh", windBuild: 0.3, crowd: "Medium", bias: -28,
  },
  spe: {
    name: "São Pedro do Estoril", short: "São Pedro", x: 196, y: 396, label: "below",
    brk: "right point", brkLong: "right-hand point over rock",
    h: [0.7, 1.0, 1.1, 1.9, 1.5, 0.9, 0.9], p: [9, 10, 10, 13, 12, 10, 9],
    wind: "NE 8 kn", windNote: "offshore", lowTide: "10:45",
    tide: "lowmid", windBuild: 0.4, crowd: "Medium", bias: -2,
  },
  par: {
    name: "Parede", short: "Parede", x: 258, y: 393, label: "below",
    brk: "reef", brkLong: "right-hand reef",
    h: [0.9, 1.3, 1.4, 2.3, 1.8, 1.2, 1.1], p: [9, 11, 10, 14, 12, 10, 10],
    wind: "NE 9 kn", windNote: "offshore", lowTide: "10:40",
    tide: "lowmid", windBuild: 0.4, crowd: "Low", bias: -30,
  },
  carc: {
    name: "Carcavelos", short: "Carcavelos", x: 318, y: 394, label: "below",
    brk: "beach", brkLong: "beach break",
    h: [0.8, 1.2, 1.3, 2.2, 1.7, 1.1, 1.0], p: [9, 11, 10, 14, 12, 10, 10],
    wind: "NE 9 kn", windNote: "offshore", lowTide: "10:40",
    tide: "lowmid", windBuild: 0.45, crowd: "High", bias: 0,
  },
};

/* Water temperature on the Cascais line in October (°C, approx.). */
export const WATER = { temp: 18, suit: "3/2 mm wetsuit" };

/* Spots offered in onboarding ("where have you surfed?"). */
export const SPOTLIST = ["Carcavelos", "São Pedro do Estoril", "Guincho", "Parede", "Ericeira", "Costa da Caparica", "Peniche", "Cascais"];

/* Surf schools (fictional example names).
   spots = schools that drive to whichever of these spots fits best that day.
   off = small fit adjustment for the lesson itself (coaching, timing). */
export const SCHOOLS = [
  { id: "mare", name: "Maré Alta Surf School", spot: "carc", time: "09:00–11:00", what: "group of 4", price: 45, rating: 4.9, n: 212, off: 2,
    focus: "Beginners and improvers, first green waves", levels: "Beginner–Intermediate", video: false, gear: true, travel: "train" },
  { id: "onda", name: "Onda Viva Coaching", spot: "carc", spots: ["carc", "spe", "par"], time: "10:30–12:00", what: "coaching, max. 3", price: 60, rating: 4.8, n: 97, off: -32,
    focus: "Technique: pop-up, turns, wave choice", levels: "Intermediate–Advanced", video: true, gear: false, travel: "train" },
  { id: "costa", name: "Costa Azul Surf", spot: "spe", time: "08:30–10:30", what: "small group", price: 40, rating: 4.7, n: 158, off: -26,
    focus: "Reading the point and catching green waves", levels: "Intermediate", video: true, gear: true, travel: "car" },
  { id: "lsc", name: "Lisbon Surf Collective", spot: "carc", spots: ["carc", "spe", "casc"], time: "10:00–12:30", what: "mixed-level groups", price: 39, rating: 4.7, n: 301, off: 0,
    focus: "Every level in one session, split by ability in the water", levels: "All levels", video: false, gear: true, travel: "pickup" },
  { id: "gwc", name: "Guincho Wave Club", spot: "guin", spots: ["guin", "carc", "par"], time: "11:00–13:00", what: "advanced session", price: 50, rating: 4.6, n: 74, off: -2,
    focus: "Bigger-wave safety, paddle power, duck dives", levels: "Advanced", video: true, gear: false, travel: "car" },
  { id: "kids", name: "Cascais Surf Kids & Co", spot: "casc", time: "14:00–16:00", what: "beginner group", price: 35, rating: 4.5, n: 120, off: 0,
    focus: "First lessons in white water, families and kids", levels: "Beginner", video: false, gear: true, travel: "train" },
];

/* Board rental shops (fictional). boards: [type, length, € per half day, level] */
export const RENTALS = [
  { id: "shack", name: "Carcavelos Board Shack", spot: "carc", rating: 4.8, n: 184, wet: true,
    boards: [["Soft-top", "8'0\"", 15, "Beginner"], ["Longboard", "9'2\"", 20, "Beginner–Intermediate"], ["Mid-length", "7'2\"", 18, "Intermediate"], ["Shortboard", "6'0\"", 18, "Advanced"]] },
  { id: "estoril", name: "Estoril Surf Rentals", spot: "spe", rating: 4.6, n: 92, wet: true,
    boards: [["Soft-top", "8'6\"", 15, "Beginner"], ["Mid-length", "7'6\"", 18, "Intermediate"]] },
  { id: "gpro", name: "Guincho Pro Shop", spot: "guin", rating: 4.7, n: 61, wet: false,
    boards: [["Mid-length", "7'0\"", 20, "Intermediate"], ["Shortboard", "5'10\"", 22, "Advanced"]] },
  { id: "cbr", name: "Cascais Beach Rentals", spot: "casc", rating: 4.4, n: 140, wet: true,
    boards: [["Soft-top", "8'0\"", 12, "Beginner"], ["Longboard", "9'0\"", 18, "Beginner–Intermediate"]] },
];

/* Starting sweet spot per board type, before the user has rated anything.
   h = wave height range (m), p = period range (s), e = energy range (kJ). */
export const TEMPL = {
  "Longboard": { h: [0.5, 1.2], p: [8, 12], e: [100, 450], brk: "beach break" },
  "Mid-length": { h: [0.7, 1.5], p: [9, 13], e: [150, 650], brk: "beach break, soft point" },
  "Shortboard": { h: [1.0, 2.0], p: [10, 14], e: [300, 1300], brk: "reef and point" },
  "Soft-top": { h: [0.3, 0.9], p: [7, 11], e: [50, 250], brk: "beach break" },
};
export const BOARD_TYPES = Object.keys(TEMPL);

export const LEVELS = ["Beginner", "Improver", "Intermediate", "Advanced", "Expert"];
export const LEVEL_INFO = {
  Beginner: "White water, first lessons",
  Improver: "First green waves, going left and right",
  Intermediate: "Turning on green waves, chest-high days",
  Advanced: "Head-high waves, reefs and points",
  Expert: "Overhead and bigger, heavy reefs, barrels",
};
export const LEVEL_ADJ = { Beginner: -0.35, Improver: -0.18, Intermediate: 0, Advanced: 0.45, Expert: 0.7 };

export const DEVICES = [
  ["Apple Watch", "Surf tracking apps"],
  ["Garmin", "Surf activity"],
  ["Rip Curl", "Search GPS watch"],
  ["Other", "Connect later in your profile"],
];

/* Spot guides. Written as example content from public surf-guide sources;
   always check local conditions and lifeguards. */
export const GUIDE = {
  carc: {
    tide: ["low", "mid"], tideTxt: "Works on all tides, cleanest from low to mid. On very high tides the waves get mushy and close out on the shore.",
    paddle: [1.5, "Paddle out through the white water where the waves are weakest, often next to a rip channel. On bigger days wait for a lull and go in one push."],
    current: "Rips form between the sandbanks and get stronger on bigger swells. Check your position against a landmark on the beach every few waves.",
    caution: "Rocks and the fort wall at the east end. Lessons stay in the middle of the beach, so keep clear of their zone. Water quality can drop after heavy rain.",
    tip: "Needs a west or south-west swell with a north or north-east wind. Summer is often flat, autumn and winter are best. Busy all year, so go early.",
  },
  spe: {
    tide: ["low", "mid"], tideTxt: "Low to mid tide. On the rising tide the shore break gets heavy, so take care getting in and out.",
    paddle: [1.2, "Paddle out from the side of the point, away from where the sets break. Do not cross the rocks in front of the peak."],
    current: "Little current on normal days, but a pull along the point on bigger swells.",
    caution: "Rocky bottom and a shore break on the rising tide. Booties help. Kick out before the inside rocks.",
    tip: "A long right-hander that suits longboards and improvers on smaller days. It gets busy, so watch a few sets before paddling out.",
  },
  guin: {
    tide: ["low", "mid"], tideTxt: "Works on all tides depending on the sandbanks, usually best from low to mid.",
    paddle: [1.0, "Use the rips to get out. Above 2 m the paddle-out is long and exhausting, only go if you can duck dive well."],
    current: "Strong rips and sideways currents, worst near the deeper channels and on bigger swells. Not a spot for weak swimmers.",
    caution: "Rocks in the middle of the beach. The Nortada (north wind) gets strong from late morning, so go early. Often colder than the Cascais line.",
    tip: "Picks up almost any swell, so it often has waves when the Cascais line is flat. Not a first-timer spot above about 1.5 m.",
  },
  par: {
    tide: ["low", "mid"], tideTxt: "Low to mid tide. When the tide gets high the reef stops working well.",
    paddle: [1.0, "Paddle out through the channel next to the peak. Timing matters: go right after a set."],
    current: "Little current on normal days, but the channel pulls on bigger swells.",
    caution: "Steep, shallow take-off over reef, then a mellow wall. Intermediate to advanced. Stay off it if you are unsure.",
    tip: "Needs a proper swell to start working. Often quieter than Carcavelos and São Pedro.",
  },
  casc: {
    tide: ["mid", "high"], tideTxt: "Mid to high tide. At low tide the waves are tiny or break on the sand.",
    paddle: [2.0, "Easy paddle-out straight from the beach when it breaks."],
    current: "Sheltered bay with little current.",
    caution: "Rocks on both sides of the bay, stay in the middle. Swimmers and boats in summer, keep your distance.",
    tip: "Only works on big swells and is very small most days. On those days it can be a gentle option when everywhere else is too big.",
  },
};

/* Explanations behind the (i) buttons. */
export const INFO = {
  height: { t: "Wave height", body: `<p>How tall the waves are when they break, roughly the height of the wave face. Forecast sites measure this a little differently, so treat it as a guide.</p><dl class="scale"><dt>0.3–0.6 m</dt><dd>knee to waist high · ideal for your first sessions</dd><dt>0.6–1.2 m</dt><dd>waist to chest high · good for improving beginners</dd><dt>1.2–2 m</dt><dd>shoulder to head high · for intermediate surfers</dd><dt>2 m +</dt><dd>overhead · advanced surfers only</dd></dl>` },
  period: { t: "Wave period", body: `<p>The time in seconds between two waves passing the same point. It tells you how far the swell travelled and how much push it has.</p><dl class="scale"><dt>under 8 s</dt><dd>short-period wind swell · choppy and weaker</dd><dt>8–11 s</dt><dd>mixed swell · friendly, good for learning</dd><dt>12 s +</dt><dd>long-period ground swell · clean but powerful, waves feel bigger than forecast</dd></dl>` },
  shape: { t: "Wave shape", body: `<p>How the wave breaks. Two waves of the same height can feel completely different depending on how steep they get.</p><dl class="scale"><dt>Mellow</dt><dd>slow, crumbling wave · forgiving, great for longboards and learning</dd><dt>Punchy</dt><dd>steeper and more powerful · needs a quick take-off</dd><dt>Hollow</dt><dd>throws out and can barrel · fast and critical, for advanced surfers</dd></dl>` },
  energy: { t: "Wave energy", body: `<p>One number that combines wave height and period, in kilojoules (kJ). Two days with the same wave height can feel completely different: the day with the longer period carries far more power.</p><dl class="scale"><dt>under 200 kJ</dt><dd>gentle · easy to paddle out</dd><dt>200–600 kJ</dt><dd>moderate · fun once you catch green waves</dd><dt>600–1,000 kJ</dt><dd>strong · hard paddle-outs, heavy white water</dd><dt>1,000 kJ +</dt><dd>very powerful · experienced surfers only</dd></dl><p class="fine">Estimated from the energy of a single wave per metre of wave crest (≈ 1.96 · height² · period²).</p>` },
  direction: { t: "Wave direction", body: `<p>Which way the wave peels, seen from the surfer riding it. It decides whether you face the wave (frontside) or ride with your back to it (backside).</p><dl class="scale"><dt>Rights</dt><dd>break to the surfer’s right · frontside for regular-footed surfers</dd><dt>Lefts</dt><dd>break to the surfer’s left · frontside for goofy-footed surfers</dd></dl><p>Many surfers prefer their frontside, but not all. Surfletics learns your preferred direction from your ratings, not from your stance.</p>` },
  break: { t: "Type of break", body: `<p>What the sea floor looks like where the wave breaks. It changes how the wave behaves and how safe a fall is.</p><dl class="scale"><dt>Beach break</dt><dd>sandy bottom · forgiving, best for learning</dd><dt>Reef break</dt><dd>rock or reef · more regular waves, but shallow and sharp</dd><dt>Point break</dt><dd>wave peels along a headland · long rides, often crowded</dd></dl>` },
  curve: { t: "Your day curve", body: `<p>How well the conditions fit you hour by hour. It combines the swell with the tide the spot likes and the wind, which often picks up in the afternoon.</p><p>The highlighted band is your best window. Drag along the curve to check any hour.</p>` },
};

/* Rating follow-up chips: 0 = too easy, 1 = right fit, 2 = too hard */
export const FIT_OPTS = ["Too easy", "Right fit", "Too hard"];
export const REASONS = {
  0: { q: "What made it too easy?", r: ["Waves too small", "Too weak / mushy", "Too slow to catch", "Rides too short", "Too few waves", "Board too big for it"] },
  1: { q: "What made it work?", r: ["Clean waves", "Right wave size", "Good tide", "Easy paddle-out", "Uncrowded", "Right board"] },
  2: { q: "What made it too hard?", r: ["Waves too big", "Too powerful", "Too steep / hollow", "Strong shore break", "Strong current / rip", "Hard paddle-out", "Closing out", "Too crowded", "Too windy / choppy", "Wrong board", "Too cold / tired"] },
};

/* The example profile ("Explore with example profile"). */
export const EXAMPLE = {
  user: { name: "Ella R.", age: 25, gender: "Female", height: 168, weight: 61, fitness: 4, level: "Intermediate", since: 2023, stance: "Regular" },
  spots: { "Carcavelos": "This month", "São Pedro do Estoril": "This year", "Guincho": "This year", "Parede": "1–2 years ago" },
  boards: [
    { type: "Longboard", len: "9'2\"", w: "22¾\"", t: "3\"", vol: 68 },
    { type: "Mid-length", len: "7'2\"", w: "21\"", t: "2¾\"", vol: 45 },
    { type: "Shortboard", len: "6'0\"", w: "19¼\"", t: "2⅜\"", vol: 29 },
  ],
  device: "Garmin",
  /* past sessions: daysAgo, spot, board index, h, p, rating (0/1/2), stars */
  history: [
    [8, "carc", 1, 1.1, 11, 1, 5],
    [21, "guin", 2, 2.0, 13, 2, 3],
    [34, "par", 0, 1.0, 10, 1, 4],
    [41, "spe", 0, 1.1, 10, 1, 4],
  ],
  sessionsBefore: 19, wavesBefore: 251,
};

/* Feedback form for testers */
export const FEEDBACK_URL = "https://tally.so/r/1AqbeM";
