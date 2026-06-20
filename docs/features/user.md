# Feature Trace: User (Quản lý người dùng)

> **Skill đính kèm**: Trước khi sửa bất kỳ endpoint nào ở đây, đọc [../skills/security-checklist.md](../skills/security-checklist.md).  
> **Đồng bộ**: Sau khi sửa, cập nhật [../INDEX.md](../INDEX.md) bảng tính năng.

---

## Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | User |
| Base URL | `/api/users` |
| Router | `backend/src/routers/user.router.js` |
| Controller | `backend/src/controllers/user.controller.js` |
| Model chính | `backend/src/models/user.model.js` |
| Middleware chung | `protect` (áp dụng toàn bộ router) |

---

## Danh sách người dùng

### Endpoint
```
GET /api/users
Header: Authorization: Bearer <token>  [Admin only]
```

### Chuỗi file
```
user.router.js
  │  protect → adminOnly
  │  → auth.middleware.js (protect + adminOnly)
  ▼
user.controller.js → getAll()
  │  User.findAll()
  │  → user.model.js (toJSON tự xóa password)
  ▼
Response: { success: true, data: [User...] }
```

### Bảo mật
- [x] `protect` — phải đăng nhập
- [x] `adminOnly` — chỉ role = 'admin' mới được truy cập
- [x] Password bị strip khỏi response bởi `toJSON`

---

## Xem người dùng theo ID

### Endpoint
```
GET /api/users/:id
Header: Authorization: Bearer <token>
```

### Chuỗi file
```
user.router.js
  │  protect
  ▼
user.controller.js → getById()
  │  User.findByPk(req.params.id)
  │  → 404 nếu không tìm thấy
  ▼
Response: { success: true, data: User }
```

### Bảo mật
- [x] `protect` — phải đăng nhập
- [ ] Không kiểm tra owner — mọi user đã đăng nhập đều xem được user khác (thiết kế hiện tại)
- Cân nhắc: Có thể thêm kiểm tra `req.user.id === req.params.id || req.user.role === 'admin'` nếu cần restrict

---

## Cập nhật hồ sơ

### Endpoint
```
PATCH /api/users/me
Header: Authorization: Bearer <token>
Body: { name?, avatar? }
```

### Chuỗi file
```
user.router.js
  │  protect → validate([name optional])
  │  → validate.middleware.js
  ▼
user.controller.js → updateProfile()
  │  User.findByPk(req.user.id)
  │  user.update({ name, avatar })
  ▼
Response: { success: true, data: User, message: "Cập nhật thành công." }
```

### Bảo mật
- [x] `protect` — chỉ user đang đăng nhập mới cập nhật được chính mình
- [x] Lấy ID từ `req.user.id` (JWT đã verify) — không nhận id từ body/params
- [x] Chỉ cho phép update `name` và `avatar`, không cho update `email`, `password`, `role`

---

## Xóa người dùng

### Endpoint
```
DELETE /api/users/:id
Header: Authorization: Bearer <token>  [Admin only]
```

### Chuỗi file
```
user.router.js
  │  protect → adminOnly
  ▼
user.controller.js → deleteUser()
  │  User.findByPk(req.params.id)
  │  → 404 nếu không tìm thấy
  │  user.destroy()
  ▼
Response: { success: true, message: "Xóa người dùng thành công." }
```

### Bảo mật
- [x] `protect` + `adminOnly` — chỉ admin mới xóa được user
- [x] Soft-delete: Nếu muốn không xóa hẳn, thêm `paranoid: true` vào model

---

## File liên quan đầy đủ

```
backend/src/routers/user.router.js
backend/src/controllers/user.controller.js
backend/src/models/user.model.js
backend/src/middlewares/auth.middleware.js       ← protect + adminOnly
backend/src/middlewares/validate.middleware.js
backend/src/middlewares/error.middleware.js
```

## Schema Model User

```js
{
  id:       INTEGER   PK AUTO_INCREMENT
  name:     STRING(100)   NOT NULL
  email:    STRING(150)   UNIQUE NOT NULL
  password: STRING         NOT NULL  [hash bcryptjs, luôn bị ẩn khỏi response]
  avatar:   STRING         NULLABLE
  role:     ENUM('user','admin')  DEFAULT 'user'
  created_at, updated_at
}
```
