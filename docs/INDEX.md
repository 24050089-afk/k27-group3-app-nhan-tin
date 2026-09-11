# Chi Muc Tinh Nang - Proxy

Proxy hien la ung dung nhan tin. Nguon trace chi tiet: `docs/features/auth.md`, `user.md`, `messaging.md`, `notes.md`.

## Nhom Chuc Nang

| Nhom | Trang thai | Thanh phan chinh |
|---|---|---|
| Auth | Implemented | Dang ky, dang nhap, quen/doi mat khau, logout |
| User & Friend discovery | Implemented | Profile, username, public UID, My QR, tìm user, gợi ý bạn chung/nhóm chung, khám phá người gần đây theo phiên foreground, admin user controls |
| Messaging | Implemented | Ban be, chat rieng/nhom, realtime, seen, reaction, recall, anh, ghi am thoai |
| [Cài đặt và quyền nhóm](features/group-permissions.md) | G13 local-verified; native/device và live rollout pending | GroupSettings, GroupPermissions, owner/admin/member policy, owner-only PATCH, migration và test MySQL/socket |
| Notes | Implemented | Tin ghi chu 24h, audience ban be/custom, viewer count, reply nhanh vao DM |
| Notifications | Implemented behind feature flags | Inbox, preferences, device registry, outbox and Expo Push integration |

## Backend

| Base path | Router | Controllers/Models chinh |
|---|---|---|
| `/api/auth` | `auth.router.js` | `auth.controller.js`, `User` |
| `/api/users` | `user.router.js` | `user.controller.js`, `User` |
| `/api/social` | `friendship.router.js` | `friendship.controller.js`, `friendDiscovery.controller.js`, `Friendship`, `BlockedUser`, `UserNearbyDiscovery` |
| `/api/conversations` | `conversation.router.js` | `conversation.controller.js`, `message.controller.js` |
| `/api/messages` | `message.router.js` | `message.controller.js`, `Message`, `Reaction` |
| `/api/upload` | `upload.router.js` | `upload.controller.js`, attachment payload |
| `/api/notes` | `note.router.js` | `note.controller.js`, `Note`, `NoteView` |
| `/api/notifications` | `notification.router.js` | `notification.controller.js`, `Notification` |
| `/api/notification-preferences` | `notificationPreference.router.js` | `notification.controller.js`, `NotificationPreference` |
| `/api/push-devices` | `pushDevice.router.js` | `notification.controller.js`, `PushDevice` |

Model dang load: `User`, `Friendship`, `BlockedUser`, `UserNearbyDiscovery`, `Conversation`, `ConversationMember`, `Message`, `Attachment`, `MessageStatus`, `Reaction`, `Notification`, `NotificationPreference`, `NotificationThread`, `NotificationOutbox`, `PushDevice`, `Note`, `NoteView`.

## Mobile

| Route | Screen | Muc dich |
|---|---|---|
| `Login` | `LoginScreen.js` | Dang nhap |
| `Register` | `RegisterScreen.js` | Tao tai khoan |
| `ForgotPassword` | `ForgotPasswordScreen.js` | Dat lai mat khau |
| `Chats` | `ChatListScreen.js` | Danh sach cuoc tro chuyen |
| `Chat` | `ChatScreen.js` | Text/anh/voice realtime, seen, reaction, recall |
| Notes tray | `NotesTray.js` | Tin ghi chu nam dau danh sach chat |
| `NewChat` | `NewChatScreen.js` | Tao chat rieng hoac nhom |
| `Friends` | `FriendsScreen.js` | Ban be, loi moi, tim user |
| `Friends` | `FriendsScreen.js` | Khi ô tìm kiếm trống: gợi ý kết nối và CTA khám phá người gần đây; yêu cầu quyền vị trí foreground sau hành động rõ ràng |
| `Profile` | `ProfileScreen.js` | Profile, theme, doi mat khau, logout |
| `QrFriendScanner` | `QrFriendScannerScreen.js` | Quet QR UID va ket ban theo relationship |
| `NotificationCenter` | `NotificationCenterScreen.js` | Inbox thong bao, doc tung muc/da doc tat ca |
| `NotificationSettings` | `NotificationSettingsScreen.js` | Quyen he dieu hanh, push category va privacy preview |

Global providers: `SafeAreaProvider`, `AuthProvider`, `DeviceProvider`, `ThemeProvider`. API host tu dong resolve theo Expo host va development port `4500`.

## Tai Lieu

- Ke hoach Sprint 2 FE/BE/DB: `docs/Plan.md`
- API: `docs/spec/data/api.md`
- Schema: `docs/spec/data/schema.md`
- Messaging trace: `docs/features/messaging.md`
- Notes trace: `docs/features/notes.md`
- UI/UX: `docs/Uiux rules.md`
- Friend discovery trace: `docs/features/friend-discovery.md`
- Notification trace: `docs/features/notifications.md`

## Lich Su Don Dep

- 2026-07-13: go toan bo code runtime Product/Order/Cart. Khong drop du lieu MySQL cu; viec xoa bang can migration va backup rieng.
