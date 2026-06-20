# Chỉ Mục Tính Năng — LT Web

> **Quy tắc**: Mỗi khi thêm hoặc sửa tính năng, bắt buộc cập nhật bảng này và file `docs/features/<tên>.md` tương ứng.  
> Xem quy trình tại: [docs/skills/index-sync.md](skills/index-sync.md)

---

## Bảng Chỉ Mục Tổng

| # | Tính năng | Nhóm | Endpoint | Security | Router | Controller | Model | Trace |
|---|-----------|------|----------|----------|--------|------------|-------|-------|
| 1 | Đăng ký | Auth | `POST /api/auth/register` | Public + Validate | auth.router.js | auth.controller.js | User | [→](features/auth.md#đăng-ký) |
| 2 | Đăng nhập | Auth | `POST /api/auth/login` | Public + Validate | auth.router.js | auth.controller.js | User | [→](features/auth.md#đăng-nhập) |
| 3 | Lấy thông tin bản thân | Auth | `GET /api/auth/me` | Protected | auth.router.js | auth.controller.js | User | [→](features/auth.md#lấy-thông-tin-bản-thân) |
| 4 | Đổi mật khẩu | Auth | `PATCH /api/auth/change-password` | Protected + Validate | auth.router.js | auth.controller.js | User | [→](features/auth.md#đổi-mật-khẩu) |
| 5 | Danh sách người dùng | User | `GET /api/users` | Protected + Admin | user.router.js | user.controller.js | User | [→](features/user.md#danh-sách-người-dùng) |
| 6 | Xem người dùng theo ID | User | `GET /api/users/:id` | Protected | user.router.js | user.controller.js | User | [→](features/user.md#xem-người-dùng-theo-id) |
| 7 | Cập nhật hồ sơ | User | `PATCH /api/users/me` | Protected + Validate | user.router.js | user.controller.js | User | [→](features/user.md#cập-nhật-hồ-sơ) |
| 8 | Xóa người dùng | User | `DELETE /api/users/:id` | Protected + Admin | user.router.js | user.controller.js | User | [→](features/user.md#xóa-người-dùng) |
| 9 | Danh sách sản phẩm | Product | `GET /api/products` | Public | product.router.js | product.controller.js | Product + User | [→](features/product.md#danh-sách-sản-phẩm) |
| 10 | Sản phẩm của tôi | Product | `GET /api/products/my` | Protected | product.router.js | product.controller.js | Product | [→](features/product.md#sản-phẩm-của-tôi) |
| 11 | Chi tiết sản phẩm | Product | `GET /api/products/:id` | Public | product.router.js | product.controller.js | Product + User | [→](features/product.md#chi-tiết-sản-phẩm) |
| 12 | Tạo sản phẩm | Product | `POST /api/products` | Protected + Validate | product.router.js | product.controller.js | Product | [→](features/product.md#tạo-sản-phẩm) |
| 13 | Cập nhật sản phẩm | Product | `PUT /api/products/:id` | Protected + Ownership | product.router.js | product.controller.js | Product | [→](features/product.md#cập-nhật-sản-phẩm) |
| 14 | Xóa sản phẩm | Product | `DELETE /api/products/:id` | Protected + Ownership | product.router.js | product.controller.js | Product | [→](features/product.md#xóa-sản-phẩm) |

---

## Bản Đồ Middleware

| Middleware | File | Áp dụng cho |
|---|---|---|
| `protect` | `middlewares/auth.middleware.js` | Mọi route cần đăng nhập |
| `adminOnly` | `middlewares/auth.middleware.js` | Route chỉ admin |
| `validate(rules)` | `middlewares/validate.middleware.js` | Route có body input |
| `errorMiddleware` | `middlewares/error.middleware.js` | Global — tất cả route |

---

## Bản Đồ Model & Quan Hệ

```
User (users)
 └── hasMany → Product (products) [foreignKey: user_id]

Product (products)
 └── belongsTo → User [as: 'owner']
```

| Model | File | Bảng DB | Quan hệ |
|---|---|---|---|
| User | `models/user.model.js` | `users` | hasMany Product |
| Product | `models/product.model.js` | `products` | belongsTo User |

---

## Chuỗi Xử Lý Mặc Định

```
HTTP Request
    │
    ▼
[Router]          backend/src/routers/<tên>.router.js
    │
    ▼
[Middleware]      auth.middleware.js  →  validate.middleware.js
    │
    ▼
[Controller]      backend/src/controllers/<tên>.controller.js
    │
    ├── Gọi Model (Sequelize)
    │       backend/src/models/<tên>.model.js
    │
    ├── External Service
    │       bcryptjs / jsonwebtoken / sequelize Op
    │
    └── Trả JSON response
            { success, data, message, meta? }
    │
    ▼
[Error Middleware] (nếu có lỗi ném ra)
    backend/src/middlewares/error.middleware.js
```

---

---

## Bản Đồ FE — Screens & Components

| Screen | File | Navigation Name | Loại | API dùng |
|---|---|---|---|---|
| Đăng nhập | `screens/LoginScreen.js` | `Login` (AuthStack) | Form | `loginApi` |
| Đăng ký | `screens/RegisterScreen.js` | `Register` (AuthStack) | Form | `registerApi` |
| Trang chủ (danh sách SP) | `screens/HomeScreen.js` | `Home` (Tab) | List + Search | `getProductsApi` |
| Chi tiết sản phẩm | `screens/ProductDetailScreen.js` | `ProductDetail` (Stack) | Detail | `getProductByIdApi` |
| Form sản phẩm (tạo/sửa) | `screens/ProductFormScreen.js` | `ProductForm` (Stack) | Form | `createProductApi` / `updateProductApi` |
| Cá nhân | `screens/ProfileScreen.js` | `Profile` (Tab) | Mixed | `changePasswordApi` |

| Component | File | Dùng ở |
|---|---|---|
| Button | `components/Button.js` | Tất cả screen có action |
| Input | `components/Input.js` | Tất cả form screen |
| ProductCard | `components/ProductCard.js` | HomeScreen (FlatList) |

---

## Bản Đồ State & Storage FE

| State | Loại | File | Dùng ở |
|---|---|---|---|
| user, token | Global Context | `store/AuthContext.js` | Toàn bộ app |
| Token persist | AsyncStorage | `utils/storage.js` | AuthContext, client.js |
| User persist | AsyncStorage | `utils/storage.js` | AuthContext |
| API base URL | env utility | `utils/env.js` | client.js |
| Form fields, loading | Local useState | Trong từng Screen | Screen tương ứng |

---

## Skill Đính Kèm

Khi tra cứu bảng này, đọc thêm:

| Khi nào | Đọc skill |
|---|---|
| **Thêm tính năng mới (BE + FE)** | [new-feature.md](skills/new-feature.md) |
| **Luồng FE tổng quan** | [fe-feature-flow.md](skills/fe-feature-flow.md) |
| **Kiến trúc & design system FE** | [fe-architecture.md](skills/fe-architecture.md) |
| **Viết Screen mới** | [fe-screen.md](skills/fe-screen.md) |
| **Thêm Navigation / Route** | [fe-navigation.md](skills/fe-navigation.md) |
| **Tích hợp API** | [fe-api.md](skills/fe-api.md) |
| **State / AsyncStorage** | [fe-state.md](skills/fe-state.md) |
| **Component & Form** | [fe-components.md](skills/fe-components.md) |
| **Chạy Expo / Debug** | [expo-dev.md](skills/expo-dev.md) |
| **Kiểm tra bảo mật** | [security-checklist.md](skills/security-checklist.md) |
| **Cập nhật chỉ mục** | [index-sync.md](skills/index-sync.md) |
| **Xem trace chi tiết** | [docs/features/](features/) |
