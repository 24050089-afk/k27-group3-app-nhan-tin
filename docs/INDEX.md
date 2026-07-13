# Chi Muc Tinh Nang - LTMB

LTMB hien la ung dung nhan tin. Nguon trace chi tiet: `docs/features/auth.md`, `user.md`, `messaging.md`.

## Nhom Chuc Nang

| Nhom | Trang thai | Thanh phan chinh |
|---|---|---|
| Auth | Implemented | Dang ky, dang nhap, quen/doi mat khau, logout |
| User | Implemented | Profile, tim user, admin user controls |
| Messaging | Implemented | Ban be, chat rieng/nhom, realtime, seen, reaction, recall, anh |

## Backend

| Base path | Router | Controllers/Models chinh |
|---|---|---|
| `/api/auth` | `auth.router.js` | `auth.controller.js`, `User` |
| `/api/users` | `user.router.js` | `user.controller.js`, `User` |
| `/api/social` | `friendship.router.js` | `friendship.controller.js`, `Friendship`, `BlockedUser` |
| `/api/conversations` | `conversation.router.js` | `conversation.controller.js`, `message.controller.js` |
| `/api/messages` | `message.router.js` | `message.controller.js`, `Message`, `Reaction` |
| `/api/upload` | `upload.router.js` | `upload.controller.js`, attachment payload |

Model dang load: `User`, `Friendship`, `BlockedUser`, `Conversation`, `ConversationMember`, `Message`, `Attachment`, `MessageStatus`, `Reaction`, `Notification`.

## Mobile

| Route | Screen | Muc dich |
|---|---|---|
| `Login` | `LoginScreen.js` | Dang nhap |
| `Register` | `RegisterScreen.js` | Tao tai khoan |
| `ForgotPassword` | `ForgotPasswordScreen.js` | Dat lai mat khau |
| `Chats` | `ChatListScreen.js` | Danh sach cuoc tro chuyen |
| `Chat` | `ChatScreen.js` | Text/anh realtime, seen, reaction, recall |
| `NewChat` | `NewChatScreen.js` | Tao chat rieng hoac nhom |
| `Friends` | `FriendsScreen.js` | Ban be, loi moi, tim user |
| `Profile` | `ProfileScreen.js` | Profile, theme, doi mat khau, logout |

Global providers: `SafeAreaProvider`, `AuthProvider`, `DeviceProvider`, `ThemeProvider`. API host tu dong resolve theo Expo host va port `4000`.

## Tai Lieu

- API: `docs/spec/data/api.md`
- Schema: `docs/spec/data/schema.md`
- Messaging trace: `docs/features/messaging.md`
- UI/UX: `docs/Uiux rules.md`
- Quy tac agent: `docs/AGENTS.md`

## Lich Su Don Dep

- 2026-07-13: go toan bo code runtime Product/Order/Cart. Khong drop du lieu MySQL cu; viec xoa bang can migration va backup rieng.
