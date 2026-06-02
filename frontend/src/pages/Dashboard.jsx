import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { dashboardApi } from '../services/api';

/* ── Shared stat card ── */
function StatCard({ icon, value, label, color, gradient }) {
  return (
    <div className="stat-card" style={{ '--gradient': gradient }}>
      <div className="stat-icon" style={{ background: color }}>
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value ?? '—'}</div>
        <div className="stat-label">{label}</div>
      </div>
    </div>
  );
}

/* ── Student Dashboard ── */
function StudentDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { 
    dashboardApi.student()
      .then(r => setData(r.data))
      .catch(() => {}); 
  }, []);

  return (
    <>
      <div className="stat-grid">
        <StatCard icon="📚" value={data?.enrollmentsCount} label="Cursos inscritos"
          color="rgba(99,102,241,0.2)" gradient="linear-gradient(90deg,#6366f1,#818cf8)" />
        <StatCard icon="⭐" value={data?.averageGrade ? `${data.averageGrade}` : '—'} label="Promedio general"
          color="rgba(245,158,11,0.2)" gradient="linear-gradient(90deg,#f59e0b,#fbbf24)" />
        <StatCard icon="🔔" value={data?.recentNotifications?.length} label="Notificaciones recientes"
          color="rgba(6,182,212,0.2)" gradient="linear-gradient(90deg,#06b6d4,#22d3ee)" />
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">📚 Cursos Activos</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/my-courses')}>Ver todos</button>
          </div>
          {data?.currentEnrollments?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <p>No tienes cursos inscritos en este período.</p>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/courses')} style={{ marginTop: 12 }}>
                🔍 Inscribirse a Cursos
              </button>
            </div>
          ) : (
            data?.currentEnrollments?.map((e) => (
              <div key={e.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '14px' }}>{e.curso?.materia?.nombre}</div>
                  <div className="text-xs text-muted" style={{ marginTop: 2 }}>Código: {e.curso?.codigo_grupo}</div>
                </div>
                <span className="badge badge-success">{e.estado}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">🔔 Notificaciones</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/notifications')}>Ver buzón</button>
          </div>
          {data?.recentNotifications?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔕</div>
              <p>Sin notificaciones recientes</p>
            </div>
          ) : (
            data?.recentNotifications?.slice(0, 4).map((n) => (
              <div key={n.id} className={`notif-item ${!n.estado ? 'unread' : ''}`} onClick={() => navigate('/notifications')}>
                {!n.estado && <div className="notif-dot" />}
                <div className="notif-content" style={{ flex: 1 }}>
                  <p><strong>{n.titulo}:</strong> {n.mensaje}</p>
                  <time>{new Date(n.fecha_envio).toLocaleDateString('es-BO')}</time>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ── Teacher Dashboard ── */
function TeacherDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { 
    dashboardApi.teacher()
      .then(r => setData(r.data))
      .catch(() => {}); 
  }, []);

  return (
    <>
      <div className="stat-grid">
        <StatCard icon="📚" value={data?.assignedCoursesCount} label="Cursos asignados"
          color="rgba(99,102,241,0.2)" gradient="linear-gradient(90deg,#6366f1,#818cf8)" />
        <StatCard icon="👥" value={data?.totalStudents} label="Estudiantes totales"
          color="rgba(16,185,129,0.2)" gradient="linear-gradient(90deg,#10b981,#34d399)" />
        <StatCard icon="🔔" value={data?.recentNotifications?.length} label="Notificaciones unread"
          color="rgba(6,182,212,0.2)" gradient="linear-gradient(90deg,#06b6d4,#22d3ee)" />
      </div>

      <div className="card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="card-title">📚 Cursos Bajo mi Cargo</div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/grades')}>Evaluar estudiantes</button>
        </div>
        {data?.courses?.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <p>No tienes cursos asignados para el período vigente.</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table">
              <thead>
                <tr>
                  <th>Grupo</th>
                  <th>Materia</th>
                  <th>Estudiantes</th>
                  <th>Estado</th>
                  <th>Lógica</th>
                </tr>
              </thead>
              <tbody>
                {data?.courses?.map((c) => (
                  <tr key={c.id}>
                    <td><strong>{c.codigo_grupo}</strong></td>
                    <td>{c.materia?.nombre}</td>
                    <td><span className="badge badge-info">{c.studentCount}</span></td>
                    <td>
                      <span className={`badge ${c.estado ? 'badge-success' : 'badge-neutral'}`}>
                        {c.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => navigate('/grades')}>
                        📝 Calificar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Admin Dashboard ── */
function AdminDashboard() {
  const [data, setData] = useState(null);
  const navigate = useNavigate();

  useEffect(() => { 
    dashboardApi.admin()
      .then(r => setData(r.data))
      .catch(() => {}); 
  }, []);

  return (
    <>
      <div className="stat-grid">
        <StatCard icon="👥" value={data?.totalUsers} label="Usuarios del sistema"
          color="rgba(99,102,241,0.2)" gradient="linear-gradient(90deg,#6366f1,#818cf8)" />
        <StatCard icon="📚" value={data?.totalCourses} label="Cursos programados"
          color="rgba(16,185,129,0.2)" gradient="linear-gradient(90deg,#10b981,#34d399)" />
        <StatCard icon="🎒" value={data?.totalStudents} label="Estudiantes registrados"
          color="rgba(6,182,212,0.2)" gradient="linear-gradient(90deg,#06b6d4,#22d3ee)" />
        <StatCard icon="👨‍🏫" value={data?.totalTeachers} label="Docentes registrados"
          color="rgba(245,158,11,0.2)" gradient="linear-gradient(90deg,#f59e0b,#fbbf24)" />
      </div>

      <div className="grid-2">
        {/* Quick links block */}
        <div className="card">
          <div className="card-header"><div className="card-title">⚡ Accesos Rápidos de Control</div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {[
              { path: '/users', label: '👥 Cuentas de Usuarios', color: 'rgba(99,102,241,0.06)' },
              { path: '/courses', label: '📚 Catálogo de Cursos', color: 'rgba(16,185,129,0.06)' },
              { path: '/subjects', label: '📖 Plan de Materias', color: 'rgba(6,182,212,0.06)' },
              { path: '/careers', label: '🎓 Carreras Académicas', color: 'rgba(245,158,11,0.06)' },
              { path: '/periods', label: '📅 Períodos Escolares', color: 'rgba(239,68,68,0.06)' },
              { path: '/reports', label: '📊 Informes & Reportes', color: 'rgba(255,255,255,0.04)' }
            ].map((opt) => (
              <button 
                key={opt.path} 
                className="btn btn-secondary text-left" 
                onClick={() => navigate(opt.path)}
                style={{ 
                  padding: '14px 16px', 
                  background: opt.color, 
                  border: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  justifyContent: 'flex-start'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications summary block */}
        <div className="card">
          <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title">🔔 Notificaciones del Sistema</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/notifications')}>Ver todas</button>
          </div>
          {data?.recentNotifications?.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🔕</div>
              <p>Sin novedades que reportar.</p>
            </div>
          ) : (
            data?.recentNotifications?.slice(0, 4).map((n) => (
              <div key={n.id} className={`notif-item ${!n.estado ? 'unread' : ''}`} onClick={() => navigate('/notifications')}>
                {!n.estado && <div className="notif-dot" />}
                <div className="notif-content" style={{ flex: 1 }}>
                  <p><strong>{n.titulo}:</strong> {n.mensaje}</p>
                  <time>{new Date(n.fecha_envio).toLocaleDateString('es-BO')}</time>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

/* ── Main Dashboard ── */
export default function Dashboard() {
  const { user, isAdmin, isTeacher } = useAuth();
  
  const greet = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Buenos días';
    if (h < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1>{greet()}, {user?.nombres} 👋</h1>
        <p>Aquí está el resumen general de tu actividad académica</p>
      </div>
      {isAdmin() ? <AdminDashboard /> : isTeacher() ? <TeacherDashboard /> : <StudentDashboard />}
    </div>
  );
}
