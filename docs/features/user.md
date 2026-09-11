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
Body: { name?, avatar?, phone?, username?, bio? }
```

### Chuỗi file
```
user.router.js
  │  protect → validate([name optional])
  │  → validate.middleware.js
  ▼
user.controller.js → updateProfile()
  │  User.findByPk(req.user.id)
  │  userIdentity.service whitelist + normalize username
  │  user.update(changed fields only)
  ▼
Response: { success: true, data: User, message: "Cập nhật thành công." }
```

### Bảo mật
- [x] `protect` — chỉ user đang đăng nhập mới cập nhật được chính mình
- [x] Lấy ID từ `req.user.id` (JWT đã verify) — không nhận id từ body/params
- [x] Chỉ cho phép `name`, `avatar`, `phone`, `username`, `bio`; không cho update `uid`, `id`, `email`, `password`, `role`
- [x] Username canonical lowercase, 3–30 ký tự; unique conflict trả 409

---

## Public UID và kết bạn bằng QR

- Mỗi tài khoản có `uid` dạng `LT-XXXXXXXXXXXX`, backend tự sinh và không cho thay đổi.
- `GET /api/users/username-availability` hỗ trợ UX nhưng không giữ chỗ username.
- `POST /api/social/qr/resolve` nhận `{ version: 1, uid }` và trả public allowlist cùng relationship.
- QR canonical: `proxy://friend/{UID}?v=1`; không chứa email, phone, JWT hoặc ID tuần tự.
- Resolver không tự tạo friendship/conversation. Mobile tái sử dụng API gửi/chấp nhận lời mời và private conversation hiện có.
- Migration database chạy theo thứ tự:

```text
npm run identity:migrate:prepare
npm run identity:backfill
npm run identity:migrate:finalize
npm run identity:migrate:status
```

Phải backup, tạm dừng các thao tác ghi `users`, chạy đủ migration rồi mới restart backend dùng model có cột `uid`.

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
backend/src/services/userIdentity.service.js
backend/src/services/friendQr.service.js
backend/src/utils/publicUid.js
backend/src/utils/username.js
backend/migrations/202608020001-add-public-uid-to-users.js
backend/migrations/202608020002-enforce-public-uid-on-users.js
backend/scripts/migrate-user-identities.js
backend/scripts/backfill-user-uids.js
```

## Schema Model User

```js
{
  id:       INTEGER   PK AUTO_INCREMENT
  uid:      STRING(15) UNIQUE NOT NULL [public, immutable]
  name:     STRING(100)   NOT NULL
  email:    STRING(150)   UNIQUE NOT NULL
  password: STRING         NOT NULL  [hash bcryptjs, luôn bị ẩn khỏi response]
  avatar:   STRING         NULLABLE
  username: STRING(30) UNIQUE NULLABLE
  role:     ENUM('user','admin')  DEFAULT 'user'
  created_at, updated_at
}
```
