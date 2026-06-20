# Kỹ Năng FE: Kiến Trúc & Quy Ước

> Đọc file này để hiểu toàn bộ cấu trúc, quy ước đặt tên, design system và các pattern nền tảng của FE.  
> Mọi screen, component, file mới đều phải tuân thủ tài liệu này.

---

## 1. Cấu Trúc Thư Mục Chi Tiết

```
mobile/
├── App.js                      ← Entry point: wrap SafeAreaProvider + AuthProvider + Navigator
├── app.json                    ← Expo config: tên app, bundle ID, icon
├── babel.config.js             ← babel-preset-expo + module-resolver aliases
├── package.json                ← main: node_modules/expo/AppEntry.js
│
└── src/
    ├── api/                    ← [L4] Lớp giao tiếp BE
    │   ├── client.js           ← Axios instance: auto token + auto URL
    │   ├── auth.api.js         ← Hàm gọi /api/auth/*
    │   └── product.api.js      ← Hàm gọi /api/products/*
    │   └── <tên>.api.js        ← Mỗi nhóm tính năng = 1 file
    │
    ├── screens/                ← [L2] Màn hình (1 file = 1 màn hình)
    │   ├── LoginScreen.js
    │   ├── RegisterScreen.js
    │   ├── HomeScreen.js
    │   ├── ProductDetailScreen.js
    │   ├── ProductFormScreen.js
    │   └── ProfileScreen.js
    │
    ├── components/             ← [L5] Component tái sử dụng
    │   ├── Button.js           ← variant: primary | outline
    │   ├── Input.js            ← label, error, secureTextEntry
    │   └── ProductCard.js      ← card hiển thị sản phẩm
    │
    ├── navigation/             ← [L1] Cấu hình điều hướng
    │   └── index.js            ← Stack (App + Auth) + Tab (HomeTabs)
    │
    ├── store/                  ← [L3] Global state (Context API)
    │   └── AuthContext.js      ← user, token, login, logout, register
    │
    ├── hooks/                  ← Custom hooks (re-export từ store)
    │   └── useAuth.js          ← re-export useAuth từ AuthContext
    │
    └── utils/                  ← Tiện ích dùng chung
        ├── storage.js          ← AsyncStorage wrapper (token + user)
        └── env.js              ← Auto-resolve API_BASE_URL theo môi trường
```

---

## 2. Quy Ước Đặt Tên

### File

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Screen | `PascalCase` + `Screen.js` | `OrderListScreen.js` |
| Component | `PascalCase` + `.js` | `OrderCard.js` |
| API file | `camelCase` + `.api.js` | `order.api.js` |
| Context | `PascalCase` + `Context.js` | `CartContext.js` |
| Hook | `use` + `PascalCase` + `.js` | `useCart.js` |
| Utility | `camelCase` + `.js` | `formatPrice.js` |

### Biến & Function

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Component | `PascalCase` | `function OrderCard({ item })` |
| Hook | `use` + `PascalCase` | `const useCart = () =>` |
| API function | `camelCase` + `Api` | `const getOrdersApi = ...` |
| State setter helper | `set` + key | `const set = (key) => (val) => ...` |
| Style object | `camelCase` | `styles.container` |

### Navigation Screen Names

Dùng `PascalCase` không có suffix "Screen":

```js
<Stack.Screen name="OrderList" component={OrderListScreen} />
<Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
```

---

## 3. Design System

### Bảng Màu Chuẩn

```js
const COLORS = {
  // Primary
  primary:        '#2563EB',   // Xanh chính — button, link, icon active
  primaryLight:   '#EFF6FF',   // Xanh nhạt — badge nền, highlight

  // Neutral
  textDark:       '#111827',   // Text chính (tiêu đề, label)
  textMedium:     '#374151',   // Text phụ (mô tả)
  textLight:      '#6B7280',   // Text gợi ý, phụ nhỏ
  textPlaceholder:'#9CA3AF',   // Placeholder

  // Background
  bgPage:         '#F9FAFB',   // Nền trang (list, tab)
  bgCard:         '#FFFFFF',   // Nền card, input, modal
  bgInput:        '#F9FAFB',   // Nền ô nhập liệu

  // Border
  border:         '#D1D5DB',   // Viền input thường
  borderLight:    '#E5E7EB',   // Viền phân cách nhẹ

  // Semantic
  error:          '#EF4444',   // Lỗi
  success:        '#10B981',   // Thành công
  warning:        '#F59E0B',   // Cảnh báo

  // Tab
  tabActive:      '#2563EB',
  tabInactive:    '#9CA3AF',
};
```

### Typography

```js
const TYPOGRAPHY = {
  h1:    { fontSize: 28, fontWeight: '700' },   // Tiêu đề lớn (trang login)
  h2:    { fontSize: 22, fontWeight: '700' },   // Tiêu đề screen
  h3:    { fontSize: 18, fontWeight: '700' },   // Tiêu đề section
  body:  { fontSize: 15, fontWeight: '400' },   // Text thường
  small: { fontSize: 13, fontWeight: '400' },   // Text nhỏ, phụ
  label: { fontSize: 14, fontWeight: '500' },   // Label form
  price: { fontSize: 16, fontWeight: '700' },   // Giá tiền
};
```

### Spacing

```js
const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
};
```

### Border Radius

```js
const RADIUS = {
  sm:  8,
  md:  10,
  lg:  12,
  full: 9999,
};
```

### Shadow (Card)

```js
const SHADOW = {
  shadowColor: '#000',
  shadowOpacity: 0.06,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,   // Android
};
```

---

## 4. Pattern Chuẩn

### Pattern: Format giá tiền VNĐ

```js
const formatPrice = (price) =>
  Number(price).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
```

### Pattern: State setter ngắn gọn cho form

```js
const [form, setForm] = useState({ name: '', email: '' });
const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

// Dùng:
<Input value={form.name} onChangeText={set('name')} />
<Input value={form.email} onChangeText={set('email')} />
```

### Pattern: Validate form

```js
const validate = () => {
  const e = {};
  if (!form.name.trim()) e.name = 'Không được để trống.';
  if (!form.email)       e.email = 'Email không hợp lệ.';
  setErrors(e);
  return Object.keys(e).length === 0;
};
```

### Pattern: Gọi API với loading + Alert

```js
const [loading, setLoading] = useState(false);

const handleSubmit = async () => {
  if (!validate()) return;
  setLoading(true);
  try {
    await someApi(payload);
    Alert.alert('Thành công', 'Đã lưu.');
  } catch (err) {
    Alert.alert('Lỗi', err.message);
  } finally {
    setLoading(false);
  }
};
```

### Pattern: Xác nhận xóa

```js
const handleDelete = () => {
  Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa?', [
    { text: 'Hủy', style: 'cancel' },
    {
      text: 'Xóa',
      style: 'destructive',
      onPress: async () => {
        setDeleting(true);
        try {
          await deleteApi(id);
          navigation.goBack();
        } catch (err) {
          Alert.alert('Lỗi', err.message);
        } finally {
          setDeleting(false);
        }
      },
    },
  ]);
};
```

---

## 5. Aliases Babel (Import ngắn gọn)

Được cấu hình trong `babel.config.js`:

```js
import Button from '@components/Button';
import { useAuth } from '@store/AuthContext';
import { getOrdersApi } from '@api/order.api';
import { formatPrice } from '@utils/format';
```

| Alias | Trỏ tới |
|---|---|
| `@api` | `./src/api` |
| `@screens` | `./src/screens` |
| `@components` | `./src/components` |
| `@navigation` | `./src/navigation` |
| `@store` | `./src/store` |
| `@hooks` | `./src/hooks` |
| `@utils` | `./src/utils` |

---

## 6. Quy Tắc StyleSheet

```js
// ✅ ĐÚNG — StyleSheet.create() ở cuối file, đặt tên rõ ràng
const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  header:     { paddingHorizontal: 16, paddingVertical: 12 },
  card:       { backgroundColor: '#fff', borderRadius: 12, padding: 12 },
  title:      { fontSize: 18, fontWeight: '700', color: '#111827' },
  errorText:  { color: '#EF4444', fontSize: 12, marginTop: 4 },
});

// ❌ SAI — inline style
<View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>

// ❌ SAI — magic number không rõ nghĩa
<Text style={{ fontSize: 13, color: '#6B7280' }}>
```

---

## 7. Dependency Package Quan Trọng

| Package | Version | Dùng cho |
|---|---|---|
| `expo` | ~50.0.0 | Dev toolchain, entry point |
| `expo-status-bar` | ~1.11.1 | Status bar |
| `expo-constants` | ~15.4.5 | hostUri để resolve API URL |
| `@react-navigation/native` | ^6.1.17 | Navigation container |
| `@react-navigation/native-stack` | ^6.9.26 | Stack navigator |
| `@react-navigation/bottom-tabs` | ^6.5.20 | Tab navigator |
| `axios` | ^1.6.7 | HTTP client |
| `@react-native-async-storage/async-storage` | 1.21.0 | Lưu token/user |
| `react-native-safe-area-context` | 4.8.2 | Safe area |
| `react-native-screens` | ~3.29.0 | Native navigation screens |

**Khi cài package mới**: Luôn dùng `npx expo install <package>` để đảm bảo tương thích SDK 50.
