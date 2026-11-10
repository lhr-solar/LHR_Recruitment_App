-- Local test data only. `supabase db reset` loads this after the migrations; it never runs against
-- the hosted project. Every address here is a test address: sign in with it at localhost:3000 and
-- open the email in Mailpit (http://127.0.0.1:54324).

-- Students already on a roster: sign in through the LHR member door and land on My profile.
insert into public.roster_entries (email, team) values
  ('solar.member@utexas.edu', 'solar'),
  ('electric.member@utexas.edu', 'electric'),
  ('combustion.member@utexas.edu', 'combustion');

-- Any other @utexas.edu address (try new.member@utexas.edu) goes through the join request flow.

-- A Partner company with an invited recruiter: sign in through the Partner door as
-- recruiter@partner.example and land on Partner home. Any other non-UT address
-- (try someone@company.example) gets the Partner access request form.
insert into public.partner_companies (id, name, website, description) values
  ('00000000-0000-4000-8000-000000000001', 'Test Partner Co', 'https://partner.example', 'Local test company.');

insert into public.partner_invites (email, company_id) values
  ('recruiter@partner.example', '00000000-0000-4000-8000-000000000001');
