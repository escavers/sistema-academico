const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TeacherSpecialty = sequelize.define('TeacherSpecialty', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_docente: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'docente', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  id_carrera: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'carrera', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  especialidad: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
}, {
  tableName: 'docente_especialidad',
  timestamps: false,
});

module.exports = TeacherSpecialty;
