import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Avatar, SlotPicker, nextSlot } from '../components';
import { useApp } from '../store';
import { SPECIALIZATIONS, fmtNext, rupee, titleOf, todayStr, addDays, slotsFor } from '../utils';

export function FindDoctors() {
  const { db, user } = useApp();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [spec, setSpec] = useState('');
  const [applied, setApplied] = useState({ name: '', spec: '' });

  const doctors = useMemo(
    () => db.users.filter((u) => u.role === 'doctor' && u.active
      && (!applied.spec || u.specialization === applied.spec)
      && u.name.toLowerCase().includes(applied.name.trim().toLowerCase())),
    [db, applied],
  );
  const apply = (s = spec) => setApplied({ name, spec: s });

  const book = (d) => {
    if (!user) return nav('/login');
    const n = nextSlot(db, d);
    nav(`/book/${d.id}${n ? `?date=${n.date}&time=${n.time}` : ''}`);
  };

  return (
    <>
      <form className="card card-tint stack" onSubmit={(e) => { e.preventDefault(); apply(); }}>
        <h2>Find a doctor</h2>
        <div className="search-row">
          <label className="field"><span className="field-label">Doctor name</span>
            <input type="text" placeholder="Search by name" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field"><span className="field-label">Specialization</span>
            <select value={spec} onChange={(e) => setSpec(e.target.value)}>
              <option value="">All specializations</option>
              {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <button className="btn btn-primary" type="submit">Search</button>
        </div>
      </form>

      <div className="tags">
        <strong>{doctors.length} doctor{doctors.length === 1 ? '' : 's'} found</strong>
        {SPECIALIZATIONS.map((s) => (
          <button key={s} className={`chip chip-link${applied.spec === s ? ' active' : ''}`}
            onClick={() => { setSpec(s); apply(s); }}>{s}</button>
        ))}
        {applied.spec && <button className="link-btn" onClick={() => { setSpec(''); setName(''); setApplied({ name: '', spec: '' }); }}>Clear</button>}
      </div>

      {doctors.length === 0 && <div className="card muted">No doctors match your search. Try a different name or specialization.</div>}
      <div className="grid-2">
        {doctors.map((d) => {
          const n = nextSlot(db, d);
          return (
            <div key={d.id} className="card doctor-card">
              <div className="doctor-head">
                <Avatar name={d.name} size={68} />
                <div className="grow">
                  <h3>{d.name}</h3>
                  <span className="muted">{titleOf(d.specialization)} · {d.experience} yrs experience</span>
                </div>
                <span className="fee">{rupee(d.fee)}</span>
              </div>
              <div className="doctor-foot">
                <span className="chip">{n ? `Next: ${fmtNext(n.date, n.time)}` : 'No slots available'}</span>
                <div className="btn-row">
                  <Link className="btn btn-outline" to={`/doctors/${d.id}`}>View profile</Link>
                  <button className="btn btn-primary" disabled={!n} onClick={() => book(d)}>Book now</button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export function DoctorProfile() {
  const { id } = useParams();
  const { db, user, notify } = useApp();
  const nav = useNavigate();
  const doc = db.users.find((u) => u.id === id && u.role === 'doctor');
  const firstDay = useMemo(() => {
    if (!doc) return todayStr();
    for (let i = 0; i <= 30; i++) { const d = addDays(todayStr(), i); if (slotsFor(doc, d).length) return d; }
    return todayStr();
  }, [doc]);
  const [date, setDate] = useState(firstDay);
  const [time, setTime] = useState('');

  if (!doc) return <div className="card">Doctor not found. <Link to="/doctors">Back to doctors</Link></div>;

  const book = () => {
    if (!user) { notify('Please log in as a patient to book.', 'err'); return nav('/login'); }
    if (!time) return notify('Select a time slot first.', 'err');
    nav(`/book/${doc.id}?date=${date}&time=${time}`);
  };
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const a = doc.availability;
  const working = a.days.length === 0 ? 'By date only' : `${days[a.days[0]]} – ${days[a.days[a.days.length - 1]]}`;

  return (
    <>
      <div className="crumbs"><Link to="/doctors">Find Doctors</Link> › {doc.specialization} › {doc.name}</div>
      <div className="split">
        <div className="card stack">
          <div className="doctor-head">
            <Avatar name={doc.name} size={110} />
            <div className="stack" style={{ gap: 8 }}>
              <h1 style={{ fontSize: 32 }}>{doc.name}</h1>
              <span>{titleOf(doc.specialization)}</span>
              <span className="muted">{doc.qualification} · {doc.experience} years experience</span>
              <div className="tags">
                <span className="chip">Consultation fee {rupee(doc.fee)}</span>
                <span className="chip status-green">Accepting appointments</span>
              </div>
            </div>
          </div>
          <div><h3>About</h3><p className="muted" style={{ marginTop: 8 }}>{doc.bio || 'Profile details coming soon.'}</p></div>
          <div><h3>Working days</h3><p className="muted" style={{ marginTop: 8 }}>{working} · {a.start} – {a.end}</p></div>
        </div>
        <div className="card stack">
          <h3>Select date and time</h3>
          <SlotPicker doctor={doc} date={date} time={time} onDate={setDate} onTime={setTime} />
          <button className="btn btn-primary btn-block" onClick={book}>Book appointment</button>
        </div>
      </div>
    </>
  );
}
