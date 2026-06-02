import { useEffect, useState } from 'react';
import api from '../../services/api';
import '../../styles/curriculum.css';

export default function MyCurriculum() {
  const [curriculum, setCurriculum] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  useEffect(() => {
    const fetchCurriculum = async () => {
      try {
        setLoading(true);
        const response = await api.get('/pensums/student/my-curriculum');
        setCurriculum(response.data.pensum || null);
        setInfoMessage(response.data.message || null);
        setError(null);
      } catch (err) {
        setError(err.response?.data?.message || 'Error al cargar la malla curricular');
        setInfoMessage(null);
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCurriculum();
  }, []);

  if (loading) {
    return (
      <div className="curriculum-container">
        <div className="loading">Cargando malla curricular...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="curriculum-container">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  if (!curriculum) {
    return (
      <div className="curriculum-container">
        <div className="info-message">
          {infoMessage || 'No se encontró información de la malla curricular'}
        </div>
      </div>
    );
  }

  const semesters = curriculum.materiasPorSemestre
    ? Object.keys(curriculum.materiasPorSemestre).sort((a, b) => Number(a) - Number(b))
    : [];

  const handleExportPdf = () => {
    window.print();
  };

  return (
    <div className="curriculum-container">
      <div className="curriculum-header">
        <div className="curriculum-header-top">
          <div>
            <h1>Mi Malla Curricular</h1>
            <p className="subheader">{infoMessage}</p>
          </div>
          <button className="btn btn-primary btn-sm no-print" onClick={handleExportPdf}>
            📄 Exportar PDF
          </button>
        </div>
      </div>

      <section className="curriculum-section">
        <div className="curriculum-info">
          <div className="info-card">
            <p className="label">Carrera</p>
            <p className="value">{curriculum.carrera?.nombre}</p>
          </div>
          <div className="info-card">
            <p className="label">Año de Creación</p>
            <p className="value">{curriculum.anio_creacion}</p>
          </div>
          <div className="info-card">
            <p className="label">Materias</p>
            <p className="value">{curriculum.materias?.length || 0}</p>
          </div>
        </div>

        <div className="curriculum-content">
          <h2>Materias del Pensum</h2>
          {semesters.length > 0 ? (
            semesters.map((semester) => (
              <div key={semester} className="semester-block">
                <div className="semester-header">
                  <span>Semestre {semester}</span>
                  <span>{curriculum.materiasPorSemestre[semester].length} materias</span>
                </div>
                <div className="subjects-grid">
                  {curriculum.materiasPorSemestre[semester].map((subject) => (
                    <div key={subject.id} className="subject-card">
                      <div className="subject-header">
                        <h3>{subject.nombre}</h3>
                        <span className="subject-code">{subject.codigo}</span>
                      </div>
                      <div className="subject-body">
                        <p className="description">{subject.descripcion || 'Sin descripción'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="no-subjects">No hay materias organizadas por semestre en este pensum</p>
          )}
        </div>
      </section>
    </div>
  );
}
