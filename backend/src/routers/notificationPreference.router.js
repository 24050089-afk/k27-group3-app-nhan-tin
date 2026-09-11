const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const controller = require('../controllers/notification.controller');

const router = express.Router();
router.use(protect);
router.get('/', controller.getPreferences);
router.patch('/', controller.updatePreferences);
module.exports = router;
