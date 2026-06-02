const { Op } = require('sequelize');
const { Curriculum, Career, Subject, Student, SubjectCurriculum } = require('../models');

const groupBySemester = (materias = []) => {
  return materias.reduce((acc, materia) => {
    const semestre = materia.SubjectCurriculum?.semestre;
    if (semestre === undefined || semestre === null) return acc;
    if (!acc[semestre]) acc[semestre] = [];
    acc[semestre].push(materia);
    return acc;
  }, {});
};

const getAll = async (req, res, next) => {
  try {
    const pensums = await Curriculum.findAll({
      include: [
        { model: Career, as: 'carrera' },
        {
          model: Subject,
          as: 'materias',
          through: { attributes: ['semestre'] },
        },
      ],
      order: [['id', 'ASC']],
    });

    const result = pensums.map((pensum) => {
      const record = pensum.toJSON();
      record.materiasPorSemestre = groupBySemester(record.materias);
      return record;
    });

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const pensum = await Curriculum.findByPk(req.params.id, {
      include: [
        { model: Career, as: 'carrera' },
        {
          model: Subject,
          as: 'materias',
          through: { attributes: ['semestre'] },
          attributes: ['id', 'codigo', 'nombre', 'creditos', 'descripcion'],
        },
      ],
    });
    if (!pensum) return res.status(404).json({ message: 'Pensum no encontrado' });

    const result = pensum.toJSON();
    result.materiasPorSemestre = groupBySemester(result.materias);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { id_carrera, nombre, anio_creacion, estado = true } = req.body;
    if (!id_carrera) return res.status(400).json({ message: 'id_carrera es obligatorio' });
    if (!nombre) return res.status(400).json({ message: 'nombre del pensum es obligatorio' });

    const career = await Career.findByPk(id_carrera);
    if (!career) return res.status(404).json({ message: 'Carrera no encontrada' });

    const existing = await Curriculum.findOne({ where: { id_carrera, nombre } });
    if (existing) return res.status(409).json({ message: 'Ya existe un pensum con el mismo nombre para esta carrera' });

    const pensum = await Curriculum.create({
      id_carrera,
      nombre,
      anio_creacion: anio_creacion || new Date().toISOString().slice(0, 10),
      estado,
    });

    res.status(201).json({ message: 'Pensum creado', pensum });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const pensum = await Curriculum.findByPk(req.params.id);
    if (!pensum) return res.status(404).json({ message: 'Pensum no encontrado' });

    const { nombre, anio_creacion, estado } = req.body;
    const updateData = {};
    if (typeof nombre !== 'undefined') updateData.nombre = nombre;
    if (typeof anio_creacion !== 'undefined') updateData.anio_creacion = anio_creacion;
    if (typeof estado !== 'undefined') updateData.estado = estado;

    await pensum.update(updateData);
    res.json({ message: 'Pensum actualizado', pensum });
  } catch (error) {
    next(error);
  }
};

const setSubjects = async (req, res, next) => {
  try {
    const pensum = await Curriculum.findByPk(req.params.id);
    if (!pensum) return res.status(404).json({ message: 'Pensum no encontrado' });

    const { assignments } = req.body;
    if (!Array.isArray(assignments) || assignments.length === 0) {
      return res.status(400).json({ message: 'Asignaciones de materias inválidas' });
    }

    const subjectIds = assignments.map((assignment) => Number(assignment.subjectId)).filter(Boolean);
    if (subjectIds.length !== assignments.length) {
      return res.status(400).json({ message: 'Cada asignación debe contener subjectId válido' });
    }

    const subjects = await Subject.findAll({ where: { id: subjectIds } });
    if (subjects.length !== subjectIds.length) {
      return res.status(404).json({ message: 'Una o más materias no fueron encontradas' });
    }

    const prepared = assignments.map((assignment) => ({
      id_pensum: pensum.id,
      id_materia: Number(assignment.subjectId),
      semestre: Number(assignment.semestre) || 1,
    }));

    await SubjectCurriculum.destroy({
      where: {
        id_pensum: pensum.id,
        id_materia: { [Op.notIn]: subjectIds },
      },
    });

    await Promise.all(prepared.map((record) => SubjectCurriculum.upsert(record)));

    res.json({ message: 'Asignación de materias actualizada' });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const pensum = await Curriculum.findByPk(req.params.id);
    if (!pensum) return res.status(404).json({ message: 'Pensum no encontrado' });

    const assignedStudents = await Student.count({ where: { id_pensum: pensum.id } });
    if (assignedStudents > 0) {
      return res.status(409).json({ message: 'No se puede eliminar un pensum asignado a estudiantes' });
    }

    await pensum.destroy();
    res.json({ message: 'Pensum eliminado' });
  } catch (error) {
    next(error);
  }
};

const removeSubject = async (req, res, next) => {
  try {
    const { id, subjectId } = req.params;
    const deleted = await SubjectCurriculum.destroy({
      where: { id_pensum: id, id_materia: subjectId },
    });
    if (!deleted) return res.status(404).json({ message: 'La materia no está asociada a este pensum' });
    res.json({ message: 'Materia removida del pensum' });
  } catch (error) {
    next(error);
  }
};

// ── Get student's curriculum ────────────────────────────────────────────────
const getStudentCurriculum = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const student = await Student.findByPk(userId, {
      include: [
        {
          model: Curriculum,
          as: 'pensum',
          include: [
            { model: Career, as: 'carrera' },
            {
              model: Subject,
              as: 'materias',
              through: { attributes: ['semestre'] },
              attributes: ['id', 'codigo', 'nombre', 'creditos', 'descripcion'],
            },
          ],
        },
      ],
    });

    if (!student) return res.status(404).json({ message: 'Estudiante no encontrado' });
    if (!student.pensum) return res.status(404).json({ message: 'No hay pensum asignado al estudiante' });

    const pensum = student.pensum.toJSON();
    pensum.materiasPorSemestre = groupBySemester(pensum.materias);

    res.json({ message: 'Malla curricular encontrada', pensum });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, setSubjects, removeSubject, delete: remove, getStudentCurriculum };