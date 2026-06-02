const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Schedule = sequelize.define('Schedule', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  dia_semana: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  hora_inicio: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  hora_fin: {
    type: DataTypes.TIME,
    allowNull: false,
  },
  aula: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  id_curso: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'curso', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'horario',
  timestamps: false,
});

module.exports = Schedule;
