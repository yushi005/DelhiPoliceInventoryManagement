import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import OfficerDashboard from './pages/OfficerDashboard';
import SubmissionForm from './pages/SubmissionForm';
import AdminPanel from './pages/AdminPanel';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import Portal from './pages/Portal';

const getRole = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  try { return JSON.parse(atob(token.split('.')[1])).role; }
  catch { return null; }
};

// Each role has exactly one home page; anything outside its allow-list
// bounces back here.
const HOME = { officer: '/dashboard', admin: '/admin', superadmin: '/superadmin' };
const homeFor = (role) => HOME[role] || '/login';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const role = getRole();
  if (!role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to={homeFor(role)} replace />;
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root → public landing portal */}
        <Route path="/" element={<Navigate to="/portal" replace />} />
        <Route path="/portal" element={<Portal />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['officer']}><OfficerDashboard /></ProtectedRoute>} />
        <Route path="/submit" element={<ProtectedRoute allowedRoles={['officer']}><SubmissionForm /></ProtectedRoute>} />
        <Route path="/submit/:id" element={<ProtectedRoute allowedRoles={['officer']}><SubmissionForm /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
        <Route path="/superadmin" element={<ProtectedRoute allowedRoles={['superadmin']}><SuperAdminDashboard /></ProtectedRoute>} />
        {/* Unknown URL → role home if logged in, else login */}
        <Route path="*" element={<Navigate to={homeFor(getRole())} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
