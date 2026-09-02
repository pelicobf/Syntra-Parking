begin;

do $$
declare
  realtime_table text;
begin
  foreach realtime_table in array array[
    'parking_businesses',
    'parking_lots',
    'parking_memberships',
    'parking_rate_plans',
    'parking_vehicle_types',
    'parking_cash_registers',
    'parking_shifts',
    'parking_stays',
    'parking_payments',
    'parking_subscription_payments',
    'parking_roles',
    'parking_role_permissions',
    'parking_membership_lots'
  ]
  loop
    if to_regclass('public.' || realtime_table) is not null
      and not exists (
        select 1
        from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = realtime_table
      )
    then
      execute format(
        'alter publication supabase_realtime add table public.%I',
        realtime_table
      );
    end if;
  end loop;
end
$$;

commit;
