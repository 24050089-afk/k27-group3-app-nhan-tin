const express = require('express');
const authRouter = require('./auth.router');
const userRouter = require('./user.router');
const productRouter = require('./product.router');

const router = express.Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/products', productRouter);

module.exports = router;
