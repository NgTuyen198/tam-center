-- ============================================================
-- TAM CENTER - CẬP NHẬT ẢNH ĐẠI DIỆN MẪU CHO CÁC TÀI KHOẢN SEED
-- 
-- Chứa các ảnh chân dung chất lượng cao có mặt người từ Unsplash.
-- Cách dùng: Vào Supabase > SQL Editor > Paste nội dung này > Click Run.
-- ============================================================

-- 1. CẬP NHẬT ẢNH ĐẠI DIỆN CHO GIÁO VIÊN (TEACHERS)
UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Cô Nguyễn Thị Lan';

UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1568602471122-7832951cc4c5?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Thầy Trần Văn Minh';

UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Cô Phạm Thị Hoa';


-- 2. CẬP NHẬT ẢNH ĐẠI DIỆN CHO NHÂN VIÊN VẬN HÀNH (STAFF)
UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1580894732444-8fecef2271da?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Lê Thị Thảo (NV)';


-- 3. CẬP NHẬT ẢNH ĐẠI DIỆN CHO QUẢN TRỊ VIÊN (ADMIN)
UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Quản trị viên TAM';


-- 4. CẬP NHẬT ẢNH ĐẠI DIỆN MẪU CHO MỘT SỐ HỌC VIÊN TIÊU BIỂU (STUDENTS)
UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Nguyễn Văn An';

UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Trần Thị Bình';

UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Lê Mạnh Cường';

UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Hoàng Thị Em';

UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Bùi Thị Lan';

UPDATE public.profiles
SET avatar_url = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=300'
WHERE full_name = 'Đặng Trà My';
