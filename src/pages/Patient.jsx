import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Avatar, Badge, Field, SlotPicker } from '../components';
import { useApp } from '../store';
import {
  ACTIVE, CUTOFF_HOURS, addDays, apptDate, fmtDateLong, fmtDateShort, fmtTime, rupee, slotsFor, titleOf, todayStr,
} from '../utils';

const canChange = (a) => ACTIVE.includes(a.status) && apptDate(a.date, a.time) - new Date() >= CUTOFF_HOURS * 3600e3;

function firstAvailableDate(doc) {
  for (let i = 0; i <= 30; i++) { const d = addDays(todayStr(), i); if (slotsFor(doc, d).length) return d; }
  return todayStr();
}

// Handles both new bookings (/book/:doctorId) and rescheduling (/reschedule/:aptId).
export function Book({ reschedule }) {
  const { doctorId, aptId } = useParams();
  const [q] = useSearchParams();
  const { db, user, bookAppointment, rescheduleAppointment, notify } = useApp();
  const nav = useNavigate();
  const apt = reschedule ? db.appointments.find((a) => a.id === aptId && a.patientId === user.id) : null;
  const doc = db.users.find((u) => u.id === (reschedule ? apt?.doctorId : doctorId) && u.role === 'doctor');
  const [date, setDate] = useState(() => q.get('date') || (doc ? firstAvailableDate(doc) : todayStr()));
  const [time, setTime] = useState(q.get('time') || '');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  if (!doc || (reschedule && !apt)) return <div className="card">Appointment or doctor not found. <Link to="/doctors">Back to doctors</Link></div>;
  if (reschedule && !canChange(apt)) {
    return <div className="card stack"><p>This appointment can no longer be rescheduled (status or {CUTOFF_HOURS}-hour cut-off).</p><Link to="/appointments">Back to my appointments</Link></div>;
  }

  const confirm = () => {
    setErr('');
    if (!time) return setErr('Please select a time slot.');
    const r = reschedule ? rescheduleAppointment(apt.id, date, time) : bookAppointment({ patientId: user.id, doctorId: doc.id, date, time, reason });
    if (!r.ok) { setErr(r.error); return notify(r.error, 'err'); }
    notify(reschedule ? 'Appointment rescheduled. Confirmation sent (simulated).' : 'Appointment booked. Confirmation sent by email and SMS (simulated).');
    nav(`/confirmation/${r.apt.id}`);
  };

  return (
    <>
      <div className="steps">
        <span className="done">1 Doctor ✓</span><span className="current">2 Date and time</span><span>3 Confirmation</span>
      </div>
      <div className="split">
        <div className="card stack">
          <h2>{reschedule ? `Reschedule ${apt.id}` : 'Choose date and time'}</h2>
          <SlotPicker doctor={doc} date={date} time={time} onDate={setDate} onTime={setTime} ignoreId={apt?.id} />
          {!reschedule && (
            <Field label="Reason for visit (optional)">
              <textarea rows={4} maxLength={300} placeholder="Briefly describe your symptoms" value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
          )}
        </div>
        <div className="card stack">
          <h3>Booking summary</h3>
          <div className="doctor-head"><Avatar name={doc.name} size={52} /><div><strong>{doc.name}</strong><div className="muted">{titleOf(doc.specialization)}</div></div></div>
          <table className="kv"><tbody>
            <tr><td>Date</td><td>{fmtDateLong(date)}</td></tr>
            <tr><td>Time</td><td>{time ? fmtTime(time) : '—'}</td></tr>
            <tr><td>Fee</td><td>{rupee(doc.fee)} · pay at hospital</td></tr>
          </tbody></table>
          <p className="muted">Free cancellation or rescheduling up to {CUTOFF_HOURS} hours before the appointment.</p>
          {err && <div className="alert" role="alert">{err}</div>}
          <button className="btn btn-primary btn-block" onClick={confirm}>{reschedule ? 'Confirm new time' : 'Confirm booking'}</button>
          <button className="btn btn-outline btn-block" onClick={() => nav(-1)}>Back</button>
        </div>
      </div>
    </>
  );
}

export function Confirmation() {
  const { aptId } = useParams();
  const { db, user, cancelAppointment, notify } = useApp();
  const nav = useNavigate();
  const apt = db.appointments.find((a) => a.id === aptId && a.patientId === user.id);
  if (!apt) return <div className="card">Appointment not found. <Link to="/appointments">My appointments</Link></div>;
  const doc = db.users.find((u) => u.id === apt.doctorId);

  const cancel = () => {
    if (!window.confirm('Cancel this appointment?')) return;
    const r = cancelAppointment(apt.id);
    notify(r.ok ? 'Appointment cancelled.' : r.error, r.ok ? 'ok' : 'err');
    if (r.ok) nav('/appointments');
  };
  return (
    <div className="card confirm">
      <div className="tick">✓</div>
      <h1>{apt.status === 'Cancelled' ? 'Appointment cancelled' : 'Appointment confirmed'}</h1>
      <p className="muted">Appointment ID <strong style={{ color: 'var(--primary)' }}>{apt.id}</strong></p>
      <table className="kv"><tbody>
        <tr><td>Doctor</td><td>{doc.name} · <span style={{ fontWeight: 400 }}>{titleOf(doc.specialization)}</span></td></tr>
        <tr><td>Date and time</td><td>{fmtDateLong(apt.date)} · {fmtTime(apt.time)}</td></tr>
        <tr><td>Consultation fee</td><td>{rupee(doc.fee)} (pay at hospital)</td></tr>
        <tr><td>Patient</td><td>{user.name}</td></tr>
      </tbody></table>
      <p className="muted">A confirmation has been sent to your email and mobile number (simulated).</p>
      <div className="btn-row" style={{ justifyContent: 'center' }}>
        <Link className="btn btn-primary" to="/appointments">View my appointments</Link>
        {canChange(apt) && <Link className="btn btn-outline" to={`/reschedule/${apt.id}`}>Reschedule</Link>}
        {canChange(apt) && <button className="btn btn-outline" onClick={cancel}>Cancel</button>}
      </div>
    </div>
  );
}

export function MyAppointments() {
  const { db, user, cancelAppointment, notify } = useApp();
  const nav = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const mine = useMemo(() => db.appointments.filter((a) => a.patientId === user.id), [db, user]);
  const now = new Date();
  const upcoming = mine.filter((a) => ACTIVE.includes(a.status) && apptDate(a.date, a.time) >= now)
    .sort((a, b) => apptDate(a.date, a.time) - apptDate(b.date, b.time));
  const past = mine.filter((a) => !upcoming.includes(a)).sort((a, b) => apptDate(b.date, b.time) - apptDate(a.date, a.time));
  const doc = (a) => db.users.find((u) => u.id === a.doctorId);
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const cancel = (a) => {
    if (!window.confirm(`Cancel your appointment with ${doc(a).name} on ${fmtDateShort(a.date)}?`)) return;
    const r = cancelAppointment(a.id);
    notify(r.ok ? 'Appointment cancelled. The slot has been released.' : r.error, r.ok ? 'ok' : 'err');
  };
  const history = (list) => (
    <div className="table-wrap"><table className="data">
      <thead><tr><th>Date</th><th>Doctor</th><th>Specialization</th><th>Status</th></tr></thead>
      <tbody>
        {list.length === 0 && <tr><td colSpan={4} className="muted">No past appointments yet.</td></tr>}
        {list.map((a) => (
          <tr key={a.id}><td>{fmtDateShort(a.date)}</td><td>{doc(a).name}</td><td>{doc(a).specialization}</td><td><Badge status={a.status} /></td></tr>
        ))}
      </tbody>
    </table></div>
  );

  return (
    <>
      <div className="page-head">
        <div><h1>{greet}, {user.name.split(' ')[0]}</h1><p className="muted">Manage your upcoming and past appointments</p></div>
        <Link className="btn btn-primary" to="/doctors">Book new appointment</Link>
      </div>
      <div className="tabs">
        <button className={`tab${tab === 'upcoming' ? ' active' : ''}`} onClick={() => setTab('upcoming')}>Upcoming ({upcoming.length})</button>
        <button className={`tab${tab === 'past' ? ' active' : ''}`} onClick={() => setTab('past')}>Past ({past.length})</button>
      </div>
      {tab === 'upcoming' ? (
        <>
          {upcoming.length === 0 && <div className="card muted">No upcoming appointments. <Link to="/doctors">Find a doctor</Link></div>}
          {upcoming.map((a) => (
            <div key={a.id} className="card apt-card">
              <Avatar name={doc(a).name} size={48} />
              <div className="apt-info">
                <strong>{doc(a).name}</strong> <span className="muted">· {titleOf(doc(a).specialization)}</span>
                <div className="muted">{fmtDateLong(a.date)} · {fmtTime(a.time)} · {a.id}</div>
              </div>
              <Badge status={a.status} />
              <button className="btn btn-outline btn-sm" disabled={!canChange(a)} title={canChange(a) ? '' : `Changes close ${CUTOFF_HOURS} hours before the appointment`} onClick={() => nav(`/reschedule/${a.id}`)}>Reschedule</button>
              <button className="btn btn-outline btn-sm" disabled={!canChange(a)} onClick={() => cancel(a)}>Cancel</button>
            </div>
          ))}
          <h2>Recent history</h2>
          {history(past.slice(0, 3))}
        </>
      ) : history(past)}
    </>
  );
}

export function PatientProfile() {
  const { user, saveUser, notify } = useApp();
  const [f, setF] = useState({ name: user.name, dob: user.dob || '', gender: user.gender || '', mobile: user.mobile, email: user.email, password: '' });
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const x = {};
    if (f.name.trim().length < 2) x.name = 'Enter your full name.';
    if (!f.dob || f.dob >= todayStr()) x.dob = 'Enter a valid date of birth.';
    if (f.mobile.replace(/\D/g, '').length < 10) x.mobile = 'Enter a valid 10-digit mobile number.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email address.';
    if (f.password && f.password.length < 8) x.password = 'Password must be at least 8 characters.';
    setErrs(x);
    if (Object.keys(x).length) return;
    const { password, ...rest } = f;
    const r = saveUser({ id: user.id, role: 'patient', ...rest, name: f.name.trim(), ...(password ? { password } : {}) });
    if (!r.ok) return setErrs({ email: r.error });
    setF({ ...f, password: '' });
    notify('Profile updated.');
  };

  return (
    <>
      <h1>My profile</h1>
      <form className="card stack" onSubmit={submit} noValidate style={{ maxWidth: 760 }}>
        <div className="form-grid">
          <Field label="Full name" error={errs.name}><input type="text" value={f.name} onChange={set('name')} /></Field>
          <Field label="Date of birth" error={errs.dob}><input type="date" max={todayStr()} value={f.dob} onChange={set('dob')} /></Field>
          <Field label="Gender"><select value={f.gender} onChange={set('gender')}><option>Male</option><option>Female</option><option>Other</option></select></Field>
          <Field label="Mobile number" error={errs.mobile}><input type="tel" value={f.mobile} onChange={set('mobile')} /></Field>
          <Field label="Email" error={errs.email}><input type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="New password (optional)" error={errs.password}><input type="password" placeholder="Min. 8 characters" value={f.password} onChange={set('password')} /></Field>
        </div>
        <button className="btn btn-primary" type="submit" style={{ alignSelf: 'flex-start' }}>Save changes</button>
      </form>
    </>
  );
}
