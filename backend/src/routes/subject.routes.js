const router = require('express').Router();
const subjectController = require('../controllers/subject.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.get('/', verifyToken, subjectController.getAll);
router.get('/:id', verifyToken, subjectController.getById);
router.post('/', verifyToken, verifyRole('Administrador'), subjectController.create);
router.put('/:id', verifyToken, verifyRole('Administrador'), subjectController.update);
router.delete('/:id', verifyToken, verifyRole('Administrador'), subjectController.delete);

module.exports = router;
