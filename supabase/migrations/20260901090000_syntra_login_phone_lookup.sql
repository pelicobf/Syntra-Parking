-- Compatibilidad con el adaptador createSupabaseSignIn de @syntra/login.
create or replace function public.get_email_by_phone(p_phone text)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email
  from public.profiles p
  join auth.users u on u.id = p.id
  where regexp_replace(coalesce(p.phone, ''), '[^0-9]', '', 'g') = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
    and length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 10
  limit 1;
$$;

revoke all on function public.get_email_by_phone(text) from public;
grant execute on function public.get_email_by_phone(text) to anon, authenticated;
