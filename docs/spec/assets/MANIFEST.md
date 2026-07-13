# Asset Manifest

App hien khong phu thuoc asset bitmap bundled cho luong chinh.

| Loai | Nguon | Dung o |
|---|---|---|
| Icon | `@expo/vector-icons` Ionicons | Navigation, button, empty/error state |
| Bangboo mark | Component `mobile/src/components/BangbooMark.js` | Auth, profile, empty state |
| Avatar | URL user hoac chu cai fallback trong `Avatar.js` | Chat list, friends |
| Anh chat | URL tra ve tu `/api/upload/chat-image` | `MessageBubble` |

## Quy Tac Them Asset

- Chi them file vao `mobile/assets` khi khong the dung Ionicons, URL runtime hoac component code.
- Ghi ro file, kich thuoc, noi dung va screen su dung.
- Mockup chi de tham khao, khong bundle vao production.
