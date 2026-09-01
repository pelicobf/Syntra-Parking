-- Acceso operativo global para superadministradores de Syntra ParkFlow.
-- Ejecutar manualmente en Supabase antes de usar el selector de empresas.
begin;

create or replace function public.has_parking_lot_access(p_business_id uuid,p_lot_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_parkflow_super_admin() or exists (
    select 1
    from public.parking_memberships m
    join public.parking_membership_lots ml on ml.membership_id=m.id
    join public.parking_lots l on l.id=ml.lot_id and l.business_id=m.business_id and l.active
    where m.business_id=p_business_id
      and m.user_id=auth.uid()
      and m.active
      and ml.lot_id=p_lot_id
  );
$$;

create or replace function public.has_parking_permission(p_business_id uuid,p_permission text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select public.is_parkflow_super_admin() or exists (
    select 1
    from public.parking_memberships m
    left join public.parking_roles r on r.id=m.role_id and r.business_id=m.business_id and r.active
    where m.business_id=p_business_id
      and m.user_id=auth.uid()
      and m.active
      and (
        (m.permission_codes is not null and p_permission=any(m.permission_codes))
        or (m.permission_codes is null and exists (
          select 1 from public.parking_role_permissions rp
          where rp.role_id=r.id and rp.permission_code=p_permission
        ))
      )
  );
$$;

drop policy if exists "members read vehicle types" on public.parking_vehicle_types;
create policy "members read vehicle types" on public.parking_vehicle_types
for select to authenticated using(
  public.is_parkflow_super_admin() or exists(
    select 1 from public.parking_memberships m
    where m.business_id=parking_vehicle_types.business_id
      and m.user_id=auth.uid()
      and m.active
  )
);

revoke all on function public.has_parking_lot_access(uuid,uuid) from public,anon;
revoke all on function public.has_parking_permission(uuid,text) from public,anon;
grant execute on function public.has_parking_lot_access(uuid,uuid) to authenticated;
grant execute on function public.has_parking_permission(uuid,text) to authenticated;

commit;
