# Kỹ Năng: Phát Triển & Debug với Expo

> Áp dụng cho toàn bộ quá trình phát triển ứng dụng mobile trong thư mục `mobile/`.  
> Expo được dùng cho **development & debugging** — không thay thế kiến trúc React Native.

---

## Tổng quan Expo trong dự án này

| Vai trò | Chi tiết |
|---|---|
| **Mục đích** | Debug nhanh, hot reload, chạy trên thiết bị thật không cần build native |
| **Công cụ** | Expo Go app (iOS/Android) + Expo CLI |
| **Build production** | EAS Build (Expo Application Services) |
| **SDK** | Expo SDK 50 |

---

## Khởi chạy Development

### Bước 1 — Cài đặt

```bash
cd mobile
npm install
```

### Bước 2 — Khởi động dev server

```bash
# Mở Expo dev menu (chọn thiết bị từ terminal)
npm start

# Hoặc chỉ định nền tảng
npm run android    # Android emulator
npm run ios        # iOS simulator (macOS only)

# Xóa cache nếu gặp lỗi lạ
npm run start:clear
```

### Bước 3 — Mở trên thiết bị

| Cách | Thao tác |
|---|---|
| **Expo Go (thiết bị thật)** | Cài Expo Go → scan QR code trong terminal |
| **Android emulator** | Nhấn `a` trong terminal sau khi chạy `npm start` |
| **iOS simulator** | Nhấn `i` trong terminal (chỉ trên macOS) |

---

## Cấu hình API URL

Dự án dùng **tự động phát hiện IP** thay vì hardcode URL.

**File**: [mobile/src/utils/env.js](../../mobile/src/utils/env.js)

```js
// Nguyên lý hoạt động:
// 1. Expo dev server chạy tại host:8081
// 2. Constants.expoConfig.hostUri = "192.168.x.x:8081"
// 3. Tách lấy phần IP → nối với port 3000 của BE

const hostUri = Constants.expoConfig?.hostUri;  // "192.168.1.5:8081"
const host = hostUri.split(':')[0];              // "192.168.1.5"
return `http://${host}:3000/api`;                // "http://192.168.1.5:3000/api"
```

| Môi trường | URL tự động được resolve |
|---|---|
| Thiết bị thật + Expo Go | `http://<LAN IP của máy>:3000/api` |
| Android emulator | `http://10.0.2.2:3000/api` (fallback) |
| Production build | `https://your-production-api.com/api` |

**Lưu ý quan trọng**: Thiết bị thật và máy chạy BE phải cùng mạng Wi-Fi.

---

## Cấu trúc file Expo-specific

```
mobile/
├── app.json              ← Expo app config (tên app, bundle ID, icon,...)
├── package.json          ← main: "node_modules/expo/AppEntry.js"
├── babel.config.js       ← preset: babel-preset-expo
├── App.js                ← StatusBar từ expo-status-bar
└── src/
    └── utils/
        └── env.js        ← Auto-resolve API URL theo môi trường
```

---

## Debug Tools trong Expo

### Expo Dev Menu

Lắc thiết bị hoặc nhấn `m` trong terminal để mở:

| Tính năng | Mô tả |
|---|---|
| **Reload** | Reload lại JS bundle |
| **Toggle performance monitor** | Xem FPS, JS memory |
| **Toggle element inspector** | Inspect UI element (giống DevTools) |
| **Open JS debugger** | Mở Chrome DevTools để debug JS |

### React Native Debugger (khuyên dùng)

```bash
# Cài React Native Debugger
brew install react-native-debugger

# Chạy debugger (port 8081)
open "rndebugger://set-debugger-loc?host=localhost&port=8081"
```

Tính năng: breakpoint, Redux DevTools, Network inspector, React DevTools.

### Expo Dev Tools (browser)

```
Tự động mở tại: http://localhost:19002
```

Xem log, gửi push notification test, xem device info.

### Flipper (tùy chọn nâng cao)

Với Expo dev client (không phải Expo Go), có thể dùng Flipper để:
- Network inspector chi tiết hơn
- SQLite/AsyncStorage inspector
- Layout inspector nâng cao

---

## Hot Reload & Fast Refresh

Expo bật Fast Refresh mặc định:

| Loại thay đổi | Kết quả |
|---|---|
| Sửa JSX / styles | UI cập nhật tức thì, giữ nguyên state |
| Sửa logic JS | Component re-render, giữ nguyên state |
| Sửa Context/Store | Full reload tự động |
| Lỗi cú pháp | Hiển thị error overlay |

Nếu Fast Refresh không hoạt động: nhấn `r` trong terminal để reload thủ công.

---

## Luồng phát triển tính năng mới với Expo

```
1. Đọc docs/skills/new-feature.md
          │
          ▼
2. Chạy: npm start (Expo dev server)
          │
          ▼
3. Viết code → Fast Refresh tự cập nhật UI
          │
          ▼
4. Debug bằng Expo Dev Menu hoặc React Native Debugger
          │
          ▼
5. Kiểm tra trên:
   - Android emulator (nhấn 'a')
   - iOS simulator (nhấn 'i') [macOS only]
   - Thiết bị thật qua Expo Go
          │
          ▼
6. Cập nhật docs/INDEX.md + docs/features/<tên>.md
   (theo docs/skills/index-sync.md)
```

---

## Build Production với EAS

```bash
# Cài EAS CLI
npm install -g eas-cli

# Đăng nhập Expo account
eas login

# Cấu hình (lần đầu)
eas build:configure

# Build Android (.apk / .aab)
npm run build:android

# Build iOS (.ipa)
npm run build:ios
```

Cấu hình build trong `eas.json` (tạo sau khi chạy `eas build:configure`).

---

## Các lỗi thường gặp & cách fix

| Lỗi | Nguyên nhân | Fix |
|---|---|---|
| `Network request failed` | BE chưa chạy hoặc sai IP | Kiểm tra `docker compose up` + IP trong `env.js` |
| `Unable to resolve module` | Cache cũ | `npm run start:clear` |
| QR code không scan được | Firewall chặn | Tắt firewall hoặc dùng tunnel (`expo start --tunnel`) |
| `Invariant Violation: "main" is not registered` | Sai `main` trong package.json | Kiểm tra `"main": "node_modules/expo/AppEntry.js"` |
| Metro bundler treo | Port 8081 bị chiếm | `lsof -i :8081` → kill process → restart |
| Fast Refresh không hoạt động | Module state bị corrupted | Reload thủ công: nhấn `r` |

---

## Checklist trước khi demo / test

```
[ ] BE đang chạy: docker compose up
[ ] Thiết bị và máy BE cùng mạng Wi-Fi (nếu dùng thiết bị thật)
[ ] Expo dev server đang chạy: npm start
[ ] API URL được resolve đúng (kiểm tra log console.log(API_BASE_URL))
[ ] Không còn lỗi trong Expo overlay
[ ] Test trên ít nhất 1 emulator + 1 thiết bị thật (nếu có)
```
