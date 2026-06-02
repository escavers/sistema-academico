const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Modality = sequelize.define('Modality', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  max_materias_permitidas: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
}, {
  tableName: 'modalidad',
  timestamps: false,
});

module.exports = Modality;
