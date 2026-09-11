# Cài đặt và quyền thành viên nhóm

## Quyền nội dung theo vai trò (G13)

Policy nhóm giữ các quyền legacy của thành viên và bổ sung snapshot riêng cho `owner`, `admin`, `member`. Owner được xác định bằng `created_by` trước membership role; cả ba role đều chịu năm quyền nội dung, trong đó ảnh/thoại cần cả quyền media và quyền con. Owner vẫn là role duy nhất được quản lý policy khi management flag bật.

PATCH legacy với `members_can_*` chỉ cập nhật role member. Contract mới dùng `{ role, permissions, expected_version }`, chỉ một role mỗi request, dùng chung version toàn group và trả thêm `role_permissions`. Migration role là additive, giữ các giá trị restrictive hiện có và fail closed nếu policy thiếu/hỏng; rollout live cần migration/rehearsal riêng.

Trạng thái nền trước G13: đã migration và bật management trên Docker dự án hiện hành ngày 2026-09-07 theo xác nhận người dùng; owner GET/PATCH và finalize đạt. G13 role policy đã local-verified trên DB test cô lập; migration role vào live và phát hành production vẫn pending. Chưa hoàn tất nghiệm thu thiết bị. Backup/restore và evidence: [Plan M9.5](../Plan.md). Task: GP-01…GP-05, SEC-02/03.

## Luồng sử dụng

Trong chat nhóm, nhấn dấu ba chấm → **Cài đặt nhóm** → **Quyền thành viên**. Cài đặt nhóm hiển thị ảnh/tên nhóm, số và danh sách quản trị viên/thành viên. Admin nhóm được sửa tên/ảnh. Pin/mute là tùy chọn cá nhân. Thành viên có thể rời nhóm sau xác nhận; nhóm trưởng bị chặn rời khi chưa có chuyển quyền.

Quyền có 5 field: gửi văn bản, gửi phương tiện, ảnh, thoại, cảm xúc. Quyền phương tiện là cha; tắt cha giữ nguyên lựa chọn con. Bộ đếm tính quyền hiệu lực. Chỉ nhóm trưởng được **Lưu**, admin/member xem read-only. Toggle chỉnh draft, **Hủy** bỏ thay đổi; **Lưu** gửi partial PATCH với `expected_version`. Xung đột giữ draft, yêu cầu dùng cấu hình mới trước khi tiếp tục. Ngoại tuyến không queue hoặc tự retry thao tác ghi.

Nhóm trưởng và admin nhóm không bị hạn chế gửi/react; admin hệ thống không thay thế membership. Backend kiểm tra tại transaction cho send/edit/react; forward kiểm tra conversation đích. Recall tin của mình và gỡ reaction của mình vẫn được phép nếu còn membership. Private creator không recall tin của đối phương.

Composer giữ bản nháp khi quyền đổi, chặn picker/recorder phù hợp; ảnh-only vẫn gửi được khi chỉ cấm text. Mất quyền thoại dừng recorder. REST là nguồn quyền; socket chỉ báo tải lại. Reconnect/foreground/focus xác minh lại; response được tách theo user/conversation/generation và version. Refresh nền không khóa ô nhập. File đã upload nhưng gửi bị từ chối không tự gửi lại. Ảnh orphan hiện **giữ lại**, không tự cleanup; cần chốt retention trước activation. Script cleanup voice hiện hữu không xử lý ảnh.

Không có toggle giả cho invite link, slow mode, topics, trả phí, thêm/kick thành viên hoặc chuyển owner.

## Contract

- `GET /api/conversations` và `GET /api/conversations/:id`: thêm `member_permissions`, `my_capabilities`, `permissions_status`. List tải policies theo batch. Private: policy null, management false, capability gửi/react true theo domain policy.
- Group policy thiếu/hỏng: đọc vẫn 200 với `permissions_status: "unavailable"`, policy/capabilities null; ghi phụ thuộc policy trả `503 GROUP_POLICY_UNAVAILABLE`. Không fallback allow hoặc tự tạo policy khi đọc.
- `PATCH /api/conversations/:id/permissions`: owner + membership, whitelist boolean, ít nhất một field, positive integer `expected_version`; mỗi PATCH hợp lệ tăng version đúng một, kể cả cùng giá trị. Sai payload 400, không owner 403, outsider 404, conflict 409. Field `permission` đi kèm lỗi `GROUP_PERMISSION_DENIED`.
- Flag `GROUP_PERMISSIONS_MANAGEMENT_ENABLED` mặc định false; chỉ bật/tắt quản lý, không bỏ enforcement. Tắt flag: PATCH trả `503 GROUP_PERMISSION_MANAGEMENT_DISABLED`.
- `conversation:permissions_updated`: `{ conversationId, version, changedKeys }`; `conversation:updated` vào user room chứa tín hiệu chung, không phát capability của một người cho mọi người. Event cập nhật do gửi tin thêm `reason: "message"` để màn quyền không cần refetch.
- Thứ tự khóa: conversation → memberships theo user ID → policy → message → reaction/status. Leave evict mọi socket trước commit dưới cùng lock, join cũng dùng lock. Socket emit mutation sau commit.
- Classifier kết hợp type/MIME/decoded path, có HEIC/HEIF. Metadata mâu thuẫn lấy hợp quyền; media không xác định cần media/photo/voice để tránh bypass. Đây là hạn chế bảo thủ với file legacy.

## Dữ liệu và kích hoạt

`conversation_permissions`: `conversation_id` INTEGER PK/FK cascade tới conversations; 15 BOOLEAN NOT NULL default true (5 legacy member + 5 admin + 5 owner); `version` INTEGER NOT NULL default 1; timestamps. Group phải có một policy; private không có. Creator phải còn membership admin. Tạo group/membership/policy cùng transaction.

Các lệnh chạy từ `backend/`, với cấu hình DB đích đã xác minh:

```text
npm run group-permissions:migrate:status
npm run group-permissions:migrate:prepare
npm run group-permissions:migrate:backfill -- --before-activation
npm run group-permissions:migrate:finalize
```

Trước thao tác trên dữ liệu đang dùng: chuẩn bị backup, checksum, restore thử và checkpoint theo M3/M7. Giữ management false. Drain/chặn writer cũ tạo group/đổi owner membership trước catch-up backfill và finalize cuối; triển khai backend tương thích rồi mới mở writer. Chỉ bật management sau các gate đã đạt. Không rollback sang backend bỏ enforcement. Backfill từ chối khi đã có policy hạn chế; phục hồi policy mất từ backup đã xác minh thay vì tự cấp lại quyền.

Đã chạy migration trên `lt_db` sau backup và restore rehearsal, bật management qua Compose và xác minh 3 nhóm. Không thay `.env` hiện hành. Với môi trường khác chưa migration, group mutation phụ thuộc policy sẽ bị chặn; cần cutover theo runbook trước khi đưa backend mới phục vụ người dùng.

## Kiểm thử tái lập

Unit: `npm test` từ backend và mobile. Integration dùng Docker riêng, chỉ dữ liệu giả, không đọc `.env`:

```powershell
docker run --detach --rm --name proxy-permissions-test --publish 127.0.0.1:33479:3306 --env MYSQL_ROOT_PASSWORD=proxy_test_only --env MYSQL_DATABASE=proxy_permissions_test mysql:8.0
# Chờ MySQL sẵn sàng. Chạy từ backend:
$env:PROXY_GROUP_TEST='1'
npm run test:group-permissions:integration
```

Harness cố định host `127.0.0.1`, port `33479`, DB `proxy_permissions_test`; không dùng DB URL môi trường khác. Tên biến opt-in bắt buộc. Dọn container này sau kiểm thử bằng `docker stop proxy-permissions-test`, không dừng `lt_db`.

Export mobile chạy offline, không nạp env thật:

```powershell
$env:EXPO_NO_DOTENV='1'
$env:EXPO_OFFLINE='1'
node node_modules/expo/bin/cli export --platform android --platform ios --output-dir .expo/group-permissions-export
```

Export không chứng minh mic/camera, font lớn, screen reader hoặc UI trên hai thiết bị. Những ca này, restore dữ liệu đại diện và rollout thật vẫn cần nghiệm thu GP-05; chưa coi toàn bộ Plan hoàn tất.
