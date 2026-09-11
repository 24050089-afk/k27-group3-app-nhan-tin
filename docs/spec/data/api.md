# API Contracts

## Bổ sung 2026-09-07 — quyền nhóm (đang nghiệm thu)

`PATCH /api/conversations/:id/permissions` nhận legacy member partial hoặc `{ role: 'owner'|'admin'|'member', permissions, expected_version }`, chỉ owner còn membership được lưu. GET list/detail thêm `member_permissions`, `role_permissions: { version, owner, admin, member }`, `my_capabilities`, `permissions_status`. Một version dùng chung toàn group; stale PATCH trả 409. Flag quản lý tắt không bỏ enforcement; policy thiếu trả null capability khi đọc và 503 khi ghi phụ thuộc quyền. Xem [contract, lỗi, realtime và cutover](../../features/group-permissions.md). G13 đã local-verified; live rollout vẫn pending.

Nguon su that: `backend/src/routers/*.router.js`. Base URL development: `http://<LAN_HOST>:4500/api` (host port; container backend van nghe port 3000).

## Auth

| Method | Path | Auth | Body chinh |
|---|---|---|---|
| POST | `/auth/register` | Public | `name`, `email`, `password` (min 6), `username?`; backend tự sinh `uid` |
| POST | `/auth/login` | Public | `email`, `password` |
| GET | `/auth/me` | Protected | - |
| POST | `/auth/logout` | Protected | - |
| POST | `/auth/forgot-password` | Public | `email`, `newPassword`, `confirmPassword` |
| PATCH | `/auth/change-password` | Protected | `currentPassword`, `newPassword` |

## Users

| Method | Path | Auth | Body/query chinh |
|---|---|---|---|
| GET | `/users` | Admin | Pagination theo controller |
| GET | `/users/:id` | Protected | - |
| GET | `/users/username-availability?username=...` | Protected + rate limit | Kiểm tra UX; không giữ chỗ username |
| PATCH | `/users/me` | Protected | `name?`, `avatar?`, `phone?`, `username?`, `bio?`; không nhận `uid/id/role/email/password` |
| DELETE | `/users/:id` | Admin | - |

## Social

| Method | Path | Auth | Body/query chinh |
|---|---|---|---|
| GET | `/social/users/search?search=...` | Protected | `search` |
| GET | `/social/suggestions/recent?limit=&cursor=` | Protected | Gợi ý kết nối từ bạn chung/nhóm chung; chỉ trả public profile |
| GET | `/social/nearby/status` | Protected | Trạng thái phiên khám phá gần đây của chính user |
| PUT | `/social/nearby/presence` | Protected + rate limit | `{ latitude, longitude, accuracy_m }`; bật/cập nhật phiên 30 phút |
| POST | `/social/nearby/search` | Protected + rate limit | `{ latitude, longitude, accuracy_m, limit?, cursor? }`; chỉ trả khoảng cách theo band |
| DELETE | `/social/nearby/presence` | Protected | Tắt phiên khám phá gần đây |
| GET | `/social/friends` | Protected | - |
| GET | `/social/requests` | Protected | - |
| POST | `/social/requests` | Protected | `friend_id` |
| PATCH | `/social/requests/:id` | Protected | `status: accepted | rejected`; khi accepted bo sung `conversation_id`, `friend` trong response |
| PATCH | `/social/requests/:id` | Protected | `status: accepted|rejected` |
| POST | `/social/blocks` | Protected | `blocked_user_id` |
| DELETE | `/social/blocks/:id` | Protected | - |
| POST | `/social/qr/resolve` | Protected + rate limit | `{ version: 1, uid }`; trả public user và relationship |

### Public identity và QR

- UID canonical: `LT-XXXXXXXXXXXX`, unique và bất biến.
- QR v1: `proxy://friend/{UID}?v=1`.
- `POST /social/qr/resolve` chỉ trả `id`, `uid`, `name`, `username`, `avatar`, `bio`, `is_online`; không trả email, phone, role, password hoặc token.
- `relationship`: `self | none | outgoing_pending | incoming_pending | accepted | rejected | blocked`.
- Gợi ý gần đây và gần vị trí luôn loại trừ user hiện tại, blocked hai chiều và friendship đã bị từ chối; không trả email/phone.
- Nearby chỉ hoạt động khi hai phía chủ động bật phiên foreground; phiên tự hết hạn sau 30 phút, không dùng background location.
- Resolver không tự tạo conversation. Với `accepted` chỉ trả conversation đã tồn tại; nút Nhắn tin có thể gọi endpoint private conversation hiện có nếu cần.

## Notifications

| Method | Path | Auth | Body/query chinh |
|---|---|---|---|
| GET | `/notifications?cursor=&limit=&unread_only=&category=` | Protected | Cursor opaque, `limit` 1-50 |
| GET | `/notifications/unread-count` | Protected | - |
| PATCH | `/notifications/:id/read` | Protected + owner | - |
| POST | `/notifications/read-all` | Protected | `category?`, `before_id?` |
| GET | `/notification-preferences` | Protected | - |
| PATCH | `/notification-preferences` | Protected | `push_messages?`, `push_social?`, `push_group_updates?`, `hide_message_preview?`, DND fields |
| PUT | `/push-devices/:installationId` | Protected | Expo token, platform, permission, locale/version metadata |
| DELETE | `/push-devices/:installationId` | Protected + owner | - |

The notification feature returns `503` until `NOTIFICATIONS_ENABLED=true` after the explicit database migration. Mute/DND/preferences suppress remote delivery only; they never delete a valid inbox event or alter message seen/unread state.

## Conversations

| Method | Path | Auth | Body/query chinh |
|---|---|---|---|
| GET | `/conversations` | Protected | - |
| GET | `/conversations/:id` | Protected + member | - |
| POST | `/conversations/private` | Protected | `friend_id` |
| POST | `/conversations/groups` | Protected | `name`, `member_ids` (min 2) |
| PATCH | `/conversations/:id` | Protected + group admin | `name?`, `avatar?` |
| PATCH | `/conversations/:id/settings` | Protected + member | `muted?`, `pinned?` |
| DELETE | `/conversations/:id/members/me` | Protected + member | - |
| GET | `/conversations/:conversationId/messages` | Protected + member | `page?`, `limit?` |
| POST | `/conversations/:conversationId/messages` | Protected + member | `content?`, `type?`, `reply_to_id?`, `attachments?` |
| PATCH | `/conversations/:conversationId/seen` | Protected + member | - |

`GET /conversations` giu nguyen response contract va tra conversation theo thu tu:

1. pinned truoc;
2. conversation co last message truoc conversation rong;
3. `last_message.created_at` (DB) / `createdAt` (Sequelize runtime) moi nhat;
4. `last_message.id` giam dan;
5. `conversation.id` giam dan.

Sau khi mot message duoc tao thanh cong, backend emit `conversation:updated` voi `{ conversationId }` toi user room cua tat ca thanh vien, bao gom sender. Edit, recall, reaction va seen khong phat activity event nay.

Khi loi moi ket ban duoc chap nhan lan dau, backend emit `friendship:accepted` voi `{ friendshipId, conversationId, friend }` va `conversation:updated` voi `{ conversationId }` cho ca hai user. API van la noi xac thuc cuoi cung; client khong tu tao conversation hay message gia.

## Messages

| Method | Path | Auth | Body chinh |
|---|---|---|---|
| PATCH | `/messages/:id` | Protected + sender | `content` (max 4000) |
| PATCH | `/messages/:id/recall` | Protected + sender/admin | - |
| POST | `/messages/:id/reactions` | Protected + member | `type` (max 32) |
| DELETE | `/messages/:id/reactions/me` | Protected + member | - |

## Notes

| Method | Path | Auth | Body/query chinh |
|---|---|---|---|
| GET | `/notes/me` | Protected | Tin ghi chu active cua chinh minh |
| GET | `/notes/feed?cursor=&limit=20` | Protected | Feed tin ghi chu cua ban be |
| POST | `/notes` | Protected | `text?`, `emoji?`, `audience?`, `custom_audience_ids?` |
| GET | `/notes/:id` | Protected + audience | Xem chi tiet va ghi nhan view neu khong phai tac gia |
| DELETE | `/notes/:id` | Protected + owner | Set `status=DELETED` |
| GET | `/notes/:id/viewers` | Protected + owner | Danh sach nguoi da xem |
| POST | `/notes/:id/reply` | Protected + audience | `message`; gui vao DM hien co voi tac gia note |

- Note text/emoji co tong do dai hien thi toi da 60 ky tu.
- Mot user chi co mot note `ACTIVE`; tao note moi se set note active cu thanh `DELETED`.
- `expires_at = created_at + 24h`; API lazy-expire note active da qua han.
- `audience=ALL_FRIENDS` hoac `CUSTOM`; user bi block khong thay note.
- Tao note bi rate limit 1 lan moi 10 giay tren moi user trong tien trinh backend.

## Upload Anh Chat

`POST /upload/chat-image` dung `multipart/form-data`, field `image`, Protected.

- Chi chap nhan MIME `image/*`.
- Gioi han 10 MB; vuot gioi han tra `413`.
- Response `201`: `{ "success": true, "data": { "file_url": "...", "file_type": "image/jpeg", "size": 0, "thumbnail_url": "..." } }`.

## Upload Ghi Am Chat

`POST /upload/chat-voice` dung `multipart/form-data`, field `voice`, Protected.

- Chi chap nhan M4A/AAC voi MIME `audio/mp4`, `audio/m4a` hoac `audio/x-m4a` va ISO BMFF signature `ftyp` hop le.
- Gioi han 10 MB; sai dinh dang tra `415`, vuot gioi han tra `413`.
- Response `201`: `{ "success": true, "data": { "file_url": ".../uploads/chat-voices/...m4a", "file_type": "audio/mp4", "size": 0, "thumbnail_url": null } }`.
- Gui message voice bang `POST /conversations/:conversationId/messages` voi `type: "voice"`, dung mot attachment va `content: ""`.
- Neu co `reply_to_id`, message duoc reply phai thuoc cung conversation.

## Response Chung

- Thanh cong: `{ success: true, data?, message?, meta? }`.
- Loi: `{ success: false, message, errors? }`.
- `401`: thieu/sai token; `403`: khong du quyen; `404`: khong tim thay/khong phai member; `422`: validation.
