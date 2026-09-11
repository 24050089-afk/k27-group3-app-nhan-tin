# Mobile Screens

Nguon su that: `mobile/src/navigation/index.js` va `mobile/src/screens`.

## Auth Stack

| Screen | Route | Vai tro |
|---|---|---|
| `LoginScreen` | `Login` | Dang nhap, link quen mat khau/dang ky |
| `RegisterScreen` | `Register` | Tao tai khoan |
| `ForgotPasswordScreen` | `ForgotPassword` | Dat mat khau moi cho tester |

## Main Tabs

| Screen | Route | Vai tro |
|---|---|---|
| `ChatListScreen` | `Chats` | Notes tray, danh sach conversation, refresh, tao chat |
| `FriendsScreen` | `Friends` | Ban be, loi moi, tim user |
| `ProfileScreen` | `Profile` | Profile, username, UID/My QR, theme, doi mat khau, logout |

### ChatList activity ordering

- Conversation pinned nam trong khoi pinned; trong moi khoi, message moi nhat dung truoc.
- Tin do user hien tai gui va tin nhan tu nguoi khac trong private/group deu dua conversation len dau khoi tuong ung sau khi server xac nhan.
- `ChatListScreen` nghe `conversation:updated`, debounce 200 ms va dong bo lai tu backend; khong dung timestamp tren thiet bi de tu move row.
- Khi user dang cuon, danh sach cap nhat nhung khong tu cuon ve dau.
- Search giu nguyen query va thu tu tuong doi cua ket qua sau khi danh sach cap nhat.
- Notes tray la `ListHeaderComponent`, khong tham gia comparator conversation.

## App Stack

| Screen | Route | Vai tro |
|---|---|---|
| `ChatScreen` | `Chat` | Text/anh/voice realtime, seen, reaction, recall |
| `NewChatScreen` | `NewChat` | Chat rieng hoac nhom |
| `QrFriendScannerScreen` | `QrFriendScanner` | Quet/resolve QR, preview relationship va gui/chap nhan loi moi |

## Public identity va QR presentation

- `ProfileScreen` cho sua username, sao chep UID va mo My QR; UID khong co control chinh sua.
- QR luon dung surface trang, foreground toi de bao dam contrast o light/dark mode.
- `FriendsScreen` co action scan; scanner la modal route, khong doi bottom tabs.
- Scanner unmount camera khi mat focus/da co result; permission bi tu choi vinh vien co nut mo Settings.
- Deep link chi chap nhan `proxy://friend/{UID}?v=1`; raw payload khong duoc dua thang vao navigation.

## Chat Layout A/B

- `FlatList` va composer nam trong flex flow.
- `useAnimatedKeyboard()` cap nhat keyboard spacer; khong dung transform/offset chieu cao co dinh.
- `useSafeAreaInsets()` bu bottom inset khi keyboard dong.
- Can test chu/emoji, rotate va floating keyboard tren thiet bi that.

## Notes Presentation

- `NotesTray` nam trong `ListHeaderComponent` cua danh sach chat, khong tao route moi.
- Tao note va xem note dung bottom sheet hien co de giu safe area/keyboard behavior.
- Reply note thanh cong dieu huong toi route `Chat` voi `conversationId` DM do backend tra ve.

## Voice Composer

- Input rong hien nut microphone; input co text van hien nut gui text.
- Voice reply duoc phep; edit message khong cho ghi am.
- State: permission/preparing, recording, stopping, preview, uploading va error.
- Recording tu dung o 5 phut; app background dung ghi va chuyen preview neu hop le.
- Preview cho nghe lai/xoa/gui; upload loi giu file local de retry thu cong.
