# Implement Summary

## Runtime Hien Tai

- Backend: auth, users, social, conversations, messages, upload anh va Socket.IO.
- Mobile: auth, danh sach chat, chat realtime, ban be, tao chat, profile va theme.
- Database models dang load: `User`, `Friendship`, `BlockedUser`, `Conversation`, `ConversationMember`, `Message`, `Attachment`, `MessageStatus`, `Reaction`, `Notification`.

## Messaging

- Text va anh realtime; upload anh toi da 10 MB.
- Trang thai sent/delivered/seen, reaction va recall.
- `conversation:seen` cap nhat local state; backend chi emit khi status thuc su thay doi.
- `ChatScreen` dang A/B test `useAnimatedKeyboard()` voi spacer va safe-area native.

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
