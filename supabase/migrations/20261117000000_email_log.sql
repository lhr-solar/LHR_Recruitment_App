-- Email log: one row per recipient of every email the app sends. Resend's webhook fills in
-- delivery, opens, clicks and bounces as they happen, and admins review it.

create type public.email_status as enum ('sent', 'delivered', 'delayed', 'bounced', 'complained', 'failed');

create table public.email_log (
  id bigint generated always as identity primary key,
  resend_id text unique,
  kind text not null,
  recipient text not null,
  recipient_user_id uuid references public.profiles (id) on delete set null,
  subject text not null,
  status public.email_status not null default 'sent',
  -- Why a send failed or bounced, in Resend's words.
  detail text,
  sent_at timestamptz not null default now(),
  delivered_at timestamptz,
  opened_at timestamptz,
  last_opened_at timestamptz,
  open_count int not null default 0,
  clicked_at timestamptz,
  click_count int not null default 0
);
create index email_log_recent_idx on public.email_log (sent_at desc);
create index email_log_recipient_idx on public.email_log (recipient_user_id, sent_at desc);
create index email_log_kind_idx on public.email_log (kind, sent_at desc);

-- Links each row to the recipient's account, when they have one.
create function public.email_log_link_recipient()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  new.recipient := lower(btrim(new.recipient));
  if new.recipient_user_id is null then
    select id into new.recipient_user_id from public.profiles where lower(email) = new.recipient limit 1;
  end if;
  return new;
end;
$$;

create trigger email_log_link_recipient before insert on public.email_log
  for each row execute function public.email_log_link_recipient();

-- Webhook deliveries already applied. Resend retries until it gets a 2xx, so the same event can
-- arrive twice; this keeps opens and clicks from being counted twice.
create table public.email_webhook_events (
  id text primary key,
  received_at timestamptz not null default now()
);

-- Applies one Resend event. Events can arrive out of order, so a later "delivered" never
-- overwrites a bounce, and an open or click implies the email was delivered.
create function public.record_email_event(p_event_id text, p_resend_id text, p_type text, p_at timestamptz, p_detail text default null)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.email_webhook_events (id) values (p_event_id) on conflict do nothing;
  if not found then
    return;
  end if;

  case p_type
    when 'email.delivered' then
      update public.email_log
        set delivered_at = coalesce(delivered_at, p_at),
            status = case when status in ('sent', 'delayed') then 'delivered'::public.email_status else status end
        where resend_id = p_resend_id;
    when 'email.delivery_delayed' then
      update public.email_log set status = 'delayed', detail = coalesce(p_detail, detail)
        where resend_id = p_resend_id and status = 'sent';
    when 'email.bounced' then
      update public.email_log set status = 'bounced', detail = p_detail where resend_id = p_resend_id;
    when 'email.complained' then
      update public.email_log set status = 'complained' where resend_id = p_resend_id;
    when 'email.failed', 'email.suppressed' then
      update public.email_log set status = 'failed', detail = p_detail where resend_id = p_resend_id;
    when 'email.opened' then
      update public.email_log
        set opened_at = least(coalesce(opened_at, p_at), p_at),
            last_opened_at = greatest(coalesce(last_opened_at, p_at), p_at),
            open_count = open_count + 1,
            delivered_at = coalesce(delivered_at, p_at),
            status = case when status in ('sent', 'delayed') then 'delivered'::public.email_status else status end
        where resend_id = p_resend_id;
    when 'email.clicked' then
      update public.email_log
        set clicked_at = least(coalesce(clicked_at, p_at), p_at),
            click_count = click_count + 1,
            -- A click means it was opened, even when the mail app blocked the open pixel.
            opened_at = coalesce(opened_at, p_at),
            last_opened_at = greatest(coalesce(last_opened_at, p_at), p_at),
            delivered_at = coalesce(delivered_at, p_at),
            status = case when status in ('sent', 'delayed') then 'delivered'::public.email_status else status end
        where resend_id = p_resend_id;
    else
      null;
  end case;
end;
$$;

-- Only the server (secret key) writes the log; admins read it.
alter table public.email_log enable row level security;
alter table public.email_webhook_events enable row level security;

create policy "email log admin read" on public.email_log for select
  using (public.is_admin());

revoke all on public.email_log from anon;
revoke all on public.email_webhook_events from anon, authenticated;
revoke execute on function public.record_email_event(text, text, text, timestamptz, text) from public, anon, authenticated;
revoke execute on function public.email_log_link_recipient() from public, anon, authenticated;
grant execute on function public.record_email_event(text, text, text, timestamptz, text) to service_role;
