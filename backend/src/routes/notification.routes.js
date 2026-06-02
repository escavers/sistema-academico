const router = require('express').Router();
const notificationController = require('../controllers/notification.controller');
const { verifyToken } = require('../middlewares/auth.middleware');

// Parameterized paths before /:id to avoid conflicts
router.get('/user/:userId', verifyToken, notificationController.getByUser);
router.put('/user/:userId/read-all', verifyToken, notificationController.markAllAsRead);
router.get('/user/:userId/unread-count', verifyToken, notificationController.getUnreadCount);

router.post('/', verifyToken, notificationController.create);
router.put('/:id/read', verifyToken, notificationController.markAsRead);

module.exports = router;
