# Friend discovery — trace triển khai

## Mục tiêu

Cho phép tìm user bằng dữ liệu public, xem gợi ý từ bạn chung/nhóm chung và chủ động khám phá user gần đây. Không thay đổi luồng kết bạn hiện có, không hiển thị dữ liệu riêng tư và không theo dõi vị trí nền.

## Mobile

- `mobile/src/screens/FriendsScreen.js`: khi chưa nhập search hiển thị hai vùng `Gợi ý cho bạn` và `Ở gần bạn`; giữ nguyên search, request và action nhắn tin.
- `mobile/src/components/NearbyDiscoveryCard.js`: giải thích lợi ích, trạng thái permission/service/error/loading, CTA bật/làm mới/tắt và mở Settings.
- `mobile/src/api/social.api.js`: gọi status, start/refresh/search/stop bằng token hiện tại.
- `mobile/app.json`: `expo-location` chỉ xin foreground permission với mô tả tiếng Việt; không bật background location.

## Backend

- Route: `backend/src/routers/friendship.router.js`.
- Controller: `backend/src/controllers/friendDiscovery.controller.js`.
- Service: `backend/src/services/friendDiscovery.service.js`.
- Search user dùng public attributes, exact match cho email/phone khi phù hợp, lọc block hai chiều và trả relationship.
- Gợi ý chấm điểm theo nhóm chung/bạn chung; nearby dùng bounding box + `ST_Distance_Sphere`, trả distance band thay vì tọa độ/khoảng cách chính xác.
- Feature flag production: `NEARBY_DISCOVERY_ENABLED=true`; mặc định production tắt, development bật nếu không cấu hình.
- Rate limit độc lập theo user và IP cho endpoint ghi vị trí/tìm nearby.

## Database

- Model: `backend/src/models/userNearbyDiscovery.model.js`.
- Bảng: `user_nearby_discovery`, một dòng/user, `POINT SRID 4326`, accuracy, thời điểm cập nhật và hết hạn.
- Migration: `backend/scripts/migrate-nearby-discovery.js`; chạy `npm run nearby:migrate:up`, kiểm tra `nearby:migrate:status`.
- Dữ liệu vị trí không được dùng làm profile, không có lịch sử; phiên hết hạn được xóa lazy hoặc bằng job vận hành.

## Bảo mật và quyền riêng tư

- Chỉ user đã đăng nhập mới gọi được API.
- Không trả email, phone, password, role, token hay tọa độ chính xác.
- Không tạo dữ liệu giả; không tự bật permission. User phải nhấn CTA, có thể tắt phiên bất kỳ lúc nào.
- Backend vẫn là nơi quyết định blocked/relationship và quyền truy cập cuối cùng.

## Kiểm thử

- Backend: validation tọa độ/accuracy, lọc block, relationship, feature flag, rate limit, migration idempotent.
- Mobile: permission denied/permanently denied, location service tắt, timeout/offline, retry, refresh, unmount và dark mode.
- Smoke: `/social/suggestions/recent`, `/social/nearby/status`, search user không rò email/phone; DB không có row nếu chưa bật phiên.
