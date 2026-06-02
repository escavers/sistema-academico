const { Subject, Curriculum, Career, Modality, SubjectCurriculum } = require('../models');

const getAll = async (req, res, next) => {
  try {
    const subjects = await Subject.findAll({
      include: [
        {
          model: Curriculum,
          as: 'pensums',
          through: { attributes: ['semestre'] },
          include: [{ model: Career, as: 'carrera', include: [{ model: Modality, as: 'modalidad' }] }],
        },
      ],
    });
    res.json(subjects);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id, {
      include: [
        {
          model: Curriculum,
          as: 'pensums',
          through: { attributes: ['semestre'] },
          include: [{ model: Career, as: 'carrera' }],
        },
      ],
    });
    if (!subject) return res.status(404).json({ message: 'Materia no encontrada' });
    res.json(subject);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { codigo, nombre, creditos, descripcion, id_pensum, id_pensums } = req.body;
    const pensumIds = Array.isArray(id_pensums) ? id_pensums : (id_pensum ? [id_pensum] : []);

    const subject = await Subject.create({
      codigo,
      nombre,
      creditos: creditos ?? 0,
      descripcion,
    });

    if (pensumIds.length > 0) {
      await Promise.all(pensumIds.map((pensumId) => SubjectCurriculum.findOrCreate({
        where: { id_pensum: pensumId, id_materia: subject.id },
        defaults: { semestre: 1 },
      })));
    }

    res.status(201).json({ message: 'Materia creada', subject });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Materia no encontrada' });

    const { codigo, nombre, creditos, descripcion, id_pensum, id_pensums } = req.body;
    const pensumIds = Array.isArray(id_pensums) ? id_pensums : (id_pensum ? [id_pensum] : []);

    const updateData = {
      codigo,
      nombre,
      creditos: creditos ?? subject.creditos,
      descripcion,
    };

    await subject.update(updateData);

    if (pensumIds.length > 0) {
      await Promise.all(pensumIds.map((pensumId) => SubjectCurriculum.findOrCreate({
        where: { id_pensum: pensumId, id_materia: subject.id },
        defaults: { semestre: 1 },
      })));
    }

    res.json({ message: 'Materia actualizada', subject });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    const subject = await Subject.findByPk(req.params.id);
    if (!subject) return res.status(404).json({ message: 'Materia no encontrada' });
    await subject.destroy();
    res.json({ message: 'Materia eliminada' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, delete: remove };
