import { useEffect, useState } from 'react';
import { reportsApi, coursesApi, usersApi, careersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';

function Section({ title, children, actions }) {
  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <div className="card-header flex-between" style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <div className="card-title" style={{ fontSize: 16 }}>{title}</div>
        {actions && <div style={{ display: 'flex', gap: 8 }}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}

function GradeCircle({ nota }) {
  if (nota == null) return <span className="text-muted">—</span>;
  const n = parseFloat(nota);
  const cls = n >= 70 ? 'grade-high' : n >= 51 ? 'grade-mid' : 'grade-low';
  return <div className={`grade-circle ${cls}`} style={{ width: 42, height: 42, fontSize: 12 }}>{n.toFixed(1)}</div>;
}

export default function Reports() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const { show } = useToast();

  const [loading, setLoading] = useState(false);

  /* Admin: subjects by career */
  const [careerReport, setCareerReport] = useState(null);
  const [careerOptions, setCareerOptions] = useState([]);
  const [selectedCareerIds, setSelectedCareerIds] = useState([]);
  const [careerQuery, setCareerQuery] = useState('');
  const [showCareerDropdown, setShowCareerDropdown] = useState(false);
  const [hoverCareerId, setHoverCareerId] = useState(null);
  const careerGradient = { background: 'linear-gradient(135deg, #7b61ff 0%, #4a32ff 100%)', color: '#fff' };

  /* Teacher: grades by course */
  const [courseIdT, setCourseIdT]   = useState('');
  const [gradesByCourse, setGradesByCourse]   = useState(null);
  const [enrolledStudents, setEnrolledStudents] = useState(null);
  const [teacherSubjects, setTeacherSubjects] = useState(null);
  const [teacherCourses, setTeacherCourses] = useState([]);

  /* Student */
  const [history, setHistory]       = useState(null);
  const [mySubjects, setMySubjects] = useState(null);
  const [allGrades, setAllGrades] = useState(null);

  // Core download logic utilizing axios response type blob
  const handleDownload = async (endpoint, baseFilename, format, params = {}) => {
    setLoading(true);
    try {
      const response = await api.get(endpoint, {
        params: { ...params, format },
        responseType: 'blob'
      });

      const mimeType = format === 'pdf' 
        ? 'application/pdf' 
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      const fileExt = format === 'pdf' ? 'pdf' : 'xlsx';
      
      const blob = new Blob([response.data], { type: mimeType });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `${baseFilename}_${Date.now()}.${fileExt}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      show(`Reporte exportado como ${format.toUpperCase()} con éxito 📥`, 'success');
    } catch {
      show('Error al generar la descarga desde el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCareerReport = async () => {
    try {
      const r = await reportsApi.subjectsByCareer(selectedCareerIds);
      setCareerReport(r.data);
    } catch {
      show('Error al generar reporte de materias por carrera', 'error');
    }
  };

  useEffect(() => {
    if (!isAdmin()) return;
    fetchCareerReport();
  }, [selectedCareerIds]);

  const fetchGradesByCourse = async () => {
    if (!courseIdT) { show('Selecciona un curso para filtrar', 'warning'); return; }
    try { 
      const r = await reportsApi.gradesByCourse(courseIdT); 
      setGradesByCourse(r.data); 
    } catch { 
      show('Error al consultar calificaciones del curso', 'error'); 
    }
  };

  const fetchEnrolledStudents = async () => {
    if (!courseIdT.trim()) { show('Ingresa el ID del curso para filtrar', 'warning'); return; }
    try {
      const r = await reportsApi.enrolledByCourse(courseIdT);
      setEnrolledStudents(r.data);
    } catch {
      show('Error al consultar alumnos inscritos', 'error');
    }
  };

  const fetchTeacherSubjects = async () => {
    try {
      const r = await reportsApi.subjectsByTeacher(user.id);
      setTeacherSubjects(r.data);
    } catch {
      show('Error al cargar mis asignaturas', 'error');
    }
  };

  useEffect(() => {
    // Load teacher's courses for selection
    const loadCourses = async () => {
      try {
        const r = await coursesApi.getByTeacher(user.id);
        setTeacherCourses(r.data || []);
      } catch {
        // fallback: load all courses and filter
        try {
          const all = await coursesApi.getAll();
          setTeacherCourses((all.data || []).filter(c => c.id_docente === user.id));
        } catch {}
      }
    };

    const loadCareers = async () => {
      try {
        const r = await careersApi.getAll();
        setCareerOptions(r.data || []);
      } catch {}
    };

    if (isTeacher()) {
      loadCourses();
    }
    if (isAdmin()) {
      loadCareers();
    }
  }, [user, isTeacher, isAdmin]);

  const fetchAllGrades = async () => {
    try {
      const r = await api.get(`/reports/grades-all-subjects/${user.id}`);
      setAllGrades(r.data);
    } catch {
      show('Error al cargar notas de todas las materias', 'error');
    }
  };

  const fetchHistory = async () => {
    try { 
      const r = await reportsApi.academicHistory(user.id); 
      setHistory(r.data); 
    } catch { 
      show('Error al cargar historial académico', 'error'); 
    }
  };

  const fetchMySubjects = async () => {
    try { 
      const r = await reportsApi.subjectsByStudent(user.id); 
      setMySubjects(r.data); 
    } catch { 
      show('Error al cargar asignaturas cursadas', 'error'); 
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header" style={{ marginBottom: 28 }}>
        <h1>📊 Informes Académicos</h1>
        <p>Consulta previsualizaciones de reportes y descarga documentos formales firmados digitalmente</p>
      </div>

      {loading && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(15,15,26,0.7)',
          backdropFilter: 'blur(5px)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', zIndex: 9999, gap: 16
        }}>
          <div className="spinner" style={{ width: 48, height: 48 }} />
          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Generando y procesando archivo...</div>
        </div>
      )}

      {/* ── ADMIN: Career Subject Breakdown ── */}
      {isAdmin() && (
        <Section 
          title="📋 Materias Organizadas por Carrera"
        >
              <div style={{ marginBottom: 20, display: 'grid', gap: 12 }}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label style={{ fontWeight: 600 }}>Filtrar por carreras</label>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    className="form-control"
                    placeholder={careerOptions.length === 0 ? 'Cargando carreras...' : 'Buscar carreras...'}
                    value={careerQuery}
                    onChange={(e) => { setCareerQuery(e.target.value); setShowCareerDropdown(true); }}
                    onFocus={() => setShowCareerDropdown(true)}
                    style={{ paddingRight: 36 }}
                    disabled={careerOptions.length === 0}
                  />
                  <button
                    className="btn"
                    style={{ position: 'absolute', right: 6, top: 6, padding: '6px 8px', ...(selectedCareerIds.length ? { background: careerGradient.background, color: careerGradient.color, border: 'none', boxShadow: '0 6px 18px rgba(75,35,210,0.12)' } : {}) }}
                    onClick={() => { setCareerQuery(''); setShowCareerDropdown((s) => !s); }}
                    aria-label="Toggle career dropdown"
                    type="button"
                  >
                    ▾
                  </button>
                  {showCareerDropdown && careerOptions.length > 0 && (
                    <div style={{ position: 'absolute', zIndex: 40, left: 0, right: 0, marginTop: 8, maxHeight: 220, overflow: 'auto', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', boxShadow: '0 6px 18px rgba(0,0,0,0.08)' }}>
                      {careerOptions.filter(c => !selectedCareerIds.includes(c.id) && c.nombre.toLowerCase().includes(careerQuery.trim().toLowerCase())).map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSelectedCareerIds((prev) => [...prev, c.id]);
                            setCareerQuery('');
                            setShowCareerDropdown(false);
                          }}
                          onMouseEnter={() => setHoverCareerId(c.id)}
                          onMouseLeave={() => setHoverCareerId(null)}
                          style={{
                            padding: 10,
                            cursor: 'pointer',
                            borderBottom: '1px solid rgba(0,0,0,0.03)',
                            transition: 'background 0.12s ease, transform 0.12s ease',
                            background: hoverCareerId === c.id ? careerGradient.background : 'transparent',
                            color: hoverCareerId === c.id ? careerGradient.color : undefined,
                            transform: hoverCareerId === c.id ? 'translateY(-1px)' : 'none'
                          }}
                        >
                          <div style={{ fontWeight: 600 }}>{c.nombre}</div>
                          <div
                            className="text-xs text-muted"
                            style={{
                              opacity: hoverCareerId === c.id ? 0.95 : 0.85,
                              color: hoverCareerId === c.id ? 'rgba(255,255,255,0.92)' : undefined,
                              textShadow: hoverCareerId === c.id ? '0 1px 2px rgba(0,0,0,0.36)' : 'none',
                              fontWeight: hoverCareerId === c.id ? 600 : 500
                            }}
                          >
                            {c.codigo} — {c.modalidad?.nombre ?? 'Semestral'}
                          </div>
                        </div>
                      ))}
                      {careerOptions.filter(c => !selectedCareerIds.includes(c.id) && c.nombre.toLowerCase().includes(careerQuery.trim().toLowerCase())).length === 0 && (
                        <div style={{ padding: 12 }} className="text-muted">No se encontraron carreras.</div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {selectedCareerIds.map((id) => {
                    const c = careerOptions.find((x) => x.id === id);
                    if (!c) return null;
                    return (
                      <div key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 999, ...careerGradient, border: 'none', boxShadow: '0 6px 18px rgba(75,35,210,0.12)' }}>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{c.nombre}</div>
                        <button
                          className="btn btn-icon"
                          onClick={() => setSelectedCareerIds((prev) => prev.filter((x) => x !== id))}
                          aria-label={`Quitar ${c.nombre}`}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.26)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.18)'}
                          style={{
                            color: '#fff',
                            background: 'rgba(0,0,0,0.18)',
                            borderRadius: 999,
                            padding: 6,
                            minWidth: 32,
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: 'none',
                            border: 'none'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Activa una o varias carreras para filtrar el reporte. Si no seleccionas ninguna, se muestran todas.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Exportar en:</span>
              <button
                className="btn btn-success btn-sm"
                style={{ minWidth: 140 }}
                disabled={careerOptions.length === 0}
                aria-label="Exportar reporte de materias por carrera a Excel"
                onClick={() => handleDownload('/reports/subjects-by-career', 'materias_carrera', 'excel', { careerIds: selectedCareerIds })}
              >
                📤 Excel
              </button>
              <button
                className="btn btn-danger btn-sm"
                style={{ minWidth: 140 }}
                disabled={careerOptions.length === 0}
                aria-label="Exportar reporte de materias por carrera a PDF"
                onClick={() => handleDownload('/reports/subjects-by-career', 'materias_carrera', 'pdf', { careerIds: selectedCareerIds })}
              >
                📤 PDF
              </button>
            </div>
          </div>
          {careerReport && careerReport.length === 0 && <p className="text-muted text-center">No hay registros de carreras activos</p>}
          {careerReport?.map((career) => (
            <div key={career.id} style={{ marginBottom: 24, border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 18, background: 'var(--bg-surface)' }}>
              <div style={{ fontWeight: 700, color: 'var(--primary-light)', marginBottom: 12, fontSize: '15px' }}>
                🎓 {career.nombre} ({career.codigo}) — Modalidad: {career.modalidad?.nombre ?? 'Semestral'}
              </div>
              {(() => {
                const subjects = career.pensums?.flatMap((p) => [
                  ...(p.materias || []),
                  ...(p.subjects || []),
                ]) || [];
                const uniqueSubjects = subjects.reduce((acc, item) => {
                  if (!acc.some((subject) => subject.id === item.id)) acc.push(item);
                  return acc;
                }, []);
                return uniqueSubjects.length === 0 ? (
                  <p className="text-xs text-muted" style={{ paddingLeft: 12 }}>Sin materias asociadas a esta carrera.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                    {uniqueSubjects.map((m) => (
                      <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{m.nombre}</div>
                          <div className="text-xs text-muted" style={{ marginTop: 2 }}>{m.codigo}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ))}
        </Section>
      )}

      {isTeacher() && (
        <>
          <Section 
            title="📚 Calificaciones Consolidadas por Curso / Grupo"
            actions={
              gradesByCourse && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: 10 }}>Exportar en:</span>
                  <button className="btn btn-success btn-sm" style={{ minWidth: 140 }} aria-label="Exportar reporte de notas a Excel" onClick={() => handleDownload(`/reports/grades-by-course/${courseIdT}`, `notas_curso_${courseIdT}`, 'excel')}>
                    📤 Excel
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ minWidth: 140 }} aria-label="Exportar reporte de notas a PDF" onClick={() => handleDownload(`/reports/grades-by-course/${courseIdT}`, `notas_curso_${courseIdT}`, 'pdf')}>
                    📤 PDF
                  </button>
                </>
              )
            }
          >
            <div className="search-bar" style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
              <select className="form-control" value={courseIdT} onChange={(e) => setCourseIdT(e.target.value)}>
                <option value="">Selecciona curso...</option>
                {teacherCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo_grupo} — {c.materia?.nombre ?? c.nombre}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={fetchGradesByCourse}>🔍 Buscar</button>
            </div>
            {gradesByCourse && (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Registro / Matrícula</th>
                      <th>Nota</th>
                      <th>Observación / Comentario</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gradesByCourse.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 24 }}>No hay estudiantes inscritos en este curso</td></tr>
                    ) : (
                      gradesByCourse.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.estudiante?.usuario?.nombres} {r.estudiante?.usuario?.apellido_paterno}</strong></td>
                          <td>{r.estudiante?.matricula}</td>
                          <td><GradeCircle nota={r.calificacion?.nota} /></td>
                          <td className="text-sm text-muted">{r.calificacion?.observacion ?? 'Sin observaciones'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section 
            title="👥 Estudiantes Inscritos en un Curso"
            actions={
              enrolledStudents && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: 10 }}>Exportar en:</span>
                  <button className="btn btn-success btn-sm" style={{ minWidth: 140 }} aria-label="Exportar lista de inscritos a Excel" onClick={() => handleDownload(`/reports/enrolled-students/${courseIdT}`, `alumnos_inscritos_${courseIdT}`, 'excel')}>
                    📤 Excel
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ minWidth: 140 }} aria-label="Exportar lista de inscritos a PDF" onClick={() => handleDownload(`/reports/enrolled-students/${courseIdT}`, `alumnos_inscritos_${courseIdT}`, 'pdf')}>
                    📤 PDF
                  </button>
                </>
              )
            }
          >
            <div className="search-bar" style={{ marginBottom: 20, display: 'flex', gap: 8 }}>
              <select className="form-control" value={courseIdT} onChange={(e) => setCourseIdT(e.target.value)}>
                <option value="">Selecciona curso...</option>
                {teacherCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.codigo_grupo} — {c.materia?.nombre ?? c.nombre}</option>
                ))}
              </select>
              <button className="btn btn-primary" onClick={fetchEnrolledStudents}>🔍 Buscar</button>
            </div>
            {enrolledStudents && (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Estudiante</th>
                      <th>Matrícula</th>
                      <th>Email</th>
                      <th>Fecha Inscripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrolledStudents.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 24 }}>No hay estudiantes inscritos en este curso</td></tr>
                    ) : (
                      enrolledStudents.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.estudiante?.usuario?.nombres} {r.estudiante?.usuario?.apellido_paterno}</strong></td>
                          <td>{r.estudiante?.matricula}</td>
                          <td className="text-sm">{r.estudiante?.usuario?.email}</td>
                          <td>{new Date(r.fecha_inscripcion).toLocaleDateString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section 
            title="📚 Mis Materias / Asignaturas"
            actions={
              teacherSubjects && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: 10 }}>Exportar en:</span>
                  <button className="btn btn-success btn-sm" style={{ minWidth: 140 }} aria-label="Exportar mis materias a Excel" onClick={() => handleDownload(`/reports/subjects-by-teacher/${user.id}`, `mis_materias_docente`, 'excel')}>
                    📤 Excel
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ minWidth: 140 }} aria-label="Exportar mis materias a PDF" onClick={() => handleDownload(`/reports/subjects-by-teacher/${user.id}`, `mis_materias_docente`, 'pdf')}>
                    📤 PDF
                  </button>
                </>
              )
            }
          >
            <div style={{ marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={fetchTeacherSubjects}>🔍 Ver Mis Asignaturas</button>
            </div>
            {teacherSubjects && (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Grupo</th>
                      <th>Materia</th>
                      <th>Código</th>
                      <th>Período</th>
                      <th>Cupo</th>
                      <th>Inscritos</th>
                      <th>Disponible</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teacherSubjects.length === 0 ? (
                      <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 24 }}>No tienes asignaturas asignadas</td></tr>
                    ) : (
                      teacherSubjects.map((r) => (
                        <tr key={r.id}>
                          <td>{r.codigo_grupo}</td>
                          <td><strong>{r.materia?.nombre}</strong></td>
                          <td>{r.materia?.codigo ?? '—'}</td>
                          <td>{r.periodo_academico?.codigo ?? '—'}</td>
                          <td>{r.cupo_maximo ?? '—'}</td>
                          <td>{r.inscritos ?? r.inscripciones?.length ?? 0}</td>
                          <td>{r.cupo_disponible ?? Math.max((r.cupo_maximo || 0) - (r.inscritos ?? r.inscripciones?.length ?? 0), 0)}</td>
                          <td><span className={`badge ${r.estado ? 'badge-success' : 'badge-neutral'}`}>{r.estado ? 'Activo' : 'Inactivo'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}

      {/* ── STUDENT: Academic History / Transcripts ── */}
      {isStudent() && (
        <>
          <Section 
            title="📖 Historial Académico Completo (Kardex)"
            actions={
              history && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: 10 }}>Exportar en:</span>
                  <button className="btn btn-success btn-sm" style={{ minWidth: 140 }} aria-label="Exportar kardex académico a Excel" onClick={() => handleDownload(`/reports/academic-history/${user.id}`, 'kardex_academico', 'excel')}>
                    📤 Excel
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ minWidth: 140 }} aria-label="Exportar kardex académico a PDF" onClick={() => handleDownload(`/reports/academic-history/${user.id}`, 'kardex_academico', 'pdf')}>
                    📤 PDF
                  </button>
                </>
              )
            }
          >
            <div style={{ marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={fetchHistory}>🔍 Consultar Kardex Histórico</button>
            </div>
            {history && (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Asignatura / Materia</th>
                      <th>Docente Evaluador</th>
                      <th>Período</th>
                      <th>Inscripción</th>
                      <th>Nota Final</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.history?.length === 0 ? (
                      <tr><td colSpan={5} className="text-center text-muted" style={{ padding: 24 }}>No se cuenta con historial de inscripciones registradas</td></tr>
                    ) : (
                      history.history?.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.curso?.materia?.nombre}</strong></td>
                          <td className="text-sm">{r.curso?.docente?.usuario?.nombres} {r.curso?.docente?.usuario?.apellido_paterno}</td>
                          <td>{r.curso?.periodo_academico?.codigo ?? '—'}</td>
                          <td><span className={`badge ${r.estado === 'Inscrito' ? 'badge-success' : 'badge-neutral'}`}>{r.estado}</span></td>
                          <td><GradeCircle nota={r.calificacion?.nota} /></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section 
            title="🎒 Listado de Asignaturas Cursadas"
            actions={
              mySubjects && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: 10 }}>Exportar en:</span>
                  <button className="btn btn-success btn-sm" style={{ minWidth: 140 }} aria-label="Exportar asignaturas cursadas a Excel" onClick={() => handleDownload(`/reports/subjects-by-student/${user.id}`, 'mis_materias', 'excel')}>
                    📤 Excel
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ minWidth: 140 }} aria-label="Exportar asignaturas cursadas a PDF" onClick={() => handleDownload(`/reports/subjects-by-student/${user.id}`, 'mis_materias', 'pdf')}>
                    📤 PDF
                  </button>
                </>
              )
            }
          >
            <div style={{ marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={fetchMySubjects}>🔍 Consultar Asignaturas</button>
            </div>
            {mySubjects && (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Materia</th>
                      <th>Código</th>
                      <th>Período Vigente</th>
                      <th>Estado de Inscripción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mySubjects.length === 0 ? (
                      <tr><td colSpan={4} className="text-center text-muted" style={{ padding: 24 }}>No hay asignaturas activas registradas</td></tr>
                    ) : (
                      mySubjects.map((r, i) => (
                        <tr key={i}>
                          <td><strong>{r.materia?.nombre}</strong></td>
                          <td><span className="badge badge-info">{r.materia?.codigo}</span></td>
                          <td>{r.periodo?.codigo ?? '—'}</td>
                          <td><span className={`badge ${r.enrollment?.estado === 'Inscrito' ? 'badge-success' : 'badge-neutral'}`}>{r.enrollment?.estado}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section 
            title="📊 Notas de Todas las Materias Cursadas"
            actions={
              allGrades && (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', marginRight: 10 }}>Exportar en:</span>
                  <button className="btn btn-success btn-sm" style={{ minWidth: 140 }} aria-label="Exportar todas mis notas a Excel" onClick={() => handleDownload(`/reports/grades-all-subjects/${user.id}`, 'todas_mis_notas', 'excel')}>
                    📤 Excel
                  </button>
                  <button className="btn btn-danger btn-sm" style={{ minWidth: 140 }} aria-label="Exportar todas mis notas a PDF" onClick={() => handleDownload(`/reports/grades-all-subjects/${user.id}`, 'todas_mis_notas', 'pdf')}>
                    📤 PDF
                  </button>
                </>
              )
            }
          >
            <div style={{ marginBottom: 20 }}>
              <button className="btn btn-primary" onClick={fetchAllGrades}>🔍 Cargar Notas</button>
            </div>
            {allGrades && (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Materia</th>
                      <th>Código</th>
                      <th>Docente</th>
                      <th>Período</th>
                      <th>Nota</th>
                      <th>Observación</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allGrades.length === 0 ? (
                      <tr><td colSpan={7} className="text-center text-muted" style={{ padding: 24 }}>No hay calificaciones registradas</td></tr>
                    ) : (
                      allGrades.map((r) => (
                        <tr key={r.id}>
                          <td><strong>{r.curso?.materia?.nombre}</strong></td>
                          <td>{r.curso?.materia?.codigo}</td>
                          <td className="text-sm">{r.curso?.docente?.usuario?.nombres} {r.curso?.docente?.usuario?.apellido_paterno}</td>
                          <td>{r.curso?.periodo_academico?.codigo ?? '—'}</td>
                          <td><GradeCircle nota={r.calificacion?.nota} /></td>
                          <td className="text-sm text-muted">{r.calificacion?.observacion ?? 'Sin observaciones'}</td>
                          <td>
                            {r.calificacion ? (
                              <span className={`badge ${parseFloat(r.calificacion.nota) >= 51 ? 'badge-success' : 'badge-danger'}`}>
                                {parseFloat(r.calificacion.nota) >= 51 ? 'Aprobado' : 'Reprobado'}
                              </span>
                            ) : (
                              <span className="badge badge-neutral">Pendiente</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </>
      )}
    </div>
  );
}
