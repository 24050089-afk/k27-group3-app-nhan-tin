# Feature Trace: Product (Quản lý sản phẩm)

> **Skill đính kèm**: Trước khi sửa bất kỳ endpoint nào ở đây, đọc [../skills/security-checklist.md](../skills/security-checklist.md).  
> **Đồng bộ**: Sau khi sửa, cập nhật [../INDEX.md](../INDEX.md) bảng tính năng.

---

## Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Product |
| Base URL | `/api/products` |
| Router | `backend/src/routers/product.router.js` |
| Controller | `backend/src/controllers/product.controller.js` |
| Model chính | `backend/src/models/product.model.js` |
| Model phụ | `backend/src/models/user.model.js` (include as 'owner') |
| External service | `sequelize Op` (tìm kiếm LIKE) |

---

## Danh sách sản phẩm

### Endpoint
```
GET /api/products?page=1&limit=10&search=
[Public — không cần đăng nhập]
```

### Chuỗi file
```
product.router.js  (không có middleware auth)
  ▼
product.controller.js → getAll()
  │  Query params: page, limit, search
  │  Op.like: { name: { [Op.like]: `%search%` } }  ← sequelize/Op
  │  Product.findAndCountAll({
  │    where, include: [User as 'owner'],
  │    limit, offset, order: [['created_at', 'DESC']]
  │  })
  ▼
Response: {
  success: true,
  data: [Product...],
  meta: { total, page, limit, totalPages }
}
```

### Bảo mật
- [x] Public endpoint — không cần token
- [x] Phân trang bắt buộc — tránh load toàn bộ DB
- [x] Search dùng `Op.like` (parameterized) — không raw SQL

---

## Sản phẩm của tôi

### Endpoint
```
GET /api/products/my
Header: Authorization: Bearer <token>
```

### Chuỗi file
```
product.router.js
  │  protect
  ▼
product.controller.js → getMyProducts()
  │  Product.findAll({ where: { user_id: req.user.id } })
  ▼
Response: { success: true, data: [Product...] }
```

### Bảo mật
- [x] `protect` — filter theo `req.user.id` (từ JWT), không nhận user_id từ query
- [x] Route `/my` phải đặt TRƯỚC `/:id` trong router để tránh nhầm param

---

## Chi tiết sản phẩm

### Endpoint
```
GET /api/products/:id
[Public]
```

### Chuỗi file
```
product.router.js  (public)
  ▼
product.controller.js → getById()
  │  Product.findByPk(id, {
  │    include: [User as 'owner', attributes: ['id','name','email']]
  │  })
  │  → 404 nếu không tìm thấy
  ▼
Response: { success: true, data: Product + owner }
```

### Bảo mật
- [x] Public — không cần token
- [x] Include User chỉ lấy `id, name, email` — không lộ password hay thông tin nhạy cảm

---

## Tạo sản phẩm

### Endpoint
```
POST /api/products
Header: Authorization: Bearer <token>
Body: { name, description?, price, stock, image_url? }
```

### Chuỗi file
```
product.router.js
  │  protect → validate([name, price, stock rules])
  │  → validate.middleware.js
  ▼
product.controller.js → create()
  │  Product.create({
  │    name, description, price, stock, image_url,
  │    user_id: req.user.id   ← lấy từ JWT, không từ body
  │  })
  ▼
Response: { success: true, data: Product }  HTTP 201
```

### Bảo mật
- [x] `protect` — phải đăng nhập
- [x] `user_id` lấy từ `req.user.id` (JWT đã verify) — không nhận từ body (chống giả mạo owner)
- [x] Validate: name notEmpty, price isFloat(min:0), stock isInt(min:0)

---

## Cập nhật sản phẩm

### Endpoint
```
PUT /api/products/:id
Header: Authorization: Bearer <token>
Body: { name, description?, price, stock, image_url? }
```

### Chuỗi file
```
product.router.js
  │  protect → validate([name, price, stock rules])
  ▼
product.controller.js → update()
  │  Product.findByPk(id)
  │  → 404 nếu không tìm thấy
  │  Kiểm tra ownership:
  │    product.user_id !== req.user.id && req.user.role !== 'admin' → 403
  │  product.update({ name, description, price, stock, image_url })
  ▼
Response: { success: true, data: Product }
```

### Bảo mật
- [x] `protect` — phải đăng nhập
- [x] Ownership check: chỉ chủ sản phẩm HOẶC admin mới cập nhật được
- [x] Không cho phép thay đổi `user_id` (chống transfer ownership qua body)

---

## Xóa sản phẩm

### Endpoint
```
DELETE /api/products/:id
Header: Authorization: Bearer <token>
```

### Chuỗi file
```
product.router.js
  │  protect
  ▼
product.controller.js → remove()
  │  Product.findByPk(id)
  │  → 404 nếu không tìm thấy
  │  Kiểm tra ownership:
  │    product.user_id !== req.user.id && req.user.role !== 'admin' → 403
  │  product.destroy()
  ▼
Response: { success: true, message: "Xóa sản phẩm thành công." }
```

### Bảo mật
- [x] `protect` — phải đăng nhập
- [x] Ownership check giống Update
- [x] 404 trước 403 — không lộ sản phẩm tồn tại hay không với user không có quyền

---

## File liên quan đầy đủ

```
backend/src/routers/product.router.js
backend/src/controllers/product.controller.js
backend/src/models/product.model.js
backend/src/models/user.model.js              ← include as 'owner'
backend/src/models/index.js                   ← khai báo association
backend/src/middlewares/auth.middleware.js
backend/src/middlewares/validate.middleware.js
backend/src/middlewares/error.middleware.js
```

## Schema Model Product

```js
{
  id:          INTEGER   PK AUTO_INCREMENT
  name:        STRING(200)  NOT NULL
  description: TEXT         NULLABLE
  price:       DECIMAL(10,2) NOT NULL DEFAULT 0
  stock:       INTEGER       NOT NULL DEFAULT 0
  image_url:   STRING        NULLABLE
  user_id:     INTEGER       FK → users.id
  created_at, updated_at
}
```

## Association (models/index.js)

```js
User.hasMany(Product, { foreignKey: 'user_id', as: 'products' });
Product.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });
```
