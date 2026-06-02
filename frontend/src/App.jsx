import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute, RoleRoute } from './routes/ProtectedRoute';

import Sidebar   from './components/Sidebar';
import Topbar    from './components/Topbar';

// Pages
import Login    from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import Courses   from './pages/courses/Courses';
import MyCourses from './pages/courses/MyCourses';
import MyCurriculum from './pages/curriculum/MyCurriculum';
import Grades    from './pages/grades/Grades';
import Profile   from './pages/profile/Profile';
import Notifications from './pages/notifications/Notifications';
import Users     from './pages/admin/Users';
import { Careers, Subjects, Periods, Pensums } from './pages/admin/AdminPages';
import Reports   from './pages/reports/Reports';

import { notificationsApi } from './services/api';

/* ── App shell (authenticated layout) ── */
function AppShell() {
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = () =>
      notificationsApi.getUnreadCount(user.id)
        .then((r) => setUnread(r.data.unreadCount))
        .catch(() => {});
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 15, 26, 0.6)',
            zIndex: 95,
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn 0.2s ease'
          }}
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div className="main-content">
        <Topbar unreadCount={unread} onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="page-content">
          <Routes>
            {/* Common */}
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/profile"       element={<Profile />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/reports"       element={<Reports />} />

            {/* Student */}
            <Route element={<RoleRoute roles={['Estudiante']} />}>
              <Route path="/my-courses" element={<MyCourses />} />
              <Route path="/my-curriculum" element={<MyCurriculum />} />
            </Route>

            {/* Student + Teacher */}
            <Route path="/courses" element={<Courses />} />
            <Route path="/grades"  element={<Grades />} />

            {/* Admin only */}
            <Route element={<RoleRoute roles={['Administrador']} />}>
              <Route path="/users"    element={<Users />} />
              <Route path="/register" element={<Register />} />
              <Route path="/careers"  element={<Careers />} />
              <Route path="/pensums"  element={<Pensums />} />
              <Route path="/subjects" element={<Subjects />} />
              <Route path="/periods"  element={<Periods />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

/* ── Root ── */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<Login />} />

            {/* Protected */}
            <Route element={<ProtectedRoute />}>
              <Route path="/*" element={<AppShell />} />
            </Route>

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
