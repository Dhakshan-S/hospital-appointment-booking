import { Navigate, Route, Routes } from 'react-router-dom';
import { PatientLayout, RequireRole, SidebarLayout, Toast, homeFor } from './components';
import { useApp } from './store';
import { Login, Register, Forgot } from './pages/Auth';
import { FindDoctors, DoctorProfile } from './pages/Doctors';
import { Book, Confirmation, MyAppointments, PatientProfile } from './pages/Patient';
import { DoctorToday, DoctorSchedule, DoctorAvailability, DoctorProfileEdit } from './pages/DoctorPortal';
import { AdminDashboard, AdminDoctors, AdminPatients, AdminAppointments, AdminReports } from './pages/Admin';

const doctorLinks = [
  { to: '/doctor', label: 'Today', end: true },
  { to: '/doctor/schedule', label: 'My schedule' },
  { to: '/doctor/availability', label: 'Availability' },
  { to: '/doctor/profile', label: 'My profile' },
];
const adminLinks = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/doctors', label: 'Doctors' },
  { to: '/admin/patients', label: 'Patients' },
  { to: '/admin/appointments', label: 'Appointments' },
  { to: '/admin/reports', label: 'Reports' },
];

function Home() {
  const { user } = useApp();
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  const { user } = useApp();
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={user ? <Home /> : <Login />} />
        <Route path="/register" element={user ? <Home /> : <Register />} />
        <Route path="/forgot" element={<Forgot />} />

        {/* Guests may browse doctors; booking requires a patient login (BR-01) */}
        <Route element={<PatientLayout />}>
          <Route path="/doctors" element={<FindDoctors />} />
          <Route path="/doctors/:id" element={<DoctorProfile />} />
          <Route element={<RequireRole role="patient" />}>
            <Route path="/book/:doctorId" element={<Book />} />
            <Route path="/reschedule/:aptId" element={<Book reschedule />} />
            <Route path="/confirmation/:aptId" element={<Confirmation />} />
            <Route path="/appointments" element={<MyAppointments />} />
            <Route path="/profile" element={<PatientProfile />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="doctor" />}>
          <Route element={<SidebarLayout section={user?.specialization} links={doctorLinks} />}>
            <Route path="/doctor" element={<DoctorToday />} />
            <Route path="/doctor/schedule" element={<DoctorSchedule />} />
            <Route path="/doctor/availability" element={<DoctorAvailability />} />
            <Route path="/doctor/profile" element={<DoctorProfileEdit />} />
          </Route>
        </Route>

        <Route element={<RequireRole role="admin" />}>
          <Route element={<SidebarLayout section="Administration" links={adminLinks} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/doctors" element={<AdminDoctors />} />
            <Route path="/admin/patients" element={<AdminPatients />} />
            <Route path="/admin/appointments" element={<AdminAppointments />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>
        </Route>

        <Route path="*" element={<Home />} />
      </Routes>
      <Toast />
    </>
  );
}
