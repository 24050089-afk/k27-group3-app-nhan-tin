# Kỹ Năng FE: Viết Screen

> Áp dụng mỗi khi tạo màn hình mới.  
> Skill liên quan: [fe-navigation.md](fe-navigation.md) (đăng ký route), [fe-api.md](fe-api.md) (gọi API), [fe-components.md](fe-components.md) (UI).

---

## 0. Safe Area — Quy tắc bắt buộc

Mọi screen **phải** xử lý safe area để không bị che bởi notch / Dynamic Island / home indicator.

### Hai trường hợp

| Trường hợp | Cách xử lý |
|---|---|
| Screen trong Stack/Tab có header | React Navigation tự xử lý top. Chỉ cần bottom cho ScrollView/FlatList |
| Screen tự quản lý header (`headerShown: false`) | Phải xử lý cả top lẫn bottom thủ công |

### Pattern chuẩn — dùng `useDevice()`

```js
import { useDevice } from '@store/DeviceContext';

export default function MyScreen() {
  const { layout } = useDevice();

  return (
    <View style={styles.container}>
      {/* Screen tự quản lý header → thêm safeTop */}
      <View style={[styles.header, { paddingTop: layout.safeTop + 12 }]}>
        <Text style={styles.title}>Tiêu đề</Text>
      </View>

      {/* FlatList → thêm contentPaddingBottom để không bị home indicator che */}
      <FlatList
        contentContainerStyle={{ paddingBottom: layout.contentPaddingBottom }}
        ...
      />
    </View>
  );
}
```

### Các giá trị từ `layout`

| Giá trị | Dùng cho |
|---|---|
| `layout.safeTop` | paddingTop của header khi `headerShown: false` |
| `layout.safeBottom` | paddingBottom thủ công (ví dụ fixed footer) |
| `layout.contentPaddingBottom` | `contentContainerStyle` của FlatList/ScrollView |
| `layout.screenPaddingH` | paddingHorizontal mặc định theo nhóm thiết bị |
| `layout.customHeaderH` | Chiều cao header tự build (safeTop + 52) |

### Khi nào dùng `<SafeAreaView>`

Chỉ dùng `SafeAreaView` từ `react-native-safe-area-context` (không phải từ `react-native`) cho auth screens hoặc modal toàn màn hình không có header:

```js
import { SafeAreaView } from 'react-native-safe-area-context';

// Auth screen (Login / Register) — không có header nào bọc ngoài
export default function LoginScreen() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* content */}
    </SafeAreaView>
  );
}
```

---

## 1. Template Screen Cơ Bản (đọc dữ liệu)

```js
// src/screens/OrderListScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { getOrdersApi } from '@api/order.api';

export default function OrderListScreen({ navigation }) {
  const [data, setData]           = useState([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await getOrdersApi();
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // ── Loading state ──────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  // ── Error state ────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <OrderCard item={item} onPress={() => navigation.navigate('OrderDetail', { id: item.id })} />
        )}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={styles.empty}>Không có dữ liệu.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list:      { padding: 16 },
  empty:     { textAlign: 'center', color: '#9CA3AF', marginTop: 40 },
  errorText: { color: '#EF4444', fontSize: 15, textAlign: 'center', padding: 16 },
});
```

---

## 2. Template Screen Form (tạo / chỉnh sửa)

```js
// src/screens/OrderFormScreen.js
import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { createOrderApi, updateOrderApi } from '@api/order.api';
import Input from '@components/Input';
import Button from '@components/Button';

export default function OrderFormScreen({ route, navigation }) {
  const existing = route.params?.order;   // null = tạo mới, object = chỉnh sửa
  const isEdit = !!existing;

  // ── Form state ─────────────────────────────────────────────
  const [form, setForm] = useState({
    note: existing?.note || '',
    // ... các field khác
  });
  const [errors, setErrors]   = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));

  // ── Validation ─────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!form.note.trim()) e.note = 'Vui lòng nhập ghi chú.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isEdit) {
        await updateOrderApi(existing.id, form);
      } else {
        await createOrderApi(form);
      }
      Alert.alert('Thành công', isEdit ? 'Đã cập nhật.' : 'Đã tạo mới.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>
          {isEdit ? 'Chỉnh sửa đơn hàng' : 'Tạo đơn hàng mới'}
        </Text>

        <Input
          label="Ghi chú"
          value={form.note}
          onChangeText={set('note')}
          placeholder="Nhập ghi chú..."
          error={errors.note}
        />

        <Button
          title={isEdit ? 'Cập nhật' : 'Tạo mới'}
          onPress={handleSubmit}
          loading={loading}
          style={styles.btn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff' },
  title:     { fontSize: 22, fontWeight: '700', color: '#111827', marginBottom: 24 },
  btn:       { marginTop: 8 },
});
```

---

## 3. Template Screen Chi Tiết (xem + xóa)

```js
// src/screens/OrderDetailScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { getOrderByIdApi, deleteOrderApi } from '@api/order.api';
import { useAuth } from '@store/AuthContext';
import Button from '@components/Button';

export default function OrderDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const { user } = useAuth();
  const [item, setItem]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getOrderByIdApi(id)
      .then((res) => setItem(res.data))
      .catch((err) => Alert.alert('Lỗi', err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const handleDelete = () => {
    Alert.alert('Xác nhận', 'Bạn có chắc muốn xóa?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteOrderApi(id);
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

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563EB" /></View>;
  }
  if (!item) return null;

  const isOwner = user?.id === item.user_id || user?.role === 'admin';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ... nội dung chi tiết */}

      {isOwner && (
        <View style={styles.actions}>
          <Button title="Chỉnh sửa" onPress={() => navigation.navigate('OrderForm', { order: item })} style={{ flex: 1, marginRight: 8 }} />
          <Button title="Xóa" onPress={handleDelete} loading={deleting} variant="outline" style={{ flex: 1 }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content:   { paddingBottom: 32 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center' },
  actions:   { flexDirection: 'row', margin: 16, marginTop: 24 },
});
```

---

## 4. Patterns Bắt Buộc

### Loading State
```js
// Luôn có 3 trạng thái: loading / error / data
const [loading, setLoading] = useState(true);
const [error, setError]     = useState(null);
const [data, setData]       = useState([]);

// Trong JSX: kiểm tra theo thứ tự
if (loading) return <ActivityIndicator />;
if (error)   return <Text>{error}</Text>;
// ... render data
```

### Pull-to-Refresh (FlatList)
```js
const [refreshing, setRefreshing] = useState(false);
const onRefresh = () => { setRefreshing(true); fetchData(); };

<FlatList
  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
/>
```

### Phân Trang Vô Hạn (FlatList)
```js
const [page, setPage]             = useState(1);
const [totalPages, setTotalPages] = useState(1);

const onEndReached = () => {
  if (page < totalPages) fetchData(page + 1);
};

<FlatList
  onEndReached={onEndReached}
  onEndReachedThreshold={0.3}
/>
```

### Keyboard (Form Screen)
```js
// Luôn bọc form trong KeyboardAvoidingView
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
>
  <ScrollView keyboardShouldPersistTaps="handled">
    {/* form fields */}
  </ScrollView>
</KeyboardAvoidingView>
```

### Empty State
```js
<FlatList
  ListEmptyComponent={
    <View style={styles.center}>
      <Text style={styles.empty}>Không có dữ liệu.</Text>
    </View>
  }
/>
```

### Ownership Check (xem quyền sửa/xóa)
```js
const isOwner = user?.id === item.user_id || user?.role === 'admin';
{isOwner && <Button title="Xóa" onPress={handleDelete} />}
```

---

## 5. Checklist Screen mới

```
[ ] Đặt tên file đúng: <Tên>Screen.js (PascalCase)
[ ] Đặt tại src/screens/
[ ] Safe area: dùng layout.safeTop nếu headerShown: false
[ ] Safe area: dùng layout.contentPaddingBottom cho FlatList/ScrollView
[ ] Auth screen không có navigator header → dùng <SafeAreaView> từ react-native-safe-area-context
[ ] Có loading state (ActivityIndicator)
[ ] Có error state (hiển thị lỗi rõ ràng)
[ ] Có empty state nếu là list
[ ] Form screen: bọc KeyboardAvoidingView + ScrollView
[ ] Form screen: validate trước khi submit
[ ] Alert cho lỗi + thành công
[ ] Ownership check nếu có nút sửa/xóa
[ ] Đăng ký vào navigation (fe-navigation.md)
[ ] Tạo API function tương ứng (fe-api.md)
```
