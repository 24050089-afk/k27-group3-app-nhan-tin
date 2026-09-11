# Feature Trace: Messaging

## Cài đặt/phân quyền nhóm — đang nghiệm thu 2026-09-07

Chat nhóm → dấu ba chấm → `GroupSettings` → `GroupPermissions`. Đã nối thông tin tên/ảnh, danh sách admin/member, pin/mute cá nhân, leave và owner-only draft Hủy/Lưu policy theo role. Owner, admin và member đều chịu capability đã lưu; ảnh/thoại cần cả quyền media và quyền con. Backend enforcement trong transaction; mobile capability và refetch socket/foreground. Xem [trace, contract, kiểm thử và migration](group-permissions.md). G13 đã kiểm thử cô lập; native/device gate và live rollout vẫn pending.

> Skill dinh kem: truoc khi sua endpoint trong nhom nay, doc `docs/skills/security-checklist.md`.
> Dong bo: sau khi sua, cap nhat `docs/INDEX.md` va cac spec lien quan.

## Tong Quan

| Thuoc tinh | Gia tri |
|---|---|
| Scope | BE + FE |
| Routers | `backend/src/routers/friendship.router.js`, `conversation.router.js`, `message.router.js` |
| Controllers | `friendship.controller.js`, `conversation.controller.js`, `message.controller.js` |
| Models | `Friendship`, `BlockedUser`, `Conversation`, `ConversationMember`, `Message`, `Attachment`, `MessageStatus`, `Reaction`, `Notification` |
| Mobile API | `mobile/src/api/social.api.js`, `mobile/src/api/conversation.api.js`, `mobile/src/api/upload.api.js` |
| Mobile Screens | `ChatListScreen`, `ChatScreen`, `NewChatScreen`, `FriendsScreen` |

Notes la tinh nang rieng duoc chen vao dau `ChatListScreen`; trace chi tiet nam o `docs/features/notes.md`.

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

### Bat dau chat ngay sau khi ket ban

- Khi nguoi nhan chap nhan loi moi, backend cap nhat friendship va tao hoac tai su dung private conversation trong cung transaction.
- Logic tim/tao chat rieng dung chung `backend/src/services/privateConversation.service.js`; Friendship row duoc khoa khi giao dich chay de tranh tao conversation trung khi hai entry point cung luc hoat dong.
- Response chap nhan giu `data` cu va bo sung `conversation_id`, `friend`.
- Sau commit, ca hai user nhan `friendship:accepted` va `conversation:updated` qua user room.
- Conversation private chua co message dung `created_at` lam activity khoi dau; group rong khong duoc day len dau theo quy tac nay.
- Mobile chi hien loi chao goi y khi `meta.total === 0`. Day la UI system starter, khong phai database message, khong tao unread/seen/reaction/notification.
- Nut `Soan loi chao` chi dien `Xin chao 👋` vao composer, nguoi dung van phai tu bam gui.
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
| `POST /api/upload/chat-voice` | Protected + multipart `voice`, M4A/AAC toi da 10 MB | Tai ban ghi am, kiem tra MIME/signature va tra attachment payload |

## Bao Mat

- SEC-01: Tat ca endpoint messaging deu dung `protect`.
- SEC-02: Conversation/message deu kiem tra membership; sua tin nhan chi sender; update nhom chi admin.
- SEC-03: Router dung `express-validator` cho body chinh.
- SEC-04: `user_id` lay tu `req.user.id`, khong nhan tu body.
- SEC-07: Dung Sequelize ORM, khong raw SQL.
- SEC-09: `GET messages` co `page`, `limit`, gioi han toi da 100.

## Mobile Runtime

- `GET /api/conversations` sap xep theo pinned, sau do `last_message.created_at`, message ID va conversation ID; khong dung `Conversation.updated_at` lam message activity.
- Sau khi server tao message thanh cong, `conversation:updated` duoc emit vao user room cua tat ca thanh vien, gom ca sender; private va group dung chung quy tac.
- `ChatListScreen` debounce socket 200 ms, chi cho mot request danh sach chay dong thoi va queue mot luot dong bo neu event den trong luc request dang chay.
- Focus, pull-to-refresh, reconnect, pin/mute va NotesTray dung chung sync coordinator; response cua user cu khong duoc commit sau logout/login.
- Edit, recall, reaction, seen, typing va xoa local khong lam thay doi activity/order; hidden last message chi doi preview, khong doi unread.
- Upload anh dung `fetch` native rieng cho `FormData` de React Native tu tao multipart boundary; timeout 60 giay.
- Mobile kiem tra dung luong toi da 10 MB truoc khi upload; backend ap dung cung gioi han.
- Ghi am dung `expo-audio` SDK 54, toi da 5 phut; nguoi dung nghe lai truoc khi gui. Message voice tai su dung `type=voice` va `attachments`, khong doi schema.
- `VoiceMessagePlayer` phat/tam dung/tua trong bubble; `ChatScreen` dieu phoi de chi mot voice phat tai mot thoi diem.
- Permission microphone chi duoc request khi nguoi dung nhan nut mic; app background se dung ghi va giu preview neu ban ghi hop le.
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
backend/src/controllers/note.controller.js
backend/src/utils/conversationOrder.js
backend/test/conversationOrder.test.js
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
mobile/src/components/ConversationRow.js
mobile/src/components/NotesTray.js
mobile/src/components/UserListItem.js
mobile/src/components/MessageBubble.js
mobile/src/components/MessageComposer.js
mobile/src/components/VoiceRecorderBar.js
mobile/src/components/VoiceMessagePlayer.js
mobile/src/hooks/useVoiceRecorder.js
backend/src/controllers/upload.controller.js
backend/src/routers/upload.router.js
backend/scripts/cleanup-orphan-voice-uploads.js
```
