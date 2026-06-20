# Feature Trace: Auth (Xác thực)

> **Skill đính kèm**: Trước khi sửa bất kỳ endpoint nào ở đây, đọc [../skills/security-checklist.md](../skills/security-checklist.md).  
> **Đồng bộ**: Sau khi sửa, cập nhật [../INDEX.md](../INDEX.md) bảng tính năng.

---

## Tổng quan

| Thuộc tính | Giá trị |
|---|---|
| Nhóm | Auth |
| Base URL | `/api/auth` |
| Router | `backend/src/routers/auth.router.js` |
| Controller | `backend/src/controllers/auth.controller.js` |
| Model chính | `backend/src/models/user.model.js` |
| External service | `bcryptjs`, `jsonwebtoken` |
| Config DB | `backend/src/config/database.js` |

---

## Đăng ký

### Endpoint
```
POST /api/auth/register
Body: { name, email, password }
```

### Chuỗi file
```
auth.router.js
  │  validate([name, email, password rules])
  │  → validate.middleware.js
  ▼
auth.controller.js → register()
  │  1. Kiểm tra email trùng: User.findOne({ where: { email } })
  │  2. Tạo user: User.create({ name, email, password })
  │     → user.model.js hook beforeCreate → bcrypt.hash(password, 10)
  │  3. Tạo JWT: jwt.sign({ id }, JWT_SECRET, { expiresIn })
  ▼
Response: { success: true, data: { user, token } }  HTTP 201
```

### Bảo mật
- [x] Validate: name notEmpty, email isEmail, password minLength(6)
- [x] Password được hash bằng bcryptjs (cost=10) trước khi lưu DB
- [x] Password không bao giờ trả về client (`toJSON` xóa field password)
- [x] Kiểm tra email trùng → 409 Conflict

---

## Đăng nhập

### Endpoint
```
POST /api/auth/login
Body: { email, password }
```

### Chuỗi file
```
auth.router.js
  │  validate([email, password rules])
  │  → validate.middleware.js
  ▼
auth.controller.js → login()
  │  1. Tìm user có password: User.findOne({ attributes: { include: ['password'] } })
  │  2. So sánh: user.comparePassword(password) → bcrypt.compare()
  │     → user.model.js prototype.comparePassword
  │  3. Tạo JWT: jwt.sign({ id }, JWT_SECRET)
  ▼
Response: { success: true, data: { user, token } }  HTTP 200
Error 401: "Email hoặc mật khẩu không đúng."
```

### Bảo mật
- [x] Không tiết lộ field nào sai (email hay password) → thông báo chung
- [x] User.findOne mặc định KHÔNG include password (toJSON strip)
- [x] Phải dùng `attributes: { include: ['password'] }` để lấy hash so sánh
- [x] Trả 401 đồng nhất dù email không tồn tại hay sai password

---

## Lấy thông tin bản thân

### Endpoint
```
GET /api/auth/me
Header: Authorization: Bearer <token>
```

### Chuỗi file
```
auth.router.js
  │  protect (middleware)
  │  → auth.middleware.js → jwt.verify() → User.findByPk(decoded.id)
  │    req.user = user
  ▼
auth.controller.js → getMe()
  └── res.json({ success: true, data: { user: req.user } })
```

### Bảo mật
- [x] `protect` middleware bắt buộc — 401 nếu thiếu/sai token
- [x] Token được verify bằng JWT_SECRET
- [x] User được load lại từ DB (không decode từ token) — phòng token stale

---

## Đổi mật khẩu

### Endpoint
```
PATCH /api/auth/change-password
Header: Authorization: Bearer <token>
Body: { currentPassword, newPassword }
```

### Chuỗi file
```
auth.router.js
  │  protect → validate([currentPassword, newPassword rules])
  ▼
auth.controller.js → changePassword()
  │  1. Load user có password: User.findOne({ where: { id: req.user.id }, attributes: { include: ['password'] } })
  │  2. So sánh: user.comparePassword(currentPassword)
  │  3. Cập nhật: user.update({ password: newPassword })
  │     → user.model.js hook beforeUpdate → bcrypt.hash(newPassword, 10)
  ▼
Response: { success: true, message: "Đổi mật khẩu thành công." }
Error 400: "Mật khẩu hiện tại không đúng."
```

### Bảo mật
- [x] Bắt buộc xác minh mật khẩu cũ trước khi đổi
- [x] Mật khẩu mới được hash lại qua hook `beforeUpdate`
- [x] Endpoint cần `protect` (phải đăng nhập)

---

## File liên quan đầy đủ

```
backend/src/routers/auth.router.js
backend/src/controllers/auth.controller.js
backend/src/models/user.model.js
backend/src/middlewares/auth.middleware.js
backend/src/middlewares/validate.middleware.js
backend/src/middlewares/error.middleware.js
backend/src/config/database.js
```

## External Dependencies

| Thư viện | Dùng cho | Cài đặt |
|---|---|---|
| `bcryptjs` | Hash & compare password | `npm i bcryptjs` |
| `jsonwebtoken` | Tạo & verify JWT | `npm i jsonwebtoken` |
| `express-validator` | Validate input | `npm i express-validator` |

## Biến môi trường cần thiết

```env
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
```
