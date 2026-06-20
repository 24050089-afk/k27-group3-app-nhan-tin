# Kỹ Năng: Thêm Tính Năng Mới

> Đọc file này mỗi khi bắt đầu implement một tính năng chưa tồn tại trong codebase.  
> Sau khi hoàn thành, chạy checklist [index-sync.md](index-sync.md) để đồng bộ chỉ mục.

---

## Quy Trình 8 Bước

### Bước 1 — Xác định tính năng

Trả lời 5 câu hỏi trước khi viết code:

| Câu hỏi | Ví dụ |
|---|---|
| Tên tính năng là gì? | `Order` (đặt hàng) |
| Base URL? | `/api/orders` |
| Cần model mới không? | Có: `order.model.js` |
| Quan hệ với model nào? | `Order belongsTo User`, `Order hasMany OrderItem` |
| Security level? | Protected (phải đăng nhập) |

---

### Bước 2 — Kiểm tra bảo mật TRƯỚC

Đọc [security-checklist.md](security-checklist.md) và điền checklist cho từng endpoint dự định tạo.  
**Không được bỏ qua bước này.**

---

### Bước 3 — Tạo Model

**File**: `backend/src/models/<tên>.model.js`

```js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TenModel = sequelize.define('TenModel', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  // ... các field
}, {
  tableName: '<tên_bảng>',   // snake_case, số nhiều
  underscored: true,          // tự tạo created_at, updated_at
});

module.exports = TenModel;
```

**Sau đó** đăng ký association trong `backend/src/models/index.js`:
```js
const TenModel = require('./ten.model');
// Thêm association
User.hasMany(TenModel, { foreignKey: 'user_id', as: '<tên_alias>' });
TenModel.belongsTo(User, { foreignKey: 'user_id', as: 'owner' });
// Export
module.exports = { sequelize, User, Product, TenModel };
```

---

### Bước 4 — Tạo Controller

**File**: `backend/src/controllers/<tên>.controller.js`

Cấu trúc chuẩn mỗi function:

```js
const functionName = async (req, res, next) => {
  try {
    // 1. Lấy dữ liệu từ req (params, body, query, user)
    // 2. Business logic / DB operation
    // 3. Trả về response chuẩn
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);  // luôn dùng next(error) — không res.json lỗi ở đây
  }
};
```

**Quy tắc controller**:
- Không dùng `user_id` từ `req.body` — luôn dùng `req.user.id`
- Ownership check trước khi update/delete
- Trả 404 trước khi check 403 (không lộ sự tồn tại của resource)

---

### Bước 5 — Tạo Router

**File**: `backend/src/routers/<tên>.router.js`

```js
const express = require('express');
const { body } = require('express-validator');
const { fn1, fn2 } = require('../controllers/<tên>.controller');
const { protect, adminOnly } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const router = express.Router();

// Public routes
router.get('/', fn1);

// Protected routes
router.use(protect);  // hoặc đặt protect từng route
router.post('/', validate([...rules]), fn2);

module.exports = router;
```

**Lưu ý thứ tự route quan trọng**:
```js
router.get('/special', handlerA);   // đặt trước
router.get('/:id', handlerB);       // đặt sau — tránh `:id` bắt 'special'
```

---

### Bước 6 — Đăng ký Router vào index

**File**: `backend/src/routers/index.js`

```js
const tenRouter = require('./<tên>.router');
router.use('/<tên>', tenRouter);
```

---

### Bước 7 — Tạo Feature Trace File

**File**: `docs/features/<tên>.md`

Dùng template sau:

```markdown
# Feature Trace: <Tên tính năng>

> **Skill đính kèm**: Trước khi sửa bất kỳ endpoint nào ở đây, đọc [../skills/security-checklist.md](../skills/security-checklist.md).
> **Đồng bộ**: Sau khi sửa, cập nhật [../INDEX.md](../INDEX.md) bảng tính năng.

## Tổng quan
| Thuộc tính | Giá trị |
|---|---|
| Router | `backend/src/routers/<tên>.router.js` |
| Controller | `backend/src/controllers/<tên>.controller.js` |
| Model | `backend/src/models/<tên>.model.js` |

## <Endpoint 1>
### Endpoint
\`\`\`
METHOD /api/<path>
\`\`\`
### Chuỗi file
\`\`\`
router → middleware → controller → model → response
\`\`\`
### Bảo mật
- [ ] ...

## File liên quan đầy đủ
\`\`\`
...
\`\`\`
```

---

### Bước 8 — Đồng bộ chỉ mục

Chạy [index-sync.md](index-sync.md) — checklist 5 bước để cập nhật `docs/INDEX.md`.

---

## Checklist hoàn thành tính năng

### BE Checklist
```
[ ] Model đã tạo và đăng ký trong models/index.js
[ ] Controller đã tạo với đầy đủ CRUD cần thiết
[ ] Router đã tạo và đăng ký trong routers/index.js
[ ] Middleware bảo mật đã áp dụng đúng cho từng endpoint
[ ] Validate input cho tất cả endpoint có body
[ ] Test thủ công: gọi API với Postman/curl để kiểm tra
```

### FE Checklist (xem chi tiết: [fe-feature-flow.md](fe-feature-flow.md))
```
[ ] Tạo src/api/<tên>.api.js với đầy đủ hàm gọi BE
[ ] Tạo Screen(s) tại src/screens/ theo template fe-screen.md
[ ] Đăng ký Screen vào navigation/index.js theo fe-navigation.md
[ ] Kết nối state (local useState hoặc Context) theo fe-state.md
[ ] Tạo component mới nếu cần theo fe-components.md
[ ] Áp dụng design system (màu, spacing) theo fe-architecture.md
[ ] Test trên Expo: Android emulator + iOS simulator (nếu có)
[ ] Test edge cases: loading, error, empty list, ownership
```

### Sync Checklist
```
[ ] Feature trace file đã tạo/cập nhật tại docs/features/<tên>.md
[ ] docs/INDEX.md bảng BE đã cập nhật
[ ] docs/INDEX.md bảng FE Screens đã cập nhật
[ ] Chạy checklist đầy đủ: index-sync.md
```

---

## Phần Bổ Sung: FE Steps Chi Tiết

Sau khi hoàn thành Bước 6 (đăng ký router BE), thực hiện các bước FE:

### Bước 6.1 — Tạo API file FE

```js
// mobile/src/api/<tên>.api.js
import client from './client';

export const get<Tên>sApi     = (params) => client.get('/<tên>', { params });
export const get<Tên>ByIdApi  = (id)     => client.get(`/<tên>/${id}`);
export const create<Tên>Api   = (data)   => client.post('/<tên>', data);
export const update<Tên>Api   = (id, data) => client.put(`/<tên>/${id}`, data);
export const delete<Tên>Api   = (id)     => client.delete(`/<tên>/${id}`);
```

→ Xem đầy đủ: [fe-api.md](fe-api.md)

### Bước 6.2 — Tạo Screen(s)

Xác định cần bao nhiêu screen:
- List screen: `<Tên>ListScreen.js` — FlatList + phân trang
- Detail screen: `<Tên>DetailScreen.js` — xem + nút sửa/xóa
- Form screen: `<Tên>FormScreen.js` — tạo mới / chỉnh sửa (nhận `route.params.item`)

→ Xem template đầy đủ: [fe-screen.md](fe-screen.md)

### Bước 6.3 — Đăng ký Navigation

```js
// mobile/src/navigation/index.js
import <Tên>ListScreen from '../screens/<Tên>ListScreen';
import <Tên>DetailScreen from '../screens/<Tên>DetailScreen';
import <Tên>FormScreen from '../screens/<Tên>FormScreen';

// Thêm vào AppStack hoặc HomeTabs
<Stack.Screen name="<Tên>List" component={<Tên>ListScreen} options={{ title: '<Tiêu đề>' }} />
```

→ Xem đầy đủ: [fe-navigation.md](fe-navigation.md)
