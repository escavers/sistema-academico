const router = require('express').Router();
const courseController = require('../controllers/course.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

// Parameterized paths before /:id to avoid conflicts
router.get('/teacher/:teacherId', verifyToken, courseController.getByTeacher);
router.get('/student/:studentId', verifyToken, courseController.getByStudent);

router.post('/', verifyToken, verifyRole('Administrador'), courseController.create);
router.get('/', verifyToken, courseController.getAll);
router.get('/:id', verifyToken, courseController.getById);
router.put('/:id', verifyToken, verifyRole('Administrador'), courseController.update);
router.delete('/:id', verifyToken, verifyRole('Administrador'), courseController.delete);

module.exports = router;
