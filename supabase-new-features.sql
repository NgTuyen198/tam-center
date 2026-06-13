-- ============================================================
-- TAM CENTER - SQL bổ sung tính năng:
-- 1) Đánh giá giáo viên (teacher_reviews)
-- 2) Hệ thống hỗ trợ / hỏi đáp (support_tickets + support_messages)
--
-- Cách dùng: Mở Supabase > SQL Editor > dán toàn bộ file này > Run.
-- ============================================================

-- ---------- 1. ĐÁNH GIÁ GIÁO VIÊN ----------
create table if not exists public.teacher_reviews (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.profiles(id) on delete cascade,
  teacher_id  uuid not null references public.profiles(id) on delete cascade,
  class_id    uuid not null references public.classes(id)  on delete cascade,
  rating      int  not null check (rating between 1 and 5),
  comment     text,
  created_at  timestamptz not null default now(),
  -- Mỗi học viên chỉ đánh giá 1 lần cho mỗi lớp
  unique (student_id, class_id)
);

create index if not exists idx_teacher_reviews_teacher on public.teacher_reviews(teacher_id);

alter table public.teacher_reviews enable row level security;

-- Cho phép user đăng nhập đọc đánh giá (phục vụ tính điểm trung bình GV)
drop policy if exists "Auth doc danh gia" on public.teacher_reviews;
create policy "Auth doc danh gia" on public.teacher_reviews
  for select to authenticated using (true);

-- Cho phép thao tác ghi qua Server Action
drop policy if exists "Auth ghi danh gia" on public.teacher_reviews;
create policy "Auth ghi danh gia" on public.teacher_reviews
  for all to authenticated using (true) with check (true);


-- ---------- 2. PHIẾU HỖ TRỢ ----------
create table if not exists public.support_tickets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  subject     text not null,
  category    text not null default 'OTHER',     -- PAYMENT | SCHEDULE | LEARNING | TECHNICAL | OTHER
  status      text not null default 'OPEN',       -- OPEN | ANSWERED | CLOSED
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_support_tickets_user on public.support_tickets(user_id);
create index if not exists idx_support_tickets_status on public.support_tickets(status);

alter table public.support_tickets enable row level security;

drop policy if exists "Auth doc ticket" on public.support_tickets;
create policy "Auth doc ticket" on public.support_tickets
  for select to authenticated using (true);

drop policy if exists "Auth ghi ticket" on public.support_tickets;
create policy "Auth ghi ticket" on public.support_tickets
  for all to authenticated using (true) with check (true);


-- ---------- 3. TIN NHẮN TRONG PHIẾU HỖ TRỢ ----------
create table if not exists public.support_messages (
  id          uuid primary key default gen_random_uuid(),
  ticket_id   uuid not null references public.support_tickets(id) on delete cascade,
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  sender_role text not null,
  message     text not null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_support_messages_ticket on public.support_messages(ticket_id);

alter table public.support_messages enable row level security;

drop policy if exists "Auth doc tin nhan" on public.support_messages;
create policy "Auth doc tin nhan" on public.support_messages
  for select to authenticated using (true);

drop policy if exists "Auth ghi tin nhan" on public.support_messages;
create policy "Auth ghi tin nhan" on public.support_messages
  for all to authenticated using (true) with check (true);
