-- Permisos atómicos por usuario. NULL conserva los permisos predeterminados del rol;
-- un arreglo explícito permite al propietario personalizar cada acceso.
alter table public.parking_memberships
  add column if not exists permission_codes text[];

insert into public.parking_permissions (code,module,name,description) values
  ('cash_cuts.view','cash_cuts','Ver cortes de caja','Consultar el historial de cierres de caja.'),
  ('settings.view','settings','Ver configuración','Consultar tarifas, tipos de unidad y manuales.')
on conflict (code) do update set module=excluded.module,name=excluded.name,description=excluded.description;

select public.seed_parking_roles(id) from public.parking_businesses;

create or replace function public.has_parking_permission(p_business_id uuid,p_permission text)
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select exists (
    select 1
    from public.parking_memberships m
    left join public.parking_roles r on r.id=m.role_id and r.business_id=m.business_id and r.active
    where m.business_id=p_business_id
      and m.user_id=auth.uid()
      and m.active
      and (
        (m.permission_codes is not null and p_permission=any(m.permission_codes))
        or
        (m.permission_codes is null and exists (
          select 1 from public.parking_role_permissions rp
          where rp.role_id=r.id and rp.permission_code=p_permission
        ))
      )
  );
$$;

create or replace function public.get_my_parking_context()
returns table (
  membership_id uuid,
  business_id uuid,
  business_name text,
  role_key text,
  role_name text,
  permission_codes text[],
  lot_ids uuid[]
)
language sql
stable
security definer
set search_path=public
as $$
  select
    m.id,
    m.business_id,
    b.name,
    r.key,
    r.name,
    coalesce(
      m.permission_codes,
      array(select rp.permission_code from public.parking_role_permissions rp where rp.role_id=r.id order by rp.permission_code),
      '{}'
    ),
    coalesce(array(select ml.lot_id from public.parking_membership_lots ml where ml.membership_id=m.id order by ml.lot_id),'{}')
  from public.parking_memberships m
  join public.parking_businesses b on b.id=m.business_id and b.active
  join public.parking_roles r on r.id=m.role_id and r.active
  where m.user_id=auth.uid() and m.active;
$$;

revoke all on function public.has_parking_permission(uuid,text) from public,anon;
revoke all on function public.get_my_parking_context() from public,anon;
grant execute on function public.has_parking_permission(uuid,text) to authenticated;
grant execute on function public.get_my_parking_context() to authenticated;

-- Las políticas de lectura también respetan el módulo asignado. Reportes puede
-- consultar estancias y pagos sin conceder acceso al módulo operativo.
drop policy if exists "lot staff read stays" on public.parking_stays;
create policy "module users read stays" on public.parking_stays
for select to authenticated using(
  public.has_parking_lot_access(business_id,lot_id)
  and (
    public.has_parking_permission(business_id,'stays.view')
    or public.has_parking_permission(business_id,'reports.view')
    or public.has_parking_permission(business_id,'dashboard.view')
  )
);

drop policy if exists "lot staff read payments" on public.parking_payments;
create policy "module users read payments" on public.parking_payments
for select to authenticated using(
  public.has_parking_lot_access(business_id,lot_id)
  and (
    public.has_parking_permission(business_id,'payments.view')
    or public.has_parking_permission(business_id,'reports.view')
    or public.has_parking_permission(business_id,'cash_cuts.view')
    or public.has_parking_permission(business_id,'dashboard.view')
  )
);

drop policy if exists "lot staff read shifts" on public.parking_shifts;
create policy "module users read shifts" on public.parking_shifts
for select to authenticated using(
  public.has_parking_lot_access(business_id,lot_id)
  and (
    public.has_parking_permission(business_id,'shifts.view')
    or public.has_parking_permission(business_id,'cash_cuts.view')
  )
);

drop policy if exists "lot staff read cash registers" on public.parking_cash_registers;
create policy "module users read cash registers" on public.parking_cash_registers
for select to authenticated using(
  public.has_parking_lot_access(business_id,lot_id)
  and public.has_parking_permission(business_id,'shifts.view')
);

-- Los propietarios conservan todos los permisos a través del rol. Para los
-- usuarios existentes, NULL mantiene los permisos predeterminados de su rol.
