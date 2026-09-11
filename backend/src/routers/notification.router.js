const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const controller = require('../controllers/notification.controller');

const router = express.Router();
router.use(protect);
router.get('/', controller.listNotifications);
router.get('/unread-count', controller.unreadCount);
router.patch('/:id/read', controller.markRead);
router.post('/read-all', controller.markAllRead);
module.exports = router;
