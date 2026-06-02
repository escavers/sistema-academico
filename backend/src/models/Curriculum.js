const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Curriculum = sequelize.define('Curriculum', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombre: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Plan sin nombre',
  },
  anio_creacion: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  id_carrera: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'carrera', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'pensum',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_carrera', 'nombre'] },
  ],
});

module.exports = Curriculum;
