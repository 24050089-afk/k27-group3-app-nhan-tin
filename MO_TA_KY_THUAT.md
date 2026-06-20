# Mô Tả Kỹ Thuật Dự Án

## 1. Tổng Quan

Dự án gồm hai thành phần chính:

- **Backend (BE):** REST API xây dựng bằng Node.js + Express + Sequelize
- **Frontend (FE):** Ứng dụng di động xây dựng bằng React Native
- **Cơ sở dữ liệu:** MySQL
- **Triển khai BE + DB:** Docker Compose

---

## 2. Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────┐
│              Mobile App (FE)                │
│           React Native (iOS/Android)        │
└────────────────────┬────────────────────────┘
                     │ HTTP / REST API
                     ▼
┌─────────────────────────────────────────────┐
│              Backend (BE)                   │
│         Node.js + Express.js                │
│                                             │
│  Router → Middleware → Controller → Model   │
│              (Sequelize ORM)                │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│           Cơ Sở Dữ Liệu                    │
│                MySQL                        │
└─────────────────────────────────────────────┘
         (BE + MySQL chạy qua Docker Compose)
```

---

## 3. Backend (BE)

### Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| ORM | Sequelize |
| Database | MySQL |
| Container | Docker, Docker Compose |

### Cấu Trúc Thư Mục

```
backend/
├── src/
│   ├── config/
│   │   └── database.js          # Cấu hình kết nối Sequelize + MySQL
│   ├── models/
│   │   ├── index.js             # Khởi tạo Sequelize, load toàn bộ model
│   │   └── *.model.js           # Định nghĩa các bảng (entity)
│   ├── controllers/
│   │   └── *.controller.js      # Xử lý logic nghiệp vụ, trả về response
│   ├── routers/
│   │   ├── index.js             # Tập hợp toàn bộ route
│   │   └── *.router.js          # Định nghĩa endpoint cho từng nhóm tính năng
│   ├── middlewares/
│   │   ├── auth.middleware.js   # Xác thực token (JWT,...)
│   │   ├── error.middleware.js  # Xử lý lỗi tập trung
│   │   └── validate.middleware.js # Kiểm tra dữ liệu đầu vào
│   └── app.js                   # Khởi tạo Express app
├── server.js                    # Entry point, lắng nghe cổng
├── .env                         # Biến môi trường (DB, PORT, JWT_SECRET,...)
├── docker-compose.yml           # Định nghĩa service BE + MySQL
└── Dockerfile                   # Build image cho BE
```

### Luồng Xử Lý Request

```
Client Request
     │
     ▼
 Express Router         ← Định tuyến theo URL + HTTP method
     │
     ▼
 Middleware              ← Auth, validate input, logging,...
     │
     ▼
 Controller             ← Nhận req, gọi Model, trả res
     │
     ▼
 Sequelize Model        ← Truy vấn MySQL (CRUD)
     │
     ▼
 MySQL Database
```

### Cấu Hình Sequelize

```js
// config/database.js
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    port: process.env.DB_PORT || 3306,
  }
);

module.exports = sequelize;
```

### Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  db:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: lt_web
      MYSQL_USER: appuser
      MYSQL_PASSWORD: apppassword
    ports:
      - "3306:3306"
    volumes:
      - db_data:/var/lib/mysql
    networks:
      - app-network

  backend:
    build: .
    ports:
      - "3000:3000"
    environment:
      DB_HOST: db
      DB_PORT: 3306
      DB_NAME: lt_web
      DB_USER: appuser
      DB_PASSWORD: apppassword
    depends_on:
      - db
    networks:
      - app-network

volumes:
  db_data:

networks:
  app-network:
```

---

## 4. Frontend (FE)

### Công Nghệ Sử Dụng

| Thành phần | Công nghệ |
|---|---|
| Framework | React Native |
| Dev toolchain | **Expo SDK 50** |
| Debug/Preview | **Expo Go** (iOS & Android) |
| Ngôn ngữ | JavaScript |
| Nền tảng | iOS & Android |
| Gọi API | Axios |
| Điều hướng | React Navigation 6 |
| Quản lý state | Context API |
| Lưu trữ local | AsyncStorage |
| Build production | EAS Build |

### Vai trò của Expo

```
┌────────────────────────────────────────────┐
│              Development                   │
│                                            │
│  expo start → Expo Go app → thiết bị thật │
│            → Android emulator              │
│            → iOS simulator                 │
│                                            │
│  Fast Refresh + Debug tools tích hợp       │
└──────────────────────┬─────────────────────┘
                       │
                       ▼
┌────────────────────────────────────────────┐
│              Production                    │
│         EAS Build → .apk / .ipa            │
└────────────────────────────────────────────┘
```

### Cấu Trúc Thư Mục

```
mobile/
├── app.json                     # Expo app config (tên, bundle ID, icon)
├── App.js                       # Entry point (dùng expo-status-bar)
├── package.json                 # main: node_modules/expo/AppEntry.js
├── babel.config.js              # preset: babel-preset-expo
├── .env                         # Ghi chú URL — tự động resolve qua env.js
└── src/
    ├── api/
    │   ├── client.js            # Axios instance (URL từ utils/env.js)
    │   ├── auth.api.js
    │   └── product.api.js
    ├── screens/                 # Màn hình giao diện
    ├── components/              # Component dùng chung
    ├── navigation/index.js      # React Navigation
    ├── store/AuthContext.js     # Auth state (Context API)
    ├── hooks/
    └── utils/
        ├── storage.js           # AsyncStorage wrapper
        └── env.js               # Auto-resolve API URL theo môi trường Expo
```

### Luồng Giao Tiếp FE ↔ BE

```
User Action (bấm nút, nhập form,...)
     │
     ▼
Screen / Component
     │
     ▼
API Layer (axios)        ← Gọi REST API tới BE
     │  HTTP Request
     ▼
Backend Express Server
     │  JSON Response
     ▼
Store (Redux/Context)    ← Lưu state, cập nhật UI
     │
     ▼
Re-render UI
```

---

## 5. Cơ Sở Dữ Liệu (MySQL)

- Hệ quản trị: **MySQL 8.0**
- Kết nối thông qua **Sequelize ORM** từ phía BE
- Schema được quản lý bằng **Sequelize Migrations**
- Dữ liệu được persist qua **Docker Volume**

### Quy Ước Đặt Tên

| Đối tượng | Quy ước |
|---|---|
| Tên bảng | snake_case, số nhiều (vd: `users`, `order_items`) |
| Khóa chính | `id` (AUTO_INCREMENT) |
| Khóa ngoại | `<tên_bảng>_id` (vd: `user_id`) |
| Timestamps | `created_at`, `updated_at` |

---

## 6. Biến Môi Trường

### Backend `.env`

```env
PORT=3000
DB_HOST=db
DB_PORT=3306
DB_NAME=lt_web
DB_USER=appuser
DB_PASSWORD=apppassword
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

### Mobile `.env`

```env
API_BASE_URL=http://<IP_máy_chủ>:3000/api
```

---

## 7. Hướng Dẫn Khởi Chạy

### Khởi chạy Backend + Database

```bash
# Build và chạy các service
docker compose up --build

# Chạy nền
docker compose up -d --build

# Dừng
docker compose down
```

### Khởi chạy Frontend (Mobile — Expo)

```bash
cd mobile
npm install

# Khởi động Expo dev server
npm start

# Chọn nền tảng từ terminal:
#   Nhấn 'a' → Android emulator
#   Nhấn 'i' → iOS simulator (macOS only)
#   Scan QR  → Expo Go trên thiết bị thật

# Xóa cache nếu gặp lỗi
npm run start:clear

# Build production
npx eas build --platform android
npx eas build --platform ios
```

> **Lưu ý**: Khi dùng Expo Go trên thiết bị thật, thiết bị và máy chạy BE phải cùng mạng Wi-Fi.  
> API URL được tự động phát hiện qua `mobile/src/utils/env.js`.

---

## 8. API Convention

- Base URL: `http://host:3000/api`
- Format dữ liệu: `JSON`
- Xác thực: `Bearer Token` (JWT) qua header `Authorization`

### Mẫu Response

```json
// Thành công
{
  "success": true,
  "data": { ... },
  "message": "OK"
}

// Lỗi
{
  "success": false,
  "message": "Mô tả lỗi",
  "error": "ERROR_CODE"
}
```

---

## 9. Sơ Đồ Triển Khai

```
[ Thiết bị di động ]
    iOS / Android
         │
         │ HTTP (Wi-Fi / 4G)
         ▼
[ Docker Host ]
  ┌──────────────────────────┐
  │  docker-compose          │
  │  ┌────────────────────┐  │
  │  │  backend (Node.js) │  │
  │  │  port: 3000        │  │
  │  └────────┬───────────┘  │
  │           │ internal      │
  │  ┌────────▼───────────┐  │
  │  │  db (MySQL 8.0)    │  │
  │  │  port: 3306        │  │
  │  └────────────────────┘  │
  └──────────────────────────┘
```
