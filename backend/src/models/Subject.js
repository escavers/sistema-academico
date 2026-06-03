const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subject = sequelize.define('Subject', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  codigo: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
  },
  nombre: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  creditos: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  id_carrera: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'carrera', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  id_prerequisito: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'materia', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
}, {
  tableName: 'materia',
  timestamps: false,
});

module.exports = Subject;
