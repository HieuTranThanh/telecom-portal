-- ============================================================
-- Thêm cờ "khóa trạng thái thủ công" cho link
-- Dùng cho link công khai nhưng bị WAF/geo-block chặn server check
-- (false positive Offline) — admin tự chọn online/offline/unknown
-- và bỏ qua kiểm tra tự động cho link đó.
--
-- CHẠY FILE NÀY TRONG SUPABASE SQL EDITOR (sau 001_initial_schema.sql)
-- ============================================================

alter table links
  add column if not exists health_check_exempt        boolean not null default false,
  add column if not exists health_check_exempt_reason text;
