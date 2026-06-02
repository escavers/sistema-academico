const { AcademicPeriod, User, Notification } = require('../models');

const getAll = async (req, res, next) => {
  try {
    const periods = await AcademicPeriod.findAll({ order: [['fecha_inicio', 'DESC']] });
    res.json(periods);
  } catch (error) {
    next(error);
  }
};

const getActive = async (req, res, next) => {
  try {
    const period = await AcademicPeriod.findOne({ where: { estado: true }, order: [['fecha_inicio', 'DESC']] });
    if (!period) return res.status(404).json({ message: 'No hay período académico activo' });
    res.json(period);
  } catch (error) {
    next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { codigo, fecha_inicio, fecha_fin, estado } = req.body;
    if (!codigo || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ message: 'codigo, fecha_inicio y fecha_fin son requeridos' });
    }

    if (estado) {
      await AcademicPeriod.update({ estado: false }, { where: { estado: true } });
    }

    const period = await AcademicPeriod.create({ codigo, fecha_inicio, fecha_fin, estado });

    if (estado) {
      const users = await User.findAll({ where: { estado: true }, attributes: ['id'] });
      await Notification.bulkCreate(users.map(user => ({
        titulo: 'Nuevo periodo académico activo',
        mensaje: `Se ha habilitado el período académico ${codigo}`,
        id_usuario: user.id,
      })));
    }

    res.status(201).json({ message: 'Período académico creado', period });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const period = await AcademicPeriod.findByPk(req.params.id);
    if (!period) return res.status(404).json({ message: 'Período académico no encontrado' });
    const { codigo, fecha_inicio, fecha_fin, estado } = req.body;

    if (estado) {
      await AcademicPeriod.update({ estado: false }, { where: { estado: true } });
    }

    await period.update({ codigo, fecha_inicio, fecha_fin, estado });

    if (estado) {
      const users = await User.findAll({ where: { estado: true }, attributes: ['id'] });
      await Notification.bulkCreate(users.map(user => ({
        titulo: 'Nuevo periodo académico activo',
        mensaje: `Se ha habilitado el período académico ${codigo}`,
        id_usuario: user.id,
      })));
    }

    res.json({ message: 'Período académico actualizado', period });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getActive, create, update };
