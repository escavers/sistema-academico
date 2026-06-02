const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  nombres: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  apellido_paterno: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  apellido_materno: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  nombre_usuario: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  contrasena: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  estado: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  id_rol: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'rol', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'RESTRICT',
  },
}, {
  tableName: 'usuario',
  timestamps: false,
});

module.exports = User;
