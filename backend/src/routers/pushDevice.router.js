const express = require('express');
const { protect } = require('../middlewares/auth.middleware');
const controller = require('../controllers/notification.controller');

const router = express.Router();
router.use(protect);
router.put('/:installationId', controller.upsertPushDevice);
router.delete('/:installationId', controller.revokePushDevice);
module.exports = router;
