# Design Theme — Tokens & System

> Bỏ vào đây: màu sắc, font, spacing, shadow, border radius, animation.  
> Paste trực tiếp từ Figma Inspect, Zeplin, hoặc mô tả tay.

---

## COLOR PALETTE
> Bỏ vào: tên token + mã hex + mô tả khi dùng

| Token | Hex | Dùng cho |
|---|---|---|
| `primary` | #2563EB | Nút chính, link, icon active, accent |
| `primary-dark` | #1D4ED8 | Hover / pressed state của primary |
| `primary-light` | #EFF6FF | Background nhấn nhẹ, badge, tag |
| `text-primary` | #111827 | Tiêu đề, text quan trọng |
| `text-secondary` | #6B7280 | Mô tả, placeholder, label phụ |
| `text-disabled` | #9CA3AF | Disabled state |
| `background` | #F9FAFB | Nền toàn app |
| `surface` | #FFFFFF | Card, modal, input background |
| `border` | #E5E7EB | Border input, divider |
| `border-focus` | #2563EB | Border khi input focused |
| `error` | #EF4444 | Lỗi, cảnh báo nguy hiểm |
| `error-light` | #FEF2F2 | Background thông báo lỗi |
| `success` | #10B981 | Thành công, active, online |
| `warning` | #F59E0B | Cảnh báo trung bình |
| `tab-active` | #2563EB | Tab bar active icon + label |
| `tab-inactive` | #9CA3AF | Tab bar inactive |

<!-- BỔ SUNG MÀU VÀO ĐÂY — thêm dòng vào bảng trên -->

---

## TYPOGRAPHY
> Bỏ vào: tên style + font size + font weight + line height + dùng cho

| Style | Size | Weight | Line Height | Dùng cho |
|---|---|---|---|---|
| `h1` | 34 | 800 | 41 | Tiêu đề lớn (splash, onboarding) |
| `h2` | 28 | 700 | 34 | Tiêu đề section |
| `xl` | 20 | 700 | 28 | Card title, modal header |
| `lg` | 17 | 600 | 24 | Header screen, item title |
| `md` | 15 | 400 | 22 | Body text, description |
| `sm` | 13 | 400 | 18 | Label, caption, badge |
| `xs` | 11 | 400 | 16 | Tag, timestamp, hint |

**Font Family**:
- iOS: `System` (SF Pro)
- Android: `Roboto`
- Monospace (code/debug): iOS `Menlo`, Android `monospace`

<!-- BỔ SUNG FONT VÀO ĐÂY -->

---

## SPACING SYSTEM
> Bỏ vào: tên token + giá trị px (trước scale)

| Token | Value (base) | Dùng cho |
|---|---|---|
| `xs` | 4 | Gap rất nhỏ, icon padding |
| `sm` | 8 | Gap giữa label và input |
| `md` | 16 | Padding ngang màn hình, gap card |
| `lg` | 24 | Margin section |
| `xl` | 32 | Khoảng cách lớn giữa block |
| `xxl` | 48 | Hero section padding |

*(Tất cả đã được scale responsive qua `sp` trong `utils/dimensions.js`)*

<!-- BỔ SUNG SPACING VÀO ĐÂY -->

---

## BORDER RADIUS

| Token | Value | Dùng cho |
|---|---|---|
| `sm` | 6 | Badge, tag nhỏ |
| `md` | 10 | Input, card nhỏ |
| `lg` | 14 | Card chính, modal |
| `xl` | 20 | Bottom sheet, large card |
| `full` | 9999 | Avatar, button pill, chip |

<!-- BỔ SUNG BORDER RADIUS VÀO ĐÂY -->

---

## SHADOW / ELEVATION

| Level | iOS shadow | Android elevation | Dùng cho |
|---|---|---|---|
| `sm` | opacity 0.06, blur 4, y 2 | elevation: 2 | Card phẳng |
| `md` | opacity 0.10, blur 8, y 4 | elevation: 4 | Card nổi, dropdown |
| `lg` | opacity 0.15, blur 16, y 8 | elevation: 8 | Modal, bottom sheet |
| `xl` | opacity 0.20, blur 24, y 12 | elevation: 12 | FAB, toast |

```js
// Dùng trong StyleSheet:
shadowSm: {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
},
```

<!-- BỔ SUNG SHADOW VÀO ĐÂY -->

---

## ANIMATION

| Loại | Duration | Easing | Dùng cho |
|---|---|---|---|
| Fade | 200ms | ease-in-out | Hiện/ẩn overlay |
| Slide | 300ms | ease-out | Modal slide up |
| Press | 100ms | ease-in | Button press feedback |
| Page | 350ms | ease-in-out | Navigation transition |

<!-- BỔ SUNG ANIMATION VÀO ĐÂY -->

---

## GHI CHÚ THIẾT KẾ

<!-- Bỏ bất kỳ ghi chú đặc biệt nào về thiết kế vào đây -->
<!-- Ví dụ: "Nút xóa luôn có confirm dialog", "Ảnh đại diện luôn tròn", v.v. -->
