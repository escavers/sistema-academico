const router = require('express').Router();
const academicPeriodController = require('../controllers/academicPeriod.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { verifyRole } = require('../middlewares/role.middleware');

// Parameterized path before /:id to avoid conflicts
router.get('/active', verifyToken, academicPeriodController.getActive);

router.get('/', verifyToken, academicPeriodController.getAll);
router.post('/', verifyToken, verifyRole('Administrador'), academicPeriodController.create);
router.put('/:id', verifyToken, verifyRole('Administrador'), academicPeriodController.update);

module.exports = router;
