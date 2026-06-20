# Kỹ Năng FE: Navigation

> Áp dụng mỗi khi thêm màn hình hoặc tab mới.  
> File cấu hình chính: `mobile/src/navigation/index.js`

---

## 1. Cấu Trúc Navigation Hiện Tại

```
NavigationContainer
  │
  ├── AuthStack (chưa đăng nhập)
  │     ├── Login
  │     └── Register
  │
  └── AppStack (đã đăng nhập)
        ├── Main (HomeTabs)  ← Tab Navigator
        │     ├── Home tab → HomeScreen
        │     └── Profile tab → ProfileScreen
        │
        ├── ProductDetail    ← Stack screen
        └── ProductForm      ← Stack screen
```

---

## 2. Thêm Stack Screen Mới

### Bước 1 — Import screen
```js
// navigation/index.js
import OrderListScreen from '../screens/OrderListScreen';
import OrderDetailScreen from '../screens/OrderDetailScreen';
import OrderFormScreen from '../screens/OrderFormScreen';
```

### Bước 2 — Thêm vào AppStack
```js
function AppStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ title: 'Chi tiết sản phẩm' }} />
      <Stack.Screen name="ProductForm" component={ProductFormScreen} options={{ title: 'Sản phẩm' }} />

      {/* ↓ Thêm screen mới ↓ */}
      <Stack.Screen name="OrderList" component={OrderListScreen} options={{ title: 'Đơn hàng' }} />
      <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ title: 'Chi tiết đơn hàng' }} />
      <Stack.Screen name="OrderForm" component={OrderFormScreen} options={{ title: 'Đơn hàng' }} />
    </Stack.Navigator>
  );
}
```

### Quy tắc đặt tên Screen
- Dùng `PascalCase`, không suffix "Screen": `OrderList`, `OrderDetail`, `OrderForm`
- Tên phải unique trong toàn bộ navigator

---

## 3. Thêm Tab Mới vào HomeTabs

```js
function HomeTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#2563EB',
        tabBarInactiveTintColor: '#9CA3AF',
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'Trang chủ', tabBarLabel: 'Trang chủ' }} />

      {/* ↓ Thêm tab mới ↓ */}
      <Tab.Screen
        name="Orders"
        component={OrderListScreen}
        options={{
          title: 'Đơn hàng',
          tabBarLabel: 'Đơn hàng',
          tabBarIcon: ({ color }) => (
            <Text style={{ color, fontSize: 20 }}>📋</Text>
          ),
        }}
      />

      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Cá nhân', tabBarLabel: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}
```

**Lưu ý**: Tab tối đa 4-5 item. Nếu quá nhiều, dùng Stack thay vì Tab.

---

## 4. Điều Hướng Giữa các Screen

### Navigate tới screen
```js
// Đơn giản
navigation.navigate('OrderList');

// Kèm params
navigation.navigate('OrderDetail', { id: item.id });

// Kèm object phức tạp (chỉnh sửa)
navigation.navigate('OrderForm', { order: item });
```

### Quay lại
```js
navigation.goBack();
```

### Navigate và xóa màn hình hiện tại khỏi stack (ví dụ sau login)
```js
navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
```

### Replace (thay thế màn hình hiện tại)
```js
navigation.replace('OrderList');
```

---

## 5. Nhận Params trong Screen

```js
// Screen nhận params từ navigate()
export default function OrderDetailScreen({ route, navigation }) {
  const { id } = route.params;           // params đơn giản
  const { order } = route.params;        // params là object

  // Kiểm tra params tùy chọn
  const existing = route.params?.order;  // undefined nếu không truyền
}
```

---

## 6. Cấu hình Header

### Header tùy chỉnh khi navigate
```js
navigation.navigate('OrderDetail', { id: 1 });
// Trong Stack.Screen options:
options={({ route }) => ({ title: `Đơn #${route.params.id}` })}
```

### Ẩn header
```js
<Stack.Screen name="Main" component={HomeTabs} options={{ headerShown: false }} />
```

### Thêm nút vào header
```js
// Trong screen, dùng useLayoutEffect
import { useLayoutEffect } from 'react';

useLayoutEffect(() => {
  navigation.setOptions({
    headerRight: () => (
      <TouchableOpacity onPress={() => navigation.navigate('OrderForm', { order: null })}>
        <Text style={{ color: '#2563EB', marginRight: 16 }}>+ Thêm</Text>
      </TouchableOpacity>
    ),
  });
}, [navigation]);
```

---

## 7. Auth Guard — Tự Động Chuyển Hướng

Trong `navigation/index.js`, logic hiện tại:

```js
export default function AppNavigator() {
  const { token, loading } = useAuth();

  if (loading) return <ActivityIndicator />;

  return (
    <NavigationContainer>
      {token ? <AppStack /> : <AuthStack />}
    </NavigationContainer>
  );
}
```

- Khi `token = null` → hiển thị `AuthStack` (Login / Register)
- Khi `token` có giá trị → hiển thị `AppStack`
- Khi logout (`clearAuth()`) → `token` về `null` → tự chuyển về Login

**Không cần** navigate thủ công sau login/logout — Context thay đổi tự trigger re-render.

---

## 8. Thứ Tự Đặt Screen trong Stack (Quan Trọng)

Thứ tự ảnh hưởng đến gesture back và animation:

```js
// ✅ ĐÚNG — screen nào mở trước đặt trước
<Stack.Screen name="Main" ... />       // root
<Stack.Screen name="OrderList" ... />  // level 1
<Stack.Screen name="OrderDetail" ... />// level 2
<Stack.Screen name="OrderForm" ... />  // level 2

// ✅ ĐÚNG — thứ tự không ảnh hưởng routing nhưng nên nhóm theo tính năng
```

---

## 9. Checklist khi thêm Screen vào Navigation

```
[ ] Import screen mới vào navigation/index.js
[ ] Thêm <Stack.Screen> hoặc <Tab.Screen> đúng vị trí
[ ] Đặt title rõ ràng trong options
[ ] Nếu nhận params: đảm bảo screen destructure đúng route.params
[ ] Nếu là form screen: truyền object null/object để phân biệt tạo/sửa
[ ] Test navigate() và goBack() hoạt động
[ ] Không tạo circular navigation (A → B → A gây stack overflow)
```
