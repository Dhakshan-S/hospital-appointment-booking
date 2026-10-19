// Date / slot helpers. Dates are local 'YYYY-MM-DD', times are 'HH:MM' (24h).
export const SPECIALIZATIONS = ['Cardiology', 'Dermatology', 'Pediatrics', 'Orthopedics'];
export const STATUSES = ['Booked', 'Rescheduled', 'Completed', 'Cancelled', 'No-Show'];
export const ACTIVE = ['Booked', 'Rescheduled']; // can be cancelled / rescheduled / completed
export const CUTOFF_HOURS = 2; // BR-11
export const WINDOW_DAYS = 30; // BR-14
export const BREAK = ['12:00', '14:00']; // lunch break, no slots

const pad = (n) => String(n).padStart(2, '0');
export const toDateStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parseDate = (s) => new Date(`${s}T00:00:00`);
export const addDays = (s, n) => {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};
export const todayStr = () => toDateStr(new Date());
export const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
export const fromMin = (m) => `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
export const apptDate = (date, time) => new Date(`${date}T${time}:00`);

export function fmtTime(t) {
  const h = Number(t.slice(0, 2));
  return `${pad(h % 12 === 0 ? 12 : h % 12)}:${t.slice(3, 5)} ${h >= 12 ? 'PM' : 'AM'}`;
}
export const fmtDateLong = (s) =>
  parseDate(s).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }).replace(',', ',');
export const fmtDateShort = (s) =>
  parseDate(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
export const dayName = (s) => parseDate(s).toLocaleDateString('en-GB', { weekday: 'short' });
export const dayNum = (s) => parseDate(s).getDate();
export const initials = (name) =>
  name.replace(/^Dr\.?\s*/i, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
export const rupee = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

// Slots a doctor offers on a given date (ignores bookings).
export function slotsFor(doctor, date) {
  if (!doctor || !doctor.active) return [];
  if ((doctor.blocked || []).includes(date)) return [];
  const override = (doctor.dateSlots || {})[date];
  const a = override || doctor.availability;
  if (!a) return [];
  if (!override && !a.days.includes(parseDate(date).getDay())) return [];
  const out = [];
  for (let m = toMin(a.start); m + a.duration <= toMin(a.end); m += a.duration) {
    if (m >= toMin(BREAK[0]) && m < toMin(BREAK[1])) continue;
    out.push({ time: fromMin(m), duration: a.duration });
  }
  return out;
}

export const isOccupying = (a) => a.status !== 'Cancelled';
export const overlaps = (a, b) => {
  const s1 = toMin(a.time), e1 = s1 + (a.duration || 30);
  const s2 = toMin(b.time), e2 = s2 + (b.duration || 30);
  return a.date === b.date && s1 < e2 && s2 < e1;
};

export function downloadCsv(filename, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export const TITLES = { Cardiology: 'Cardiologist', Dermatology: 'Dermatologist', Pediatrics: 'Pediatrician', Orthopedics: 'Orthopedic surgeon' };
export const titleOf = (spec) => TITLES[spec] || spec;
export function fmtNext(date, time) {
  const t = todayStr();
  const label = date === t ? 'Today' : `${dayName(date)} ${String(dayNum(date)).padStart(2, '0')} ${parseDate(date).toLocaleDateString('en-GB', { month: 'short' })}`;
  return `${label}, ${fmtTime(time).replace(/^0/, '')}`;
}
