# Asset Manifest

App hien khong phu thuoc asset bitmap bundled cho luong chinh.

| Loai | Nguon | Dung o |
|---|---|---|
| Icon | `@expo/vector-icons` Ionicons | Navigation, button, empty/error state |
| Proxy mark | Component `mobile/src/components/ProxyMark.js` | Auth, profile, empty state |
| Avatar | URL user hoac chu cai fallback trong `Avatar.js` | Chat list, friends, notes tray |
| Anh chat | URL tra ve tu `/api/upload/chat-image` | `MessageBubble` |
| Notes | Khong co asset rieng; dung Avatar + Ionicons | `NotesTray`, `NoteComposerSheet`, `NoteViewerModal` |

## Quy Tac Them Asset

- Chi them file vao `mobile/assets` khi khong the dung Ionicons, URL runtime hoac component code.
- Ghi ro file, kich thuoc, noi dung va screen su dung.
- Mockup chi de tham khao, khong bundle vao production.
