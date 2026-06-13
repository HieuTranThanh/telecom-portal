-- ============================================================
-- Portal Phòng Viễn thông — Database Schema v2
-- RESET HOÀN TOÀN: xóa sạch rồi tạo lại từ đầu
--
-- CHẠY FILE NÀY TRONG SUPABASE SQL EDITOR
-- Sau khi chạy xong: chạy tiếp seed.sql để có dữ liệu mặc định
-- ============================================================

-- ============================================================
-- BƯỚC 1: XÓA SẠCH (drop theo thứ tự ngược FK)
-- ============================================================

-- Xóa storage policies trước
drop policy if exists "Public can view link icons"  on storage.objects;
drop policy if exists "Admin can upload link icons" on storage.objects;
drop policy if exists "Admin can update link icons" on storage.objects;
drop policy if exists "Admin can delete link icons" on storage.objects;

-- Xóa trigger trên auth.users
drop trigger if exists on_auth_user_created on auth.users;

-- Xóa bảng theo thứ tự phụ thuộc FK (bảng con trước, bảng cha sau)
drop table if exists link_health_checks cascade;
drop table if exists link_tags          cascade;
drop table if exists click_logs         cascade;  -- bảng cũ (đã loại bỏ)
drop table if exists audit_logs         cascade;  -- bảng cũ (đã loại bỏ)
drop table if exists announcements      cascade;
drop table if exists links              cascade;
drop table if exists categories         cascade;
drop table if exists tags               cascade;
drop table if exists system_settings    cascade;
drop table if exists profiles           cascade;

-- Xóa functions
drop function if exists is_admin();
drop function if exists increment_link_click(uuid);
drop function if exists cleanup_health_checks(int);
drop function if exists renumber_categories();
drop function if exists handle_new_user();

-- ============================================================
-- BƯỚC 2: TẠO LẠI TOÀN BỘ
-- ============================================================

create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (liên kết với auth.users)
-- ============================================================
create table profiles (
  id          uuid    primary key references auth.users(id) on delete cascade,
  full_name   text,
  role        text    not null default 'admin',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Tự động tạo profile khi có user mới đăng ký
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (new.id, new.raw_user_meta_data->>'full_name', 'admin', true);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- CATEGORIES
-- ============================================================
create table categories (
  id          uuid    primary key default gen_random_uuid(),
  name        text    not null,
  slug        text    unique not null,
  description text,
  icon        text,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_categories_slug        on categories(slug);
create index idx_categories_active_sort on categories(is_active, sort_order);

-- ============================================================
-- TAGS
-- ============================================================
create table tags (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text unique not null,
  color      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tags_slug on tags(slug);

-- ============================================================
-- LINKS
-- ============================================================
create table links (
  id                  uuid    primary key default gen_random_uuid(),
  category_id         uuid    references categories(id) on delete set null,
  name                text    not null,
  slug                text    unique not null,
  url                 text    not null,
  description         text,
  detail_description  text,
  icon_url            text,
  business_status     text    not null default 'active'
                        check (business_status in ('active', 'suspended', 'expired')),
  health_status       text    not null default 'unknown'
                        check (health_status in ('online', 'offline', 'unknown')),
  is_featured         boolean not null default false,
  is_frequent         boolean not null default false,
  is_quick_access     boolean not null default false,
  quick_access_order  numeric not null default 0,
  is_active           boolean not null default true,
  is_internal         boolean not null default false,
  health_check_exempt        boolean not null default false,
  health_check_exempt_reason text,
  login_username      text,
  login_password      text,
  expires_at          timestamptz,
  click_count         integer not null default 0,
  last_clicked_at     timestamptz,
  last_checked_at     timestamptz,
  last_http_status    integer,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- Composite cho filter phổ biến nhất
create index idx_links_active_business on links(is_active, business_status);
create index idx_links_category        on links(category_id);
create index idx_links_slug            on links(slug);
create index idx_links_health_status   on links(health_status);
create index idx_links_click_count     on links(click_count desc);
create index idx_links_updated         on links(updated_at desc);
-- Partial index: chỉ index row có flag = true (nhỏ hơn, nhanh hơn full index)
create index idx_links_featured        on links(updated_at desc)     where is_featured = true;
create index idx_links_frequent        on links(click_count desc)    where is_frequent = true;
create index idx_links_quick_access    on links(quick_access_order)  where is_quick_access = true;
-- Full-text search
create index idx_links_fts on links
  using gin(to_tsvector('simple',
    coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(url,'')
  ));

-- ============================================================
-- LINK TAGS (junction)
-- ============================================================
create table link_tags (
  link_id    uuid not null references links(id) on delete cascade,
  tag_id     uuid not null references tags(id)  on delete cascade,
  created_at timestamptz not null default now(),
  primary key (link_id, tag_id)
);

-- PK cover lookup theo link_id; index này cover lookup theo tag_id
create index idx_link_tags_tag on link_tags(tag_id);

-- ============================================================
-- LINK REFERENCES (tài liệu / link tham khảo)
-- ============================================================
create table link_references (
  id          uuid        primary key default gen_random_uuid(),
  link_id     uuid        not null references links(id) on delete cascade,
  title       text,
  url         text        not null,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create index link_references_link_id_idx on link_references(link_id);

-- ============================================================
-- LINK HEALTH CHECKS
-- ============================================================
create table link_health_checks (
  id               uuid primary key default gen_random_uuid(),
  link_id          uuid not null references links(id) on delete cascade,
  status           text not null check (status in ('online', 'offline', 'unknown')),
  http_status      integer,
  response_time_ms integer,
  error_message    text,
  checked_at       timestamptz not null default now()
);

-- Composite: link + thời gian (dùng cho health history)
create index idx_health_link_checked on link_health_checks(link_id, checked_at desc);

-- ============================================================
-- ANNOUNCEMENTS
-- ============================================================
create table announcements (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  content     text not null,
  type        text not null default 'info'
                check (type in ('info', 'maintenance', 'warning', 'critical')),
  is_active   boolean not null default true,
  starts_at   timestamptz,
  ends_at     timestamptz,
  created_by  uuid references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index idx_announcements_active on announcements(is_active);

-- ============================================================
-- SYSTEM SETTINGS
-- ============================================================
create table system_settings (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  value       jsonb,
  description text,
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Kiểm tra user hiện tại có phải admin không
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles
    where id        = auth.uid()
      and role      = 'admin'
      and is_active = true
  );
$$ language sql security definer stable;

-- Tăng click_count khi user click link (security definer để anon user gọi được)
create or replace function increment_link_click(link_id uuid)
returns void as $$
begin
  update links
  set
    click_count     = click_count + 1,
    last_clicked_at = now()
  where id = link_id;
end;
$$ language plpgsql security definer;

-- Dọn dẹp health check logs cũ, giữ N bản ghi gần nhất mỗi link
-- Chạy định kỳ: select cleanup_health_checks(50);
create or replace function cleanup_health_checks(keep_per_link int default 50)
returns int as $$
declare
  deleted_count int;
begin
  delete from link_health_checks
  where id not in (
    select id
    from (
      select id,
             row_number() over (
               partition by link_id
               order by checked_at desc
             ) as rn
      from link_health_checks
    ) ranked
    where rn <= keep_per_link
  );
  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$ language plpgsql security definer;

-- Renumber categories: gán lại 1,2,3,... không trùng, không bỏ cách
-- Tie-break theo updated_at DESC để danh mục vừa sửa được ưu tiên vào đúng vị trí
create or replace function renumber_categories()
returns void as $$
begin
  with ranked as (
    select id,
           row_number() over (
             order by sort_order, updated_at desc, name
           ) as new_order
    from categories
  )
  update categories
  set sort_order = ranked.new_order
  from ranked
  where categories.id = ranked.id;
end;
$$ language plpgsql security definer;

grant execute on function renumber_categories() to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table profiles           enable row level security;
alter table categories         enable row level security;
alter table tags               enable row level security;
alter table links              enable row level security;
alter table link_tags          enable row level security;
alter table link_references    enable row level security;
alter table link_health_checks enable row level security;
alter table announcements      enable row level security;
alter table system_settings    enable row level security;

-- PROFILES
create policy "Users can view own profile"
  on profiles for select using (auth.uid() = id);
create policy "Admin can manage profiles"
  on profiles for all using (is_admin());

-- CATEGORIES
create policy "Public can view active categories"
  on categories for select using (is_active = true);
create policy "Admin can manage categories"
  on categories for all using (is_admin());

-- TAGS
create policy "Public can view tags"
  on tags for select using (true);
create policy "Admin can manage tags"
  on tags for all using (is_admin());

-- LINKS
create policy "Public can view active links"
  on links for select using (is_active = true);
create policy "Admin can manage links"
  on links for all using (is_admin());

-- LINK TAGS
create policy "Public can view link tags"
  on link_tags for select using (true);
create policy "Admin can manage link tags"
  on link_tags for all using (is_admin());

-- LINK REFERENCES
create policy "Public can view link references"
  on link_references for select using (true);
create policy "Admin can manage link references"
  on link_references for all using (is_admin());

-- HEALTH CHECKS
create policy "Public can view health checks"
  on link_health_checks for select using (true);
create policy "Admin can manage health checks"
  on link_health_checks for all using (is_admin());

-- ANNOUNCEMENTS
create policy "Public can view active announcements"
  on announcements for select using (is_active = true);
create policy "Admin can manage announcements"
  on announcements for all using (is_admin());

-- SYSTEM SETTINGS
create policy "Public can view settings"
  on system_settings for select using (true);
create policy "Admin can manage settings"
  on system_settings for all using (is_admin());

-- ============================================================
-- STORAGE — bucket link-icons
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'link-icons',
  'link-icons',
  true,
  1048576,
  array['image/png', 'image/jpeg', 'image/jpg', 'image/gif',
        'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Public can view link icons"
  on storage.objects for select
  using (bucket_id = 'link-icons');

create policy "Admin can upload link icons"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'link-icons' and is_admin());

create policy "Admin can update link icons"
  on storage.objects for update to authenticated
  using (bucket_id = 'link-icons' and is_admin());

create policy "Admin can delete link icons"
  on storage.objects for delete to authenticated
  using (bucket_id = 'link-icons' and is_admin());
