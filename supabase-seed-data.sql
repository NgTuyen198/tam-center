-- ============================================================
-- TAM CENTER - TIÊM DỮ LIỆU MẪU (SEED) cho đồ án
--
-- Mục tiêu: tạo dữ liệu phong phú để demo cả 4 dashboard:
--   - Tài khoản đăng nhập được: 3 giáo viên, 1 nhân viên, 12 học viên
--   - Lớp học ở mọi trạng thái (đang gom / chờ khai giảng / đang học / đã xong)
--   - Lịch học + điểm danh, đơn đăng ký rải 6 tháng (để có biểu đồ doanh thu)
--   - Đánh giá giáo viên + phiếu hỗ trợ kèm hội thoại
--
-- YÊU CẦU TRƯỚC KHI CHẠY:
--   1) Đã chạy supabase-new-features.sql (teacher_reviews, support_*)
--   2) Đã chạy supabase-profile-fields.sql (các cột hồ sơ mở rộng)
--
-- CÁCH DÙNG: Supabase > SQL Editor > dán file này > Run.
--   - Script idempotent: chạy lại nhiều lần không nhân đôi dữ liệu.
--   - Mật khẩu mọi tài khoản seed: Tamcenter@123
--   - Email seed đều có đuôi @tam.test để dễ dọn dẹp về sau.
--
-- DỌN DẸP: chạy file supabase-seed-cleanup.sql để xóa toàn bộ dữ liệu seed.
-- ============================================================

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- HÀM TẠO TÀI KHOẢN (auth.users + auth.identities + profiles)
-- Trả về id; nếu email đã tồn tại thì trả id cũ (không tạo trùng).
-- ------------------------------------------------------------
create or replace function public.seed_create_user(
  p_email      text,
  p_password   text,
  p_full_name  text,
  p_phone      text,
  p_role       text,
  p_gender     text        default null,
  p_dob        date        default null,
  p_address    text        default null,
  p_bio        text        default null,
  p_spec       text        default null,
  p_exp        int         default null,
  p_created    timestamptz default now()
) returns uuid
language plpgsql
security definer
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;

  if v_id is null then
    v_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      p_email, crypt(p_password, gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name, 'phone', p_phone),
      p_created, p_created,
      '', '', '', ''
    );

    insert into auth.identities (
      provider_id, id, user_id, identity_data, provider,
      last_sign_in_at, created_at, updated_at
    ) values (
      v_id::text, gen_random_uuid(), v_id,
      jsonb_build_object('sub', v_id::text, 'email', p_email), 'email',
      now(), p_created, p_created
    );
  end if;

  -- Upsert hồ sơ (an toàn dù có hay không có trigger tự tạo profiles)
  insert into public.profiles (
    id, full_name, phone, role, status, created_at,
    gender, date_of_birth, address, bio, specialization, experience_years, updated_at
  ) values (
    v_id, p_full_name, p_phone, p_role, 'ACTIVE', p_created,
    p_gender, p_dob, p_address, p_bio, p_spec, p_exp, now()
  )
  on conflict (id) do update set
    full_name        = excluded.full_name,
    phone            = excluded.phone,
    role             = excluded.role,
    gender           = excluded.gender,
    date_of_birth    = excluded.date_of_birth,
    address          = excluded.address,
    bio              = excluded.bio,
    specialization   = excluded.specialization,
    experience_years = excluded.experience_years,
    updated_at       = now();

  return v_id;
end;
$$;

-- ============================================================
-- KHỐI SEED CHÍNH
-- ============================================================
do $$
declare
  -- giáo viên
  t1 uuid; t2 uuid; t3 uuid;
  -- nhân viên
  s1 uuid;
  -- học viên
  stu uuid[];
  i int;

  -- khóa học & biến thể
  c_hsk3 uuid; c_hsk5 uuid; c_giaotiep uuid; c_thuongmai uuid;
  v_hsk3_grp uuid; v_hsk3_vip uuid;
  v_hsk5_grp uuid;
  v_gt_grp uuid;  v_gt_vip uuid;
  v_tm_vip uuid;

  -- lớp
  cls_done uuid; cls_inprog1 uuid; cls_inprog2 uuid; cls_ready uuid; cls_forming uuid;
  sch uuid;
  d int;
  reg_amt numeric;
begin
  -- ====== 1) TÀI KHOẢN ======
  t1 := public.seed_create_user('teacher.lan@tam.test',  'Tamcenter@123', 'Cô Nguyễn Thị Lan',  '0901000001', 'TEACHER', 'FEMALE', '1988-03-12', 'Hai Bà Trưng, Hà Nội', 'Tốt nghiệp ĐH Ngoại ngữ, 8 năm dạy tiếng Trung.', 'Luyện thi HSK 4-6', 8,  now() - interval '300 days');
  t2 := public.seed_create_user('teacher.minh@tam.test', 'Tamcenter@123', 'Thầy Trần Văn Minh', '0901000002', 'TEACHER', 'MALE',   '1990-07-22', 'Cầu Giấy, Hà Nội',    'Từng du học Bắc Kinh 4 năm, chuyên giao tiếp.',     'Giao tiếp & Thương mại', 6, now() - interval '280 days');
  t3 := public.seed_create_user('teacher.hoa@tam.test',  'Tamcenter@123', 'Cô Phạm Thị Hoa',    '0901000003', 'TEACHER', 'FEMALE', '1992-11-02', 'Đống Đa, Hà Nội',     'Giáo viên trẻ, nhiệt huyết, chuyên HSK sơ cấp.',   'HSK 1-3 & Phát âm', 4,  now() - interval '200 days');

  s1 := public.seed_create_user('staff.thao@tam.test',   'Tamcenter@123', 'Lê Thị Thảo (NV)',   '0902000001', 'STAFF',   'FEMALE', '1995-05-18', 'Thanh Xuân, Hà Nội',  'Phụ trách tư vấn và vận hành lớp học.', null, null, now() - interval '320 days');

  -- 12 học viên
  stu := array[
    public.seed_create_user('hv.an@tam.test',    'Tamcenter@123', 'Nguyễn Văn An',   '0903000001', 'STUDENT', 'MALE',   '2002-01-10', 'Long Biên, Hà Nội',  'Muốn thi HSK 4 để du học.', null, null, now() - interval '170 days'),
    public.seed_create_user('hv.binh@tam.test',  'Tamcenter@123', 'Trần Thị Bình',   '0903000002', 'STUDENT', 'FEMALE', '2001-02-14', 'Hà Đông, Hà Nội',    'Học giao tiếp cho công việc.', null, null, now() - interval '165 days'),
    public.seed_create_user('hv.cuong@tam.test', 'Tamcenter@123', 'Lê Mạnh Cường',   '0903000003', 'STUDENT', 'MALE',   '2000-09-30', 'Tây Hồ, Hà Nội',     null, null, null, now() - interval '150 days'),
    public.seed_create_user('hv.dung@tam.test',  'Tamcenter@123', 'Phạm Tiến Dũng',  '0903000004', 'STUDENT', 'MALE',   '2003-12-05', 'Ba Đình, Hà Nội',    null, null, null, now() - interval '140 days'),
    public.seed_create_user('hv.em@tam.test',    'Tamcenter@123', 'Hoàng Thị Em',    '0903000005', 'STUDENT', 'FEMALE', '2002-06-21', 'Hoàng Mai, Hà Nội',  'Yêu thích văn hóa Trung Hoa.', null, null, now() - interval '130 days'),
    public.seed_create_user('hv.phuc@tam.test',  'Tamcenter@123', 'Đỗ Hồng Phúc',    '0903000006', 'STUDENT', 'MALE',   '1999-04-17', 'Nam Từ Liêm, Hà Nội',null, null, null, now() - interval '120 days'),
    public.seed_create_user('hv.giang@tam.test', 'Tamcenter@123', 'Vũ Thị Giang',    '0903000007', 'STUDENT', 'FEMALE', '2004-08-08', 'Cầu Giấy, Hà Nội',   null, null, null, now() - interval '95 days'),
    public.seed_create_user('hv.hai@tam.test',   'Tamcenter@123', 'Ngô Văn Hải',     '0903000008', 'STUDENT', 'MALE',   '2001-10-25', 'Đống Đa, Hà Nội',    null, null, null, now() - interval '80 days'),
    public.seed_create_user('hv.lan@tam.test',   'Tamcenter@123', 'Bùi Thị Lan',     '0903000009', 'STUDENT', 'FEMALE', '2002-03-03', 'Thanh Xuân, Hà Nội', 'Cần HSK 5 cho học bổng.', null, null, now() - interval '60 days'),
    public.seed_create_user('hv.khoa@tam.test',  'Tamcenter@123', 'Dương Đăng Khoa',  '0903000010', 'STUDENT', 'MALE',   '2000-07-19', 'Hai Bà Trưng, Hà Nội',null, null, null, now() - interval '40 days'),
    public.seed_create_user('hv.my@tam.test',    'Tamcenter@123', 'Đặng Trà My',     '0903000011', 'STUDENT', 'FEMALE', '2003-05-12', 'Hà Đông, Hà Nội',    null, null, null, now() - interval '20 days'),
    public.seed_create_user('hv.nam@tam.test',   'Tamcenter@123', 'Lý Hoài Nam',     '0903000012', 'STUDENT', 'MALE',   '2001-11-28', 'Long Biên, Hà Nội',  null, null, null, now() - interval '8 days')
  ];

  -- ====== 2) KHÓA HỌC + BIẾN THỂ ======
  -- Tái dùng nếu đã có khóa cùng tên, tránh tạo trùng.
  select id into c_hsk3 from public.courses where name = 'Luyện thi HSK 3 Cấp Tốc' limit 1;
  if c_hsk3 is null then
    insert into public.courses (name, category, description, content, benefits, is_active)
    values ('Luyện thi HSK 3 Cấp Tốc', 'HSK', 'Lộ trình chinh phục HSK 3 trong 3 tháng cho người mới.', 'Ngữ pháp trọng tâm, 600 từ vựng HSK 3, luyện đề bám sát.', array['Cam kết đầu ra HSK 3','Tài liệu độc quyền','Thi thử hàng tuần'], true)
    returning id into c_hsk3;
  end if;

  select id into c_hsk5 from public.courses where name = 'Luyện thi HSK 5 Chuyên Sâu' limit 1;
  if c_hsk5 is null then
    insert into public.courses (name, category, description, content, benefits, is_active)
    values ('Luyện thi HSK 5 Chuyên Sâu', 'HSK', 'Nâng cao toàn diện 4 kỹ năng cho mục tiêu HSK 5.', '2500 từ vựng, đọc hiểu học thuật, viết luận.', array['Giảng viên 8+ năm KN','Sửa bài viết 1-1','Ngân hàng đề lớn'], true)
    returning id into c_hsk5;
  end if;

  select id into c_giaotiep from public.courses where name = 'Tiếng Trung Giao Tiếp Toàn Diện' limit 1;
  if c_giaotiep is null then
    insert into public.courses (name, category, description, content, benefits, is_active)
    values ('Tiếng Trung Giao Tiếp Toàn Diện', 'GIAO_TIEP', 'Phản xạ nghe nói tự nhiên qua tình huống thực tế.', 'Phát âm chuẩn, 20 chủ đề đời sống, role-play.', array['Lớp nhỏ tương tác cao','Giáo viên bản ngữ phối hợp','Học qua tình huống'], true)
    returning id into c_giaotiep;
  end if;

  select id into c_thuongmai from public.courses where name = 'Tiếng Trung Thương Mại' limit 1;
  if c_thuongmai is null then
    insert into public.courses (name, category, description, content, benefits, is_active)
    values ('Tiếng Trung Thương Mại', 'GIAO_TIEP', 'Tiếng Trung dùng trong môi trường công sở, đàm phán.', 'Email thương mại, thuật ngữ kinh doanh, đàm phán.', array['Tình huống công sở thật','Mẫu email & hợp đồng','Phù hợp đi làm'], true)
    returning id into c_thuongmai;
  end if;

  -- Biến thể (GROUP / 1_ON_1). Tạo nếu chưa có cho từng khóa.
  select id into v_hsk3_grp from public.course_variants where course_id = c_hsk3 and learning_mode = 'GROUP' limit 1;
  if v_hsk3_grp is null then insert into public.course_variants (course_id, learning_mode, total_sessions, price_per_session, full_package_price) values (c_hsk3, 'GROUP', 24, 120000, 2600000) returning id into v_hsk3_grp; end if;
  select id into v_hsk3_vip from public.course_variants where course_id = c_hsk3 and learning_mode = '1_ON_1' limit 1;
  if v_hsk3_vip is null then insert into public.course_variants (course_id, learning_mode, total_sessions, price_per_session, full_package_price) values (c_hsk3, '1_ON_1', 20, 300000, 5800000) returning id into v_hsk3_vip; end if;

  select id into v_hsk5_grp from public.course_variants where course_id = c_hsk5 and learning_mode = 'GROUP' limit 1;
  if v_hsk5_grp is null then insert into public.course_variants (course_id, learning_mode, total_sessions, price_per_session, full_package_price) values (c_hsk5, 'GROUP', 30, 160000, 4500000) returning id into v_hsk5_grp; end if;

  select id into v_gt_grp from public.course_variants where course_id = c_giaotiep and learning_mode = 'GROUP' limit 1;
  if v_gt_grp is null then insert into public.course_variants (course_id, learning_mode, total_sessions, price_per_session, full_package_price) values (c_giaotiep, 'GROUP', 20, 100000, 1900000) returning id into v_gt_grp; end if;
  select id into v_gt_vip from public.course_variants where course_id = c_giaotiep and learning_mode = '1_ON_1' limit 1;
  if v_gt_vip is null then insert into public.course_variants (course_id, learning_mode, total_sessions, price_per_session, full_package_price) values (c_giaotiep, '1_ON_1', 16, 280000, 4300000) returning id into v_gt_vip; end if;

  select id into v_tm_vip from public.course_variants where course_id = c_thuongmai and learning_mode = '1_ON_1' limit 1;
  if v_tm_vip is null then insert into public.course_variants (course_id, learning_mode, total_sessions, price_per_session, full_package_price) values (c_thuongmai, '1_ON_1', 18, 350000, 6000000) returning id into v_tm_vip; end if;

  -- Dọn dữ liệu vận hành cũ của seed để chạy lại sạch sẽ (xóa con trước, cha sau).
  -- Xác định lớp seed qua staff_id = s1.
  delete from public.attendance a
    using public.schedules sc, public.classes cl
    where a.schedule_id = sc.id and sc.class_id = cl.id and cl.staff_id = s1;
  delete from public.schedules sc
    using public.classes cl
    where sc.class_id = cl.id and cl.staff_id = s1;
  delete from public.teacher_reviews tr
    using public.classes cl
    where tr.class_id = cl.id and cl.staff_id = s1;
  delete from public.class_students cs
    using public.classes cl
    where cs.class_id = cl.id and cl.staff_id = s1;
  delete from public.classes where staff_id = s1;

  -- Xóa đơn đăng ký, đánh giá, phiếu hỗ trợ cũ của các tài khoản seed.
  delete from public.registrations where student_id = any(stu);
  delete from public.teacher_reviews where teacher_id in (t1, t2, t3);
  delete from public.support_messages sm
    using public.support_tickets st
    where sm.ticket_id = st.id and st.user_id = any(stu);
  delete from public.support_tickets where user_id = any(stu);

  -- ====== 3) LỚP HỌC Ở MỌI TRẠNG THÁI ======
  -- (a) Lớp ĐÃ HOÀN THÀNH - HSK3 nhóm, cô Lan
  insert into public.classes (course_variant_id, teacher_id, staff_id, status, start_date, max_students, current_students)
  values (v_hsk3_grp, t1, s1, 'COMPLETED', (now() - interval '150 days')::date, 15, 5) returning id into cls_done;

  -- (b) Lớp ĐANG HỌC - Giao tiếp nhóm, thầy Minh
  insert into public.classes (course_variant_id, teacher_id, staff_id, status, start_date, max_students, current_students)
  values (v_gt_grp, t2, s1, 'IN_PROGRESS', (now() - interval '35 days')::date, 12, 4) returning id into cls_inprog1;

  -- (c) Lớp ĐANG HỌC - HSK5 nhóm, cô Lan
  insert into public.classes (course_variant_id, teacher_id, staff_id, status, start_date, max_students, current_students)
  values (v_hsk5_grp, t1, s1, 'IN_PROGRESS', (now() - interval '20 days')::date, 10, 3) returning id into cls_inprog2;

  -- (d) Lớp CHỜ KHAI GIẢNG (đã có GV) - HSK3 nhóm, cô Hoa
  insert into public.classes (course_variant_id, teacher_id, staff_id, status, start_date, max_students, current_students)
  values (v_hsk3_grp, t3, s1, 'READY', (now() + interval '7 days')::date, 15, 2) returning id into cls_ready;

  -- (e) Lớp ĐANG GOM (chưa có GV) - Giao tiếp nhóm
  insert into public.classes (course_variant_id, teacher_id, staff_id, status, start_date, max_students, current_students)
  values (v_gt_grp, null, s1, 'FORMING', null, 12, 2) returning id into cls_forming;

  -- ====== 4) GẮN HỌC VIÊN VÀO LỚP ======
  -- Lớp đã hoàn thành: học viên 1..5
  for i in 1..5 loop
    insert into public.class_students (class_id, student_id, joined_at)
    values (cls_done, stu[i], now() - interval '150 days') on conflict do nothing;
  end loop;
  -- Lớp đang học 1 (giao tiếp): học viên 2,6,7,8
  insert into public.class_students (class_id, student_id) values
    (cls_inprog1, stu[2]), (cls_inprog1, stu[6]), (cls_inprog1, stu[7]), (cls_inprog1, stu[8]) on conflict do nothing;
  -- Lớp đang học 2 (HSK5): học viên 9,10,11
  insert into public.class_students (class_id, student_id) values
    (cls_inprog2, stu[9]), (cls_inprog2, stu[10]), (cls_inprog2, stu[11]) on conflict do nothing;
  -- Lớp chờ khai giảng: học viên 12 + 4
  insert into public.class_students (class_id, student_id) values
    (cls_ready, stu[12]), (cls_ready, stu[4]) on conflict do nothing;
  -- Lớp đang gom: học viên 3 + 5
  insert into public.class_students (class_id, student_id) values
    (cls_forming, stu[3]), (cls_forming, stu[5]) on conflict do nothing;

  -- ====== 5) LỊCH HỌC + ĐIỂM DANH ======
  -- Lớp đã hoàn thành: 8 buổi quá khứ, điểm danh đầy đủ
  for d in 0..7 loop
    insert into public.schedules (class_id, study_date, start_time, end_time, room)
    values (cls_done, (now() - interval '150 days' + (d * interval '5 days'))::date, '18:00', '20:00', 'Phòng 101')
    returning id into sch;
    for i in 1..5 loop
      insert into public.attendance (schedule_id, student_id, status)
      values (sch, stu[i], (case when (i + d) % 7 = 0 then 'ABSENT' when (i + d) % 5 = 0 then 'LATE' else 'PRESENT' end));
    end loop;
  end loop;

  -- Lớp đang học 1: 6 buổi, vài buổi đầu đã điểm danh
  for d in 0..5 loop
    insert into public.schedules (class_id, study_date, start_time, end_time, room)
    values (cls_inprog1, (now() - interval '35 days' + (d * interval '6 days'))::date, '19:00', '21:00', 'Phòng Online')
    returning id into sch;
    if d <= 3 then
      foreach i in array array[2,6,7,8] loop
        insert into public.attendance (schedule_id, student_id, status)
        values (sch, stu[i], (case when (i + d) % 6 = 0 then 'LATE' else 'PRESENT' end));
      end loop;
    end if;
  end loop;

  -- Lớp đang học 2 (HSK5): 4 buổi, điểm danh 2 buổi đầu
  for d in 0..3 loop
    insert into public.schedules (class_id, study_date, start_time, end_time, room)
    values (cls_inprog2, (now() - interval '20 days' + (d * interval '5 days'))::date, '17:30', '19:30', 'Phòng 202')
    returning id into sch;
    if d <= 1 then
      foreach i in array array[9,10,11] loop
        insert into public.attendance (schedule_id, student_id, status)
        values (sch, stu[i], 'PRESENT');
      end loop;
    end if;
  end loop;

  -- ====== 6) ĐƠN ĐĂNG KÝ RẢI 6 THÁNG (cho biểu đồ doanh thu) ======
  -- Mỗi tháng vài đơn, trạng thái đa dạng.
  insert into public.registrations (student_id, course_variant_id, package_type, sessions_count, total_amount, status, created_at) values
    (stu[1],  v_hsk3_grp, 'FULL_PACKAGE', 24, 2600000, 'ASSIGNED_CLASS', now() - interval '150 days'),
    (stu[2],  v_gt_grp,   'FULL_PACKAGE', 20, 1900000, 'ASSIGNED_CLASS', now() - interval '145 days'),
    (stu[3],  v_hsk3_vip, 'FULL_PACKAGE', 20, 5800000, 'PAID',           now() - interval '120 days'),
    (stu[4],  v_gt_vip,   'SINGLE_SESSIONS', 8, 2240000, 'PAID',         now() - interval '118 days'),
    (stu[5],  v_hsk3_grp, 'FULL_PACKAGE', 24, 2600000, 'ASSIGNED_CLASS', now() - interval '95 days'),
    (stu[6],  v_gt_grp,   'FULL_PACKAGE', 20, 1900000, 'PAID',           now() - interval '90 days'),
    (stu[7],  v_hsk5_grp, 'FULL_PACKAGE', 30, 4500000, 'PAID',           now() - interval '62 days'),
    (stu[8],  v_tm_vip,   'FULL_PACKAGE', 18, 6000000, 'PAID',           now() - interval '58 days'),
    (stu[9],  v_hsk5_grp, 'FULL_PACKAGE', 30, 4500000, 'ASSIGNED_CLASS', now() - interval '40 days'),
    (stu[10], v_hsk5_grp, 'SINGLE_SESSIONS', 10, 1600000, 'PAID',        now() - interval '35 days'),
    (stu[11], v_gt_vip,   'FULL_PACKAGE', 16, 4300000, 'PAID',           now() - interval '20 days'),
    (stu[12], v_hsk3_grp, 'FULL_PACKAGE', 24, 2600000, 'PENDING',        now() - interval '8 days'),
    (stu[1],  v_gt_vip,   'SINGLE_SESSIONS', 5, 1400000, 'PENDING',      now() - interval '5 days'),
    (stu[5],  v_hsk5_grp, 'FULL_PACKAGE', 30, 4500000, 'PENDING',        now() - interval '3 days'),
    (stu[2],  v_tm_vip,   'FULL_PACKAGE', 18, 6000000, 'CANCELLED',      now() - interval '2 days');

  -- ====== 7) ĐÁNH GIÁ GIÁO VIÊN (lớp đã hoàn thành) ======
  insert into public.teacher_reviews (student_id, teacher_id, class_id, rating, comment, created_at) values
    (stu[1], t1, cls_done, 5, 'Cô Lan dạy rất tâm huyết, dễ hiểu, em đã đậu HSK 3!', now() - interval '10 days'),
    (stu[2], t1, cls_done, 5, 'Phương pháp học khoa học, bài tập sát đề thi.', now() - interval '9 days'),
    (stu[3], t1, cls_done, 4, 'Cô dạy hay nhưng tiến độ hơi nhanh với người mới.', now() - interval '9 days'),
    (stu[4], t1, cls_done, 5, 'Rất hài lòng, sẽ học tiếp khóa HSK 4.', now() - interval '8 days'),
    (stu[5], t1, cls_done, 4, 'Giáo viên nhiệt tình, lớp học vui.', now() - interval '7 days')
  on conflict (student_id, class_id) do nothing;

  -- ====== 8) PHIẾU HỖ TRỢ + HỘI THOẠI ======
  declare
    tk1 uuid; tk2 uuid; tk3 uuid;
  begin
    -- Phiếu 1: đã trả lời
    insert into public.support_tickets (user_id, subject, category, status, created_at, updated_at)
    values (stu[6], 'Em muốn đổi lịch học buổi tối', 'SCHEDULE', 'ANSWERED', now() - interval '4 days', now() - interval '3 days')
    returning id into tk1;
    insert into public.support_messages (ticket_id, sender_id, sender_role, message, created_at) values
      (tk1, stu[6], 'STUDENT', 'Chào trung tâm, em bận đi làm buổi tối thứ 4, có lớp nào khung giờ khác không ạ?', now() - interval '4 days'),
      (tk1, s1,     'STAFF',   'Chào em, bên mình có lớp giao tiếp khung 19h thứ 3-5. Em muốn chuyển sang không ạ?', now() - interval '3 days' - interval '2 hours'),
      (tk1, stu[6], 'STUDENT', 'Dạ em muốn chuyển ạ, cảm ơn anh/chị!', now() - interval '3 days');

    -- Phiếu 2: đang chờ xử lý
    insert into public.support_tickets (user_id, subject, category, status, created_at, updated_at)
    values (stu[9], 'Học phí HSK 5 thanh toán thế nào?', 'PAYMENT', 'OPEN', now() - interval '1 day', now() - interval '1 day')
    returning id into tk2;
    insert into public.support_messages (ticket_id, sender_id, sender_role, message, created_at) values
      (tk2, stu[9], 'STUDENT', 'Em chào trung tâm, cho em hỏi học phí khóa HSK 5 có trả góp được không ạ?', now() - interval '1 day');

    -- Phiếu 3: đã đóng
    insert into public.support_tickets (user_id, subject, category, status, created_at, updated_at)
    values (stu[2], 'Không xem được thời khóa biểu', 'TECHNICAL', 'CLOSED', now() - interval '12 days', now() - interval '11 days')
    returning id into tk3;
    insert into public.support_messages (ticket_id, sender_id, sender_role, message, created_at) values
      (tk3, stu[2], 'STUDENT', 'Em đăng nhập nhưng tab thời khóa biểu trống ạ.', now() - interval '12 days'),
      (tk3, s1,     'STAFF',   'Lớp của em vừa được xếp lịch, em thử tải lại trang giúp mình nhé.', now() - interval '11 days' - interval '3 hours'),
      (tk3, stu[2], 'STUDENT', 'Em thấy rồi ạ, cảm ơn nhiều!', now() - interval '11 days');
  end;

  raise notice 'Seed hoàn tất: 3 GV, 1 NV, 12 HV, 4 khóa học, 5 lớp, đơn 6 tháng, đánh giá & hỗ trợ.';
end $$;
