const router = require('express').Router();
const enrollmentController = require('../controllers/enrollment.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

// Parameterized paths before /:id to avoid conflicts
router.get('/student/:studentId', verifyToken, enrollmentController.getByStudent);
router.get('/course/:courseId', verifyToken, enrollmentController.getByCourse);

router.post('/', verifyToken, verifyRole('Estudiante'), enrollmentController.create);
router.put('/:id/cancel', verifyToken, enrollmentController.cancel);

module.exports = router;
