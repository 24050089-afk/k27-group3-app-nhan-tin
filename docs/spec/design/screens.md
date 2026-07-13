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
| `ChatListScreen` | `Chats` | Danh sach conversation, refresh, tao chat |
| `FriendsScreen` | `Friends` | Ban be, loi moi, tim user |
| `ProfileScreen` | `Profile` | Profile, theme, doi mat khau, logout |

## App Stack

| Screen | Route | Vai tro |
|---|---|---|
| `ChatScreen` | `Chat` | Text/anh realtime, seen, reaction, recall |
| `NewChatScreen` | `NewChat` | Chat rieng hoac nhom |

## Chat Layout A/B

- `FlatList` va composer nam trong flex flow.
- `useAnimatedKeyboard()` cap nhat keyboard spacer; khong dung transform/offset chieu cao co dinh.
- `useSafeAreaInsets()` bu bottom inset khi keyboard dong.
- Can test chu/emoji, rotate va floating keyboard tren thiet bi that.
