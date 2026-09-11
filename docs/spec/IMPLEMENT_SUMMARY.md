# Implement Summary

## Runtime Hien Tai

- Backend: auth, users, social, conversations, messages, upload anh/voice, Notes va Socket.IO.
- Mobile: auth, danh sach chat, Notes tray, chat realtime, ban be, tao chat, profile va theme.
- Database models dang load: `User`, `Friendship`, `BlockedUser`, `Conversation`, `ConversationMember`, `Message`, `Attachment`, `MessageStatus`, `Reaction`, `Notification`, `Note`, `NoteView`.

## Messaging

- Text, anh va ghi am thoai realtime; upload anh/voice toi da 10 MB.
- Voice dung `expo-audio`, ghi toi da 5 phut, co preview truoc khi gui va player trong bubble; khong doi schema database.
- Trang thai sent/delivered/seen, reaction va recall.
- `conversation:seen` cap nhat local state; backend chi emit khi status thuc su thay doi.
- `ChatScreen` dang A/B test `useAnimatedKeyboard()` voi spacer va safe-area native.
- Danh sach conversation sap xep pinned truoc, sau do message server moi nhat trong tung khoi; private va group dung chung comparator.
- Backend emit `conversation:updated` toi ca sender va recipients sau khi tao message; ChatList debounce 200 ms, chong request song song va response cua user cu.
- Edit, recall, reaction, seen, typing va hidden local khong lam conversation thay doi vi tri.

## Notes

- Tin ghi chu 24h duoc luu trong `notes`; luot xem luu trong `note_views`.
- API `/api/notes` ho tro note cua minh, feed ban be, tao, xem, xoa, viewers va reply nhanh.
- Audience duoc enforce o backend bang friendship, block va custom audience ids.
- Mobile chen `NotesTray` vao dau danh sach chat; tao/xem/reply/xoa bang bottom sheet.
- Reply note dung DM hien co va gui message text co prefix ngu canh, khong them cot vao `messages`.

## Cleanup 2026-07-13

- Da go `Product`, `Order`, `OrderItem`, `/products`, `/orders` khoi backend runtime.
- Da go CartContext, product/order API, component va screen commerce khoi mobile.
- Da backup va drop `order_items`, `orders`, `products` khoi MySQL `lt_web`; truy van xac minh con 0 bang commerce cu.

## Mobile Safety Audit 2026-07-13

- iOS khai bao quyen thu vien anh ro rang va chi cho phep HTTP trong mang cuc bo; Android khong xin quyen camera/microphone du thua.
- Bo `KeyboardProvider` khong con su dung, offset ban phim cung va chieu cao tab bar cung de safe area tu tinh theo thiet bi.
- Socket.IO co polling fallback/reconnect; message ID duoc chuan hoa de tranh key trung giua REST va socket.
- Reaction/recall cap nhat tu response thay vi tai lai toan bo chat; upload anh co timeout 2 phut cho mang di dong cham.
- Release doc `EXPO_PUBLIC_API_URL`; neu chua cau hinh, URL production mau van khong the ket noi.
- Bo request quyen thu vien truoc image picker de tranh race lan dau tren iOS; loi gui anh hien thi dung theo buoc picker/upload/message.
