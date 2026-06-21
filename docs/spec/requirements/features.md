# Feature Requirements

> Bỏ vào đây: danh sách tính năng cần build — mô tả, độ ưu tiên, scope.  
> Mỗi tính năng là 1 block. Hoàn thành → đánh dấu [x].

---

## TEMPLATE

```
## [Tên tính năng]

**Độ ưu tiên**: P0 (bắt buộc) | P1 (quan trọng) | P2 (nice-to-have)
**Scope**      : BE only | FE only | BE + FE
**Status**     : TODO | IN PROGRESS | DONE

### Mô tả
[Mô tả ngắn: người dùng làm gì, hệ thống phản hồi thế nào]

### Acceptance Criteria (tiêu chí hoàn thành)
- [ ] [tiêu chí 1]
- [ ] [tiêu chí 2]

### Ghi chú kỹ thuật
- [ràng buộc, lưu ý đặc biệt]
```

---

## TÍNH NĂNG HIỆN CÓ

---

## Đăng ký / Đăng nhập

**Độ ưu tiên**: P0  
**Scope**: BE + FE  
**Status**: DONE

### Mô tả
Người dùng tạo tài khoản hoặc đăng nhập. JWT được lưu local và tự đính kèm vào mọi request.

### Acceptance Criteria
- [x] Đăng ký: validate name, email, password
- [x] Đăng nhập: trả JWT, lưu AsyncStorage
- [x] Token tự đính kèm qua Axios interceptor
- [x] Đăng xuất: xóa token, về AuthStack

---

## Xem danh sách sản phẩm

**Độ ưu tiên**: P0  
**Scope**: BE + FE  
**Status**: DONE

### Acceptance Criteria
- [x] Hiển thị list sản phẩm có ảnh, tên, giá, tồn kho
- [x] Tìm kiếm theo tên
- [x] Phân trang vô hạn (load more khi scroll)
- [x] Pull-to-refresh

---

## CRUD Sản phẩm

**Độ ưu tiên**: P0  
**Scope**: BE + FE  
**Status**: DONE

### Acceptance Criteria
- [x] Tạo sản phẩm (authenticated)
- [x] Xem chi tiết
- [x] Sửa (chỉ chủ sở hữu + admin)
- [x] Xóa (chỉ chủ sở hữu + admin)

---

## Hồ sơ cá nhân

**Độ ưu tiên**: P1  
**Scope**: BE + FE  
**Status**: DONE

### Acceptance Criteria
- [x] Xem thông tin user
- [x] Đổi mật khẩu
- [x] Đăng xuất

---

<!-- THÊM TÍNH NĂNG MỚI VÀO ĐÂY -->
