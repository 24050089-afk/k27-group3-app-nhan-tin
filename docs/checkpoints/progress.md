# Tiến độ và bàn giao theo lô

Mỗi block là bằng chứng tại thời điểm ghi; block mới nhất quyết định trạng thái điều phối hiện hành. Không ghi secret, token, dữ liệu chat hoặc vị trí.

```yaml
Task: TASK-ID
Status: done | blocked
Revision/worktree: git revision và phạm vi thay đổi
Expected: acceptance được kiểm tra
Actual: kết quả thực tế
Checks: lệnh/case và PASS | FAIL | NOT_RUN
Files: đường dẫn liên quan
Limits/next: giới hạn và bước tiếp theo
```

## SEC-01 — 2026-09-10

```yaml
Task: SEC-01
Status: blocked
Revision/worktree: HEAD trùng origin/main; chỉ triage read-only, không sửa tracking/history/credential/runtime
Expected: Phân loại biến nghi vấn, phạm vi working/history/remote, tác động và kết luận GATE-SAFE mà không in giá trị
Actual: |
  DB_PASSWORD — credential ứng dụng DB đang active — có trong working tree, HEAD, origin/main, tài liệu/Compose và container đang chạy — có thể cho phép truy cập dữ liệu bằng quyền ứng dụng nếu phạm vi mạng/host bị vượt qua.
  MYSQL_PASSWORD — credential user MySQL đang active — có trong HEAD/origin/main, Compose/tài liệu và container DB đang chạy — tác động tương đương quyền DB của user cấu hình.
  MYSQL_ROOT_PASSWORD — credential quản trị MySQL đang active — có trong HEAD/origin/main, Compose/tài liệu và container DB đang chạy — có thể dẫn tới toàn quyền DB nếu truy cập được dịch vụ/container/host.
  JWT_SECRET — secret ký/xác minh token đang active dù có hình thức placeholder — có trong working tree, HEAD, origin/main và container backend đang chạy — có thể cho phép giả mạo token; backend được publish trên port host.
  DB_USER — định danh tài khoản, không phải secret độc lập — có trong env/remote/container — làm tăng ngữ cảnh khai thác khi đi cùng password.
  mobile/.env — tracked ở working/HEAD/origin/main nhưng hiện chỉ có comment, không phát hiện assignment active; lịch sử quan sát có một commit, chưa coi việc tracked là an toàn lâu dài.
  backend/uploads — 13 ảnh JPG tracked và có trên origin/main; không mở nội dung, ghi nhận nguy cơ dữ liệu người dùng cho REP-01.
  node_modules — 24644 entry tracked và có trên origin/main; rủi ro repository bloat/noise, không tự suy ra credential.
Checks: |
  PASS — đếm git ls-files/origin main: total 24826, node_modules 24644, uploads 13, env 2.
  PASS — HEAD bằng origin/main; backend/.env và mobile/.env reachable từ remote ref; remote visibility chưa xác minh.
  PASS — đối chiếu tên biến với metadata hai container healthy, chỉ xuất trạng thái khớp; không xuất giá trị.
  PASS — scan chữ ký token/private key phổ biến ngoài node_modules không phát hiện mẫu tương ứng; đây không phải chứng minh không còn secret khác.
Kết luận GATE-SAFE: chưa đạt — xác nhận incident credential active đã được commit và hiện diện trên origin/main.
Files: backend/.env, mobile/.env, docker-compose.yml, CLAUDE.md, MO_TA_KY_THUAT.md, docs/checkpoints/progress.md
Limits/next: Dừng SEC-01; cần human checkpoint để chốt containment/rotation cho DB_PASSWORD, MYSQL_PASSWORD, MYSQL_ROOT_PASSWORD và JWT_SECRET, đánh giá session/token hiện hành và phạm vi người có quyền đọc remote. Chưa mở REP-01 và chưa rewrite history/push.
```

## UX-03 finding — 2026-09-10

Vấn đề: slide transition gây lỗi/giật trên thiết bị chưa được cung cấp tên/OS trong phiên này.

Sửa: đổi sang `none` tại `mobile/src/navigation/index.js`, dùng chung `groupSettingsScreenOptions` cho đúng hai route `GroupSettings` và `GroupPermissions`; giữ animation mặc định của các route khác, gesture back, header và cấu trúc route.

Kiểm tra: thiết bị `NOT_RUN` vì không có tên/OS hoặc kết nối thiết bị và `adb` không khả dụng trong môi trường; `cd mobile && npm test` PASS 37/37; Babel compile `src/navigation/index.js` PASS; source inspection xác nhận hai route dùng `animation: none`; `git diff --check -- mobile/src/navigation/index.js` PASS.

Status: blocked — code/config và kiểm tra cục bộ đã đạt; cần chạy lại đúng thiết bị phát hiện lỗi để xác nhận hết giật trước khi đóng finding UX-03.

Cập nhật từ thiết bị: người dùng xác nhận `animation: none` gây chớp nháy giao diện và ảnh hưởng trải nghiệm. Cấu hình được đổi sang `animation: fade` cho cùng hai route; không mở rộng sang route khác. Cần xác nhận lại trên thiết bị sau khi nạp bundle mới.

Kiểm tra sau khi đổi sang `fade`: `cd mobile && npm test` PASS 37/37; Babel compile navigation PASS; `git diff --check` PASS. Device recheck vẫn `NOT_RUN` cho cấu hình mới.

Rà soát lần 2 sau khi thiết bị vẫn nháy: nguyên nhân trong source là hai màn đích khởi tạo với `data=null`, render loading/skeleton rồi thay toàn bộ cây UI sau GET; `GroupPermissionsScreen` còn để loading/error ngoài root có màu nền nên có thể lộ frame nền trong lúc transition.

Sửa: giữ `fade`; truyền snapshot nhóm hiện có theo đúng `conversationId` và `user.id` từ `ChatScreen` sang `GroupSettingsScreen`, rồi sang `GroupPermissionsScreen`. Hook vẫn refetch khi focus và chỉ đánh dấu verified sau response; thao tác cập nhật bị khóa trong thời gian đó. `saved/draft` của màn quyền được khởi tạo đồng bộ từ snapshot để không có frame trung gian “Quyền chưa xác minh”. Snapshot từ account/conversation cũ bị từ chối, response có version thấp hơn không ghi đè policy mới hơn. Loading/error fallback của màn quyền được bọc bằng nền theme cố định.

Kiểm tra: render case mới xác nhận policy vẫn hiển thị khi GET còn pending, thao tác bị khóa rồi mở sau khi xác minh; các case đổi account/conversation được chạy lại với snapshot ban đầu. `cd mobile && npm test` PASS 38/38; Babel compile năm file source liên quan PASS; `git diff --check` PASS. Một lần gọi Babel trung gian FAIL vì truyền sai đường dẫn config tương đối, chạy lại với đường dẫn tuyệt đối PASS; không phải lỗi source.

Status: blocked — kiểm tra cục bộ đạt; cần nạp bundle mới và xác nhận trên chính thiết bị đang thấy nháy. Nếu vẫn còn, cần ghi rõ thao tác gây nháy (mở Cài đặt nhóm, mở Quyền trong nhóm hay quay lại) cùng tên thiết bị/OS để tách lỗi native transition khỏi re-render nội dung.

Cập nhật motion/dark mode: `fade` toàn màn hình có thể làm lộ nền root/native trong lúc opacity thấp. Root `AppShell` nay luôn phủ `colors.background`; Android dùng native `fade_from_bottom` để giữ màn đích hữu hình trong transition, iOS dùng `fade` 500 ms để tránh cảm giác chuyển quá nhanh. Hai route nhóm vẫn dùng chung một cấu hình; không đổi gesture, header hoặc cấu trúc route.

Kiểm tra sau cập nhật: `cd mobile && npm test` PASS 38/38; Babel compile `App.js` và năm file nguồn liên quan PASS; `git diff --check` PASS. Device verification vẫn `NOT_RUN`; Android không hỗ trợ tùy chỉnh `animationDuration` của native-stack nên phải đánh giá nhịp `fade_from_bottom` trực tiếp trên thiết bị.

Kết thúc phạm vi hiện tại: `deferred` theo yêu cầu người dùng. Giữ toàn bộ bản sửa và bằng chứng cục bộ; không ghi UX-03 `done` vì bản transition cuối chưa được xác nhận lại trên thiết bị và các case accessibility, screen reader, native permission/media cùng hai tài khoản trên hai thiết bị vẫn `NOT_RUN`. Chỉ mở lại khi người dùng yêu cầu.

## SEC-01 + REP-01 — 2026-09-10

```yaml
Task: SEC-01 + REP-01
Status: done
Revision/worktree: mức xử lý rút gọn cho dự án học phần; giữ nguyên các thay đổi người dùng ngoài phạm vi
Expected: đổi credential active, restart giữ volume, login lại được, token JWT cũ hết hiệu lực; bỏ tracking env/dependency/upload nhưng giữ file local
Actual: |
  Đã đổi DB_PASSWORD và MYSQL_PASSWORD bằng cùng credential mới của user ứng dụng; MYSQL_ROOT_PASSWORD và JWT_SECRET dùng giá trị random mới độc lập.
  Đã chuyển password MySQL khỏi docker-compose.yml sang backend/.env và cập nhật password thật của các account trong volume MySQL trước khi restart.
  Đã gỡ tracking: backend/.env, mobile/.env, mobile/node_modules (24.644 entry), backend/uploads (13 entry).
  File local được giữ: hai .env, 35.077 file dependency hiện có và 30 file upload hiện có vẫn tồn tại sau git rm --cached.
  .gitignore cấp repository bỏ qua .env, node_modules/ và uploads/.
Checks: |
  PASS — docker compose config.
  PASS — lt_db và lt_backend healthy sau docker compose down/up -d; HTTP /health đáp ứng.
  PASS — token ký bằng JWT cũ bị 401; register trước rotation rồi login và GET /api/auth/me sau rotation thành công.
  PASS — user smoke tạm đã xóa khỏi DB.
  PASS — git ls-files còn 0 env, 0 node_modules và 0 uploads.
Files: backend/.env (local/ignored), mobile/.env (local/ignored), .gitignore, docker-compose.yml, docs/checkpoints/progress.md
Limits/next: commit cleanup `c6e60967`; không rewrite history hoặc force-push theo mức đã hạ; giá trị cũ vẫn có trong commit cũ nhưng không còn active. Tiếp tục ENV-01; QA-01 vẫn cần đạt trước DB-01.
```
## PLAN-CLOSE — 2026-09-10

Task: Đóng toàn bộ backlog còn lại theo phạm vi rút gọn của dự án học phần
Status: done
Expected: Giữ các task đã đủ bằng chứng ở `done`; chuyển mọi task chưa đạt acceptance sang `deferred`; không đánh dấu gate PASS; xóa công việc kế tiếp.
Actual: SEC-01, REP-01, UX-01 và UX-02 giữ `done`; mọi task còn lại trong M4 chuyển `deferred`; sáu gate là NOT_EVALUATED/NOT_PASSED; `next_task: null`.
Checks: Kiểm tra tài liệu UTF-8, code-fence, trạng thái M4 và metadata Plan.
Kết quả: PASS
Giới hạn: Đây là đóng phạm vi quản trị, không chứng minh production/release readiness; muốn tiếp tục phải mở lại phạm vi rõ ràng.

## Personal settings — 2026-09-10

```yaml
Task: Trạng thái hoạt động + quản lý tệp đính kèm
Status: done
Revision/worktree: phạm vi ngoài backlog đã đóng; giữ nguyên dirty worktree và các thay đổi có sẵn
Expected: công tắc trạng thái hoạt động lưu bền vững và ẩn online/last-seen; màn tệp đính kèm chỉ thống kê/xóa cache tạm, không xóa thư viện thiết bị
Actual: |
  Đã thêm preference show_activity_status, API profile strict boolean, self/public serialization và login/logout tôn trọng lựa chọn.
  Đã thêm màn quản lý cache lt-media-downloads với số tệp, dung lượng, dung lượng trống và thao tác dọn cache.
  Review độc lập phát hiện hai race P2; đã giới hạn merge state theo field mutation và chặn dọn cache khi batch tải đang hoạt động.
Checks: |
  Backend npm test PASS 57/57; mobile npm test PASS 39/39; Android Expo export PASS; backend syntax và scoped diff-check PASS.
  Migration live PASS: TINYINT(1) NOT NULL DEFAULT 1, 9/9 row hiện hữu có giá trị true và không có null; backend healthy sau restart.
  API smoke PASS: tạo tài khoản thử, tắt trạng thái, self read và đăng nhập lại vẫn hidden; fixture đã xóa.
  Review độc lập V4 hoàn tất; ba finding P2 về cache race, profile mutation race và schema type check đã được sửa, không còn finding correctness.
Files: backend/migrations/202609100001-add-show-activity-status-to-users.js, backend/src/models/user.model.js, backend/src/services/userIdentity.service.js, mobile/src/screens/ProfileScreen.js, mobile/src/screens/AttachmentSettingsScreen.js, mobile/src/utils/attachmentCache.js
Limits/next: Native/device behavior của công tắc và màn cache chưa được kiểm tra; bundle Android đã xác minh cục bộ. Không xóa ảnh/video đã lưu trong thư viện thiết bị.
```

## Brand rename — 2026-09-10

```yaml
Task: Chuẩn hóa tên ứng dụng thành Proxy
Status: done
Expected: thay toàn bộ branding cũ trong app, cấu hình, QR, test, CI và tài liệu; mô tả rõ đây là ứng dụng nhắn tin
Actual: |
  Tên Expo/UI/package/backend/CI/docs đã đổi thành Proxy; app description xác định trò chuyện riêng và nhóm.
  Expo slug đổi thành proxy-mobile, scheme QR thành proxy://, Android/iOS identifier thành com.proxy.mobile.
  Component nhận diện được đổi thành ProxyMark; chuỗi chia sẻ QR, thông báo và permission prompt dùng Proxy.
  Tên DB/container và UID LT- được giữ vì là định danh dữ liệu live, không phải branding ứng dụng.
  Quick Tunnel của việc trước đã dừng và công cụ tạm đã được dọn theo yêu cầu bỏ qua.
Checks: rg toàn repository không còn chuỗi branding cũ; backend npm test PASS 57/57; mobile npm test PASS 39/39; Expo public config PASS; Android export PASS
Files: mobile/app.json, mobile/package.json, mobile/src/components/ProxyMark.js, mobile/src/utils/friendQrPayload.js, backend/package.json, README.md, docs/, .github/workflows/ci.yml
Limits/next: package identifier và QR scheme mới yêu cầu cài bản mobile mới; mã QR theo scheme cũ không còn được chấp nhận.
```
