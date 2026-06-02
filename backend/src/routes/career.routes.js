const router = require('express').Router();
const careerController = require('../controllers/career.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

router.get('/', verifyToken, careerController.getAll);
router.get('/:id', verifyToken, careerController.getById);
router.post('/', verifyToken, verifyRole('Administrador'), careerController.create);
router.put('/:id', verifyToken, verifyRole('Administrador'), careerController.update);
router.delete('/:id', verifyToken, verifyRole('Administrador'), careerController.delete);

module.exports = router;
