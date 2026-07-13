# Database schema hiện tại — LTMB

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
├─< friendships (user_id / friend_id) >─ users
├─< blocked_users (user_id / blocked_user_id) >─ users
├─< conversation_members >─ conversations >─ users (created_by)
├─< messages (sender_id)
├─< message_statuses
├─< reactions
└─< notifications

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
| `name` | VARCHAR(100) | NOT NULL | Tên hiển thị |
| `email` | VARCHAR(150) | NOT NULL | UNIQUE, validate email |
| `phone` | VARCHAR(30) | NULL | UNIQUE |
| `username` | VARCHAR(60) | NULL | UNIQUE |
| `password` | VARCHAR(255) | NOT NULL | bcrypt hash; bị loại khỏi `toJSON()` |
| `avatar` | VARCHAR(255) | NULL | URL ảnh đại diện |
| `role` | ENUM(`user`,`admin`) | default `user` | Phân quyền |
| `bio` | VARCHAR(255) | NULL | Giới thiệu |
| `last_seen_at` | DATETIME | NULL | Lần hoạt động gần nhất |
| `is_online` | BOOLEAN | default `false` | Trạng thái realtime |

Password được hash ở hook `beforeCreate` và khi password thay đổi trong `beforeUpdate`.

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

## 4. Alias Sequelize cần dùng đúng

| Từ model | Association alias |
|---|---|
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

- 2026-07-13: sau khi xác nhận đã backup, đã drop an toàn `order_items`, `orders`, `products` khỏi database `lt_web`; schema thực tế còn 10 bảng phục vụ auth/messaging.
- 2026-07-13: đối chiếu lại toàn bộ 13 Sequelize model và associations; thay template/spec cũ bằng bản đồ database hiện hành cho agent.
