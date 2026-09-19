# ROLE
Bạn là Senior Full-stack Engineer + Product Designer. Hãy xây dựng một
**License Key Management Server** hoàn chỉnh, production-ready, kèm Admin Dashboard
có UI/UX cao cấp (sạch, nhanh, dễ dùng, có dark mode).

# CORE BUSINESS LOGIC
- Mỗi license key có giới hạn số thiết bị (`max_devices`, mặc định 1, có thể N).
- Client gửi **Device UID** (hardware fingerprint). Server ghi nhận UID gắn với key.
- Nếu UID đã tồn tại trong key → cho phép (không tính thêm slot).
- Nếu UID mới và slot còn trống → tạo activation mới.
- Nếu UID mới và đã hết slot → trả lỗi `DEVICE_LIMIT_REACHED` + danh sách thiết bị đang dùng.
- Admin có thể "kick" (thu hồi) 1 thiết bị để giải phóng slot.
- Key có trạng thái: `active | suspended | revoked | expired`.

# TECH STACK
- Backend: Node.js 20 + Fastify + TypeScript + Prisma + PostgreSQL (fallback SQLite cho dev).
- Frontend: React 18 + Vite + TypeScript + TailwindCSS + shadcn/ui + TanStack Query + TanStack Table.
- Auth admin: JWT + refresh token, bcrypt/argon2 cho password, hỗ trợ 2FA (TOTP) optional.
- Docker Compose (api + web + postgres) + file `.env.example` + seed script.

# DATABASE SCHEMA
```
users          (id, email, password_hash, role[owner|admin|viewer], totp_secret, created_at)
products       (id, name, slug, current_version, note)
license_keys   (id, key_code UNIQUE, product_id, owner_name, owner_email,
                max_devices, status, plan, expires_at NULL=lifetime,
                note, created_by, created_at, updated_at)
devices        (id, key_id FK, device_uid, uid_hash, device_name, os, os_version,
                app_version, cpu, ip_first, ip_last, country,
                status[active|revoked], activated_at, last_seen_at,
                UNIQUE(key_id, device_uid))
audit_logs     (id, actor, action, key_id, device_uid, ip, user_agent, payload JSON, created_at)
api_tokens     (id, name, token_hash, scopes, last_used_at)  -- cho tích hợp ngoài
```
Index: `license_keys.key_code`, `devices.device_uid`, `devices.last_seen_at`, `audit_logs.created_at`.

# PUBLIC API (dành cho client app)
Tất cả request phải có header: `X-Timestamp`, `X-Nonce`, `X-Signature`
(HMAC-SHA256 của body + timestamp bằng `APP_SECRET`); reject nếu lệch > 5 phút
hoặc nonce đã dùng (chống replay).

1. `POST /api/v1/activate`
   body: `{ key, device_uid, device_name, os, app_version }`
   → 200: `{ ok, license_token, expires_at, devices_used, max_devices }`
   → lỗi: `KEY_NOT_FOUND | KEY_REVOKED | KEY_SUSPENDED | KEY_EXPIRED | DEVICE_LIMIT_REACHED | DEVICE_REVOKED`
   **Bắt buộc dùng DB transaction + row lock (`SELECT ... FOR UPDATE`)** khi đếm slot
   để chống race condition khi nhiều máy activate cùng lúc.

2. `POST /api/v1/verify` → xác thực key+UID, cập nhật `last_seen_at`, `ip_last`.
3. `POST /api/v1/heartbeat` → ping định kỳ (mặc định 15 phút).
4. `POST /api/v1/deactivate` → client tự nhả slot.

**license_token**: JWT ký bằng **Ed25519** (client chỉ giữ public key để verify offline),
payload `{ key, uid_hash, exp, max_devices, features[] }`, TTL 7 ngày
→ hỗ trợ offline grace period.

Rate limit: 10 req/phút/IP cho `activate`, 60 req/phút cho `verify`.

# ADMIN API
`/api/admin/*` (JWT required): CRUD keys, bulk generate, đổi `max_devices`,
suspend/revoke/restore key, list & revoke device, search/filter/paginate,
export CSV, stats, audit log.

# KEY FORMAT
`PREFIX-XXXX-XXXX-XXXX-XXXX` (Crockford Base32, bỏ ký tự dễ nhầm I/L/O/U)
+ 4 ký tự checksum cuối để validate offline trước khi gọi API.

# ADMIN DASHBOARD — YÊU CẦU UI/UX (rất quan trọng)
Phong cách: gọn gàng, nhiều khoảng trắng, bảng là trung tâm, không animation rườm rà.
Font `Inter`, radius 10px, màu chủ đạo indigo, semantic màu cho trạng thái.
Hỗ trợ **dark/light theme** + responsive (mobile dùng card thay table).

1. **Sidebar**: Dashboard / Keys / Devices / Products / Audit Log / Settings.
2. **Dashboard**: 4 stat card (Total keys, Active keys, Devices online 24h,
   Keys sắp hết hạn 7 ngày) + line chart activation 30 ngày + bảng "Hoạt động mới nhất".
3. **Keys page**:
   - Search instant (debounce 300ms) theo key/email/tên; filter theo status, product, plan.
   - Table cột: Key (mono + nút copy), Owner, Plan, `Devices 2/5` dạng progress bar
     (đỏ khi full), Status badge, Expires (hiển thị "còn 12 ngày"), Last seen, Actions.
   - Row click → **Slide-over panel** bên phải: thông tin key + tab "Thiết bị" liệt kê
     UID (rút gọn `A1B2…9F0` + copy full), OS, IP, last seen (relative time),
     nút **Kick device** (confirm dialog). Tab "Lịch sử" = audit log của key đó.
   - Bulk select: suspend / revoke / gia hạn / export CSV.
   - Nút **+ Create Key** → modal: product, số lượng (1–1000), max_devices, plan,
     thời hạn (preset 1 tháng / 1 năm / lifetime), prefix, ghi chú.
     Sau khi tạo → hiện danh sách key mới + **Copy all** + **Download .txt/.csv**.
4. **Micro-UX bắt buộc**: skeleton loading (không dùng spinner toàn trang),
   optimistic update, toast thông báo có nút Undo cho hành động revoke,
   empty state có hướng dẫn, error state có nút Retry,
   keyboard shortcut (`⌘K` command palette tìm key, `N` tạo key mới, `Esc` đóng panel),
   URL sync filter/pagination (F5 không mất trạng thái),
   mọi nút destructive đều phải confirm bằng cách gõ lại key code.

# SECURITY CHECKLIST
- Hash `device_uid` (HMAC + pepper) khi lưu, chỉ hiển thị rút gọn cho admin.
- Không trả về thông tin thiết bị khác khi verify.
- Helmet, CORS whitelist, Zod validate toàn bộ input, param hoá query (chống SQLi).
- Audit log mọi hành động admin (immutable, append-only).
- Cảnh báo bất thường: 1 key activate từ > X quốc gia / > Y IP trong 24h → flag.

# CLIENT SAMPLE (bonus)
Viết thêm module mẫu lấy Device UID ổn định, hash SHA-256:
- Windows: `MachineGuid` (registry) + Disk serial + CPU ID.
- macOS: `IOPlatformUUID`.
- Linux: `/etc/machine-id`.
Kèm ví dụ tích hợp bằng Node.js và Python (activate → lưu token → verify offline).

# DELIVERABLES
1. Source code đầy đủ, cấu trúc rõ ràng (`/api`, `/web`, `/client-sdk`).
2. `README.md`: cài đặt, biến môi trường, chạy Docker, flow hoạt động (có sequence diagram).
3. Prisma migration + seed (1 admin, 1 product, 5 key mẫu).
4. Test: unit cho logic slot/checksum + integration cho `activate` (gồm case race condition).
5. Postman/Insomnia collection.

# RULES
- TypeScript strict, không dùng `any`.
- Tách business logic ra `services/`, controller chỉ điều phối.
- Mọi error trả về format `{ ok: false, code, message, details? }`.
- Code có comment tiếng Việt ở các đoạn logic quan trọng.
- Làm từng phần và báo tiến độ: schema → API → auth → dashboard → SDK → docs.