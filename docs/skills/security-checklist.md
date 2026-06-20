# Kỹ Năng: Checklist Bảo Mật Endpoint

> Áp dụng cho MỌI endpoint trước khi viết code.  
> Đây là tài liệu sống — cập nhật khi phát hiện lỗ hổng mới.

---

## Checklist 10 điểm bắt buộc

### [SEC-01] Xác thực (Authentication)
- [ ] Endpoint có cần đăng nhập không?
  - Cần → áp dụng middleware `protect`
  - Không cần → ghi chú rõ "Public" trong trace file
- [ ] `protect` load lại user từ DB (không decode từ payload token) → tránh dùng thông tin cũ

### [SEC-02] Phân quyền (Authorization)
- [ ] Endpoint chỉ dành cho admin? → áp dụng `adminOnly` sau `protect`
- [ ] Endpoint có kiểm tra ownership không (chỉ chủ resource mới được sửa/xóa)?
  - Dùng: `if (resource.user_id !== req.user.id && req.user.role !== 'admin') → 403`
  - Trả 404 trước khi trả 403 nếu resource không tồn tại (không lộ thông tin)

### [SEC-03] Validate Input
- [ ] Tất cả body field đều được validate qua `express-validator`
- [ ] Dùng middleware `validate(rules)` — không validate thủ công trong controller
- [ ] Các kiểm tra tối thiểu:
  - String: `notEmpty()`, `isLength({ min, max })`
  - Email: `isEmail()`
  - Number: `isFloat({ min: 0 })` hoặc `isInt({ min: 0 })`
  - Enum: `isIn(['value1', 'value2'])`

### [SEC-04] Nguồn dữ liệu tin cậy
- [ ] `user_id` KHÔNG bao giờ lấy từ `req.body` hay `req.params` — chỉ từ `req.user.id` (JWT)
- [ ] Không để client tự truyền `role` hay `is_admin` qua body

### [SEC-05] Password
- [ ] Password KHÔNG BAO GIỜ trả về trong response
- [ ] Model `toJSON()` phải xóa field `password`
- [ ] Khi cần compare password: dùng `User.findOne({ attributes: { include: ['password'] } })`
- [ ] Hash bằng `bcryptjs` với cost factor ≥ 10

### [SEC-06] Error Handling
- [ ] Mọi async function trong controller đều bọc trong `try/catch`
- [ ] Lỗi đều được chuyển qua `next(error)` — không `res.json` lỗi trực tiếp
- [ ] `error.middleware.js` xử lý tập trung — không lộ stack trace ở production
- [ ] Thông báo lỗi không tiết lộ thông tin hệ thống (tên bảng, SQL, đường dẫn file)

### [SEC-07] SQL Injection
- [ ] Dùng Sequelize ORM — không viết raw SQL
- [ ] Nếu bắt buộc dùng raw query: dùng parameterized (`sequelize.query('...', { replacements: [...] })`)
- [ ] Tìm kiếm dùng `Op.like` với parameterized value — không string concatenation

### [SEC-08] Thứ tự HTTP Status Code
- [ ] 201 — tạo mới thành công
- [ ] 200 — thành công các loại khác
- [ ] 400 — bad request (logic sai, vd: sai mật khẩu cũ)
- [ ] 401 — chưa xác thực (thiếu/sai token)
- [ ] 403 — đã xác thực nhưng không có quyền
- [ ] 404 — không tìm thấy resource
- [ ] 409 — conflict (vd: email trùng)
- [ ] 422 — validation failed (dùng cho validate middleware)
- [ ] 500 — server error (handled by error middleware)

### [SEC-09] Phân trang
- [ ] Endpoint GET danh sách phải có phân trang (`page`, `limit`)
- [ ] `limit` phải có giá trị tối đa (vd: max 100) — tránh load toàn bộ DB
- [ ] Dùng `findAndCountAll` để trả kèm `meta.total`

### [SEC-10] CORS & Headers
- [ ] CORS đã cấu hình trong `app.js` (hiện dùng `cors()` — allow all, cần restrict ở production)
- [ ] Không lưu thông tin nhạy cảm trong response headers

---

## Template điền nhanh cho endpoint mới

```
Endpoint: METHOD /api/path
------------------------------
[SEC-01] Auth:        [ ] Public  [ ] Protected  [ ] Admin only
[SEC-02] Authz:       [ ] No ownership check  [ ] Ownership check cần
[SEC-03] Validate:    Fields cần validate: ____________
[SEC-04] Data source: user_id từ [ ] req.user.id  [ ] KHÔNG nhận từ body
[SEC-05] Password:    [ ] N/A  [ ] Có hash  [ ] Có strip khỏi response
[SEC-06] Error:       [ ] try/catch + next(error)
[SEC-07] SQL:         [ ] Dùng Sequelize ORM  [ ] Raw: có parameterized
[SEC-08] Status code: Thành công ___ | Lỗi chính ___
[SEC-09] Pagination:  [ ] N/A  [ ] Có phân trang
[SEC-10] CORS:        [ ] Đã có trong app.js
```

---

## Lỗ hổng đã từng gặp (case studies)

| Lỗ hổng | Nguyên nhân | Cách fix |
|---|---|---|
| Lộ password trong response | Không có `toJSON` strip | Thêm `toJSON` vào model User |
| Thay đổi `user_id` sản phẩm của người khác | Nhận `user_id` từ body | Luôn dùng `req.user.id` |
| Route `/my` bị bắt bởi `/:id` | Thứ tự route sai | Đặt `/my` trước `/:id` trong router |
| Load toàn bộ bảng users | Thiếu phân trang | Thêm `findAndCountAll` + limit |
