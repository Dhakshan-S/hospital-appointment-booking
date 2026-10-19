import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useApp, isSlotBooked } from './store';
import {
  WINDOW_DAYS, addDays, apptDate, dayName, dayNum, fmtTime, initials, slotsFor, todayStr,
} from './utils';

export const Logo = ({ light }) => (
  <Link to="/" className={`logo${light ? ' light' : ''}`}>
    <span className="logo-mark">+</span>
    <span>CarePoint Hospital</span>
  </Link>
);

// With no size the avatar is sized by CSS (so it can shrink on small screens).
export const Avatar = ({ name, size }) => (
  <span className="avatar" style={size ? { width: size, height: size, fontSize: size * 0.4 } : undefined}>{initials(name)}</span>
);

export const Badge = ({ status }) => (
  <span className={`badge badge-${status.toLowerCase().replace(/[^a-z]/g, '')}`}>{status}</span>
);

export function Field({ label, error, children }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {error && <span className="field-error">{error}</span>}
    </label>
  );
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className={`toast toast-${toast.type}`} role="status">{toast.msg}</div>;
}

// Route guard: role-based mock navigation (FR-S01).
export function RequireRole({ role }) {
  const { user } = useApp();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}
export const homeFor = (role) => ({ patient: '/doctors', doctor: '/doctor', admin: '/admin' }[role] || '/login');

function UserMenu() {
  const { user, logout } = useApp();
  const nav = useNavigate();
  return (
    <div className="user-menu">
      <span className="user-name">{user.name}</span>
      <Avatar name={user.name} />
      <button className="btn btn-outline btn-sm" onClick={() => { logout(); nav('/login'); }}>Log out</button>
    </div>
  );
}

// Top-nav layout for patients (and guests browsing doctors).
export function PatientLayout() {
  const { user } = useApp();
  if (user && user.role !== 'patient') return <Navigate to={homeFor(user.role)} replace />;
  return (
    <div className="page">
      <header className="topbar">
        <Logo />
        {user ? (
          <nav className="topnav">
            <NavLink to="/doctors">Find Doctors</NavLink>
            <NavLink to="/appointments">My Appointments</NavLink>
            <NavLink to="/profile">Profile</NavLink>
          </nav>
        ) : <span />}
        {user ? <UserMenu /> : (
          <div className="user-menu">
            <Link className="btn btn-outline btn-sm" to="/login">Log in</Link>
            <Link className="btn btn-primary btn-sm" to="/register">Register</Link>
          </div>
        )}
      </header>
      <main className="container"><Outlet /></main>
    </div>
  );
}

// Sidebar layout for doctor and admin dashboards.
export function SidebarLayout({ section, links }) {
  const { user, logout } = useApp();
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]); // close the mobile menu after navigating
  return (
    <div className="page">
      <header className="topbar">
        <Logo />
        <nav className="topnav"><span className="active">Dashboard</span></nav>
        <div className="user-menu">
          <span className="user-name">{user.name}</span>
          <Avatar name={user.name} />
          <button type="button" className="menu-btn" aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open} aria-controls="side-menu" onClick={() => setOpen(!open)}>
            {open ? '✕' : '☰'}
          </button>
        </div>
      </header>
      <div className="shell">
        <aside id="side-menu" className={`sidebar${open ? ' open' : ''}`}>
          <div className="sidebar-section">{section}</div>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end} className="side-link">{l.label}</NavLink>
          ))}
          <button className="side-link side-logout" onClick={() => { logout(); nav('/login'); }}>Logout</button>
        </aside>
        <main className="content"><Outlet /></main>
      </div>
    </div>
  );
}

// Date strip + time slots. Shared by doctor profile, booking, rescheduling and admin reschedule.
export function SlotPicker({ doctor, date, time, onDate, onTime, ignoreId }) {
  const { db } = useApp();
  const today = todayStr();
  const days = Array.from({ length: WINDOW_DAYS + 1 }, (_, i) => addDays(today, i));
  const slots = slotsFor(doctor, date);
  const now = new Date();
  return (
    <div>
      <div className="date-strip">
        {days.map((d) => {
          const off = slotsFor(doctor, d).length === 0;
          return (
            <button key={d} type="button" disabled={off} title={off ? 'Not available' : ''}
              className={`date-chip${d === date ? ' selected' : ''}`}
              onClick={() => { onDate(d); onTime(''); }}>
              <span>{dayName(d)}</span><strong>{dayNum(d)}</strong>
            </button>
          );
        })}
      </div>
      {date && slots.length === 0 && <p className="muted">No slots on this date.</p>}
      <div className="slot-grid">
        {slots.map((s) => {
          const booked = isSlotBooked(db, doctor.id, date, s, ignoreId);
          const past = apptDate(date, s.time) <= now;
          const disabled = booked || past;
          return (
            <button key={s.time} type="button" disabled={disabled}
              className={`slot${s.time === time ? ' selected' : ''}${booked ? ' booked' : ''}${past && !booked ? ' past' : ''}`}
              onClick={() => onTime(s.time)}>
              {fmtTime(s.time)}
            </button>
          );
        })}
      </div>
      <div className="legend">
        <span className="chip">Available</span><span className="chip chip-sel">Selected</span><span className="chip chip-booked">Booked</span>
      </div>
    </div>
  );
}

// First available slot (used for "Next: ..." on doctor cards).
export function nextSlot(db, doctor) {
  const today = todayStr();
  const now = new Date();
  for (let i = 0; i <= WINDOW_DAYS; i++) {
    const d = addDays(today, i);
    const s = slotsFor(doctor, d).find((x) => apptDate(d, x.time) > now && !isSlotBooked(db, doctor.id, d, x));
    if (s) return { date: d, time: s.time };
  }
  return null;
}
