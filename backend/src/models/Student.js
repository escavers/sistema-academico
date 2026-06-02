const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Student = sequelize.define('Student', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false,
    references: { model: 'usuario', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  matricula: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  fecha_nacimiento: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  id_carrera: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'carrera', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  id_pensum: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'pensum', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
  fecha_inscripcion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  tableName: 'estudiante',
  timestamps: false,
});

module.exports = Student;
