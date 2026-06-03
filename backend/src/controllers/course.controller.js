const { Op } = require('sequelize');
const { Course, Subject, AcademicPeriod, Teacher, User, Schedule, Enrollment, Student, Curriculum, Career, Notification, TeacherCareer, TeacherSpecialty } = require('../models');

const validateScheduleConflicts = (newSchedules, existingSchedules) => {
  for (const newSlot of newSchedules) {
    for (const existSlot of existingSchedules) {
      if (existSlot.dia_semana === newSlot.dia_semana) {
        const newStart = newSlot.hora_inicio;
        const newEnd = newSlot.hora_fin;
        const exStart = existSlot.hora_inicio;
        const exEnd = existSlot.hora_fin;
        if (newStart < exEnd && newEnd > exStart) {
          return true;
        }
      }
    }
  }
  return false;
};

/**
 * Auto-generate course group code from subject code + sequential number
 */
const generateCourseCode = async (id_materia) => {
  const subject = await Subject.findByPk(id_materia);
  const prefix = subject?.codigo || 'CUR';
  const existingCount = await Course.count({ where: { id_materia } });
  return `${prefix}-G${existingCount + 1}`;
};

const create = async (req, res, next) => {
  try {
    const { cupo_maximo, id_materia, id_periodo_academico, id_docente, id_administrador, horarios } = req.body;

    if (!cupo_maximo || !id_materia || !id_periodo_academico || !id_docente || !id_administrador) {
      return res.status(400).json({ message: 'Faltan campos obligatorios para crear el curso' });
    }

    const teacher = await Teacher.findByPk(id_docente);
    if (!teacher) return res.status(404).json({ message: 'Docente no encontrado' });

    const period = await AcademicPeriod.findByPk(id_periodo_academico);
    if (!period) return res.status(404).json({ message: 'Período académico no encontrado' });

    if (horarios && Array.isArray(horarios) && horarios.length > 0) {
      const teacherCourses = await Course.findAll({
        where: { id_docente },
        include: [{ model: Schedule, as: 'horarios' }],
      });
      const existingSchedules = teacherCourses.flatMap(c => c.horarios || []);
      if (validateScheduleConflicts(horarios, existingSchedules)) {
        return res.status(409).json({ message: 'El docente tiene conflicto de horario con otro curso asignado' });
      }
    }

    // Auto-generate group code
    const codigo_grupo = await generateCourseCode(id_materia);

    const course = await Course.create({ codigo_grupo, cupo_maximo, id_materia, id_periodo_academico, id_docente, id_administrador });

    if (horarios && Array.isArray(horarios) && horarios.length > 0) {
      await Schedule.bulkCreate(horarios.map((horario) => ({ ...horario, id_curso: course.id })));
    }

    await Notification.create({
      titulo: 'Curso asignado',
      mensaje: `Se te ha asignado el curso ${codigo_grupo} en el período ${period.codigo}`,
      id_usuario: id_docente,
    });

    res.status(201).json({ message: 'Curso creado exitosamente', course });
  } catch (error) {
    next(error);
  }
};

const courseIncludes = [
  { model: Subject, as: 'materia', include: [{ model: Curriculum, as: 'pensums', include: [{ model: Career, as: 'carrera' }] }, { model: Career, as: 'carrera' }] },
  { model: AcademicPeriod, as: 'periodo_academico' },
  { model: Teacher, as: 'docente', include: [
    { model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } },
    { model: TeacherSpecialty, as: 'especialidades', include: [{ model: Career, as: 'carrera' }] },
  ] },
  { model: Schedule, as: 'horarios' },
];

const getAll = async (req, res, next) => {
  try {
    const courses = await Course.findAll({ include: courseIncludes });
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, { include: courseIncludes });
    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });
    res.json(course);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id, { include: [{ model: Schedule, as: 'horarios' }] });
    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });

    const { codigo_grupo, cupo_maximo, id_materia, id_periodo_academico, id_docente, estado, horarios } = req.body;

    if (id_docente) {
      const teacher = await Teacher.findByPk(id_docente);
      if (!teacher) return res.status(404).json({ message: 'Docente no encontrado' });

      if (horarios && Array.isArray(horarios) && horarios.length > 0) {
        const teacherCourses = await Course.findAll({
          where: { id_docente, id: { [Op.ne]: course.id } },
          include: [{ model: Schedule, as: 'horarios' }],
        });
        const existingSchedules = teacherCourses.flatMap(c => c.horarios || []);
        if (validateScheduleConflicts(horarios, existingSchedules)) {
          return res.status(409).json({ message: 'El docente tiene conflicto de horario con otro curso asignado' });
        }
      }
    }

    await course.update({ codigo_grupo, cupo_maximo, id_materia, id_periodo_academico, id_docente, estado });

    if (horarios && Array.isArray(horarios)) {
      await Schedule.destroy({ where: { id_curso: course.id } });
      if (horarios.length > 0) {
        await Schedule.bulkCreate(horarios.map((horario) => ({ ...horario, id_curso: course.id })));
      }
    }

    if (id_docente && Number(id_docente) !== Number(course.id_docente)) {
      const period = await AcademicPeriod.findByPk(id_periodo_academico || course.id_periodo_academico);
      await Notification.create({
        titulo: 'Nuevo curso asignado',
        mensaje: `Se te ha asignado el curso ${codigo_grupo || course.codigo_grupo} en el período ${period?.codigo || ''}`,
        id_usuario: id_docente,
      });
    }

    res.json({ message: 'Curso actualizado', course });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    const course = await Course.findByPk(req.params.id);
    if (!course) return res.status(404).json({ message: 'Curso no encontrado' });
    await course.update({ estado: false });
    res.json({ message: 'Curso desactivado' });
  } catch (error) {
    next(error);
  }
};

const getByTeacher = async (req, res, next) => {
  try {
    const courses = await Course.findAll({
      where: { id_docente: req.params.teacherId },
      include: courseIncludes,
    });
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

const getByStudent = async (req, res, next) => {
  try {
    const enrollments = await Enrollment.findAll({
      where: { id_estudiante: req.params.studentId },
      include: [{ model: Course, as: 'curso', include: courseIncludes }],
    });
    const courses = enrollments.map(e => e.curso);
    res.json(courses);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /courses/available-teachers
 * Returns teachers available for a given subject (filtered by career match),
 * excluding those who have schedule conflicts on the specified day+shift.
 * Query params: id_materia, dia_semana, hora_inicio, hora_fin
 */
const getAvailableTeachers = async (req, res, next) => {
  try {
    const { id_materia, dia_semana, hora_inicio, hora_fin } = req.query;

    if (!id_materia) {
      return res.status(400).json({ message: 'id_materia es requerido' });
    }

    // Get the career of the subject
    const subject = await Subject.findByPk(id_materia, {
      include: [{ model: Career, as: 'carrera' }],
    });

    if (!subject) {
      return res.status(404).json({ message: 'Materia no encontrada' });
    }

    // Build teacher query - if subject has a career, filter teachers by that career
    let teacherWhere = {};
    let teacherIds = null;

    if (subject.id_carrera) {
      const teacherCareers = await TeacherCareer.findAll({
        where: { id_carrera: subject.id_carrera },
      });
      teacherIds = teacherCareers.map(tc => tc.id_docente);
    }

    // Get all matching teachers
    const whereClause = teacherIds ? { id: { [Op.in]: teacherIds } } : {};
    const teachers = await Teacher.findAll({
      where: whereClause,
      include: [
        { model: User, as: 'usuario', attributes: { exclude: ['contrasena'] }, where: { estado: true } },
        { model: TeacherSpecialty, as: 'especialidades', include: [{ model: Career, as: 'carrera' }] },
        { model: TeacherCareer, as: 'docenteCarreras', include: [{ model: Career, as: 'carrera' }] },
        { model: Course, as: 'cursos', include: [{ model: Schedule, as: 'horarios' }] },
      ],
    });

    // Filter out teachers with schedule conflicts
    const availableTeachers = teachers.filter(teacher => {
      if (!dia_semana || !hora_inicio || !hora_fin) return true;

      const existingSchedules = (teacher.cursos || []).flatMap(c => c.horarios || []);
      const hasConflict = existingSchedules.some(schedule =>
        schedule.dia_semana === dia_semana &&
        schedule.hora_inicio < hora_fin &&
        schedule.hora_fin > hora_inicio
      );
      return !hasConflict;
    });

    res.json(availableTeachers);
  } catch (error) {
    next(error);
  }
};

module.exports = { create, getAll, getById, update, delete: softDelete, getByTeacher, getByStudent, getAvailableTeachers };
