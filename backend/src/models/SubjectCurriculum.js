const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SubjectCurriculum = sequelize.define('SubjectCurriculum', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  id_materia: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'materia', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  id_pensum: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'pensum', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  semestre: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
    },
  },
}, {
  tableName: 'materia_pensum',
  timestamps: false,
  indexes: [
    { unique: true, fields: ['id_pensum', 'id_materia'] },
  ],
});

module.exports = SubjectCurriculum;
