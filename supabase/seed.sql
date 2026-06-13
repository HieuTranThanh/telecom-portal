-- ============================================================
-- Seed Data — Portal Phòng Viễn thông
-- Chạy SAU khi đã chạy 001_initial_schema.sql
-- Nội dung: danh mục, tag, cài đặt hệ thống, thông báo chào mừng
-- ============================================================

-- ============================================================
-- CATEGORIES (8 danh mục mặc định)
-- ============================================================
insert into categories (name, slug, description, icon, sort_order, is_active) values
  ('Vận hành kỹ thuật',   'van-hanh-ky-thuat',   'Các hệ thống vận hành mạng lưới kỹ thuật',           '📡', 1, true),
  ('KPI & Báo cáo',       'kpi-bao-cao',          'Hệ thống theo dõi KPI và báo cáo hiệu suất',         '📊', 2, true),
  ('Hệ thống giám sát',   'he-thong-giam-sat',    'Giám sát mạng lưới và cảnh báo sự cố',               '🖥',  3, true),
  ('Link phần mềm',       'link-phan-mem',        'Phần mềm và ứng dụng phục vụ công việc',             '📦', 4, true),
  ('Tài liệu kỹ thuật',  'tai-lieu-ky-thuat',    'Tài liệu, quy trình và hướng dẫn kỹ thuật',          '📚', 5, true),
  ('Công cụ tra cứu',    'cong-cu-tra-cuu',      'Công cụ hỗ trợ tra cứu thông tin kỹ thuật',          '🔎', 6, true),
  ('Quy trình & Biểu mẫu','quy-trinh-bieu-mau', 'Quy trình nghiệp vụ và biểu mẫu nội bộ',             '📋', 7, true),
  ('Hỗ trợ kỹ thuật',    'ho-tro-ky-thuat',     'Hệ thống hỗ trợ và xử lý sự cố kỹ thuật',           '🛠', 8, true)
on conflict (slug) do nothing;

-- ============================================================
-- TAGS (10 tag kỹ thuật mặc định)
-- ============================================================
insert into tags (name, slug, color) values
  ('BTS',        'bts',       '#2563EB'),
  ('Core',       'core',      '#7C3AED'),
  ('Truyền dẫn', 'truyen-dan','#16A34A'),
  ('IP',         'ip',        '#F59E0B'),
  ('OSS',        'oss',       '#DC2626'),
  ('KPI',        'kpi',       '#0891B2'),
  ('Report',     'report',    '#6366F1'),
  ('NMS',        'nms',       '#059669'),
  ('Alarm',      'alarm',     '#B45309'),
  ('BSS',        'bss',       '#9333EA')
on conflict (slug) do nothing;

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
insert into system_settings (key, value, description) values
  ('portal_name',          '"Portal Phòng Viễn thông"', 'Tên hiển thị của Portal'),
  ('support_email',        '"kythuat@mobifone.vn"',         'Email hỗ trợ kỹ thuật'),
  ('support_phone',        '"1800 1090"',                   'Số điện thoại hỗ trợ'),
  ('default_page_size',    '20',                            'Số link hiển thị mỗi trang'),
  ('health_check_timeout', '10000',                         'Timeout kiểm tra link (milliseconds)')
on conflict (key) do nothing;

-- ============================================================
-- THÔNG BÁO CHÀO MỪNG
-- ============================================================
insert into announcements (title, content, type, is_active) values
  (
    'Chào mừng đến Portal Phòng Viễn thông',
    'Portal tập trung toàn bộ link hệ thống, tài liệu và công cụ phục vụ công việc. Dùng Ctrl+K để tìm kiếm nhanh.',
    'info',
    true
  )
on conflict do nothing;

-- ============================================================
-- THÊM LINKS THẬT: vào Admin Portal → /admin/links (tạo thủ công)
-- hoặc import hàng loạt: /admin/import (file xlsx/csv)
-- ============================================================
