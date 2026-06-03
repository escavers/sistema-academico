const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TeacherCareer = sequelize.define('TeacherCareer', {
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
  licenciatura: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
}, {
  tableName: 'docente_carrera',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_docente', 'id_carrera'] },
  ],
});

module.exports = TeacherCareer;
