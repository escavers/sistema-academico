const { Grade, Enrollment, Course, Subject, Student, User, Teacher, Notification } = require('../models');

const create = async (req, res, next) => {
  try {
    const { nota, observacion, id_inscripcion } = req.body;
    const id_docente = Number(req.user.id);

    if (nota === undefined || nota === null) {
      return res.status(400).json({ message: 'La nota es requerida' });
    }
    if (nota < 0 || nota > 100) {
      return res.status(400).json({ message: 'La nota debe estar entre 0 y 100' });
    }

    const enrollment = await Enrollment.findByPk(id_inscripcion, {
      include: [{ model: Course, as: 'curso' }, { model: Student, as: 'estudiante', include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno'] }] }],
    });
    if (!enrollment) return res.status(404).json({ message: 'Inscripción no encontrada' });
    if (!enrollment.curso) return res.status(404).json({ message: 'Curso de la inscripción no encontrado' });
    if (enrollment.curso.id_docente !== id_docente) {
      return res.status(403).json({ message: 'Solo el docente asignado puede calificar esta inscripción' });
    }

    const existingGrade = await Grade.findOne({ where: { id_inscripcion } });
    if (existingGrade) {
      return res.status(409).json({ message: 'Esta inscripción ya tiene una calificación registrada' });
    }

    const grade = await Grade.create({ nota, observacion, id_inscripcion, id_docente });

    const studentName = `${enrollment.estudiante?.usuario?.nombres || ''} ${enrollment.estudiante?.usuario?.apellido_paterno || ''}`.trim();
    await Notification.create({
      titulo: 'Calificación registrada',
      mensaje: `Tu calificación para el curso ${enrollment.curso.codigo_grupo} ha sido registrada por el docente`,
      id_usuario: enrollment.id_estudiante,
    });

    res.status(201).json({ message: 'Calificación registrada', grade });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { nota, observacion } = req.body;
    const grade = await Grade.findByPk(req.params.id, {
      include: [{ model: Enrollment, as: 'inscripcion', include: [{ model: Course, as: 'curso' }] }],
    });
    if (!grade) return res.status(404).json({ message: 'Calificación no encontrada' });

    if (grade.inscripcion.curso.id_docente !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Solo el docente asignado puede actualizar esta calificación' });
    }

    if (nota !== undefined && (nota < 0 || nota > 100)) {
      return res.status(400).json({ message: 'La nota debe estar entre 0 y 100' });
    }

    await grade.update({ nota, observacion });

    await Notification.create({
      titulo: 'Calificación actualizada',
      mensaje: `Tu calificación para el curso ${grade.inscripcion.curso.codigo_grupo} ha sido actualizada.`,
      id_usuario: grade.inscripcion.id_estudiante,
    });

    res.json({ message: 'Calificación actualizada', grade });
  } catch (error) {
    next(error);
  }
};

const getByEnrollment = async (req, res, next) => {
  try {
    const grade = await Grade.findOne({
      where: { id_inscripcion: req.params.enrollmentId },
      include: [{ model: Enrollment, as: 'inscripcion', include: [{ model: Course, as: 'curso' }] }],
    });
    if (!grade) return res.status(404).json({ message: 'Calificación no encontrada' });

    if (req.user.rol === 'Estudiante' && Number(req.user.id) !== grade.inscripcion.id_estudiante) {
      return res.status(403).json({ message: 'No tiene permisos para ver esta calificación' });
    }
    if (req.user.rol === 'Docente' && Number(req.user.id) !== grade.inscripcion.curso.id_docente) {
      return res.status(403).json({ message: 'No tiene permisos para ver esta calificación' });
    }

    res.json(grade);
  } catch (error) {
    next(error);
  }
};

const getByStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);
    if (req.user.rol === 'Estudiante' && Number(req.user.id) !== studentId) {
      return res.status(403).json({ message: 'No tiene permisos para ver las notas de otro estudiante' });
    }

    const enrollments = await Enrollment.findAll({
      where: { id_estudiante: studentId },
      include: [
        {
          model: Grade,
          as: 'calificacion',
          required: false,
        },
        {
          model: Course,
          as: 'curso',
          include: [{ model: Subject, as: 'materia' }],
        },
      ],
    });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

const getByCourse = async (req, res, next) => {
  try {
    const courseId = Number(req.params.courseId);
    const course = await Course.findByPk(courseId);
    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

    if (req.user.rol === 'Docente' && Number(req.user.id) !== course.id_docente) {
      return res.status(403).json({ message: 'No tiene permisos para ver las calificaciones de este curso' });
    }
    if (req.user.rol === 'Estudiante') {
      return res.status(403).json({ message: 'No tiene permisos para ver las calificaciones de este curso' });
    }

    const enrollments = await Enrollment.findAll({
      where: { id_curso: courseId },
      include: [
        {
          model: Grade,
          as: 'calificacion',
          required: false,
        },
        {
          model: Student,
          as: 'estudiante',
          include: [{ model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } }],
        },
      ],
    });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

module.exports = { create, update, getByEnrollment, getByStudent, getByCourse };
