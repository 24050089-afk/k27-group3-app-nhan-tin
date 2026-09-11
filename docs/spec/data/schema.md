# Database schema hiện tại — Proxy

> Bổ sung mã ngày 2026-09-07. G13 bổ sung 15 boolean policy columns (5 member legacy + 5 admin + 5 owner), version INTEGER và timestamps trong `conversation_permissions`; migration live vẫn cần rollout checkpoint riêng. Group có một policy; private không có. Migration prepare/backfill/finalize và kiểm tra owner invariant: [hướng dẫn phân quyền nhóm](../../features/group-permissions.md).

> Tài liệu bàn giao cho agent. Nguồn sự thật là `backend/src/models/*.model.js` và `backend/src/models/index.js`. Nội dung này mô tả schema Sequelize đang có trong code, không phải schema dự kiến.

## 1. Tổng quan vận hành

- Database: MySQL 8, database mặc định `lt_web`.
- ORM: Sequelize 6, cấu hình tại `backend/src/config/database.js`.
- Khởi động tại `backend/server.js` bằng `sequelize.sync({ alter: true })`.
- Hiện repository không có thư mục migration/seed chính thức.
- Mọi model dùng `underscored: true`; Sequelize tự thêm `created_at` và `updated_at` vào tất cả bảng.
- ID của các bảng là `INTEGER`, primary key, auto increment.
- Không sửa schema production chỉ bằng cách khởi động app mà chưa đánh giá tác động của `sync({ alter: true })`.

Kết nối TablePlus khi chạy Docker Compose:

```text
Host: 127.0.0.1
Port: 3307
Database: lt_web
User: appuser
Password: apppassword
```

## 2. Bản đồ quan hệ

```text
users
├─< products ─< order_items >─ orders >─ users
├─< friendships (user_id / friend_id) >─ users
├─< blocked_users (user_id / blocked_user_id) >─ users
├─< conversation_members >─ conversations >─ users (created_by)
├─< messages (sender_id)
├─< message_statuses
├─< reactions
└─< notifications

users ──1:1── user_nearby_discovery (temporary foreground discovery session)

conversations ─< messages
messages ─┬─< attachments
          ├─< message_statuses >─ users
          ├─< reactions >─ users
          └─> messages (reply_to_id, self-reference)

conversation_members ─> messages (last_read_message_id)
```

## 3. Danh sách bảng

### `users`

Model: `backend/src/models/user.model.js`. Lưu tài khoản, profile và trạng thái online.

| Cột | Kiểu | Null/default | Ràng buộc hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK, auto increment |
| `uid` | VARCHAR(15) | NOT NULL | UNIQUE; mã công khai bất biến dạng `LT-XXXXXXXXXXXX` |
| `name` | VARCHAR(100) | NOT NULL | Tên hiển thị |
| `email` | VARCHAR(150) | NOT NULL | UNIQUE, validate email |
| `phone` | VARCHAR(30) | NULL | UNIQUE |
| `username` | VARCHAR(60) | NULL | UNIQUE; application chỉ nhận canonical lowercase dài 3–30 ký tự |
| `password` | VARCHAR(255) | NOT NULL | bcrypt hash; bị loại khỏi `toJSON()` |
| `avatar` | VARCHAR(255) | NULL | URL ảnh đại diện |
| `role` | ENUM(`user`,`admin`) | default `user` | Phân quyền |
| `bio` | VARCHAR(255) | NULL | Giới thiệu |
| `last_seen_at` | DATETIME | NULL | Lần hoạt động gần nhất |
| `is_online` | BOOLEAN | default `false` | Trạng thái realtime |

Password được hash ở hook `beforeCreate` và khi password thay đổi trong `beforeUpdate`.

`uid` không thay thế `id` trong khóa ngoại. UID được backend sinh bằng nguồn ngẫu nhiên mật mã và không nhận từ client. Database hiện hữu phải chạy lần lượt `identity:migrate:prepare`, `identity:backfill`, `identity:migrate:finalize` trước khi khởi động code model mới; không dùng `sync({ alter: true })` cho thay đổi này.

### `products`

Model: `product.model.js`. Sản phẩm thuộc một user.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `name` | VARCHAR(200) | NOT NULL | Tên sản phẩm |
| `description` | TEXT | NULL | Mô tả |
| `price` | DECIMAL(10,2) | default `0` | Giá hiện tại |
| `stock` | INTEGER | default `0` | Tồn kho |
| `image_url` | VARCHAR(255) | NULL | Ảnh sản phẩm |
| `user_id` | INTEGER | NOT NULL | FK → `users.id`, alias `owner` |

### `orders`

Model: `order.model.js`. Đơn hàng và snapshot thông tin giao nhận.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `user_id` | INTEGER | NOT NULL | FK → `users.id`, alias `customer` |
| `status` | ENUM(`pending`,`confirmed`,`shipping`,`completed`,`cancelled`) | default `pending` | Trạng thái đơn |
| `total_amount` | DECIMAL(10,2) | default `0` | Server tính từ các dòng hàng |
| `customer_name` | VARCHAR(100) | NOT NULL | Người nhận |
| `phone` | VARCHAR(20) | NOT NULL | SĐT nhận hàng |
| `address` | VARCHAR(255) | NOT NULL | Địa chỉ giao hàng |
| `note` | TEXT | NULL | Ghi chú |

### `order_items`

Model: `orderItem.model.js`. Dòng hàng và snapshot sản phẩm tại lúc mua.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `order_id` | INTEGER | NOT NULL | FK → `orders.id`, alias `order` |
| `product_id` | INTEGER | NOT NULL | FK → `products.id`, alias `product` |
| `product_name` | VARCHAR(200) | NOT NULL | Snapshot tên |
| `product_image_url` | VARCHAR(255) | NULL | Snapshot ảnh |
| `unit_price` | DECIMAL(10,2) | default `0` | Snapshot đơn giá |
| `quantity` | INTEGER | default `1` | Số lượng |
| `line_total` | DECIMAL(10,2) | default `0` | `unit_price × quantity` |

### `friendships`

Model: `friendship.model.js`. Một hàng biểu diễn lời mời/kết nối có hướng từ người gửi tới người nhận.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `user_id` | INTEGER | NOT NULL | FK → `users.id`, alias `requester` |
| `friend_id` | INTEGER | NOT NULL | FK → `users.id`, alias `recipient` |
| `status` | ENUM(`pending`,`accepted`,`rejected`) | default `pending` | Trạng thái lời mời |

Unique index: (`user_id`, `friend_id`). Code nghiệp vụ phải kiểm tra cả chiều ngược lại nếu không cho phép hai lời mời đối xứng.

### `blocked_users`

Model: `blockedUser.model.js`. Quan hệ user chặn một user khác.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `user_id` | INTEGER | NOT NULL | FK → `users.id`, alias `blocker` |
| `blocked_user_id` | INTEGER | NOT NULL | FK → `users.id`, alias `blockedUser` |

Unique index: (`user_id`, `blocked_user_id`).

### `user_nearby_discovery`

Model: `backend/src/models/userNearbyDiscovery.model.js`. Phiên khám phá gần đây tạm thời, mỗi user tối đa một dòng; không lưu lịch sử vị trí.

| Cột | Kiểu | Null/default | Ràng buộc hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK, auto increment |
| `user_id` | INTEGER | NOT NULL | FK → `users.id`, unique |
| `location_point` | POINT SRID 4326 | NOT NULL | Tọa độ đã lượng tử hóa; chỉ dùng cho tìm nearby |
| `accuracy_m` | INTEGER | NOT NULL | Độ chính xác tại thời điểm cập nhật |
| `location_updated_at` | DATETIME | NOT NULL | Lần cập nhật gần nhất |
| `expires_at` | DATETIME | NOT NULL | Hết hạn sau 30 phút |

Indexes: `user_nearby_discovery_user_unique`, `user_nearby_discovery_expires_idx`, `user_nearby_discovery_location_spatial`.
Migration: `backend/scripts/migrate-nearby-discovery.js`; không bật background location và không trả tọa độ chính xác cho client.

### `conversations`

Model: `conversation.model.js`. Chat riêng hoặc nhóm.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `type` | ENUM(`private`,`group`) | default `private` | Loại cuộc trò chuyện |
| `name` | VARCHAR(120) | NULL | Tên nhóm; chat riêng có thể để trống |
| `avatar` | VARCHAR(255) | NULL | Ảnh nhóm |
| `created_by` | INTEGER | NOT NULL | FK → `users.id`, alias `creator` |

### `conversation_members`

Model: `conversationMember.model.js`. Bảng nối user với conversation và lưu trạng thái riêng của thành viên.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `conversation_id` | INTEGER | NOT NULL | FK → `conversations.id` |
| `user_id` | INTEGER | NOT NULL | FK → `users.id` |
| `role` | ENUM(`admin`,`member`) | default `member` | Vai trò trong chat |
| `last_read_message_id` | INTEGER | NULL | Tham chiếu `messages.id`; association không tạo constraint |
| `muted` | BOOLEAN | default `false` | Tắt thông báo |
| `pinned` | BOOLEAN | default `false` | Ghim cuộc trò chuyện |

Unique index: (`conversation_id`, `user_id`).

### `messages`

Model: `message.model.js`. Nội dung tin nhắn trong conversation.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `conversation_id` | INTEGER | NOT NULL | FK → `conversations.id` |
| `sender_id` | INTEGER | NOT NULL | FK → `users.id`, alias `sender` |
| `content` | TEXT | NULL | Có thể trống với message chỉ có attachment |
| `type` | ENUM(`text`,`image`,`video`,`file`,`sticker`,`voice`) | default `text` | Loại nội dung |
| `reply_to_id` | INTEGER | NULL | Self-reference → `messages.id`; không tạo constraint |
| `edited` | BOOLEAN | default `false` | Đã chỉnh sửa |
| `recalled` | BOOLEAN | default `false` | Đã thu hồi; không hard-delete |

### `attachments`

Model: `attachment.model.js`. File gắn với message.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `message_id` | INTEGER | NOT NULL | FK → `messages.id` |
| `file_url` | VARCHAR(255) | NOT NULL | URL file |
| `file_type` | VARCHAR(80) | NULL | MIME/type |
| `size` | INTEGER | NULL | Kích thước byte |
| `thumbnail_url` | VARCHAR(255) | NULL | Thumbnail |

### `message_statuses`

Model: `messageStatus.model.js`. Trạng thái gửi/nhận/đọc theo từng user.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `message_id` | INTEGER | NOT NULL | FK → `messages.id` |
| `user_id` | INTEGER | NOT NULL | FK → `users.id` |
| `status` | ENUM(`sent`,`delivered`,`seen`) | default `sent` | Trạng thái |
| `seen_at` | DATETIME | NULL | Thời điểm đọc |

Unique index: (`message_id`, `user_id`).

### `reactions`

Model: `reaction.model.js`. Reaction của user trên message.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `message_id` | INTEGER | NOT NULL | FK → `messages.id` |
| `user_id` | INTEGER | NOT NULL | FK → `users.id` |
| `type` | VARCHAR(32) | NOT NULL | Loại reaction/emoji |

Unique index: (`message_id`, `user_id`), nên mỗi user chỉ có một reaction hiện hành trên mỗi message.

### `notifications`

Model: `notification.model.js`. Thông báo hệ thống cho user.

| Cột | Kiểu | Null/default | Quan hệ hoặc ý nghĩa |
|---|---|---|---|
| `id` | INTEGER | NOT NULL | PK |
| `user_id` | INTEGER | NOT NULL | FK → `users.id` |
| `type` | VARCHAR(60) | NOT NULL | Loại thông báo |
| `content` | VARCHAR(255) | NOT NULL | Nội dung |
| `related_id` | INTEGER | NULL | ID thực thể liên quan; không có FK đa hình |
| `read` | BOOLEAN | default `false` | Đã đọc |

Notification migration (`backend/scripts/migrate-notifications.js`) mở rộng bảng này với actor, category/tier, conversation/message linkage, structured payload, idempotency/event key, collapse key, aggregate count, `read_at` và `expires_at`. Các bảng mới `push_devices`, `notification_preferences`, `notification_threads` và `notification_outbox` được tạo qua migration; production không phụ thuộc `sequelize.sync()`.

## 4. Alias Sequelize cần dùng đúng

| Từ model | Association alias |
|---|---|
| `User → Product` | `products` |
| `Product → User` | `owner` |
| `User → Order` | `orders` |
| `Order → User` | `customer` |
| `Order → OrderItem` | `items` |
| `Friendship → User` | `requester`, `recipient` |
| `BlockedUser → User` | `blocker`, `blockedUser` |
| `Conversation → User` | `creator` |
| `Conversation → ConversationMember` | `members` |
| `Conversation → Message` | `messages` |
| `Message → User` | `sender` |
| `Message → Message` | `replyTo` |
| `Message → Attachment` | `attachments` |
| `Message → MessageStatus` | `statuses` |
| `Message → Reaction` | `reactions` |
| `ConversationMember → Message` | `lastReadMessage` |

Sai alias trong `include` sẽ làm Sequelize báo association error dù FK tồn tại.

## 5. Quy tắc khi agent thay đổi database

1. Đọc model liên quan và toàn bộ association trong `models/index.js`.
2. Kiểm tra controller đang phụ thuộc tên cột, enum và alias nào.
3. Không đổi/xóa cột hoặc enum trên dữ liệu thật nếu chưa có kế hoạch migration và backup.
4. Nếu thêm model: đăng ký import, association và export trong `models/index.js`.
5. Cập nhật file này cùng `docs/INDEX.md` và trace feature tương ứng.
6. Xác minh schema thực tế trong TablePlus; code model không chứng minh database đang chạy đã đồng bộ thành công.

## 6. Nhật ký tài liệu

- 2026-08-13: chạy migration notification trên Docker MySQL sau khi dừng backend và xác minh backup `migration-backups/lt_web_before_notifications_20260813_191404.sql` (SHA-256 `DBAD51B233B1465BC8E35F5483A66CEF93F7945018879CC4F2FC74ED2A53C1AD`). Mở rộng `notifications`, tạo `push_devices`, `notification_preferences`, `notification_threads`, `notification_outbox`; backfill 85 rows không có bản ghi thiếu hoặc duplicate event key. Backend bật inbox bằng `NOTIFICATIONS_ENABLED=true`; `PUSH_ENABLED=false`.
- 2026-08-02: đã chạy migration UID trên database Docker hiện hành; backfill 8/8 tài khoản, khóa `uid` thành `NOT NULL UNIQUE`, xác minh 0 null/trùng/sai định dạng. Dọn 60 unique index một-cột trùng lặp do lịch sử `sync({ alter: true })`, giữ các index canonical và `users_uid_unique`.
- 2026-08-02: bổ sung public UID bất biến và giới hạn username 30 ký tự; thêm quy trình migration/backfill theo giai đoạn.
- 2026-07-13: đối chiếu lại toàn bộ 13 Sequelize model và associations; thay template/spec cũ bằng bản đồ database hiện hành cho agent.
