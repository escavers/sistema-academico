import { useEffect, useState } from 'react';
import { gradesApi, coursesApi, enrollmentsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';

function GradeCircle({ nota }) {
  if (nota == null) return <span className="text-muted">Sin nota</span>;
  const n = parseFloat(nota);
  const cls = n >= 70 ? 'grade-high' : n >= 51 ? 'grade-mid' : 'grade-low';
  return <div className={`grade-circle ${cls}`}>{n.toFixed(1)}</div>;
}

/* ── Teacher view ── */
function TeacherGrades({ user }) {
  const { show } = useToast();
  const [courses, setCourses]           = useState([]);
  const [selected, setSelected]         = useState(null);
  const [enrollments, setEnrollments]   = useState([]);
  const [modal, setModal]               = useState(null); // { enrollmentId, gradeId, nota, obs }
  const [saving, setSaving]             = useState(false);

  useEffect(() => {
    coursesApi.getByTeacher(user.id).then(r => setCourses(r.data)).catch(() => {});
  }, []);

  const loadCourse = async (course) => {
    setSelected(course);
    const res = await gradesApi.getByCourse(course.id);
    setEnrollments(res.data);
  };

  const openModal = (enr) => {
    setModal({
      enrollmentId: enr.id,
      gradeId: enr.calificacion?.id ?? null,
      nota: enr.calificacion?.nota ?? '',
      observacion: enr.calificacion?.observacion ?? '',
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      if (modal.gradeId) {
        await gradesApi.update(modal.gradeId, { nota: modal.nota, observacion: modal.observacion });
      } else {
        await gradesApi.create({ nota: modal.nota, observacion: modal.observacion, id_inscripcion: modal.enrollmentId, id_docente: user.id });
      }
      show('Calificación guardada ✅', 'success');
      setModal(null);
      loadCourse(selected);
    } catch (err) {
      show(err.response?.data?.message || 'Error al guardar', 'error');
    } finally { setSaving(false); }
  };

  return (
    <div>
      {!selected
        ? <>
            <div className="page-header"><h1>Calificaciones</h1><p>Selecciona un curso para gestionar notas</p></div>
            <div className="grid-auto">
              {courses.map((c) => (
                <div key={c.id} className="course-card" style={{ cursor: 'pointer' }} onClick={() => loadCourse(c)}>
                  <div className="course-card-banner" />
                  <div className="course-card-body">
                    <div className="course-card-code">{c.materia?.codigo}</div>
                    <div className="course-card-title">{c.materia?.nombre}</div>
                    <div className="course-card-meta">
                      <div className="course-card-meta-item">🏷️ {c.codigo_grupo}</div>
                    </div>
                  </div>
                  <div className="course-card-footer">
                    <span className="badge badge-primary">Ver notas →</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        : <>
            <div className="page-header flex-between">
              <div>
                <h1>{selected.materia?.nombre}</h1>
                <p>Grupo: {selected.codigo_grupo} · {enrollments.length} estudiantes</p>
              </div>
              <button className="btn btn-secondary" onClick={() => setSelected(null)}>← Volver</button>
            </div>
            <div className="card">
              <div className="table-wrapper">
                <table className="table">
                  <thead><tr><th>Estudiante</th><th>Matrícula</th><th>Nota</th><th>Observación</th><th>Acción</th></tr></thead>
                  <tbody>
                    {enrollments.map((e) => (
                      <tr key={e.id}>
                        <td><strong>{e.estudiante?.usuario?.nombres} {e.estudiante?.usuario?.apellido_paterno}</strong></td>
                        <td className="text-muted">{e.estudiante?.matricula}</td>
                        <td><GradeCircle nota={e.calificacion?.nota} /></td>
                        <td className="text-sm text-muted">{e.calificacion?.observacion ?? '—'}</td>
                        <td>
                          <button className="btn btn-primary btn-sm" onClick={() => openModal(e)}>
                            {e.calificacion ? '✏️ Editar' : '+ Calificar'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>}

      {modal && (
        <Modal
          title={modal.gradeId ? 'Editar calificación' : 'Asignar calificación'}
          onClose={() => setModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Guardando...' : '💾 Guardar'}
              </button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Nota (0–100) <span>*</span></label>
            <input
              className="form-control"
              type="number" min="0" max="100" step="0.01"
              value={modal.nota}
              onChange={(e) => setModal((p) => ({ ...p, nota: e.target.value }))}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Observación</label>
            <textarea
              className="form-control"
              rows={3}
              value={modal.observacion}
              onChange={(e) => setModal((p) => ({ ...p, observacion: e.target.value }))}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ── Student view ── */
function StudentGrades({ user }) {
  const [rows, setRows] = useState([]);
  useEffect(() => {
    gradesApi.getByStudent(user.id).then(r => setRows(r.data)).catch(() => {});
  }, []);

  const withGrade = rows.filter((r) => r.calificacion);
  const avg = withGrade.length
    ? (withGrade.reduce((s, r) => s + parseFloat(r.calificacion.nota), 0) / withGrade.length).toFixed(2)
    : null;

  return (
    <div>
      <div className="page-header">
        <h1>Mis Calificaciones</h1>
        {avg && <p>Promedio general: <strong style={{ color: 'var(--primary-light)' }}>{avg}</strong></p>}
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table className="table">
            <thead><tr><th>Materia</th><th>Grupo</th><th>Período</th><th>Nota</th><th>Estado</th></tr></thead>
            <tbody>
              {rows.length === 0
                ? <tr><td colSpan={5}><div className="empty-state"><div className="empty-state-icon">📭</div><p>Sin calificaciones registradas</p></div></td></tr>
                : rows.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.curso?.materia?.nombre}</strong></td>
                    <td>{r.curso?.codigo_grupo}</td>
                    <td>{r.curso?.periodo_academico?.codigo ?? '—'}</td>
                    <td><GradeCircle nota={r.calificacion?.nota} /></td>
                    <td>
                      {r.calificacion
                        ? <span className={`badge ${parseFloat(r.calificacion.nota) >= 51 ? 'badge-success' : 'badge-danger'}`}>
                            {parseFloat(r.calificacion.nota) >= 51 ? 'Aprobado' : 'Reprobado'}
                          </span>
                        : <span className="badge badge-neutral">Pendiente</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function Grades() {
  const { user, isTeacher } = useAuth();
  return isTeacher() ? <TeacherGrades user={user} /> : <StudentGrades user={user} />;
}
