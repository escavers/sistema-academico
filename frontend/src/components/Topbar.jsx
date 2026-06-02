import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const pageTitles = {
  '/dashboard':    { title: 'Dashboard', subtitle: 'Resumen de actividad académica' },
  '/courses':      { title: 'Cursos', subtitle: 'Gestiona los cursos disponibles' },
  '/my-courses':   { title: 'Mis Inscripciones', subtitle: 'Cursos en los que estás inscrito' },
  '/grades':       { title: 'Calificaciones', subtitle: 'Registro y consulta de notas' },
  '/profile':      { title: 'Mi Perfil', subtitle: 'Información personal y configuración de cuenta' },
  '/notifications':{ title: 'Notificaciones', subtitle: 'Tus avisos y mensajes recientes' },
  '/users':        { title: 'Gestión de Usuarios', subtitle: 'Administra las cuentas y roles del sistema' },
  '/register':     { title: 'Registrar Usuario', subtitle: 'Crea una nueva cuenta en el sistema académico' },
  '/careers':      { title: 'Carreras', subtitle: 'Gestiona las carreras académicas' },
  '/subjects':     { title: 'Materias', subtitle: 'Gestiona el catálogo de materias' },
  '/periods':      { title: 'Períodos Académicos', subtitle: 'Gestiona los períodos del sistema' },
  '/reports':      { title: 'Reportes', subtitle: 'Genera y descarga reportes académicos estructurados' },
};

export default function Topbar({ unreadCount = 0, onToggleSidebar }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { title, subtitle } = pageTitles[pathname] ?? { title: 'Sistema Académico', subtitle: '' };

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const defaultTheme = savedTheme || 'light';
    setTheme(defaultTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));

  const initials = user
    ? `${user.nombres?.[0] ?? ''}${user.apellido_paterno?.[0] ?? ''}`.toUpperCase()
    : 'U';

  return (
    <header className="topbar">
      <div className="topbar-left" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button 
          className="topbar-btn hamburger-btn" 
          onClick={onToggleSidebar}
          title="Menú"
          aria-label="Toggle Sidebar"
        >
          ☰
        </button>
        <div>
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="topbar-right">
        <button
          className="topbar-btn"
          title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
          onClick={toggleTheme}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
        <button
          className="topbar-btn"
          title="Notificaciones"
          onClick={() => navigate('/notifications')}
        >
          🔔
          {unreadCount > 0 && (
            <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
        <div 
          className="avatar" 
          title={`${user?.nombres} ${user?.apellido_paterno}`}
          onClick={() => navigate('/profile')}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
