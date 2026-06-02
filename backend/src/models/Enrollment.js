const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Enrollment = sequelize.define('Enrollment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  fecha_inscripcion: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW,
  },
  estado: {
    type: DataTypes.STRING(30),
    allowNull: false,
  },
  id_estudiante: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'estudiante', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  id_curso: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'curso', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'inscripcion',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['id_estudiante', 'id_curso'],
    },
  ],
});

module.exports = Enrollment;
