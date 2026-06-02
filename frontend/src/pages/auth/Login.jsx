import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../services/api';

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

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [form, setForm] = useState({ nombre_usuario: '', contrasena: '' });
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = (e) =>
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await authApi.login(form);
      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-panel">
        <div className="auth-box">
          <div className="auth-logo">
            <div className="auth-logo-icon">A</div>
            <div className="auth-logo-text">
              <h2>SistemaAcad</h2>
              <p>Plataforma Académica Web</p>
            </div>
          </div>

          <h1 className="auth-title">Bienvenido 👋</h1>
          <p className="auth-subtitle">Ingresa tus credenciales para acceder a tu panel académico</p>

          {error && (
            <div className="alert alert-danger" style={{ animation: 'fadeIn 0.3s ease' }}>
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Nombre de Usuario <span>*</span></label>
              <div className="input-group">
                <span className="input-icon">👤</span>
                <input
                  className="form-control"
                  name="nombre_usuario"
                  type="text"
                  placeholder="Tu usuario (ej: admin, docente1)"
                  value={form.nombre_usuario}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Contraseña <span>*</span></label>
              <div className="input-group">
                <span className="input-icon">🔒</span>
                <input
                  className="form-control"
                  name="contrasena"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.contrasena}
                  onChange={handleChange}
                  required
                />
                <span
                  className="input-icon input-icon-right"
                  onClick={() => setShowPwd((p) => !p)}
                  style={{ userSelect: 'none', display: 'flex', alignItems: 'center' }}
                >
                  {showPwd ? <EyeOffIcon /> : <EyeIcon />}
                </span>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary w-full btn-lg"
              disabled={loading}
              style={{ marginTop: 16 }}
            >
              {loading ? (
                <span className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
              ) : (
                '🚀 Iniciar Sesión'
              )}
            </button>
          </form>

          <div className="auth-footer" style={{ marginTop: 32, fontSize: '12px', color: 'var(--text-muted)' }}>
            ℹ️ Si eres un nuevo docente o estudiante y no tienes cuenta, ponte en contacto con el <strong>Administrador del Sistema</strong>.
          </div>
        </div>
      </div>

      {/* Modern Split-pane Visual branding */}
      <div className="auth-visual">
        <div style={{ textAlign: 'center', maxWidth: 440 }}>
          <div style={{ fontSize: 90, marginBottom: 16, animation: 'spin 15s linear infinite' }}>🎓</div>
          <h2 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16, lineHeight: 1.2 }}>
            SaaS Académico de Alta Fidelidad
          </h2>
          <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: '15px' }}>
            Gestiona asignaturas, coordina horarios, controla inscripciones y visualiza reportes consolidados en tiempo real con una interfaz moderna y fluida.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 36, flexWrap: 'wrap' }}>
            {['👨‍💼 Administrativo', '👨‍🏫 Docentes', '🎒 Alumnos', '📊 Estadísticas'].map((tag) => (
              <span 
                key={tag} 
                className="badge badge-primary" 
                style={{ 
                  fontSize: '12px', 
                  padding: '6px 12px', 
                  background: 'rgba(99,102,241,0.12)', 
                  border: '1px solid rgba(99,102,241,0.2)' 
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
