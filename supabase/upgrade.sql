-- Run this ONCE in Supabase > SQL Editor, after Steps 3 to 5 are done.
-- It adds the email column the Users page needs and a few indexes.

-- 1. Store email on profiles so the admin can see who is who
alter table profiles add column if not exists email text;

-- 2. Backfill profiles for any auth users that do not have one yet
insert into profiles (id, full_name, email)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', ''), u.email
from auth.users u
on conflict (id) do nothing;

-- 3. Backfill email for existing profiles
update profiles p set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- 4. Make the signup trigger store the email too
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

-- 5. Indexes on foreign keys (faster joins as data grows)
create index if not exists idx_students_department on students(department_id);
create index if not exists idx_courses_teacher on courses(teacher_id);
create index if not exists idx_enrollments_student on enrollments(student_id);
create index if not exists idx_enrollments_course on enrollments(course_id);
create index if not exists idx_attendance_enrollment on attendance(enrollment_id);
create index if not exists idx_marks_enrollment on marks(enrollment_id);

-- OPTIONAL (stricter): let teachers write attendance and marks only for
-- courses assigned to them. Run this block only if you want that rule.
-- It replaces the two "staff write" policies from Step 5.
--
-- drop policy if exists "att staff write" on attendance;
-- drop policy if exists "marks staff write" on marks;
--
-- create policy "att write" on attendance for all to authenticated
--   using (
--     public.my_role() = 'admin'
--     or exists (select 1 from enrollments e join courses c on c.id = e.course_id
--                where e.id = enrollment_id and c.teacher_id = auth.uid())
--   )
--   with check (
--     public.my_role() = 'admin'
--     or exists (select 1 from enrollments e join courses c on c.id = e.course_id
--                where e.id = enrollment_id and c.teacher_id = auth.uid())
--   );
--
-- create policy "marks write" on marks for all to authenticated
--   using (
--     public.my_role() = 'admin'
--     or exists (select 1 from enrollments e join courses c on c.id = e.course_id
--                where e.id = enrollment_id and c.teacher_id = auth.uid())
--   )
--   with check (
--     public.my_role() = 'admin'
--     or exists (select 1 from enrollments e join courses c on c.id = e.course_id
--                where e.id = enrollment_id and c.teacher_id = auth.uid())
--   );
