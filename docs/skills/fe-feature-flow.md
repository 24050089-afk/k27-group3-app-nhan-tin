# Kỹ Năng FE: Luồng Tổng Khi Thêm Tính Năng

> **Đây là file entry point cho mọi yêu cầu tính năng FE.**  
> Đọc file này trước, sau đó đi sâu vào skill tương ứng theo từng lớp.

---

## Sơ Đồ 6 Lớp FE

```
Yêu cầu tính năng mới
         │
         ▼
┌────────────────────────────────────────────────────────────┐
│  [L1] NAVIGATION                                           │
│  mobile/src/navigation/index.js                            │
│  → Đăng ký Screen mới vào Stack hoặc Tab                  │
│  → Kỹ năng: fe-navigation.md                              │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  [L2] SCREEN                                               │
│  mobile/src/screens/<Tên>Screen.js                         │
│  → Kết hợp: state cục bộ, gọi API, render UI              │
│  → Kỹ năng: fe-screen.md                                  │
└──────┬─────────────────┬───────────────────────────────────┘
       │                 │
       ▼                 ▼
┌────────────┐   ┌───────────────────────────────────────────┐
│ [L3] STATE │   │  [L4] API LAYER                          │
│ store/ +   │   │  mobile/src/api/<tên>.api.js              │
│ storage.js │   │  → client.js → env.js → BE               │
│            │   │  → Kỹ năng: fe-api.md                    │
│ Kỹ năng:   │   └───────────────────────────────────────────┘
│ fe-state.md│
└────────────┘
       │
       ▼
┌────────────────────────────────────────────────────────────┐
│  [L5] COMPONENTS                                           │
│  mobile/src/components/<Tên>.js                            │
│  → Button, Input, Card, List item,...                      │
│  → Kỹ năng: fe-components.md                             │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────┐
│  [L6] STYLING & DESIGN SYSTEM                              │
│  StyleSheet.create({}) trong từng file                     │
│  → Bảng màu, spacing, typography chuẩn                    │
│  → Kỹ năng: fe-architecture.md                            │
└────────────────────────────────────────────────────────────┘
```

---

## Checklist Thêm Tính Năng FE (theo thứ tự)

```
[ ] L1 — Đăng ký route mới trong navigation/index.js
          Đọc: fe-navigation.md

[ ] L2 — Tạo file Screen tại src/screens/<Tên>Screen.js
          Template chuẩn: fe-screen.md
          - useState cho local state
          - useEffect để load data
          - loading / error / empty state
          - KeyboardAvoidingView nếu có form

[ ] L3 — Kết nối State nếu cần global state
          Đọc: fe-state.md
          - Dùng useAuth() nếu cần user hiện tại
          - Tạo Context mới nếu state dùng ở nhiều screen
          - Dùng AsyncStorage nếu cần persist

[ ] L4 — Tạo / cập nhật API file tại src/api/<tên>.api.js
          Đọc: fe-api.md
          - Dùng client.js (tự động attach token + resolve URL)
          - Đặt đúng HTTP method
          - Xử lý lỗi qua interceptor

[ ] L5 — Tạo component mới nếu UI pattern chưa có
          Đọc: fe-components.md
          - Dùng lại Button, Input, Card nếu phù hợp
          - Tạo component mới chỉ khi UI pattern xuất hiện ≥ 2 lần

[ ] L6 — Áp dụng design system (màu, spacing, font)
          Đọc: fe-architecture.md — phần "Design System"

[ ] Sync — Cập nhật docs/INDEX.md + docs/features/<tên>.md
          Đọc: index-sync.md
```

---

## Tra cứu nhanh: Skill nào cho việc gì?

| Tôi muốn... | Đọc skill |
|---|---|
| Hiểu toàn bộ cấu trúc FE | [fe-architecture.md](fe-architecture.md) |
| Thêm màn hình mới | [fe-screen.md](fe-screen.md) |
| Thêm route / tab mới | [fe-navigation.md](fe-navigation.md) |
| Gọi API từ screen | [fe-api.md](fe-api.md) |
| Quản lý state / lưu local | [fe-state.md](fe-state.md) |
| Tạo component / form / UI | [fe-components.md](fe-components.md) |
| Chạy debug với Expo | [expo-dev.md](expo-dev.md) |
| Thêm tính năng BE đồng thời | [new-feature.md](new-feature.md) |
| Kiểm tra bảo mật | [security-checklist.md](security-checklist.md) |
| Đồng bộ chỉ mục sau khi xong | [index-sync.md](index-sync.md) |

---

## Ví dụ: Thêm tính năng "Danh mục sản phẩm" (Category)

```
L1 NAVIGATION
   → Thêm <Stack.Screen name="CategoryList" component={CategoryListScreen} />
   → Thêm <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />

L2 SCREEN
   → Tạo src/screens/CategoryListScreen.js
   → Tạo src/screens/CategoryDetailScreen.js
   → Pattern: FlatList + phân trang + pull-to-refresh

L4 API
   → Tạo src/api/category.api.js
   → getCategoriesApi(params), getCategoryByIdApi(id), createCategoryApi(data)

L3 STATE
   → Dùng local useState trong screen (không cần global context)
   → Không persist (không cần AsyncStorage)

L5 COMPONENTS
   → Dùng lại ProductCard pattern → tạo CategoryCard.js
   → Dùng lại Input, Button đã có

L6 STYLE
   → Màu primary: #2563EB, background list: #F9FAFB

SYNC
   → Thêm vào docs/INDEX.md bảng FE Screens
   → Tạo docs/features/category.md
```
