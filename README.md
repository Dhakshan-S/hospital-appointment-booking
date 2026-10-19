CarePoint Hospital – Appointment Booking System

Responsive frontend prototype of a Hospital Appointment Booking System with patient, doctor and administrator workflows, built from the BRD and wireframes.

Stack: React 18 · Vite · React Router (HashRouter) · plain CSS · mock data persisted in "localStorage". No backend or API.

🔗 Project Links

- 🌐 Live Demo: "View Live Application" (https://hospital-appointment-system-app.vercel.app/)
- 💻 GitHub Repository: "View Source Code & Documentation" (https://github.com/Dhakshan-S/hospital-appointment-booking)

Setup

npm install
npm run dev      # start the dev server
npm run build    # production build into dist/
npm run preview  # serve the production build

Requires Node.js 18+.

Demo accounts

Role| Email| Password
Patient| "arun.kumar@email.com"| "Patient@123"
Doctor| "meera@carepoint.com"| "Doctor@123"
Administrator| "admin@carepoint.com"| "Admin@123"

The login page has one-click buttons to fill these in, and a Reset data button that restores the demo data. Demo appointments are generated relative to today's date, so the app always looks current.

Features

👤 Patient

- Register with a validated form and log in using email or mobile
- Remember Me functionality
- Forgot-password screen (simulated)
- Guests can browse doctors; booking requires patient login
- Search doctors by name and specialization
- View doctor profile, consultation fee and working days
- Select appointment date and available time slot
- Book appointments through a 3-step booking flow
- Add optional appointment reason
- View booking summary and confirmation
- Generate a unique Appointment ID
- View upcoming and past appointments
- Cancel and reschedule appointments
- Edit patient profile

👨‍⚕️ Doctor

- Today's appointment dashboard
- View weekly schedule
- View own appointments
- Mark appointments as:
  - Completed
  - No-Show
  - Cancelled
- Set availability for individual dates
- Set weekly availability patterns
- Block specific dates
- Edit doctor profile
- Consultation fee and specialization are admin-controlled

🛡️ Administrator

- Dashboard with appointment and user statistics
- View recent bookings
- Filter bookings by doctor and status
- View appointments by specialization
- Add and edit doctors
- Activate / deactivate doctors
- Add and manage patients
- Appointment management
- Filter appointments by:
  - Date
  - Doctor
  - Specialization
  - Status
- Reschedule appointments
- Complete appointments
- Mark appointments as No-Show
- Cancel appointments on behalf of users
- Generate basic reports
- Filter reports by date range, doctor and specialization
- Export reports as CSV
- View audit log

Business Rules Implemented

The following business rules from the BRD are implemented in the prototype:

- No double booking of a doctor's appointment slot
- A patient cannot hold overlapping appointments
- Past dates and time slots cannot be booked
- Appointment booking is limited to a 30-day window
- Cancelled appointment slots are released
- Rescheduled appointment slots are released after the new slot is successfully validated
- Patients can cancel or reschedule appointments only up to 2 hours before the appointment
- Only Booked and Rescheduled appointments can be modified
- Completed and No-Show appointments can only be updated on or after the appointment date
- Doctors with upcoming appointments cannot be deactivated
- Deactivated users cannot log in
- Role-based route protection is implemented for:
  - Patient
  - Doctor
  - Administrator

Project Structure

src/
  App.jsx            routes and role guards
  store.jsx          localStorage-backed state, booking rules and actions
  seed.js            demo doctors, patients and appointments
  utils.js           date, slot and CSV helpers
  components.jsx     layouts, slot picker and shared UI
  styles.css         theme and responsive layout
  pages/
    Auth
    Doctors
    Patient
    DoctorPortal
    Admin

Technology Stack

- React 18
- Vite
- React Router
- HashRouter
- JavaScript
- HTML5
- CSS3
- LocalStorage
- Mock Data

Design Theme

- Primary Color: "#7A013D"
- Secondary Color: "#CEA3B8"
- Responsive layout for desktop and mobile screens

Data Storage

The prototype uses browser "localStorage" for data persistence.

The following information is stored locally:

- User accounts
- Doctor information
- Patient information
- Appointment information
- Doctor availability
- Booking status
- Audit information

No external database or backend API is connected to this prototype.

Demo Login

The application provides demo accounts for testing the different workflows.

Role| Email| Password
Patient| "arun.kumar@email.com"| "Patient@123"
Doctor| "meera@carepoint.com"| "Doctor@123"
Administrator| "admin@carepoint.com"| "Admin@123"

The login page also provides quick-fill buttons for the demo credentials.

A Reset Data option is available to restore the original demo data.

Demo appointments are generated relative to the current date so that the application remains usable for demonstration purposes.

Testing

The prototype was tested against the major user workflows and business rules defined in the BRD.

Key areas include:

- User registration
- Login and role-based access
- Doctor search
- Doctor profile
- Appointment booking
- Date and time-slot validation
- Double-booking prevention
- Overlapping appointment prevention
- Appointment cancellation
- Appointment rescheduling
- Doctor availability
- Doctor appointment management
- Administrator appointment management
- User activation and deactivation
- Role-based route protection
- Responsive UI behaviour

Prototype Limitations

This is a frontend prototype and does not represent a production-ready healthcare system.

- Data is stored only in the browser using "localStorage"
- No backend server is connected
- No real database is used
- Passwords are stored in plain text for demonstration purposes only
- Email notifications are simulated
- SMS notifications are simulated
- OTP verification is simulated
- Password reset emails are simulated
- Online payment is not implemented
- EMR integration is not implemented
- Tele-consultation is not implemented

These limitations are intentional and are based on the scope defined in the BRD.

Future Enhancements

For a production implementation, the following features can be added:

- Secure backend API
- PostgreSQL / MySQL database
- JWT / OAuth authentication
- Password hashing and secure authentication
- Email and SMS notifications
- OTP verification
- Online payment gateway
- Real-time appointment availability
- Doctor and patient document management
- Electronic Medical Records (EMR)
- Telemedicine / video consultation
- Prescription management
- Advanced analytics and reporting
- Cloud deployment with production database

Project Deliverables

The project includes the following deliverables:

- Business Requirement Document (BRD)
- User Flow Diagram
- Wireframes created using Claude
- Clickable Frontend Prototype
- Test Case Sheet
- Project Presentation
- Source Code
- Project Documentation

🔗 Important Links

🌐 Live Application

"Open CarePoint Hospital – Live Demo" (https://hospital-appointment-system-app.vercel.app/)

💻 GitHub Repository

"View CarePoint Hospital Source Code" (https://github.com/Dhakshan-S/hospital-appointment-booking)

---

Project Summary

CarePoint Hospital – Appointment Booking System is a responsive frontend prototype designed to demonstrate the complete appointment booking workflow for patients, doctors and administrators.

The prototype focuses on implementing the business rules defined in the BRD while providing a simple, responsive and user-friendly interface for appointment management.

Project Status: Frontend Prototype – Completed
