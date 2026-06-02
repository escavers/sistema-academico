const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Course = sequelize.define('Course', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  codigo_grupo: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  cupo_maximo: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  id_materia: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'materia', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  id_periodo_academico: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'periodo_academico', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  id_docente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'docente', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  id_administrador: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'administrador', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
}, {
  tableName: 'curso',
  timestamps: false,
});

module.exports = Course;
