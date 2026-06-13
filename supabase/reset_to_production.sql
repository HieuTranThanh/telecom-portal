-- ============================================================
-- reset_to_production.sql
-- Xóa toàn bộ dữ liệu, giữ lại cấu trúc bảng + categories + tags + settings
--
-- CẢNH BÁO: Xóa vĩnh viễn links, announcements, health checks
-- Chạy trong Supabase SQL Editor
-- ============================================================

begin;

-- Xóa dữ liệu phụ thuộc trước (có FK đến links)
delete from link_health_checks;
delete from link_tags;
delete from links;
delete from announcements;

-- Cập nhật system_settings về giá trị production
insert into system_settings (key, value, description) values
  ('portal_name',          '"Portal Phòng Viễn thông"', 'Tên hiển thị của Portal'),
  ('support_email',        '"kythuat@mobifone.vn"',         'Email hỗ trợ kỹ thuật'),
  ('support_phone',        '"1800 1090"',                   'Số điện thoại hỗ trợ'),
  ('default_page_size',    '20',                            'Số link hiển thị mỗi trang'),
  ('health_check_timeout', '10000',                         'Timeout kiểm tra link (milliseconds)')
on conflict (key) do update
  set value       = excluded.value,
      description = excluded.description,
      updated_at  = now();

-- Giữ nguyên categories và tags (đã seed sẵn, không cần tạo lại)
-- Nếu muốn xóa sạch cả categories/tags, bỏ comment 2 dòng dưới:
-- delete from categories;
-- delete from tags;

commit;

-- ============================================================
-- Sau khi reset:
-- 1. Thêm link thật qua /admin/links (tạo thủ công)
-- 2. Hoặc import hàng loạt qua /admin/import (xlsx/csv)
-- 3. Tạo thông báo mới qua /admin/announcements
-- 4. Định kỳ dọn health check logs: select cleanup_health_checks(50);
-- ============================================================
