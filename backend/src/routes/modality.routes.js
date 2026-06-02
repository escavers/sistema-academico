const router = require('express').Router();
const modalityController = require('../controllers/modality.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

router.get('/', verifyToken, modalityController.getAll);

module.exports = router;
