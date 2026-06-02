import { useEffect, useState } from 'react';
import { careersApi, periodsApi, subjectsApi, pensumsApi, modalitiesApi } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';

/* ── Generic CRUD table ── */
function CRUDTable({ title, columns, rows, onAdd, onEdit, onDelete, loading, renderBadge }) {
  return (
    <div className="card">
      <div className="card-header">
        <div className="card-title">{title}</div>
        <button className="btn btn-primary btn-sm" onClick={onAdd}>+ Agregar</button>
      </div>
      {loading
        ? <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
        : <div className="table-wrapper">
            <table className="table">
              <thead><tr>{columns.map(c => <th key={c}>{c}</th>)}<th>Acciones</th></tr></thead>
              <tbody>
                {rows.length === 0
                  ? <tr><td colSpan={columns.length + 1}><div className="empty-state" style={{ padding: 24 }}><p>Sin registros</p></div></td></tr>
                  : rows.map((r) => (
                    <tr key={r.id}>
                      {columns.map((c, i) => <td key={i}>{renderBadge ? renderBadge(r, c) : null}</td>)}
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(r)}>✏️</button>
                          <button className="btn btn-danger btn-sm" onClick={() => onDelete(r.id)}>🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>}
    </div>
  );
}

/* ── Careers ── */
export function Careers() {
  const { show } = useToast();
  const [rows, setRows]   = useState([]);
  const [modalities, setModalities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({ codigo: '', nombre: '', descripcion: '', id_modalidad: '' });

  const load = async () => {
    const [careersRes, modalitiesRes] = await Promise.all([
      careersApi.getAll(),
      modalitiesApi.getAll(),
    ]);
    setRows(careersRes.data);
    setModalities(modalitiesRes.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.id_modalidad) {
      show('Selecciona una modalidad válida antes de guardar.', 'warning');
      return;
    }
    try {
      if (modal.id) await careersApi.update(modal.id, form);
      else await careersApi.create(form);
      show('Guardado ✅', 'success'); setModal(null); load();
    } catch (err) { show(err.response?.data?.message || 'Error', 'error'); }
  };

  const toggleStatus = async (career) => {
    const action = career.estado ? 'inhabilitar' : 'habilitar';
    if (!confirm(`¿${action.charAt(0).toUpperCase() + action.slice(1)} esta carrera?`)) return;
    try {
      await careersApi.update(career.id, { ...career, estado: !career.estado });
      show(`Carrera ${action}ada ✅`, 'success');
      load();
    } catch (err) {
      show(err.response?.data?.message || `Error al ${action} la carrera`, 'error');
    }
  };

  const del = async (id) => {
    if (!confirm('¿Eliminar permanentemente?')) return;
    try {
      await careersApi.delete(id);
      show('Carrera eliminada', 'warning');
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al eliminar', 'error');
    }
  };

  return (
    <>
      <div className="page-header"><h1>Carreras</h1><p>Gestiona las carreras académicas</p></div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Lista de Carreras</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm({ codigo: '', nombre: '', descripcion: '', id_modalidad: modalities[0]?.id || '' }); setModal({}); }}>+ Nueva Carrera</button>
        </div>
        {loading ? <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
          : <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Código</th><th>Nombre</th><th>Modalidad</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><span className="badge badge-primary">{r.codigo}</span></td>
                      <td><strong>{r.nombre}</strong></td>
                      <td>{r.modalidad?.nombre}</td>
                      <td><span className={`badge ${r.estado ? 'badge-success' : 'badge-neutral'}`}>{r.estado ? 'Activa' : 'Inactiva'}</span></td>
                      <td><div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion ?? '', id_modalidad: r.id_modalidad }); setModal({ id: r.id }); }}>✏️ Editar</button>
                        <button className={`btn btn-sm ${r.estado ? 'btn-warning' : 'btn-success'}`} onClick={() => toggleStatus(r)}>{r.estado ? '🚫 Inhabilitar' : '✅ Habilitar'}</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>🗑️ Eliminar</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </div>

      {modal !== null && (
        <Modal title={modal.id ? 'Editar Carrera' : 'Nueva Carrera'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={save}>💾 Guardar</button></>}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Código <span>*</span></label><input className="form-control" value={form.codigo} onChange={(e) => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Modalidad</label>
              <select className="form-control" value={form.id_modalidad} onChange={(e) => setForm(p => ({ ...p, id_modalidad: parseInt(e.target.value) }))} disabled={modalities.length === 0}>
                <option value="">{modalities.length ? 'Selecciona modalidad' : 'Cargando modalidades...'}</option>
                {modalities.map((m) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group"><label className="form-label">Nombre <span>*</span></label><input className="form-control" value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-control" rows={3} value={form.descripcion} onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))} /></div>
        </Modal>
      )}
    </>
  );
}

/* ── Subjects ── */
export function Subjects() {
  const { show } = useToast();
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm]   = useState({ codigo: '', nombre: '', descripcion: '' });
  const [search, setSearch] = useState('');
  const [careerFilter, setCareerFilter] = useState('');
  const [careers, setCareers] = useState([]);

  const load = async () => {
    const [subjectsRes, careersRes] = await Promise.all([
      subjectsApi.getAll(),
      careersApi.getAll(),
    ]);
    setRows(subjectsRes.data);
    setCareers(careersRes.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      const payload = { ...form };
      if (modal.id) await subjectsApi.update(modal.id, payload);
      else await subjectsApi.create(payload);
      show('Guardado ✅', 'success'); setModal(null); load();
    } catch (err) { show(err.response?.data?.message || 'Error', 'error'); }
  };
  const del = async (id) => { if (!confirm('¿Eliminar?')) return; await subjectsApi.delete(id); show('Eliminado', 'warning'); load(); };

  const filteredRows = rows.filter((subject) => {
    const query = search.trim().toLowerCase();
    const matchesSearch = !query || [subject.codigo, subject.nombre, subject.descripcion]
      .filter(Boolean)
      .some((value) => value.toLowerCase().includes(query));
    const matchesCareer = !careerFilter || subject.pensums?.some((p) => p.carrera?.id === Number(careerFilter));
    return matchesSearch && matchesCareer;
  });

  return (
    <>
      <div className="page-header"><h1>Materias</h1><p>Catálogo de materias del sistema</p></div>
      <div className="card">
        <div className="card-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, width: '100%' }}>
            <div className="card-title">Lista de Materias</div>
            <button className="btn btn-primary btn-sm" onClick={() => { setForm({ codigo: '', nombre: '', descripcion: '' }); setModal({}); }}>+ Nueva Materia</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
            <div className="input-group search-input" style={{ flex: '1 1 320px', minWidth: 240 }}>
              <span className="input-icon">🔍</span>
              <input
                className="form-control"
                placeholder="Buscar materias..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="form-control"
              value={careerFilter}
              onChange={(e) => setCareerFilter(e.target.value)}
              style={{ flex: '0 0 260px', minWidth: 220 }}
            >
              <option value="">Todas las carreras</option>
              {careers.map((career) => (
                <option key={career.id} value={career.id}>{career.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        {loading ? <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
          : <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Código</th><th>Nombre</th><th>Carrera</th><th>Acciones</th></tr></thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr><td colSpan={4}><div className="empty-state" style={{ padding: 24 }}><p>No se encontraron materias con esos filtros.</p></div></td></tr>
                  ) : filteredRows.map((r) => (
                    <tr key={r.id}>
                      <td><span className="badge badge-info">{r.codigo}</span></td>
                      <td><strong>{r.nombre}</strong></td>
                      <td className="text-sm text-muted">
                        {r.pensums?.map(p => p.carrera?.nombre).filter(Boolean).join(', ') || '—'}
                      </td>
                      <td><div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => {
                          setForm({
                            codigo: r.codigo,
                            nombre: r.nombre,
                            descripcion: r.descripcion ?? '',
                          });
                          setModal({ id: r.id });
                        }}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => del(r.id)}>🗑️</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </div>

      {modal !== null && (
        <Modal title={modal.id ? 'Editar Materia' : 'Nueva Materia'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={save}>💾 Guardar</button></>}>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Código <span>*</span></label><input className="form-control" value={form.codigo} onChange={(e) => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Nombre <span>*</span></label><input className="form-control" value={form.nombre} onChange={(e) => setForm(p => ({ ...p, nombre: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Descripción</label><textarea className="form-control" rows={3} value={form.descripcion} onChange={(e) => setForm(p => ({ ...p, descripcion: e.target.value }))} /></div>
        </Modal>
      )}
    </>
  );
}

/* ── Pensums ── */
export function Pensums() {
  const { show } = useToast();
  const [careers, setCareers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedCareerId, setSelectedCareerId] = useState(null);
  const [selectedPensumId, setSelectedPensumId] = useState(null);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState([]);
  const [subjectAssignments, setSubjectAssignments] = useState({});
  const [subjectSearch, setSubjectSearch] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [pensumForm, setPensumForm] = useState({ nombre: '', anio_creacion: '', estado: true });
  const [isPensumModalOpen, setPensumModalOpen] = useState(false);
  const [pensumModalMode, setPensumModalMode] = useState('create');
  const [editingPensumId, setEditingPensumId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const [careersRes, subjectsRes] = await Promise.all([
      careersApi.getAll(),
      subjectsApi.getAll(),
    ]);
    setCareers(careersRes.data);
    setSubjects(subjectsRes.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const selectedCareer = careers.find((career) => career.id === selectedCareerId) || careers[0] || null;
  const careerPensums = selectedCareer?.pensums || [];
  const activePensumsCount = careerPensums.filter((pensum) => pensum.estado).length;
  const inactivePensumsCount = careerPensums.length - activePensumsCount;

  useEffect(() => {
    if (!selectedCareer && careers.length) {
      setSelectedCareerId(careers[0].id);
    }
  }, [careers, selectedCareer]);

  useEffect(() => {
    if (!selectedCareer) {
      setSelectedPensumId(null);
      return;
    }
    if (careerPensums.length === 0) {
      setSelectedPensumId(null);
      return;
    }
    if (!careerPensums.some((pensum) => pensum.id === selectedPensumId)) {
      setSelectedPensumId(careerPensums[0].id);
    }
  }, [careerPensums, selectedCareer, selectedPensumId]);

  useEffect(() => {
    if (!selectedPensumId) {
      setPensumForm({ nombre: '', anio_creacion: '', estado: true });
      setSelectedSubjectIds([]);
      setSubjectAssignments({});
      return;
    }

    const pensum = careerPensums.find((pensumItem) => pensumItem.id === selectedPensumId);
    if (pensum) {
      setPensumForm({
        nombre: pensum.nombre || '',
        anio_creacion: pensum.anio_creacion ? pensum.anio_creacion.slice(0, 10) : '',
        estado: pensum.estado ?? true,
      });
    }

    const assigned = [];
    const assignments = {};

    subjects.forEach((subject) => {
      const relation = subject.pensums?.find((pensum) => pensum.id === selectedPensumId);
      if (relation) {
        assigned.push(subject.id);
        assignments[subject.id] = relation.SubjectCurriculum?.semestre || 1;
      }
    });

    setSelectedSubjectIds(assigned);
    setSubjectAssignments(assignments);
  }, [selectedPensumId, subjects, careerPensums]);

  const toggleSubject = (subjectId) => {
    setSelectedSubjectIds((current) => {
      if (current.includes(subjectId)) {
        const next = current.filter((id) => id !== subjectId);
        setSubjectAssignments((prev) => {
          const { [subjectId]: _, ...rest } = prev;
          return rest;
        });
        return next;
      }

      setSubjectAssignments((prev) => ({
        ...prev,
        [subjectId]: prev[subjectId] || 1,
      }));
      return [...current, subjectId];
    });
  };

  const filteredSubjects = subjects
    .filter((subject) => {
      const q = subjectSearch.trim().toLowerCase();
      if (!q) return true;
      return [subject.codigo, subject.nombre, subject.descripcion]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(q));
    })
    .filter((subject) => {
      if (subjectFilter === 'assigned') return selectedSubjectIds.includes(subject.id);
      if (subjectFilter === 'unassigned') return !selectedSubjectIds.includes(subject.id);
      return true;
    })
    .sort((a, b) => {
      const aSelected = selectedSubjectIds.includes(a.id);
      const bSelected = selectedSubjectIds.includes(b.id);
      if (aSelected === bSelected) return a.codigo.localeCompare(b.codigo);
      return aSelected ? -1 : 1;
    });

  const openPensumModal = (mode) => {
    setPensumModalMode(mode);
    setEditingPensumId(mode === 'edit' ? selectedPensumId : null);
    if (mode === 'edit' && selectedPensumId) {
      const current = careerPensums.find((pensum) => pensum.id === selectedPensumId);
      setPensumForm({
        nombre: current?.nombre || '',
        anio_creacion: current?.anio_creacion ? current.anio_creacion.slice(0, 10) : '',
        estado: current?.estado ?? true,
      });
    } else {
      setPensumForm({ nombre: '', anio_creacion: '', estado: true });
    }
    setPensumModalOpen(true);
  };

  const handlePensumSave = async () => {
    if (!selectedCareerId) {
      show('Selecciona una carrera primero', 'warning');
      return;
    }
    if (!pensumForm.nombre) {
      show('El nombre del pensum es obligatorio', 'warning');
      return;
    }

    const payload = {
      id_carrera: selectedCareerId,
      nombre: pensumForm.nombre,
      anio_creacion: pensumForm.anio_creacion || new Date().toISOString().slice(0, 10),
      estado: pensumForm.estado,
    };

    try {
      setCreating(true);
      if (pensumModalMode === 'edit' && editingPensumId) {
        await pensumsApi.update(editingPensumId, payload);
        show('Pensum actualizado ✅', 'success');
      } else {
        await pensumsApi.create(payload);
        show('Pensum creado ✅', 'success');
      }
      setPensumModalOpen(false);
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al guardar pensum', 'error');
    } finally {
      setCreating(false);
    }
  };

  const save = async () => {
    if (!selectedPensumId) {
      show('Selecciona un pensum antes de guardar', 'warning');
      return;
    }

    if (selectedSubjectIds.length === 0) {
      show('Selecciona al menos una materia para el pensum', 'warning');
      return;
    }

    const assignments = selectedSubjectIds.map((subjectId) => ({
      subjectId,
      semestre: Number(subjectAssignments[subjectId] || 1),
    }));

    try {
      setSaving(true);
      await pensumsApi.updateSubjects(selectedPensumId, { assignments });
      show('Asignación guardada ✅', 'success');
      await load();
    } catch (err) {
      show(err.response?.data?.message || 'Error al guardar', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="page-header"><h1>Pensums</h1><p>Administra los planes de estudio por carrera y organiza las materias por semestre.</p></div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Administrar Pensums</div>
          <div className="card-description">Selecciona una carrera, edita el pensum y asigna las materias con su semestre.</div>
        </div>
        {loading ? (
          <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
        ) : (
          <div className="card-body" style={{ display: 'grid', gap: 20 }}>
            <div className="grid-2" style={{ gap: 20 }}>
              <div className="card" style={{ padding: 18 }}>
                <div className="card-title">Selección</div>
                <div className="form-group">
                  <label className="form-label">Carrera</label>
                  <select className="form-control" value={selectedCareer?.id || ''} onChange={(e) => setSelectedCareerId(Number(e.target.value))}>
                    {careers.map((career) => (
                      <option key={career.id} value={career.id}>{career.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Pensum</label>
                  {careerPensums.length === 0 ? (
                    <div>
                      <div className="text-muted" style={{ padding: '14px 12px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--bg-card)' }}>
                        Esta carrera aún no tiene un pensum.
                      </div>
                      <button className="btn btn-secondary btn-sm" onClick={() => openPensumModal('create')} style={{ marginTop: 12 }}>
                        + Crear Pensum
                      </button>
                    </div>
                  ) : (
                    <select className="form-control" value={selectedPensumId || ''} onChange={(e) => setSelectedPensumId(Number(e.target.value))}>
                      {careerPensums.map((pensum) => (
                        <option key={pensum.id} value={pensum.id}>
                          {pensum.nombre || 'Sin nombre'} — {pensum.anio_creacion || 'Sin fecha'}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="card" style={{ padding: 16, background: 'var(--bg-card)', marginTop: 12, border: '1px solid var(--border)' }}>
                  <div className="card-title">Detalles del Pensum</div>
                  <div style={{ display: 'grid', gap: 10, marginTop: 8 }}>
                    <div><strong>Nombre:</strong> {pensumForm.nombre || 'Sin pensum seleccionado'}</div>
                    <div><strong>Creación:</strong> {pensumForm.anio_creacion || '—'}</div>
                    <div><strong>Estado:</strong> {pensumForm.estado ? 'Activo' : 'Inactivo'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => openPensumModal('create')}>
                    + Crear Pensum
                  </button>
                  {selectedPensumId && (
                    <button className="btn btn-secondary btn-sm" onClick={() => openPensumModal('edit')}>
                      ✏️ Editar Pensum
                    </button>
                  )}
                </div>
              </div>

              <div className="card" style={{ padding: 18, background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="card-title">Resumen</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ fontSize: 14, color: '#4b5563' }}>Carrera seleccionada</div>
                  <div style={{ fontWeight: 700 }}>{selectedCareer?.nombre || '—'}</div>
                  <div style={{ fontSize: 14, color: '#4b5563' }}>Pensums disponibles</div>
                  <div style={{ fontWeight: 700 }}>{careerPensums.length}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8, marginTop: 6 }}>
                    <span className="badge badge-success">Activos: {activePensumsCount}</span>
                    <span className="badge badge-neutral">Cerrados: {inactivePensumsCount}</span>
                  </div>
                  {selectedPensumId ? (
                    <>
                      <div style={{ fontSize: 14, color: '#4b5563' }}>Pensum actual</div>
                      <div style={{ fontWeight: 700 }}>{careerPensums.find((p) => p.id === selectedPensumId)?.nombre || '—'}</div>
                    </>
                  ) : null}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                    <span className="badge badge-info">Materias asignadas: {selectedSubjectIds.length}</span>
                    <span className="badge badge-neutral">Semestre ajustable</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedPensumId ? (
              <div className="card" style={{ padding: 18 }}>
                <div className="card-title">Materias del Pensum</div>
                <p style={{ margin: '8px 0 16px', color: '#6b7280' }}>
                  Busca y selecciona las materias para este pensum. Haz clic en la fila para asignar o desasignar, y ajusta el semestre únicamente en las materias seleccionadas.
                </p>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
                  <div className="input-group search-input" style={{ flex: '1 1 320px', minWidth: 220 }}>
                    <span className="input-icon">🔍</span>
                    <input
                      className="form-control"
                      placeholder="Buscar materias por código o nombre..."
                      value={subjectSearch}
                      onChange={(e) => setSubjectSearch(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className={`btn btn-sm ${subjectFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSubjectFilter('all')}
                    >
                      Todas
                    </button>
                    <button
                      className={`btn btn-sm ${subjectFilter === 'assigned' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSubjectFilter('assigned')}
                    >
                      Asignadas
                    </button>
                    <button
                      className={`btn btn-sm ${subjectFilter === 'unassigned' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setSubjectFilter('unassigned')}
                    >
                      Sin asignar
                    </button>
                  </div>
                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-info">{selectedSubjectIds.length} seleccionadas</span>
                    <span className="badge badge-neutral">{filteredSubjects.length} visibles</span>
                  </div>
                </div>
                <div className="table-wrapper" style={{ overflowX: 'auto' }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Asignar</th>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Semestre</th>
                        <th>Carreras actuales</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSubjects.map((subject) => {
                        const selected = selectedSubjectIds.includes(subject.id);
                        return (
                          <tr key={subject.id} style={{ background: selected ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer' }} onClick={() => toggleSubject(subject.id)}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selected}
                                onChange={() => toggleSubject(subject.id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td>{subject.codigo}</td>
                            <td>{subject.nombre}</td>
                            <td>
                              <select
                                className="form-control"
                                style={{ width: 90 }}
                                value={selected ? subjectAssignments[subject.id] || 1 : ''}
                                disabled={!selected}
                                onChange={(e) => {
                                  const value = Number(e.target.value) || 1;
                                  setSubjectAssignments((prev) => ({ ...prev, [subject.id]: value }));
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((semester) => (
                                  <option key={semester} value={semester}>{semester}</option>
                                ))}
                              </select>
                            </td>
                            <td>{subject.pensums?.map((p) => p.carrera?.nombre).filter(Boolean).join(', ') || '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 18, alignItems: 'center' }}>
                  <div style={{ color: '#374151' }}>
                    <strong>{selectedSubjectIds.length}</strong> materias seleccionadas • ajusta el semestre y guarda los cambios.
                  </div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="btn btn-outline-secondary btn-sm" onClick={() => {
                      setSubjectSearch('');
                      setSubjectFilter('all');
                    }} style={{ minWidth: 120 }}>
                      Limpiar filtros
                    </button>
                    <button className="btn btn-warning btn-sm" onClick={load} style={{ minWidth: 100 }}>
                      Recargar
                    </button>
                    <button className="btn btn-success btn-sm" onClick={save} disabled={saving} style={{ minWidth: 140 }}>
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
      {isPensumModalOpen && (
        <Modal
          title={pensumModalMode === 'edit' ? 'Editar Pensum' : 'Crear Pensum'}
          onClose={() => setPensumModalOpen(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setPensumModalOpen(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={handlePensumSave} disabled={creating}>{creating ? 'Guardando...' : 'Guardar'}</button>
            </>
          }
        >
          <div className="form-group">
            <label className="form-label">Nombre del pensum</label>
            <input className="form-control" value={pensumForm.nombre} onChange={(e) => setPensumForm((p) => ({ ...p, nombre: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Año de creación</label>
            <input type="date" className="form-control" value={pensumForm.anio_creacion} onChange={(e) => setPensumForm((p) => ({ ...p, anio_creacion: e.target.value }))} />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input type="checkbox" id="modal-pensum-estado" checked={pensumForm.estado} onChange={(e) => setPensumForm((p) => ({ ...p, estado: e.target.checked }))} />
            <label htmlFor="modal-pensum-estado" style={{ margin: 0 }}>Pensum activo</label>
          </div>
        </Modal>
      )}
    </>
  );
}

/* ── Periods ── */
export function Periods() {
  const { show } = useToast();
  const [rows, setRows]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [savingStatusId, setSavingStatusId] = useState(null);
  const [form, setForm]   = useState({ codigo: '', fecha_inicio: '', fecha_fin: '', estado: true });

  const load = async () => { const r = await periodsApi.getAll(); setRows(r.data); setLoading(false); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      if (modal.id) await periodsApi.update(modal.id, form);
      else await periodsApi.create(form);
      show('Guardado ✅', 'success'); setModal(null); load();
    } catch (err) { show(err.response?.data?.message || 'Error', 'error'); }
  };

  const toggleStatus = async (period) => {
    try {
      setSavingStatusId(period.id);
      await periodsApi.update(period.id, {
        codigo: period.codigo,
        fecha_inicio: period.fecha_inicio,
        fecha_fin: period.fecha_fin,
        estado: !period.estado,
      });
      show(`Periodo ${period.estado ? 'cerrado' : 'activado'} ✅`, 'success');
      load();
    } catch (err) {
      show(err.response?.data?.message || 'Error', 'error');
    } finally {
      setSavingStatusId(null);
    }
  };

  return (
    <>
      <div className="page-header"><h1>Períodos Académicos</h1><p>Gestiona los períodos del sistema</p></div>
      <div className="card">
        <div className="card-header">
          <div className="card-title">Lista de Períodos</div>
          <button className="btn btn-primary btn-sm" onClick={() => { setForm({ codigo: '', fecha_inicio: '', fecha_fin: '', estado: true }); setModal({}); }}>+ Nuevo Período</button>
        </div>
        {loading ? <div className="flex-center" style={{ padding: 40 }}><div className="spinner" /></div>
          : <div className="table-wrapper">
              <table className="table">
                <thead><tr><th>Código</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td><strong>{r.codigo}</strong></td>
                      <td>{r.fecha_inicio}</td>
                      <td>{r.fecha_fin}</td>
                      <td><span className={`badge ${r.estado ? 'badge-success' : 'badge-neutral'}`}>{r.estado ? 'Activo' : 'Cerrado'}</span></td>
                      <td style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setForm({ codigo: r.codigo, fecha_inicio: r.fecha_inicio, fecha_fin: r.fecha_fin, estado: r.estado }); setModal({ id: r.id }); }}>✏️</button>
                        <button
                          className={`btn ${r.estado ? 'btn-warning' : 'btn-success'} btn-sm`}
                          onClick={() => toggleStatus(r)}
                          disabled={savingStatusId === r.id}
                        >
                          {savingStatusId === r.id ? '...' : r.estado ? 'Cerrar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>}
      </div>

      {modal !== null && (
        <Modal title={modal.id ? 'Editar Período' : 'Nuevo Período'} onClose={() => setModal(null)}
          footer={<><button className="btn btn-secondary" onClick={() => setModal(null)}>Cancelar</button><button className="btn btn-primary" onClick={save}>💾 Guardar</button></>}>
          <div className="form-group"><label className="form-label">Código <span>*</span></label><input className="form-control" placeholder="Ej: 2024-1" value={form.codigo} onChange={(e) => setForm(p => ({ ...p, codigo: e.target.value }))} /></div>
          <div className="form-grid">
            <div className="form-group"><label className="form-label">Fecha inicio <span>*</span></label><input className="form-control" type="date" value={form.fecha_inicio} onChange={(e) => setForm(p => ({ ...p, fecha_inicio: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Fecha fin <span>*</span></label><input className="form-control" type="date" value={form.fecha_fin} onChange={(e) => setForm(p => ({ ...p, fecha_fin: e.target.value }))} /></div>
          </div>
          <div className="form-group">
            <label className="form-label">Estado</label>
            <select className="form-control" value={form.estado} onChange={(e) => setForm(p => ({ ...p, estado: e.target.value === 'true' }))}>
              <option value="true">Activo</option><option value="false">Cerrado</option>
            </select>
          </div>
        </Modal>
      )}
    </>
  );
}
