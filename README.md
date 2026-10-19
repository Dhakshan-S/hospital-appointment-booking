# CarePoint Hospital – Appointment Booking System

Responsive frontend prototype of a Hospital Appointment Booking System with **patient**, **doctor** and **administrator** workflows, built from the BRD and wireframes.

**Stack:** React 18 · Vite · React Router (HashRouter) · plain CSS · mock data persisted in `localStorage`. No backend or API.

## Setup

```bash
npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # serve the production build
```

Requires Node.js 18+.

## Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Patient | `arun.kumar@email.com` | `Patient@123` |
| Doctor | `meera@carepoint.com` | `Doctor@123` |
| Administrator | `admin@carepoint.com` | `Admin@123` |

The login page has one-click buttons to fill these in, and a **Reset data** button that restores the demo data. Demo appointments are generated relative to today's date, so the app always looks current.

## Features

**Patient**
- Register (validated form) and log in with email or mobile; "Remember me"; forgot-password screen (simulated)
- Guests can browse doctors; booking requires a patient login
- Search doctors by name and specialization; doctor profile with fee and working days
- Date and time-slot picker (booked and past slots shown as unavailable)
- 3-step booking with optional reason, summary, confirmation and unique Appointment ID
- My Appointments (upcoming / past), cancel and reschedule, profile editing

**Doctor**
- Today's dashboard and weekly schedule (own appointments only)
- Mark appointments Completed / No-Show / Cancelled
- Set availability per date or as a weekly pattern, block dates, edit profile (fee and specialization are admin-controlled)

**Administrator**
- Dashboard with totals, recent bookings (doctor/status filters) and appointments by specialization
- Add / edit / activate / deactivate doctors and patients
- Appointment management: filter by date, doctor, specialization, status; reschedule, complete, no-show or cancel on behalf of users
- Basic reports (by date range, doctor, specialization), CSV export and an audit log

**Business rules implemented (from the BRD)**
- No double booking of a doctor's slot; a patient cannot hold overlapping appointments
- No past dates/times; booking window of 30 days
- Cancelled or rescheduled-away slots are released; the old slot is released only after the new one is validated
- Patients can cancel/reschedule only up to 2 hours before the appointment
- Only Booked/Rescheduled appointments can change; Completed/No-Show only on or after the appointment date
- A doctor with upcoming appointments cannot be deactivated; deactivated users cannot log in
- Role-based route guards (patient, doctor, admin)

## Project structure

```
src/
  App.jsx            routes and role guards
  store.jsx          localStorage-backed state, booking rules and actions
  seed.js            demo doctors, patients and appointments
  utils.js           date, slot and CSV helpers
  components.jsx     layouts, slot picker, shared UI
  styles.css         theme (primary #7A013D, secondary #CEA3B8) and responsive layout
  pages/             Auth, Doctors, Patient, DoctorPortal, Admin
```

## Prototype limitations

- Data lives only in the browser (`localStorage`); passwords are stored in plain text for demo purposes. A real system needs a backend.
- Email/SMS notifications, OTP verification and password reset emails are simulated with on-screen messages.
- Online payment, EMR, and tele-consultation are out of scope (per the BRD).
