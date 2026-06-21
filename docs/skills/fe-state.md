# Kỹ Năng FE: State Management & Storage

> Áp dụng khi cần lưu trữ dữ liệu (local/global/persist) trong ứng dụng.  
> Bao gồm: Context API, useState, AsyncStorage, quyết định khi nào dùng loại nào.

---

## 1. Bản Đồ State

```
┌─────────────────────────────────────────────────────────┐
│  Global State (Context API)                             │
│  src/store/AuthContext.js                               │
│  → user, token, login, logout, register, refreshUser   │
│  → Tất cả screen đều truy cập qua useAuth()            │
└─────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────┐
│  Device & Layout State (Context API)                    │
│  src/store/DeviceContext.js                             │
│  → insets: { top, bottom, left, right } — safe area    │
│  → device: { isSmall/isMedium/isLarge/isXLarge, ... }  │
│  → layout: { safeTop, contentPaddingBottom, ... }       │
│  → Cập nhật tự động khi xoay màn hình                  │
│  → Truy cập qua useDevice()                            │
└─────────────────────────────────────────────────────────┘
                        ↕ Sync với
┌─────────────────────────────────────────────────────────┐
│  Persist Storage (AsyncStorage)                         │
│  src/utils/storage.js                                   │
│  → TOKEN_KEY: '@lt_web_token'                          │
│  → USER_KEY:  '@lt_web_user'                           │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  Local State (useState trong Screen)                    │
│  → form fields, loading, error, list data, pagination   │
│  → Không chia sẻ ra ngoài screen đó                    │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Quyết Định Dùng State Nào

| Tình huống | Dùng |
|---|---|
| Dữ liệu chỉ dùng trong 1 screen | `useState` |
| Form fields | `useState` |
| Loading / error của API call | `useState` |
| User đang đăng nhập (dùng ở nhiều screen) | `useAuth()` |
| Giỏ hàng, thông báo (dùng ở nhiều screen) | Tạo Context mới |
| Cần dữ liệu tồn tại sau khi tắt app | `AsyncStorage` |
| Token xác thực | `AsyncStorage` (đã có trong storage.js) |

---

## 3. AuthContext — Cơ Chế Hoạt Động

### Pattern useReducer

```js
// src/store/AuthContext.js
const initialState = { user: null, token: null, loading: true };

function reducer(state, action) {
  switch (action.type) {
    case 'SET_AUTH':   return { ...state, user: action.user, token: action.token, loading: false };
    case 'LOGOUT':     return { ...initialState, loading: false };
    case 'SET_LOADING':return { ...state, loading: action.loading };
    default:           return state;
  }
}
```

### Khởi tạo từ AsyncStorage (khi mở app)

```js
useEffect(() => {
  (async () => {
    const token = await getToken();   // AsyncStorage
    const user  = await getUser();    // AsyncStorage
    if (token && user) {
      dispatch({ type: 'SET_AUTH', user, token });
    } else {
      dispatch({ type: 'SET_LOADING', loading: false });
    }
  })();
}, []);
```

### Dùng trong Screen

```js
import { useAuth } from '@store/AuthContext';
// hoặc
import { useAuth } from '@hooks/useAuth';

function ProfileScreen() {
  const { user, token, login, logout, register, refreshUser, loading } = useAuth();
}
```

---

## 4. Tạo Context Mới (khi cần global state ngoài auth)

Template chuẩn theo AuthContext:

```js
// src/store/CartContext.js
import React, { createContext, useContext, useReducer } from 'react';

const CartContext = createContext(null);

const initialState = { items: [], total: 0 };

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_ITEM': {
      const existing = state.items.find((i) => i.id === action.item.id);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i
          ),
        };
      }
      return { ...state, items: [...state.items, { ...action.item, qty: 1 }] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter((i) => i.id !== action.id) };
    case 'CLEAR':
      return initialState;
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addItem    = (item) => dispatch({ type: 'ADD_ITEM', item });
  const removeItem = (id)   => dispatch({ type: 'REMOVE_ITEM', id });
  const clear      = ()     => dispatch({ type: 'CLEAR' });

  const total = state.items.reduce((sum, i) => sum + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{ ...state, total, addItem, removeItem, clear }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
```

### Đăng ký Provider trong App.js

```js
// App.js
import { CartProvider } from './src/store/CartContext';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <CartProvider>         {/* ← Thêm vào đây */}
          <StatusBar style="dark" />
          <AppNavigator />
        </CartProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
```

---

## 5. AsyncStorage — Hết storage.js

```js
// src/utils/storage.js — API hiện có

// Token
saveToken(token)    // lưu token
getToken()          // lấy token (async → await)
removeToken()       // xóa token

// User
saveUser(user)      // lưu object user (JSON.stringify)
getUser()           // lấy user (JSON.parse), null nếu chưa có
removeUser()        // xóa user

// Xóa cả hai (khi logout)
clearAuth()
```

### Thêm Storage Key Mới

```js
// Thêm vào storage.js
const CART_KEY = '@lt_web_cart';

export const saveCart = (items) =>
  AsyncStorage.setItem(CART_KEY, JSON.stringify(items));

export const getCart = async () => {
  const raw = await AsyncStorage.getItem(CART_KEY);
  return raw ? JSON.parse(raw) : [];
};

export const clearCart = () => AsyncStorage.removeItem(CART_KEY);
```

**Quy ước key**: `@lt_web_<tên>` — luôn có prefix `@lt_web_` để tránh xung đột.

---

## 6. Local State Patterns

### State cho list + phân trang
```js
const [data, setData]             = useState([]);
const [loading, setLoading]       = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [page, setPage]             = useState(1);
const [totalPages, setTotalPages] = useState(1);
const [search, setSearch]         = useState('');
```

### State cho form
```js
const [form, setForm]   = useState({ name: '', email: '', password: '' });
const [errors, setErrors] = useState({});
const [loading, setLoading] = useState(false);

// Setter pattern ngắn gọn
const set = (key) => (val) => setForm((f) => ({ ...f, [key]: val }));
```

### State boolean (toggle, modal)
```js
const [showForm, setShowForm]   = useState(false);
const [showModal, setShowModal] = useState(false);

// Toggle
setShowForm((v) => !v);
```

---

## 7. Sync State với AsyncStorage (Pattern)

Khi cần persist local state:

```js
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = '@lt_web_dark_mode';

export function useDarkMode() {
  const [isDark, setIsDark] = useState(false);

  // Load từ storage khi mount
  useEffect(() => {
    AsyncStorage.getItem(PREF_KEY).then((val) => {
      if (val !== null) setIsDark(val === 'true');
    });
  }, []);

  // Lưu khi thay đổi
  const toggle = () => {
    setIsDark((prev) => {
      AsyncStorage.setItem(PREF_KEY, String(!prev));
      return !prev;
    });
  };

  return { isDark, toggle };
}
```

---

## 8. Checklist State mới

```
[ ] Xác định loại state: local / global / persist
[ ] Local → dùng useState trong screen (không tạo Context)
[ ] Global → tạo Context theo template CartContext
[ ] Global → đăng ký Provider trong App.js (bọc bên trong AuthProvider)
[ ] Persist → thêm key '@lt_web_<tên>' trong storage.js
[ ] Context mới → tạo hook useXxx() để export
[ ] Nếu cần custom hook → tạo file src/hooks/useXxx.js
```
