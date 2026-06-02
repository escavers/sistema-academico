const router = require('express').Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

// Public routes
router.post('/login', authController.login);

// Admin-only registration and logout
router.post('/register', verifyToken, verifyRole('Administrador'), authController.register);
router.post('/logout', verifyToken, authController.logout);

// Protected routes
router.get('/profile', verifyToken, authController.getProfile);

module.exports = router;
