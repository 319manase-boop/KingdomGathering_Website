-- Supabase migration-ready security SQL for public.event_registrations
-- Run this manually in the Supabase SQL editor after reviewing.

-- 1) Ensure row-level security is enabled on event_registrations.
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;

-- 2) Sanitize public count access through a safe RPC helper.
CREATE OR REPLACE FUNCTION public.event_confirmed_registration_counts(event_uuid uuid)
RETURNS TABLE (
  confirmed_registration_count int,
  confirmed_attendee_count int
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT
    count(*) FILTER (WHERE status = 'confirmed') AS confirmed_registration_count,
    coalesce(sum(attendee_count) FILTER (WHERE status = 'confirmed'), 0) AS confirmed_attendee_count
  FROM public.event_registrations
  WHERE event_id = $1;
$$;

GRANT EXECUTE ON FUNCTION public.event_confirmed_registration_counts(uuid) TO public;

-- 3) Allow anonymous users to insert registrations only when the event is open and valid.
DROP POLICY IF EXISTS "Public can insert registrations for open events" ON public.event_registrations;
CREATE POLICY "Public can insert registrations for open events"
  ON public.event_registrations
  FOR INSERT
  TO anon
  WITH CHECK (
    full_name IS NOT NULL
    AND trim(full_name) <> ''
    AND email IS NOT NULL
    AND trim(email) <> ''
    AND phone IS NOT NULL
    AND trim(phone) <> ''
    AND status = 'confirmed'
    AND source IN ('website', 'whatsapp', 'facebook', 'email', 'copied_link', 'other')
    AND EXISTS (
      SELECT 1
      FROM public.events e
      WHERE e.id = event_id
        AND coalesce(e.registration_required, false) = true
        AND lower(coalesce(e.registration_status, 'open')) = 'open'
        AND (e.registration_deadline IS NULL OR e.registration_deadline > now())
        AND (
          e.capacity IS NULL
          OR (
            (
              SELECT coalesce(sum(attendee_count), 0)
              FROM public.event_registrations er
              WHERE er.event_id = event_id
                AND er.status = 'confirmed'
            ) + attendee_count
          ) <= e.capacity
        )
    )
  );

-- 4) Allow authenticated admins to query and manage registrations.
DROP POLICY IF EXISTS "Admins can manage event registrations" ON public.event_registrations;
CREATE POLICY "Admins can manage event registrations"
  ON public.event_registrations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND u.status = 'active'
        AND r.name IN ('Super Admin', 'Media Team')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.roles r ON r.id = u.role_id
      WHERE u.id = auth.uid()
        AND u.status = 'active'
        AND r.name IN ('Super Admin', 'Media Team')
    )
  );

-- 5) Block anonymous select/update/delete on the sensitive registration table.
DROP POLICY IF EXISTS "Public can view registrations" ON public.event_registrations;
CREATE POLICY "Public can view registrations" ON public.event_registrations
  FOR SELECT
  TO anon
  USING (false);

DROP POLICY IF EXISTS "Public can modify registrations" ON public.event_registrations;
CREATE POLICY "Public can modify registrations" ON public.event_registrations
  FOR UPDATE, DELETE
  TO anon
  USING (false)
  WITH CHECK (false);
