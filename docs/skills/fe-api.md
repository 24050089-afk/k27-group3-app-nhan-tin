# Kỹ Năng FE: Tích Hợp API

> Áp dụng mỗi khi thêm endpoint mới hoặc nhóm tính năng mới cần giao tiếp với BE.  
> File nền tảng: `mobile/src/api/client.js` và `mobile/src/utils/env.js`

---

## 1. Kiến Trúc API Layer

```
Screen / Component
      │
      │ gọi hàm
      ▼
src/api/<tên>.api.js          ← Định nghĩa từng hàm gọi BE
      │
      │ import client
      ▼
src/api/client.js             ← Axios instance đã cấu hình sẵn
      │
      ├── Interceptor Request: tự gắn Bearer token từ AsyncStorage
      ├── Interceptor Response: chuẩn hóa lỗi thành Error(message)
      │
      ▼
src/utils/env.js              ← API_BASE_URL tự động theo môi trường
      │
      ▼
Backend Express API           ← http://<host>:3000/api
```

---

## 2. Cấu trúc client.js (đọc để hiểu cơ chế)

```js
// src/api/client.js
import axios from 'axios';
import { getToken } from '../utils/storage';
import { API_BASE_URL } from '../utils/env';

const client = axios.create({
  baseURL: API_BASE_URL,  // auto-resolved
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// ① Tự động gắn token vào mọi request
client.interceptors.request.use(async (config) => {
  const token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ② Chuẩn hóa lỗi: response.data.message → Error.message
client.interceptors.response.use(
  (response) => response.data,   // ← unwrap data, screen nhận trực tiếp res.data
  (error) => {
    const message = error.response?.data?.message || 'Có lỗi xảy ra.';
    return Promise.reject(new Error(message));
  }
);
```

**Kết quả**: Mọi API call trả về trực tiếp `{ success, data, message, meta }` hoặc throw `Error(message)`.

---

## 3. Template File API

```js
// src/api/order.api.js
import client from './client';

// GET danh sách (có phân trang + search)
export const getOrdersApi = (params) => client.get('/orders', { params });

// GET chi tiết
export const getOrderByIdApi = (id) => client.get(`/orders/${id}`);

// GET của tôi
export const getMyOrdersApi = () => client.get('/orders/my');

// POST tạo mới
export const createOrderApi = (data) => client.post('/orders', data);

// PUT cập nhật
export const updateOrderApi = (id, data) => client.put(`/orders/${id}`, data);

// DELETE
export const deleteOrderApi = (id) => client.delete(`/orders/${id}`);

// PATCH một phần
export const updateOrderStatusApi = (id, status) =>
  client.patch(`/orders/${id}/status`, { status });
```

**Quy ước đặt tên hàm**: `<verb><Resource>Api`

| Verb | HTTP | Ví dụ |
|---|---|---|
| `get` | GET list | `getOrdersApi` |
| `getOrderById` | GET chi tiết | `getOrderByIdApi` |
| `getMyOrders` | GET of me | `getMyOrdersApi` |
| `create` | POST | `createOrderApi` |
| `update` | PUT | `updateOrderApi` |
| `delete` | DELETE | `deleteOrderApi` |
| `update<Field>` | PATCH | `updateOrderStatusApi` |

---

## 4. Cách Gọi API trong Screen

### Gọi khi mount (load lần đầu)
```js
const [data, setData]       = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  getOrdersApi()
    .then((res) => setData(res.data))
    .catch((err) => Alert.alert('Lỗi', err.message))
    .finally(() => setLoading(false));
}, []);
```

### Gọi khi submit form
```js
const handleSubmit = async () => {
  if (!validate()) return;
  setLoading(true);
  try {
    const res = await createOrderApi(form);
    Alert.alert('Thành công', 'Tạo đơn hàng thành công.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  } catch (err) {
    Alert.alert('Lỗi', err.message);
  } finally {
    setLoading(false);
  }
};
```

### Gọi phân trang
```js
const fetchData = useCallback(async (p = 1, s = search) => {
  try {
    const res = await getOrdersApi({ page: p, limit: 10, search: s });
    if (p === 1) setData(res.data);
    else setData((prev) => [...prev, ...res.data]);
    setTotalPages(res.meta.totalPages);
    setPage(p);
  } catch {
    // bỏ qua lỗi phân trang
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [search]);

useEffect(() => {
  setLoading(true);
  fetchData(1, search);
}, [search]);
```

### Gọi sau khi hành động (refresh parent)
```js
// Từ màn hình chi tiết muốn refresh màn hình list
// ✅ Cách đơn giản: useFocusEffect

import { useFocusEffect } from '@react-navigation/native';

useFocusEffect(
  useCallback(() => {
    fetchData();
  }, [])
);
```

---

## 5. Xử Lý Lỗi API

### Kiểu lỗi từ interceptor

```js
// Interceptor đã chuẩn hóa → catch luôn nhận Error với message tiếng Việt
try {
  await createOrderApi(data);
} catch (err) {
  // err.message = res.data.message từ BE (vd: "Email đã được sử dụng.")
  Alert.alert('Lỗi', err.message);
}
```

### Xử lý lỗi 401 (token hết hạn) — Global

Nếu muốn tự động logout khi 401, cập nhật interceptor trong `client.js`:

```js
client.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      await clearAuth();
      // Navigation sẽ tự redirect về Login vì token thay đổi trong Context
    }
    const message = error.response?.data?.message || 'Có lỗi xảy ra.';
    return Promise.reject(new Error(message));
  }
);
```

---

## 6. Params Phân Trang Chuẩn

```js
// Gọi API với query params
getOrdersApi({ page: 1, limit: 10, search: 'keyword' });
// → GET /api/orders?page=1&limit=10&search=keyword

// Response chuẩn (phải match với BE)
// {
//   success: true,
//   data: [...],
//   meta: { total, page, limit, totalPages }
// }
```

---

## 7. Upload File / Multipart (khi cần)

```js
// Tạo FormData cho upload ảnh
export const uploadImageApi = (imageUri) => {
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'photo.jpg',
  });
  return client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
```

---

## 8. Checklist API mới

```
[ ] Tạo file src/api/<tên>.api.js nếu nhóm tính năng chưa có
[ ] Đặt tên hàm: <verb><Resource>Api
[ ] Dùng client (không tạo axios.create() mới)
[ ] Không hardcode URL — dùng path tương đối: '/orders'
[ ] Không xử lý lỗi bên trong api file — để interceptor xử lý
[ ] Tham số phân trang: { page, limit, search }
[ ] Export named export (không default export)
[ ] Khai báo đầy đủ: GET list, GET by id, POST, PUT, DELETE
```
