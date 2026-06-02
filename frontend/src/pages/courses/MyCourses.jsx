import { useEffect, useState } from 'react';
import { enrollmentsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function MyCourses() {
  const { user } = useAuth();
  const { show } = useToast();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const res = await enrollmentsApi.getByStudent(user.id);
      setEnrollments(res.data);
    } catch { show('Error al cargar inscripciones', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id) => {
    if (!confirm('¿Cancelar esta inscripción?')) return;
    try {
      await enrollmentsApi.cancel(id);
      show('Inscripción cancelada', 'warning');
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al cancelar', 'error');
    }
  };

  const active   = enrollments.filter((e) => e.estado === 'Inscrito');
  const inactive = enrollments.filter((e) => e.estado !== 'Inscrito');

  if (loading) return <div className="flex-center" style={{ padding: 80 }}><div className="spinner" style={{ width: 48, height: 48 }} /></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Mis Inscripciones</h1>
        <p>{active.length} activas · {inactive.length} canceladas/historial</p>
      </div>

      {enrollments.length === 0
        ? <div className="empty-state">
            <div className="empty-state-icon">🎒</div>
            <h3>Sin inscripciones</h3>
            <p>Aún no estás inscrito en ningún curso</p>
          </div>
        : <>
            <div className="grid-auto">
              {active.map((e) => (
                <div key={e.id} className="course-card">
                  <div className="course-card-banner" />
                  <div className="course-card-body">
                    <div className="course-card-code">{e.curso?.materia?.codigo}</div>
                    <div className="course-card-title">{e.curso?.materia?.nombre}</div>
                    <div className="course-card-meta">
                      <div className="course-card-meta-item">🏷️ {e.curso?.codigo_grupo}</div>
                      <div className="course-card-meta-item">📅 Inscrito: {new Date(e.fecha_inscripcion).toLocaleDateString('es-BO')}</div>
                      {e.curso?.horarios?.map((h) => (
                        <div key={h.id} className="course-card-meta-item">🕐 {h.dia_semana} {h.hora_inicio}–{h.hora_fin} • {h.aula}</div>
                      ))}
                    </div>
                  </div>
                  <div className="course-card-footer">
                    <span className="badge badge-success">{e.estado}</span>
                    <button className="btn btn-danger btn-sm" onClick={() => handleCancel(e.id)}>
                      Cancelar
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {inactive.length > 0 && (
              <div className="card" style={{ marginTop: 24 }}>
                <div className="card-header"><div className="card-title">📋 Historial</div></div>
                <div className="table-wrapper">
                  <table className="table">
                    <thead><tr><th>Materia</th><th>Grupo</th><th>Período</th><th>Estado</th></tr></thead>
                    <tbody>
                      {inactive.map((e) => (
                        <tr key={e.id}>
                          <td>{e.curso?.materia?.nombre}</td>
                          <td>{e.curso?.codigo_grupo}</td>
                          <td>{e.curso?.periodo_academico?.codigo}</td>
                          <td><span className="badge badge-neutral">{e.estado}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>}
    </div>
  );
}
