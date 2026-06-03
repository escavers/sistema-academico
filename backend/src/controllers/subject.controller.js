const { Subject, Curriculum, Career, Modality, SubjectCurriculum } = require('../models');

/**
 * Generate auto code from name: first 3 uppercase letters + "-" + padded id
 */
const generateSubjectCode = async (nombre) => {
  const prefix = nombre
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();
  const lastSubject = await Subject.findOne({ order: [['id', 'DESC']] });
  const nextId = (lastSubject?.id || 0) + 1;
  return `${prefix || 'MAT'}-${String(nextId).padStart(3, '0')}`;
};

const getAll = async (req, res, next) => {
  try {
    const isPaginated = req.query.page || req.query.limit;

    const includeOptions = [
      {
        model: Curriculum,
        as: 'pensums',
        through: { attributes: ['semestre'] },
        include: [{ model: Career, as: 'carrera', include: [{ model: Modality, as: 'modalidad' }] }],
      },
      { model: Career, as: 'carrera' },
      { model: Subject, as: 'prerequisito' },
    ];

    if (isPaginated) {
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const offset = (page - 1) * limit;

      const { count, rows } = await Subject.findAndCountAll({
        limit,
        offset,
        distinct: true,
        include: includeOptions,
      });

      return res.json({
        data: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
      });
    }

    const subjects = await Subject.findAll({ include: includeOptions });
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
        { model: Career, as: 'carrera' },
        { model: Subject, as: 'prerequisito' },
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
    const { nombre, creditos, descripcion, id_pensum, id_pensums, id_carrera, id_prerequisito } = req.body;
    const pensumIds = Array.isArray(id_pensums) ? id_pensums : (id_pensum ? [id_pensum] : []);

    // Auto-generate code
    const codigo = await generateSubjectCode(nombre || 'MAT');

    const subject = await Subject.create({
      codigo,
      nombre,
      creditos: creditos ?? 0,
      descripcion,
      id_carrera: id_carrera || null,
      id_prerequisito: id_prerequisito || null,
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

    const { codigo, nombre, creditos, descripcion, id_pensum, id_pensums, id_carrera, id_prerequisito } = req.body;
    const pensumIds = Array.isArray(id_pensums) ? id_pensums : (id_pensum ? [id_pensum] : []);

    const updateData = {
      nombre,
      creditos: creditos ?? subject.creditos,
      descripcion,
      id_carrera: id_carrera !== undefined ? (id_carrera || null) : subject.id_carrera,
      id_prerequisito: id_prerequisito !== undefined ? (id_prerequisito || null) : subject.id_prerequisito,
    };

    // Only update codigo if explicitly provided (for backwards compatibility)
    if (codigo !== undefined) {
      updateData.codigo = codigo;
    }

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
