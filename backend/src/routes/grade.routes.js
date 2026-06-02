const router = require('express').Router();
const gradeController = require('../controllers/grade.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

// Parameterized paths before /:id to avoid conflicts
router.get('/enrollment/:enrollmentId', verifyToken, gradeController.getByEnrollment);
router.get('/student/:studentId', verifyToken, gradeController.getByStudent);
router.get('/course/:courseId', verifyToken, gradeController.getByCourse);

router.post('/', verifyToken, verifyRole('Docente'), gradeController.create);
router.put('/:id', verifyToken, verifyRole('Docente'), gradeController.update);

module.exports = router;
