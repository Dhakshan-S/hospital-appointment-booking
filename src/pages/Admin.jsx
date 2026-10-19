import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, Field, Modal, SlotPicker } from '../components';
import { useApp } from '../store';
import {
  ACTIVE, SPECIALIZATIONS, STATUSES, addDays, apptDate, downloadCsv, fmtDateShort, fmtTime, rupee, slotsFor, todayStr,
} from '../utils';

const byNewest = (a, b) => (b.createdAt || '').localeCompare(a.createdAt || '') || b.id.localeCompare(a.id);
const tally = (list) => ({
  total: list.length,
  active: list.filter((a) => ACTIVE.includes(a.status)).length,
  completed: list.filter((a) => a.status === 'Completed').length,
  cancelled: list.filter((a) => a.status === 'Cancelled').length,
  noshow: list.filter((a) => a.status === 'No-Show').length,
});

function useLookups() {
  const { db } = useApp();
  const doctors = db.users.filter((u) => u.role === 'doctor');
  const patients = db.users.filter((u) => u.role === 'patient');
  const rows = (list) => list.map((a) => {
    const d = db.users.find((u) => u.id === a.doctorId);
    const p = db.users.find((u) => u.id === a.patientId);
    return { ...a, doctor: d, patient: p };
  });
  return { db, doctors, patients, rows };
}

function exportAll(rows) {
  downloadCsv(`appointments-${todayStr()}.csv`, [
    ['Appointment ID', 'Patient', 'Doctor', 'Specialization', 'Date', 'Time', 'Status'],
    ...rows.map((a) => [a.id, a.patient?.name, a.doctor?.name, a.doctor?.specialization, a.date, a.time, a.status]),
  ]);
}

export function AdminDashboard() {
  const { db, doctors, rows } = useLookups();
  const [fd, setFd] = useState('');
  const [fs, setFs] = useState('');
  const all = rows(db.appointments);
  const recent = all.filter((a) => (!fd || a.doctorId === fd) && (!fs || a.status === fs)).sort(byNewest).slice(0, 8);
  const bySpec = SPECIALIZATIONS.map((s) => [s, all.filter((a) => a.doctor?.specialization === s).length]);
  const max = Math.max(1, ...bySpec.map((x) => x[1]));
  const short = (n) => n.replace(/^Dr\.\s*(\w)\w*\s/, 'Dr. $1. ');
  return (
    <>
      <div className="page-head">
        <h1>Overview</h1>
        <div className="btn-row">
          <button className="btn btn-outline" onClick={() => exportAll(all)}>Export report</button>
          <Link className="btn btn-primary" to="/admin/doctors?add=1">Add doctor</Link>
        </div>
      </div>
      <div className="stats">
        <div className="stat"><span className="muted">Total bookings</span><strong>{all.length}</strong></div>
        <div className="stat"><span className="muted">Today</span><strong>{all.filter((a) => a.date === todayStr()).length}</strong></div>
        <div className="stat"><span className="muted">Cancelled</span><strong>{all.filter((a) => a.status === 'Cancelled').length}</strong></div>
        <div className="stat"><span className="muted">Active doctors</span><strong>{doctors.filter((d) => d.active).length}</strong></div>
      </div>
      <div className="dash-split">
        <div className="card stack">
          <div className="row-between">
            <h3>Recent bookings</h3>
            <div className="btn-row">
              <select aria-label="Filter by doctor" value={fd} onChange={(e) => setFd(e.target.value)} style={{ width: 'auto' }}>
                <option value="">All doctors</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <select aria-label="Filter by status" value={fs} onChange={(e) => setFs(e.target.value)} style={{ width: 'auto' }}>
                <option value="">All status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="table-wrap"><table className="data">
            <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>
              {recent.length === 0 && <tr><td colSpan={5} className="muted">No bookings match the filters.</td></tr>}
              {recent.map((a) => (
                <tr key={a.id}>
                  <td>{a.id}</td><td>{a.patient?.name}</td><td>{short(a.doctor?.name || '')}</td><td><Badge status={a.status} /></td>
                  <td><Link to={`/admin/appointments?q=${a.id}`}>{ACTIVE.includes(a.status) ? 'Edit' : 'View'}</Link></td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div className="card">
          <h3>Appointments by specialization</h3>
          {bySpec.map(([s, n]) => (
            <div key={s} className="bar-row"><span className="muted">{s}</span><div><div className="bar" style={{ width: `${(n / max) * 100}%` }} /></div><strong>{n}</strong></div>
          ))}
        </div>
      </div>
    </>
  );
}

// One modal handles both doctor and patient accounts.
function UserModal({ kind, initial, onClose }) {
  const { saveUser, notify } = useApp();
  const isDoc = kind === 'doctor';
  const [f, setF] = useState(() => ({
    name: '', email: '', mobile: '', password: '', dob: '', gender: 'Male',
    specialization: SPECIALIZATIONS[0], qualification: '', experience: '', fee: '', bio: '', ...initial,
  }));
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const x = {};
    if (f.name.trim().length < 2) x.name = 'Enter a name.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email.';
    if (f.mobile.replace(/\D/g, '').length < 10) x.mobile = 'Enter a valid 10-digit mobile number.';
    if (!initial && f.password.length < 8) x.password = 'Password must be at least 8 characters.';
    if (initial && f.password && f.password.length < 8) x.password = 'Password must be at least 8 characters.';
    if (isDoc) {
      if (!f.qualification.trim()) x.qualification = 'Required.';
      if (f.experience === '' || Number(f.experience) < 0) x.experience = 'Enter years of experience.';
      if (f.fee === '' || Number(f.fee) <= 0) x.fee = 'Enter a fee greater than 0.';
    } else if (!f.dob || f.dob >= todayStr()) x.dob = 'Enter a valid date of birth.';
    setErrs(x);
    if (Object.keys(x).length) return;
    const data = { ...(initial || {}), role: kind, name: f.name.trim(), email: f.email.trim(), mobile: f.mobile.trim() };
    if (f.password) data.password = f.password;
    if (isDoc) Object.assign(data, { specialization: f.specialization, qualification: f.qualification.trim(), experience: Number(f.experience), fee: Number(f.fee), bio: f.bio.trim() });
    else Object.assign(data, { dob: f.dob, gender: f.gender });
    const r = saveUser(data);
    if (!r.ok) return setErrs({ email: r.error });
    notify(`${isDoc ? 'Doctor' : 'Patient'} ${initial ? 'updated' : 'created'}.`);
    onClose();
  };

  return (
    <Modal title={`${initial ? 'Edit' : 'Add'} ${kind}`} onClose={onClose}>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Full name" error={errs.name}><input type="text" value={f.name} onChange={set('name')} /></Field>
          <Field label="Email" error={errs.email}><input type="email" value={f.email} onChange={set('email')} /></Field>
          <Field label="Mobile number" error={errs.mobile}><input type="tel" value={f.mobile} onChange={set('mobile')} /></Field>
          <Field label={initial ? 'New password (optional)' : 'Password'} error={errs.password}><input type="password" value={f.password} onChange={set('password')} /></Field>
          {isDoc ? (
            <>
              <Field label="Specialization"><select value={f.specialization} onChange={set('specialization')}>{SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
              <Field label="Qualification" error={errs.qualification}><input type="text" value={f.qualification} onChange={set('qualification')} /></Field>
              <Field label="Experience (years)" error={errs.experience}><input type="number" min="0" value={f.experience} onChange={set('experience')} /></Field>
              <Field label="Consultation fee (₹)" error={errs.fee}><input type="number" min="1" value={f.fee} onChange={set('fee')} /></Field>
            </>
          ) : (
            <>
              <Field label="Date of birth" error={errs.dob}><input type="date" max={todayStr()} value={f.dob} onChange={set('dob')} /></Field>
              <Field label="Gender"><select value={f.gender} onChange={set('gender')}><option>Male</option><option>Female</option><option>Other</option></select></Field>
            </>
          )}
        </div>
        {isDoc && <Field label="About"><textarea rows={3} value={f.bio} onChange={set('bio')} /></Field>}
        <button className="btn btn-primary" type="submit">{initial ? 'Save changes' : `Create ${kind}`}</button>
      </form>
    </Modal>
  );
}

function UserTable({ kind }) {
  const { db, toggleActive, notify } = useApp();
  const [params, setParams] = useSearchParams();
  const [modal, setModal] = useState(params.get('add') ? { initial: null } : null);
  const [q, setQ] = useState('');
  const isDoc = kind === 'doctor';
  const list = db.users.filter((u) => u.role === kind && (u.name + u.email).toLowerCase().includes(q.toLowerCase()));
  const toggle = (u) => {
    const r = toggleActive(u.id);
    notify(r.ok ? `${u.name} ${u.active ? 'deactivated' : 'activated'}.` : r.error, r.ok ? 'ok' : 'err');
  };
  const close = () => { setModal(null); if (params.get('add')) setParams({}); };
  return (
    <>
      <div className="page-head">
        <h1>{isDoc ? 'Doctors' : 'Patients'}</h1>
        <button className="btn btn-primary" onClick={() => setModal({ initial: null })}>Add {kind}</button>
      </div>
      <input type="text" placeholder={`Search ${kind}s by name or email`} value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 420 }} />
      <div className="table-wrap"><table className="data">
        <thead><tr><th>Name</th><th>Email</th><th>Mobile</th>{isDoc ? <><th>Specialization</th><th>Fee</th></> : <th>Appointments</th>}<th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={7} className="muted">No {kind}s found.</td></tr>}
          {list.map((u) => (
            <tr key={u.id}>
              <td><strong>{u.name}</strong></td><td>{u.email}</td><td>{u.mobile}</td>
              {isDoc ? <><td>{u.specialization}</td><td>{rupee(u.fee)}</td></> : <td>{db.appointments.filter((a) => a.patientId === u.id).length}</td>}
              <td><span className={`chip ${u.active ? 'status-green' : 'status-red'}`}>{u.active ? 'Active' : 'Inactive'}</span></td>
              <td><div className="actions">
                <button className="btn btn-outline btn-sm" onClick={() => setModal({ initial: { ...u, password: '' } })}>Edit</button>
                <button className="btn btn-outline btn-sm" onClick={() => toggle(u)}>{u.active ? 'Deactivate' : 'Activate'}</button>
              </div></td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {modal && <UserModal kind={kind} initial={modal.initial} onClose={close} />}
    </>
  );
}
export const AdminDoctors = () => <UserTable kind="doctor" />;
export const AdminPatients = () => <UserTable kind="patient" />;

export function AdminAppointments() {
  const { db, doctors, rows } = useLookups();
  const { setStatus, rescheduleAppointment, notify } = useApp();
  const [params] = useSearchParams();
  const [f, setF] = useState({ q: params.get('q') || '', date: '', doctor: '', spec: '', status: '' });
  const [resched, setResched] = useState(null);
  const [slot, setSlot] = useState({ date: todayStr(), time: '' });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const list = useMemo(() => rows(db.appointments).filter((a) => (
    (!f.q || (a.id + a.patient?.name).toLowerCase().includes(f.q.toLowerCase()))
    && (!f.date || a.date === f.date) && (!f.doctor || a.doctorId === f.doctor)
    && (!f.spec || a.doctor?.specialization === f.spec) && (!f.status || a.status === f.status)
  )).sort((a, b) => apptDate(b.date, b.time) - apptDate(a.date, a.time)), [db, f]); // eslint-disable-line react-hooks/exhaustive-deps

  const act = (a, status) => {
    if (status === 'Cancelled' && !window.confirm(`Cancel ${a.id}?`)) return;
    const r = setStatus(a.id, status);
    notify(r.ok ? `${a.id} marked ${status}.` : r.error, r.ok ? 'ok' : 'err');
  };
  const openResched = (a) => {
    let d = a.date >= todayStr() ? a.date : todayStr();
    for (let i = 0; i <= 30 && slotsFor(a.doctor, d).length === 0; i++) d = addDays(todayStr(), i);
    setSlot({ date: d, time: '' });
    setResched(a);
  };
  const doResched = () => {
    if (!slot.time) return notify('Select a new time slot.', 'err');
    const r = rescheduleAppointment(resched.id, slot.date, slot.time);
    notify(r.ok ? `${resched.id} rescheduled.` : r.error, r.ok ? 'ok' : 'err');
    if (r.ok) setResched(null);
  };

  return (
    <>
      <div className="page-head"><h1>Appointments</h1><button className="btn btn-outline" onClick={() => exportAll(list)}>Export CSV</button></div>
      <div className="filters">
        <Field label="Search"><input type="text" placeholder="ID or patient" value={f.q} onChange={set('q')} /></Field>
        <Field label="Date"><input type="date" value={f.date} onChange={set('date')} /></Field>
        <Field label="Doctor"><select value={f.doctor} onChange={set('doctor')}><option value="">All doctors</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Specialization"><select value={f.spec} onChange={set('spec')}><option value="">All</option>{SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <Field label="Status"><select value={f.status} onChange={set('status')}><option value="">All status</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></Field>
        <button className="btn btn-outline" onClick={() => setF({ q: '', date: '', doctor: '', spec: '', status: '' })}>Clear</button>
      </div>
      <div className="table-wrap"><table className="data" style={{ minWidth: 860 }}>
        <thead><tr><th>ID</th><th>Patient</th><th>Doctor</th><th>Date & time</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={6} className="muted">No appointments match the filters.</td></tr>}
          {list.map((a) => (
            <tr key={a.id}>
              <td>{a.id}</td><td>{a.patient?.name}</td><td>{a.doctor?.name}<div className="muted small">{a.doctor?.specialization}</div></td>
              <td>{fmtDateShort(a.date)} · {fmtTime(a.time)}</td><td><Badge status={a.status} /></td>
              <td>{ACTIVE.includes(a.status) ? (
                <div className="actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openResched(a)}>Reschedule</button>
                  <button className="btn btn-primary btn-sm" onClick={() => act(a, 'Completed')}>Complete</button>
                  <button className="btn btn-outline btn-sm" onClick={() => act(a, 'No-Show')}>No-show</button>
                  <button className="btn btn-outline btn-sm btn-danger" onClick={() => act(a, 'Cancelled')}>Cancel</button>
                </div>
              ) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table></div>
      {resched && (
        <Modal title={`Reschedule ${resched.id}`} onClose={() => setResched(null)}>
          <p className="muted">{resched.patient?.name} with {resched.doctor?.name}</p>
          <SlotPicker doctor={resched.doctor} date={slot.date} time={slot.time}
            onDate={(d) => setSlot({ date: d, time: '' })} onTime={(t) => setSlot({ ...slot, time: t })} ignoreId={resched.id} />
          <button className="btn btn-primary" onClick={doResched}>Confirm new time</button>
        </Modal>
      )}
    </>
  );
}

export function AdminReports() {
  const { db, doctors, rows } = useLookups();
  const [from, setFrom] = useState(addDays(todayStr(), -90));
  const [to, setTo] = useState(addDays(todayStr(), 30));
  const list = rows(db.appointments).filter((a) => a.date >= from && a.date <= to);
  const t = tally(list);
  const cols = ['Total', 'Booked / Rescheduled', 'Completed', 'Cancelled', 'No-Show'];
  const line = (x) => [x.total, x.active, x.completed, x.cancelled, x.noshow];
  const table = (title, head, data) => (
    <div className="stack" style={{ gap: 10 }}>
      <h3>{title}</h3>
      <div className="table-wrap"><table className="data">
        <thead><tr><th>{head}</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>{data.map(([name, x]) => <tr key={name}><td>{name}</td>{line(x).map((n, i) => <td key={i}>{n}</td>)}</tr>)}</tbody>
      </table></div>
    </div>
  );
  const csv = () => downloadCsv(`report-${from}-to-${to}.csv`, [
    ['Group', 'Name', ...cols],
    ['Overall', `${from} to ${to}`, ...line(t)],
    ...doctors.map((d) => ['Doctor', d.name, ...line(tally(list.filter((a) => a.doctorId === d.id)))]),
    ...SPECIALIZATIONS.map((s) => ['Specialization', s, ...line(tally(list.filter((a) => a.doctor?.specialization === s)))]),
  ]);
  return (
    <>
      <div className="page-head"><h1>Reports</h1><button className="btn btn-outline" onClick={csv}>Export CSV</button></div>
      <div className="filters">
        <Field label="From"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
        <Field label="To"><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
      </div>
      {from > to && <div className="alert">The start date must be before the end date.</div>}
      <div className="stats">
        <div className="stat"><span className="muted">Total</span><strong>{t.total}</strong></div>
        <div className="stat"><span className="muted">Completed</span><strong>{t.completed}</strong></div>
        <div className="stat"><span className="muted">Cancelled</span><strong>{t.cancelled}</strong></div>
        <div className="stat"><span className="muted">No-show</span><strong>{t.noshow}</strong></div>
      </div>
      {table('Appointments by doctor', 'Doctor', doctors.map((d) => [d.name, tally(list.filter((a) => a.doctorId === d.id))]))}
      {table('Appointments by specialization', 'Specialization', SPECIALIZATIONS.map((s) => [s, tally(list.filter((a) => a.doctor?.specialization === s))]))}
      <div className="stack" style={{ gap: 10 }}>
        <h3>Recent activity (audit log)</h3>
        <div className="table-wrap"><table className="data">
          <thead><tr><th>When</th><th>Who</th><th>Action</th></tr></thead>
          <tbody>
            {db.audit.length === 0 && <tr><td colSpan={3} className="muted">No activity recorded yet.</td></tr>}
            {db.audit.slice(0, 10).map((e, i) => <tr key={i}><td>{new Date(e.ts).toLocaleString('en-GB')}</td><td>{e.actor}</td><td>{e.action}</td></tr>)}
          </tbody>
        </table></div>
      </div>
    </>
  );
}
