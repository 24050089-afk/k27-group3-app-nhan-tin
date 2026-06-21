# Screen Specifications

> Bỏ vào đây: mô tả từng màn hình — layout, thành phần, luồng tương tác.  
> Có thể paste mô tả bằng lời, hoặc liệt kê từ mockup/Figma.  
> Đặt ảnh mockup vào `assets/mockups/<tên>.png` rồi ghi đường dẫn bên dưới.

---

## TEMPLATE — Copy block này cho mỗi screen mới

```
## [Tên Screen]

**Route name** : `<RouteName>` trong `<AuthStack | AppStack | HomeTabs>`
**File**       : `src/screens/<Tên>Screen.js`
**Loại**       : List | Form | Detail | Mixed | Modal
**Header**     : Navigator mặc định | Custom (headerShown: false) | Không có
**Mockup**     : `assets/mockups/<tên>.png` (nếu có)

### Layout (mô tả từ trên xuống)
1. [Khu vực 1]: [mô tả]
2. [Khu vực 2]: [mô tả]
...

### Thành phần UI
- [ ] [Component]: [vị trí + hành vi]
- [ ] [Component]: [vị trí + hành vi]

### Tương tác
- Nhấn [X] → [hành động / navigate đến đâu]
- Vuốt [X] → [hành động]
- Submit form → [validate → gọi API → kết quả]

### State
- Loading : [hiện gì]
- Error   : [hiện gì]
- Empty   : [hiện gì — chỉ list screen]

### Dữ liệu cần
- API: [tên API function]
- Context: [AuthContext / DeviceContext / khác]
```

---

## CÁC SCREEN HIỆN CÓ

---

## LoginScreen

**Route name** : `Login` trong `AuthStack`
**File**       : `src/screens/LoginScreen.js`
**Loại**       : Form
**Header**     : Không có (headerShown: false)

### Layout
1. Logo / tên app ở giữa (top 1/3)
2. Form: Email + Mật khẩu
3. Nút "Đăng nhập" full width
4. Link "Chưa có tài khoản? Đăng ký"

### Thành phần UI
- [ ] Logo / Text tên app
- [ ] Input: Email (keyboardType: email-address)
- [ ] Input: Mật khẩu (secureTextEntry)
- [ ] Button: Đăng nhập (loading khi submit)
- [ ] TouchableOpacity: link sang RegisterScreen

### Tương tác
- Submit → validate (email hợp lệ, mật khẩu không rỗng) → loginApi → lưu token → navigate AppStack
- Nhấn link → navigate Register

### State
- Loading: Button hiện spinner
- Error: Alert với message từ BE

### Dữ liệu cần
- API: `loginApi`
- Context: `useAuth` (gọi `login`)

---

## RegisterScreen

**Route name** : `Register` trong `AuthStack`
**File**       : `src/screens/RegisterScreen.js`
**Loại**       : Form
**Header**     : Không có (headerShown: false)

### Layout
1. Tiêu đề "Tạo tài khoản"
2. Form: Họ tên + Email + Mật khẩu + Xác nhận mật khẩu
3. Nút "Đăng ký" full width
4. Link "Đã có tài khoản? Đăng nhập"

### Thành phần UI
- [ ] Text: Tiêu đề
- [ ] Input: Họ tên
- [ ] Input: Email
- [ ] Input: Mật khẩu
- [ ] Input: Xác nhận mật khẩu
- [ ] Button: Đăng ký
- [ ] TouchableOpacity: link về Login

### Tương tác
- Submit → validate (4 field, confirm password match) → registerApi → tự động login → AppStack
- Link → goBack hoặc navigate Login

### State
- Loading: Button spinner
- Error: Alert

---

## HomeScreen

**Route name** : `Home` trong `HomeTabs`
**File**       : `src/screens/HomeScreen.js`
**Loại**       : List
**Header**     : Custom (headerShown: false trong HomeTabs)

### Layout
1. Header tùy chỉnh: "Xin chào [tên]" + nút "+ Thêm" (góc phải)
2. Search bar
3. FlatList danh sách ProductCard
4. (Phân trang vô hạn khi scroll đến cuối)

### Thành phần UI
- [ ] Header với greeting + AddButton
- [ ] TextInput: search
- [ ] FlatList → ProductCard
- [ ] RefreshControl (pull-to-refresh)
- [ ] ActivityIndicator (loading)
- [ ] Empty state text

### Tương tác
- Pull to refresh → reload trang 1
- Scroll đến cuối → load trang tiếp
- Nhấn card → navigate ProductDetail
- Nhấn "+ Thêm" → navigate ProductForm (product: null)

---

## ProductDetailScreen

**Route name** : `ProductDetail` trong `AppStack`
**File**       : `src/screens/ProductDetailScreen.js`
**Loại**       : Detail
**Header**     : Navigator mặc định ("Chi tiết sản phẩm")

### Layout
1. Ảnh sản phẩm (full width, tỷ lệ 16:9)
2. Tên, giá, tồn kho
3. Mô tả
4. Thông tin người đăng (nếu có)
5. Nút Sửa + Xóa (chỉ hiện nếu là chủ)

---

## ProductFormScreen

**Route name** : `ProductForm` trong `AppStack`
**File**       : `src/screens/ProductFormScreen.js`
**Loại**       : Form
**Header**     : Navigator mặc định ("Sản phẩm")

### Layout
1. Input: Tên sản phẩm
2. Input: Giá
3. Input: Tồn kho
4. Input: Mô tả (multiline)
5. Input: URL ảnh
6. Button: Lưu

---

## ProfileScreen

**Route name** : `Profile` trong `HomeTabs`
**File**       : `src/screens/ProfileScreen.js`
**Loại**       : Mixed
**Header**     : Custom (headerShown: false trong HomeTabs)

### Layout
1. Avatar + Tên + Email
2. Section đổi mật khẩu (toggle expand)
3. Nút Đăng xuất

---

<!-- THÊM SCREEN MỚI VÀO ĐÂY — copy template từ trên -->
