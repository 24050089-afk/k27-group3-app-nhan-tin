# Feature Trace: Notes

> Dong bo: sau khi sua Notes, cap nhat `docs/INDEX.md`, `docs/spec/data/api.md`, `docs/spec/data/schema.md` va cac spec UI lien quan.

## Tong Quan

| Thuoc tinh | Gia tri |
|---|---|
| Scope | BE + FE |
| Router | `backend/src/routers/note.router.js` |
| Controller | `backend/src/controllers/note.controller.js` |
| Models | `Note`, `NoteView` |
| Mobile API | `mobile/src/api/note.api.js` |
| Mobile UI | `NotesTray`, `NoteComposerSheet`, `NoteViewerModal` |
| Integration point | `ChatListScreen` list header |

## Hanh Vi

- User tao tin ghi chu text/emoji ngan, tong do dai hien thi toi da 60 ky tu.
- Moi user chi co 1 note `ACTIVE`; tao note moi set note active cu thanh `DELETED`.
- Note tu het han sau 24 gio bang `expires_at`; API lazy-expire note active da qua han.
- Audience ho tro `ALL_FRIENDS` va `CUSTOM`.
- Chi ban be duoc xem note; neu mot trong hai user chan nhau thi API khong tra note.
- Xem chi tiet note cua nguoi khac upsert vao `note_views`.
- Tac gia xem duoc so luot xem; danh sach viewer chi tac gia duoc goi.
- Reply note dung luong DM hien co, gui text binh thuong co prefix ngu canh note; khong them cot vao `messages`.

## Endpoints

| Endpoint | Auth | Muc dich |
|---|---|---|
| `GET /api/notes/me` | Protected | Lay note active cua chinh minh |
| `GET /api/notes/feed?cursor=&limit=20` | Protected | Feed note cua ban be |
| `POST /api/notes` | Protected + validate + rate limit | Tao/thay the note active |
| `GET /api/notes/:id` | Protected + audience | Xem chi tiet va ghi nhan view |
| `DELETE /api/notes/:id` | Protected + owner | Xoa mem note bang `DELETED` |
| `GET /api/notes/:id/viewers` | Protected + owner | Danh sach nguoi da xem |
| `POST /api/notes/:id/reply` | Protected + audience | Tra loi nhanh vao DM |

## Bao Mat

- SEC-01: Tat ca endpoint Notes dung `protect`.
- SEC-02: API enforce ban be, block va custom audience; UI khong phai nguon quyen.
- SEC-03: Body chinh duoc validate bang `express-validator`.
- SEC-04: `author_id` lay tu `req.user.id`, khong nhan tu body.
- SEC-05: Text duoc sanitize ky tu control va HTML tag co ban truoc khi luu/gui.
- SEC-06: Rate limit tao note 1 lan moi 10 giay/user trong memory cua tien trinh backend.

## Realtime

- Backend emit `note:created` va `note:deleted` toi tac gia va audience hop le bang `emitUserEvent`.
- Mobile lang nghe 2 event nay trong `NotesTray` de refresh feed.
- Hien tai khong co push notification rieng cho Notes.

## Gioi Han Hien Tai

- Khong co migration chinh thuc; bang moi duoc tao qua Sequelize sync khi backend restart.
- Khong them `reply_to_note_id` vao `messages`; reply note la message text thuong co prefix ngu canh.
- Rate limit dang nam trong memory, se reset khi backend restart va chua phu hop multi-instance.
- Chua co cron worker rieng; expiration duoc xu ly khi API Notes doc du lieu.

## File Lien Quan

```text
backend/src/models/note.model.js
backend/src/models/noteView.model.js
backend/src/models/index.js
backend/src/controllers/note.controller.js
backend/src/routers/note.router.js
backend/src/routers/index.js
mobile/src/api/note.api.js
mobile/src/components/NotesTray.js
mobile/src/components/NoteComposerSheet.js
mobile/src/components/NoteViewerModal.js
mobile/src/screens/ChatListScreen.js
```
