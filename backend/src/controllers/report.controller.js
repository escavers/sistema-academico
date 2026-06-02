const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const {
  Career, Curriculum, Subject, Enrollment, Grade, Course,
  Student, User, Teacher, AcademicPeriod, Modality,
} = require('../models');

const createExcelWorkbook = async (title, columns, rows) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(title.substring(0, 31));
  sheet.columns = columns.map(column => ({ header: column.header, key: column.key, width: column.width || 20 }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };
  return workbook;
};

const sendExcel = async (res, workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

const sendPdf = (res, title, columns, rows, filename, options = {}) => {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  // Title and metadata
  doc.fontSize(16).font('Helvetica-Bold').text(title);
  if (options.teacherName) {
    doc.moveDown(0.25);
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(`Docente: ${options.teacherName}`);
  }
  if (options.generatedAt) {
    doc.fontSize(10).font('Helvetica').fillColor('#333').text(`Fecha de emisión: ${options.generatedAt}`);
  }
  if (options.additionalNotes) {
    doc.moveDown(0.25);
    doc.fontSize(9).font('Helvetica-Oblique').fillColor('#555').text(options.additionalNotes, { width: doc.page.width - doc.page.margins.left - doc.page.margins.right });
  }
  doc.moveDown(0.5);

  // Summary section if provided
  if (options.summary && Object.keys(options.summary).length > 0) {
    doc.fontSize(10).font('Helvetica-Bold').fillColor('#111').text('Resumen del Informe', { underline: true });
    doc.moveDown(0.2);
    doc.font('Helvetica').fontSize(9).fillColor('#333');
    Object.entries(options.summary).forEach(([key, value]) => {
      doc.text(`${key}: ${value}`);
    });
    doc.moveDown(0.5);
  }

  // Table drawing
  const startX = doc.x;
  let startY = doc.y;
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const totalWidthValue = columns.reduce((sum, column) => sum + (column.width || 20), 0);
  const columnWidths = columns.map((column) => Math.max(40, Math.floor(pageWidth * ((column.width || 20) / totalWidthValue))));
  const headerHeight = 24;
  const rowMinHeight = 18;

  const drawHeader = () => {
    doc.save();
    for (let i = 0; i < columnWidths.length; i++) {
      const x = startX + columnWidths.slice(0, i).reduce((sum, width) => sum + width, 0);
      doc.rect(x, startY, columnWidths[i], headerHeight).fill('#f2f2f2');
    }
    doc.restore();
    doc.fillColor('#111').font('Helvetica-Bold').fontSize(10);
    let xOffset = startX;
    for (let i = 0; i < columns.length; i++) {
      doc.text(columns[i].header, xOffset + 6, startY + 6, { width: columnWidths[i] - 12, align: 'left' });
      xOffset += columnWidths[i];
    }
    startY += headerHeight + 6;
  };

  const drawRow = (row) => {
    doc.font('Helvetica').fontSize(9).fillColor('#000');
    const cellHeights = columns.map((column, i) => {
      const text = String(row[column.key] ?? '');
      return doc.heightOfString(text, { width: columnWidths[i] - 12, align: 'left' });
    });
    const rowHeight = Math.max(rowMinHeight, Math.max(...cellHeights) + 6);

    const checkAndBreak = () => {
      if (startY + rowHeight > doc.page.height - doc.page.margins.bottom - 40) {
        doc.addPage();
        startY = doc.y;
        drawHeader();
      }
    };

    checkAndBreak();

    let xOffset = startX;
    for (let i = 0; i < columns.length; i++) {
      const key = columns[i].key;
      const text = String(row[key] ?? '');
      doc.text(text, xOffset + 6, startY, { width: columnWidths[i] - 12, align: 'left' });
      xOffset += columnWidths[i];
    }
    startY += rowHeight;
  };

  drawHeader();
  rows.forEach((r) => {
    drawRow(r);
  });

  doc.end();
};

const exportReport = async (req, res, title, columns, rows, options = {}) => {
  const format = String(req.query.format || '').toLowerCase();
  if (format !== 'excel' && format !== 'pdf') {
    return res.json(rows);
  }

  const filename = `${title.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;

  if (format === 'excel') {
    const workbook = await createExcelWorkbook(title, columns, rows);
    return sendExcel(res, workbook, filename);
  }

  return sendPdf(res, title, columns, rows, filename, options);
};

// RF12-1: Listado de materias por carrera (Administrador)
const subjectsByCareer = async (req, res, next) => {
  try {
    const rawCareerIds = req.query.careerIds || [];
    const careerIds = (Array.isArray(rawCareerIds) ? rawCareerIds : String(rawCareerIds).split(','))
      .map(id => Number(id.trim()))
      .filter(id => Number.isInteger(id) && id > 0);

    const where = { estado: true };
    if (careerIds.length > 0) {
      where.id = careerIds;
    }

    const careers = await Career.findAll({
      where,
      include: [
        { model: Modality, as: 'modalidad' },
        {
          model: Curriculum,
          as: 'pensums',
          include: [
            { model: Subject, as: 'materias', through: { attributes: ['semestre'] } },
          ],
        },
      ],
    });

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'excel' || format === 'pdf') {
      const rows = [];
      let totalSubjects = 0;
      careers.forEach(career => {
        career.pensums.forEach(pensum => {
          const subjects = pensum.materias || [];
          subjects.forEach(subject => {
            rows.push({
              carrera: career.nombre,
              modalidad: career.modalidad?.nombre || '—',
              pensum: pensum.anio_creacion || '—',
              materia_codigo: subject.codigo,
              materia_nombre: subject.nombre,
              creditos: subject.creditos || 0,
              descripcion: subject.descripcion || 'Sin descripción',
            });
            totalSubjects += 1;
          });
        });
      });
      const columns = [
        { header: 'Carrera', key: 'carrera', width: 24 },
        { header: 'Modalidad', key: 'modalidad', width: 16 },
        { header: 'Pensum', key: 'pensum', width: 16 },
        { header: 'Código materia', key: 'materia_codigo', width: 18 },
        { header: 'Materia', key: 'materia_nombre', width: 26 },
        { header: 'Créditos', key: 'creditos', width: 10 },
        { header: 'Descripción', key: 'descripcion', width: 32 },
      ];
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      const options = {
        generatedAt,
        additionalNotes: 'Este reporte muestra todas las materias asociadas a las carreras y pensums vigentes, con detalle de créditos y modalidad.',
        summary: {
          'Carreras activas': careers.length,
          'Pensums encontrados': careers.reduce((sum, career) => sum + (career.pensums?.length || 0), 0),
          'Materias totales': totalSubjects,
          'Fecha de emisión': generatedAt,
        },
      };
      return exportReport(req, res, 'Reporte de Materias por Carrera', columns, rows, options);
    }

    res.json(careers);
  } catch (error) {
    next(error);
  }
};

// RF12-2: Notas por alumno de todos sus cursos (Docente)
const gradesByStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    if (req.user.rol === 'Estudiante' && Number(req.user.id) !== studentId) {
      return res.status(403).json({ message: 'No tiene permisos para ver las notas de otro estudiante' });
    }

    if (req.user.rol === 'Docente') {
      const teacherCourses = await Course.findAll({ where: { id_docente: Number(req.user.id) }, attributes: ['id'] });
      const courseIds = teacherCourses.map(c => c.id);
      const anyMatching = await Enrollment.findOne({ where: { id_estudiante: studentId, id_curso: courseIds } });
      if (!anyMatching) {
        return res.status(403).json({ message: 'No tiene permisos para ver las notas de este estudiante' });
      }
    }

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno', 'email'] }],
    });
    const enrollments = await Enrollment.findAll({
      where: { id_estudiante: studentId },
      include: [
        { model: Grade, as: 'calificacion', required: false },
        { model: Course, as: 'curso', include: [{ model: Subject, as: 'materia' }, { model: AcademicPeriod, as: 'periodo_academico' }] },
      ],
    });

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'excel' || format === 'pdf') {
      const rows = enrollments.map((e) => ({
        curso: e.curso?.codigo_grupo || '',
        materia: e.curso?.materia?.nombre || '',
        codigo_materia: e.curso?.materia?.codigo || '',
        periodo: e.curso?.periodo_academico?.codigo || '',
        nota: e.calificacion?.nota ?? '',
        observacion: e.calificacion?.observacion || '',
        estado: e.calificacion ? (parseFloat(e.calificacion.nota) >= 51 ? 'Aprobado' : 'Reprobado') : 'Pendiente',
      }));
      const grades = rows.map((row) => parseFloat(row.nota) || 0).filter((n) => n > 0);
      const average = grades.length ? `${(grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1)}%` : 'N/A';
      const summary = {
        'Estudiante': student ? `${student.usuario?.nombres || ''} ${student.usuario?.apellido_paterno || ''}`.trim() : 'No disponible',
        'Email': student?.usuario?.email || 'No disponible',
        'Cursos registrados': rows.length,
        'Notas registradas': grades.length,
        'Promedio estimado': average,
      };
      const columns = [
        { header: 'Curso', key: 'curso', width: 18 },
        { header: 'Materia', key: 'materia', width: 24 },
        { header: 'Código', key: 'codigo_materia', width: 18 },
        { header: 'Periodo', key: 'periodo', width: 14 },
        { header: 'Nota', key: 'nota', width: 10 },
        { header: 'Observación', key: 'observacion', width: 40 },
        { header: 'Estado', key: 'estado', width: 14 },
      ];
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      const options = {
        generatedAt,
        additionalNotes: 'Reporte de calificaciones consolidadas para el estudiante en sus cursos inscritos.',
        summary,
      };
      return exportReport(req, res, 'Notas por Estudiante', columns, rows, options);
    }

    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

// RF12-3: Notas por curso de todos los alumnos (Docente)
const gradesByCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId, {
      include: [
        { model: Subject, as: 'materia' },
        { model: AcademicPeriod, as: 'periodo_academico' },
        { model: Teacher, as: 'docente', include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno', 'email'] }] },
      ],
    });
    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

    if (req.user.rol === 'Docente' && Number(req.user.id) !== course.id_docente) {
      return res.status(403).json({ message: 'No tiene permisos para ver las notas de este curso' });
    }

    const enrollments = await Enrollment.findAll({
      where: { id_curso: req.params.courseId },
      include: [
        { model: Grade, as: 'calificacion', required: false },
        { model: Student, as: 'estudiante', include: [{ model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } }] },
      ],
    });

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'excel' || format === 'pdf') {
      const rows = enrollments.map((e) => ({
        estudiante: `${e.estudiante?.usuario?.nombres || ''} ${e.estudiante?.usuario?.apellido_paterno || ''}`.trim(),
        matricula: e.estudiante?.matricula || '',
        nota: e.calificacion?.nota ?? '',
        observacion: e.calificacion?.observacion || '',
        estado: e.estado,
      }));
      const grades = rows.map((row) => parseFloat(row.nota) || 0).filter((n) => n > 0);
      const average = grades.length ? `${(grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1)}%` : 'N/A';
      const enrolledStudents = rows.length;
      const courseSummary = {
        'Curso': course.codigo_grupo,
        'Materia': course.materia?.nombre || 'No disponible',
        'Periodo': course.periodo_academico?.codigo || 'No disponible',
        'Docente': `${course.docente?.usuario?.nombres || ''} ${course.docente?.usuario?.apellido_paterno || ''}`.trim(),
        'Email docente': course.docente?.usuario?.email || 'No disponible',
        'Estudiantes inscritos': enrolledStudents,
        'Promedio del curso': average,
      };
      const columns = [
        { header: 'Estudiante', key: 'estudiante', width: 28 },
        { header: 'Matrícula', key: 'matricula', width: 18 },
        { header: 'Nota', key: 'nota', width: 10 },
        { header: 'Observación', key: 'observacion', width: 34 },
        { header: 'Estado', key: 'estado', width: 12 },
      ];
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      const options = {
        generatedAt,
        additionalNotes: 'Informe completo de calificaciones del curso para todos los estudiantes inscritos.',
        summary: courseSummary,
      };
      return exportReport(req, res, 'Notas por Curso', columns, rows, options);
    }

    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

// RF12-4: Historial académico del alumno (Alumno)
const studentAcademicHistory = async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    if (req.user.rol === 'Estudiante' && Number(req.user.id) !== studentId) {
      return res.status(403).json({ message: 'No tiene permisos para ver el historial de otro estudiante' });
    }

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } }],
    });
    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

    const enrollments = await Enrollment.findAll({
      where: { id_estudiante: studentId },
      include: [
        { model: Grade, as: 'calificacion', required: false },
        {
          model: Course,
          as: 'curso',
          include: [
            { model: Subject, as: 'materia' },
            { model: AcademicPeriod, as: 'periodo_academico' },
            { model: Teacher, as: 'docente', include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno']} ] },
          ],
        },
      ],
      order: [['fecha_inscripcion', 'ASC']],
    });

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'excel' || format === 'pdf') {
      const rows = enrollments.map((e) => ({
        curso: e.curso?.codigo_grupo || '',
        materia: e.curso?.materia?.nombre || '',
        docente: `${e.curso?.docente?.usuario?.nombres || ''} ${e.curso?.docente?.usuario?.apellido_paterno || ''}`.trim(),
        periodo: e.curso?.periodo_academico?.codigo || '',
        nota: e.calificacion?.nota ?? '',
        observacion: e.calificacion?.observacion || '',
        estado: e.estado,
        fecha_inscripcion: e.fecha_inscripcion,
      }));
      const grades = rows.map((row) => parseFloat(row.nota) || 0).filter((n) => n > 0);
      const passedCount = rows.filter((row) => parseFloat(row.nota) >= 51).length;
      const failedCount = rows.filter((row) => row.nota !== '' && parseFloat(row.nota) < 51).length;
      const summary = {
        'Estudiante': `${student.usuario?.nombres || ''} ${student.usuario?.apellido_paterno || ''}`.trim(),
        'Email': student.usuario?.email || 'No disponible',
        'Registros totales': rows.length,
        'Materias aprobadas': passedCount,
        'Materias reprobadas': failedCount,
        'Promedio': grades.length ? `${(grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1)}%` : 'N/A',
      };
      const columns = [
        { header: 'Curso', key: 'curso', width: 18 },
        { header: 'Materia', key: 'materia', width: 24 },
        { header: 'Docente', key: 'docente', width: 24 },
        { header: 'Periodo', key: 'periodo', width: 14 },
        { header: 'Nota', key: 'nota', width: 10 },
        { header: 'Observación', key: 'observacion', width: 34 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Fecha Inscripción', key: 'fecha_inscripcion', width: 18 },
      ];
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      const options = {
        generatedAt,
        additionalNotes: 'Historial de inscripciones y calificaciones completo con estado académico de cada curso.',
        summary,
      };
      return exportReport(req, res, 'Historial Académico', columns, rows, options);
    }

    res.json({ student, history: enrollments });
  } catch (error) {
    next(error);
  }
};

// RF12-6: Listado de alumnos inscritos a un curso (Docente)
const enrolledStudentsByCourse = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.courseId, {
      include: [
        { model: Subject, as: 'materia' },
        { model: AcademicPeriod, as: 'periodo_academico' },
        { model: Teacher, as: 'docente', include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno', 'email'] }] },
      ],
    });
    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

    const enrollments = await Enrollment.findAll({
      where: { id_curso: req.params.courseId, estado: 'Inscrito' },
      include: [{
        model: Student,
        as: 'estudiante',
        include: [{ model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } }],
      }],
    });

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'excel' || format === 'pdf') {
      const rows = enrollments.map((e) => ({
        estudiante: `${e.estudiante?.usuario?.nombres || ''} ${e.estudiante?.usuario?.apellido_paterno || ''}`.trim(),
        matricula: e.estudiante?.matricula || '',
        email: e.estudiante?.usuario?.email || '',
        estado: e.estado,
        fecha_inscripcion: e.fecha_inscripcion,
      }));
      const summary = {
        'Curso': course.codigo_grupo,
        'Materia': course.materia?.nombre || 'No disponible',
        'Periodo': course.periodo_academico?.codigo || 'No disponible',
        'Docente': `${course.docente?.usuario?.nombres || ''} ${course.docente?.usuario?.apellido_paterno || ''}`.trim(),
        'Email docente': course.docente?.usuario?.email || 'No disponible',
        'Inscritos actuales': rows.length,
        'Cupo máximo': course.cupo_maximo || 'No definido',
      };
      const columns = [
        { header: 'Estudiante', key: 'estudiante', width: 28 },
        { header: 'Matrícula', key: 'matricula', width: 18 },
        { header: 'Email', key: 'email', width: 32 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Fecha Inscripción', key: 'fecha_inscripcion', width: 18 },
      ];
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      const options = {
        generatedAt,
        additionalNotes: 'Listado de estudiantes inscritos actualmente en el curso, útil para seguimiento de grupos y control de asistencia.',
        summary,
      };
      return exportReport(req, res, 'Alumnos Inscritos por Curso', columns, rows, options);
    }

    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

// RF12-7: Listado de materias del alumno (Alumno)
const subjectsByStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    if (req.user.rol === 'Estudiante' && Number(req.user.id) !== studentId) {
      return res.status(403).json({ message: 'No tiene permisos para ver las materias de otro estudiante' });
    }

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno', 'email'] }],
    });
    const enrollments = await Enrollment.findAll({
      where: { id_estudiante: studentId },
      include: [{
        model: Course,
        as: 'curso',
        include: [
          { model: Subject, as: 'materia' },
          { model: AcademicPeriod, as: 'periodo_academico' },
        ],
      }],
    });
    const subjects = enrollments.map(e => ({
      enrollment: { id: e.id, estado: e.estado, fecha_inscripcion: e.fecha_inscripcion },
      materia: e.curso?.materia,
      periodo: e.curso?.periodo_academico,
    }));

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'excel' || format === 'pdf') {
      const rows = enrollments.map((e) => ({
        curso: e.curso?.codigo_grupo || '',
        materia: e.curso?.materia?.nombre || '',
        codigo_materia: e.curso?.materia?.codigo || '',
        periodo: e.curso?.periodo_academico?.codigo || '',
        estado: e.estado,
        fecha_inscripcion: e.fecha_inscripcion,
      }));
      const summary = {
        'Estudiante': `${student.usuario?.nombres || ''} ${student.usuario?.apellido_paterno || ''}`.trim(),
        'Email': student.usuario?.email || 'No disponible',
        'Materias registradas': rows.length,
        'Inscripciones activas': rows.filter((r) => r.estado === 'Inscrito').length,
      };
      const columns = [
        { header: 'Curso', key: 'curso', width: 18 },
        { header: 'Materia', key: 'materia', width: 24 },
        { header: 'Código', key: 'codigo_materia', width: 18 },
        { header: 'Periodo', key: 'periodo', width: 15 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Fecha Inscripción', key: 'fecha_inscripcion', width: 18 },
      ];
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      const options = {
        generatedAt,
        additionalNotes: 'Listado detallado de materias en las que está inscrito el estudiante, con su estado académico.',
        summary,
      };
      return exportReport(req, res, 'Materias del Alumno', columns, rows, options);
    }

    res.json(subjects);
  } catch (error) {
    next(error);
  }
};

// RF12-5: Notas de todas las materias (Alumno)
const gradesByAllSubjectsStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    if (req.user.rol === 'Estudiante' && Number(req.user.id) !== studentId) {
      return res.status(403).json({ message: 'No tiene permisos para ver las notas de otro estudiante' });
    }

    const student = await Student.findByPk(studentId, {
      include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno', 'email'] }],
    });

    const enrollments = await Enrollment.findAll({
      where: { id_estudiante: studentId },
      include: [
        { model: Grade, as: 'calificacion', required: false },
        {
          model: Course,
          as: 'curso',
          include: [
            { model: Subject, as: 'materia' },
            { model: AcademicPeriod, as: 'periodo_academico' },
            { model: Teacher, as: 'docente', include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno'] }] },
          ],
        },
      ],
      order: [['fecha_inscripcion', 'DESC']],
    });

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'excel' || format === 'pdf') {
      const rows = enrollments.map((e) => ({
        materia: e.curso?.materia?.nombre || '',
        codigo_materia: e.curso?.materia?.codigo || '',
        creditos: e.curso?.materia?.creditos || 0,
        docente: `${e.curso?.docente?.usuario?.nombres || ''} ${e.curso?.docente?.usuario?.apellido_paterno || ''}`.trim(),
        periodo: e.curso?.periodo_academico?.codigo || '',
        nota: e.calificacion?.nota ?? '',
        observacion: e.calificacion?.observacion || '',
        estado: e.calificacion ? (parseFloat(e.calificacion.nota) >= 51 ? 'Aprobado' : 'Reprobado') : 'Pendiente',
        fecha_inscripcion: e.fecha_inscripcion,
      }));
      const grades = rows.map((row) => parseFloat(row.nota) || 0).filter((n) => n > 0);
      const passedCount = rows.filter((row) => row.estado === 'Aprobado').length;
      const failedCount = rows.filter((row) => row.estado === 'Reprobado').length;
      const summary = {
        'Estudiante': `${student?.usuario?.nombres || ''} ${student?.usuario?.apellido_paterno || ''}`.trim(),
        'Email': student?.usuario?.email || 'No disponible',
        'Materias registradas': rows.length,
        'Materias aprobadas': passedCount,
        'Materias reprobadas': failedCount,
        'Promedio general': grades.length ? `${(grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1)}%` : 'N/A',
      };
      const columns = [
        { header: 'Materia', key: 'materia', width: 28 },
        { header: 'Código', key: 'codigo_materia', width: 16 },
        { header: 'Créditos', key: 'creditos', width: 12 },
        { header: 'Docente', key: 'docente', width: 24 },
        { header: 'Período', key: 'periodo', width: 14 },
        { header: 'Nota', key: 'nota', width: 10 },
        { header: 'Observación', key: 'observacion', width: 34 },
        { header: 'Estado', key: 'estado', width: 14 },
        { header: 'Fecha Inscripción', key: 'fecha_inscripcion', width: 18 },
      ];
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      const options = {
        generatedAt,
        additionalNotes: 'Reporte completo de todas las materias cursadas por el estudiante, incluyendo notas y estado académico.',
        summary,
      };
      return exportReport(req, res, 'Notas de Todas las Materias', columns, rows, options);
    }

    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

// RF12-8: Listado de materias del docente (Docente)
const subjectsByTeacher = async (req, res, next) => {
  try {
    const teacherId = Number(req.params.teacherId);
    if (req.user.rol === 'Docente' && Number(req.user.id) !== teacherId) {
      return res.status(403).json({ message: 'No tiene permisos para ver las materias de otro docente' });
    }

    const teacher = await Teacher.findByPk(teacherId, {
      include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno', 'email'] }],
    });

    const courses = await Course.findAll({
      where: { id_docente: teacherId },
      include: [
        { model: Subject, as: 'materia' },
        { model: AcademicPeriod, as: 'periodo_academico' },
        { model: Enrollment, as: 'inscripciones', required: false, where: { estado: 'Inscrito' } },
      ],
    });

    const format = String(req.query.format || '').toLowerCase();
    if (format === 'excel' || format === 'pdf') {
      const rows = courses.map((course) => {
        const enrolledCount = course.inscripciones?.length || 0;
        const availableSeats = Math.max(course.cupo_maximo - enrolledCount, 0);
        return {
          curso: course.codigo_grupo,
          materia: course.materia?.nombre || '',
          codigo_materia: course.materia?.codigo || '',
          periodo: course.periodo_academico?.codigo || '',
          cupo_maximo: course.cupo_maximo || 0,
          inscritos: enrolledCount,
          cupo_disponible: availableSeats,
          estado: course.estado ? 'Activo' : 'Inactivo',
        };
      });
      const totalInscritos = rows.reduce((sum, row) => sum + Number(row.inscritos || 0), 0);
      const totalCupos = rows.reduce((sum, row) => sum + Number(row.cupo_maximo || 0), 0);
      const averageOccupancy = totalCupos > 0 ? `${Math.round((totalInscritos / totalCupos) * 100)}%` : '0%';
      const teacherName = `${teacher?.usuario?.nombres || 'Docente'} ${teacher?.usuario?.apellido_paterno || ''}`.trim();
      const generatedAt = new Date().toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
      const options = {
        teacherName,
        generatedAt,
        additionalNotes: 'Este informe muestra la lista de cursos asignados al docente, número de estudiantes inscritos por curso, cupo máximo y disponibilidad actual.',
        summary: {
          'Docente': teacherName,
          'Email': teacher?.usuario?.email || 'No disponible',
          'Cursos asignados': rows.length,
          'Total inscritos': totalInscritos,
          'Cupo total': totalCupos,
          'Ocupación promedio': averageOccupancy,
        },
      };
      const columns = [
        { header: 'Curso', key: 'curso', width: 18 },
        { header: 'Materia', key: 'materia', width: 28 },
        { header: 'Código', key: 'codigo_materia', width: 18 },
        { header: 'Periodo', key: 'periodo', width: 16 },
        { header: 'Cupo Máximo', key: 'cupo_maximo', width: 12 },
        { header: 'Inscritos', key: 'inscritos', width: 12 },
        { header: 'Cupo Disponible', key: 'cupo_disponible', width: 14 },
        { header: 'Estado', key: 'estado', width: 12 },
      ];
      return exportReport(req, res, 'Reporte de Materias del Docente', columns, rows, options);
    }

    res.json(courses.map((course) => ({
      ...course.toJSON(),
      inscritos: course.inscripciones?.length || 0,
      cupo_disponible: Math.max((course.cupo_maximo || 0) - (course.inscripciones?.length || 0), 0),
    })));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  subjectsByCareer,
  gradesByStudent,
  gradesByCourse,
  studentAcademicHistory,
  enrolledStudentsByCourse,
  subjectsByStudent,
  subjectsByTeacher,
  gradesByAllSubjectsStudent,
};
