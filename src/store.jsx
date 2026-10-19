import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { buildSeed } from './seed';
import {
  ACTIVE, CUTOFF_HOURS, WINDOW_DAYS, addDays, apptDate, isOccupying, overlaps, slotsFor, todayStr, toMin,
} from './utils';

const DB_KEY = 'habs_db_v1';
const SESSION_KEY = 'habs_session';
const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

function loadDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* fall through to seed */ }
  return buildSeed();
}
function loadSession() {
  try {
    return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || null;
  } catch {
    return null;
  }
}
const fail = (error) => ({ ok: false, error });
const norm = (s) => String(s || '').replace(/\D/g, '').slice(-10);

// Returns an error string, or null when the slot can be taken.
export function slotError(db, doctorId, date, time, patientId, ignoreId) {
  const doc = db.users.find((u) => u.id === doctorId && u.role === 'doctor');
  if (!doc || !doc.active) return 'This doctor is not accepting appointments.';
  const slot = slotsFor(doc, date).find((s) => s.time === time);
  if (!slot) return 'The selected date and time is not an available slot.';
  if (apptDate(date, time) <= new Date()) return 'Past dates and times cannot be booked.';
  if (date > addDays(todayStr(), WINDOW_DAYS)) return `Appointments can be booked up to ${WINDOW_DAYS} days in advance.`;
  const cand = { date, time, duration: slot.duration };
  const taken = db.appointments.some(
    (a) => a.id !== ignoreId && a.doctorId === doctorId && isOccupying(a) && overlaps(a, cand),
  );
  if (taken) return 'Sorry, this slot has just been booked. Please pick another one.';
  const clash = db.appointments.some(
    (a) => a.id !== ignoreId && a.patientId === patientId && ACTIVE.includes(a.status) && overlaps(a, cand),
  );
  if (clash) return 'You already have an appointment at this time.';
  return null;
}

export function isSlotBooked(db, doctorId, date, slot, ignoreId) {
  const cand = { date, time: slot.time, duration: slot.duration };
  return db.appointments.some((a) => a.id !== ignoreId && a.doctorId === doctorId && isOccupying(a) && overlaps(a, cand));
}

export function AppProvider({ children }) {
  const [db, setDb] = useState(loadDb);
  const [sessionId, setSessionId] = useState(loadSession);
  const [toast, setToast] = useState(null);
  const ref = useRef(db);

  useEffect(() => {
    ref.current = db;
    try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* ignore quota errors */ }
  }, [db]);
  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const user = db.users.find((u) => u.id === sessionId && u.active) || null;
  const notify = useCallback((msg, type = 'ok') => setToast({ msg, type }), []);

  // Apply a change and keep the ref in sync so consecutive calls see fresh data.
  const commit = (next) => { ref.current = next; setDb(next); };
  const audit = (d, action) => ({
    ...d, audit: [{ ts: new Date().toISOString(), actor: user ? `${user.name} (${user.role})` : 'Guest', action }, ...d.audit].slice(0, 100),
  });
  const docOf = (d, id) => d.users.find((u) => u.id === id);

  const api = useMemo(() => ({
    login(identifier, password, remember) {
      const d = ref.current;
      const id = identifier.trim().toLowerCase();
      const found = d.users.find((u) => u.email.toLowerCase() === id || (norm(id).length === 10 && norm(u.mobile) === norm(id)));
      if (!found || found.password !== password) return fail('Invalid email/mobile number or password.');
      if (!found.active) return fail('This account is deactivated. Please contact the hospital.');
      try {
        localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
        (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, found.id);
      } catch { /* ignore */ }
      setSessionId(found.id);
      return { ok: true, user: found };
    },
    logout() {
      try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
      setSessionId(null);
    },
    resetDemo() {
      commit(buildSeed());
      api.logout();
    },
    // Create or update any user (patient / doctor). Used by registration, profile and admin forms.
    saveUser(data) {
      const d = ref.current;
      if (d.users.some((u) => u.id !== data.id && u.email.toLowerCase() === data.email.toLowerCase())) {
        return fail('An account with this email already exists.');
      }
      const isNew = !data.id;
      let saved;
      let users;
      if (isNew) {
        const prefix = data.role === 'doctor' ? 'd' : 'p';
        saved = {
          active: true,
          ...(data.role === 'doctor'
            ? { availability: { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '16:00', duration: 30 }, blocked: [], dateSlots: {} }
            : {}),
          ...data,
          id: `${prefix}${Date.now().toString().slice(-7)}`,
        };
        users = [...d.users, saved];
      } else {
        saved = { ...d.users.find((u) => u.id === data.id), ...data };
        users = d.users.map((u) => (u.id === data.id ? saved : u));
      }
      commit(audit({ ...d, users }, `${isNew ? 'Created' : 'Updated'} ${saved.role} account: ${saved.name}`));
      return { ok: true, user: saved };
    },
    toggleActive(id) {
      const d = ref.current;
      const target = docOf(d, id);
      if (!target) return fail('User not found.');
      if (target.active && target.role === 'doctor') {
        const open = d.appointments.filter((a) => a.doctorId === id && ACTIVE.includes(a.status) && apptDate(a.date, a.time) >= new Date());
        if (open.length) return fail(`Cancel or reassign ${open.length} upcoming appointment(s) before deactivating this doctor.`);
      }
      const users = d.users.map((u) => (u.id === id ? { ...u, active: !u.active } : u));
      commit(audit({ ...d, users }, `${target.active ? 'Deactivated' : 'Activated'} ${target.role}: ${target.name}`));
      return { ok: true };
    },

    bookAppointment({ patientId, doctorId, date, time, reason }) {
      const d = ref.current;
      if (!docOf(d, patientId) || docOf(d, patientId).role !== 'patient') return fail('Only logged-in patients can book appointments.');
      const err = slotError(d, doctorId, date, time, patientId);
      if (err) return fail(err);
      const slot = slotsFor(docOf(d, doctorId), date).find((s) => s.time === time);
      const apt = {
        id: `APT-${d.seq}`, doctorId, patientId, date, time, duration: slot.duration, status: 'Booked',
        reason: (reason || '').trim(), createdAt: new Date().toISOString(),
      };
      commit(audit({ ...d, seq: d.seq + 1, appointments: [...d.appointments, apt] }, `Booked ${apt.id}`));
      return { ok: true, apt };
    },
    cancelAppointment(id) {
      const d = ref.current;
      const a = d.appointments.find((x) => x.id === id);
      if (!a) return fail('Appointment not found.');
      if (!ACTIVE.includes(a.status)) return fail('Only booked or rescheduled appointments can be cancelled.');
      if (user?.role === 'patient' && apptDate(a.date, a.time) - new Date() < CUTOFF_HOURS * 3600e3) {
        return fail(`Appointments can only be cancelled up to ${CUTOFF_HOURS} hours before the start time.`);
      }
      if (user?.role === 'doctor' && a.doctorId !== user.id) return fail('You can only manage your own appointments.');
      const appointments = d.appointments.map((x) => (x.id === id ? { ...x, status: 'Cancelled', cancelledBy: user?.role } : x));
      commit(audit({ ...d, appointments }, `Cancelled ${id}`));
      return { ok: true };
    },
    rescheduleAppointment(id, date, time) {
      const d = ref.current;
      const a = d.appointments.find((x) => x.id === id);
      if (!a) return fail('Appointment not found.');
      if (!ACTIVE.includes(a.status)) return fail('Only booked or rescheduled appointments can be rescheduled.');
      if (user?.role === 'patient' && apptDate(a.date, a.time) - new Date() < CUTOFF_HOURS * 3600e3) {
        return fail(`Appointments can only be rescheduled up to ${CUTOFF_HOURS} hours before the start time.`);
      }
      if (a.date === date && a.time === time) return fail('Please choose a different slot.');
      const err = slotError(d, a.doctorId, date, time, a.patientId, id);
      if (err) return fail(err);
      const slot = slotsFor(docOf(d, a.doctorId), date).find((s) => s.time === time);
      // The old slot is released only now, after the new one is validated (BR-06).
      const appointments = d.appointments.map((x) => (x.id === id ? { ...x, date, time, duration: slot.duration, status: 'Rescheduled' } : x));
      commit(audit({ ...d, appointments }, `Rescheduled ${id} to ${date} ${time}`));
      return { ok: true, apt: appointments.find((x) => x.id === id) };
    },
    setStatus(id, status) {
      const d = ref.current;
      const a = d.appointments.find((x) => x.id === id);
      if (!a) return fail('Appointment not found.');
      if (user?.role === 'doctor' && a.doctorId !== user.id) return fail('You can only manage your own appointments.');
      if (!ACTIVE.includes(a.status)) return fail('This appointment can no longer be changed.');
      if (status !== 'Cancelled' && a.date > todayStr()) return fail('An appointment can only be marked after its date has arrived.');
      const appointments = d.appointments.map((x) => (x.id === id ? { ...x, status, cancelledBy: status === 'Cancelled' ? user?.role : x.cancelledBy } : x));
      commit(audit({ ...d, appointments }, `Marked ${id} as ${status}`));
      return { ok: true };
    },

    // ---- Doctor availability ----
    updateDoctor(id, patch) {
      const d = ref.current;
      commit(audit({ ...d, users: d.users.map((u) => (u.id === id ? { ...u, ...patch } : u)) }, 'Updated doctor profile / availability'));
      return { ok: true };
    },
    setDateSlots(id, date, cfg) {
      const d = ref.current;
      if (date < todayStr()) return fail('Choose today or a future date.');
      if (toMin(cfg.end) <= toMin(cfg.start)) return fail('End time must be after start time.');
      const doc = docOf(d, id);
      const booked = d.appointments.filter((a) => a.doctorId === id && a.date === date && ACTIVE.includes(a.status));
      const outside = booked.filter((a) => toMin(a.time) < toMin(cfg.start) || toMin(a.time) + a.duration > toMin(cfg.end));
      if (outside.length) return fail('Some booked appointments fall outside this time range. Cancel them first.');
      const blocked = (doc.blocked || []).filter((x) => x !== date);
      return api.updateDoctor(id, { dateSlots: { ...(doc.dateSlots || {}), [date]: { ...cfg, days: [] } }, blocked });
    },
    removeDateSlots(id, date) {
      const doc = docOf(ref.current, id);
      const next = { ...(doc.dateSlots || {}) };
      delete next[date];
      return api.updateDoctor(id, { dateSlots: next });
    },
    blockDate(id, date) {
      const d = ref.current;
      if (!date || date < todayStr()) return fail('Choose today or a future date.');
      const open = d.appointments.filter((a) => a.doctorId === id && a.date === date && ACTIVE.includes(a.status));
      if (open.length) return fail(`${open.length} appointment(s) exist on this date. Cancel them before blocking it.`);
      const doc = docOf(d, id);
      if ((doc.blocked || []).includes(date)) return fail('This date is already blocked.');
      return api.updateDoctor(id, { blocked: [...(doc.blocked || []), date].sort() });
    },
    unblockDate(id, date) {
      const doc = docOf(ref.current, id);
      return api.updateDoctor(id, { blocked: (doc.blocked || []).filter((x) => x !== date) });
    },
  }), [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo(() => ({ db, user, notify, toast, ...api }), [db, user, notify, toast, api]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
