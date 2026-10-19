import { addDays, todayStr } from './utils';

const week = { days: [1, 2, 3, 4, 5, 6], start: '09:00', end: '16:00', duration: 30 };

const doctor = (id, name, spec, qual, exp, fee, bio, email, availability = week) => ({
  id, role: 'doctor', name, email, mobile: '+91 90000 0' + id.slice(-4), password: 'Doctor@123', active: true,
  specialization: spec, qualification: qual, experience: exp, fee, bio, availability, blocked: [], dateSlots: {},
});

const patient = (id, name, email, dob, gender, mobile) => ({
  id, role: 'patient', name, email, dob, gender, mobile, password: 'Patient@123', active: true,
});

// Demo data is generated relative to "today" so the prototype always looks live.
export function buildSeed() {
  const t = todayStr();
  const d = (n) => addDays(t, n);
  const users = [
    { id: 'a1', role: 'admin', name: 'Hospital Admin', email: 'admin@carepoint.com', mobile: '+91 90000 00001', password: 'Admin@123', active: true },
    doctor('d1001', 'Dr. Meera Krishnan', 'Cardiology', 'MBBS, MD (Cardiology)', 14, 700, 'Dr. Krishnan consults on heart conditions, blood pressure management and preventive cardiac care.', 'meera@carepoint.com'),
    doctor('d1002', 'Dr. Rajesh Iyer', 'Cardiology', 'MBBS, DM (Cardiology)', 9, 600, 'Focuses on heart rhythm disorders and cardiac rehabilitation.', 'rajesh@carepoint.com'),
    doctor('d1003', 'Dr. Anitha Selvam', 'Cardiology', 'MBBS, MD, DNB (Cardiology)', 18, 800, 'Senior consultant in interventional cardiology.', 'anitha@carepoint.com'),
    doctor('d1004', 'Dr. Karthik Subramanian', 'Cardiology', 'MBBS, MD', 7, 500, 'Handles routine cardiac check-ups and lifestyle counselling.', 'karthik@carepoint.com'),
    doctor('d1005', 'Dr. Priya Nair', 'Dermatology', 'MBBS, MD (Dermatology)', 11, 550, 'Treats skin, hair and nail conditions.', 'priya@carepoint.com'),
    doctor('d1006', 'Dr. Sanjay Menon', 'Dermatology', 'MBBS, DDVL', 8, 500, 'Specialises in acne, allergies and cosmetic dermatology.', 'sanjay@carepoint.com', { days: [1, 2, 3, 4, 5, 6], start: '10:00', end: '18:00', duration: 30 }),
    doctor('d1007', 'Dr. Sunita Rao', 'Pediatrics', 'MBBS, MD (Pediatrics)', 12, 450, 'Child health, vaccinations and growth monitoring.', 'sunita@carepoint.com'),
    doctor('d1008', 'Dr. Arvind Pillai', 'Pediatrics', 'MBBS, DCH', 6, 400, 'General paediatric care for infants and children.', 'arvind@carepoint.com'),
    doctor('d1009', 'Dr. Vikram Shetty', 'Orthopedics', 'MBBS, MS (Ortho)', 15, 750, 'Joint, bone and sports injury treatment.', 'vikram@carepoint.com'),
    doctor('d1010', 'Dr. Lakshmi Narayanan', 'Orthopedics', 'MBBS, D.Ortho', 10, 650, 'Back pain, arthritis and fracture follow-ups.', 'lakshmi@carepoint.com'),
    patient('p1', 'Arun Kumar', 'arun.kumar@email.com', '1990-05-14', 'Male', '+91 98765 43210'),
    patient('p2', 'Suresh Babu', 'suresh@email.com', '1975-02-03', 'Male', '+91 98765 11111'),
    patient('p3', 'Lakshmi Devi', 'lakshmi.d@email.com', '1982-09-21', 'Female', '+91 98765 22222'),
    patient('p4', 'Divya R', 'divya@email.com', '1996-11-30', 'Female', '+91 98765 33333'),
    patient('p5', 'Karan M', 'karan@email.com', '1988-07-08', 'Male', '+91 98765 44444'),
    patient('p6', 'Priya N', 'priyan@email.com', '1993-01-17', 'Female', '+91 98765 55555'),
  ];
  const info = Object.fromEntries(users.map((u) => [u.id, u]));
  let n = 20500;
  const mk = (doctorId, patientId, date, time, status, reason, extra = {}) => ({
    id: `APT-${++n}`, doctorId, patientId, date, time, duration: info[doctorId].availability.duration,
    status, reason, createdAt: new Date().toISOString(), ...extra,
  });
  const appointments = [
    mk('d1009', 'p1', d(-17), '10:00', 'Cancelled', 'Knee pain', { cancelledBy: 'patient' }),
    mk('d1007', 'p1', d(-30), '09:30', 'Completed', 'Child vaccination query'),
    mk('d1003', 'p1', d(-45), '11:00', 'Completed', 'Annual heart check'),
    mk('d1005', 'p1', d(-60), '10:30', 'Completed', 'Skin rash'),
    mk('d1001', 'p1', d(-80), '09:00', 'Completed', 'BP review'),
    mk('d1001', 'p2', d(0), '09:00', 'Completed', 'Chest pain follow-up'),
    mk('d1001', 'p3', d(0), '09:30', 'Completed', 'BP check'),
    mk('d1001', 'p5', d(0), '10:00', 'Booked', 'Routine check-up'),
    mk('d1001', 'p4', d(0), '10:30', 'Booked', 'ECG review'),
    mk('d1001', 'p6', d(0), '11:00', 'Booked', 'Palpitations'),
    mk('d1001', 'p2', d(0), '11:30', 'Cancelled', 'Follow-up', { cancelledBy: 'patient' }),
    mk('d1001', 'p3', d(0), '14:00', 'Booked', 'Dizziness'),
    mk('d1001', 'p5', d(0), '14:30', 'Booked', 'Medication review'),
    mk('d1001', 'p1', d(1), '10:00', 'Booked', 'Routine check-up', { id: 'APT-20481' }),
    mk('d1001', 'p4', d(1), '09:30', 'Booked', 'Follow-up'),
    mk('d1001', 'p2', d(1), '11:00', 'Booked', 'Chest discomfort'),
    mk('d1006', 'p1', d(7), '16:30', 'Booked', 'Skin allergy', { id: 'APT-20517' }),
    mk('d1002', 'p4', d(2), '09:00', 'Booked', 'Palpitations'),
    mk('d1007', 'p6', d(3), '10:00', 'Booked', 'Child fever'),
  ];
  return { users, appointments, audit: [], seq: n + 1 };
}
