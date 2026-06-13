-- ============================================================
-- TAM CENTER - Bật REALTIME cho hệ thống chat hỗ trợ
--
-- Mục đích: để tin nhắn (support_messages) và trạng thái phiếu
-- (support_tickets) tự động đẩy tới trình duyệt của học viên và
-- nhân viên ngay khi có thay đổi, không cần tải lại trang (F5).
--
-- Cách dùng: Mở Supabase > SQL Editor > dán file này > Run.
-- Chỉ cần chạy 1 lần.
-- ============================================================

-- 1) Thêm 2 bảng vào publication realtime của Supabase.
--    (Nếu bảng đã có sẵn trong publication, lệnh sẽ báo lỗi "already member" -> bỏ qua an toàn.)
do $$
begin
  begin
    alter publication supabase_realtime add table public.support_messages;
  exception when duplicate_object then
    raise notice 'support_messages đã có trong publication, bỏ qua.';
  end;

  begin
    alter publication supabase_realtime add table public.support_tickets;
  exception when duplicate_object then
    raise notice 'support_tickets đã có trong publication, bỏ qua.';
  end;
end $$;

-- 2) Đảm bảo Realtime gửi đủ dữ liệu dòng khi UPDATE (phục vụ cập nhật trạng thái phiếu).
alter table public.support_messages replica identity full;
alter table public.support_tickets  replica identity full;

-- Kiểm tra nhanh: liệt kê các bảng đang được realtime theo dõi
-- select * from pg_publication_tables where pubname = 'supabase_realtime';
