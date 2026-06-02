const { Modality } = require('../models');

const getAll = async (req, res, next) => {
  try {
    const modalities = await Modality.findAll({ order: [['id', 'ASC']] });
    res.json(modalities);
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll };
