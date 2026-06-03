const router = require('express').Router();
const teacherController = require('../controllers/teacher.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, teacherController.getAll);
router.get('/:id', verifyToken, teacherController.getById);

module.exports = router;
