-- ============================================================
-- TAM CENTER - Mở rộng bảng profiles cho TRANG CÁ NHÂN
--
-- Thêm các trường thông tin cá nhân để học viên / giáo viên /
-- nhân viên có thể bổ sung hồ sơ của mình.
--
-- Cách dùng: Supabase > SQL Editor > dán file này > Run. Chạy 1 lần.
-- (Dùng "add column if not exists" nên chạy lại nhiều lần vẫn an toàn.)
-- ============================================================

alter table public.profiles add column if not exists avatar_url       text;
alter table public.profiles add column if not exists gender           text;       -- MALE | FEMALE | OTHER
alter table public.profiles add column if not exists date_of_birth    date;
alter table public.profiles add column if not exists address          text;
alter table public.profiles add column if not exists bio              text;       -- giới thiệu ngắn
-- Dành riêng cho giáo viên:
alter table public.profiles add column if not exists specialization   text;       -- chuyên môn (vd: Luyện thi HSK cao cấp)
alter table public.profiles add column if not exists experience_years integer;    -- số năm kinh nghiệm
-- Mốc cập nhật hồ sơ gần nhất:
alter table public.profiles add column if not exists updated_at       timestamptz default now();

-- Ràng buộc giá trị giới tính (bỏ qua nếu đã tồn tại)
do $$
begin
  alter table public.profiles
    add constraint profiles_gender_check
    check (gender is null or gender in ('MALE', 'FEMALE', 'OTHER'));
exception when duplicate_object then
  raise notice 'Ràng buộc profiles_gender_check đã tồn tại, bỏ qua.';
end $$;
