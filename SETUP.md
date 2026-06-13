# Hướng dẫn Setup & Deploy — Portal Nội bộ

Tài liệu này hướng dẫn toàn bộ quy trình từ source code đến production, bao gồm cả thiết lập cron job kiểm tra link tự động.

---

## Mục lục

1. [Yêu cầu ban đầu](#1-yêu-cầu-ban-đầu)
2. [Chuẩn bị source code](#2-chuẩn-bị-source-code)
3. [Tạo Supabase project](#3-tạo-supabase-project)
4. [Cấu hình biến môi trường](#4-cấu-hình-biến-môi-trường)
5. [Chạy migration database](#5-chạy-migration-database)
6. [Tạo tài khoản admin](#6-tạo-tài-khoản-admin)
7. [Deploy Edge Function](#7-deploy-edge-function)
8. [Thiết lập Cron Job tự động](#8-thiết-lập-cron-job-tự-động)
9. [Chạy local để kiểm tra](#9-chạy-local-để-kiểm-tra)
10. [Đẩy code lên GitHub](#10-đẩy-code-lên-github)
11. [Deploy lên Cloudflare Pages](#11-deploy-lên-cloudflare-pages)
12. [Kiểm tra sau deploy](#12-kiểm-tra-sau-deploy)
13. [Cập nhật web (khi có chỉnh sửa code)](#13-cập-nhật-web-khi-có-chỉnh-sửa-code)
14. [Quản lý & bảo trì](#14-quản-lý--bảo-trì)

---

## 1. Yêu cầu ban đầu

| Công cụ | Phiên bản tối thiểu | Ghi chú |
|---------|-------------------|---------|
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Đi kèm Node.js |
| Supabase CLI | latest | Cài ở bước 7 |
| Git | any | Để clone repo |
| Tài khoản Supabase | Free plan | [supabase.com](https://supabase.com) |
| Tài khoản Cloudflare | Free plan | [cloudflare.com](https://cloudflare.com) |

---

## 2. Chuẩn bị source code

```bash
# Vào thư mục project
cd "Telecom Portal"

# Cài dependencies
npm install
```

---

## 3. Tạo Supabase project

1. Vào [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Điền:
   - **Name**: `telecom-portal` (hoặc tuỳ ý)
   - **Database Password**: đặt mật khẩu mạnh, lưu lại để dùng sau
   - **Region**: `Southeast Asia (Singapore)` — gần nhất với Việt Nam
3. Chờ project khởi tạo (~2 phút)

Sau khi project sẵn sàng, vào **Project Settings → API** để lấy:
- **Project URL**: `https://XXXXXXXXXXXX.supabase.co`
- **Project Ref**: `XXXXXXXXXXXX` (phần trước `.supabase.co`)
- **anon key**: dùng cho frontend (public, an toàn)
- **service_role key**: dùng cho cron job (**bí mật — không đặt vào frontend**)

---

## 4. Cấu hình biến môi trường

```bash
# Tạo file .env từ template
cp .env.example .env
```

Mở `.env` và điền thông tin từ bước 3:

```env
VITE_SUPABASE_URL=https://XXXXXXXXXXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...your-anon-key...
VITE_APP_NAME=Portal Phòng <Tên phòng của bạn>
```

> Đây là tên hiển thị trên header, trang đăng nhập và tab trình duyệt — thay bằng tên phòng ban thực tế.  
> `.env` đã có trong `.gitignore` — không commit file này.

---

## 5. Chạy migration database

Vào **Supabase Dashboard → SQL Editor** và chạy **lần lượt** từng file:

### 5a. Schema chính

Mở file `supabase/migrations/001_initial_schema.sql`, copy toàn bộ nội dung, dán vào SQL Editor → **Run**.

File này tạo toàn bộ schema bao gồm:
- Tất cả bảng: `profiles`, `categories`, `tags`, `links`, `link_tags`, `link_health_checks`, `announcements`, `system_settings`
- Indexes, Row Level Security policies
- Storage bucket `link-icons` (public, giới hạn 1 MB/file)
- Functions: `is_admin()`, `increment_link_click()`, `cleanup_health_checks()`, `renumber_categories()`

### 5b. Seed dữ liệu mặc định

Mở file `supabase/seed.sql`, chạy tương tự.

Tạo sẵn:
- 8 danh mục kỹ thuật (Vận hành, KPI, Giám sát, Phần mềm, Tài liệu, Tra cứu, Quy trình, Hỗ trợ)
- 10 tags kỹ thuật (BTS, Core, Truyền dẫn, IP, OSS, KPI, Report, NMS, Alarm, BSS)
- System settings mặc định
- Thông báo chào mừng

---

## 6. Tạo tài khoản admin

### 6a. Tạo user trong Supabase Auth

Vào **Supabase Dashboard → Authentication → Users** → **Add user**:
- **Email**: địa chỉ email admin
- **Password**: mật khẩu mạnh
- Bỏ tick "Auto Confirm User" nếu không cần xác nhận email

### 6b. Gán quyền admin

> Trigger `on_auth_user_created` tự động tạo profile với `role='admin'` khi có user mới. Nếu trigger chạy đúng, bước này không cần thiết. Kiểm tra bằng cách xem bảng `profiles` — nếu đã có row với `id` của user vừa tạo thì bỏ qua.

Nếu cần tạo thủ công, vào **SQL Editor** và chạy:

```sql
insert into profiles (id, full_name, role, is_active)
values (
  'UUID-CUA-USER',   -- Lấy từ Authentication > Users > User ID
  'Tên Admin',
  'admin',
  true
)
on conflict (id) do update
  set role = 'admin', is_active = true;
```

### 6c. Thêm admin thứ hai (khi cần)

Lặp lại bước 6a và 6b cho từng người. Không giới hạn số lượng admin.

---

## 7. Deploy Edge Function

Edge Function `check-all-links` được gọi bởi cron job để kiểm tra toàn bộ link mỗi 3 tiếng.

### 7a. Cài Supabase CLI

```bash
npm install -g supabase
```

### 7b. Login và link project

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF
```

Thay `YOUR_PROJECT_REF` bằng Project Ref lấy ở bước 3.

### 7c. Deploy function

```bash
supabase functions deploy check-all-links
```

> Function nằm tại `supabase/functions/check-all-links/index.ts`.  
> Nó fetch tất cả link active và không phải link nội bộ (`is_internal = false`), check theo batch 10, ghi kết quả vào `link_health_checks`, tự xóa records cũ hơn 30 ngày.

---

## 8. Thiết lập Cron Job tự động

Cron job gọi Edge Function mỗi 3 tiếng để tự động cập nhật trạng thái online/offline.

### 8a. Bật extensions

Vào **Supabase Dashboard → SQL Editor**, chạy:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;
```

> `pg_cron` và `pg_net` có sẵn trên Supabase Free plan, không cần trả phí.

### 8b. Tạo cron job kiểm tra link

> Nếu đã từng tạo job này trước đó, xóa cũ trước:
> `select cron.unschedule('check-all-links-cron');`

```sql
select cron.schedule(
  'check-all-links-cron',
  '0 */3 * * *',
  format(
    $$
    select net.http_post(
      url     := %L,
      headers := %L::jsonb,
      body    := '{}'::jsonb
    );
    $$,
    'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-all-links',
    jsonb_build_object(
      'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
      'Content-Type',  'application/json'
    )::text
  )
);
```

**Thay thế trước khi chạy:**
- `YOUR_PROJECT_REF` → Project Ref từ bước 3
- `YOUR_SERVICE_ROLE_KEY` → service_role key từ bước 3

### 8c. Tạo cron job dọn log dự phòng

Phòng trường hợp Edge Function bị lỗi, tạo thêm cron job dọn log trực tiếp trong DB:

```sql
select cron.schedule(
  'cleanup-health-logs',
  '0 3 * * *',
  $$
  delete from link_health_checks
  where checked_at < now() - interval '30 days';
  $$
);
```

Chạy lúc 3:00 sáng mỗi ngày. Giữ log 30 ngày gần nhất, khớp với hằng số `RETENTION_DAYS = 30` trong Edge Function.

### 8d. Kiểm tra cron đang chạy

```sql
-- Xem tất cả jobs đang được đăng ký
select jobname, schedule, active from cron.job;

-- Xem log 10 lần chạy gần nhất (chờ 30 phút sau khi tạo)
select jobid, status, start_time, end_time, return_message
from cron.job_run_details
order by start_time desc
limit 10;
```

Nếu `status = 'succeeded'` và `return_message` có dạng `{"online":X,"offline":Y,"total":Z,"deleted_old_records":N}` → cron đang hoạt động tốt.

### Lịch cron tham khảo

| Lịch | Cú pháp |
|------|---------|
| Mỗi 30 phút | `*/30 * * * *` |
| Mỗi giờ | `0 * * * *` |
| Mỗi 2 giờ | `0 */2 * * *` |
| **Mỗi 3 tiếng** ← đang dùng | **`0 */3 * * *`** |
| Mỗi ngày lúc 2:00 | `0 2 * * *` |

---

## 9. Chạy local để kiểm tra

```bash
npm run dev
```

Mở [http://localhost:5173](http://localhost:5173):
- Trang chủ công khai: `/`
- Trang đăng nhập admin: `/login`
- Bảng điều khiển admin: `/admin` (sau khi đăng nhập)

---

## 10. Đẩy code lên GitHub

### 10a. Tạo repository trên GitHub

1. Vào [github.com](https://github.com) → **New repository**
2. Điền:
   - **Repository name**: `telecom-portal` (hoặc tuỳ ý)
   - **Visibility**: Private (khuyến nghị — code nội bộ)
3. **Không tick** "Add a README file" hay "Add .gitignore" (đã có sẵn trong project)
4. Bấm **Create repository**

### 10b. Khởi tạo Git và push lần đầu

Chạy lần lượt trong terminal tại thư mục project:

```bash
git init
git add .
git commit -m "feat: initial release"
git remote add origin https://github.com/YOUR_USERNAME/telecom-portal.git
git push -u origin master
```

Thay `YOUR_USERNAME` bằng username GitHub của bạn.

> `.env` đã có trong `.gitignore` nên sẽ không bị push lên — an toàn.

---

## 11. Deploy lên Cloudflare Pages

### 11a. Kết nối GitHub với Cloudflare Pages

1. Vào [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages**
2. Chọn **Connect to Git**
3. Đăng nhập GitHub nếu được yêu cầu → chọn repo `telecom-portal` → **Begin setup**

### 11b. Cấu hình build

| Trường | Giá trị |
|--------|---------|
| **Project name** | `telecom-portal` (hoặc tuỳ ý) |
| **Production branch** | `master` |
| **Build command** | `npm run build` |
| **Build output directory** | `dist` |
| **Root directory** | *(để trống)* |

### 11c. Thêm biến môi trường

Cuộn xuống phần **Environment variables** → **Add variable**, thêm 3 biến:

| Variable name | Value |
|--------------|-------|
| `VITE_SUPABASE_URL` | `https://XXXXXXXXXXXX.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGci...` (anon key từ bước 3) |
| `VITE_APP_NAME` | `Portal Phòng <Tên phòng của bạn>` |

> Biến môi trường phải thêm trước khi bấm Deploy, nếu không web sẽ không kết nối được Supabase.

### 11d. Deploy

Bấm **Save and Deploy** — Cloudflare tự chạy build và deploy. Chờ ~2 phút.

Sau khi xong sẽ có URL dạng `https://telecom-portal.pages.dev`.

### 11e. Cấu hình SPA routing

Kiểm tra file `public/_redirects` — nếu đã có nội dung sau thì không cần làm gì:

```
/*  /index.html  200
```

Nếu chưa có, tạo file đó với đúng nội dung trên. File này đảm bảo khi người dùng truy cập thẳng vào URL như `/admin/links` thì Cloudflare không trả về 404.

---

## 12. Kiểm tra sau deploy

Sau khi deploy xong, kiểm tra theo thứ tự:

- [ ] Trang chủ tải được, danh mục và link hiển thị
- [ ] Tìm kiếm (Ctrl+K) hoạt động
- [ ] Đăng nhập admin tại `/login`
- [ ] Tạo link mới, upload icon
- [ ] Kiểm tra cron: vào **Admin → Health Check**, bấm "Kiểm tra tất cả"
- [ ] Xem **Admin → Dashboard** — số liệu thống kê hiển thị đúng
- [ ] Đăng xuất → trả về trang chủ

---

## 13. Cập nhật web (khi có chỉnh sửa code)

Cloudflare Pages tích hợp với GitHub — **mỗi lần push lên GitHub là Cloudflare tự động build và deploy lại**, không cần làm thêm gì.

### Quy trình cập nhật thông thường

```bash
# 1. Chỉnh sửa code...

# 2. Kiểm tra local trước khi đẩy
npm run dev

# 3. Đảm bảo không có lỗi TypeScript
npx tsc --noEmit

# 4. Commit thay đổi
git add .
git commit -m "mô tả thay đổi"

# 5. Push lên GitHub — Cloudflare tự deploy
git push
```

Sau khi push, vào **Cloudflare Dashboard → Pages → telecom-portal → Deployments** để xem tiến trình build (~1-2 phút).

### Xem lịch sử deploy

Vào **Cloudflare Dashboard → Pages → telecom-portal → Deployments**:
- Mỗi lần push là một deployment mới
- Bấm vào deployment bất kỳ để xem build log
- Nếu build thất bại: xem log lỗi, sửa code, push lại

### Rollback về phiên bản cũ

Nếu phiên bản mới có lỗi:
1. Vào **Deployments** → chọn deployment cũ hoạt động tốt
2. Bấm **...** (More) → **Rollback to this deployment**

### Cập nhật biến môi trường

Nếu cần thay đổi Supabase key hoặc thêm biến mới:
1. Vào **Pages → telecom-portal → Settings → Environment variables**
2. Chỉnh sửa giá trị → **Save**
3. Vào **Deployments** → **Retry deployment** trên bản mới nhất để áp dụng biến mới

### Cập nhật Edge Function

Nếu có chỉnh sửa trong `supabase/functions/check-all-links/index.ts`:

```bash
supabase functions deploy check-all-links
```

Edge Function deploy độc lập với Cloudflare Pages — push GitHub không tự deploy Edge Function.

---

## 14. Quản lý & bảo trì

### Thêm admin mới

Làm theo bước 6 với email của người cần thêm.

### Quản lý cron job

```sql
-- Tạm dừng kiểm tra link tự động
update cron.job set active = false where jobname = 'check-all-links-cron';

-- Bật lại
update cron.job set active = true where jobname = 'check-all-links-cron';

-- Xóa hoàn toàn (cần tạo lại theo bước 8b)
select cron.unschedule('check-all-links-cron');
```

### Xem dung lượng bảng health check

```sql
select
  count(*) as total_rows,
  min(checked_at) as oldest_record,
  max(checked_at) as newest_record,
  pg_size_pretty(pg_total_relation_size('link_health_checks')) as table_size
from link_health_checks;
```

Ước tính: 100 link × 8 lần/ngày × 30 ngày = ~24 000 rows. Cron job dọn log tự động giữ trong giới hạn này.

### Thay đổi thời gian lưu log

Mặc định giữ 30 ngày. Để thay đổi, sửa hằng số `RETENTION_DAYS` trong `supabase/functions/check-all-links/index.ts` rồi redeploy:

```bash
supabase functions deploy check-all-links
```

### Reset về production (xóa data test)

Chạy file `supabase/reset_to_production.sql` trong SQL Editor. File này xóa toàn bộ links, announcements, health check logs nhưng giữ lại categories, tags và system settings.

### Giới hạn Edge Function (Free plan)

- Thời gian chạy tối đa: **150 giây**
- Nếu có > 100 link và timeout, giảm `BATCH_SIZE` hoặc tăng `TIMEOUT_MS` trong `index.ts` rồi redeploy

### Lưu ý bảo mật

- `service_role key` có toàn quyền DB — **không đặt vào frontend code**, chỉ dùng trong cron job SQL
- `.env` không được commit vào Git
- Khi rotate key Supabase, cập nhật lại cả biến môi trường trên Cloudflare Pages và SQL trong cron job (bước 8b)
