const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Teacher = sequelize.define('Teacher', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: false,
    references: { model: 'usuario', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  especialidad: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  telefono: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
}, {
  tableName: 'docente',
  timestamps: false,
});

module.exports = Teacher;
