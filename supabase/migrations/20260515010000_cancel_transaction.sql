-- Migration: 20260515010000_cancel_transaction.sql
-- Cancel Transaction RPC — Atomic reversal of all side-effects + customer cleanup

-- Update the status check constraint to include 'cancelled'
do $$ begin
  alter table public.transactions drop constraint if exists transactions_status_check;
  alter table public.transactions add constraint transactions_status_check 
    check (status in ('valid', 'voided', 'refunded', 'cancelled'));
exception when others then
  null;
end $$;

create or replace function public.cancel_transaction(
  p_transaction_id uuid,
  p_cancelled_by uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_transaction public.transactions%rowtype;
  v_product_item record;
  v_product public.products%rowtype;
  v_old_data jsonb;
  v_customer_id uuid;
  v_customer_tx_count integer;
begin
  -- 1. Auth check
  if auth.uid() is null then
    raise exception 'Sesi login tidak ditemukan.';
  end if;

  -- 2. Fetch transaction with row lock to prevent concurrent cancellations
  select * into v_transaction
  from public.transactions
  where id = p_transaction_id
  for update;

  if not found then
    raise exception 'Transaksi tidak ditemukan.';
  end if;

  -- 3. Check if already cancelled/voided
  if v_transaction.status in ('voided', 'cancelled') then
    raise exception 'Transaksi ini sudah dibatalkan sebelumnya.';
  end if;

  -- 4. Snapshot old data for audit log
  v_old_data := jsonb_build_object(
    'status', v_transaction.status,
    'total_amount', v_transaction.total_amount,
    'payment_method', v_transaction.payment_method,
    'customer_name', v_transaction.customer_name,
    'customer_id', v_transaction.customer_id
  );

  -- 5. Reverse product stock for all items sold in this transaction
  for v_product_item in
    select tp.product_id, tp.qty, tp.product_name_snapshot
    from public.transaction_products tp
    where tp.transaction_id = p_transaction_id
  loop
    select * into v_product
    from public.products
    where id = v_product_item.product_id;

    if found and v_product.track_stock = true then
      update public.products
      set current_stock = current_stock + v_product_item.qty
      where id = v_product_item.product_id;

      insert into public.stock_movements (
        product_id, business_id, movement_type, quantity,
        previous_stock, new_stock,
        notes, reference_id, created_by
      ) values (
        v_product_item.product_id,
        v_transaction.business_id,
        'void_return',
        v_product_item.qty,
        v_product.current_stock,
        v_product.current_stock + v_product_item.qty,
        'Pembatalan transaksi: ' || coalesce(btrim(p_reason), 'Tanpa alasan'),
        p_transaction_id,
        p_cancelled_by
      );
    end if;
  end loop;

  -- 6. Update transaction status to 'cancelled'
  update public.transactions
  set status = 'cancelled',
      voided_at = timezone('utc', now()),
      voided_by = p_cancelled_by,
      void_reason = coalesce(nullif(btrim(p_reason), ''), 'Dibatalkan oleh pengguna')
  where id = p_transaction_id;

  -- 7. Customer cleanup: delete orphan customer if this was their only transaction
  v_customer_id := v_transaction.customer_id;

  if v_customer_id is not null then
    select count(*) into v_customer_tx_count
    from public.transactions
    where customer_id = v_customer_id
      and id <> p_transaction_id
      and status <> 'cancelled'
      and status <> 'voided';

    if v_customer_tx_count = 0 then
      -- This was the only valid transaction for this customer — safe to remove
      -- First unlink from this (now-cancelled) transaction to satisfy FK
      update public.transactions
      set customer_id = null
      where customer_id = v_customer_id;

      delete from public.customers where id = v_customer_id;
    end if;
  end if;

  -- 8. Create audit log
  insert into public.audit_logs (
    business_id, entity_type, entity_id, action,
    old_data, new_data, created_by
  ) values (
    v_transaction.business_id,
    'transaction',
    p_transaction_id,
    'void',
    v_old_data,
    jsonb_build_object(
      'status', 'cancelled',
      'void_reason', coalesce(nullif(btrim(p_reason), ''), 'Dibatalkan oleh pengguna'),
      'voided_at', timezone('utc', now()),
      'voided_by', p_cancelled_by,
      'customer_deleted', (v_customer_id is not null and v_customer_tx_count = 0)
    ),
    p_cancelled_by
  );

  return jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'status', 'cancelled',
    'customer_deleted', (v_customer_id is not null and v_customer_tx_count = 0),
    'message', 'Transaksi berhasil dibatalkan.'
  );
end;
$$;

-- Grant permissions
revoke all on function public.cancel_transaction(uuid, uuid, text) from public;
grant execute on function public.cancel_transaction(uuid, uuid, text) to authenticated;
