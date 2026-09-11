# Proxy — Công việc còn lại và lộ trình cải thiện cài đặt nhóm

```yaml
plan_id: Proxy-REMEDIATION-01
revision: 16
updated_at: 2026-09-10
language: vi
project_root: .
document_status: closed_reduced_scope
current_scope: closed
task_statuses: [planned, ready, in_progress, blocked, in_review, done, deferred]
execution_policy: closed_no_further_execution
next_task: null
```

> Tài liệu này giữ công việc còn phải làm, contract cần bảo toàn và bằng chứng bàn giao quan trọng. Các bước đã triển khai được bỏ khỏi danh sách “cần xây dựng”. G13 đã có mã nguồn, kiểm thử cục bộ và migration trên Docker hiện hành; chưa hoàn tất nghiệm thu thiết bị hoặc các gate phát hành toàn dự án.
>
> Revision 16 đóng kế hoạch theo phạm vi rút gọn của dự án học phần theo yêu cầu người dùng. Các task đã đủ bằng chứng giữ `done`; toàn bộ task chưa đạt acceptance chuyển `deferred`. Sáu gate phát hành chưa được đánh dấu PASS, không có tuyên bố production-ready hoặc ủy quyền deploy, và kế hoạch không còn `next_task`.

## M0. Cách dùng kế hoạch

1. Đọc M1 để biết trạng thái hiện tại; M4 để chọn việc; M5 để biết acceptance; M9 để đối chiếu bằng chứng.
2. Các đường dẫn tính từ thư mục gốc repository. Mã/model/router là bằng chứng implementation; tài liệu spec là contract; Plan điều phối công việc.
3. Chỉ đọc file liên quan task. Kiểm tra workspace trước khi sửa, giữ các thay đổi có sẵn; không mặc định lỗi cũ vẫn tồn tại.
4. Mỗi kết quả ghi task, revision/worktree, môi trường, lệnh/case, expected/actual, PASS/FAIL/NOT_RUN và giới hạn. Không sao chép PASS lịch sử thành kết quả của phiên mới.
5. `done` chỉ khi acceptance và mức kiểm chứng đã đạt. Có code, export thành công hoặc migration thành công riêng lẻ chưa chứng minh toàn bộ feature hoàn tất.
6. Không chạy lại migration role đã hoàn tất chỉ vì thấy script trong repository. Migration mới phải có phạm vi, rehearsal và checkpoint tương ứng.
7. Các số lượng test/dữ liệu trong M9 là snapshot lịch sử, không cam kết trạng thái DB hoặc CI tại thời điểm đọc.

## M1. Trạng thái hiện tại cần giữ

### M1.1 Phần đã triển khai

| Phạm vi | Trạng thái và contract hiện hành |
|---|---|
| Stack | Mobile React Native/Expo 54; backend Express/Sequelize; MySQL 8; Socket.IO |
| Cài đặt nhóm | `ChatScreen → GroupSettings → GroupPermissions`, route nhận `conversationId`; có thông tin nhóm, sửa tên/ảnh theo quyền quản trị, danh sách thành viên/quản trị viên, ghim/tắt thông báo cá nhân và rời nhóm hợp lệ |
| Quyền nội dung G13 | Ba vai trò owner/admin/member, mỗi vai trò năm quyền: text, media, photo, voice, react; owner/admin cũng chịu policy của vai trò mình |
| Quyền quản lý | Chỉ owner còn membership và khi biến môi trường cấp server `GROUP_PERMISSIONS_MANAGEMENT_ENABLED=true` được sửa policy hiện hành; quyền này độc lập với năm quyền nội dung và không phải cờ riêng từng nhóm |
| Màn quyền | Chọn vai trò, sửa draft rồi Hủy/Lưu; một vai trò có draft tại một thời điểm; expected_version dùng chung toàn nhóm; giữ draft khi lỗi/xung đột |
| Enforcement | Backend kiểm tra quyền tại mutation; missing/corrupt policy không cấp quyền mặc định; Socket.IO báo cần refetch capability của từng caller |
| DB hiện hành | Migration role đã áp dụng lên `lt_db/lt_web`, backend tương thích đã khởi động lại; bằng chứng tại M9.8 |
| Chat riêng và video | Có màn thông tin chat riêng, thư viện ảnh/video; MP4/MOV tối đa 25 MiB; video nhóm hiện cần media AND photo AND voice, chưa có toggle video riêng |

Không còn dùng các giả định cũ “chưa có bảng policy”, “chưa có màn quyền”, “owner/admin luôn được gửi nội dung” hoặc “migration role chưa chạy”. Đặc quyền quản trị cố định như thu hồi tin người khác trong group vẫn phải phân biệt với quyền nội dung.

### M1.2 Lỗi và phần chưa xác minh

- **Hiển thị quyền UX-01:** đã chuyển sang `role_permissions`/`my_capabilities`, có nhãn ba vai trò, quyền của bạn và fallback legacy/missing rõ ràng; render evidence đã đạt trong UX-02. Chi tiết M9.12–M9.13; device evidence vẫn thuộc UX-03.
- **Khôi phục DB:** dump trước G13 có geometry SRID 4159 trong khi DDL cột khai báo 4326. Đã restore thành công trên schema thử thích nghi; chưa chứng minh khôi phục nguyên schema gốc. Chi tiết M9.8; DB-02 phải xử lý trước migration live tiếp theo.
- **Mobile:** render tests đã bao phủ dirty draft, timeout, stale response, conflict, lỗi HTTP và đổi account/conversation. Finding chuyển màn của UX-03 đã được sửa cục bộ và ghi nhận phản hồi thiết bị trước bản sửa cuối; bản sửa cuối cùng cùng hai thiết bị, font scale/screen reader, mic/picker/video vẫn chưa được nghiệm thu.
- **CI/tooling:** có `npm test` và workflow; chưa có script lint trong hai package vừa đối chiếu; remote CI chưa được xác nhận.
- **Bảo mật/repository:** credential DB/JWT active đã được đổi theo mức dự án học phần; env, dependency và upload đã bỏ tracking, giữ file local. Không rewrite lịch sử nên giá trị cũ còn trong commit cũ nhưng không còn active; chi tiết M9.18.
- **Vận hành:** bootstrap toàn schema, clean install, release URL, backup/restore nguyên schema và gate toàn dự án còn mở.
- **Tài liệu khác:** INDEX/spec/feature còn chỗ ghi live G13 pending. DOC-01 sẽ đồng bộ; revision này chỉ sửa `Plan.md`.

## M3. Phạm vi và cách làm

- Giữ kiến trúc hiện tại; sửa nhỏ theo bằng chứng. Không đổi framework/database/state management toàn cục hoặc thêm dependency nếu công cụ hiện có đáp ứng.
- Không reset/stash/xóa thay đổi của người dùng, tự commit/push/rewrite Git, xóa upload thật hoặc đưa dữ liệu người dùng vào fixture/log.
- Tác vụ tài liệu: tự review và kiểm tra khách quan phù hợp. Tooling/UI: thêm trace requirement và test/build tương ứng. Auth/DB/realtime: thêm reviewer độc lập. Tác động dữ liệu/dịch vụ thật hoặc thao tác không thể đảo ngược: cần checkpoint đúng phạm vi trước thực hiện.
- Chuẩn bị diff, đối tượng tác động, backup/restore và rehearsal trước checkpoint; không xin lại thao tác đã được ủy quyền rõ ràng. Approval migration G13 trong M9.8 không tự mở rộng sang video, audit hoặc sửa dữ liệu spatial.
- Thuật ngữ cờ: **cờ quản lý chung** là biến môi trường cấp server `GROUP_PERMISSIONS_MANAGEMENT_ENABLED`; **cờ mở quản lý video** dự kiến của VID-01 là biến môi trường cấp server độc lập `GROUP_VIDEO_PERMISSION_MANAGEMENT_ENABLED`. Cả hai áp dụng cho toàn backend instance, không phải per-group hoặc cohort flag.
- Hai lần sửa cùng lỗi thất bại: dừng cách tiếp cận, ghi giả thuyết đã loại bỏ và dùng review/ngữ cảnh mới.
- Task size S/M do một model làm trọn từ khảo sát đến kiểm tra. Chỉ dùng phân vai matrix/implement/review cho task L/XL có race, DB, security, native hoặc nghiệm thu nhiều hệ thống; reviewer độc lập vẫn bắt buộc khi mức rủi ro yêu cầu V4.
- Chỉ phân công song song khi công việc độc lập và có giá trị; không để hai người sửa cùng file. Không tạo nhiều vai chỉ để đáp ứng hình thức hoặc kích thước ước lượng.
- Task S/M ghi một block ngắn vào `docs/checkpoints/progress.md` khi hoàn tất hoặc bị chặn. Task L/XL chỉ dùng checkpoint riêng khi cần chống mất ngữ cảnh hoặc điều phối nhiều vai; các checkpoint UX-02 được giữ làm evidence lịch sử, không làm mẫu mặc định.
- Cập nhật `Plan.md` một lần sau khi hoàn tất hoặc đổi phạm vi cả lô; kết quả giữa lô đi vào checkpoint chung. Ngoại lệ là finding làm sai dependency, gate, dữ liệu live hoặc phạm vi phát hành và cần sửa Plan ngay.
- Mỗi kết quả vẫn ghi task, thay đổi, kiểm tra thực tế, finding và bước kế tiếp; không ghi secret, token, nội dung chat hoặc vị trí.

## M4. Backlog còn mở và thứ tự

Giữ mã task cũ để truy vết, nhưng chỉ liệt kê phần chưa nghiệm thu. BASE-01 chuyển sang evidence; không còn là việc cần làm. `in_review` dùng khi đầu ra đang được đối chiếu acceptance/review; nếu thiếu đầu vào bắt buộc thì dùng `blocked`, ghi điều kiện mở khóa. Có thể khảo sát, chuẩn bị test hoặc tổng hợp evidence sớm; không coi đó là bắt đầu nghiệm thu task còn bị chặn.

### M4.1 Củng cố nền tảng và nghiệm thu

| Task | Priority | Trạng thái | Phần còn phải hoàn tất / phụ thuộc |
|---|---|---|---|
| SEC-01 | P0 triage | done | Đã đổi credential DB/JWT active, restart và smoke auth theo mức rút gọn cho dự án học phần; không rewrite lịch sử hoặc điều tra người đọc remote |
| QA-01 | P2 | deferred | Đóng theo phạm vi học phần; lint, test discovery, clean-install CI và bằng chứng CI chưa nghiệm thu đầy đủ |
| SEC-02 | P1 | deferred | Đóng theo phạm vi học phần; đối chiếu recall private và reaction membership còn thiếu acceptance |
| SEC-03 | P1 | deferred | Đóng theo phạm vi học phần; race mutation/leave/recall và room membership chưa đủ evidence để đánh dấu done |
| REP-01 | P1 | done | Đã thêm ignore và bỏ tracking hai `.env`, `mobile/node_modules`, `backend/uploads`; giữ toàn bộ file local, chi tiết M9.18 |
| ENV-01 | P1 | deferred | Đóng theo phạm vi học phần; clean install/Docker context/runtime tái tạo chưa thực hiện |
| DB-01 | P1 | deferred | Đóng theo phạm vi học phần; bootstrap DB rỗng, runner/status/rerun và smoke chưa nghiệm thu |
| DB-02 | P1 | deferred | Đóng theo phạm vi học phần; SRID và restore nguyên schema vẫn là rủi ro đã biết, không có sửa spatial live |
| CFG-01 | P2 | deferred | Đóng theo phạm vi học phần; guard URL preview/production và REST/socket smoke chưa nghiệm thu |
| QA-02 | P1 | deferred | Đóng theo phạm vi học phần; regression MySQL/API/socket/mobile toàn diện chưa chạy |
| DOC-01 | P2 | deferred | Đóng theo phạm vi học phần; đồng bộ toàn bộ setup/API/schema/index chưa hoàn tất |
| GP-01 | P2 | deferred | Đóng theo phạm vi học phần; evidence hiện có được giữ nhưng acceptance tổng hợp chưa đối chiếu xong |
| GP-02 | P2 | deferred | Đóng theo phạm vi học phần; API/concurrency/query count/compatibility còn thiếu evidence |
| GP-03 | P2 | deferred | Đóng theo phạm vi học phần; accessibility/device evidence từ UX-03 chưa có |
| GP-04 | P2 | deferred | Đóng theo phạm vi học phần; recording/upload race và retention media chưa nghiệm thu |
| GP-05 | P2 | deferred | Đóng theo phạm vi học phần; nghiệm thu tổng thể và rehearsal phát hành chưa đạt |
| OPS-01 | P1 | deferred | Đóng theo phạm vi học phần; artifact/config/restore/quan sát/smoke phát hành chưa nghiệm thu |
| REF-01 | P3 | deferred | Chỉ mở lại khi có lỗi/lifecycle trùng hoặc trở ngại test đo được; số dòng không đủ lý do |

### M4.2 Nhánh cải thiện cài đặt nhóm đang bàn luận

| Task | Priority | Trạng thái | Kết quả / phụ thuộc |
|---|---|---|---|
| UX-01 | P1 | done | Hiển thị GroupSettings theo G13 đã có unit/bundle và render evidence từ UX-02; device evidence được theo dõi ở UX-03 |
| UX-02 | P1 | done | Render tests đã đạt cho state quyền, stale response, timeout, conflict, lỗi HTTP và reset account/conversation; chi tiết M9.13 |
| UX-03 | P1 | deferred | Dừng ở mức hiện có theo yêu cầu người dùng. Đã sửa finding transition/loading/dark background và đạt test cục bộ; acceptance còn lại NOT_RUN gồm xác nhận bản sửa cuối trên thiết bị, accessibility/screen reader, native mic/camera/gallery và hai tài khoản trên hai thiết bị |
| UX-04 | P2 | deferred | Hoãn đến khi nền tảng và UX-03 đạt; khi mở lại dùng state đã được kiểm chứng ở UX-02 |
| VID-01 | P2 | deferred | Hoãn đến khi nền tảng, DB-02 và UX-03 đạt; migration live vẫn cần checkpoint mới |
| UX-05 | P2 | deferred | Hoãn đến khi nền tảng và UX-03 đạt; khi mở lại giữ cơ chế version/draft hiện có |
| AUD-01 | P2 | deferred | Lịch sử thay đổi policy; cần chốt người được xem, retention và phạm vi trước triển khai |
| EXT-01 | P3 | deferred | Custom role, override theo người/kênh và yêu cầu cấp quyền; chỉ mở khi có nhu cầu sản phẩm cụ thể |

**Trạng thái đóng:** SEC-01, REP-01, UX-01 và UX-02 giữ `done` theo bằng chứng đã ghi. Tất cả task còn lại chuyển `deferred`; không còn thứ tự thực thi hoặc `next_task`. Khi mở lại, phải khôi phục dependency và acceptance tương ứng thay vì suy ra task đã hoàn thành từ trạng thái đóng của tài liệu.

Các giới hạn còn nguyên: UX-03 còn NOT_RUN trên thiết bị/native/accessibility; DB-02 chưa chứng minh restore nguyên schema; SEC-02/SEC-03 chưa đủ review/race/socket evidence. Không thực hiện sửa spatial live, migration mới hoặc phát hành từ quyết định đóng phạm vi này.

### M4.3 Sizing sơ bộ cho phần việc còn lại

S = thay đổi hẹp trong một luồng; M = nhiều state/file và regression; L = nhiều lớp API/DB/mobile hoặc môi trường; XL = nghiệm thu nhiều hệ thống/thiết bị. Đây là ước lượng độ lớn tương đối để chia việc, chưa phải số ngày hay cam kết hoàn thành; phải cập nhật sau khảo sát. Thời gian chờ credential, thiết bị, CI và checkpoint ghi riêng, không tính bằng kích thước diff.

| Size | Task / phần việc |
|---|---|
| S | SEC-01 triage ban đầu, UX-01 |
| M | REP-01, QA-01, CFG-01, DOC-01, SEC-02, GP-01, UX-04, UX-05 |
| L | ENV-01, DB-01, DB-02, SEC-03, GP-02, UX-02, VID-01 |
| XL | QA-02, UX-03, GP-05, OPS-01 |
| Tổng hợp, không cộng trùng | GP-03/GP-04 nhận evidence từ UX-01…UX-03 và phần kiểm chứng còn thiếu; estimate chi tiết sau đối chiếu matrix |
| Chưa đủ phạm vi để ước lượng | SEC-01 containment, AUD-01, EXT-01, REF-01 |

Sizing này được giữ làm tham chiếu lịch sử nếu mở lại kế hoạch. Không có đường găng đang thực thi; việc đóng phạm vi không làm bất kỳ gate phát hành nào đạt.

### M4.4 Lô thực thi rút gọn

Các lô dưới đây được giữ để truy vết cách điều phối revision 12–15. Revision 16 dừng thực thi mọi lô chưa hoàn tất; trạng thái đóng tài liệu không thay acceptance từng task.

| Lô | Phạm vi | Điều kiện bắt đầu và cách đóng |
|---|---|---|
| P0 | SEC-01 triage | Done theo mức rút gọn cùng REP-01; credential active đã đổi và smoke đạt, không rewrite history |
| A | REP-01 + CFG-01 + DOC-01 | Đóng lô: REP-01 done; CFG-01 và DOC-01 deferred, chưa đạt dependency/acceptance |
| B | ENV-01 + DB-01 | Deferred; chưa chạy clean install hoặc bootstrap DB rỗng |
| C | SEC-02 + SEC-03 | Deferred; chưa đủ đối chiếu và race/socket evidence |
| D | UX-04 + UX-05 | Deferred; chỉ mở lại sau nền tảng và UX-03. Dùng một model nếu phạm vi khi đó vẫn size M và không phát sinh race phức tạp |
| E | QA-01 + phần kiểm chứng GP-01/GP-02 phù hợp | Deferred; acceptance từng task chưa đạt |

Không có lô tiếp theo. Nếu kế hoạch được mở lại, luồng dependency revision 15 vẫn là điểm xuất phát và phải được đối chiếu với workspace tại thời điểm đó.

## M5. Đầu ra bắt buộc của phần nền tảng còn lại

| Task | Công việc và điều kiện nghiệm thu |
|---|---|
| SEC-01 | Hai mốc: (1) triage ghi tên biến, loại credential/placeholder/unknown, phạm vi tracking/lịch sử/remote và tác động; (2) nếu lộ credential có hiệu lực, containment gồm rotation/bên sử dụng/ảnh hưởng session và push encryption với checkpoint. Biên bản triage phải chỉ rõ entry REP-01 được xử lý và công việc cô lập không phụ thuộc credential có thể tiếp tục. Unknown không được kết luận an toàn. SEC-01 chỉ done khi bằng chứng đủ hoặc containment đạt; GATE-SAFE vẫn bị chặn nếu còn incident hoặc mức phơi lộ chưa được kết luận phù hợp. Bỏ tracking không xóa lịch sử. |
| QA-01 | `npm test` nhận toàn bộ test đúng thư mục, gồm friend discovery; assertion lỗi trả nonzero. Thêm lint phù hợp CommonJS/RN, không auto-fix toàn repo hoặc vô hiệu hóa rules để làm xanh. CI dùng lockfile, runtime nhất quán, credential giả/DB riêng. Local pass và remote unverified phải ghi riêng. |
| SEC-02/SEC-03 | Private creator không recall tin đối phương; non-member không mutation reaction; recalled không edit/add/update reaction; group-only name/avatar, owner không leave; membership được xác minh trong transaction. Kiểm chứng hai connection DB/socket, eviction/rejoin và rollback không để lại mutation/event trái quyền. Không khôi phục bypass để rollback. |
| REP-01 | Kiểm kê chính xác entry Git; phân biệt asset sản phẩm/upload; ignore đúng phạm vi rồi chỉ bỏ tracking entry đã xác minh. Giữ source, lockfile và mọi file local. Reviewer độc lập kiểm tra danh sách trước thao tác diện rộng. |
| ENV-01 | Cài bằng lockfile từ checkout sạch; host dev 4500/container 3000; Docker context không chứa env thật, upload hay dependency host. Kiểm tra mục đích backend `expo` trước thay dependency; không tự đồng bộ major với mobile. Service kết nối DB test. |
| DB-01 | Schema đủ model/FK/index cho flag được dùng; migration runner ghi trạng thái, tránh chạy đồng thời, hỗ trợ resume/rerun. DB test có host/name guard; không `sync({ alter: true })`, không xóa volume đang dùng. Smoke register/login/private/group/message đạt trên DB trống. |
| DB-02 | Xác định nguyên nhân gốc lệch SRID trước chọn cách sửa: đối chiếu metadata nguồn, bytes trên bản sao, đường ghi/nhập dữ liệu, phiên bản và tùy chọn dump/restore; tái hiện tối thiểu để phân biệt lỗi dữ liệu, schema hoặc công cụ, không đoán nguyên nhân. Không output tọa độ hoặc tự sửa live. Giữ dump gốc; chứng minh restore đủ bảng/schema/data, count/invariant/query. Nếu cần transform spatial, bảo toàn đúng ý nghĩa với review/checkpoint riêng; đổi nhãn SRID để import không đủ. Bổ sung kiểm tra ngăn tái diễn và vòng dump → restore mới; upgrade fixture cũ, injected failure/rerun và checksum phải có evidence. |
| CFG-01 | Preview/production thiếu URL, placeholder hoặc URL sai phải fail trước build; production HTTPS; REST/socket cùng môi trường. Dev giữ auto-resolve hiện hành. Không đóng gói secret trong EXPO_PUBLIC. |
| QA-02 | MySQL/API/socket thật và mobile phù hợp: auth/login/logout/password/token sai; friend/block; text/image/voice/video/reply/forward/edit/recall/reaction/seen; ordering/pin/mute; notes/notifications theo flag; upload sai/quá giới hạn; offline/account switch. Bổ sung case thiếu, không coi mock hoặc export thay integration/native. |
| DOC-01 | Một nguồn quy tắc, routing đọc theo task; bỏ commerce/port/provider/link sai và thông tin G13 pending đã lỗi thời. Đồng bộ schema/API/messaging/group-permissions/overview/index; chỉ ghi implemented/live khi có evidence đúng phạm vi. |
| GP-01/GP-02 | Đối chiếu bộ test hiện có với ma trận ba role, 15 boolean, create rollback, owner tự hạn chế/khôi phục, direct REST, global version conflict, missing policy, flag off vẫn enforcement. Đo query count list để kiểm tra N+1; race dùng transaction MySQL thật. Không chạy lại test không đổi chỉ để tăng số evidence. |
| GP-03/GP-04/GP-05 | Đóng UX-01…UX-03 và coverage T13–T17; thử old-client/new-backend, flag off, mất event, rollback sang backend hiểu đủ role policy. Xác định retention ảnh/video orphan, reference/age guard và dry-run; không tự xóa file người dùng. Rehearsal mới phải kiểm chứng writer/cutover nếu schema/contract thay đổi. |
| OPS-01 | Gắn artifact với revision/lockfile/config, hỗ trợ nền tảng cụ thể, backup restore được, operator và ngưỡng lỗi đo được. Thu đủ gate M7 rồi checkpoint phát hành; sau deploy mới ghi smoke/deployed. |

## G13. Contract đã triển khai, dùng làm ràng buộc regression

### G13.1 Vai trò, dữ liệu và quyền

- Owner là creator của group và còn membership; xác định owner trước role admin. `User.role` toàn hệ thống không thay quyền trong group. Membership vẫn dùng admin/member, không có thao tác chuyển chủ/promote/demote mới.
- Một row `conversation_permissions` mỗi group, không có row cho private. Năm cột `members_can_*`, năm `admins_can_*`, năm `owner_can_*`; boolean hợp lệ/non-null, PK/FK, một `version >= 1`.
- Mỗi role có `send_text_messages`, `send_media`, `send_photos`, `send_voice_messages`, `react`. Owner/admin không bypass các quyền này. Photo = media AND photo; voice = media AND voice; tắt cha giữ giá trị con.
- Video hiện tại cần media AND photo AND voice. Metadata mâu thuẫn lấy hợp quyền hoặc từ chối; attachment không nhận diện không được chọn tín hiệu ít hạn chế hơn. VID-01 sẽ thay riêng cách xử lý video được xác minh.
- Chỉ owner được quản lý policy khi flag bật; tự khóa nội dung không làm mất quyền quản lý. Flag off dừng PATCH quản lý nhưng vẫn giữ enforcement.
- Sender còn membership có thể thu hồi tin mình; gỡ reaction của chính mình vẫn được khi react tắt. Thu hồi tin người khác chỉ theo đặc quyền quản trị group; edit/react tin recalled bị chặn. Owner leave bị chặn khi chưa có transfer.
- Private giữ hành vi hợp lệ và không có policy nhóm; capability tương thích không bỏ auth/membership/block/validation.

### G13.2 REST, transaction và realtime

- GET list/detail giữ field cũ và `member_permissions` gồm năm member fields + version; thêm `role_permissions: { version, owner, admin, member }` với năm key trung tính mỗi role và `my_capabilities` theo caller.
- Policy thiếu/hỏng: read còn conversation với `permissions_status=unavailable`, policy/capability null; mutation phụ thuộc policy trả `503 GROUP_POLICY_UNAVAILABLE`. Không tự tạo row/allow trong luồng đọc.
- PATCH `/api/conversations/:id/permissions` nhận một trong hai dạng:

```json
{ "expected_version": 3, "members_can_react": false }
```

```json
{ "expected_version": 3, "role": "admin", "permissions": { "react": false } }
```

- Legacy PATCH chỉ sửa member; dạng mới sửa đúng một role. Whitelist nghiêm ngặt, từ chối trộn dạng/raw columns/key lạ/non-boolean/empty patch/role sai/version thiếu hoặc sai.
- Cả hai dạng owner-only và còn membership, group-only, chịu cờ quản lý chung `GROUP_PERMISSIONS_MANAGEMENT_ENABLED`. Một version toàn nhóm, mỗi PATCH hợp lệ tăng đúng một lần kể cả giá trị giống cũ; stale version trả 409 cả khi sửa role khác.
- Giữ thứ tự lock: conversation → membership theo user ID → permission → message theo ID → reaction/status cần ghi. Send/edit/react đọc lại quyền trong transaction; group create gồm conversation/members/default policy nguyên tử.
- Event policy chỉ phát sau commit, payload `{ conversationId, version, changedKeys }` để invalidate; không broadcast capability cá nhân. Có conversation update vào user rooms. Evict socket theo cơ chế giữ lock của leave hiện hành.
- Client refetch sau event/reconnect/focus/foreground; bỏ generation/user/conversation cũ và version thấp hơn; response REST mới nhất cùng version vẫn có thể thay capability/metadata.
- Không tự retry PATCH/send sau timeout khi chưa biết commit. Không tạo push hoặc system message cho mỗi toggle.

| HTTP | Domain code phải bảo toàn |
|---:|---|
| 400 | GROUP_ONLY, INVALID_GROUP_PERMISSION |
| 403 | GROUP_OWNER_REQUIRED, GROUP_PERMISSION_DENIED |
| 404 | CONVERSATION_NOT_FOUND |
| 409 | PERMISSION_VERSION_CONFLICT, GROUP_OWNER_TRANSFER_REQUIRED |
| 503 | GROUP_POLICY_UNAVAILABLE, GROUP_PERMISSION_MANAGEMENT_DISABLED |

### G13.3 Mobile và file đầu vào

Màn quyền hiện dùng selector Thành viên/Quản trị viên/Nhóm trưởng; default member. Draft bẩn hoặc đang lưu khóa chuyển role; Hủy lấy snapshot đã xác minh mới nhất. Conflict giữ draft và khóa Lưu, có “Dùng cấu hình mới”. Backend legacy chỉ cho xem member, không dựng owner/admin mặc định true. Composer/picker/recorder/action/forward dùng capability, giữ draft và dừng recording khi mất quyền.

| Phạm vi | File cần đọc khi bắt đầu task |
|---|---|
| Settings/quyền | `mobile/src/screens/GroupSettingsScreen.js`, `mobile/src/screens/GroupPermissionsScreen.js`, `mobile/src/components/PermissionSwitchRow.js` |
| State và API mobile | `mobile/src/hooks/useConversationDetails.js`, `mobile/src/utils/groupPermissions.js`, `mobile/src/api/conversation.api.js`, `mobile/src/api/client.js` |
| Chat/media | `mobile/src/screens/ChatScreen.js`, composer/actions/forward/voice hook liên quan; đọc theo tác động |
| Backend quyền | `backend/src/utils/groupPermissions.js`, `backend/src/services/groupPermission.service.js`, `backend/src/controllers/groupPermission.controller.js` |
| Schema/router | `backend/src/models/conversationPermission.model.js`, `backend/src/routers/conversation.router.js`, `backend/scripts/migrate-group-permissions.js` |
| Enforcement khác | message/conversation controllers, `backend/src/socket.js`; đọc phần mutation liên quan |
| Test hiện có | `backend/test/groupPermissions.test.js`, `backend/test/integration/groupPermissions.test.js`, `mobile/test/groupPermissions.test.mjs` |

## G14. Kế hoạch phát triển UX đang bàn luận

Các mục sau mô tả thiết kế đích và acceptance; không dùng nhận xét về app khác làm bằng chứng kiểm thử cho Proxy.

### G14.1 UX-01 — Hiển thị đúng quyền theo vai trò

**Vấn đề:** một số đếm member và “Chỉ quản trị viên” có thể nói sai khi owner/admin cũng bị hạn chế.

**Thiết kế:**

- Đổi tên entry/header thành “Quyền trong nhóm” để bao quát ba vai trò; giữ route kỹ thuật hiện có.
- Tại entry, ưu tiên thông tin ngắn “Theo vai trò”; khi mở phần tổng quan, hiển thị riêng Thành viên, Quản trị viên, Nhóm trưởng và đánh dấu “Bạn” ở vai trò hiện tại. Tránh ghép chuỗi dài nhiều số đếm trên một dòng nhỏ.
- Nếu dùng x/5, ghi rõ đó là số mục được phép theo hiệu lực sau áp dụng media cha; không đếm `manage_permissions`. Hiển thị quyền cụ thể khi mở chi tiết; số đếm không thay giải thích.
- Dòng reaction tóm tắt theo các role thực sự có `react=true`; tất cả thì “Mọi vai trò”, không role nào thì “Đang tắt cho mọi vai trò”, tập con thì liệt kê có thể xuống dòng.
- Quyền của bạn lấy `my_capabilities`; tổng quan vai trò lấy `role_permissions`. Field thiếu là “Chưa xác minh”; không biến thiếu dữ liệu thành 0/5 hoặc allow.
- Legacy response chỉ ghi rõ “Thành viên”, không suy đoán owner/admin. Người không có quyền quản lý vẫn xem được; không xuất hiện thao tác lưu có hiệu lực.

**Acceptance:** thử cả ba role, owner/admin react off, media off nhưng child true, missing policy và backend legacy; UI khớp capability, không còn câu khẳng định admin luôn được react/gửi. Không thay enforcement hoặc mutation API.

### G14.2 UX-02 — Kiểm thử state bằng màn hình được render

- Kiểm tra component/screen với người dùng tương tác thật ở lớp render: chọn role, toggle, Hủy/Lưu, khóa selector khi dirty, double tap chỉ một request và payload đúng role/version.
- Inject REST/PATCH hoàn tất đảo thứ tự, socket version mới/cũ/trùng, response cùng version nhưng capability đổi, 409/403/404/503 và offline/timeout.
- Xác minh draft không mất, snapshot cũ không ghi đè mới, nút Lưu đúng trạng thái, không retry mutation ngầm; đổi tài khoản/conversation không còn state cũ.
- Kiểm tra quyền nội dung bị tắt không làm mất entry quản lý của owner.
- Dùng công cụ render tương thích đã có; chỉ bổ sung công cụ khi xác minh thiếu. Helper test vẫn hữu ích nhưng không thay test render.

**Acceptance:** có case tái hiện và assertion observable ở màn hình, lệnh chạy rõ, failure trả nonzero; đánh dấu riêng phần chưa thử trên thiết bị.

### G14.3 UX-03 — Accessibility, native và hai thiết bị

- Light/dark, màn nhỏ, font lớn, safe area/bàn phím; selector/row/footer không cắt chữ hoặc mất thao tác; mọi vùng chạm mục tiêu tối thiểu 48.
- Screen reader đọc role được chọn, tên/state switch, disabled/busy và thông báo kết quả; tránh đọc switch hai lần.
- Development build kiểm tra xin/từ chối mic/camera/gallery, recorder start/stop, picker, phát MP4/MOV và biên dung lượng.
- Hai tài khoản trên hai thiết bị: owner sửa quyền khi bên kia nhập/ghi âm/upload/action sheet; reconnect/foreground và mất event vẫn hội tụ REST; draft giữ nguyên, cleanup an toàn.
- Với người bị hạn chế, hiển thị lý do và nơi xem quyền hiện hành. Chưa thêm request cấp quyền hay gửi tin tự động.

**Acceptance:** ghi OS/device/build/profile và PASS/FAIL/NOT_RUN theo case; export không thay bằng chứng native. Không đánh dấu done nếu chưa có thiết bị/nền tảng công bố hỗ trợ.

### G14.4 UX-04 — Cảnh báo owner tự hạn chế

- Chỉ cảnh báo tại Lưu khi đang sửa role owner và có quyền hiệu lực của chính mình chuyển true → false. Tính cả tắt media khiến ảnh/thoại/video bị khóa gián tiếp; không chỉ nhìn field người dùng vừa chạm.
- Một dialog gộp các quyền sắp mất: “Bạn sắp tắt … của chính mình. Bạn vẫn có thể vào Quyền trong nhóm để bật lại khi tính năng quản lý đang khả dụng.”
- Hai hành động “Quay lại chỉnh sửa” và “Lưu thay đổi”. Không cảnh báo từng toggle, khi chỉ bật quyền hoặc khi sửa role khác.
- Khi dialog đang mở mà snapshot/version/capability đổi, xác nhận cũ không được gửi mutation trên trạng thái không còn hợp lệ; đưa về refetch/conflict hiện có.
- Cảnh báo là hỗ trợ UX; backend vẫn cho owner tự hạn chế rồi khôi phục đúng contract.

**Acceptance:** cancel giữ draft và không PATCH; confirm chỉ một PATCH; kiểm tra media cha, no-op, conflict lúc dialog mở và flag off.

### G14.5 VID-01 — Tách quyền video độc lập

**Contract đích:**

- Thêm `send_videos` cho từng role; cột `members_can_send_videos`, `admins_can_send_videos`, `owner_can_send_videos`; capability `send_videos`.
- Video được xác minh cần media AND video; caption vẫn cần text. Photo/voice không là điều kiện bổ sung chỉ vì video có thumbnail hoặc audio track.
- UI thêm row con “Video”, media có ba mục con; cập nhật mẫu số/count theo tập quyền sáu mục, nhãn và helper. Giữ giới hạn MP4/MOV 25 MiB và xác minh tệp.
- Phân loại nhất quán backend/mobile/forward: video thật khác attachment chưa rõ; metadata mâu thuẫn vẫn lấy hợp quyền cần thiết hoặc từ chối. Không dùng type/MIME do client tự khai để bỏ kiểm tra file.
- Giữ legacy PATCH chỉ sửa member keys đã cho phép và không reset video; response additive, whitelist tường minh và một version toàn nhóm.

**Cờ mở quản lý video:**

- Thêm biến môi trường backend `GROUP_VIDEO_PERMISSION_MANAGEMENT_ENABLED`, mặc định `false`, cấu hình ở môi trường deploy/Compose cùng lớp với `GROUP_PERMISSIONS_MANAGEMENT_ENABLED` nhưng hoạt động độc lập.
- Cờ quản lý chung tiếp tục quyết định owner có thể PATCH policy hay không. Cờ video chỉ quyết định owner có thể PATCH field `send_videos` hay không; owner vẫn sửa năm quyền hiện hành khi cờ video tắt.
- GET vẫn trả policy/capability video sau schema finalize để client và server cùng áp dụng enforcement. Thêm `my_capabilities.manage_video_permissions = manage_permissions AND video_management_flag` để mobile hiển thị row Video ở trạng thái chỉ đọc khi chưa mở quản lý.
- PATCH chứa `send_videos` khi cờ video tắt bị từ chối nguyên request bằng `503 GROUP_VIDEO_PERMISSION_MANAGEMENT_DISABLED`; không áp dụng một phần các field khác trong cùng payload. PATCH không chứa video giữ contract hiện hành.
- Cả hai cờ chỉ điều khiển khả năng quản lý. Sau khi backend mới tiếp quản writer và schema ready, tắt bất kỳ cờ quản lý nào cũng không tắt enforcement của policy đã lưu. Vì là env var cấp server, cờ video không được gọi là rollout theo nhóm/canary.

**Migration phải bảo toàn hạn chế:**

- Không backfill tất cả video=true cho nhóm hiện hữu: việc đó có thể mở video ở role đang bị chặn bởi photo/voice.
- Khởi tạo video của từng role hiện hữu từ `photo AND voice`, giữ nguyên media. Khi đó trước/sau đều có hiệu lực `media AND photo AND voice` tại cutover. Với nhóm mới, `send_videos=true` cho cả owner/admin/member, tạo cùng policy trong transaction; quyền hiệu lực vẫn phụ thuộc media. Schema hoàn tất dùng BOOLEAN NOT NULL DEFAULT TRUE cho ba cột video, nhưng pha nâng cấp dữ liệu cũ phải phân biệt trạng thái chưa backfill trước khi áp dụng default cuối, không dùng default này để cấp true hàng loạt cho row cũ.
- Cột mới cần trạng thái migration phân biệt “chưa backfill” với giá trị đã được owner sửa; prepare/backfill/finalize chạy lại không ghi đè video/version đã có. Thiếu metadata/field phải fail closed.
- Rehearsal với policy cũ restrictive ở từng role, schema thêm dở, chạy lại và interruption. Chốt bảo toàn/version snapshot trong cửa sổ chặn writer.
- DB-02 phải chứng minh backup/restore trước apply live; migration/rollout cần checkpoint mới. Writer và client cũ phải được kiểm tra: client cũ có thể chặn video quá mức do công thức cũ, không được công bố tương thích đầy đủ nếu chưa thử.
- Sau khi cho video độc lập, backend rollback phải hiểu quyền video; backend dùng công thức cũ có thể bỏ qua video=false nên không là mục tiêu rollback hợp lệ.

**Acceptance:** photo bật/voice tắt/video bật vẫn gửi video khi media bật; photo/voice bật/video tắt phải chặn; media tắt chặn toàn bộ media; caption không lách text. Direct REST, forward, ba role, unknown/mixed payload, migration idempotent và old-client/new-backend có evidence.

### G14.6 UX-05 — Giải thích conflict bằng khác biệt cụ thể

- Khi global version đổi, so snapshot gốc với snapshot server mới cho tất cả role, đồng thời giữ draft của role đang sửa.
- Hiển thị vai trò + quyền + trước → hiện tại; phân biệt với “Thay đổi bạn chưa lưu”. Version có thể tăng vì role khác hoặc PATCH cùng giá trị: phải giải thích được trường hợp không có khác biệt boolean ở role đang xem.
- Giữ “Dùng cấu hình mới” để bỏ draft có chủ đích; không tự merge, tự retry hoặc ngầm gửi lại bằng version mới.
- Nếu muốn giữ lựa chọn, người dùng đọc khác biệt rồi chủ động chỉnh lại trên snapshot mới; không thêm cơ chế merge phức tạp trong bước đầu.

**Acceptance:** diff không lẫn role, không mất draft khi refetch, không tuyên bố ai thay đổi khi chưa có audit; các case 409, role khác đổi và version tăng không đổi boolean đều có test render.

### G14.7 AUD-01 và EXT-01 — Mở rộng sau nghiệm thu

**Audit trail:** hướng đề xuất là ghi người thao tác, nhóm, role, field trước/sau, thời gian server và version trong cùng transaction PATCH. Không lưu chat/token. Cần chốt ai được xem, retention, phân trang và xử lý no-op trước triển khai; log rollback không tồn tại, mỗi mutation commit không bị ghi lặp.

**System message:** quyết định sản phẩm riêng với audit. Nếu chọn, tối đa một thông báo gộp cho một lần Lưu có thay đổi thực; không tạo message/push cho mỗi switch. Hiện tại giữ contract không phát system message cho toggle.

**Custom role / xin quyền:** hoãn role tùy biến, quyền theo kênh/người, luồng yêu cầu quyền, chuyển chủ/promote/demote/add/remove thành viên, poll/GIF/tag và quyền quản trị mới. Khi mở lại phải có use case, quyền người duyệt, chống spam, scope API/DB/UI/test; không hiển thị nút hoặc toggle giả.

## M6. Ma trận kiểm chứng còn dùng

| Test ID | Phạm vi phải giữ / bổ sung | Task |
|---|---|---|
| T01 | Auth/token/login/logout/password | QA-02 |
| T02 | Recall own/other × private/group × role/membership | SEC-02 |
| T03 | Reaction add/update/remove, recalled, membership | SEC-02/SEC-03 |
| T04 | Leave/owner leave/room eviction/rejoin | SEC-03 |
| T05 | DB trống/rerun/interruption/concurrent runner | DB-01 |
| T06 | Upgrade/restore/SRID/null/orphan/invariant | DB-02 |
| T07 | Clean install/Docker/API release URL | ENV-01/CFG-01 |
| T08 | Chat/media/reply/forward/edit/seen/ordering/pin/mute | QA-02 |
| T09 | Friend/block/notes/notification theo flag | QA-02 |
| T10 | Ba role, quyền hiệu lực, missing/corrupt policy | GP-01/GP-02/VID-01 |
| T11 | PATCH whitelist/role/version/private/owner-only | GP-02 |
| T12 | Concurrent PATCH/send/edit/react/recall/leave | GP-02/SEC-03 |
| T13 | Render draft/errors/timeout/stale response/self-restriction/conflict diff | UX-01/UX-02/UX-04/UX-05 |
| T14 | Hai thiết bị, mất event/reconnect/foreground/account switch | GP-04/UX-03 |
| T15 | Picker/recording/upload revoke, video, retention/size/MIME | QA-02/GP-04/VID-01/UX-03 |
| T16 | Accessibility/font/safe area/native permissions | GP-03/UX-03 |
| T17 | Cờ quản lý chung/video off, fail closed, client compatibility, cutover/rollback | GP-05/VID-01 |
| T18 | Artifact/config/restore/operator/smoke | OPS-01 |

Lệnh đã đối chiếu trong package scripts:

- Backend: `npm test`; integration nhóm: `npm run test:group-permissions:integration`, chỉ sau guard và chuẩn bị MySQL test riêng.
- Mobile: `npm test`.
- Chưa có `npm run lint` hoặc script integration tổng; QA-01 bổ sung có chủ đích. Không dùng `npx` tải công cụ để giả định lệnh chưa có.
- Không chạy test reset vào DB đang dùng. Fixture/test credential phải giả; không gửi push hoặc tạo dữ liệu thử trên hệ thống thật khi chưa được giao.

## M7. Gate trước thay đổi live và phát hành

**Trạng thái khi đóng revision 16: NOT_EVALUATED/NOT_PASSED cho cả sáu gate.** Các điều kiện dưới đây được giữ làm ràng buộc nếu dự án mở lại cho phát hành. Việc đóng backlog học phần không miễn gate, không xác nhận production-ready và không ủy quyền deploy.

| Gate | Điều kiện còn phải chứng minh |
|---|---|
| GATE-SAFE | Biên bản triage SEC-01 có thể chỉ mở phần REP-01/công việc cô lập được ghi rõ; gate này chỉ PASS khi SEC-01 done hoặc incident đã containment và unknown còn lại được phân loại chấp nhận cho release, đồng thời SEC-02/SEC-03 test/review đủ |
| GATE-REPRO | REP-01/ENV-01/DB-01/DB-02 đạt; clean install và restore đúng schema kiểm chứng được |
| GATE-QUALITY | QA-01/QA-02/CFG-01/DOC-01 đạt cho phạm vi phát hành |
| GATE-GROUP | GP-01…GP-05 nghiệm thu đầy đủ; UX-01…UX-03 đóng; nhánh mới được đưa vào artifact phải đạt acceptance riêng |
| GATE-COMPAT | Trước kích hoạt contract khiến backend cũ không còn an toàn (VID-01): có ma trận phiên bản, bản backend phục hồi tương thích, rehearsal rollback/sửa tiến và cơ chế chặn writer cũ; chi tiết bên dưới |
| GATE-RELEASE | Gate trên, artifact/environment/operator/ngưỡng quan sát rõ và checkpoint phát hành |

Migration G13 đã hoàn tất không được dùng để đánh dấu các gate trên đạt. Với migration mới: backup/checksum → restore rehearsal → chặn/drain writer liên quan → migration/catch-up/finalize → backend hiểu schema mới → client tương thích → mở lại writer và smoke. Finalize lỗi thì không mở writer sai contract; không tự sửa owner hoặc cấp quyền.

Rollback giữ schema/policy và enforcement. Tắt management chỉ dừng sửa policy. Không đưa traffic về backend bỏ role/video restrictions hoặc tự restore đè các ghi mới. Nếu cần restore thật, đánh giá mất ghi mới và checkpoint riêng.

**GATE-COMPAT cho VID-01 và các thay đổi tương tự:** không gọi migration additive là có thể rollback an toàn chỉ vì cột cũ vẫn còn. Trước khi cho phép lưu cấu hình theo nghĩa mới, phải chuyển toàn bộ writer sang backend hiểu video và chặn phiên bản cũ quay lại. Mốc mất tương thích là khi quyền video độc lập có thể khác công thức cũ, ví dụ video=false trong khi media/photo/voice=true. Từ mốc đó, không rollback traffic sang backend cũ.

Triển khai theo giai đoạn: rehearsal cô lập → schema/backfill kiểm chứng → backend tương thích toàn bộ writer → GET/enforcement video hoạt động → client/smoke → đặt `GROUP_VIDEO_PERMISSION_MANAGEMENT_ENABLED=true` để mở chỉnh sửa video. Cờ này độc lập với `GROUP_PERMISSIONS_MANAGEMENT_ENABLED`, chỉ chặn PATCH field video và không bỏ enforcement của video đã lưu; vì là boolean cấp server nên không là canary theo nhóm/tài khoản. Cần kiểm thử trực tiếp video=false vẫn bị chặn khi cờ quản lý chung hoặc cờ video tắt, lưu sẵn artifact phục hồi hiểu schema mới và runbook sửa tiến. Thiếu artifact tương thích hoặc cách cô lập writer cũ thì giữ gate blocked; không dùng restore đè dữ liệu như một đường lui mặc định. Điều kiện này áp dụng cả thay đổi contract tương lai, không chỉ VID-01.

Trước release cần baseline/ngưỡng định lượng cho 5xx, send failure, permission denied, conflict, missing policy, worker retry theo flag và crash/recorder; ghi cửa sổ quan sát/người xử lý. Bypass, mất dữ liệu, missing policy hoặc credential lộ chặn mở rộng rollout. Không tự đặt ngưỡng thành cam kết production khi chưa đo.

## M9. Quyết định và bàn giao

### M9.1 Quyết định hiện hành

| Decision | Quyết định |
|---|---|
| D05/D06 | Management flag không tắt enforcement; missing/corrupt policy không fail open |
| D07 | Không tự sửa owner invariant, spatial data hoặc xóa dữ liệu thật |
| D08/D12 | Bảo toàn domain code; latest REST cùng version có thể cập nhật capability; guard generation/version |
| D11 | Chặn/drain writer không tương thích trước finalize/cutover |
| D14 | Draft Hủy/Lưu, một role mỗi PATCH; không tự retry mutation timeout |
| D16 | Video/unknown media hiện dùng quy tắc bảo thủ; VID-01 chỉ thay riêng video đã xác minh |
| D17 | Socket eviction giữ conversation lock trong transaction leave; event reason=message không khóa composer vì refresh nền |
| D18 | G13 thay owner/admin bypass nội dung bằng policy riêng; quyền quản lý độc lập; migration live đã hoàn tất tại M9.8 |
| D19 | Revision 6 bỏ kế hoạch xây dựng đã xong và snapshot pending mâu thuẫn; giữ backlog nghiệm thu và evidence gần nhất |
| D20 | Ưu tiên sửa hiển thị và kiểm thử UX trước mở rộng video; video migration phải giữ quyền hiệu lực hiện hữu |
| D21 | Audit/system message/custom role/xin quyền là phạm vi mở rộng chưa triển khai, không suy ra được ủy quyền live từ thảo luận |
| D22 | GP-03/GP-04/GP-05 blocked theo đầu vào còn thiếu; khảo sát/tổng hợp evidence sớm không thay điều kiện nghiệm thu |
| D23 | SEC-01 triage có thể mở công việc tracking/cô lập độc lập trước containment hoàn tất, nhưng không mở GATE-SAFE bằng kết luận thiếu bằng chứng |
| D24 | VID-01 nhóm mới mặc định video=true; nhóm cũ bảo toàn hiệu lực qua photo AND voice; GATE-COMPAT bắt buộc trước kích hoạt nghĩa quyền mới |
| D25 | Hai cờ quản lý đều là env var cấp server: cờ chung quản lý toàn policy, cờ VID-01 chỉ mở PATCH video; tắt cờ không bỏ enforcement và không tạo rollout theo nhóm |
| D26 | SEC-01/REP-01 dùng mức xử lý dự án học phần: đổi credential active, restart/smoke và bỏ tracking; chấp nhận không rewrite lịch sử hoặc điều tra người đọc remote |
| D27 | Theo yêu cầu người dùng, revision 16 đóng toàn bộ phần việc còn lại ở trạng thái `deferred`; chỉ task đã đủ bằng chứng giữ `done`. Sáu gate không PASS và không còn `next_task` |

### M9.2 Baseline và giới hạn lịch sử

- Baseline revision `62a3bb79cca2f2862566821b5353aca75b08c530`; worktree có thay đổi từ trước, không tự commit/reset/stash.
- BASE-01 đã ghi nhận môi trường và bảo vệ thay đổi; không còn task xây dựng.
- Audit cũ ghi tracking 24.644 file trong dependency, env và upload; đây không là số đo mới hoặc kết luận credential có hiệu lực bị lộ.
- Các snapshot test 37/9, 41/9, 45/12 được thay bằng bản tổng hợp G13 ở M9.7 cho nhánh đã kiểm thử; không suy ra coverage toàn dự án.
- `Plan.md` là untracked khi kiểm tra revision 6; phải kiểm tra nội dung trực tiếp, không dùng diff tracked rỗng làm bằng chứng.

### M9.5 Kích hoạt policy ban đầu — 2026-09-07

- Người dùng đã xác nhận backup và tiến hành tại Docker dự án. Đã dừng backend cho cutover, migration/finalize đạt, management bật, health HTTP 200.
- Backup: `E:/LTDT/migration-backups/proxy-permissions-cutover-20260907-185451.sql`.
- SHA-256: `8C7C97854294DAB41898B6E5F6CEC609FFDFD7FC2320977F769D05C659FF560D`.
- Evidence lịch sử: 3 group, invariant lỗi 0; count trước/sau users=9, conversations=10, conversation_members=29, messages=50, attachments=28, reactions=4. Owner GET đạt; PATCH cùng giá trị tăng version đúng contract.
- Bản ghi cũ báo restore rehearsal đạt. Vấn đề restore dump mới trước G13 được ghi riêng ở M9.8; không dùng kết quả cũ để đóng DB-02 hiện tại.

### M9.6 Chat riêng và video — 2026-09-08

- Đã triển khai `PrivateConversationInfoScreen`, `SharedMediaScreen`, upload MP4/MOV tối đa 26.214.400 byte (25 MiB; UI ghi 25 MB), API media phân trang và kiểm tra membership.
- Video upload kiểm tra MIME/container/video track, gửi/forward dùng URL cùng API host và kiểm tra tệp thực; từ chối URL không HTTP/HTTPS hoặc có userinfo. Gallery lọc recalled phía server và tin ẩn cục bộ phía mobile.
- Evidence tại thời điểm đó: backend 49/49, mobile 14/14; test biên media 4/4; export Android/iOS exit 0. Backend được restart để nạp API, không migration schema trong nhánh đó.
- Media query test dùng mock; thiết bị thật/picker/player chưa nghiệm thu. Upload hợp lệ chưa gửi giữ theo retention hiện có; không có bằng chứng dọn ảnh/video orphan.

### M9.7 G13 — implementation và kiểm thử cục bộ, 2026-09-09

- Môi trường evidence: Node 22.20.0; MySQL 8.0.45 cô lập, container `proxy-permissions-test`, DB `proxy_permissions_test`, bind `127.0.0.1:33479`; credential giả.
- PASS: backend focused permission unit 7/7; backend `npm test` 52/52; integration nhóm 9/9; mobile `npm test` 14/14; syntax migration/controller và whitespace scoped.
- Integration gồm owner tự tắt năm quyền, bị chặn send/edit/react rồi tự bật lại; admin enforcement; hai role PATCH cùng version chỉ một thành công; prepare lặp/partial schema giữ restrictive values/version; missing-policy, socket invalidation và rollback tạo group.
- Review độc lập đã xử lý finding correctness ở role draft/version/stale response và migration. Không coi review là bằng chứng thiết bị.
- Export dùng Expo CLI local trong mobile với `EXPO_NO_DOTENV=1`, Android/iOS exit 0; output local ignored:
  - `mobile/.expo/group-permissions-export/_expo/static/js/android/AppEntry-66a5e5e87b0cb8483466ec2e2e1b58a9.hbc`
  - `mobile/.expo/group-permissions-export/_expo/static/js/ios/AppEntry-b63741ef81719d766d23095a2ec24705.hbc`
- NOT_RUN: render dirty draft/timeout/stale response, native/development build/hai thiết bị và remote CI. Unit helper không thay coverage này.
- Đây là evidence local; trạng thái migration live mới hơn ở M9.8.

### M9.8 G13 — migration DB hiện hành và giới hạn restore, 2026-09-09

- Authorization: người dùng yêu cầu “áp dụng migration role lên DB đang dùng”; migration đã hoàn tất trên `lt_db/lt_web`, backend `lt_backend` tương thích đã restart.
- Backup gốc giữ ngoài repo: `E:/LTDT/migration-backups/lt_web_before_g13_role_20260909_002033.sql`.
- SHA-256: `5E6FB0FD91A145C5CB4B8754E55F287EC771F4A3B619626924E3FA69A5B609F9`.
- Dump lỗi geometry tại dòng 610: bytes SRID 4159, DDL cột SRID 4326. Restore thử chỉ thành công sau đổi DDL cột trên bản sao sang 4159, giữ bytes và dump gốc. Import exit 0, đủ 18 bảng; **chưa chứng minh khôi phục nguyên schema gốc**. Không sửa spatial schema/data live.
- Migration rehearsal trên bản restore thích nghi: thiếu 10 cột owner/admin được nhận diện; prepare lần đầu thêm cột, lần hai không đổi policy; finalize/status ready=true, missing/invalid_conversations/invalid_owners/invalid_policy đều 0.
- Dữ liệu đối chiếu trên restore: users=9, conversations=10, conversation_members=29, messages=52, attachments=29, reactions=4; không coi sáu count là chứng minh toàn DB không đổi.
- Messages 50 → 52 và attachments 28 → 29 là số đếm ở hai snapshot khác ngày (M9.5 ngày 07/09, M9.8 ngày 09/09), không phải cặp đo ngay trước/sau cùng một migration. Chưa truy nguyên các row chênh lệch; không khẳng định do hoạt động bình thường hoặc do migration khi thiếu bằng chứng.
- Live prepare hai lần, finalize/status cùng đạt ready=true; không backfill policy đã kích hoạt.
- Hash snapshot legacy năm quyền + version trước/sau cùng bằng `568cfa45d42d611ddf7bd032d5bd4cf47962bb405b05978e71890eef1c517398`; phép so sánh này chỉ chứng minh projection đó được bảo toàn.
- Health HTTP 200, container healthy; restore container đã dọn. Chưa có authenticated GET role smoke trong cửa sổ này; không dùng health thay kiểm tra API quyền.
- Việc tiếp theo thuộc DB-02/GP-05: khôi phục nguyên schema, authenticated role smoke và thiết bị; không chạy lại migration G13 theo kế hoạch cũ.

### M9.9 Revision 6 — dọn kế hoạch, 2026-09-09

- Phạm vi: chỉ `docs/Plan.md`; không sửa runtime, test suite, schema, Docker hoặc dữ liệu.
- Đối chiếu package scripts, helper quyền và hai màn group: xác nhận role selector đã có, GroupSettings còn dùng member legacy và hai package chưa có lint script.
- Thay các phase xây dựng đã thực hiện bằng contract G13 và backlog nghiệm thu; giữ checkpoint/bằng chứng backup/migration cùng vấn đề SRID. M9.5…M9.8 là evidence lịch sử đã tổng hợp, không phải kết quả chạy lại.
- Bổ sung UX-01…UX-05, VID-01, AUD-01, EXT-01 theo thảo luận; việc mới chưa được đánh dấu implemented/done.
- Kiểm tra tài liệu PASS: UTF-8/whitespace/code fences, 26 mã backlog không trùng, 18 nhóm test, 18 đường dẫn source tồn tại và checksum evidence được giữ. Giữ anchor M9 đang được APP_OVERVIEW liên kết. Không chạy lại test runtime cho thay đổi chỉ tài liệu.
- Bước tiếp theo: UX-01, đồng thời không bỏ qua DB-02 và các gate nền tảng còn mở.

### M9.10 Revision 7 — xử lý phản biện kế hoạch, 2026-09-09

- Phạm vi chỉ tài liệu. Điều chỉnh GP-03/GP-04/GP-05 sang blocked với điều kiện mở khóa; ghi ngoại lệ khảo sát cô lập DB-02 và phần implementation SEC-03 đã có.
- SEC-01 tách mốc triage/containment, không tạo fast-path kết luận an toàn giả; REP-01 chỉ tiếp tục phần độc lập có biên bản phạm vi. GATE-SAFE vẫn yêu cầu kết luận phù hợp.
- DB-02 thêm truy nguyên SRID và vòng dump/restore ngăn tái diễn. VID-01 chốt nhóm mới video=true, giữ công thức migration nhóm cũ; thêm GATE-COMPAT và rollout theo giai đoạn.
- Chú thích count khác thời điểm mà không đoán nguyên nhân; bổ sung sizing tương đối, không cam kết ngày hoặc cộng trùng task nghiệm thu.
- Không thay evidence lịch sử thành kết quả mới; chưa triển khai UX hoặc chạy migration/test runtime trong revision này. Next task vẫn UX-01; SEC-01 triage và DB-02 cần được theo dõi trong nhánh nền tảng.

### M9.11 Revision 8 — thuật ngữ cờ và GATE-SAFE, 2026-09-09

- Phạm vi chỉ tài liệu. Đối chiếu runtime xác nhận `GROUP_PERMISSIONS_MANAGEMENT_ENABLED` được đọc từ environment ở backend và cấu hình một lần cho service trong Compose; không phải cờ riêng từng nhóm.
- Chốt cờ VID-01 dự kiến `GROUP_VIDEO_PERMISSION_MANAGEMENT_ENABLED`, mặc định false, env var cấp server độc lập. Cờ chỉ mở PATCH video; GET/enforcement video vẫn hoạt động sau cutover. Đề xuất capability `manage_video_permissions` và lỗi 503 riêng để UI/API không nhầm hai cờ.
- GATE-SAFE ghi trực tiếp hai mốc: triage chỉ có thể mở công việc REP-01/cô lập được nêu phạm vi; release gate chỉ PASS sau khi SEC-01 đạt điều kiện hoàn thành/containment phù hợp và SEC-02/03 đạt.
- Chưa triển khai cờ, API field/error mới hoặc VID-01; tên và contract trên là kế hoạch phải được test/review trước migration/deploy. Next task vẫn UX-01.

### M9.12 UX-01 — hiển thị quyền theo vai trò, 2026-09-09

- Task/revision/worktree: UX-01 trên revision kế hoạch 9, Git HEAD `62a3bb79cca2f2862566821b5353aca75b08c530`; giữ nguyên dirty/untracked worktree có sẵn, không reset/stash/commit.
- Thay đổi: entry và header dùng “Quyền trong nhóm”; entry hiển thị “Theo vai trò”, quyền hiệu lực của caller từ `my_capabilities`, reaction theo đúng tập role trong `role_permissions`. Màn chi tiết liệt kê riêng Thành viên/Quản trị viên/Nhóm trưởng, đánh dấu “Bạn”, hiển thị số mục hiệu lực sau media cha và không dựng field thiếu thành false/0. Legacy chỉ mô tả Thành viên; người không có `manage_permissions=true` vẫn xem ở trạng thái chỉ đọc.
- File: `mobile/src/screens/GroupSettingsScreen.js`, `mobile/src/screens/GroupPermissionsScreen.js`, `mobile/src/components/SettingsRow.js`, `mobile/src/utils/groupPermissions.js`, `mobile/src/navigation/index.js`, `mobile/test/groupPermissions.test.mjs`; không đổi enforcement, mutation API, backend, schema hoặc dữ liệu.
- Expected: ba role và quyền caller được mô tả đúng; owner/admin react off, media off nhưng child true, missing policy và legacy không tạo câu khẳng định sai. Actual: helper thuần trả summary/count đúng các case trên; source UI dùng trực tiếp helper và nguồn dữ liệu G13 tương ứng.
- PASS local, Node 22.20.0: `cd mobile && npm test` đạt 16/16; `EXPO_NO_DOTENV=1 .\node_modules\.bin\expo.cmd export --platform android --output-dir .expo\ux-01-export` exit 0. Export nằm trong `.expo` local ignored.
- NOT_RUN: render interaction/snapshot của screen, stale/timeout/conflict, iOS export, development build, accessibility, screen reader và hai thiết bị; không dùng unit helper hoặc export để đánh dấu các mục này PASS. UX-01 giữ `in_review`; implementation đã đủ đầu vào để UX-02 chuyển `ready` và bổ sung render evidence, chưa bắt đầu UX-02 trong revision này.

### M9.13 UX-02 — render tests cho state quyền, 2026-09-09

- Task/revision/worktree: UX-02 trên revision kế hoạch 10, Git HEAD `62a3bb79cca2f2862566821b5353aca75b08c530`; giữ nguyên dirty/untracked worktree có sẵn, không reset/stash/commit.
- Thiết kế trước khi code: matrix S01–S06 và 14 nhóm ID COMPLEX C01–C14 được ghi tại `docs/checkpoints/UX-02-sol.md`; C04 có hai chiều race độc lập C04a/C04b nên nhóm COMPLEX sinh 15 bài test thực thi. Case SIMPLE và COMPLEX dùng file test tách biệt, sau đó được Sol review lại theo UI assertion, await và cleanup.
- File test: `mobile/test/groupPermissions.renderHarness.mjs`, `mobile/test/groupPermissions.render.test.mjs`, `mobile/test/groupPermissions.simple.render.test.mjs`, `mobile/test/groupSettings.renderHarness.mjs`, `mobile/test/groupSettings.render.test.mjs`; checkpoint tại `docs/checkpoints/UX-02-sol.md` và `docs/checkpoints/UX-02-luna.md`. Không sửa feature, backend, schema, database hoặc dependency.
- Expected/actual: UI render đúng ba role và “Bạn”; toggle/dirty/Hủy/Lưu, exact role/version payload và double tap; hai chiều REST/PATCH race; socket version mới/cũ/trùng; response cùng version đổi capability; 403/404/409/503, offline/timeout không retry; đổi account/conversation dọn state; owner vẫn thấy entry quản lý khi quyền nội dung tắt. Actual khớp expected ở toàn bộ case.
- PASS local, Node 22.20.0: COMPLEX đạt 15/15 bài test cho 14 nhóm ID (C04a/C04b là hai bài); SIMPLE đạt 6/6; `cd mobile && node --test test/groupPermissions.render.test.mjs test/groupPermissions.simple.render.test.mjs test/groupSettings.render.test.mjs` đạt tổng 21/21; `cd mobile && npm test` đạt 37/37, exit 0. Root đã chạy lại độc lập sau khi hai nhánh hoàn tất.
- Finding trong test đã xử lý: S01 ban đầu chưa gắn count với role selected; đã thêm policy khác nhau và assertion `accessibilityState.selected`/label/count. S06 ban đầu kỳ vọng 0/5 dù react còn true; sửa expectation thành 1/5. Không phát hiện bug feature.
- Giới hạn: render harness chạy component thật trên Node nhưng mock biên React Native/API/socket; development build, native module, screen reader, accessibility runtime và hai thiết bị là NOT_RUN, chuyển UX-03. UX-01 và UX-02 đủ acceptance hiện tại; UX-03 vẫn blocked theo đầu vào thiết bị.

### M9.14 Revision 11 — đối soát số case và điều kiện tiếp tục, 2026-09-09

- Xác nhận không có C15 bị thiếu: matrix có 14 nhóm ID COMPLEX C01–C14; C04 được chủ đích tách thành C04a và C04b để kiểm tra hai thứ tự hoàn tất, vì vậy runner báo 15 bài COMPLEX. Cùng sáu bài SIMPLE, suite UX-02 có tổng 21 bài.
- Làm rõ UX-03 chỉ mở khóa khi development build, hai thiết bị/nền tảng hỗ trợ, hai tài khoản owner/member và quyền/kịch bản native cần thiết sẵn sàng; chưa biến sự sẵn sàng chưa được xác minh thành PASS.
- Trong lúc UX-03 blocked, công việc kế tiếp là SEC-01 triage theo P0. DB-02 được phép tiếp tục phần điều tra/restore cô lập; thay đổi spatial live hoặc migration mới vẫn cần gate/checkpoint riêng.

### M9.15 Revision 12 — rút gọn điều phối, 2026-09-10

- Chuyển sang thực thi theo lô và đường găng, dùng một model cho task S/M; chỉ dùng nhiều vai/checkpoint riêng cho L/XL hoặc mức rủi ro yêu cầu review độc lập.
- Tạo `docs/checkpoints/progress.md` làm checkpoint chung tối thiểu. Plan chỉ cập nhật sau cả lô, trừ finding ảnh hưởng dependency/gate/live scope.
- Deferred UX-04, UX-05 và VID-01 đến khi nền tảng cùng UX-03/DB-02 tương ứng đạt; không chuẩn bị trước GP-03/GP-04/GP-05 hoặc GATE-COMPAT khi còn blocked.
- Giữ dependency đã xác minh: REP-01 có thể theo sau SEC-01 triage, nhưng CFG-01 và DOC-01 không thể đóng trong lô A trước ENV-01/QA-01/DB-02. QA-01 là đầu vào của DB-01; DB-02 chỉ đóng nghiệm thu upgrade sau DB-01 dù phần điều tra cô lập có thể chạy sớm.
- Next task vẫn SEC-01. Revision này chỉ đổi tài liệu/quy trình; không chạy security scan, sửa tracking, đổi credential, schema, DB hoặc runtime.

### M9.16 SEC-01 triage — active credential incident, 2026-09-10

- Read-only triage xác nhận HEAD trùng `origin/main`; remote ref chứa hai file `.env`, 24.644 entry `node_modules` và 13 ảnh upload. Visibility/quyền đọc thực tế của repository remote chưa xác minh.
- Không ghi giá trị vào evidence. Các tên cần containment là `DB_PASSWORD`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` và `JWT_SECRET`: giá trị cấu hình tương ứng khớp metadata container đang chạy; backend và DB đều healthy. `JWT_SECRET` có hình thức placeholder nhưng đang được runtime dùng để ký/xác minh token nên được phân loại active, không phải placeholder an toàn.
- Tác động: credential DB có thể cấp quyền ứng dụng hoặc quản trị DB nếu có đường truy cập phù hợp; DB hiện bind localhost trên host. Backend bind host mọi interface, nên lộ JWT signing secret có thể ảnh hưởng xác thực/session. Không suy rộng thành bằng chứng đã bị khai thác.
- GATE-SAFE chưa đạt. SEC-01 chuyển blocked chờ người phụ trách quyết định rotation, thứ tự restart, invalidation session/token và đánh giá người có quyền đọc remote. Chưa mở REP-01; bỏ tracking hoặc rewrite history không thay cho rotation.
- Lệnh/case và kết quả đã che giá trị được ghi tại `docs/checkpoints/progress.md`. Không rotate, sửa file cấu hình, restart service, xóa history, commit hoặc push trong triage này.

### M9.17 UX-03 — dừng ở mức hiện có, 2026-09-10

- Phạm vi đã xử lý: thay transition riêng cho `GroupSettings`/`GroupPermissions`; giữ snapshot nhóm qua điều hướng để tránh loader thay toàn màn hình; khởi tạo policy draft đồng bộ; khóa mutation đến khi REST xác minh; phủ nền theme ở root/loading/error để giảm frame trắng trong dark mode.
- Phản hồi thiết bị trước bản sửa cuối xác nhận `none` gây chớp và `fade` vẫn chuyển quá nhanh/lộ frame trắng. Bản cuối dùng Android `fade_from_bottom`, iOS `fade` 500 ms và root background theo theme; chưa có xác nhận thiết bị sau thay đổi này.
- PASS local: `cd mobile && npm test` đạt 38/38; render case mới xác nhận UI giữ ổn định khi GET còn pending; Babel compile và `git diff --check` đạt.
- NOT_RUN: xác nhận bản cuối trên thiết bị, light/dark đầy đủ, màn nhỏ/font lớn/safe area, screen reader, mic/camera/gallery/recorder/picker/player và hai tài khoản trên hai thiết bị.
- Theo yêu cầu người dùng, UX-03 chuyển `deferred` và dừng ở bằng chứng hiện có; không đánh dấu `done`, không mở GATE-GROUP. Chi tiết lệnh và giới hạn tại `docs/checkpoints/progress.md`.

### M9.18 SEC-01 + REP-01 — remediation rút gọn, 2026-09-10

- Authorization/scope: người dùng hạ mức cho dự án học phần và yêu cầu gộp đổi credential với dọn tracking; không yêu cầu log forensics, đánh giá người đọc remote hoặc rewrite history.
- Đã tạo giá trị random mới mà không in ra log. `DB_PASSWORD` và `MYSQL_PASSWORD` dùng cùng credential vì cùng đại diện user ứng dụng; `MYSQL_ROOT_PASSWORD` và `JWT_SECRET` độc lập. Password account MySQL trên volume được đổi trước restart; Compose lấy password từ `backend/.env` local thay vì chứa literal tracked.
- `docker compose down` rồi `up -d` giữ volume; DB/backend healthy và HTTP health đạt. Token JWT cũ trả 401; login mới và authenticated `/me` đạt. User smoke tạm được xóa sau kiểm tra.
- REP-01 bỏ tracking nhưng giữ local: `backend/.env`, `mobile/.env`, 24.644 entry `mobile/node_modules` và 13 entry `backend/uploads`. Root `.gitignore` bỏ qua `.env`, `node_modules/`, `uploads/`; kiểm tra local sau thao tác vẫn có hai env, 35.077 file dependency và 30 file upload.
- Commit cleanup `c6e60967`; không rewrite lịch sử hoặc force-push. Giá trị cũ vẫn tồn tại trong commit cũ nhưng không còn active theo smoke hiện tại. SEC-01 và REP-01 `done` theo mức đã hạ; GATE-SAFE còn cần SEC-02/SEC-03.

### M9.19 Revision 16 — đóng backlog theo phạm vi học phần, 2026-09-10

- Authorization/scope: người dùng yêu cầu đóng tất cả plan còn lại trong chương trình rút gọn. Đây là quyết định quản trị phạm vi, không phải yêu cầu hoàn tất giả các acceptance chưa chạy.
- Giữ `done` cho SEC-01, REP-01, UX-01 và UX-02. Toàn bộ task còn lại trong M4.1/M4.2 chuyển `deferred`; `next_task: null`, không còn lô đang thực thi.
- Sáu gate M7 giữ `NOT_EVALUATED/NOT_PASSED`. Không có tuyên bố production-ready, release-ready, deploy hoặc migration authorization.
- Rủi ro/evidence chưa hoàn tất vẫn được giữ nguyên, gồm restore SRID/DB-02, security race/review SEC-02/SEC-03, QA/CI, UX-03 native/accessibility/hai thiết bị và vận hành phát hành.
- Thay đổi chỉ ở tài liệu kế hoạch/checkpoint. Không sửa code, test, schema, DB, Docker, credential hoặc runtime; không chạy test runtime cho revision này.
- Nếu mở lại, cần yêu cầu phạm vi rõ ràng và đối chiếu lại dependency/acceptance với workspace hiện hành trước khi chọn task.
