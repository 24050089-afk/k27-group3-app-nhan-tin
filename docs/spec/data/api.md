# API Contracts

Nguon su that: `backend/src/routers/*.router.js`. Base URL development: `http://<LAN_HOST>:4000/api`.

## Auth

| Method | Path | Auth | Body chinh |
|---|---|---|---|
| POST | `/auth/register` | Public | `name`, `email`, `password` (min 6) |
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
| PATCH | `/users/me` | Protected | `name?`, `avatar?` |
| DELETE | `/users/:id` | Admin | - |

## Social

| Method | Path | Auth | Body/query chinh |
|---|---|---|---|
| GET | `/social/users/search?search=...` | Protected | `search` |
| GET | `/social/friends` | Protected | - |
| GET | `/social/requests` | Protected | - |
| POST | `/social/requests` | Protected | `friend_id` |
| PATCH | `/social/requests/:id` | Protected | `status: accepted|rejected` |
| POST | `/social/blocks` | Protected | `blocked_user_id` |
| DELETE | `/social/blocks/:id` | Protected | - |

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

## Messages

| Method | Path | Auth | Body chinh |
|---|---|---|---|
| PATCH | `/messages/:id` | Protected + sender | `content` (max 4000) |
| PATCH | `/messages/:id/recall` | Protected + sender/admin | - |
| POST | `/messages/:id/reactions` | Protected + member | `type` (max 32) |
| DELETE | `/messages/:id/reactions/me` | Protected + member | - |

## Upload Anh Chat

`POST /upload/chat-image` dung `multipart/form-data`, field `image`, Protected.

- Chi chap nhan MIME `image/*`.
- Gioi han 10 MB; vuot gioi han tra `413`.
- Response `201`: `{ "success": true, "data": { "file_url": "...", "file_type": "image/jpeg", "size": 0, "thumbnail_url": "..." } }`.

## Response Chung

- Thanh cong: `{ success: true, data?, message?, meta? }`.
- Loi: `{ success: false, message, errors? }`.
- `401`: thieu/sai token; `403`: khong du quyen; `404`: khong tim thay/khong phai member; `422`: validation.
