# PROJECT_TODO — Pending

## P2 — Features
- [ ] `/admin/audit` — trang xem lịch sử thay đổi (cần tạo lại bảng `audit_logs` + trigger, đã bị drop khỏi schema hiện tại)
- [ ] Export: thêm filter theo tag
- [ ] Statistics: click trend chart theo ngày (cần tạo bảng `click_logs` mới — hiện tại chỉ có aggregate `click_count` trên `links`)

## P3 — Technical
- [ ] Error boundary component toàn cục
- [ ] Health check: cân nhắc cách bypass CORS để check internal links (hiện tại skip, return 'unknown')
- [ ] Unit tests cho `src/lib/validators.ts`
- [ ] E2E tests với Playwright
