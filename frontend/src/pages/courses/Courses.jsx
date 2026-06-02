import { useEffect, useState } from 'react';
import { authApi, coursesApi, enrollmentsApi, subjectsApi, periodsApi, usersApi, careersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';

export default function Courses() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const { show } = useToast();
  
  const [courses, setCourses]       = useState([]);
  const [profile, setProfile]       = useState(null);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  
  const TURNOS = {
    manana: { label: 'Mañana', hora_inicio: '08:00', hora_fin: '12:00' },
    tarde: { label: 'Tarde', hora_inicio: '13:00', hora_fin: '17:00' },
    noche: { label: 'Noche', hora_inicio: '18:00', hora_fin: '22:00' },
  };

  const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  // Modals states
  const [enrollModal, setEnrollModal] = useState(null); // Course to enroll
  const [courseModal, setCourseModal] = useState(null); // { id?, form } to Create/Edit Course
  
  // Lists for Admin selections
  const [subjects, setSubjects]     = useState([]);
  const [periods, setPeriods]       = useState([]);
  const [teachers, setTeachers]     = useState([]);
  const [careers, setCareers]       = useState([]);
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [enrolling, setEnrolling]   = useState(false);
  const [saving, setSaving]         = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let res;
      if (isTeacher()) {
        res = await coursesApi.getByTeacher(user.id);
        setCourses(res.data);
      } else if (isStudent()) {
        const [profileRes, coursesRes] = await Promise.all([
          authApi.profile(),
          coursesApi.getAll(),
        ]);
        const studentCareerId = profileRes.data.estudiante?.id_carrera;
        setProfile(profileRes.data);

        const availableCourses = (coursesRes.data || []).filter((c) => {
          const isPeriodActive = c.periodo_academico?.estado === true;
          const isCourseActive = c.estado === true;
          const isCareerSubject = c.materia?.pensums?.some((pensum) => pensum.carrera?.id === studentCareerId);
          return isPeriodActive && isCourseActive && isCareerSubject;
        });

        setCourses(availableCourses);
      } else {
        res = await coursesApi.getAll();
        setCourses(res.data);
      }
    } catch (err) {
      show(err.response?.data?.message || 'Error al cargar la programación de cursos', 'error');
      setCourses([]);
    } finally { 
      setLoading(false); 
    }
  };

  const loadAdminHelpers = async () => {
    if (!isAdmin()) return;
    try {
      const [subRes, perRes, usrRes, careersRes] = await Promise.all([
        subjectsApi.getAll(),
        periodsApi.getAll(),
        usersApi.getAll(),
        careersApi.getAll(),
      ]);
      setSubjects(subRes.data);
      setPeriods(perRes.data);
      setCareers(careersRes.data);
      setSelectedCareerId(careersRes.data?.[0]?.id ?? '');
      // Filter users who are Teachers (id_rol === 2)
      setTeachers(usrRes.data.filter(u => u.id_rol === 2 && u.estado));
    } catch {
      show('Error al cargar listas auxiliares de administración', 'error');
    }
  };

  useEffect(() => {
    load();
    loadAdminHelpers();
  }, []);

  const filtered = courses.filter((c) => {
    const matchesSearch = [c.codigo_grupo, c.materia?.nombre, c.materia?.codigo]
      .join(' ').toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;
    if (!isAdmin() || !selectedCareerId) return true;

    return c.materia?.pensums?.some((pensum) => pensum.carrera?.id === Number(selectedCareerId));
  });

  const handleEnroll = async (courseId) => {
    setEnrolling(true);
    try {
      await enrollmentsApi.create({ id_estudiante: user.id, id_curso: courseId });
      show('¡Inscripción exitosa al curso! 🎉', 'success');
      setEnrollModal(null);
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al inscribirse. Verifica solapamiento de horarios.', 'error');
    } finally { 
      setEnrolling(false); 
    }
  };

  const openCreateModal = () => {
    if (subjects.length === 0 || periods.length === 0 || teachers.length === 0) {
      show('Asegúrate de tener materias, períodos y docentes activos creados primero.', 'warning');
    }
    setCourseModal({
      id: null,
      form: {
        codigo_grupo: '',
        id_materia: subjects[0]?.id ?? '',
        id_periodo_academico: periods.find(p => p.estado)?.id ?? periods[0]?.id ?? '',
        id_docente: teachers[0]?.id ?? '',
        cupo_maximo: 20,
        estado: true,
        dia_semana: 'Lunes',
        turno: 'manana',
        aula: '',
      }
    });
  };

  const openEditModal = (c) => {
    const firstHorario = c.horarios?.[0];
    const horarioTurno = firstHorario
      ? Object.entries(TURNOS).find(([, value]) => value.hora_inicio === firstHorario.hora_inicio && value.hora_fin === firstHorario.hora_fin)?.[0]
      : 'manana';

    setCourseModal({
      id: c.id,
      form: {
        codigo_grupo: c.codigo_grupo,
        id_materia: c.id_materia,
        id_periodo_academico: c.id_periodo_academico,
        id_docente: c.id_docente,
        cupo_maximo: c.cupo_maximo,
        estado: c.estado,
        dia_semana: firstHorario?.dia_semana ?? 'Lunes',
        turno: horarioTurno || 'manana',
        aula: firstHorario?.aula ?? '',
      }
    });
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!courseModal.form.codigo_grupo.trim()) {
      show('El código de grupo es obligatorio', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { dia_semana, turno, aula } = courseModal.form;
      if (!aula.trim()) {
        show('La aula es obligatoria para definir el horario del curso.', 'warning');
        return;
      }

      const payload = {
        ...courseModal.form,
        cupo_maximo: parseInt(courseModal.form.cupo_maximo, 10),
        horarios: [{
          dia_semana,
          hora_inicio: TURNOS[turno].hora_inicio,
          hora_fin: TURNOS[turno].hora_fin,
          aula: aula.trim(),
        }],
      };

      if (courseModal.id) {
        await coursesApi.update(courseModal.id, payload);
        show('Curso actualizado con éxito ✅', 'success');
      } else {
        // Asignar el administrador creador
        payload.id_administrador = user.id;
        await coursesApi.create(payload);
        show('Nuevo curso creado y programado ✅', 'success');
      }
      setCourseModal(null);
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al programar el curso.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este curso? Se cancelarán inscripciones asociadas.')) return;
    try {
      await coursesApi.delete(id);
      show('Curso eliminado de la base académica', 'warning');
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al eliminar el curso', 'error');
    }
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="page-header flex-between" style={{ flexWrap: 'wrap', gap: 16, marginBottom: 28 }}>
        <div>
          <h1>
            {isAdmin() ? 'Programación de Cursos' : isTeacher() ? 'Mis Cursos Asignados' : 'Cursos Disponibles'}
          </h1>
          <p>
            {filtered.length} curso(s) en total {search && 'coincidentes con la búsqueda'}
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
            {isAdmin() && (
              <button className="btn btn-primary" onClick={openCreateModal}>
                ➕ Programar Curso
              </button>
            )}
            {isAdmin() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 220 }}>
                <label htmlFor="career-filter" style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  Filtrar por Carrera:
                </label>
                <select
                  id="career-filter"
                  className="form-control"
                  value={selectedCareerId}
                  onChange={(e) => setSelectedCareerId(e.target.value)}
                >
                  <option value="">Todas las carreras</option>
                  {careers.map((career) => (
                    <option key={career.id} value={career.id}>{career.nombre}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="input-group search-input" style={{ flex: '1 1 320px', minWidth: 260, maxWidth: 520 }}>
            <span className="input-icon">🔍</span>
            <input
              className="form-control"
              placeholder="Buscar por grupo, materia, código..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex-center" style={{ padding: 80 }}>
          <div className="spinner" style={{ width: 44, height: 44 }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <h3>Sin cursos</h3>
          <p>No se encontraron programaciones de cursos vigentes.</p>
        </div>
      ) : (
        <div className="grid-auto">
          {filtered.map((c) => (
            <div key={c.id} className="course-card">
              <div className="course-card-banner" />
              <div className="course-card-body">
                <div className="course-card-code">{c.materia?.codigo ?? 'COD-X'}</div>
                <div className="course-card-title">{c.materia?.nombre ?? 'Curso sin nombre'}</div>
                
                <div className="course-card-meta">
                  <div className="course-card-meta-item">
                    👨‍🏫 <strong>Docente:</strong> {c.docente?.usuario?.nombres ?? 'No asignado'} {c.docente?.usuario?.apellido_paterno ?? ''}
                  </div>
                  <div className="course-card-meta-item">
                    📅 <strong>Período:</strong> {c.periodo_academico?.codigo ?? 'Vigente'}
                  </div>
                  <div className="course-card-meta-item">
                    🏷️ <strong>Grupo:</strong> {c.codigo_grupo}
                  </div>
                  <div className="course-card-meta-item">
                    👥 <strong>Cupo Máximo:</strong> {c.cupo_maximo} alumnos
                  </div>
                  {c.horarios && c.horarios.length > 0 ? (
                    c.horarios.map((h) => (
                      <div key={h.id} className="course-card-meta-item" style={{ color: 'var(--primary-light)', fontWeight: 500 }}>
                        🕐 {h.dia_semana} {h.hora_inicio}–{h.hora_fin} • Aula {h.aula}
                      </div>
                    ))
                  ) : (
                    <div className="course-card-meta-item text-muted">🕐 Horario por definir</div>
                  )}
                </div>
              </div>

              <div className="course-card-footer">
                <span className={`badge ${c.estado ? 'badge-success' : 'badge-neutral'}`}>
                  {c.estado ? 'Activo' : 'Inactivo'}
                </span>
                
                {isStudent() && c.estado && (
                  <button className="btn btn-primary btn-sm" onClick={() => setEnrollModal(c)}>
                    + Inscribirme
                  </button>
                )}

                {isAdmin() && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openEditModal(c)} title="Editar Curso">
                      ✏️
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCourse(c.id)} title="Eliminar Curso">
                      🗑️
                    </button>
                  </div>
                )}

                {isTeacher() && null}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Enrollment Modal */}
      {enrollModal && (
        <Modal
          title="Confirmar Inscripción Académica"
          onClose={() => setEnrollModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setEnrollModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={() => handleEnroll(enrollModal.id)} disabled={enrolling}>
                {enrolling ? 'Inscribiendo...' : '✅ Confirmar Inscripción'}
              </button>
            </>
          }
        >
          <p style={{ marginBottom: 16 }}>¿Deseas inscribirte formalmente en la siguiente materia para el presente período?</p>
          <div className="card" style={{ background: 'var(--bg-surface)', padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: 'var(--text-primary)' }}>
              {enrollModal.materia?.nombre}
            </div>
            <div className="text-sm text-muted" style={{ marginBottom: 4 }}>Grupo: <strong>{enrollModal.codigo_grupo}</strong></div>
            <div className="text-sm text-muted" style={{ marginBottom: 4 }}>Periodo: {enrollModal.periodo_academico?.codigo}</div>
            <div className="text-sm text-muted">Docente: {enrollModal.docente?.usuario?.nombres} {enrollModal.docente?.usuario?.apellido_paterno}</div>
          </div>
        </Modal>
      )}

      {/* Admin Create/Edit Modal */}
      {courseModal && (
        <Modal
          title={courseModal.id ? '✏️ Editar Curso' : '➕ Programar Nuevo Curso'}
          onClose={() => setCourseModal(null)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setCourseModal(null)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handleSaveCourse} disabled={saving}>
                {saving ? 'Guardando...' : '💾 Guardar Programación'}
              </button>
            </>
          }
        >
          <form onSubmit={handleSaveCourse}>
            <div className="form-group">
              <label className="form-label">Código de Grupo <span>*</span></label>
              <input
                className="form-control"
                placeholder="Ej: GRUPO-A, INF-01, MAT-10"
                value={courseModal.form.codigo_grupo}
                onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, codigo_grupo: e.target.value } }))}
                required
              />
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Asignatura / Materia</label>
                <select
                  className="form-control"
                  value={courseModal.form.id_materia}
                  onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, id_materia: parseInt(e.target.value) } }))}
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Período Académico</label>
                <select
                  className="form-control"
                  value={courseModal.form.id_periodo_academico}
                  onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, id_periodo_academico: parseInt(e.target.value) } }))}
                >
                  {periods.map(p => <option key={p.id} value={p.id}>{p.codigo} {p.estado && '(Activo)'}</option>)}
                </select>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Docente Asignado</label>
                <select
                  className="form-control"
                  value={courseModal.form.id_docente}
                  onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, id_docente: parseInt(e.target.value) } }))}
                >
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.nombres} {t.apellido_paterno} (@{t.nombre_usuario})</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Cupo Máximo Alumnos</label>
                <input
                  className="form-control"
                  type="number"
                  min="5"
                  max="100"
                  value={courseModal.form.cupo_maximo}
                  onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, cupo_maximo: e.target.value } }))}
                  required
                />
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Día de la semana</label>
                <select
                  className="form-control"
                  value={courseModal.form.dia_semana}
                  onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, dia_semana: e.target.value } }))}
                >
                  {DIAS_SEMANA.map(dia => <option key={dia} value={dia}>{dia}</option>)}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Turno</label>
                <select
                  className="form-control"
                  value={courseModal.form.turno}
                  onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, turno: e.target.value } }))}
                >
                  {Object.entries(TURNOS).map(([key, turno]) => (
                    <option key={key} value={key}>{turno.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Aula</label>
              <input
                className="form-control"
                placeholder="Ej: A101, LAB-3, B-202"
                value={courseModal.form.aula}
                onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, aula: e.target.value } }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Estado del Curso</label>
              <select
                className="form-control"
                value={courseModal.form.estado}
                onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, estado: e.target.value === 'true' } }))}
              >
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </select>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
