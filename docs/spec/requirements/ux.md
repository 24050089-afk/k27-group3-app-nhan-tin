# UX Rules

> Bỏ vào đây: quy tắc trải nghiệm người dùng áp dụng toàn app.  
> AI đọc file này để đảm bảo mọi screen đều nhất quán về UX.

---

## Loading & Feedback

- Mọi action async **phải** có loading state (spinner trên Button hoặc overlay)
- Response time > 300ms → hiện skeleton hoặc ActivityIndicator
- Thành công → Alert hoặc Toast xanh lá, sau đó navigate hoặc refresh
- Lỗi → Alert đỏ với message từ BE (không hiện "Có lỗi xảy ra" chung chung nếu BE trả message rõ)
- Network timeout → message "Không có kết nối. Vui lòng thử lại."

---

## Form

- Validate tại client trước khi gọi API (không gọi API nếu form sai)
- Hiển thị lỗi ngay dưới field bị sai (không đợi submit)
- Nút submit disabled khi đang loading
- `keyboardShouldPersistTaps="handled"` cho mọi ScrollView chứa form
- `KeyboardAvoidingView` với `behavior="padding"` trên iOS

---

## Navigation

- Back button luôn hoạt động (không trap người dùng)
- Sau khi tạo mới hoặc xóa → `navigation.goBack()` (không navigate thủ công)
- Sau khi đăng nhập → replace về AppStack (không cho back về Login)
- Deep link hoặc link ngoài → xử lý trong NavigationContainer

---

## Destructive Actions (xóa, đăng xuất)

- Luôn có confirm dialog trước: `Alert.alert('Xác nhận', '...', [{style: 'destructive'}])`
- Nút destructive style `'destructive'` (hiện đỏ trên iOS)
- Không cho undo sau khi xóa (trừ khi có recycle bin)

---

## Empty & Error States

- List rỗng → hiện icon + text gợi ý (không để trống trắng)
- Lỗi load data → hiện nút "Thử lại"
- Không có ảnh → hiện placeholder màu xám với icon

---

## Accessibility

- Tất cả TouchableOpacity phải có `activeOpacity` (0.7 là mặc định)
- Nút nhỏ (< 44pt) phải có `hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}`
- Ảnh phải có `accessibilityLabel`

---

## Performance

- FlatList: dùng `keyExtractor`, `getItemLayout` nếu item cố định chiều cao
- Ảnh: dùng `resizeMode="cover"` và set `width/height` cố định (không để undefined)
- Tránh anonymous function trong `renderItem` của FlatList (dùng `useCallback`)

---

<!-- BỔ SUNG QUY TẮC UX VÀO ĐÂY -->
