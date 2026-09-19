# LicenseVault

LicenseVault gồm React/Vite dashboard và Fastify API dùng Prisma + PostgreSQL.

## Khởi động local

1. Sao chép `.env.example` thành `.env`, thay ba secret bằng giá trị ngẫu nhiên dài ít nhất 32 ký tự.
2. Chạy database: `docker compose up -d postgres`.
3. Tạo Prisma client và schema: `pnpm db:generate && pnpm db:migrate --name init`.
4. Nạp dữ liệu thử: `pnpm db:seed` (admin: `admin@licensevault.local`, mật khẩu: `ChangeMe123!` — phải đổi ngay).
5. Chạy API: `pnpm api:dev`; chạy dashboard: `pnpm dev`.

## Luồng kích hoạt

```
Client -> POST /api/v1/activate (key, UID, timestamp, nonce, HMAC)
API -> kiểm tra chữ ký + nonce + rate limit
API -> transaction: kiểm tra key, UID hash unique, claim slot nguyên tử
API -> Ed25519 JWT (tối đa 7 ngày) -> Client
```

Mọi endpoint `/api/v1/*` yêu cầu ba header: `X-Timestamp` (epoch milliseconds), `X-Nonce` và `X-Signature`. Chữ ký là hex HMAC-SHA256 của chuỗi `timestamp.nonce.JSON.stringify(body)` với `APP_SECRET`.

## Quy tắc iPhone UDID

API không lưu UDID thô. Nó chuẩn hoá UDID, tạo `HMAC-SHA256(UDID, DEVICE_UID_PEPPER)`, và áp dụng unique constraint cho `devices.uid_hash`. Vì vậy một UDID chỉ có thể active trên một license key tại một thời điểm, kể cả qua nhiều admin session hay request đồng thời.

### Bắt buộc lấy UDID trước khi nhập key

Flow iPhone được server ép theo thứ tự:

1. App gọi `POST /api/public/udid-enrollments/start` và nhận `enrollment_token`, `profile_download_url`, `status_url`.
2. App bắt buộc mở `profile_download_url` trong Safari. Người dùng cài Profile Service của LicenseVault.
3. iPhone POST UDID cùng challenge về callback của LicenseVault; app polling `status_url` cho đến khi nhận `udid_verified: true`.
4. Chỉ sau đó app mới hiện ô nhập key. `POST /api/v1/activate` bắt buộc truyền chính `enrollment_token`; nếu thiếu, sai UDID, hoặc quá 15 phút, server trả `UDID_VERIFICATION_REQUIRED` và không cấp key.

Profile Service phải chạy trên `PUBLIC_BASE_URL` HTTPS. Để production đáng tin cậy, ký `.mobileconfig` bằng certificate của tổ chức; profile chưa ký sẽ bị iOS cảnh báo trước khi cài. `udid.tech` có flow tương tự nhưng LicenseVault giờ tự nhận callback, không phụ thuộc dữ liệu từ dịch vụ bên thứ ba.

Với iPhone không qua MDM/supervised, app thường **không đọc được UDID phần cứng**. Khi đó app phải dùng App Attest + installation ID lưu trong Keychain. UDID do MDM cấp vẫn dùng được với cùng cơ chế HMAC ở trên.

## Đồng bộ web → iPhone

Mỗi key có `revision`. Khi admin cập nhật trạng thái, hạn hoặc giới hạn thiết bị qua `PATCH /api/admin/keys/:id`, server tăng revision, tạo `device_commands` cho mọi máy active, rồi gửi silent APNs nếu thiết bị đã đăng ký token. App iOS phải:

1. Gửi APNs token tới `POST /api/v1/push-token` sau khi activate.
2. Gọi `POST /api/v1/sync` khi app mở, quay lại foreground, mạng khôi phục, nhận silent push, và theo `poll_after_seconds`.
3. Thực thi command, sau đó gọi `POST /api/v1/commands/ack`.
4. Chặn tính năng bản quyền ngay khi `/sync` trả `KEY_REVOKED`, `KEY_SUSPENDED` hoặc revision mới có trạng thái không cho phép.

APNs là tín hiệu đánh thức nhanh, không phải bảo đảm giao hàng: iOS có thể trì hoãn silent push và thiết bị có thể offline. Vì vậy token license có TTL mặc định 15 phút (`LICENSE_TOKEN_TTL_SECONDS=900`) và sync định kỳ là lớp bảo đảm cuối cùng. Muốn update nhanh, cấu hình `APNS_KEY_ID`, `APNS_TEAM_ID`, `APNS_BUNDLE_ID`, `APNS_PRIVATE_KEY`.

## Production checklist

- Cung cấp `LICENSE_ED25519_PRIVATE_JWK`; API chỉ tạo khoá tạm khi development.
- Dùng HTTPS qua reverse proxy, CORS origin chính xác và managed PostgreSQL có backup/PITR.
- Giữ secrets trong secret manager, không commit `.env`.
- Thêm worker cảnh báo IP/quốc gia và thiết lập SMTP/webhook trước khi mở cho khách hàng.
