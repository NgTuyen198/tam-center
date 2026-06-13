-- ============================================================
-- TAM CENTER - DỌN DẸP DỮ LIỆU SEED
--
-- Xóa toàn bộ tài khoản và dữ liệu do supabase-seed-data.sql tạo ra.
-- Nhận diện tài khoản seed qua email đuôi @tam.test.
--
-- CÁCH DÙNG: Supabase > SQL Editor > dán file này > Run.
-- ============================================================

do $$
declare
  ids uuid[];
begin
  select array_agg(id) into ids from auth.users where email like '%@tam.test';
  if ids is null then
    raise notice 'Không tìm thấy tài khoản seed nào.';
    return;
  end if;

  -- Xóa dữ liệu vận hành liên quan (con trước, cha sau)
  delete from public.attendance a
    using public.schedules sc, public.classes cl
    where a.schedule_id = sc.id and sc.class_id = cl.id and cl.staff_id = any(ids);
  delete from public.schedules sc
    using public.classes cl
    where sc.class_id = cl.id and cl.staff_id = any(ids);
  delete from public.teacher_reviews where teacher_id = any(ids) or student_id = any(ids);
  delete from public.class_students where student_id = any(ids);
  delete from public.classes where staff_id = any(ids) or teacher_id = any(ids);
  delete from public.registrations where student_id = any(ids);

  delete from public.support_messages sm
    using public.support_tickets st
    where sm.ticket_id = st.id and (st.user_id = any(ids) or sm.sender_id = any(ids));
  delete from public.support_tickets where user_id = any(ids);

  delete from public.activity_logs where user_id = any(ids);

  -- Xóa hồ sơ và tài khoản auth
  delete from public.profiles where id = any(ids);
  delete from auth.identities where user_id = any(ids);
  delete from auth.users where id = any(ids);

  raise notice 'Đã xóa % tài khoản seed cùng dữ liệu liên quan.', array_length(ids, 1);
end $$;

-- Tùy chọn: gỡ hàm seed nếu không cần nữa
-- drop function if exists public.seed_create_user;
