import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminLinks = [
  { to: '/dashboard', icon: '🏠', label: 'Inicio' },
  { to: '/courses',   icon: '📚', label: 'Cursos' },
  { to: '/subjects',  icon: '📖', label: 'Materias' },
  { to: '/careers',   icon: '🎓', label: 'Carreras' },
  { to: '/pensums',   icon: '🧾', label: 'Pensums' },
  { to: '/periods',   icon: '📅', label: 'Períodos' },
  { to: '/users',     icon: '👥', label: 'Usuarios' },
  { to: '/reports',   icon: '📊', label: 'Reportes' },
];
const teacherLinks = [
  { to: '/dashboard',    icon: '🏠', label: 'Inicio' },
  { to: '/courses',      icon: '📚', label: 'Mis Cursos' },
  { to: '/grades',       icon: '✏️',  label: 'Calificaciones' },
  { to: '/reports',      icon: '📊', label: 'Reportes' },
  { to: '/notifications',icon: '🔔', label: 'Notificaciones' },
];
const studentLinks = [
  { to: '/dashboard',    icon: '🏠', label: 'Inicio' },
  { to: '/courses',      icon: '📚', label: 'Cursos Disponibles' },
  { to: '/my-courses',   icon: '🎒', label: 'Mis Inscripciones' },
  { to: '/my-curriculum',icon: '🧭', label: 'Mi Malla Curricular' },
  { to: '/grades',       icon: '📈', label: 'Mis Notas' },
  { to: '/reports',      icon: '📊', label: 'Reportes' },
  { to: '/notifications',icon: '🔔', label: 'Notificaciones' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout, isAdmin, isTeacher } = useAuth();
  const navigate = useNavigate();

  const links = isAdmin() ? adminLinks : isTeacher() ? teacherLinks : studentLinks;
  const rolLabel = isAdmin() ? 'Administrador' : isTeacher() ? 'Docente' : 'Estudiante';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user
    ? `${user.nombres?.[0] ?? ''}${user.apellido_paterno?.[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-logo">A</div>
        <div style={{ flex: 1 }}>
          <div className="sidebar-title">SistemaAcad</div>
          <div className="sidebar-subtitle">{rolLabel}</div>
        </div>
        <button 
          className="sidebar-close-btn" 
          onClick={onClose} 
          title="Cerrar menú"
          aria-label="Cerrar menú"
        >
          ✕
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">Menú Principal</div>
        {links.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <span className="nav-icon">{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}

        <div className="nav-section-label" style={{ marginTop: 16 }}>Mi Cuenta</div>
        <NavLink 
          to="/profile" 
          onClick={onClose}
          className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        >
          <span className="nav-icon">👤</span>
          <span>Mi Perfil</span>
        </NavLink>
      </nav>

      <div className="sidebar-footer">
        <div className="nav-item" style={{ marginBottom: 10, pointerEvents: 'none' }}>
          <div className="avatar" style={{ width: 34, height: 34, fontSize: 12 }}>{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.nombres} {user?.apellido_paterno}
            </div>
            <div className="text-xs text-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button className="btn btn-ghost w-full btn-sm" onClick={handleLogout} style={{ border: '1px solid var(--border)' }}>
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
