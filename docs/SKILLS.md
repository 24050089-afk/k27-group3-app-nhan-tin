# Danh Sách Kỹ Năng — LT Web

> File này là cổng vào hệ thống kỹ năng. Đọc file này trước khi thực hiện bất kỳ thao tác nào với codebase.

---

## Kỹ Năng Theo Tình Huống

---

### NHÓM: Thêm Tính Năng Mới

#### Tôi cần thêm tính năng mới (BE + FE toàn bộ)
→ Đọc: [skills/new-feature.md](skills/new-feature.md)  
Bao gồm: quy trình 8 bước BE + checklist FE đầy đủ + sync chỉ mục.

#### Tôi cần xác định luồng FE của tính năng mới
→ Đọc: [skills/fe-feature-flow.md](skills/fe-feature-flow.md)  
Bao gồm: sơ đồ 6 lớp FE, checklist theo thứ tự, ví dụ tính năng Category.

---

### NHÓM: Frontend (FE)

#### Tôi cần hiểu kiến trúc, quy ước đặt tên, design system FE
→ Đọc: [skills/fe-architecture.md](skills/fe-architecture.md)  
Bao gồm: cấu trúc thư mục, bảng màu, typography, spacing, aliases babel, StyleSheet conventions.

#### Tôi cần tạo màn hình (Screen) mới
→ Đọc: [skills/fe-screen.md](skills/fe-screen.md)  
Bao gồm: template List screen, Form screen, Detail screen; loading/error/empty state; phân trang; keyboard handling.

#### Tôi cần thêm route / tab mới vào navigation
→ Đọc: [skills/fe-navigation.md](skills/fe-navigation.md)  
Bao gồm: cấu trúc Stack + Tab hiện tại, cách thêm screen, truyền/nhận params, header tùy chỉnh, auth guard.

#### Tôi cần gọi API từ screen (thêm API function mới)
→ Đọc: [skills/fe-api.md](skills/fe-api.md)  
Bao gồm: template api file, naming convention, cách gọi trong screen, phân trang, xử lý lỗi, upload file.

#### Tôi cần quản lý state hoặc lưu dữ liệu local
→ Đọc: [skills/fe-state.md](skills/fe-state.md)  
Bao gồm: local useState vs Context, AuthContext pattern, tạo Context mới, AsyncStorage keys, persist pattern.

#### Tôi cần tạo component UI mới hoặc xây dựng form
→ Đọc: [skills/fe-components.md](skills/fe-components.md)  
Bao gồm: Button/Input/Card sẵn có, template component mới, form validation, StyleSheet patterns, badge.

#### Tôi cần chạy / debug ứng dụng với Expo
→ Đọc: [skills/expo-dev.md](skills/expo-dev.md)  
Bao gồm: khởi chạy Expo, Expo Go, debug tools, Fast Refresh, API URL auto-detect, build EAS.

#### Tôi cần cài thêm package cho mobile
→ Luôn dùng: `npx expo install <package>` (không dùng npm install trực tiếp)  
→ Đọc: [skills/expo-dev.md](skills/expo-dev.md) — phần "Cài đặt"

---

### NHÓM: Backend (BE)

#### Tôi cần hiểu tính năng Auth (đăng ký / đăng nhập / JWT)
→ Đọc: [features/auth.md](features/auth.md)

#### Tôi cần hiểu tính năng User (CRUD người dùng / phân quyền)
→ Đọc: [features/user.md](features/user.md)

#### Tôi cần hiểu tính năng Product (CRUD sản phẩm / ownership)
→ Đọc: [features/product.md](features/product.md)

#### Tôi cần kiểm tra bảo mật trước khi viết endpoint mới
→ Đọc: [skills/security-checklist.md](skills/security-checklist.md)  
Bao gồm: 10 điểm kiểm tra, template điền nhanh, case studies lỗ hổng đã gặp.

---

### NHÓM: Tra Cứu & Đồng Bộ

#### Tôi cần biết tính năng X đang có những file nào
→ Đọc: [INDEX.md](INDEX.md) → cột "Trace" → mở [features/<tên>.md](features/)

#### Tôi vừa thêm/sửa tính năng và cần cập nhật tài liệu
→ Đọc: [skills/index-sync.md](skills/index-sync.md)  
Bao gồm: checklist 5 bước đồng bộ INDEX.md + feature trace, ví dụ cụ thể.

---

## Bảng Tra Nhanh — Skill nào cho việc gì

| Tình huống | Skill |
|---|---|
| Thêm tính năng mới (BE + FE) | [new-feature.md](skills/new-feature.md) |
| Luồng FE 6 lớp | [fe-feature-flow.md](skills/fe-feature-flow.md) |
| Kiến trúc + design system FE | [fe-architecture.md](skills/fe-architecture.md) |
| Viết Screen | [fe-screen.md](skills/fe-screen.md) |
| Thêm route/tab | [fe-navigation.md](skills/fe-navigation.md) |
| Gọi API | [fe-api.md](skills/fe-api.md) |
| State & Storage | [fe-state.md](skills/fe-state.md) |
| Component & Form | [fe-components.md](skills/fe-components.md) |
| Expo debug & build | [expo-dev.md](skills/expo-dev.md) |
| Bảo mật endpoint BE | [security-checklist.md](skills/security-checklist.md) |
| Đồng bộ chỉ mục | [index-sync.md](skills/index-sync.md) |

---

## Nguyên Tắc Kỹ Năng

1. **Kỹ năng luôn đi kèm trace** — Khi tra cứu bất kỳ tính năng nào, kỹ năng liên quan được gắn sẵn trong file feature trace.
2. **Chỉ mục luôn là nguồn sự thật** — [INDEX.md](INDEX.md) phản ánh đúng trạng thái hiện tại của codebase.
3. **Mọi endpoint phải qua security checklist** — Không viết endpoint mới mà bỏ qua [skills/security-checklist.md](skills/security-checklist.md).
4. **Trace file = bản đồ sống** — [docs/features/](features/) phải được cập nhật song song với code.
5. **FE luôn theo 6 lớp** — Navigation → Screen → State → API → Component → Style, theo [fe-feature-flow.md](skills/fe-feature-flow.md).
6. **Expo install cho mọi package FE** — `npx expo install` đảm bảo tương thích SDK 50.
