import { useEffect, useState } from 'react';
import { notificationsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function Notifications() {
  const { user } = useAuth();
  const { show } = useToast();
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await notificationsApi.getByUser(user.id);
      setNotifs(res.data);
    } catch { show('Error al cargar notificaciones', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id) => {
    await notificationsApi.markAsRead(id);
    setNotifs((p) => p.map((n) => n.id === id ? { ...n, estado: true } : n));
  };

  const markAll = async () => {
    await notificationsApi.markAllAsRead(user.id);
    setNotifs((p) => p.map((n) => ({ ...n, estado: true })));
    show('Todas marcadas como leídas', 'success');
  };

  const unread = notifs.filter((n) => !n.estado).length;

  if (loading) return <div className="flex-center" style={{ padding: 80 }}><div className="spinner" style={{ width: 48, height: 48 }} /></div>;

  return (
    <div>
      <div className="page-header flex-between">
        <div>
          <h1>Notificaciones</h1>
          <p>{unread} sin leer · {notifs.length} en total</p>
        </div>
        {unread > 0 && (
          <button className="btn btn-secondary" onClick={markAll}>✅ Marcar todas como leídas</button>
        )}
      </div>

      <div className="card">
        {notifs.length === 0
          ? <div className="empty-state">
              <div className="empty-state-icon">🔕</div>
              <h3>Sin notificaciones</h3>
              <p>No tienes notificaciones pendientes</p>
            </div>
          : notifs.map((n) => (
            <div
              key={n.id}
              className={`notif-item ${!n.estado ? 'unread' : ''}`}
              onClick={() => !n.estado && markRead(n.id)}
            >
              <div style={{ paddingTop: 4 }}>
                {!n.estado
                  ? <div className="notif-dot" />
                  : <span style={{ fontSize: 18 }}>✉️</span>}
              </div>
              <div className="notif-content" style={{ flex: 1 }}>
                <div style={{ fontWeight: !n.estado ? 700 : 400, marginBottom: 4 }}>{n.titulo}</div>
                <p style={{ color: 'var(--text-secondary)' }}>{n.mensaje}</p>
                <time>{new Date(n.fecha_envio).toLocaleString('es-BO')}</time>
              </div>
              {!n.estado && (
                <span className="badge badge-primary" style={{ flexShrink: 0 }}>Nueva</span>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
