const express = require('express');
const authRouter = require('./auth.router');
const userRouter = require('./user.router');
const friendshipRouter = require('./friendship.router');
const conversationRouter = require('./conversation.router');
const messageRouter = require('./message.router');
const uploadRouter = require('./upload.router');
const noteRouter = require('./note.router');
const notificationRouter = require('./notification.router');
const notificationPreferenceRouter = require('./notificationPreference.router');
const pushDeviceRouter = require('./pushDevice.router');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/social', friendshipRouter);
router.use('/conversations', conversationRouter);
router.use('/messages', messageRouter);
router.use('/upload', uploadRouter);
router.use('/notes', noteRouter);
router.use('/notifications', notificationRouter);
router.use('/notification-preferences', notificationPreferenceRouter);
router.use('/push-devices', pushDeviceRouter);

module.exports = router;
