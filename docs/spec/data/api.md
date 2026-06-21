# API Contracts

> Bỏ vào đây: contract giữa FE và BE — endpoint, method, auth, request body, response.  
> Paste từ Postman, Swagger, Insomnia, hoặc mô tả tay.  
> AI đọc file này để tạo đồng thời: BE router/controller + FE api function.

---

## TEMPLATE — Copy block này cho endpoint mới

```
## [Tên hành động]

**Method + Path**: `[METHOD] /api/[path]`
**Auth**         : Public | Protected (JWT) | Admin only
**Validate**     : [danh sách field cần validate]

### Request Body
```json
{
  "field": "kiểu — mô tả"
}
```

### Response 200
```json
{
  "success": true,
  "data": { ... },
  "message": "..."
}
```

### Response lỗi
| Status | Trường hợp |
|---|---|
| 400 | [lý do] |
| 401 | Thiếu / sai token |
| 403 | Không có quyền |
| 404 | Không tìm thấy |
| 422 | Validation fail |
```

---

## ENDPOINTS HIỆN CÓ

---

### Auth

#### Đăng ký
**Method + Path**: `POST /api/auth/register`  
**Auth**: Public  
**Validate**: `name` notEmpty, `email` isEmail, `password` minLength(6)

**Request Body**
```json
{ "name": "string", "email": "string", "password": "string" }
```
**Response 201**
```json
{ "success": true, "data": { "user": { User }, "token": "jwt" }, "message": "Đăng ký thành công" }
```

---

#### Đăng nhập
**Method + Path**: `POST /api/auth/login`  
**Auth**: Public

**Request Body**
```json
{ "email": "string", "password": "string" }
```
**Response 200**
```json
{ "success": true, "data": { "user": { User }, "token": "jwt" }, "message": "Đăng nhập thành công" }
```

---

#### Lấy thông tin bản thân
**Method + Path**: `GET /api/auth/me`  
**Auth**: Protected

**Response 200**
```json
{ "success": true, "data": { "user": { User } } }
```

---

#### Đổi mật khẩu
**Method + Path**: `PATCH /api/auth/change-password`  
**Auth**: Protected

**Request Body**
```json
{ "currentPassword": "string", "newPassword": "string (min 6)" }
```

---

### Users

#### Danh sách người dùng
**Method + Path**: `GET /api/users`  
**Auth**: Admin only

**Response 200**
```json
{ "success": true, "data": [{ User }], "meta": { "total": 0, "page": 1, "limit": 10, "totalPages": 1 } }
```

---

#### Cập nhật hồ sơ
**Method + Path**: `PATCH /api/users/me`  
**Auth**: Protected

**Request Body**
```json
{ "name": "string?", "avatar": "string?" }
```

---

### Products

#### Danh sách sản phẩm (public, có search + phân trang)
**Method + Path**: `GET /api/products?page=1&limit=10&search=`  
**Auth**: Public

**Response 200**
```json
{
  "success": true,
  "data": [{ "id": 1, "name": "", "price": 0, "stock": 0, "image_url": "", "owner": { "id": 1, "name": "" } }],
  "meta": { "total": 0, "page": 1, "limit": 10, "totalPages": 1 }
}
```

---

#### Sản phẩm của tôi
**Method + Path**: `GET /api/products/my`  
**Auth**: Protected

---

#### Chi tiết sản phẩm
**Method + Path**: `GET /api/products/:id`  
**Auth**: Public

---

#### Tạo sản phẩm
**Method + Path**: `POST /api/products`  
**Auth**: Protected

**Request Body**
```json
{ "name": "string", "price": 0, "stock": 0, "description": "string?", "image_url": "string?" }
```

---

#### Cập nhật sản phẩm
**Method + Path**: `PUT /api/products/:id`  
**Auth**: Protected + Ownership check

---

#### Xóa sản phẩm
**Method + Path**: `DELETE /api/products/:id`  
**Auth**: Protected + Ownership check

---

<!-- THÊM ENDPOINT MỚI VÀO ĐÂY -->
