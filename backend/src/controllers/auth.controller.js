const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Op, fn, col, where } = require('sequelize');
const { User, Role, Student, Teacher, Admin, BlacklistedToken, Career, Curriculum } = require('../models');
const { JWT_SECRET } = require('../middlewares/auth.middleware');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

const register = async (req, res, next) => {
  try {
    const {
      nombres, apellido_paterno, apellido_materno, email,
      nombre_usuario, contrasena, id_rol,
      matricula, telefono, fecha_nacimiento,
      especialidad, id_carrera, id_pensum,
    } = req.body;

    if (!nombres || !apellido_paterno || !email || !nombre_usuario || !contrasena || !id_rol) {
      return res.status(400).json({ message: 'Campos obligatorios faltantes' });
    }

    if (![1, 2, 3].includes(Number(id_rol))) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    const normalizedEmail = email?.trim().toLowerCase();
    const normalizedUsername = nombre_usuario?.trim().toLowerCase();

    const existing = await User.findOne({
      where: {
        [Op.or]: [
          where(fn('lower', col('email')), normalizedEmail),
          where(fn('lower', col('nombre_usuario')), normalizedUsername),
          where(fn('lower', col('email')), normalizedUsername),
          where(fn('lower', col('nombre_usuario')), normalizedEmail),
        ],
      },
    });

    if (existing) {
      return res.status(409).json({ message: 'Email o nombre de usuario ya existe' });
    }

    if ((Number(id_rol) === 3) && matricula) {
      const sameMatricula = await Student.findOne({ where: { matricula } });
      if (sameMatricula) {
        return res.status(409).json({ message: 'La matrícula ya está registrada en otro estudiante' });
      }
    }

    if ((Number(id_rol) === 3) && !matricula) {
      return res.status(400).json({ message: 'La matrícula es obligatoria para estudiantes' });
    }
    if ((Number(id_rol) === 3) && !id_carrera) {
      return res.status(400).json({ message: 'La carrera es obligatoria para estudiantes' });
    }
    if ((Number(id_rol) === 3) && !id_pensum) {
      return res.status(400).json({ message: 'El pensum es obligatorio para estudiantes' });
    }
    if ((Number(id_rol) === 2) && !especialidad) {
      return res.status(400).json({ message: 'La especialidad es obligatoria para docentes' });
    }

    const hashed = await bcrypt.hash(contrasena, 10);

    const user = await User.create({
      nombres,
      apellido_paterno,
      apellido_materno,
      email: normalizedEmail,
      nombre_usuario: normalizedUsername,
      contrasena: hashed,
      id_rol,
    });

    if (Number(id_rol) === 3) {
      const career = await Career.findByPk(id_carrera);
      if (!career) {
        return res.status(404).json({ message: 'Carrera no encontrada para el estudiante' });
      }

      const pensum = await Curriculum.findByPk(id_pensum);
      if (!pensum) {
        return res.status(404).json({ message: 'Pensum no encontrado para el estudiante' });
      }
      if (pensum.id_carrera !== career.id) {
        return res.status(400).json({ message: 'El pensum no pertenece a la carrera indicada' });
      }

      await Student.create({ id: user.id, matricula, telefono, fecha_nacimiento, id_carrera, id_pensum });
    } else if (Number(id_rol) === 2) {
      await Teacher.create({ id: user.id, especialidad, telefono });
    } else if (Number(id_rol) === 1) {
      await Admin.create({ id: user.id });
    }

    const { contrasena: _, ...userOut } = user.toJSON();
    res.status(201).json({ message: 'Usuario registrado exitosamente', user: userOut });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, nombre_usuario, contrasena } = req.body;
    const identifier = email || nombre_usuario;

    if (!identifier || !contrasena) {
      return res.status(400).json({ message: 'Email o nombre de usuario y contraseña son requeridos' });
    }

    const normalizedIdentifier = identifier.trim().toLowerCase();

    const user = await User.findOne({
      where: {
        [Op.or]: [
          where(fn('lower', col('email')), normalizedIdentifier),
          where(fn('lower', col('nombre_usuario')), normalizedIdentifier),
        ],
      },
      include: [{ model: Role, as: 'rol' }],
    });

    if (!user || !user.estado) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const match = await bcrypt.compare(contrasena, user.contrasena);
    if (!match) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const payload = {
      id: user.id,
      nombre_usuario: user.nombre_usuario,
      rol: user.rol.nombre,
      id_rol: user.id_rol,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.json({
      token,
      user: {
        id: user.id,
        nombres: user.nombres,
        apellido_paterno: user.apellido_paterno,
        email: user.email,
        rol: user.rol.nombre,
        id_rol: user.id_rol,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return res.status(400).json({ message: 'Token no proporcionado' });
    }

    const existing = await BlacklistedToken.findOne({ where: { token } });
    if (!existing) {
      await BlacklistedToken.create({ token });
    }

    res.json({ message: 'Cierre de sesión exitoso' });
  } catch (error) {
    next(error);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await User.findByPk(userId, {
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

module.exports = { register, login, logout, getProfile };