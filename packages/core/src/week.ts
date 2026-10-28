import type { Day } from "./queue";

const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

/** Index 0 = Monday, from a Buffer day name such as "monday" or "Mon". -1 if unknown. */
export const dayIndex = (name: string) => DAY_KEYS.indexOf(name.slice(0, 3).toLowerCase());

export interface ZonedParts { date: string; time: string } // "YYYY-MM-DD", "HH:mm" in the zone

export function zonedParts(when: string | Date, timeZone: string): ZonedParts {
  const f = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  });
  const p = Object.fromEntries(f.formatToParts(new Date(when)).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}

const utcNoon = (iso: string) => new Date(`${iso}T12:00:00Z`);
const toIso = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(iso: string, n: number): string {
  const d = utcNoon(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}

/** The Monday on or before the given date. */
export function weekStart(iso: string): string {
  const dow = (utcNoon(iso).getUTCDay() + 6) % 7; // Monday = 0
  return addDays(iso, -dow);
}

export const isIsoDate = (s: string | undefined): s is string => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(utcNoon(s).getTime());

export function buildDays(start: string): Day[] {
  return Array.from({ length: 7 }, (_, i) => {
    const iso = addDays(start, i);
    const d = utcNoon(iso);
    return {
      iso,
      name: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      date: d.getUTCDate(),
      full: d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }),
    };
  });
}

export function weekLabel(days: Day[]): string {
  const [first, last] = [days[0]!, days[6]!];
  const month = (iso: string) => utcNoon(iso).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  return month(first.iso) === month(last.iso)
    ? `${month(first.iso)} ${first.date} – ${last.date}`
    : `${month(first.iso)} ${first.date} – ${month(last.iso)} ${last.date}`;
}
