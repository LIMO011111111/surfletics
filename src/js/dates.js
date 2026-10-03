/* Dates are always relative to today, so the prototype never looks stale. */

const fmtWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const fmtLongWeekday = new Intl.DateTimeFormat("en-GB", { weekday: "long" });
const fmtDayMonth = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function dayDate(offset) {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

/** Forecast days: index 0 = today … 6. */
export const DAYS = Array.from({ length: 7 }, (_, i) => {
  const d = dayDate(i);
  return {
    i,
    date: d,
    wd: fmtWeekday.format(d),
    wdLong: fmtLongWeekday.format(d),
    dm: fmtDayMonth.format(d),
    iso: d.toISOString().slice(0, 10),
  };
});

/** "Today", "Tomorrow", "Mon" */
export const dayName = (i) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAYS[i].wd);
/** "Today", "Tomorrow", "Monday" */
export const dayNameLong = (i) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : DAYS[i].wdLong);
/** "Today, 3 Oct" / "Mon 6 Oct" */
export const dayFull = (i) => (i <= 1 ? `${dayName(i)}, ${DAYS[i].dm}` : `${DAYS[i].wd} ${DAYS[i].dm}`);

/** For past items: offset in days (negative = past). */
export function pastLabel(daysAgo) {
  if (daysAgo === 0) return "Today";
  if (daysAgo === 1) return "Yesterday";
  const d = dayDate(-daysAgo);
  return `${fmtWeekday.format(d)} ${fmtDayMonth.format(d)}`;
}

export const thisYear = new Date().getFullYear();

/** "09:30" -> minutes */
export const toMin = (t) => { const [h, m] = String(t).split(":").map(Number); return h * 60 + (m || 0); };
/** minutes -> "09:30" */
export const toHHMM = (m) => {
  m = ((Math.round(m) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

/* Approximate daylight on the Lisbon coast, by month (sunrise, sunset in minutes). */
const SUN = [[470, 1045], [450, 1080], [415, 1110], [440, 1200], [400, 1225], [375, 1250], [385, 1250], [415, 1220], [445, 1175], [460, 1135], [430, 1050], [460, 1030]];
export const sun = (i) => { const [r, s] = SUN[DAYS[i].date.getMonth()]; return { rise: r, set: s }; };
