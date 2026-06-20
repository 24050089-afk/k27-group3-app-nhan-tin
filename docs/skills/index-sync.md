# Kỹ Năng: Đồng Bộ Chỉ Mục

> Chạy checklist này mỗi khi thêm, sửa, hoặc xóa một tính năng.  
> Mục tiêu: `docs/INDEX.md` và `docs/features/` luôn phản ánh đúng trạng thái codebase.

---

## Khi nào cần chạy checklist này?

| Hành động | Cần đồng bộ? |
|---|---|
| Thêm endpoint mới | Bắt buộc |
| Đổi tên file router/controller/model | Bắt buộc |
| Thay đổi middleware của một endpoint | Bắt buộc |
| Xóa endpoint | Bắt buộc |
| Sửa logic bên trong controller (không đổi route) | Nên cập nhật nếu thay đổi chuỗi file |
| Sửa typo trong MD file | Không cần |

---

## Checklist 5 Bước Đồng Bộ

### Bước 1 — Xác định phạm vi thay đổi

```
[ ] Tôi vừa thêm/sửa/xóa endpoint nào?
    Endpoint: _______________________
    Tính năng (nhóm): _______________
    File đã thay đổi:
      - backend/src/routers/_____.router.js
      - backend/src/controllers/_____.controller.js
      - backend/src/models/_____.model.js
      - backend/src/middlewares/_____.js
```

### Bước 2 — Cập nhật bảng trong `docs/INDEX.md`

Mở [../INDEX.md](../INDEX.md) và:

```
[ ] Nếu THÊM endpoint mới:
    → Thêm dòng mới vào bảng "Bảng Chỉ Mục Tổng"
    → Điền đầy đủ: #, Tính năng, Nhóm, Endpoint, Security, Router, Controller, Model, link Trace

[ ] Nếu SỬA endpoint (đổi route, middleware, file):
    → Tìm dòng tương ứng trong bảng
    → Cập nhật các cột bị ảnh hưởng

[ ] Nếu XÓA endpoint:
    → Xóa dòng tương ứng trong bảng

[ ] Nếu thêm Model mới:
    → Cập nhật phần "Bản Đồ Model & Quan Hệ"

[ ] Nếu thêm Middleware mới:
    → Cập nhật phần "Bản Đồ Middleware"
```

### Bước 3 — Cập nhật Feature Trace File

```
[ ] Mở docs/features/<tên_nhóm>.md
    (hoặc tạo mới nếu là nhóm tính năng chưa có — dùng template trong new-feature.md)

[ ] Nếu THÊM endpoint:
    → Thêm section mới với cấu trúc:
      ## Tên endpoint
      ### Endpoint (METHOD + path + body)
      ### Chuỗi file (sơ đồ luồng)
      ### Bảo mật (checklist SEC-01 → SEC-10)

[ ] Nếu SỬA endpoint:
    → Cập nhật đúng section tương ứng
    → Đặc biệt: cập nhật "Chuỗi file" nếu middleware hoặc controller thay đổi

[ ] Nếu XÓA endpoint:
    → Xóa section tương ứng trong file

[ ] Cập nhật phần "File liên quan đầy đủ" nếu có file thêm/xóa
```

### Bước 4 — Kiểm tra tính nhất quán

```
[ ] Tên file trong docs/INDEX.md khớp với tên file thực tế trên disk
[ ] Link [→](features/<tên>.md) trong INDEX.md còn trỏ đúng
[ ] Không có endpoint trong code mà thiếu trong INDEX.md
[ ] Không có dòng trong INDEX.md mà endpoint đã bị xóa khỏi code
```

### Bước 5 — Xác nhận hoàn thành

```
[ ] docs/INDEX.md đã được cập nhật
[ ] docs/features/<tên>.md đã được cập nhật
[ ] Hai file trên phản ánh đúng trạng thái code hiện tại
```

---

## Ví dụ: Thêm tính năng Order

Giả sử vừa thêm `POST /api/orders` và `GET /api/orders`:

**Bước 1**: Phạm vi thay đổi
```
Endpoint: POST /api/orders, GET /api/orders
Nhóm: Order
Files: order.router.js, order.controller.js, order.model.js
```

**Bước 2**: Thêm vào INDEX.md
```markdown
| 15 | Tạo đơn hàng | Order | `POST /api/orders` | Protected + Validate | order.router.js | order.controller.js | Order | [→](features/order.md#tạo-đơn-hàng) |
| 16 | Danh sách đơn hàng | Order | `GET /api/orders` | Protected | order.router.js | order.controller.js | Order | [→](features/order.md#danh-sách-đơn-hàng) |
```

**Bước 3**: Tạo `docs/features/order.md` với template từ `new-feature.md`

**Bước 4**: Kiểm tra file `backend/src/routers/index.js` đã có:
```js
router.use('/orders', orderRouter);
```
Cập nhật INDEX.md nếu chưa ghi.

**Bước 5**: ✓ Xong.

---

## Lệnh kiểm tra nhanh tính nhất quán

```bash
# Liệt kê toàn bộ route đang đăng ký trong code
grep -r "router\.\(get\|post\|put\|patch\|delete\)" backend/src/routers/

# Liệt kê toàn bộ file controller hiện có
ls backend/src/controllers/

# Liệt kê toàn bộ file model hiện có
ls backend/src/models/

# So sánh với bảng trong INDEX.md để tìm gap
```
