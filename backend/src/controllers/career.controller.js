const { Career, Modality, Curriculum, Subject } = require('../models');

/**
 * Generate auto code from name: first 3 uppercase letters + "-" + padded id
 */
const generateCareerCode = async (nombre) => {
  const prefix = nombre
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();
  const lastCareer = await Career.findOne({ order: [['id', 'DESC']] });
  const nextId = (lastCareer?.id || 0) + 1;
  return `${prefix || 'CAR'}-${String(nextId).padStart(3, '0')}`;
};

const getAll = async (req, res, next) => {
  try {
    const careers = await Career.findAll({
      include: [
        { model: Modality, as: 'modalidad' },
        { model: Curriculum, as: 'pensums' },
      ],
    });
    res.json(careers);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    const career = await Career.findByPk(req.params.id, {
      include: [{
        model: Modality, as: 'modalidad',
      }, {
        model: Curriculum,
        as: 'pensums',
        include: [{ model: Subject, as: 'materias' }],
      }],
    });
    if (!career) return res.status(404).json({ message: 'Carrera no encontrada' });
    res.json(career);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { nombre, descripcion, id_modalidad } = req.body;

    // Auto-generate code
    const codigo = await generateCareerCode(nombre || 'CAR');

    const career = await Career.create({ codigo, nombre, descripcion, id_modalidad });
    await Curriculum.create({
      anio_creacion: new Date().toISOString().slice(0, 10),
      id_carrera: career.id,
    });
    res.status(201).json({ message: 'Carrera creada', career });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const career = await Career.findByPk(req.params.id);
    if (!career) return res.status(404).json({ message: 'Carrera no encontrada' });
    const { codigo, nombre, descripcion, estado, id_modalidad } = req.body;
    await career.update({ codigo, nombre, descripcion, estado, id_modalidad });
    res.json({ message: 'Carrera actualizada', career });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    const career = await Career.findByPk(req.params.id);
    if (!career) return res.status(404).json({ message: 'Carrera no encontrada' });
    await career.destroy();
    res.json({ message: 'Carrera eliminada permanentemente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, create, update, delete: softDelete };
