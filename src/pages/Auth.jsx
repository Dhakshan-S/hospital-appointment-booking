import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field, Logo, homeFor } from '../components';
import { useApp } from '../store';
import { todayStr } from '../utils';

function AuthShell({ title, points, children }) {
  return (
    <div className="auth">
      <section className="auth-brand">
        <Logo light />
        <h1>{title}</h1>
        {points.map((p) => <p key={p}>{p}</p>)}
      </section>
      <section className="auth-form"><div className="auth-card">{children}</div></section>
    </div>
  );
}

export function Login() {
  const { login, resetDemo, notify } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ id: '', pw: '', remember: false });
  const [err, setErr] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (!f.id.trim() || !f.pw) return setErr('Enter your email or mobile number and password.');
    const r = login(f.id, f.pw, f.remember);
    if (!r.ok) return setErr(r.error);
    nav(homeFor(r.user.role), { replace: true });
  };
  const demo = (id, pw) => { setF({ ...f, id, pw }); setErr(''); };

  return (
    <AuthShell title="Book your doctor in minutes"
      points={['Find doctors by specialization', 'See real-time available slots', 'Cancel or reschedule online']}>
      <h2 style={{ fontSize: 36 }}>Welcome back</h2>
      <p className="sub">Log in to manage your appointments</p>
      <form className="stack" onSubmit={submit} noValidate>
        {err && <div className="alert" role="alert">{err}</div>}
        <Field label="Email or mobile number">
          <input type="text" placeholder="arun.kumar@email.com" value={f.id} onChange={(e) => setF({ ...f, id: e.target.value })} />
        </Field>
        <Field label="Password">
          <input type="password" placeholder="Enter your password" value={f.pw} onChange={(e) => setF({ ...f, pw: e.target.value })} />
        </Field>
        <div className="row-between">
          <label className="checkbox"><input type="checkbox" checked={f.remember} onChange={(e) => setF({ ...f, remember: e.target.checked })} /> Remember me</label>
          <Link to="/forgot">Forgot password?</Link>
        </div>
        <button className="btn btn-primary btn-block" type="submit">Log in</button>
      </form>
      <p className="center muted">New patient? <Link to="/register">Create an account</Link></p>
      <p className="center muted small">Doctors and administrators use hospital-issued credentials</p>
      <div className="demo">
        <strong>Demo accounts (prototype)</strong>
        <div className="demo-btns">
          <button type="button" className="btn btn-outline btn-sm" onClick={() => demo('arun.kumar@email.com', 'Patient@123')}>Patient</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => demo('meera@carepoint.com', 'Doctor@123')}>Doctor</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => demo('admin@carepoint.com', 'Admin@123')}>Admin</button>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => { resetDemo(); notify('Demo data reset.'); }}>Reset data</button>
        </div>
        <Link to="/doctors">Browse doctors as a guest</Link>
      </div>
    </AuthShell>
  );
}

export function Register() {
  const { saveUser, login, notify } = useApp();
  const nav = useNavigate();
  const [f, setF] = useState({ name: '', dob: '', gender: '', mobile: '', email: '', password: '', consent: false });
  const [errs, setErrs] = useState({});
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const submit = (e) => {
    e.preventDefault();
    const x = {};
    if (f.name.trim().length < 2) x.name = 'Enter your full name.';
    if (!f.dob || f.dob >= todayStr()) x.dob = 'Enter a valid date of birth.';
    if (!f.gender) x.gender = 'Select a gender.';
    if (f.mobile.replace(/\D/g, '').length < 10) x.mobile = 'Enter a valid 10-digit mobile number.';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) x.email = 'Enter a valid email address.';
    if (f.password.length < 8) x.password = 'Password must be at least 8 characters.';
    if (!f.consent) x.consent = 'Please accept the privacy policy to continue.';
    setErrs(x);
    if (Object.keys(x).length) return;
    const r = saveUser({ role: 'patient', name: f.name.trim(), dob: f.dob, gender: f.gender, mobile: f.mobile.trim(), email: f.email.trim(), password: f.password });
    if (!r.ok) return setErrs({ email: r.error });
    login(f.email, f.password, true);
    notify('Account created. Welcome to CarePoint!');
    nav('/doctors', { replace: true });
  };

  return (
    <AuthShell title="Create your patient account"
      points={['One account for all your appointments', 'Email or OTP verification keeps it secure']}>
      <h2 style={{ fontSize: 36 }}>Register</h2>
      <p className="sub">Fill in your details to get started</p>
      <form className="stack" onSubmit={submit} noValidate>
        <div className="form-grid">
          <Field label="Full name" error={errs.name}><input type="text" placeholder="Arun Kumar" value={f.name} onChange={set('name')} /></Field>
          <Field label="Date of birth" error={errs.dob}><input type="date" max={todayStr()} value={f.dob} onChange={set('dob')} /></Field>
          <Field label="Gender" error={errs.gender}>
            <select value={f.gender} onChange={set('gender')}>
              <option value="">Select gender</option><option>Male</option><option>Female</option><option>Other</option>
            </select>
          </Field>
          <Field label="Mobile number" error={errs.mobile}><input type="tel" placeholder="+91 98765 43210" value={f.mobile} onChange={set('mobile')} /></Field>
          <Field label="Email" error={errs.email}><input type="email" placeholder="arun.kumar@email.com" value={f.email} onChange={set('email')} /></Field>
          <Field label="Password" error={errs.password}><input type="password" placeholder="Min. 8 characters" value={f.password} onChange={set('password')} /></Field>
        </div>
        <div>
          <label className="checkbox"><input type="checkbox" checked={f.consent} onChange={set('consent')} /> I agree to the privacy policy and consent to data use for appointments</label>
          {errs.consent && <span className="field-error">{errs.consent}</span>}
        </div>
        <button className="btn btn-primary btn-block" type="submit">Create account</button>
      </form>
      <p className="center muted">Already registered? <Link to="/login">Log in</Link></p>
    </AuthShell>
  );
}

export function Forgot() {
  const { db } = useApp();
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const submit = (e) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email)) return setMsg('err:Enter a valid email address.');
    // Same message whether or not the account exists, so emails are not revealed.
    void db;
    setMsg('ok:If an account exists for this email, a password reset link has been sent (simulated in this prototype).');
  };
  return (
    <AuthShell title="Reset your password" points={['We will email you a secure reset link']}>
      <h2 style={{ fontSize: 36 }}>Forgot password?</h2>
      <p className="sub">Enter the email linked to your account</p>
      <form className="stack" onSubmit={submit} noValidate>
        {msg && <div className={`alert${msg.startsWith('ok') ? ' alert-ok' : ''}`} role="status">{msg.slice(4)}</div>}
        <Field label="Email"><input type="email" placeholder="arun.kumar@email.com" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <button className="btn btn-primary btn-block" type="submit">Send reset link</button>
      </form>
      <p className="center"><Link to="/login">Back to log in</Link></p>
    </AuthShell>
  );
}
