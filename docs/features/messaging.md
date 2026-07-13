# Feature Trace: Messaging

> Skill dinh kem: truoc khi sua endpoint trong nhom nay, doc `docs/skills/security-checklist.md`.
> Dong bo: sau khi sua, cap nhat `docs/INDEX.md` va cac spec lien quan.

## Tong Quan

| Thuoc tinh | Gia tri |
|---|---|
| Scope | BE + FE |
| Routers | `backend/src/routers/friendship.router.js`, `conversation.router.js`, `message.router.js` |
| Controllers | `friendship.controller.js`, `conversation.controller.js`, `message.controller.js` |
| Models | `Friendship`, `BlockedUser`, `Conversation`, `ConversationMember`, `Message`, `Attachment`, `MessageStatus`, `Reaction`, `Notification` |
| Mobile API | `mobile/src/api/social.api.js`, `mobile/src/api/conversation.api.js` |
| Mobile Screens | `ChatListScreen`, `ChatScreen`, `NewChatScreen`, `FriendsScreen` |

## Endpoints

| Endpoint | Auth | Muc dich |
|---|---|---|
| `GET /api/social/users/search` | Protected | Tim nguoi dung theo ten/email/phone/username |
| `GET /api/social/friends` | Protected | Lay danh sach ban be |
| `GET /api/social/requests` | Protected | Lay loi moi ket ban den |
| `POST /api/social/requests` | Protected + validate | Gui loi moi ket ban |
| `PATCH /api/social/requests/:id` | Protected + validate | Chap nhan/tu choi loi moi |
| `POST /api/social/blocks` | Protected + validate | Chan nguoi dung |
| `DELETE /api/social/blocks/:id` | Protected | Bo chan nguoi dung |
| `GET /api/conversations` | Protected | Danh sach chat cua user |
| `GET /api/conversations/:id` | Protected + membership | Chi tiet chat |
| `POST /api/conversations/private` | Protected + validate | Tao/mo chat rieng voi ban be |
| `POST /api/conversations/groups` | Protected + validate | Tao nhom chat |
| `PATCH /api/conversations/:id` | Protected + admin nhom | Doi ten/avatar nhom |
| `PATCH /api/conversations/:id/settings` | Protected + membership | Ghim/tat thong bao chat cua user |
| `DELETE /api/conversations/:id/members/me` | Protected + membership | Roi cuoc tro chuyen |
| `GET /api/conversations/:conversationId/messages` | Protected + membership | Lay tin nhan co phan trang |
| `POST /api/conversations/:conversationId/messages` | Protected + validate + membership | Gui tin nhan |
| `PATCH /api/conversations/:conversationId/seen` | Protected + membership | Danh dau da xem |
| `PATCH /api/messages/:id` | Protected + sender only | Sua tin nhan |
| `PATCH /api/messages/:id/recall` | Protected + sender/admin | Thu hoi tin nhan |
| `POST /api/messages/:id/reactions` | Protected + membership | Tha reaction |
| `DELETE /api/messages/:id/reactions/me` | Protected + membership | Xoa reaction cua minh |
| `POST /api/upload/chat-image` | Protected + multipart `image`, toi da 10 MB | Tai anh chat len va tra URL public; tra `413` neu vuot gioi han |

## Bao Mat

- SEC-01: Tat ca endpoint messaging deu dung `protect`.
- SEC-02: Conversation/message deu kiem tra membership; sua tin nhan chi sender; update nhom chi admin.
- SEC-03: Router dung `express-validator` cho body chinh.
- SEC-04: `user_id` lay tu `req.user.id`, khong nhan tu body.
- SEC-07: Dung Sequelize ORM, khong raw SQL.
- SEC-09: `GET messages` co `page`, `limit`, gioi han toi da 100.

## Mobile Runtime

- Upload anh dung `fetch` native rieng cho `FormData` de React Native tu tao multipart boundary; timeout 60 giay.
- Mobile kiem tra dung luong toi da 10 MB truoc khi upload; backend ap dung cung gioi han.
- Gui tin nhan/anh dung khoa dong bo `useRef` de ngan nhieu request va Alert trung khi nguoi dung cham lien tuc, dac biet tren iOS.
- Socket `conversation:seen` cap nhat `outgoing_status` trong state local; khong goi lai API, tranh vong lap GET messages/conversation + PATCH seen.
- Backend chi emit `conversation:seen` khi status hoac `last_read_message_id` thuc su thay doi, nen client cu cung khong the tao event feedback loop.
- `ChatScreen` dang A/B test `useAnimatedKeyboard()` + keyboard spacer va `useSafeAreaInsets()`; khong dung offset chieu cao ban phim co dinh.
- A/B test chua duoc xac nhan tren moi thiet bi: can kiem tra mo/dong, ban phim chu/emoji, xoay man hinh va floating keyboard.

## File Lien Quan

```text
backend/src/models/friendship.model.js
backend/src/models/blockedUser.model.js
backend/src/models/conversation.model.js
backend/src/models/conversationMember.model.js
backend/src/models/message.model.js
backend/src/models/attachment.model.js
backend/src/models/messageStatus.model.js
backend/src/models/reaction.model.js
backend/src/models/notification.model.js
backend/src/controllers/friendship.controller.js
backend/src/controllers/conversation.controller.js
backend/src/controllers/message.controller.js
backend/src/routers/friendship.router.js
backend/src/routers/conversation.router.js
backend/src/routers/message.router.js
mobile/src/api/social.api.js
mobile/src/api/conversation.api.js
mobile/src/api/upload.api.js
mobile/src/screens/ChatListScreen.js
mobile/src/screens/ChatScreen.js
mobile/src/screens/NewChatScreen.js
mobile/src/screens/FriendsScreen.js
mobile/src/components/Avatar.js
mobile/src/components/ChatListItem.js
mobile/src/components/UserListItem.js
mobile/src/components/MessageBubble.js
backend/src/controllers/upload.controller.js
backend/src/routers/upload.router.js
```
