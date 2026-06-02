const jwt = require('jsonwebtoken');
const { BlacklistedToken } = require('../models');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'sistema_academico_secret_key_2024';

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ message: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Formato de token inválido' });
  }

  try {
    const blacklisted = await BlacklistedToken.findOne({ where: { token } });
    if (blacklisted) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = { verifyToken, JWT_SECRET };
