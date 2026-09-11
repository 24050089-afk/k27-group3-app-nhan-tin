# Mobile Components

Nguon su that: `mobile/src/components`.

| Component | Vai tro | Dung o |
|---|---|---|
| `Avatar` | Anh dai dien hoac chu cai fallback | Chat list, friends |
| `ProxyMark` | Dau hieu nhan dien Proxy | Auth, empty state, profile |
| `Button` | Primary/outline/danger, loading, disabled, icon | Auth, profile, forms |
| `Input` | Label, focus/error, secure toggle | Auth, profile |
| `ThemeToggle` | Chuyen sang/toi co accessibility switch | Header, profile |
| `ConversationRow` | Conversation title, preview, time, unread/pinned/muted state | ChatListScreen |
| `MessageBubble` | Text/anh/voice, timestamp, seen, reaction | ChatScreen |
| `MessageComposer` | Text, attachment, reply/edit va entry ghi am | ChatScreen |
| `VoiceRecorderBar` | Timer ghi am, dung/huy, nghe lai va gui | MessageComposer |
| `VoiceMessagePlayer` | Play/pause/seek/progress cho attachment voice | MessageBubble |
| `UserListItem` | User/avatar/action | FriendsScreen, NewChatScreen |
| `KeyboardScreen` | Scroll + keyboard handling cho form | Auth, profile |
| `DebugOverlay` | Network diagnostics chi development | App root |
| `NotesTray` | Horizontal tray tin ghi chu dau danh sach chat | ChatListScreen |
| `NoteComposerSheet` | Tao note, dem 60 ky tu, chon audience | NotesTray |
| `NoteViewerModal` | Xem note, reply nhanh hoac xoa note cua minh | NotesTray |
| `EditUsernameSheet` | Dat/doi/xoa username, debounce availability, confirmation | ProfileScreen |
| `IdentityCard` | Avatar, ten, username va UID cong khai | MyQrSheet |
| `MyQrSheet` | Render/share QR v1 va sao chep UID | ProfileScreen |
| `FriendIdentityPreview` | Ho so toi thieu va action theo relationship | QrFriendScannerScreen |

## Quy Tac

- Touch target toi thieu 44 px khi co the.
- Icon dung `@expo/vector-icons` Ionicons.
- Mau lay tu `ThemeContext`; khong hardcode theme color trong component moi.
- Error copy neu ro van de va cach khac phuc.
