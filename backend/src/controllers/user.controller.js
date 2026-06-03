const bcrypt = require('bcrypt');
const { Op } = require('sequelize');
const { User, Role, Student, Teacher, Admin } = require('../models');

const getAll = async (req, res, next) => {
  try {
    const users = await User.findAll({
      include: [{ model: Role, as: 'rol' }],
      attributes: { exclude: ['contrasena'] },
    });
    res.json(users);
  } catch (error) {
    next(error);
  }
};

const getById = async (req, res, next) => {
  try {
    if (req.user.rol !== 'Administrador' && Number(req.user.id) !== Number(req.params.id)) {
      return res.status(403).json({ message: 'No tiene permisos para ver este perfil' });
    }

    const user = await User.findByPk(req.params.id, {
      include: [
        { model: Role, as: 'rol' },
        { model: Student, as: 'estudiante', required: false },
        { model: Teacher, as: 'docente', required: false },
        { model: Admin, as: 'administrador', required: false },
      ],
      attributes: { exclude: ['contrasena'] },
    });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    if (req.user.rol !== 'Administrador' && Number(req.user.id) !== Number(req.params.id)) {
      return res.status(403).json({ message: 'No tiene permisos para editar este perfil' });
    }

    const { nombres, apellido_paterno, apellido_materno, email, nombre_usuario, estado } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const updateFields = {};
    if (nombres !== undefined) updateFields.nombres = nombres;
    if (apellido_paterno !== undefined) updateFields.apellido_paterno = apellido_paterno;
    if (apellido_materno !== undefined) updateFields.apellido_materno = apellido_materno;
    if (email !== undefined) updateFields.email = email;
    if (nombre_usuario !== undefined) updateFields.nombre_usuario = nombre_usuario;
    if (estado !== undefined) updateFields.estado = estado;

    const orConditions = [];
    if (email) orConditions.push({ email });
    if (nombre_usuario) orConditions.push({ nombre_usuario });

    if (orConditions.length > 0) {
      const duplicate = await User.findOne({
        where: {
          id: { [Op.ne]: user.id },
          [Op.or]: orConditions,
        },
      });

      if (duplicate) {
        return res.status(409).json({ message: 'El correo o nombre de usuario ya está en uso' });
      }
    }

    await user.update(updateFields);
    const { contrasena: _, ...userOut } = user.toJSON();
    res.json({ message: 'Usuario actualizado', user: userOut });
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    if (req.user.rol !== 'Administrador' && Number(req.user.id) !== Number(req.params.id)) {
      return res.status(403).json({ message: 'No tiene permisos para cambiar esta contraseña' });
    }

    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ message: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    if (req.user.rol !== 'Administrador') {
      if (!currentPassword) {
        return res.status(400).json({ message: 'La contraseña actual es obligatoria' });
      }

      const match = await bcrypt.compare(currentPassword, user.contrasena);
      if (!match) return res.status(401).json({ message: 'Contraseña actual incorrecta' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await user.update({ contrasena: hashed });
    res.json({ message: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    next(error);
  }
};

const softDelete = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    await user.update({ estado: false });
    res.json({ message: 'Usuario desactivado exitosamente' });
  } catch (error) {
    next(error);
  }
};

const assignRole = async (req, res, next) => {
  try {
    const { id_rol } = req.body;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    await user.update({ id_rol });
    res.json({ message: 'Rol asignado exitosamente' });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, getById, update, changePassword, delete: softDelete, assignRole };
