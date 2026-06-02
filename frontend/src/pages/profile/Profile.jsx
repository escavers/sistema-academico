import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { authApi, usersApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function Profile() {
  const { user, login, token } = useAuth();
  const { show } = useToast();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [pwdMode, setPwdMode]   = useState(false);
  const [form, setForm]   = useState({});
  const [pwdForm, setPwdForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    const res = await authApi.profile();
    setProfile(res.data);
    setForm({
      nombres: res.data.nombres,
      apellido_paterno: res.data.apellido_paterno,
      apellido_materno: res.data.apellido_materno ?? '',
      email: res.data.email,
    });
  };

  useEffect(() => { load(); }, []);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await usersApi.update(user.id, form);
      // Refresh stored user
      const updatedUser = { ...user, nombres: form.nombres, apellido_paterno: form.apellido_paterno, email: form.email };
      login(token, updatedUser);
      show('Perfil actualizado ✅', 'success');
      setEditMode(false);
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al actualizar', 'error');
    } finally { setSaving(false); }
  };

  const savePassword = async () => {
    if (pwdForm.newPassword !== pwdForm.confirm) {
      show('Las contraseñas no coinciden', 'error'); return;
    }
    if (pwdForm.newPassword.length < 6) {
      show('Mínimo 6 caracteres', 'error'); return;
    }
    setSaving(true);
    try {
      await usersApi.changePassword(user.id, { currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword });
      show('Contraseña actualizada ✅', 'success');
      setPwdMode(false);
      setPwdForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      show(err.response?.data?.message || 'Error al cambiar contraseña', 'error');
    } finally { setSaving(false); }
  };

  const initials = profile
    ? `${profile.nombres?.[0] ?? ''}${profile.apellido_paterno?.[0] ?? ''}`.toUpperCase()
    : '?';

  if (!profile) return <div className="flex-center" style={{ padding: 80 }}><div className="spinner" style={{ width: 48, height: 48 }} /></div>;

  const rolColor = profile.rol?.nombre === 'Administrador' ? '#fbbf24' : profile.rol?.nombre === 'Docente' ? '#22d3ee' : 'var(--primary-light)';

  return (
    <div>
      <div className="page-header"><h1>Mi Perfil</h1><p>Gestiona tu información personal</p></div>

      <div className="grid-2" style={{ alignItems: 'start', gap: 24 }}>
        {/* Left: Avatar + info */}
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, fontWeight: 800, color: '#fff', margin: '0 auto 20px', boxShadow: '0 8px 32px var(--primary-glow)' }}>
            {initials}
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800 }}>{profile.nombres} {profile.apellido_paterno} {profile.apellido_materno}</h2>
          <div style={{ color: rolColor, fontWeight: 700, marginTop: 6, fontSize: 14 }}>{profile.rol?.nombre}</div>
          <div className="text-sm text-muted" style={{ marginTop: 4 }}>@{profile.nombre_usuario}</div>
          <div className="text-sm text-muted" style={{ marginTop: 4 }}>{profile.email}</div>

          {/* Role-specific data */}
          {profile.estudiante && (
            <div style={{ marginTop: 20, textAlign: 'left', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div className="text-xs text-muted" style={{ marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Datos de Estudiante</div>
              <div className="text-sm" style={{ marginBottom: 4 }}>🎫 Matrícula: <strong>{profile.estudiante.matricula}</strong></div>
              {profile.estudiante.telefono && <div className="text-sm" style={{ marginBottom: 4 }}>📞 {profile.estudiante.telefono}</div>}
              {profile.estudiante.fecha_nacimiento && <div className="text-sm">🎂 {new Date(profile.estudiante.fecha_nacimiento).toLocaleDateString('es-BO')}</div>}
            </div>
          )}
          {profile.docente && (
            <div style={{ marginTop: 20, textAlign: 'left', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: 16 }}>
              <div className="text-xs text-muted" style={{ marginBottom: 8, textTransform: 'uppercase', fontWeight: 700 }}>Datos de Docente</div>
              {profile.docente.especialidad && <div className="text-sm" style={{ marginBottom: 4 }}>🎓 {profile.docente.especialidad}</div>}
              {profile.docente.telefono && <div className="text-sm">📞 {profile.docente.telefono}</div>}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-primary w-full" onClick={() => { setEditMode(true); setPwdMode(false); }}>✏️ Editar perfil</button>
            <button className="btn btn-secondary w-full" onClick={() => { setPwdMode(true); setEditMode(false); }}>🔒 Cambiar contraseña</button>
          </div>
        </div>

        {/* Right: Forms */}
        <div>
          {editMode && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">✏️ Editar información</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setEditMode(false)}>✕</button>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nombres</label>
                  <input className="form-control" value={form.nombres} onChange={(e) => setForm(p => ({ ...p, nombres: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Apellido Paterno</label>
                  <input className="form-control" value={form.apellido_paterno} onChange={(e) => setForm(p => ({ ...p, apellido_paterno: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Materno</label>
                <input className="form-control" value={form.apellido_materno} onChange={(e) => setForm(p => ({ ...p, apellido_materno: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={form.email} onChange={(e) => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setEditMode(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={saveProfile} disabled={saving}>
                  {saving ? 'Guardando...' : '💾 Guardar cambios'}
                </button>
              </div>
            </div>
          )}

          {pwdMode && (
            <div className="card">
              <div className="card-header">
                <div className="card-title">🔒 Cambiar contraseña</div>
                <button className="btn btn-ghost btn-sm" onClick={() => setPwdMode(false)}>✕</button>
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña actual</label>
                <input className="form-control" type="password" value={pwdForm.currentPassword} onChange={(e) => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Nueva contraseña</label>
                <input className="form-control" type="password" value={pwdForm.newPassword} onChange={(e) => setPwdForm(p => ({ ...p, newPassword: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar nueva contraseña</label>
                <input className="form-control" type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-secondary" onClick={() => setPwdMode(false)}>Cancelar</button>
                <button className="btn btn-primary" onClick={savePassword} disabled={saving}>
                  {saving ? 'Guardando...' : '✅ Actualizar contraseña'}
                </button>
              </div>
            </div>
          )}

          {!editMode && !pwdMode && (
            <div className="empty-state">
              <div className="empty-state-icon">👤</div>
              <h3>Edita tu perfil</h3>
              <p>Usa los botones de la izquierda para editar tu información o cambiar tu contraseña</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
