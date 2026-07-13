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

## Hồ sơ cá nhân

**Độ ưu tiên**: P1  
**Scope**: BE + FE  
**Status**: DONE

### Acceptance Criteria
- [x] Xem thông tin user
- [x] Đổi mật khẩu
- [x] Đăng xuất

---

## Messaging Core

**Do uu tien**: P0
**Scope**: BE + FE
**Status**: IMPLEMENTED

### Mo ta
Nguoi dung dang nhap co the tim nguoi dung, gui/nhan loi moi ket ban, tao chat rieng hoac nhom, gui tin nhan van ban, thu hoi tin nhan va tha reaction.

### Acceptance Criteria
- [x] Co model cho ban be, chan nguoi dung, cuoc tro chuyen, thanh vien, tin nhan, attachment, trang thai tin nhan, reaction, notification.
- [x] Co endpoint protected cho social, conversations va messages.
- [x] Mobile co tab Chats, Friends, Profile.
- [x] Mobile co man hinh danh sach chat, noi dung chat, tao chat, danh ba.
- [x] Tin nhan chi xem/gui duoc khi user la thanh vien conversation.
- [x] Co the chon anh tu thu vien, upload len backend va gui anh trong chat.

### Ghi chu ky thuat
- Dung Socket.IO cho message va seen realtime; khong polling dinh ky trong `ChatScreen`.
- Su kien `conversation:seen` chi cap nhat state local va backend chi emit khi status thuc su thay doi, tranh feedback loop API.
- Da co upload binary cho anh chat; video/file chua duoc implement.
