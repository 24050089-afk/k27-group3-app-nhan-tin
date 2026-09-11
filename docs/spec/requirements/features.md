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
- [x] Co the ghi am toi da 5 phut, nghe lai, upload va gui tin nhan voice trong chat rieng/nhom.
- [x] Voice bubble co play/pause/seek va chi mot ban ghi phat tai mot thoi diem.
- [x] Conversation co message server moi nhat di chuyen len dau khoi pinned/unpinned tren ca phia gui va nhan, trong chat rieng va nhom.
- [x] ChatList dong bo activity realtime qua `conversation:updated`, co debounce, in-flight queue va stale-user guard.
- [x] Chap nhan ket ban tu dong tao/tai su dung private conversation, cap nhat realtime cho hai ben va cung cap loi chao UI trong chat rong.
- [x] Moi tai khoan co public UID ngau nhien, unique va bat bien; username co the dat/doi/xoa trong Profile.
- [x] Profile co UID copy, My QR high-contrast va QR payload versioned khong chua du lieu nhay cam.
- [x] Friends co entry quet QR, camera permission states va relationship actions tai su dung friendship API hien co.

### Ghi chu ky thuat
- Dung Socket.IO cho message va seen realtime; khong polling dinh ky trong `ChatScreen`.
- Su kien `conversation:seen` chi cap nhat state local va backend chi emit khi status thuc su thay doi, tranh feedback loop API.
- Da co upload binary cho anh va M4A/AAC voice; video/file tong quat chua duoc implement.
- Thu tu conversation dung `last_message.created_at` va message ID; edit, recall, reaction, seen, typing va xoa local khong tao activity moi.

---

## Notes

**Do uu tien**: P1
**Scope**: BE + FE
**Status**: IMPLEMENTED

### Mo ta
Nguoi dung tao tin ghi chu ngan hien o dau danh sach chat trong 24 gio. Ban be co quyen xem co the mo note va tra loi nhanh vao DM hien co.

### Acceptance Criteria
- [x] Co model `Note` va `NoteView`, khong doi schema cac bang chat hien co.
- [x] Co endpoint protected cho tao, feed, chi tiet, xoa, viewers va reply note.
- [x] Moi user chi co mot note `ACTIVE`; note moi thay note active cu.
- [x] Note het han sau 24 gio va khong xuat hien trong feed khi qua han.
- [x] API enforce ban be, block va audience custom.
- [x] Mobile co `NotesTray` o dau `ChatListScreen`.
- [x] Mobile co sheet tao note, chon audience va modal xem/reply/xoa.

### Ghi chu ky thuat
- Endpoint dung base path hien co `/api/notes`, khong dung `/api/v1`.
- Reply note gui message text thuong vao DM voi prefix ngu canh; chua them `reply_to_note_id` vao `messages`.
- Expiration la lazy-check khi API doc Notes; chua co cron worker rieng.
- Rate limit tao note dang nam trong memory backend, 1 request/10 giay/user.
