const express = require('express');
const authRouter = require('./auth.router');
const userRouter = require('./user.router');
const friendshipRouter = require('./friendship.router');
const conversationRouter = require('./conversation.router');
const messageRouter = require('./message.router');
const uploadRouter = require('./upload.router');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/social', friendshipRouter);
router.use('/conversations', conversationRouter);
router.use('/messages', messageRouter);
router.use('/upload', uploadRouter);

module.exports = router;
