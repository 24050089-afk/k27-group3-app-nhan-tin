const express = require('express');
const { body } = require('express-validator');
const { getAll, getById, create, update, remove, getMyProducts } = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

const productRules = [
  body('name').notEmpty().withMessage('Tên sản phẩm không được để trống.'),
  body('price').isFloat({ min: 0 }).withMessage('Giá phải là số dương.'),
  body('stock').isInt({ min: 0 }).withMessage('Tồn kho phải là số nguyên dương.'),
];

router.get('/', getAll);
router.get('/my', protect, getMyProducts);
router.get('/:id', getById);
router.post('/', protect, validate(productRules), create);
router.put('/:id', protect, validate(productRules), update);
router.delete('/:id', protect, remove);

module.exports = router;
