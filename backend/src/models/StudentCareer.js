const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const StudentCareer = sequelize.define('StudentCareer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_estudiante: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'estudiante', key: 'id' },
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
}, {
  tableName: 'estudiante_carrera',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_estudiante', 'id_carrera'] },
  ],
});

module.exports = StudentCareer;
