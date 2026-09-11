---
task: UX-02
role: sol
last_updated: 2026-09-09T20:10:50+07:00
status: done
---

## Matrix

Mỗi expected dưới đây là quan sát ở cây render: text, accessibility state, trạng thái nút hoặc nội dung hiện ra. Việc kiểm tra lời gọi mock chỉ là bằng chứng bổ sung cho contract/tính duy nhất của mutation, không thay assertion UI.

| ID | Case | Input/setup cần mock | Hành động người dùng | Expected quan sát được ở UI | Độ phức tạp / người làm |
|---|---|---|---|---|---|
| S01 | Render cơ bản: chọn role, ba tab, đánh dấu Bạn | Render `GroupPermissionsScreen` với owner đã đăng nhập, group có `role_permissions` hợp lệ cho member/admin/owner và `my_capabilities.role=owner`; socket connected | Quan sát ban đầu rồi nhấn lần lượt ba selector | Có đúng ba selector “Thành viên”, “Quản trị viên”, “Nhóm trưởng”; role hiện tại có badge “Bạn”; heading/count đổi theo role được chọn | SIMPLE / Luna |
| S02 | Toggle cập nhật draft | Snapshot hợp lệ, owner có `manage_permissions=true`, socket connected | Nhấn switch “Gửi tin nhắn” | Switch đổi `accessibilityState.checked`; count hiển thị đổi tương ứng; nút Lưu chuyển sang enabled | SIMPLE / Luna |
| S03 | Dirty khóa selector và điều khiển Lưu | Như S02 | Toggle để tạo dirty, thử nhấn role khác, rồi Hủy | Selector có `accessibilityState.disabled=true`, role/heading không đổi và hiện hướng dẫn “Lưu hoặc Hủy…”; Lưu enabled khi dirty và disabled lại sau Hủy | SIMPLE / Luna |
| S04 | HTTP 403 hiển thị thông báo | Snapshot hợp lệ; PATCH reject lỗi status 403 với message domain; refresh không có timing/race | Tạo dirty, nhấn Lưu | Message 403 xuất hiện trong UI; nút không còn busy sau khi hoàn tất | SIMPLE / Luna |
| S05 | HTTP 404 hiển thị thông báo | Snapshot hợp lệ; PATCH reject lỗi status 404 với message domain; refresh đơn giản trả cùng snapshot | Tạo dirty, nhấn Lưu | Message 404 xuất hiện trong UI; nút không còn busy; nếu hook báo 404 thì navigation về Chats được ghi nhận bổ sung, không thay assertion message | SIMPLE / Luna |
| S06 | Owner vẫn thấy entry quản lý khi quyền nội dung tắt | Render `GroupSettingsScreen` với owner, `send_text_messages/send_media/send_voice_messages=false` trong `my_capabilities`, nhưng dữ liệu group hợp lệ | Không cần tương tác; quan sát màn hình settings | Entry “Quyền trong nhóm” và giá trị phạm vi vẫn hiện, có thể nhấn mở màn quyền | SIMPLE / Luna |
| C01 | Hủy dùng snapshot đã xác minh mới nhất | Owner đang có draft dirty từ version 3; inject REST mới version 4 trong lúc draft còn giữ | Sau REST mới, nhấn Hủy | Trước Hủy có conflict/draft cũ; sau Hủy conflict biến mất, switch/count khớp snapshot version 4 và Lưu disabled, không quay về version 3 | COMPLEX / Sol |
| C02 | Lưu gửi đúng payload role + version | Role snapshot version 3; chọn admin, tạo thay đổi `react`; PATCH controllable trả version 4 | Nhấn Lưu và resolve PATCH | UI hiện trạng thái busy rồi “Đã lưu quyền trong nhóm.”, draft sạch/Lưu disabled; mock nhận đúng `{role:'admin', permissions:{react:<giá trị mới>}, expected_version:3}` | COMPLEX / Sol |
| C03 | Double-tap Lưu chỉ một request | Như C02 nhưng PATCH giữ pending để hai lần nhấn xảy ra cùng flight | Nhấn Lưu hai lần liên tiếp trước khi resolve | UI chỉ có một trạng thái saving và sau resolve chỉ một thông báo thành công; mock PATCH được gọi đúng 1 lần | COMPLEX / Sol |
| C04a | Race: REST mới hoàn tất trước, PATCH cũ về sau | Snapshot v3, tạo dirty và PATCH pending; REST/refetch pending trả v5 với policy khác; PATCH sau đó trả v4 | Nhấn Lưu, resolve REST v5 trước rồi PATCH v4 | UI giữ snapshot v5, không hiện dữ liệu v4; stale PATCH không ghi đè snapshot mới | COMPLEX / Sol |
| C04b | Race: PATCH hoàn tất trước, REST cũ về sau | Snapshot v3; PATCH trả v4; REST request cũ giữ pending rồi trả v3 | Nhấn Lưu, resolve PATCH v4 trước rồi REST v3 | UI vẫn hiển thị dữ liệu đã xác minh v4/thông báo lưu; REST v3 không rollback UI | COMPLEX / Sol |
| C05 | Socket event version mới | Snapshot v3, socket mock có listener; event permissions_updated dẫn tới REST v4 | Phát event đúng conversation/version mới, chạy debounce và resolve REST | UI cập nhật count/switch theo v4; không còn dữ liệu v3 | COMPLEX / Sol |
| C06 | Socket event version cũ | Snapshot v4; socket event cũ dẫn tới REST response v3 | Phát event đúng conversation với version cũ, chạy debounce/resolve | UI vẫn giữ count/switch v4; snapshot cũ không ghi đè | COMPLEX / Sol |
| C07 | Socket event version trùng | Snapshot v4; socket event version 4 dẫn tới REST cùng version với metadata/capability hợp lệ | Phát event trùng version, chạy debounce/resolve | UI hội tụ theo response REST mới nhất; không tạo conflict giả và Lưu giữ trạng thái đúng | COMPLEX / Sol |
| C08 | REST mới nhất cùng version nhưng capability đổi | Snapshot policy v4 với `manage_permissions=true`; REST request mới cũng v4 nhưng `manage_permissions=false` | Resolve request mới nhất | Policy/count vẫn hiện, thao tác Lưu/switch chuyển disabled và hiện lời giải thích chỉ đọc/phù hợp owner | COMPLEX / Sol |
| C09 | HTTP 409 version conflict | Snapshot v3, draft dirty; PATCH reject 409 rồi refresh trả policy v4 | Nhấn Lưu, resolve lỗi và REST v4 | Draft không mất; UI hiện message 409 và cảnh báo conflict cùng nút “Dùng cấu hình mới”; Lưu bị khóa | COMPLEX / Sol |
| C10 | HTTP 503 policy/management unavailable | Snapshot hợp lệ; PATCH reject 503 domain message, refresh trả trạng thái/policy mới nhất | Tạo dirty, nhấn Lưu | UI hiện message 503/không thể lưu; không báo thành công, draft vẫn quan sát được và Lưu phản ánh capability/error mới nhất | COMPLEX / Sol |
| C11 | Offline không gửi mutation | Snapshot hợp lệ, socket chuyển disconnected | Tạo dirty khi connected rồi chuyển offline, nhấn Lưu | Cảnh báo “Bạn đang ngoại tuyến…” xuất hiện, Lưu disabled; mock PATCH có 0 call | COMPLEX / Sol |
| C12 | Timeout không tự retry mutation ngầm | Snapshot dirty; PATCH reject timeout một lần; refresh có kiểm soát | Nhấn Lưu một lần, hoàn tất toàn bộ microtask/timer liên quan mà không tương tác lại | UI hiện thông báo timeout, thoát busy và giữ draft; sau khi ổn định mock PATCH vẫn đúng 1 call | COMPLEX / Sol |
| C13 | Đổi tài khoản dọn draft/snapshot cũ | Cùng conversation, account A owner có snapshot/draft dirty; rerender provider/mock auth sang account B và REST B pending/khác | Đổi account A→B | Key remount làm draft A biến mất; trong lúc tải không hiện snapshot A, sau resolve chỉ hiện policy/capability của B | COMPLEX / Sol |
| C14 | Đổi conversation dọn draft/snapshot cũ | Account cố định; conversation A có draft dirty, conversation B có response pending/khác | Rerender route A→B | Draft/snapshot A không còn được render khi sang B; sau resolve chỉ hiện policy của B, Lưu disabled theo state B | COMPLEX / Sol |

## Log

## 2026-09-09T13:27:38+07:00 — matrix
Status: done
Đã làm: Đọc checkpoint khởi tạo, Plan revision 9 mục G13.2/G13.3/G14.2, `GroupPermissionsScreen`, `GroupSettingsScreen`, hook details/socket, API client, component Button/Switch và test hiện có. Lập matrix bao phủ render cơ bản, draft/selector/Hủy/Lưu, payload, double-tap, hai chiều race REST/PATCH, socket mới/cũ/trùng, REST cùng version capability đổi, 409/403/404/503, offline/timeout, đổi account/conversation và owner entry khi quyền nội dung tắt. Phân công chỉ các case timing/network/state phức tạp cho Sol.
Còn thiếu: Triển khai và chạy thật từng case COMPLEX C01–C14; Luna có thể bắt đầu S01–S06 từ matrix này.
File liên quan: docs/checkpoints/UX-02-sol.md; docs/Plan.md; mobile/src/screens/GroupPermissionsScreen.js; mobile/src/screens/GroupSettingsScreen.js; mobile/src/hooks/useConversationDetails.js; mobile/src/hooks/useSocketStatus.js; mobile/src/api/conversation.api.js; mobile/src/api/client.js; mobile/src/components/PermissionSwitchRow.js; mobile/src/components/Button.js; mobile/test/groupPermissions.test.mjs
Lệnh đã chạy: `rg -n "G14.2|G13.2|M0.4|UX-02" docs/Plan.md`; `rg --files mobile`; `node -e require.resolve(...)` kiểm tra render tooling; đọc trực tiếp các file liên quan
Kết quả: PASS
Rủi ro/lưu ý: Project hiện không khai báo/cài `react-test-renderer`, `@testing-library/react-native`, `react-reconciler` hay `react-dom`; không được cài dependency mới. Cần dựng render harness tối thiểu bằng Babel/React tooling đã có hoặc xác minh một renderer tương thích khác trước khi code case đầu tiên. Worktree có nhiều thay đổi sẵn có, phải tránh đụng file ngoài test/checkpoint.

## 2026-09-09T13:32:55+07:00 — C01 Hủy dùng snapshot đã xác minh mới nhất
Status: in_progress
Đã làm: Matrix đã khóa. Xác minh project không có renderer đóng gói sẵn; chọn dùng Babel hiện có để tải component thật với một host render harness tối thiểu, chạy hooks/effects và query theo text/accessibility props. Harness sẽ tải thật `GroupPermissionsScreen`, `useConversationDetails`, `useSocketStatus`, `groupPermissions`; chỉ mock biên React Native, context, socket và API.
Còn thiếu: Tạo harness/test C01, xác minh thứ tự mock REST v3→v4 và chạy test thật.
File liên quan: mobile/test/groupPermissions.renderHarness.mjs; mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node -e require.resolve(...)`; `rg` render tooling/package-lock
Kết quả: NOT_RUN
Rủi ro/lưu ý: Harness tự viết phải chứng minh đang render component thật và chạy effect/state, không được biến thành unit helper gọi logic thuần.

## 2026-09-09T13:38:29+07:00 — C01 Hủy dùng snapshot đã xác minh mới nhất
Status: done
Đã làm: Render component thật với hook details/socket thật; tạo draft v3, inject socket-triggered REST v4 có policy khác, xác nhận conflict và count v4, nhấn Hủy rồi xác nhận switch/count theo v4, conflict biến mất và Lưu disabled. Lần chạy đầu FAIL do resolver harness không thêm `.js` cho import có dấu chấm; sửa resolver dựa trên tồn tại file và lần chạy thứ hai PASS.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.renderHarness.mjs; mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test test/groupPermissions.render.test.mjs` (2 lần)
Kết quả: PASS
Rủi ro/lưu ý: Mock timing đã được xác minh bằng count/switch khác nhau giữa v3/draft/v4; không dùng state nội bộ làm acceptance.

## 2026-09-09T13:38:29+07:00 — C02 Lưu đúng payload role + version
Status: in_progress
Đã làm: C01 PASS; chuẩn bị dùng role admin v3, toggle reaction và PATCH controllable trả v4.
Còn thiếu: Viết assertion UI busy→success/clean và payload chính xác, chạy thật.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C02
Kết quả: NOT_RUN
Rủi ro/lưu ý: Assertion mock payload chỉ bổ sung sau khi UI success/disabled đã được quan sát.

## 2026-09-09T13:39:27+07:00 — C02 Lưu đúng payload role + version
Status: done
Đã làm: Chọn tab admin trên UI, toggle reaction, giữ PATCH pending để xác nhận nút busy; kiểm tra payload role admin/version 3/chỉ field react; resolve v4 và xác nhận thông báo thành công, switch false, Lưu sạch/không busy.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C02" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: PATCH mock có đúng một response v4 và UI chỉ được xem là PASS sau khi render success.

## 2026-09-09T13:39:27+07:00 — C03 Double-tap Lưu
Status: in_progress
Đã làm: C02 PASS; chuẩn bị PATCH deferred và hai lần gọi handler trong cùng tick để kiểm tra `flight` trước rerender.
Còn thiếu: Viết test, xác nhận UI busy/success và call count chính xác, chạy thật.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C03
Kết quả: NOT_RUN
Rủi ro/lưu ý: Phải double-tap trước khi PATCH resolve; nếu dùng node đã rerender/disabled thì test không còn kiểm tra guard đồng bộ.

## 2026-09-09T13:40:17+07:00 — C03 Double-tap Lưu
Status: done
Đã làm: Gọi hai lần handler Lưu từ cùng cây render trong lúc PATCH deferred; xác nhận UI busy, PATCH mock đúng 1 call, resolve v4 rồi xác nhận success và Lưu disabled.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C03" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Hai tap xảy ra trước response và dùng cùng handler nên kiểm tra trực tiếp guard `flight`, không dựa riêng vào disabled sau rerender.

## 2026-09-09T13:40:17+07:00 — C04a REST mới hoàn tất trước, PATCH cũ về sau
Status: in_progress
Đã làm: C03 PASS; chuẩn bị PATCH v4 pending, socket-triggered REST v5 resolve trước và policy v5 có count khác.
Còn thiếu: Viết/rerun timing test, xác nhận thứ tự resolve và UI không rollback khi PATCH cũ về sau.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C04a
Kết quả: NOT_RUN
Rủi ro/lưu ý: Cần nhấn “Dùng cấu hình mới” sau race để đọc rõ switch/count snapshot v5 thay vì draft được cố ý giữ.

## 2026-09-09T13:41:38+07:00 — C04a REST mới hoàn tất trước, PATCH cũ về sau
Status: done
Đã làm: Ghi thứ tự completion thực tế `REST v5` rồi `PATCH v4`; xác nhận trước/sau PATCH cũ UI vẫn conflict, không báo success; dùng cấu hình mới và xác nhận reaction/count 2/5 của v5 cùng Lưu disabled.
Còn thiếu: Không. C04b (PATCH mới rồi REST cũ) được giữ thành case riêng và sẽ chạy sau các case độc lập vì nó kiểm tra stale guard khác trong hook.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C04a" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Mock có mảng completion chứng minh đúng thứ tự, không suy diễn từ UI.

## 2026-09-09T13:41:38+07:00 — C05 Socket event version mới
Status: in_progress
Đã làm: C04a PASS; chuẩn bị snapshot v3 và socket-triggered REST v4 với reaction/count khác.
Còn thiếu: Viết test, chạy debounce thực và xác nhận UI v4.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C05
Kết quả: NOT_RUN
Rủi ro/lưu ý: Payload event phải đúng conversation; GET count phải tăng đúng một sau debounce.

## 2026-09-09T13:42:28+07:00 — C05 Socket event version mới
Status: done
Đã làm: Phát socket event đúng conversation/version 4, chạy debounce thật 100 ms, xác nhận GET tăng từ 1 lên 2 và UI đổi reaction true→false/count 4/5, không conflict, Lưu disabled.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C05" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Dùng delay 120 ms bao phủ debounce 100 ms; assertion getCalls xác minh listener/timer thực sự chạy.

## 2026-09-09T13:42:28+07:00 — C07 Socket event version trùng
Status: in_progress
Đã làm: C05 PASS; chuẩn bị snapshot v4 rồi REST mới nhất cũng v4 nhưng policy khác.
Còn thiếu: Viết test, xác nhận response trùng version vẫn cập nhật UI và không tạo conflict.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C07
Kết quả: NOT_RUN
Rủi ro/lưu ý: Version là version policy; cùng version vẫn phải cho phép metadata/capability từ response REST mới nhất, và test này dùng policy khác để làm dấu observable.

## 2026-09-09T13:43:17+07:00 — C07 Socket event version trùng
Status: done
Đã làm: Snapshot v4 all-on, phát event version 4, REST mới nhất vẫn v4 nhưng reaction false; xác nhận GET chạy, UI nhận reaction false/count 4/5, không conflict và Lưu disabled.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C07" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Test chứng minh equality được chấp nhận, không chỉ version tăng.

## 2026-09-09T13:43:17+07:00 — C08 REST cùng version nhưng capability đổi
Status: in_progress
Đã làm: C07 PASS; chuẩn bị hai response v4, response mới đổi `manage_permissions` true→false cho owner.
Còn thiếu: Viết test, xác nhận policy vẫn render nhưng switch/Lưu disabled và lời giải thích quản lý bị khóa xuất hiện.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C08
Kết quả: NOT_RUN
Rủi ro/lưu ý: Không dùng thay đổi policy làm tín hiệu; capability phải là nguyên nhân duy nhất làm UI đổi.

## 2026-09-09T13:44:12+07:00 — C08 REST cùng version nhưng capability đổi
Status: done
Đã làm: Hai response có cùng policy/version 4; response mới chỉ đổi `manage_permissions` true→false. UI giữ count 5/5 nhưng reaction switch và Lưu chuyển disabled, đồng thời hiện thông báo owner rằng nhóm tạm khóa thay đổi quyền.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C08" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Assertion tách riêng policy/version khỏi capability nên chứng minh latest same-version representation được nhận.

## 2026-09-09T13:44:12+07:00 — C09 HTTP 409 version conflict
Status: in_progress
Đã làm: C08 PASS; chuẩn bị draft v3, PATCH reject 409 và refresh v4 khác policy.
Còn thiếu: Viết test, xác nhận message 409, draft giữ, conflict button xuất hiện và Lưu khóa.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C09
Kết quả: NOT_RUN
Rủi ro/lưu ý: Refresh sau catch là một phần timing; phải enqueue GET v4 trước khi nhấn Lưu để không có request ngoài dự kiến.

## 2026-09-09T13:45:06+07:00 — C09 HTTP 409 version conflict
Status: done
Đã làm: PATCH reject 409 domain code rồi refresh v4; xác nhận đúng 1 PATCH/2 GET, message 409 và cảnh báo conflict/nút Dùng cấu hình mới cùng xuất hiện, reaction draft false còn giữ và Lưu disabled.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C09" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Draft false trùng giá trị người dùng vừa chọn nhưng snapshot v4 có reaction true; sự tồn tại conflict chứng minh draft chưa bị đồng bộ ngầm.

## 2026-09-09T13:45:06+07:00 — C10 HTTP 503 unavailable
Status: in_progress
Đã làm: C09 PASS; chuẩn bị PATCH reject 503 và refresh cùng version nhưng management capability false.
Còn thiếu: Viết test, xác nhận message 503, không success, draft giữ và UI chuyển read-only.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C10
Kết quả: NOT_RUN
Rủi ro/lưu ý: Không biến 503 thành conflict nếu version không đổi; capability response quyết định trạng thái disabled.

## 2026-09-09T13:46:03+07:00 — C10 HTTP 503 unavailable
Status: done
Đã làm: PATCH reject 503 `GROUP_POLICY_UNAVAILABLE`, refresh cùng v3 nhưng capability quản lý false; xác nhận message 503, không success, reaction draft false còn giữ, switch/Lưu disabled và thông báo owner read-only.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C10" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Version không đổi nên không có conflict giả; response capability mới vẫn tác động UI.

## 2026-09-09T13:46:03+07:00 — C11 Offline không gửi mutation
Status: in_progress
Đã làm: C10 PASS; chuẩn bị draft dirty khi connected rồi phát socket disconnect.
Còn thiếu: Viết test, xác nhận cảnh báo offline/Lưu disabled và ngay cả gọi guard handler cũng không tạo PATCH.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C11
Kết quả: NOT_RUN
Rủi ro/lưu ý: Không enqueue PATCH để mọi mutation ngoài dự kiến làm test fail ngay.

## 2026-09-09T19:55:19+07:00 — C11 Offline không gửi mutation
Status: done
Đã làm: Tạo draft khi socket connected, chuyển socket sang disconnected, xác nhận UI hiện cảnh báo ngoại tuyến, Lưu disabled, draft vẫn quan sát được; gọi guard handler của nút disabled không tạo request PATCH.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C11" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Mock không enqueue PATCH nên mọi mutation ngoài dự kiến cũng làm test lỗi; call count thực tế bằng 0.

## 2026-09-09T19:55:19+07:00 — C12 Timeout không tự retry mutation
Status: in_progress
Đã làm: Đã xác nhận C11 PASS; chuẩn bị PATCH reject timeout đúng một lần và refresh có kiểm soát.
Còn thiếu: Viết test, chạy hết microtask/timer liên quan, xác nhận message timeout/thoát busy/giữ draft và PATCH call count vẫn bằng 1.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: chưa có cho C12
Kết quả: NOT_RUN
Rủi ro/lưu ý: Không enqueue PATCH lần hai để mọi retry ngầm làm test fail ngay.

## 2026-09-09T19:56:41+07:00 — C12 Timeout không tự retry mutation
Status: done
Đã làm: PATCH reject lỗi timeout đúng một lần; refresh trả lại snapshot v3. Sau khi chờ toàn bộ microtask/timer, UI hiện lỗi timeout, không hiện success, thoát busy, giữ reaction draft=false và Lưu vẫn enabled để người dùng chủ động thử lại.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C12" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Mock không có response PATCH thứ hai; call count thực tế vẫn bằng 1 sau 150 ms và refresh.

## 2026-09-09T19:56:41+07:00 — C04b PATCH hoàn tất trước, REST cũ về sau
Status: in_progress
Đã làm: C12 PASS; đọc lại hook generation guard và save flow. Chuẩn bị một REST request cũ pending, sau đó PATCH response v4 hoàn tất trước và REST v3 mới được resolve.
Còn thiếu: Viết test với completion order xác minh, quan sát UI giữ v4/success và không rollback về v3.
File liên quan: mobile/test/groupPermissions.render.test.mjs; mobile/src/hooks/useConversationDetails.js; mobile/src/screens/GroupPermissionsScreen.js
Lệnh đã chạy: chưa có cho C04b
Kết quả: NOT_RUN
Rủi ro/lưu ý: Response production có cả member_permissions và role_permissions; stale protection gồm generation request và version projection. Test phải phân biệt dữ liệu v3/v4 bằng UI.

## 2026-09-09T19:59:58+07:00 — C04b PATCH hoàn tất trước, REST cũ về sau
Status: done
Đã làm: Xác nhận thứ tự completion thực tế PATCH v4 trước REST v3. Sau khi PATCH hoàn tất, UI hiện thông báo lưu, reaction=false, count 4/5 và Lưu disabled; REST v3 về sau không khôi phục reaction=true hoặc rollback snapshot.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C04b" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Test dùng response v3/v4 có UI khác nhau và mảng completion để xác minh đúng thứ tự, không dựa vào thời gian suy đoán.

## 2026-09-09T19:59:58+07:00 — C06 Socket event version cũ
Status: in_progress
Đã làm: C04b PASS; chuẩn bị snapshot v4 và event permissions_updated version 3. Cần xác nhận guard không tải hoặc không áp dụng dữ liệu v3 và UI vẫn giữ v4.
Còn thiếu: Viết test, chạy debounce/response theo hành vi production và xác nhận UI observable.
File liên quan: mobile/test/groupPermissions.render.test.mjs; mobile/src/hooks/useConversationDetails.js
Lệnh đã chạy: chưa có cho C06
Kết quả: NOT_RUN
Rủi ro/lưu ý: Listener production hiện không lọc version event trước khi refetch; stale response phải bị chặn bằng generation/version projection. Test cần enqueue GET để phân biệt refetch hợp lệ với mock thiếu dữ liệu.

## 2026-09-09T19:58:54+07:00 — C04b PATCH hoàn tất trước, REST cũ về sau
Status: done
Đã làm: Lần chạy đầu loại bỏ setup chỉ có một REST pending vì UI đúng contract giữ Lưu disabled khi `details.loading=true`. Chuyển sang hai REST chồng lấn: REST cũ v3 pending, REST mới v3 hoàn tất để kết thúc loading, sau đó PATCH v4 hoàn tất và cuối cùng REST cũ v3 mới về. Xác nhận completion `PATCH v4` trước `REST v3`; UI vẫn giữ success, reaction=false/count 4/5 và Lưu disabled theo v4.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C04b" test/groupPermissions.render.test.mjs` (2 lần)
Kết quả: PASS
Rủi ro/lưu ý: Cách tiếp cận “một REST pending rồi nhấn Lưu” bị loại bỏ vì không thể xảy ra qua UI; loading guard vô hiệu nút Lưu. Cách thứ hai kiểm tra generation guard bằng một stale request thực sự còn pending khi PATCH hoàn tất.

## 2026-09-09T19:58:54+07:00 — C06 Socket event version cũ
Status: in_progress
Đã làm: C04b PASS; chuẩn bị snapshot v4, event socket v3 và REST response v3 có policy khác để kiểm tra version guard observable.
Còn thiếu: Viết/runs test, xác nhận UI không rollback v4.
File liên quan: mobile/test/groupPermissions.render.test.mjs; mobile/src/hooks/useConversationDetails.js
Lệnh đã chạy: chưa có cho C06
Kết quả: NOT_RUN
Rủi ro/lưu ý: Snapshot test phải phản ánh cả `member_permissions.version` và `role_permissions.version` như response G13; nếu bỏ legacy version thì fixture không đúng contract production.

## 2026-09-09T20:00:11+07:00 — C06 Socket event version cũ
Status: done
Đã làm: Render snapshot v4 reaction=false, phát event v3 và REST v3 reaction=true. Fixture chứa cả `member_permissions.version` và `role_permissions.version` theo contract G13. Xác nhận GET refetch chạy nhưng UI vẫn giữ reaction=false/count 4/5, không tạo conflict và Lưu disabled.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C06" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Event cũ vẫn có thể kích hoạt refetch; acceptance là response version cũ không được cài vào UI.

## 2026-09-09T20:00:11+07:00 — C13 Đổi tài khoản dọn state cũ
Status: in_progress
Đã làm: C06 PASS; xác minh `GroupPermissionsContent` được key theo user/conversation và harness rerender giữ component thật. Chuẩn bị account A có draft đặc trưng, account B trả response pending khác.
Còn thiếu: Viết test, xác nhận loading không lộ UI/draft A và sau resolve chỉ có policy B sạch.
File liên quan: mobile/test/groupPermissions.render.test.mjs; mobile/src/screens/GroupPermissionsScreen.js; mobile/src/hooks/useConversationDetails.js
Lệnh đã chạy: chưa có cho C13
Kết quả: NOT_RUN
Rủi ro/lưu ý: Snapshot B phải đặt `created_by` đúng account B để footer observable và không trộn authorization với reset-state.

## 2026-09-09T20:01:10+07:00 — C13 Đổi tài khoản dọn state cũ
Status: done
Đã làm: Account A tạo draft Gửi tin nhắn=false/count 4/5; rerender sang account B trong khi GET B pending. UI chuyển ngay sang Loading và không còn count A. Sau response B v8, UI chỉ hiện policy B count 2/5, Gửi tin nhắn=true, Lưu disabled và không còn cảnh báo dirty A.
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C13" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Snapshot B đặt `created_by=2` để account B vẫn là owner; test tách reset state khỏi thay đổi quyền quản lý.

## 2026-09-09T20:01:10+07:00 — C14 Đổi conversation dọn state cũ
Status: in_progress
Đã làm: C13 PASS; chuẩn bị conversation A id41 có draft đặc trưng và conversation B id42 có GET pending/policy khác.
Còn thiếu: Viết test, xác nhận khi route đổi không lộ snapshot/draft A và sau response chỉ hiện state B sạch.
File liên quan: mobile/test/groupPermissions.render.test.mjs; mobile/src/screens/GroupPermissionsScreen.js; mobile/src/hooks/useConversationDetails.js
Lệnh đã chạy: chưa có cho C14
Kết quả: NOT_RUN
Rủi ro/lưu ý: Phải assert getCalls đúng id [41,42] để chứng minh request scope đổi thật.

## 2026-09-09T20:02:26+07:00 — C14 Đổi conversation dọn state cũ
Status: done
Đã làm: Conversation A id41 tạo draft reaction=false/count 4/5; rerender route sang id42 khi GET B pending. UI chuyển ngay sang Loading và không còn count A. Sau response B v9, UI chỉ hiện count 2/5, reaction=true, Lưu disabled và không còn cảnh báo dirty A; getCalls đúng [41,42].
Còn thiếu: Không.
File liên quan: mobile/test/groupPermissions.render.test.mjs
Lệnh đã chạy: `node --test --test-name-pattern="C14" test/groupPermissions.render.test.mjs`
Kết quả: PASS
Rủi ro/lưu ý: Key screen theo user/conversation được kiểm chứng qua observable loading và policy B, không assert state nội bộ.

## 2026-09-09T20:02:26+07:00 — full COMPLEX suite
Status: in_progress
Đã làm: Đã có test cho toàn bộ C01–C14, gồm hai chiều C04 và ba loại socket C05–C07.
Còn thiếu: Chạy toàn file không filter để phát hiện tương tác/flaky; đối chiếu case list và chờ review SIMPLE từ agent khác.
File liên quan: mobile/test/groupPermissions.render.test.mjs; mobile/test/groupPermissions.renderHarness.mjs
Lệnh đã chạy: chưa chạy full suite sau khi hoàn tất C14
Kết quả: NOT_RUN
Rủi ro/lưu ý: C06 dựa vào contract G13 rằng GET additive trả đồng thời `member_permissions.version` và `role_permissions.version`; fixture thiếu legacy projection là response ngoài contract và sẽ không được dùng làm finding feature UX-02.

## 2026-09-09T20:03:06+07:00 — full COMPLEX suite
Status: done
Đã làm: Chạy toàn bộ file không filter; cả 15 bài test của 14 nhóm ID C01–C14 đều PASS vì C04 tách thành hai bài C04a/C04b. Không có C15 bị thiếu. Đối chiếu matrix xác nhận không thiếu case COMPLEX. Không sửa feature/backend/schema và không cài dependency.
Còn thiếu: Bước 3 review case SIMPLE sau khi Luna hoàn tất; sau đó chạy suite ghép và kết luận UX-02.
File liên quan: mobile/test/groupPermissions.render.test.mjs; mobile/test/groupPermissions.renderHarness.mjs; docs/checkpoints/UX-02-luna.md
Lệnh đã chạy: `node --test test/groupPermissions.render.test.mjs`
Kết quả: PASS (15/15 bài test thuộc 14 nhóm ID COMPLEX)
Rủi ro/lưu ý: Đây là render harness cục bộ trên Node, không phải native/device evidence; phần đó giữ cho UX-03. C06 hợp lệ theo response contract G13 có legacy + role projection cùng global version.

## 2026-09-09T20:08:31+07:00 — review SIMPLE S01–S05
Status: done
Đã làm: Đọc trực tiếp Luna checkpoint và `groupPermissions.simple.render.test.mjs`. S01 nhấn đủ ba role và assert heading/count khác nhau cùng badge Bạn; S02 assert switch/count/Save; S03 gọi handler role khác khi dirty và assert toàn bộ UI không đổi, selector disabled/cảnh báo/Cancel; S04/S05 assert domain message và busy=false sau refresh. Tất cả assertion acceptance nhìn vào tree/text/accessibility state; mock call không thay UI assertion. Mỗi test có unmount cleanup và await phù hợp; chạy lại nguyên file đạt 5/5.
Còn thiếu: S06 đã được Luna đánh dấu ESCALATED vì cần harness cho GroupSettingsScreen; agent Sol khác đang triển khai file riêng theo phân công của orchestrator. Cần review S06 sau khi có kết quả.
File liên quan: mobile/test/groupPermissions.simple.render.test.mjs; docs/checkpoints/UX-02-luna.md
Lệnh đã chạy: `node --test test/groupPermissions.simple.render.test.mjs`
Kết quả: PASS (5/5)
Rủi ro/lưu ý: Không phát hiện flakiness/thiếu await trong S01–S05; S06 chưa có evidence nên UX-02 chưa thể kết luận done.

## 2026-09-09T20:10:50+07:00 — review SIMPLE hoàn tất và suite ghép
Status: done
Đã làm: Review mới phát hiện assertion count ban đầu của S01 đọc toàn tree nên chưa gắn count với role đang chọn. Luna đã sửa qua hai vòng: mỗi role có policy khác, sau mỗi nhấn assert `accessibilityState.selected`, `accessibilityLabel` đúng count và heading đúng role; rerun 5/5 PASS. S02/S03 giữ assertion observable và guard đúng; S04/S05 hiển thị domain message, thoát busy, có await/cleanup. Luna escalated S06 đúng quy tắc vì thiếu harness GroupSettings; Sol bổ sung harness riêng render thật `GroupSettingsScreen` và test entry owner vẫn hiện/navigate khi content capability bị tắt. S06 PASS sau sửa một expectation test từ count 0/5 sang hiệu lực đúng 1/5 (react vẫn true), không sửa feature. Chạy suite ghép 21/21 PASS; agent review cũng chạy `npm test` mobile 37/37 PASS.
Còn thiếu: Không trong UX-02. Native module, thiết bị thật, screen reader/accessibility runtime và hai thiết bị thuộc UX-03, giữ NOT_RUN.
File liên quan: mobile/test/groupPermissions.renderHarness.mjs; mobile/test/groupPermissions.render.test.mjs; mobile/test/groupPermissions.simple.render.test.mjs; mobile/test/groupSettings.renderHarness.mjs; mobile/test/groupSettings.render.test.mjs; docs/checkpoints/UX-02-luna.md
Lệnh đã chạy: `node --test test/groupPermissions.render.test.mjs test/groupPermissions.simple.render.test.mjs test/groupSettings.render.test.mjs`; agent review: `npm test`
Kết quả: PASS (UX-02 render 21/21; mobile suite 37/37)
Rủi ro/lưu ý: Render harness dùng component thật trên Node với biên React Native/API/socket được mock; đây không phải native/device evidence. Không phát hiện feature bug trong contract UX-02. Finding S01 và expectation S06 đều là lỗi test đã được sửa, không phải bug runtime.
