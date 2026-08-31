-- ParkFlow · modalidad de tarifa por tiempo o tiempo libre.
-- Ejecutar manualmente después de 20260831170000_vehicle_types_and_rates.sql.
begin;

alter table public.parking_rate_plans
  add column if not exists pricing_mode text not null default 'fraction'
    check(pricing_mode in('fraction','free_time')),
  add column if not exists flat_price numeric(10,2)
    check(flat_price is null or flat_price>=0);

create or replace function public.calculate_parking_fee(p_stay_id uuid,p_at timestamptz default now())
returns numeric language sql stable security invoker as $$
  select case
    when r.pricing_mode='free_time' then coalesce(r.flat_price,0)
    else least(
      coalesce(r.daily_max,999999),
      greatest(0,ceil(greatest(0,extract(epoch from(p_at-s.entered_at))/60-r.grace_minutes)/r.fraction_minutes))*r.price_per_fraction
    )
  end
  from public.parking_stays s
  join public.parking_rate_plans r on r.id=s.rate_plan_id
  where s.id=p_stay_id;
$$;

commit;
