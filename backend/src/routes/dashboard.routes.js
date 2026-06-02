const router = require('express').Router();
const dashboardController = require('../controllers/dashboard.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.get('/student', verifyToken, verifyRole('Estudiante'), dashboardController.getStudentDashboard);
router.get('/teacher', verifyToken, verifyRole('Docente'), dashboardController.getTeacherDashboard);
router.get('/admin', verifyToken, verifyRole('Administrador'), dashboardController.getAdminDashboard);

module.exports = router;
