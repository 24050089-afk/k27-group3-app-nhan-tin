# Component Specifications

> Bỏ vào đây: mô tả các component UI cần có — props, trạng thái, hành vi.  
> Đọc file này trước khi tạo hoặc chỉnh sửa bất kỳ component nào trong `src/components/`.

---

## TEMPLATE — Copy block này cho component mới

```
## [TênComponent]

**File**: `src/components/<Tên>.js`
**Dùng ở**: [danh sách screen dùng component này]

### Props
| Prop | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `propA` | string | ✓ | — | [mô tả] |
| `propB` | boolean | | false | [mô tả] |

### Variants / States
- `default`: [mô tả giao diện bình thường]
- `loading`: [mô tả khi đang loading]
- `disabled`: [mô tả khi bị vô hiệu]
- `error`: [mô tả khi có lỗi]

### Ghi chú thiết kế
- [quy tắc đặc biệt nào đó]
```

---

## CÁC COMPONENT HIỆN CÓ

---

## Button

**File**: `src/components/Button.js`
**Dùng ở**: Tất cả screen có hành động

### Props
| Prop | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `title` | string | ✓ | — | Text hiển thị |
| `onPress` | function | ✓ | — | Callback |
| `loading` | boolean | | false | Hiện spinner, disable press |
| `variant` | `'primary' \| 'outline'` | | `'primary'` | Kiểu nút |
| `style` | ViewStyle | | — | Override style ngoài |

### Variants
- `primary`: nền `#2563EB`, text trắng
- `outline`: viền `#2563EB`, text `#2563EB`, nền trong suốt
- `loading`: spinner thay text, opacity 0.8, không cho nhấn

---

## Input

**File**: `src/components/Input.js`
**Dùng ở**: LoginScreen, RegisterScreen, ProductFormScreen, ProfileScreen

### Props
| Prop | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `label` | string | | — | Label hiển thị trên input |
| `value` | string | ✓ | — | Giá trị hiện tại |
| `onChangeText` | function | ✓ | — | Callback khi thay đổi |
| `placeholder` | string | | — | Placeholder text |
| `error` | string | | — | Hiện text lỗi đỏ bên dưới |
| `secureTextEntry` | boolean | | false | Ẩn ký tự (password) |
| `keyboardType` | KeyboardType | | `'default'` | Loại bàn phím |
| `multiline` | boolean | | false | Cho phép nhiều dòng |
| `editable` | boolean | | true | Cho phép chỉnh sửa |

### States
- `default`: border `#E5E7EB`
- `focused`: border `#2563EB`
- `error`: border `#EF4444`, text lỗi `#EF4444` bên dưới
- `disabled`: nền `#F3F4F6`, text `#9CA3AF`

---

## ProductCard

**File**: `src/components/ProductCard.js`
**Dùng ở**: HomeScreen (FlatList)

### Props
| Prop | Type | Required | Default | Mô tả |
|---|---|---|---|---|
| `item` | Product | ✓ | — | Object sản phẩm |
| `onPress` | function | ✓ | — | Callback khi nhấn card |

### Layout card
- Ảnh sản phẩm (trái, 80×80, border radius md)
- Tên sản phẩm (bold)
- Giá (màu primary)
- Tồn kho (text-secondary)

---

<!-- THÊM COMPONENT MỚI VÀO ĐÂY -->
