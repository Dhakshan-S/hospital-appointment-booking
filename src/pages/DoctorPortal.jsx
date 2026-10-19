import { useState } from 'react';
import { Badge, Field } from '../components';
import { useApp } from '../store';
import { ACTIVE, addDays, apptDate, fmtDateLong, fmtDateShort, fmtTime, rupee, todayStr, toMin } from '../utils';

const DURATIONS = [15, 20, 30, 45, 60];

export function ScheduleTable({ appts }) {
  const { db, setStatus, notify } = useApp();
  const act = (a, status) => {
    if (status === 'Cancelled' && !window.confirm('Cancel this appointment? The slot will be released.')) return;
    const r = setStatus(a.id, status);
    notify(r.ok ? `Appointment marked ${status}.` : r.error, r.ok ? 'ok' : 'err');
  };
  return (
    <div className="table-wrap"><table className="data">
      <thead><tr><th>Time</th><th>Patient</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>
        {appts.length === 0 && <tr><td colSpan={5} className="muted">No appointments.</td></tr>}
        {appts.map((a) => (
          <tr key={a.id}>
            <td><strong>{fmtTime(a.time)}</strong></td>
            <td>{db.users.find((u) => u.id === a.patientId)?.name}</td>
            <td>{a.reason || '—'}</td>
            <td><Badge status={a.status} /></td>
            <td>
              {ACTIVE.includes(a.status) ? (
                <div className="actions">
                  <button className="btn btn-primary btn-sm" onClick={() => act(a, 'Completed')}>Complete</button>
                  <button className="btn btn-outline btn-sm" onClick={() => act(a, 'No-Show')}>No-show</button>
                  <button className="btn btn-outline btn-sm" onClick={() => act(a, 'Cancelled')}>Cancel</button>
                </div>
              ) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table></div>
  );
}

const mine = (db, id, pred) => db.appointments.filter((a) => a.doctorId === id && pred(a)).sort((a, b) => apptDate(a.date, a.time) - apptDate(b.date, b.time));

export function DoctorToday() {
  const { db, user } = useApp();
  const t = todayStr();
  const list = mine(db, user.id, (a) => a.date === t);
  const count = (s) => list.filter((a) => (s === 'Booked' ? ACTIVE.includes(a.status) : a.status === s)).length;
  return (
    <>
      <div className="page-head">
        <div><h1>Today’s schedule</h1><p className="muted">{new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p></div>
        <div className="tags">
          <span className="chip">{count('Booked')} Booked</span>
          <span className="chip status-green">{count('Completed')} Completed</span>
          <span className="chip status-red">{count('Cancelled')} Cancelled</span>
        </div>
      </div>
      <div className="dash-split">
        <ScheduleTable appts={list} />
        <AvailabilityPanel />
      </div>
    </>
  );
}

export function DoctorSchedule() {
  const { db, user } = useApp();
  const [start, setStart] = useState(todayStr());
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  return (
    <>
      <div className="page-head">
        <h1>My schedule</h1>
        <div className="btn-row">
          <button className="btn btn-outline btn-sm" onClick={() => setStart(addDays(start, -7))}>← Previous week</button>
          <button className="btn btn-outline btn-sm" onClick={() => setStart(todayStr())}>This week</button>
          <button className="btn btn-outline btn-sm" onClick={() => setStart(addDays(start, 7))}>Next week →</button>
        </div>
      </div>
      <p className="muted">{fmtDateShort(days[0])} – {fmtDateShort(days[6])}</p>
      {days.map((d) => {
        const list = mine(db, user.id, (a) => a.date === d);
        const off = (user.blocked || []).includes(d);
        return (
          <div key={d} className="stack" style={{ gap: 10 }}>
            <h3>{fmtDateLong(d)} {off && <span className="chip status-red">Blocked</span>}</h3>
            {list.length ? <ScheduleTable appts={list} /> : <p className="muted">No appointments.</p>}
          </div>
        );
      })}
    </>
  );
}

// "Set availability" form for a single date, plus blocking dates.
export function AvailabilityPanel() {
  const { user, setDateSlots, blockDate, notify } = useApp();
  const [f, setF] = useState({ date: '', start: '09:00', end: '16:00', duration: 30 });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const done = (r, msg) => notify(r.ok ? msg : r.error, r.ok ? 'ok' : 'err');
  return (
    <div className="card stack">
      <h3>Set availability</h3>
      <Field label="Date"><input type="date" min={todayStr()} value={f.date} onChange={set('date')} /></Field>
      <div className="form-grid">
        <Field label="Start"><input type="time" value={f.start} onChange={set('start')} /></Field>
        <Field label="End"><input type="time" value={f.end} onChange={set('end')} /></Field>
      </div>
      <Field label="Slot duration">
        <select value={f.duration} onChange={(e) => setF({ ...f, duration: Number(e.target.value) })}>
          {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
        </select>
      </Field>
      <button className="btn btn-primary btn-block" onClick={() => {
        if (!f.date) return notify('Choose a date first.', 'err');
        done(setDateSlots(user.id, f.date, { start: f.start, end: f.end, duration: f.duration }), 'Slots saved for the selected date.');
      }}>Save slots</button>
      <button className="btn btn-outline btn-block" onClick={() => done(blockDate(user.id, f.date), 'Date blocked. No new bookings can be made.')}>Block a date</button>
    </div>
  );
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function DoctorAvailability() {
  const { user, updateDoctor, removeDateSlots, unblockDate, notify } = useApp();
  const [w, setW] = useState({ ...user.availability });
  const toggle = (i) => setW({ ...w, days: w.days.includes(i) ? w.days.filter((d) => d !== i) : [...w.days, i].sort() });
  const save = () => {
    if (w.days.length === 0) return notify('Select at least one working day.', 'err');
    if (toMin(w.end) <= toMin(w.start)) return notify('End time must be after start time.', 'err');
    updateDoctor(user.id, { availability: { ...w } });
    notify('Weekly availability saved.');
  };
  const overrides = Object.entries(user.dateSlots || {}).filter(([d]) => d >= todayStr()).sort();
  const blocked = (user.blocked || []).filter((d) => d >= todayStr());
  return (
    <>
      <h1>Availability</h1>
      <div className="grid-2">
        <div className="card stack">
          <h3>Weekly pattern</h3>
          <div className="days">
            {DAY_LABELS.map((l, i) => <button key={l} type="button" className={`day-toggle${w.days.includes(i) ? ' on' : ''}`} onClick={() => toggle(i)}>{l}</button>)}
          </div>
          <div className="form-grid">
            <Field label="Start"><input type="time" value={w.start} onChange={(e) => setW({ ...w, start: e.target.value })} /></Field>
            <Field label="End"><input type="time" value={w.end} onChange={(e) => setW({ ...w, end: e.target.value })} /></Field>
          </div>
          <Field label="Slot duration">
            <select value={w.duration} onChange={(e) => setW({ ...w, duration: Number(e.target.value) })}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </Field>
          <p className="muted small">Lunch break 12:00 – 14:00 is excluded from slots.</p>
          <button className="btn btn-primary" onClick={save}>Save weekly pattern</button>
        </div>
        <AvailabilityPanel />
      </div>
      <div className="grid-2">
        <div className="card stack">
          <h3>Custom dates</h3>
          {overrides.length === 0 && <p className="muted">No custom dates.</p>}
          {overrides.map(([d, c]) => (
            <div key={d} className="row-between"><span>{fmtDateShort(d)} · {fmtTime(c.start)} – {fmtTime(c.end)} ({c.duration} min)</span>
              <button className="link-btn" onClick={() => removeDateSlots(user.id, d)}>Remove</button></div>
          ))}
        </div>
        <div className="card stack">
          <h3>Blocked dates</h3>
          {blocked.length === 0 && <p className="muted">No blocked dates.</p>}
          {blocked.map((d) => (
            <div key={d} className="row-between"><span>{fmtDateShort(d)}</span><button className="link-btn" onClick={() => unblockDate(user.id, d)}>Unblock</button></div>
          ))}
        </div>
      </div>
    </>
  );
}

export function DoctorProfileEdit() {
  const { user, updateDoctor, notify } = useApp();
  const [f, setF] = useState({ bio: user.bio || '', qualification: user.qualification || '', experience: user.experience });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = (e) => {
    e.preventDefault();
    if (!f.qualification.trim() || Number(f.experience) < 0 || f.experience === '') return notify('Enter qualification and valid experience.', 'err');
    updateDoctor(user.id, { bio: f.bio.trim(), qualification: f.qualification.trim(), experience: Number(f.experience) });
    notify('Profile updated.');
  };
  return (
    <>
      <h1>My profile</h1>
      <form className="card stack" onSubmit={submit} style={{ maxWidth: 760 }}>
        <div className="form-grid">
          <Field label="Qualification"><input type="text" value={f.qualification} onChange={set('qualification')} /></Field>
          <Field label="Experience (years)"><input type="number" min="0" value={f.experience} onChange={set('experience')} /></Field>
          <Field label="Specialization"><input type="text" value={user.specialization} disabled /></Field>
          <Field label="Consultation fee"><input type="text" value={rupee(user.fee)} disabled /></Field>
        </div>
        <p className="muted small">Specialization and fee changes require administrator approval.</p>
        <Field label="About"><textarea rows={4} value={f.bio} onChange={set('bio')} /></Field>
        <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-start' }}>Save profile</button>
      </form>
    </>
  );
}
