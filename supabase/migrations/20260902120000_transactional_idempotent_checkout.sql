-- ParkFlow · cobro y cierre de estancia atómicos e idempotentes.
begin;

-- Una estancia solo puede tener un cobro vigente. Los pagos anulados no bloquean
-- un cobro posterior autorizado.
create unique index if not exists one_active_payment_per_parking_stay
  on public.parking_payments(stay_id)
  where voided_at is null;

create or replace function public.checkout_parking_stay(
  p_stay_id uuid,
  p_shift_id uuid,
  p_method public.parking_payment_method
)
returns table (
  payment_id uuid,
  stay_id uuid,
  shift_id uuid,
  amount numeric,
  method public.parking_payment_method,
  paid_at timestamptz,
  exited_at timestamptz,
  already_processed boolean
)
language plpgsql
security definer
set search_path=public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_stay public.parking_stays%rowtype;
  v_shift public.parking_shifts%rowtype;
  v_payment public.parking_payments%rowtype;
  v_paid_at timestamptz := clock_timestamp();
  v_amount numeric(10,2);
begin
  if v_actor_id is null then
    raise exception 'Debes iniciar sesión para procesar el cobro';
  end if;

  -- Serializa todos los intentos sobre el mismo boleto. El segundo operador
  -- continúa solamente después de que el primero confirme o revierta.
  select * into v_stay
  from public.parking_stays
  where id=p_stay_id
  for update;

  if not found then
    raise exception 'La estancia no existe';
  end if;

  if not public.has_parking_lot_access(v_stay.business_id,v_stay.lot_id)
    or not public.has_parking_permission(v_stay.business_id,'stays.checkout')
    or not public.has_parking_permission(v_stay.business_id,'payments.create') then
    raise exception 'No tienes permisos para cobrar esta estancia';
  end if;

  -- Una respuesta repetida es exitosa e idéntica: no vuelve a cobrar.
  if v_stay.status='paid' then
    select * into v_payment
    from public.parking_payments
    where parking_payments.stay_id=v_stay.id and voided_at is null
    order by paid_at desc
    limit 1;

    if not found then
      raise exception 'La estancia figura pagada pero no tiene un pago vigente';
    end if;

    return query select
      v_payment.id,v_payment.stay_id,v_payment.shift_id,v_payment.amount,
      v_payment.method,v_payment.paid_at,v_stay.exited_at,true;
    return;
  end if;

  if v_stay.status not in ('active','pending_payment') then
    raise exception 'La estancia no está disponible para cobro (estado: %)',v_stay.status;
  end if;

  select * into v_shift
  from public.parking_shifts
  where id=p_shift_id
  for update;

  if not found or v_shift.closed_at is not null then
    raise exception 'El turno de caja no está abierto';
  end if;

  if v_shift.business_id<>v_stay.business_id or v_shift.lot_id<>v_stay.lot_id then
    raise exception 'El turno de caja no corresponde a la estancia';
  end if;

  v_amount := public.calculate_parking_fee(v_stay.id,v_paid_at);
  if v_amount is null then
    raise exception 'No fue posible calcular la tarifa de la estancia';
  end if;

  insert into public.parking_payments(
    business_id,lot_id,stay_id,shift_id,method,amount,received_by,paid_at
  ) values (
    v_stay.business_id,v_stay.lot_id,v_stay.id,v_shift.id,p_method,v_amount,v_actor_id,v_paid_at
  ) returning * into v_payment;

  update public.parking_stays
  set status='paid',exited_at=v_paid_at,amount_due=v_amount,closed_by=v_actor_id
  where id=v_stay.id;

  insert into public.parking_audit_log(
    business_id,lot_id,actor_id,action,entity,entity_id,details
  ) values (
    v_stay.business_id,v_stay.lot_id,v_actor_id,'checkout','parking_stay',v_stay.id::text,
    jsonb_build_object(
      'payment_id',v_payment.id,
      'shift_id',v_shift.id,
      'amount',v_amount,
      'method',p_method
    )
  );

  return query select
    v_payment.id,v_payment.stay_id,v_payment.shift_id,v_payment.amount,
    v_payment.method,v_payment.paid_at,v_paid_at,false;
end;
$$;

revoke all on function public.checkout_parking_stay(uuid,uuid,public.parking_payment_method)
  from public,anon;
grant execute on function public.checkout_parking_stay(uuid,uuid,public.parking_payment_method)
  to authenticated;

comment on function public.checkout_parking_stay(uuid,uuid,public.parking_payment_method)
  is 'Cobra y cierra una estancia en una sola transacción; reintentos devuelven el pago vigente.';

commit;
