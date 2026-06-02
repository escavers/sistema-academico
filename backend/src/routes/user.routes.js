const router = require('express').Router();
const userController = require('../controllers/user.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole, verifyOwnerOrAdmin } = require('../middlewares/role.middleware');

router.get('/', verifyToken, verifyRole('Administrador'), userController.getAll);
router.get('/:id', verifyToken, verifyOwnerOrAdmin(), userController.getById);
router.put('/:id', verifyToken, verifyOwnerOrAdmin(), userController.update);
router.put('/:id/password', verifyToken, verifyOwnerOrAdmin(), userController.changePassword);
router.delete('/:id', verifyToken, verifyRole('Administrador'), userController.delete);
router.put('/:id/role', verifyToken, verifyRole('Administrador'), userController.assignRole);

module.exports = router;
