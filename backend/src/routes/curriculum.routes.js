const router = require('express').Router();
const curriculumController = require('../controllers/curriculum.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.get('/student/my-curriculum', verifyToken, curriculumController.getStudentCurriculum);
router.get('/', verifyToken, curriculumController.getAll);
router.get('/:id', verifyToken, curriculumController.getById);
router.post('/', verifyToken, verifyRole('Administrador'), curriculumController.create);
router.put('/:id', verifyToken, verifyRole('Administrador'), curriculumController.update);
router.put('/:id/subjects', verifyToken, verifyRole('Administrador'), curriculumController.setSubjects);
router.delete('/:id/subjects/:subjectId', verifyToken, verifyRole('Administrador'), curriculumController.removeSubject);
router.delete('/:id', verifyToken, verifyRole('Administrador'), curriculumController.delete);

module.exports = router;