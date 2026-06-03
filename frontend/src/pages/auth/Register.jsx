import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, careersApi, usersApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';

const EyeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.41 21.41 0 0 1 5.06-6.94" />
    <path d="M1 1l22 22" />
    <path d="M9.88 9.88A3 3 0 0 0 12 15a3 3 0 0 0 3.12-3.12" />
    <path d="M14.12 14.12L19.2 19.2" />
  </svg>
);

const ROLES = [
  { id: 3, label: 'Estudiante', icon: '🎒', desc: 'Acceso a cursos, inscripciones y calificaciones' },
  { id: 2, label: 'Docente',    icon: '👨‍🏫', desc: 'Asignación de asignaturas, calificaciones e informes' },
  { id: 1, label: 'Administrador', icon: '🛡️', desc: 'Control de usuarios, carreras, materias y períodos' },
];

export default function Register() {
  const navigate = useNavigate();
  const { show } = useToast();
  const [step, setStep]     = useState(1);
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    nombres: '', apellido_paterno: '', apellido_materno: '',
    email: '', nombre_usuario: '', contrasena: '', confirmar: '',
    id_rol: 3,
    // Student specific
    matricula: '', telefono: '', fecha_nacimiento: '', id_carrera: '', id_pensum: '',
    // Teacher specific
    especialidad: '',
    // Teacher carreras (licenciaturas) - array of { id_carrera, licenciatura }
    carreras: [],
    // Teacher especialidades por carrera - array of { id_carrera, especialidad }
    especialidades: [],
  });
  const [careers, setCareers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});

  // Teacher dynamic form helpers
  const [newCarreraId, setNewCarreraId] = useState('');
  const [newCarreraLic, setNewCarreraLic] = useState('');
  const [newEspCarreraId, setNewEspCarreraId] = useState('');
  const [newEspTexto, setNewEspTexto] = useState('');

  const getCurrentPensumId = (career) => {
    if (!career?.pensums?.length) return '';
    const currentYear = new Date().getFullYear().toString();
    const currentPensum = career.pensums.find((pensum) => (pensum.anio_creacion || '').toString().startsWith(currentYear));
    return currentPensum?.id || career.pensums[0].id;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'id_carrera') {
      const selectedCareer = careers.find((career) => career.id.toString() === value);
      const nextPensum = selectedCareer ? getCurrentPensumId(selectedCareer) : '';
      setForm((p) => ({
        ...p,
        id_carrera: value,
        id_pensum: nextPensum,
      }));
      return;
    }

    setForm((p) => ({ ...p, [name]: value }));
  };

  const addCarrera = () => {
    if (!newCarreraId || !newCarreraLic.trim()) {
      show('Selecciona una carrera e ingresa la licenciatura', 'warning');
      return;
    }
    const already = form.carreras.find((c) => c.id_carrera === parseInt(newCarreraId));
    if (already) {
      show('Esta carrera ya fue agregada', 'warning');
      return;
    }
    setForm((p) => ({
      ...p,
      carreras: [...p.carreras, { id_carrera: parseInt(newCarreraId), licenciatura: newCarreraLic.trim() }],
    }));
    setNewCarreraId('');
    setNewCarreraLic('');
  };

  const removeCarrera = (id_carrera) => {
    setForm((p) => ({
      ...p,
      carreras: p.carreras.filter((c) => c.id_carrera !== id_carrera),
      especialidades: p.especialidades.filter((e) => e.id_carrera !== id_carrera),
    }));
  };

  const addEspecialidad = () => {
    if (!newEspCarreraId || !newEspTexto.trim()) {
      show('Selecciona la carrera e ingresa la especialidad', 'warning');
      return;
    }
    setForm((p) => ({
      ...p,
      especialidades: [...p.especialidades, { id_carrera: parseInt(newEspCarreraId), especialidad: newEspTexto.trim() }],
    }));
    setNewEspTexto('');
  };

  const removeEspecialidad = (index) => {
    setForm((p) => ({
      ...p,
      especialidades: p.especialidades.filter((_, i) => i !== index),
    }));
  };

  const validateStep1 = () => {
    const errors = {};
    const emailValue = form.email.trim();
    const usernameValue = form.nombre_usuario.trim();

    if (!form.nombres.trim()) errors.nombres = 'Ingresa los nombres';
    if (!form.apellido_paterno.trim()) errors.apellido_paterno = 'Ingresa el apellido paterno';
    if (!emailValue) errors.email = 'Ingresa el correo electrónico';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) errors.email = 'Ingresa un email válido';
    if (!usernameValue) errors.nombre_usuario = 'Ingresa el nombre de usuario';
    if (!form.contrasena) errors.contrasena = 'Ingresa la contraseña';
    if (!form.confirmar) errors.confirmar = 'Confirma la contraseña';
    if (form.contrasena && form.confirmar && form.contrasena !== form.confirmar) errors.confirmar = 'Las contraseñas no coinciden';
    if (form.contrasena && form.contrasena.length < 6) errors.contrasena = 'La contraseña debe tener al menos 6 caracteres';

    const normalizedEmail = emailValue.toLowerCase();
    const normalizedUsername = usernameValue.toLowerCase();
    const existingEmail = allUsers.some((user) => user.email?.trim().toLowerCase() === normalizedEmail);
    const existingUsername = allUsers.some((user) => user.nombre_usuario?.trim().toLowerCase() === normalizedUsername);
    const existingEmailAsUsername = allUsers.some((user) => user.nombre_usuario?.trim().toLowerCase() === normalizedEmail);
    const existingUsernameAsEmail = allUsers.some((user) => user.email?.trim().toLowerCase() === normalizedUsername);

    if (existingEmail || existingUsername || existingEmailAsUsername || existingUsernameAsEmail) {
      if (existingEmail) errors.email = 'Este email ya está registrado';
      if (existingUsername) errors.nombre_usuario = 'Este nombre de usuario ya está registrado';
      if (existingEmailAsUsername) errors.email = 'Este email colisiona con un nombre de usuario existente';
      if (existingUsernameAsEmail) errors.nombre_usuario = 'Este nombre de usuario colisiona con un email existente';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Corrige los campos señalados antes de continuar');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    setError('');
    if (validateStep1()) {
      setStep(2);
    }
  };

  useEffect(() => {
    const loadCareers = async () => {
      try {
        const response = await careersApi.getAll();
        setCareers(response.data || []);
      } catch (err) {
        console.error('Error cargando carreras:', err);
      }
    };

    const loadUsers = async () => {
      try {
        const response = await usersApi.getAll();
        setAllUsers(response.data || []);
      } catch (err) {
        console.error('Error cargando usuarios para validación:', err);
      }
    };

    loadCareers();
    loadUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const errors = {};
      if (form.id_rol === 3 && !form.id_carrera) errors.id_carrera = 'Selecciona la carrera del estudiante';
      if (form.id_rol === 3 && !form.matricula) errors.matricula = 'Ingresa la matrícula del estudiante';
      if (form.id_rol === 2 && !form.especialidad) errors.especialidad = 'Ingresa la especialidad del docente';
      if (form.id_rol === 2 && form.carreras.length === 0) errors.carreras = 'Agrega al menos una carrera (licenciatura) al docente';

      if (Object.keys(errors).length > 0) {
        setFieldErrors(errors);
        setError('Completa los campos requeridos antes de continuar');
        setLoading(false);
        return;
      }

      const { confirmar, ...payload } = form;
      payload.email = payload.email.trim().toLowerCase();
      payload.nombre_usuario = payload.nombre_usuario.trim().toLowerCase();
      payload.nombres = payload.nombres.trim();
      payload.apellido_paterno = payload.apellido_paterno.trim();
      payload.apellido_materno = payload.apellido_materno.trim();

      // Clean up fields based on role before sending to avoid unnecessary database values
      if (form.id_rol !== 3) {
        delete payload.matricula;
        delete payload.id_carrera;
        if (form.id_rol === 1) delete payload.telefono;
        if (form.id_rol === 1) delete payload.fecha_nacimiento;
      }
      if (form.id_rol !== 2) {
        delete payload.especialidad;
        delete payload.carreras;
        delete payload.especialidades;
      }

      await authApi.register(payload);
      show('¡Usuario registrado exitosamente! 🎉', 'success');
      navigate('/users');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al registrar el nuevo usuario.');
      show('Error en el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getCareerName = (id) => careers.find((c) => c.id === id)?.nombre || `Carrera #${id}`;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1>Registrar Nuevo Usuario</h1>
          <p>Crea una nueva cuenta de Estudiante, Docente o Administrador en la plataforma.</p>
        </div>
        <button className="btn btn-secondary" onClick={() => navigate('/users')}>
          ← Volver a Usuarios
        </button>
      </div>

      {/* Stepped progress header */}
      <div className="card" style={{ marginBottom: 24, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            Paso {step} de 2 — {step === 1 ? 'Información General' : 'Datos del Perfil'}
          </div>
          <span className="badge badge-primary">
            {step === 1 ? 'Fase Inicial' : 'Fase Final'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2].map((s) => (
            <div key={s} style={{
              flex: 1, height: 6, borderRadius: 99,
              background: s <= step ? 'var(--primary)' : 'var(--border)',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          <span>⚠️</span> {error}
        </div>
      )}
      {Object.keys(fieldErrors).length > 0 && (
        <div className="alert alert-danger" style={{ marginBottom: 24 }}>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {Object.values(fieldErrors).map((message, index) => (
              <li key={index}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      {step === 1 ? (
        <div className="card" style={{ padding: 24, marginBottom: 24, animation: 'slideUp 0.2s ease' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
            📄 1. Datos Personales y de Cuenta
          </h3>

          <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Nombres <span>*</span></label>
                <input className="form-control" name="nombres" placeholder="Ej: Juan Carlos" value={form.nombres} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido Paterno <span>*</span></label>
                <input className="form-control" name="apellido_paterno" placeholder="Ej: García" value={form.apellido_paterno} onChange={handleChange} required />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Apellido Materno</label>
                <input className="form-control" name="apellido_materno" placeholder="Ej: López" value={form.apellido_materno} onChange={handleChange} />
              </div>
              <div className="form-group">
                <label className="form-label">Correo Electrónico <span>*</span></label>
                <div className="input-group">
                  <span className="input-icon">📧</span>
                  <input className="form-control" name="email" type="email" placeholder="correo@ejemplo.com" value={form.email} onChange={handleChange} required />
                </div>
                {fieldErrors.email && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.email}</div>}
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre de Usuario <span>*</span></label>
              <div className="input-group">
                <span className="input-icon">👤</span>
                <input className="form-control" name="nombre_usuario" placeholder="Ej: juan.garcia (se usará para iniciar sesión)" value={form.nombre_usuario} onChange={handleChange} required />
              </div>
              {fieldErrors.nombre_usuario && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.nombre_usuario}</div>}
            </div>

            <div className="form-grid" style={{ marginBottom: 24 }}>
              <div className="form-group">
                <label className="form-label">Contraseña <span>*</span></label>
                <div className="input-group">
                  <span className="input-icon">🔒</span>
                  <input
                    className="form-control"
                    name="contrasena"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Mínimo 6 caracteres"
                    value={form.contrasena}
                    onChange={handleChange}
                    required
                  />
                  <span
                    className="input-icon input-icon-right"
                    onClick={() => setShowPassword((prev) => !prev)}
                    style={{ userSelect: 'none', display: 'flex', alignItems: 'center' }}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </span>
                </div>
                {fieldErrors.contrasena && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.contrasena}</div>}
              </div>
              <div className="form-group">
                <label className="form-label">Confirmar Contraseña <span>*</span></label>
                <div className="input-group">
                  <span className="input-icon">🔒</span>
                  <input
                    className="form-control"
                    name="confirmar"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Repite la contraseña"
                    value={form.confirmar}
                    onChange={handleChange}
                    required
                  />
                  <span
                    className="input-icon input-icon-right"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    style={{ userSelect: 'none', display: 'flex', alignItems: 'center' }}
                  >
                    {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </span>
                </div>
                {fieldErrors.confirmar && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.confirmar}</div>}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 32 }}>
              <label className="form-label">Selecciona el Rol del Usuario <span>*</span></label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginTop: 10 }}>
                {ROLES.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, id_rol: r.id }))}
                    style={{
                      padding: '16px',
                      borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${form.id_rol === r.id ? 'var(--primary)' : 'var(--border)'}`,
                      background: form.id_rol === r.id ? 'rgba(99,102,241,0.06)' : 'var(--bg-input)',
                      color: form.id_rol === r.id ? 'var(--primary-light)' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.25s ease',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <span style={{ fontSize: 24 }}>{r.icon}</span>
                      <strong style={{ fontSize: 15, color: form.id_rol === r.id ? 'var(--text-primary)' : 'inherit' }}>{r.label}</strong>
                    </div>
                    <p className="text-xs text-muted" style={{ lineHeight: 1.4 }}>{r.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button type="button" className="btn btn-primary btn-lg w-full" onClick={handleNext}>
              Siguiente Paso (Datos de Rol) →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20, color: 'var(--text-primary)' }}>
              ⚙️ 2. Información del Rol Seleccionado: <span style={{ color: 'var(--primary-light)' }}>
                {ROLES.find(r => r.id === form.id_rol)?.label}
              </span>
            </h3>

            {form.id_rol === 3 && (
              <div style={{ animation: 'slideUp 0.2s ease' }}>
                <div className="form-group">
                  <label className="form-label">Matrícula Escolar / Registro <span>*</span></label>
                  <input className="form-control" name="matricula" placeholder="Ej: EST-001 o 2024-0987" value={form.matricula} onChange={handleChange} required />
                  {fieldErrors.matricula && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.matricula}</div>}
                  <span className="form-hint">Código único de registro académico para el estudiante.</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Carrera del Estudiante <span>*</span></label>
                  <select className="form-control" name="id_carrera" value={form.id_carrera} onChange={handleChange} required>
                    <option value="">Selecciona una carrera</option>
                    {careers.map((career) => (
                      <option key={career.id} value={career.id}>{career.nombre}</option>
                    ))}
                  </select>
                  {fieldErrors.id_carrera && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.id_carrera}</div>}
                  <span className="form-hint">Selecciona la carrera a la que pertenece el estudiante.</span>
                </div>
                {form.id_carrera && (
                  <>
                    <input type="hidden" name="id_pensum" value={form.id_pensum} />
                    <div className="form-group">
                      <label className="form-label">Pensum Seleccionado</label>
                      <input
                        className="form-control"
                        value={(() => {
                          const career = careers.find((career) => career.id.toString() === form.id_carrera);
                          const pensum = career?.pensums?.find((p) => p.id === form.id_pensum);
                          return pensum ? `Pensum ${pensum.anio_creacion || pensum.id}` : 'Pensum no disponible';
                        })()}
                        disabled
                      />
                      <span className="form-hint">El pensum se selecciona automáticamente según el año actual de la carrera.</span>
                    </div>
                  </>
                )}
                <div className="form-grid">
                  <div className="form-group">
                    <label className="form-label">Teléfono de Contacto</label>
                    <input className="form-control" name="telefono" placeholder="Ej: 71234567" value={form.telefono} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de Nacimiento</label>
                    <input className="form-control" name="fecha_nacimiento" type="date" value={form.fecha_nacimiento} onChange={handleChange} />
                  </div>
                </div>
              </div>
            )}

            {form.id_rol === 2 && (
              <div style={{ animation: 'slideUp 0.2s ease' }}>
                {/* Especialidad general */}
                <div className="form-group">
                  <label className="form-label">Especialidad General <span>*</span></label>
                  <input className="form-control" name="especialidad" placeholder="Ej: Algoritmos, Ingeniería de Software, Álgebra" value={form.especialidad} onChange={handleChange} required />
                  {fieldErrors.especialidad && <div className="text-danger" style={{ marginTop: 6 }}>{fieldErrors.especialidad}</div>}
                  <span className="form-hint">Descripción general de la especialidad del docente.</span>
                </div>

                <div className="form-group">
                  <label className="form-label">Teléfono de Contacto</label>
                  <input className="form-control" name="telefono" placeholder="Ej: 71234567" value={form.telefono} onChange={handleChange} />
                </div>

                {/* ── Carreras / Licenciatura ── */}
                <div className="card" style={{ padding: 16, marginTop: 16, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--text-primary)' }}>
                    🎓 Carreras / Licenciatura <span style={{ color: 'var(--danger)', fontSize: 13 }}>*</span>
                  </div>
                  <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
                    Indica en qué carrera(s) terminó el docente y su licenciatura correspondiente.
                  </p>

                  {/* List of added carreras */}
                  {form.carreras.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
                      {form.carreras.map((c) => (
                        <div key={c.id_carrera} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '10px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.06)',
                          border: '1px solid var(--primary)', gap: 12,
                        }}>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{getCareerName(c.id_carrera)}</div>
                            <div className="text-xs text-muted">{c.licenciatura}</div>
                          </div>
                          <button type="button" className="btn btn-danger btn-sm" onClick={() => removeCarrera(c.id_carrera)} style={{ flexShrink: 0 }}>
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {fieldErrors.carreras && <div className="text-danger" style={{ marginBottom: 8 }}>{fieldErrors.carreras}</div>}

                  {/* Add new carrera */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div style={{ flex: '1 1 200px' }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Carrera</label>
                      <select className="form-control" value={newCarreraId} onChange={(e) => setNewCarreraId(e.target.value)}>
                        <option value="">Seleccionar carrera...</option>
                        {careers.filter((c) => !form.carreras.some((fc) => fc.id_carrera === c.id)).map((c) => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: '1 1 240px' }}>
                      <label className="form-label" style={{ fontSize: 12 }}>Licenciatura</label>
                      <input className="form-control" placeholder="Ej: Lic. en Matemáticas Aplicadas" value={newCarreraLic} onChange={(e) => setNewCarreraLic(e.target.value)} />
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={addCarrera} style={{ height: 40, flexShrink: 0 }}>
                      + Agregar
                    </button>
                  </div>
                </div>

                {/* ── Especialidades por Carrera ── */}
                {form.carreras.length > 0 && (
                  <div className="card" style={{ padding: 16, marginTop: 16, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--text-primary)' }}>
                      📋 Especialidades por Carrera
                    </div>
                    <p className="text-xs text-muted" style={{ marginBottom: 12 }}>
                      Define las especialidades del docente por cada carrera asignada.
                    </p>

                    {/* List of added especialidades */}
                    {form.especialidades.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                        {form.especialidades.map((e, idx) => (
                          <div key={idx} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)',
                            border: '1px solid var(--success)', gap: 12,
                          }}>
                            <div>
                              <span className="badge badge-info" style={{ marginRight: 8 }}>{getCareerName(e.id_carrera)}</span>
                              <span style={{ fontSize: 14 }}>{e.especialidad}</span>
                            </div>
                            <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEspecialidad(idx)} style={{ flexShrink: 0 }}>
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new especialidad */}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                      <div style={{ flex: '1 1 200px' }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Carrera</label>
                        <select className="form-control" value={newEspCarreraId} onChange={(e) => setNewEspCarreraId(e.target.value)}>
                          <option value="">Seleccionar carrera...</option>
                          {form.carreras.map((c) => (
                            <option key={c.id_carrera} value={c.id_carrera}>{getCareerName(c.id_carrera)}</option>
                          ))}
                        </select>
                      </div>
                      <div style={{ flex: '1 1 240px' }}>
                        <label className="form-label" style={{ fontSize: 12 }}>Especialidad</label>
                        <input className="form-control" placeholder="Ej: Desarrollo de Software, Cálculo Avanzado" value={newEspTexto} onChange={(e) => setNewEspTexto(e.target.value)} />
                      </div>
                      <button type="button" className="btn btn-primary btn-sm" onClick={addEspecialidad} style={{ height: 40, flexShrink: 0 }}>
                        + Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {form.id_rol === 1 && (
              <div className="alert alert-warning" style={{ margin: '12px 0 24px', animation: 'slideUp 0.2s ease' }}>
                <span>🛡️</span> <strong>Aviso de Seguridad:</strong> Se creará una cuenta de Administrador con privilegios absolutos para configurar la base académica, gestionar usuarios, carreras y reportes consolidados.
              </div>
            )}

            <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
              <button type="button" className="btn btn-secondary btn-lg" onClick={() => { setStep(1); setError(''); }}>
                ← Atrás (Datos de Cuenta)
              </button>
              <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                {loading ? (
                  <span className="spinner" style={{ width: 22, height: 22, borderWidth: 2 }} />
                ) : (
                  '✅ Completar y Crear Usuario'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
  );
}
