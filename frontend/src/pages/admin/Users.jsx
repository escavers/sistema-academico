import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';

const ROLES = { 1: 'Administrador', 2: 'Docente', 3: 'Estudiante' };
const ROLE_BADGE = { 1: 'badge-warning', 2: 'badge-info', 3: 'badge-primary' };

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.41 21.41 0 0 1 5.06-6.94" />
    <path d="M1 1l22 22" />
    <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 3.12-3.12" />
  </svg>
);

export default function Users() {
  const { show } = useToast();
  const navigate = useNavigate();
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [roleModal, setRoleModal] = useState(null); // { userId, id_rol }
  const [editModal, setEditModal] = useState(null); // { userId, nombres, apellido_paterno, apellido_materno, email }
  const [passwordModal, setPasswordModal] = useState(null); // { userId, nombres, id_rol }
  const [passwordForm, setPasswordForm] = useState({ newPassword: '' });
  const [passwordError, setPasswordError] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  const load = async () => {
    try { 
      const r = await usersApi.getAll(); 
      setUsers(r.data); 
    } catch { 
      show('Error al cargar usuarios de la plataforma', 'error'); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleActivate = async (id) => {
    if (!confirm('¿Estás seguro de que deseas activar este usuario? Podrá iniciar sesión nuevamente.')) return;
    try {
      await usersApi.update(id, { estado: true });
      show('Usuario activado con éxito ✅', 'success');
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al activar el usuario', 'error');
    }
  };

  const saveRole = async () => {
    if (!roleModal) return;
    try {
      await usersApi.assignRole(roleModal.userId, { id_rol: roleModal.id_rol });
      show('Rol actualizado correctamente', 'success');
      setRoleModal(null);
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al actualizar rol', 'error');
    }
  };

  const saveEdit = async () => {
    if (!editModal) return;
    try {
      await usersApi.update(editModal.userId, {
        nombres: editModal.nombres,
        apellido_paterno: editModal.apellido_paterno,
        apellido_materno: editModal.apellido_materno,
        email: editModal.email,
      });
      show('Datos del usuario actualizados ✅', 'success');
      setEditModal(null);
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al actualizar datos del usuario', 'error');
    }
  };

  const generateGenericPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    return Array.from({ length: 10 }, () => chars.charAt(Math.floor(Math.random() * chars.length))).join('');
  };

  const openPasswordModal = (user) => {
    setPasswordModal({ userId: user.id, nombres: `${user.nombres} ${user.apellido_paterno}`, id_rol: user.id_rol });
    setPasswordForm({ newPassword: generateGenericPassword() });
    setPasswordError('');
    setShowNewPassword(false);
  };

  const handlePasswordChange = (e) => {
    const { value } = e.target;
    setPasswordForm({ newPassword: value });
  };

  const savePassword = async () => {
    if (!passwordModal) return;
    if (!passwordForm.newPassword) {
      setPasswordError('Ingresa una nueva contraseña');
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      await usersApi.changePassword(passwordModal.userId, { newPassword: passwordForm.newPassword });
      show('Contraseña restablecida correctamente ✅', 'success');
      setPasswordModal(null);
      load();
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Error al restablecer la contraseña');
    }
  };

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [u.nombres, u.apellido_paterno, u.nombre_usuario, u.email]
      .filter(Boolean)
      .some((s) => s.toLowerCase().includes(q));
    const matchesRole = !roleFilter || u.id_rol === parseInt(roleFilter);
    const matchesState = !stateFilter || (stateFilter === 'active' ? !!u.estado : !u.estado);
    return matchesSearch && matchesRole && matchesState;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageUsers = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  useEffect(() => { load(); }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, roleFilter, stateFilter]);

  const handleDeactivate = async (id) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este usuario? No podrá iniciar sesión.')) return;
    try {
      await usersApi.delete(id);
      show('Usuario desactivado con éxito ⚠️', 'warning');
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al desactivar el usuario', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1>Gestión de Usuarios</h1>
          <p>Visualiza, busca y modifica roles de las cuentas registradas ({filtered.length} en total)</p>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-primary" onClick={() => navigate('/register')}>
            ➕ Registrar Usuario
          </button>
          <div className="input-group search-input">
            <span className="input-icon">🔍</span>
            <input 
              className="form-control" 
              placeholder="Buscar por nombre, email o usuario..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>
          <select className="form-control" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} style={{ maxWidth: 220 }}>
            <option value="">Todos los roles</option>
            <option value="1">Administrador</option>
            <option value="2">Docente</option>
            <option value="3">Estudiante</option>
          </select>
          <select className="form-control" value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={{ maxWidth: 200 }}>
            <option value="">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="flex-center" style={{ padding: 60 }}>
            <div className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            <h3>Sin resultados</h3>
            <p>No se encontraron cuentas que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <>
            <div className="table-wrapper">
              <table className="table">
              <thead>
                <tr>
                  <th>Usuario / Cuenta</th>
                  <th>Correo Electrónico</th>
                  <th>Rol Académico</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pageUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div 
                          className="avatar" 
                          style={{ 
                            width: 36, 
                            height: 36, 
                            fontSize: '13px', 
                            flexShrink: 0,
                            background: u.estado ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'var(--bg-input)',
                            border: u.estado ? 'none' : '1px solid var(--border)'
                          }}
                        >
                          {`${u.nombres?.[0] ?? ''}${u.apellido_paterno?.[0] ?? ''}`.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px' }}>{u.nombres} {u.apellido_paterno}</div>
                          <div className="text-xs text-muted">@{u.nombre_usuario}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm text-muted">{u.email}</td>
                    <td>
                      <span className={`badge ${ROLE_BADGE[u.id_rol] ?? 'badge-neutral'}`}>
                        {u.rol?.nombre ?? ROLES[u.id_rol]}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${u.estado ? 'badge-success' : 'badge-neutral'}`}>
                        {u.estado ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditModal({ userId: u.id, nombres: u.nombres, apellido_paterno: u.apellido_paterno, apellido_materno: u.apellido_materno ?? '', email: u.email })}
                          title="Editar Datos"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setRoleModal({ userId: u.id, id_rol: u.id_rol })}
                          title="Cambiar Rol"
                        >
                          🎭 Rol
                        </button>
                        {(u.id_rol === 2 || u.id_rol === 3) && (
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => openPasswordModal(u)}
                            title="Restablecer contraseña"
                          >
                            🔐 Reset
                          </button>
                        )}
                        {u.estado ? (
                          <button 
                            className="btn btn-danger btn-sm" 
                            onClick={() => handleDeactivate(u.id)}
                            title="Desactivar Usuario"
                          >
                            🗑️ Desactivar
                          </button>
                        ) : (
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleActivate(u.id)}
                            title="Activar Usuario"
                          >
                            ✅ Activar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="table-footer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Mostrando {Math.min((currentPage - 1) * pageSize + 1, filtered.length)} - {Math.min(currentPage * pageSize, filtered.length)} de {filtered.length} usuarios
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                ← Anterior
              </button>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente →
              </button>
            </div>
          </div>
          </>
        )}
      </div>

      {passwordModal && (
        <Modal
          title="Restablecer Contraseña"
          onClose={() => setPasswordModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPasswordModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={savePassword}>🔒 Restablecer</button>
            </>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <p className="text-sm text-secondary" style={{ marginBottom: 16 }}>
              Restablece la contraseña del usuario {passwordModal?.nombres}. Utiliza una contraseña temporal segura para que pueda iniciar sesión.
            </p>
            <div className="form-group">
              <label className="form-label">Contraseña Generada <span>*</span></label>
              <div style={{ position: 'relative' }}>
                <input
                  className="form-control"
                  type={showNewPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Contraseña generada automáticamente"
                  style={{ paddingRight: 90 }}
                />
                <button
                  type="button"
                  className="btn btn-tertiary"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 34,
                    color: 'var(--text-primary)',
                  }}
                >
                  {showNewPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </div>
            {passwordError && <div className="text-danger" style={{ marginTop: 6 }}>{passwordError}</div>}
          </div>
        </Modal>
      )}

      {roleModal && (
        <Modal
          title="Modificar Rol Académico"
          onClose={() => setRoleModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setRoleModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveRole}>💾 Guardar Cambios</button>
            </>
          }
        >
          <div style={{ marginBottom: 16 }}>
            <p className="text-sm text-secondary" style={{ marginBottom: 16 }}>
              Selecciona el nuevo nivel de acceso para este usuario. Ten en cuenta que esto afectará sus permisos de inmediato.
            </p>
            <div className="form-group">
              <label className="form-label">Rol del Sistema</label>
              <select
                className="form-control"
                value={roleModal.id_rol}
                onChange={(e) => setRoleModal((p) => ({ ...p, id_rol: parseInt(e.target.value) }))}
              >
                <option value={3}>Estudiante</option>
                <option value={2}>Docente</option>
                <option value={1}>Administrador</option>
              </select>
            </div>
          </div>
        </Modal>
      )}

      {editModal && (
        <Modal
          title="Editar Datos del Usuario"
          onClose={() => setEditModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEditModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={saveEdit}>💾 Guardar Cambios</button>
            </>
          }
        >
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Nombres <span>*</span></label>
              <input
                className="form-control"
                value={editModal.nombres}
                onChange={(e) => setEditModal((p) => ({ ...p, nombres: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido Paterno <span>*</span></label>
              <input
                className="form-control"
                value={editModal.apellido_paterno}
                onChange={(e) => setEditModal((p) => ({ ...p, apellido_paterno: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido Materno</label>
              <input
                className="form-control"
                value={editModal.apellido_materno}
                onChange={(e) => setEditModal((p) => ({ ...p, apellido_materno: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Correo Electrónico <span>*</span></label>
              <input
                className="form-control"
                type="email"
                value={editModal.email}
                onChange={(e) => setEditModal((p) => ({ ...p, email: e.target.value }))}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
