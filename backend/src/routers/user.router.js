const express = require('express');
const { body } = require('express-validator');
const { getAll, getById, updateProfile, deleteUser } = require('../controllers/user.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

router.use(protect);

router.get('/', adminOnly, getAll);
router.get('/:id', getById);

router.patch(
  '/me',
  validate([body('name').optional().notEmpty().withMessage('Tên không được để trống.')]),
  updateProfile
);

router.delete('/:id', adminOnly, deleteUser);

module.exports = router;
