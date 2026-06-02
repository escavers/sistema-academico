const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Grade = sequelize.define('Grade', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nota: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 100,
    },
  },
  observacion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  fecha_registro: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  id_inscripcion: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: { model: 'inscripcion', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  id_docente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'docente', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
}, {
  tableName: 'calificacion',
  timestamps: false,
});

module.exports = Grade;
