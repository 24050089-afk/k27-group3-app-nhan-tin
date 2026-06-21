# Database Schema

> Bỏ vào đây: schema CSDL — bảng, cột, kiểu dữ liệu, quan hệ, index, ràng buộc.  
> Paste SQL CREATE TABLE, ERD text, hoặc mô tả tay.  
> AI đọc file này để tạo Sequelize model và migration.

---

## TEMPLATE — Copy block này cho bảng mới

```
## [tên_bảng]

**Model file**: `backend/src/models/<tên>.model.js`
**Mô tả**: [bảng này lưu gì]

| Cột | Kiểu | Null | Default | Ghi chú |
|---|---|---|---|---|
| `id` | INTEGER | NOT NULL | AUTO_INCREMENT | PK |
| `cột_a` | VARCHAR(255) | NOT NULL | — | [mô tả] |
| `cột_b` | ENUM('x','y') | NOT NULL | 'x' | [mô tả] |
| `created_at` | DATETIME | NOT NULL | — | Sequelize tự quản lý |
| `updated_at` | DATETIME | NOT NULL | — | Sequelize tự quản lý |

**Quan hệ**:
- `[tên_bảng]` belongsTo `[bảng_kia]` (FK: `[tên_fk]`)
- `[tên_bảng]` hasMany `[bảng_kia]`

**Index**: [cột nào cần index]

**Business rules**:
- [ràng buộc nghiệp vụ đặc biệt]
```

---

## CÁC BẢNG HIỆN CÓ

---

## users

**Model file**: `backend/src/models/user.model.js`
**Mô tả**: Tài khoản người dùng

| Cột | Kiểu | Null | Default | Ghi chú |
|---|---|---|---|---|
| `id` | INTEGER | NOT NULL | AUTO_INCREMENT | PK |
| `name` | VARCHAR(100) | NOT NULL | — | Họ tên |
| `email` | VARCHAR(150) | NOT NULL | — | UNIQUE |
| `password` | VARCHAR(255) | NOT NULL | — | bcrypt hash, ẩn khỏi response |
| `avatar` | VARCHAR(255) | NULL | — | URL ảnh đại diện |
| `role` | ENUM('user','admin') | NOT NULL | 'user' | Phân quyền |
| `created_at` | DATETIME | NOT NULL | — | |
| `updated_at` | DATETIME | NOT NULL | — | |

**Quan hệ**:
- `users` hasMany `products` (FK: `user_id`)

**Business rules**:
- `password` được hash bằng bcrypt trước khi lưu (hook `beforeCreate`, `beforeUpdate`)
- `toJSON()` luôn xóa `password` khỏi response
- `email` phải unique

---

## products

**Model file**: `backend/src/models/product.model.js`
**Mô tả**: Sản phẩm do người dùng đăng

| Cột | Kiểu | Null | Default | Ghi chú |
|---|---|---|---|---|
| `id` | INTEGER | NOT NULL | AUTO_INCREMENT | PK |
| `name` | VARCHAR(200) | NOT NULL | — | Tên sản phẩm |
| `description` | TEXT | NULL | — | Mô tả chi tiết |
| `price` | DECIMAL(10,2) | NOT NULL | 0 | Giá |
| `stock` | INTEGER | NOT NULL | 0 | Tồn kho |
| `image_url` | VARCHAR(255) | NULL | — | URL ảnh |
| `user_id` | INTEGER | NOT NULL | — | FK → users.id |
| `created_at` | DATETIME | NOT NULL | — | |
| `updated_at` | DATETIME | NOT NULL | — | |

**Quan hệ**:
- `products` belongsTo `users` (FK: `user_id`, alias: `owner`)

**Business rules**:
- Chỉ chủ sở hữu (`user_id === req.user.id`) hoặc admin mới được sửa/xóa
- `price` không được âm
- Khi lấy danh sách: include `owner` (name, email, avatar)

---

<!-- THÊM BẢNG MỚI VÀO ĐÂY -->
