-- Newsletter subscribers table for future email campaigns
-- Run this in the Supabase SQL editor.

create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'unknown',
  status text not null default 'active' check (status in ('active', 'unsubscribed')),
  campaign_preferences jsonb not null default '{"blog_posts": true, "events": true, "announcements": true}',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.newsletter_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  campaign_type text not null default 'Announcement' check (lower(campaign_type) in ('blog', 'event', 'announcement')),
  content text not null default '',
  featured_image text default '',
  status text not null default 'draft' check (status in ('draft', 'ready', 'scheduled', 'sending', 'sent', 'failed')),
  scheduled_for timestamp with time zone,
  created_by text,
  campaign_key text,
  source_type text,
  source_id text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create table if not exists public.newsletter_campaign_logs (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.newsletter_campaigns(id) on delete cascade,
  subscriber_id uuid references public.newsletter_subscribers(id) on delete set null,
  email text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  resend_email_id text,
  error_message text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

create index if not exists idx_newsletter_campaigns_created_at on public.newsletter_campaigns (created_at desc);
create index if not exists idx_newsletter_campaigns_status on public.newsletter_campaigns (status);
create index if not exists idx_newsletter_campaigns_type on public.newsletter_campaigns (lower(campaign_type));
create unique index if not exists idx_newsletter_campaigns_campaign_key_unique on public.newsletter_campaigns (campaign_key) where campaign_key is not null;
create index if not exists idx_newsletter_campaign_logs_campaign_id on public.newsletter_campaign_logs (campaign_id);
create index if not exists idx_newsletter_campaign_logs_status on public.newsletter_campaign_logs (status);
create unique index if not exists idx_newsletter_campaign_logs_campaign_email_unique on public.newsletter_campaign_logs (campaign_id, email);
create index if not exists idx_newsletter_subscribers_created_at on public.newsletter_subscribers (created_at desc);
create index if not exists idx_newsletter_subscribers_status on public.newsletter_subscribers (status);

create or replace function public.set_newsletter_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger trg_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row
execute function public.set_newsletter_updated_at();

drop trigger if exists trg_newsletter_campaigns_updated_at on public.newsletter_campaigns;
create trigger trg_newsletter_campaigns_updated_at
before update on public.newsletter_campaigns
for each row
execute function public.set_newsletter_updated_at();

drop trigger if exists trg_newsletter_campaign_logs_updated_at on public.newsletter_campaign_logs;
create trigger trg_newsletter_campaign_logs_updated_at
before update on public.newsletter_campaign_logs
for each row
execute function public.set_newsletter_updated_at();
