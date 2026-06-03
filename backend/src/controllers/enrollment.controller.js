const { Op } = require('sequelize');
const { Enrollment, Course, Student, User, Schedule, Subject, AcademicPeriod, Teacher, Notification, Grade } = require('../models');

const create = async (req, res, next) => {
  try {
    const { id_estudiante, id_curso } = req.body;

    if (req.user.rol === 'Estudiante' && Number(req.user.id) !== Number(id_estudiante)) {
      return res.status(403).json({ message: 'No tiene permisos para inscribir a otro estudiante' });
    }

    const student = await Student.findByPk(id_estudiante, {
      include: [{ model: User, as: 'usuario', attributes: ['nombres', 'apellido_paterno', 'apellido_materno'] }],
    });
    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });

    const course = await Course.findOne({
      where: { id: id_curso, estado: true },
      include: [
        { model: Schedule, as: 'horarios' },
        { model: AcademicPeriod, as: 'periodo_academico' },
        { model: Subject, as: 'materia', include: [{ model: Subject, as: 'prerequisito' }] },
      ],
    });
    if (!course) return res.status(404).json({ message: 'Curso no encontrado o inactivo' });

    if (!course.periodo_academico || !course.periodo_academico.estado) {
      return res.status(400).json({ message: 'No es posible inscribir en un periodo académico inactivo' });
    }

    const existing = await Enrollment.findOne({ where: { id_estudiante, id_curso } });
    if (existing) return res.status(409).json({ message: 'El estudiante ya está inscrito en este curso' });

    const enrolledCount = await Enrollment.count({ where: { id_curso, estado: 'Inscrito' } });
    if (enrolledCount >= course.cupo_maximo) {
      return res.status(400).json({ message: 'El curso ha alcanzado su cupo máximo' });
    }

    if (course.materia?.id_prerequisito) {
      const prereqSubject = course.materia.prerequisito;
      const passedPrerequisite = await Enrollment.findOne({
        where: { id_estudiante },
        include: [
          {
            model: Course,
            as: 'curso',
            required: true,
            include: [
              {
                model: Subject,
                as: 'materia',
                required: true,
                where: { id: course.materia.id_prerequisito },
              },
            ],
          },
          {
            model: Grade,
            as: 'calificacion',
            required: true,
            where: { nota: { [Op.gte]: 51 } },
          },
        ],
      });

      if (!passedPrerequisite) {
        return res.status(400).json({
          message: `Para inscribirse en ${course.materia?.nombre}, primero debes aprobar la materia prerequisito ${prereqSubject?.nombre || 'requisito'}.`,
        });
      }
    }

    if (course.horarios && course.horarios.length > 0) {
      const studentEnrollments = await Enrollment.findAll({
        where: { id_estudiante, estado: 'Inscrito' },
        include: [{
          model: Course,
          as: 'curso',
          include: [{ model: Schedule, as: 'horarios' }],
        }],
      });

      for (const newSlot of course.horarios) {
        for (const enr of studentEnrollments) {
          for (const existSlot of (enr.curso.horarios || [])) {
            if (existSlot.dia_semana === newSlot.dia_semana) {
              const newStart = newSlot.hora_inicio;
              const newEnd = newSlot.hora_fin;
              const exStart = existSlot.hora_inicio;
              const exEnd = existSlot.hora_fin;
              if (newStart < exEnd && newEnd > exStart) {
                return res.status(409).json({
                  message: `Conflicto de horario: ${newSlot.dia_semana} ${newStart}-${newEnd} se superpone con un curso ya inscrito`,
                });
              }
            }
          }
        }
      }
    }

    const enrollment = await Enrollment.create({ id_estudiante, id_curso, estado: 'Inscrito' });

    await Notification.create({
      titulo: 'Inscripción registrada',
      mensaje: `Te has inscrito en el curso ${course.codigo_grupo} de ${course.materia?.nombre || 'la materia'}`,
      id_usuario: id_estudiante,
    });

    if (course.id_docente) {
      const studentName = `${student.usuario?.nombres || ''} ${student.usuario?.apellido_paterno || ''}`.trim();
      await Notification.create({
        titulo: 'Nuevo estudiante inscrito',
        mensaje: `El estudiante ${studentName || id_estudiante} se inscribió en el curso ${course.codigo_grupo}`,
        id_usuario: course.id_docente,
      });
    }

    res.status(201).json({ message: 'Inscripción exitosa', enrollment });
  } catch (error) {
    next(error);
  }
};

const getByStudent = async (req, res, next) => {
  try {
    const studentId = Number(req.params.studentId);

    if (req.user.rol === 'Estudiante' && Number(req.user.id) !== studentId) {
      return res.status(403).json({ message: 'No tiene permisos para ver las inscripciones de otro estudiante' });
    }

    const enrollments = await Enrollment.findAll({
      where: { id_estudiante: studentId },
      include: [{
        model: Course,
        as: 'curso',
        include: [
          { model: Subject, as: 'materia' },
          { model: Schedule, as: 'horarios' },
          { model: AcademicPeriod, as: 'periodo_academico' },
          { model: Teacher, as: 'docente', include: [{ model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } }] },
        ],
      }],
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
      return res.status(403).json({ message: 'No tiene permisos para ver las inscripciones de este curso' });
    }

    const enrollments = await Enrollment.findAll({
      where: { id_curso: courseId },
      include: [{
        model: Student,
        as: 'estudiante',
        include: [{ model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } }],
      }],
    });
    res.json(enrollments);
  } catch (error) {
    next(error);
  }
};

const cancel = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.findByPk(req.params.id);
    if (!enrollment) return res.status(404).json({ message: 'Inscripción no encontrada' });
    await enrollment.update({ estado: 'Cancelado' });
    res.json({ message: 'Inscripción cancelada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getByStudent, getByCourse, cancel };
