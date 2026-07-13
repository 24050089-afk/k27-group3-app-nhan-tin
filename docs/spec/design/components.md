# Mobile Components

Nguon su that: `mobile/src/components`.

| Component | Vai tro | Dung o |
|---|---|---|
| `Avatar` | Anh dai dien hoac chu cai fallback | Chat list, friends |
| `BangbooMark` | Dau hieu nhan dien Bangboo | Auth, empty state, profile |
| `Button` | Primary/outline/danger, loading, disabled, icon | Auth, profile, forms |
| `Input` | Label, focus/error, secure toggle | Auth, profile |
| `ThemeToggle` | Chuyen sang/toi co accessibility switch | Header, profile |
| `ChatListItem` | Conversation title, preview, time | ChatListScreen |
| `MessageBubble` | Text/anh, timestamp, seen, reaction | ChatScreen |
| `UserListItem` | User/avatar/action | FriendsScreen, NewChatScreen |
| `KeyboardScreen` | Scroll + keyboard handling cho form | Auth, profile |
| `DebugOverlay` | Network diagnostics chi development | App root |

## Quy Tac

- Touch target toi thieu 44 px khi co the.
- Icon dung `@expo/vector-icons` Ionicons.
- Mau lay tu `ThemeContext`; khong hardcode theme color trong component moi.
- Error copy neu ro van de va cach khac phuc.
