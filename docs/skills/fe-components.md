# Kỹ Năng FE: Component & Form

> Áp dụng khi tạo component UI mới hoặc xây dựng form.  
> Bao gồm: component library hiện có, template component mới, form validation, styling.

---

## 1. Component Library Hiện Có

### Button — `src/components/Button.js`

```js
<Button
  title="Đăng nhập"
  onPress={handleLogin}
  loading={loading}          // hiển thị ActivityIndicator khi true
  variant="primary"          // 'primary' (mặc định) | 'outline'
  style={{ marginTop: 8 }}   // style bổ sung tùy chọn
/>
```

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `title` | string | — | Chữ nút |
| `onPress` | function | — | Callback |
| `loading` | boolean | false | Hiển thị spinner, disable nút |
| `variant` | 'primary' \| 'outline' | 'primary' | Kiểu nút |
| `style` | StyleProp | — | Override style ngoài |

### Input — `src/components/Input.js`

```js
<Input
  label="Email"
  value={form.email}
  onChangeText={set('email')}
  placeholder="example@email.com"
  keyboardType="email-address"
  error={errors.email}           // hiển thị text đỏ bên dưới
  secureTextEntry={false}        // nếu true: ẩn text + nút toggle mắt
  autoCapitalize="none"          // 'none' | 'sentences' | 'words'
/>
```

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `label` | string | — | Label trên input |
| `value` | string | — | Giá trị |
| `onChangeText` | function | — | Callback thay đổi |
| `placeholder` | string | — | Placeholder |
| `error` | string | — | Thông báo lỗi (hiện dưới input) |
| `secureTextEntry` | boolean | false | Ẩn text + có nút toggle |
| `keyboardType` | string | 'default' | 'email-address', 'numeric', 'phone-pad' |
| `autoCapitalize` | string | 'none' | 'none', 'sentences', 'words' |

### ProductCard — `src/components/ProductCard.js`

```js
<ProductCard
  item={product}
  onPress={() => navigation.navigate('ProductDetail', { id: product.id })}
/>
```

| Prop | Type | Mô tả |
|---|---|---|
| `item` | Product object | Dữ liệu sản phẩm |
| `onPress` | function | Callback khi bấm |

---

## 2. Khi nào tạo Component Mới

**Tạo component mới khi**:
- UI pattern xuất hiện ở ≥ 2 screen khác nhau
- Logic render phức tạp cần tách ra cho dễ đọc
- Component có state riêng và tái sử dụng được

**Không tạo khi**:
- UI chỉ dùng 1 lần → đặt thẳng trong screen
- Chỉ là vài dòng View/Text đơn giản

---

## 3. Template Component Mới

### Component hiển thị (stateless)

```js
// src/components/OrderCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function OrderCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.row}>
        <Text style={styles.id}>Đơn #{item.id}</Text>
        <StatusBadge status={item.status} />
      </View>
      <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
      <Text style={styles.total}>
        {Number(item.total).toLocaleString('vi-VN', { style: 'currency', currency: 'VND' })}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  row:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  id:    { fontSize: 15, fontWeight: '600', color: '#111827' },
  date:  { fontSize: 13, color: '#6B7280', marginBottom: 4 },
  total: { fontSize: 16, fontWeight: '700', color: '#2563EB' },
});
```

### Component có state riêng

```js
// src/components/SearchBar.js
import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

export default function SearchBar({ onSearch, placeholder = 'Tìm kiếm...' }) {
  const [value, setValue] = useState('');

  const handleChange = (text) => {
    setValue(text);
    onSearch(text);
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    color: '#111827',
  },
});
```

### Badge / Tag Component

```js
// src/components/StatusBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const STATUS_MAP = {
  pending:   { label: 'Chờ xử lý', bg: '#FEF3C7', color: '#92400E' },
  confirmed: { label: 'Đã xác nhận', bg: '#D1FAE5', color: '#065F46' },
  cancelled: { label: 'Đã hủy', bg: '#FEE2E2', color: '#991B1B' },
};

export default function StatusBadge({ status }) {
  const config = STATUS_MAP[status] || { label: status, bg: '#F3F4F6', color: '#374151' };
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.label, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  label: { fontSize: 12, fontWeight: '600' },
});
```

---

## 4. Form Validation Pattern

### Validate đơn giản

```js
const validate = () => {
  const e = {};

  // Required
  if (!form.name.trim())      e.name     = 'Không được để trống.';

  // Email
  if (!/\S+@\S+\.\S+/.test(form.email))
                               e.email    = 'Email không hợp lệ.';

  // Min length
  if (form.password.length < 6) e.password = 'Tối thiểu 6 ký tự.';

  // Confirm
  if (form.password !== form.confirm) e.confirm = 'Mật khẩu không khớp.';

  // Number
  if (isNaN(Number(form.price)) || Number(form.price) < 0)
                               e.price    = 'Giá phải là số dương.';

  setErrors(e);
  return Object.keys(e).length === 0;
};
```

### Hiển thị lỗi realtime (validate khi blur)

```js
const [touched, setTouched] = useState({});

const handleBlur = (field) => {
  setTouched((t) => ({ ...t, [field]: true }));
  validate();  // validate lại khi rời field
};

// Input nhận onBlur
<Input
  value={form.name}
  onChangeText={set('name')}
  error={touched.name ? errors.name : undefined}
  // onBlur không có trong component hiện tại → thêm vào nếu cần
/>
```

### Validate số lượng ký tự còn lại

```js
const MAX_DESC = 500;
<Text style={styles.counter}>{form.description.length}/{MAX_DESC}</Text>
<Input
  value={form.description}
  onChangeText={(text) => {
    if (text.length <= MAX_DESC) set('description')(text);
  }}
/>
```

---

## 5. StyleSheet Patterns

### Cấu trúc StyleSheet chuẩn trong Screen

```js
const styles = StyleSheet.create({
  // ── Layout ────────────────────────────────────────
  container:  { flex: 1, backgroundColor: '#F9FAFB' },
  content:    { padding: 16 },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center' },
  row:        { flexDirection: 'row', alignItems: 'center' },

  // ── Header / Section ──────────────────────────────
  header:     { backgroundColor: '#fff', padding: 16, paddingTop: 20 },
  section:    { backgroundColor: '#fff', borderRadius: 12, margin: 16, overflow: 'hidden' },

  // ── Typography ────────────────────────────────────
  title:      { fontSize: 22, fontWeight: '700', color: '#111827' },
  subtitle:   { fontSize: 15, color: '#6B7280', marginTop: 4 },
  label:      { fontSize: 14, fontWeight: '500', color: '#374151' },
  value:      { fontSize: 14, color: '#111827' },
  price:      { fontSize: 16, fontWeight: '700', color: '#2563EB' },
  errorText:  { color: '#EF4444', fontSize: 12, marginTop: 4 },
  empty:      { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },

  // ── Card ──────────────────────────────────────────
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // ── Image ─────────────────────────────────────────
  image:            { width: '100%', height: 200, backgroundColor: '#F3F4F6' },
  imagePlaceholder: { justifyContent: 'center', alignItems: 'center' },

  // ── Actions ───────────────────────────────────────
  actions:    { flexDirection: 'row', margin: 16 },
  btn:        { marginTop: 8 },
});
```

### Avatar tròn với chữ cái đầu

```js
<View style={styles.avatar}>
  <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase()}</Text>
</View>

// styles:
avatar:     { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2563EB', justifyContent: 'center', alignItems: 'center' },
avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
```

---

## 6. Checklist Component mới

```
[ ] Đặt tên file: PascalCase.js (không có suffix Screen)
[ ] Đặt tại src/components/
[ ] Props có tên rõ ràng: item, onPress, loading, variant
[ ] StyleSheet.create() ở cuối file
[ ] Không hardcode màu — dùng màu từ design system (fe-architecture.md)
[ ] Dùng activeOpacity={0.85} cho TouchableOpacity
[ ] Export default (không named)
[ ] Không gọi API trong component — để screen làm việc đó
[ ] Không dùng global state trong component — nhận qua props
```
