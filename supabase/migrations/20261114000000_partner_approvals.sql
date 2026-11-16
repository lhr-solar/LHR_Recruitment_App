-- Admins approve or decline Partner access requests. Approving links the requester to a company:
-- one the admin picks, or a new one made from the request (an existing company with the same name
-- is reused rather than duplicated).
--   Signed-in requester: their account becomes an active recruiter at that company right away.
--   Public-form request with no account yet: an invite is created, so their first sign-in lets them in.
-- Someone who asked more than once has every pending request closed by the one decision.
create function public.review_partner_request(p_request_id uuid, p_approve boolean, p_company_id uuid default null)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  v_req public.partner_access_requests;
  v_company uuid;
begin
  if not public.is_admin() then
    raise exception 'Only admins can review Partner requests' using errcode = '42501';
  end if;

  select * into v_req from public.partner_access_requests where id = p_request_id for update;
  if not found then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'pending' then
    raise exception 'This request has already been reviewed' using errcode = '55000';
  end if;

  if not p_approve then
    update public.partner_access_requests
      set status = 'declined', reviewed_by = auth.uid(), reviewed_at = now()
      where id = p_request_id or (email = v_req.email and status = 'pending');
    update public.profiles set status = 'rejected'
      where id = v_req.user_id and account_type = 'partner' and status = 'pending';
    return null;
  end if;

  if p_company_id is not null then
    select id into v_company from public.partner_companies where id = p_company_id;
    if not found then
      raise exception 'Company not found' using errcode = 'P0002';
    end if;
  else
    select id into v_company from public.partner_companies where lower(name) = lower(btrim(v_req.company_name));
    if not found then
      insert into public.partner_companies (name, website)
      values (btrim(v_req.company_name), v_req.company_website)
      returning id into v_company;
    end if;
  end if;

  if v_req.user_id is not null then
    update public.profiles set account_type = 'partner', status = 'active'
      where id = v_req.user_id and account_type = 'partner';
    insert into public.partner_members (user_id, company_id, title)
      values (v_req.user_id, v_company, v_req.title)
      on conflict (user_id) do update set company_id = excluded.company_id;
  else
    insert into public.partner_invites (email, company_id, invited_by)
      values (v_req.email, v_company, auth.uid())
      on conflict (email) where accepted_at is null do update set company_id = excluded.company_id;
  end if;

  update public.partner_access_requests
    set status = 'approved', company_id = v_company, reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_request_id or (email = v_req.email and status = 'pending');
  return v_company;
end;
$$;

revoke execute on function public.review_partner_request(uuid, boolean, uuid) from anon, public;
grant execute on function public.review_partner_request(uuid, boolean, uuid) to authenticated;
