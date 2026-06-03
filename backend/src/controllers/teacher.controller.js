const { Teacher, User, Career, TeacherCareer, TeacherSpecialty } = require('../models');

const getAll = async (req, res, next) => {
  try {
    const teachers = await Teacher.findAll({
      include: [
        { model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } },
        { model: TeacherCareer, as: 'docenteCarreras', include: [{ model: Career, as: 'carrera' }] },
        { model: TeacherSpecialty, as: 'especialidades', include: [{ model: Career, as: 'carrera' }] },
      ],
    });
    res.json(teachers);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const teacher = await Teacher.findByPk(req.params.id, {
      include: [
        { model: User, as: 'usuario', attributes: { exclude: ['contrasena'] } },
        { model: TeacherCareer, as: 'docenteCarreras', include: [{ model: Career, as: 'carrera' }] },
        { model: TeacherSpecialty, as: 'especialidades', include: [{ model: Career, as: 'carrera' }] },
      ],
    });
    if (!teacher) return res.status(404).json({ message: 'Docente no encontrado' });
    res.json(teacher);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById };
