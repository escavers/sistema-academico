const verifyRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const userRole = req.user.rol;
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'No tiene permisos para realizar esta acción' });
    }
    next();
  };
};

const verifyOwnerOrAdmin = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    const targetId = Number(req.params.id);
    if (req.user.rol === 'Administrador' || Number(req.user.id) === targetId) {
      return next();
    }

    return res.status(403).json({ message: 'No tiene permisos para realizar esta acción' });
  };
};

module.exports = { verifyRole, verifyOwnerOrAdmin };
