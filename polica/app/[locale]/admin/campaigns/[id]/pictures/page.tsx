-- POLICA: non-breaking campaign evidence index
-- Keeps existing storage objects in job-evidence unchanged.
-- Organizes photos logically by campaign through database relationships.

create table if not exists public.campaign_evidence (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.campaigns(id) on delete restrict,
  job_id uuid not null references public.jobs(id) on delete restrict,
  submission_id uuid not null unique references public.submissions(id) on delete restrict,
  photo_path text not null,
  created_at timestamptz not null default now()
);

create index if not exists campaign_evidence_campaign_created_idx
on public.campaign_evidence(campaign_id, created_at desc);

create index if not exists campaign_evidence_job_idx
on public.campaign_evidence(job_id);

alter table public.campaign_evidence enable row level security;

drop policy if exists "Admins read campaign evidence" on public.campaign_evidence;
create policy "Admins read campaign evidence"
on public.campaign_evidence
for select
to authenticated
using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.banned_at is null
  )
);

create or replace function public.sync_submission_campaign_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campaign uuid;
begin
  if new.photo_path is null or length(trim(new.photo_path)) = 0 then
    return new;
  end if;

  select campaign_id into v_campaign
  from public.jobs
  where id = new.job_id;

  if v_campaign is null then
    return new;
  end if;

  insert into public.campaign_evidence(
    campaign_id,
    job_id,
    submission_id,
    photo_path,
    created_at
  )
  values(
    v_campaign,
    new.job_id,
    new.id,
    new.photo_path,
    coalesce(new.created_at, now())
  )
  on conflict (submission_id)
  do update set
    campaign_id = excluded.campaign_id,
    job_id = excluded.job_id,
    photo_path = excluded.photo_path;

  return new;
end;
$$;

drop trigger if exists submissions_campaign_evidence_sync on public.submissions;
create trigger submissions_campaign_evidence_sync
after insert or update of photo_path, job_id
on public.submissions
for each row
execute function public.sync_submission_campaign_evidence();

-- Backfill any existing submissions whose jobs already belong to campaigns.
insert into public.campaign_evidence(
  campaign_id,
  job_id,
  submission_id,
  photo_path,
  created_at
)
select
  j.campaign_id,
  s.job_id,
  s.id,
  s.photo_path,
  s.created_at
from public.submissions s
join public.jobs j on j.id = s.job_id
where j.campaign_id is not null
  and s.photo_path is not null
  and length(trim(s.photo_path)) > 0
on conflict (submission_id)
do update set
  campaign_id = excluded.campaign_id,
  job_id = excluded.job_id,
  photo_path = excluded.photo_path;

-- When an existing job is attached to a campaign later,
-- index its existing evidence without moving storage files.
create or replace function public.admin_attach_jobs_to_campaign(
  p_campaign uuid,
  p_job_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.banned_at is null
  ) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  if not exists (select 1 from public.campaigns where id = p_campaign) then
    raise exception 'CAMPAIGN_NOT_FOUND';
  end if;

  update public.jobs
  set campaign_id = p_campaign
  where id = any(p_job_ids)
    and campaign_id is null;

  get diagnostics v_count = row_count;

  insert into public.campaign_evidence(
    campaign_id,
    job_id,
    submission_id,
    photo_path,
    created_at
  )
  select
    p_campaign,
    s.job_id,
    s.id,
    s.photo_path,
    s.created_at
  from public.submissions s
  where s.job_id = any(p_job_ids)
    and s.photo_path is not null
    and length(trim(s.photo_path)) > 0
  on conflict (submission_id)
  do update set
    campaign_id = excluded.campaign_id,
    job_id = excluded.job_id,
    photo_path = excluded.photo_path;

  insert into public.activity_events(
    user_id,
    event_type,
    entity_type,
    entity_id,
    metadata
  )
  values(
    auth.uid(),
    'jobs_attached_to_campaign',
    'campaign',
    p_campaign,
    jsonb_build_object('job_count', v_count)
  );

  return v_count;
end;
$$;

grant execute on function public.admin_attach_jobs_to_campaign(uuid, uuid[])
to authenticated;
