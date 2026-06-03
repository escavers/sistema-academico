import { useEffect, useState, useCallback } from 'react';
import { authApi, coursesApi, enrollmentsApi, subjectsApi, periodsApi, usersApi, careersApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';

export default function Courses() {
  const { user, isAdmin, isTeacher, isStudent } = useAuth();
  const { show } = useToast();
  
  const [courses, setCourses]             = useState([]);
  const [profile, setProfile]             = useState(null);
  const [enrolledCourseIds, setEnrolledCourseIds] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [search, setSearch]               = useState('');
  const [turnoFilter, setTurnoFilter]     = useState('');
  const [currentPage, setCurrentPage]     = useState(1);
  const STUDENT_PAGE_SIZE = 7;
  
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
  const [careers, setCareers]       = useState([]);
  const [selectedCareerId, setSelectedCareerId] = useState('');
  const [enrolling, setEnrolling]   = useState(false);
  const [saving, setSaving]         = useState(false);

  // Available teachers for the selected subject/day/shift
  const [availableTeachers, setAvailableTeachers] = useState([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      let res;
      if (isTeacher()) {
        res = await coursesApi.getByTeacher(user.id);
        setCourses(res.data);
      } else if (isStudent()) {
        const [profileRes, coursesRes, enrollmentsRes] = await Promise.all([
          authApi.profile(),
          coursesApi.getAll(),
          enrollmentsApi.getByStudent(user.id),
        ]);
        const studentCareerId = profileRes.data.estudiante?.id_carrera;
        setProfile(profileRes.data);
        setEnrolledCourseIds((enrollmentsRes.data || []).map((e) => e.curso?.id).filter(Boolean));

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
      const [subRes, perRes, careersRes] = await Promise.all([
        subjectsApi.getAll(),
        periodsApi.getAll(),
        careersApi.getAll(),
      ]);
      setSubjects(subRes.data);
      // Filter periods: only active ones whose date range covers the current date
      const today = new Date().toISOString().slice(0, 10);
      const activePeriods = (perRes.data || []).filter(p => 
        p.estado && p.fecha_inicio <= today && p.fecha_fin >= today
      );
      // If no periods match current date, fallback to all active periods
      setPeriods(activePeriods.length > 0 ? activePeriods : (perRes.data || []).filter(p => p.estado));
      setCareers(careersRes.data);
      setSelectedCareerId(careersRes.data?.[0]?.id ?? '');
    } catch {
      show('Error al cargar listas auxiliares de administración', 'error');
    }
  };

  useEffect(() => {
    load();
    loadAdminHelpers();
  }, []);

  const normalizeText = (value) =>
    String(value || '')
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase();

  const getScheduleTurno = (horario) => {
    const start = horario?.hora_inicio?.slice(0, 2);
    if (!start) return null;
    const hour = Number(start);
    if (hour >= 8 && hour < 12) return 'manana';
    if (hour >= 12 && hour < 18) return 'tarde';
    if (hour >= 18 && hour < 24) return 'noche';
    return null;
  };

  // Load available teachers when subject, day, or shift changes in the course modal
  const loadAvailableTeachers = useCallback(async (id_materia, dia_semana, turno) => {
    if (!id_materia) {
      setAvailableTeachers([]);
      return;
    }
    setLoadingTeachers(true);
    try {
      const turnoData = TURNOS[turno] || TURNOS.manana;
      const res = await coursesApi.getAvailableTeachers({
        id_materia,
        dia_semana: dia_semana || 'Lunes',
        hora_inicio: turnoData.hora_inicio,
        hora_fin: turnoData.hora_fin,
      });
      setAvailableTeachers(res.data || []);
    } catch {
      setAvailableTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  }, []);

  // When course modal form changes, refresh available teachers
  useEffect(() => {
    if (!courseModal) return;
    const { id_materia, dia_semana, turno } = courseModal.form;
    loadAvailableTeachers(id_materia, dia_semana, turno);
  }, [courseModal?.form?.id_materia, courseModal?.form?.dia_semana, courseModal?.form?.turno]);

  const filtered = courses.filter((c) => {
    const searchable = [c.codigo_grupo, c.materia?.nombre, c.materia?.codigo]
      .join(' ');
    const matchesSearch = normalizeText(searchable).includes(normalizeText(search));

    if (!matchesSearch) return false;
    if (turnoFilter) {
      if (!c.horarios?.some((h) => getScheduleTurno(h) === turnoFilter)) {
        return false;
      }
    }
    if (!isAdmin() || !selectedCareerId) return true;

    return c.materia?.pensums?.some((pensum) => pensum.carrera?.id === Number(selectedCareerId));
  });

  const pageCount = (isStudent() || isAdmin()) ? Math.max(1, Math.ceil(filtered.length / STUDENT_PAGE_SIZE)) : 1;
  const paginatedCourses = (isStudent() || isAdmin())
    ? filtered.slice((currentPage - 1) * STUDENT_PAGE_SIZE, currentPage * STUDENT_PAGE_SIZE)
    : filtered;

  useEffect(() => {
    if (!(isStudent() || isAdmin())) return;
    setCurrentPage(1);
  }, [search, turnoFilter, filtered.length, isStudent(), isAdmin()]);

  useEffect(() => {
    if (!(isStudent() || isAdmin())) return;
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount, isStudent(), isAdmin()]);

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
    if (subjects.length === 0 || periods.length === 0) {
      show('Asegúrate de tener materias y períodos activos creados primero.', 'warning');
    }
    setCourseModal({
      id: null,
      form: {
        codigo_grupo: '',
        id_materia: subjects[0]?.id ?? '',
        id_periodo_academico: periods.find(p => p.estado)?.id ?? periods[0]?.id ?? '',
        id_docente: '',
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
    if (!courseModal.form.id_docente) {
      show('Selecciona un docente asignado para el curso.', 'warning');
      return;
    }
    setSaving(true);
    try {
      const { dia_semana, turno, aula } = courseModal.form;
      if (!aula.trim()) {
        show('La aula es obligatoria para definir el horario del curso.', 'warning');
        setSaving(false);
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

      // Remove non-DB fields
      delete payload.dia_semana;
      delete payload.turno;
      delete payload.aula;

      if (courseModal.id) {
        await coursesApi.update(courseModal.id, payload);
        show('Curso actualizado con éxito ✅', 'success');
      } else {
        // Asignar el administrador creador
        payload.id_administrador = user.id;
        // codigo_grupo is auto-generated on backend
        delete payload.codigo_grupo;
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

  /**
   * Format teacher display: Name (@username) — Specialty
   */
  const formatTeacherOption = (teacher) => {
    const name = `${teacher.usuario?.nombres || ''} ${teacher.usuario?.apellido_paterno || ''}`.trim();
    const username = teacher.usuario?.nombre_usuario || '';
    const specialties = (teacher.especialidades || []).map(e => e.especialidad).join(', ');
    return `${name} (@${username})${specialties ? ` — ${specialties}` : ''}`;
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
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 12, alignItems: 'center', minWidth: 320, flex: '1 1 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 180, flexShrink: 0 }}>
              <label htmlFor="turno-filter" style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                Turno:
              </label>
              <select
                id="turno-filter"
                className="form-control"
                value={turnoFilter}
                onChange={(e) => setTurnoFilter(e.target.value)}
                style={{ minWidth: 140 }}
              >
                <option value="">Todos los turnos</option>
                {Object.entries(TURNOS).map(([key, turno]) => (
                  <option key={key} value={key}>{turno.label}</option>
                ))}
              </select>
            </div>
            <div className="input-group search-input" style={{ flex: '1 1 1', minWidth: 0, maxWidth: 520 }}>
              <span className="input-icon">🔍</span>
              <input
                className="form-control"
                placeholder="Buscar por grupo, materia, código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ minWidth: 0 }}
              />
            </div>
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
        <>
          <div className="grid-auto">
            {paginatedCourses.map((c) => (
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
                  enrolledCourseIds.includes(c.id) ? (
                    <span className="badge badge-primary">Inscrito</span>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => setEnrollModal(c)}>
                      + Inscribirme
                    </button>
                  )
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

        {isStudent() && pageCount > 1 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center', marginTop: 20 }}>
            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            >
              ‹ Anterior
            </button>

            {Array.from({ length: pageCount }, (_, index) => (
              <button
                key={index + 1}
                className={`btn btn-sm ${currentPage === index + 1 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCurrentPage(index + 1)}
              >
                {index + 1}
              </button>
            ))}

            <button
              className="btn btn-secondary btn-sm"
              disabled={currentPage === pageCount}
              onClick={() => setCurrentPage((prev) => Math.min(pageCount, prev + 1))}
            >
              Siguiente ›
            </button>
          </div>
        )}
      </>
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
            {/* Auto-generated code or show existing */}
            <div className="form-group">
              <label className="form-label">Código de Grupo</label>
              {courseModal.id ? (
                <input className="form-control" value={courseModal.form.codigo_grupo} disabled style={{ opacity: 0.7 }} />
              ) : (
                <input className="form-control" value="Se generará automáticamente" disabled style={{ opacity: 0.6, fontStyle: 'italic' }} />
              )}
              <span className="form-hint">El código se genera automáticamente a partir de la materia.</span>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Asignatura / Materia</label>
                <select
                  className="form-control"
                  value={courseModal.form.id_materia}
                  onChange={(e) => {
                    const newMateria = parseInt(e.target.value);
                    setCourseModal(p => ({ ...p, form: { ...p.form, id_materia: newMateria, id_docente: '' } }));
                  }}
                >
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.nombre} ({s.codigo}){s.carrera ? ` — ${s.carrera.nombre}` : ''}</option>)}
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
                  onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, turno: e.target.value, id_docente: '' } }))}
                >
                  {Object.entries(TURNOS).map(([key, turno]) => (
                    <option key={key} value={key}>{turno.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Docente Asignado {loadingTeachers && <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginLeft: 8, display: 'inline-block' }} />}</label>
              <select
                className="form-control"
                value={courseModal.form.id_docente}
                onChange={(e) => setCourseModal(p => ({ ...p, form: { ...p.form, id_docente: parseInt(e.target.value) } }))}
                disabled={loadingTeachers}
              >
                <option value="">Selecciona un docente...</option>
                {availableTeachers.map(t => (
                  <option key={t.id} value={t.id}>{formatTeacherOption(t)}</option>
                ))}
              </select>
              {availableTeachers.length === 0 && !loadingTeachers && courseModal.form.id_materia && (
                <span className="form-hint" style={{ color: 'var(--warning)' }}>
                  No hay docentes disponibles para esta materia en el turno y día seleccionados.
                </span>
              )}
              <span className="form-hint">Solo se muestran docentes vinculados a la carrera de la materia y sin conflicto de horario.</span>
            </div>

            <div className="form-grid">
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
