-- ============================================================
-- Marketplace step 1: data layer + Dokhus verification gate
-- All tables prefixed mp_*. No existing tables touched.
-- ============================================================

-- Enums
CREATE TYPE public.mp_listing_status AS ENUM ('draft','published','paused','closed');
CREATE TYPE public.mp_offer_status AS ENUM ('pending','accepted','rejected','countered','withdrawn');
CREATE TYPE public.mp_event_kind AS ENUM (
  'listing_created','listing_updated','listing_published','listing_paused','listing_closed',
  'offer_created','offer_countered','offer_accepted','offer_rejected','offer_withdrawn',
  'agent_run'
);

-- ============================================================
-- mp_listings: the consultant's "ask"
-- ============================================================
CREATE TABLE public.mp_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status public.mp_listing_status NOT NULL DEFAULT 'draft',
  -- role + geography
  role text NOT NULL,
  specialization text,
  region text,
  kommun text,
  -- availability window (ISO date strings, kept flexible)
  available_from date,
  available_to date,
  hours_per_week integer,
  employment_type text NOT NULL DEFAULT 'foretagare', -- 'anstalld' | 'foretagare'
  -- price range (SEK / hour, base only — never below SKR floor)
  price_min_sek integer NOT NULL,
  price_max_sek integer NOT NULL,
  currency text NOT NULL DEFAULT 'SEK',
  -- terms & metadata
  terms_md text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- verification snapshot at publish time
  verified_at_publish boolean NOT NULL DEFAULT false,
  signed_at timestamptz,
  published_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mp_listings_price_range CHECK (price_max_sek >= price_min_sek AND price_min_sek > 0),
  CONSTRAINT mp_listings_employment_type CHECK (employment_type IN ('anstalld','foretagare'))
);

CREATE INDEX idx_mp_listings_user ON public.mp_listings(user_id);
CREATE INDEX idx_mp_listings_status ON public.mp_listings(status);
CREATE INDEX idx_mp_listings_role_region ON public.mp_listings(role, region) WHERE status = 'published';

ALTER TABLE public.mp_listings ENABLE ROW LEVEL SECURITY;

-- Updated_at trigger
CREATE TRIGGER trg_mp_listings_updated_at
  BEFORE UPDATE ON public.mp_listings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- mp_offers: agent bids on a listing
-- ============================================================
CREATE TABLE public.mp_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES public.mp_listings(id) ON DELETE CASCADE,
  parent_offer_id uuid REFERENCES public.mp_offers(id) ON DELETE SET NULL, -- for counter-offers
  -- agent identity (no FK to users; agents may be external)
  agent_id text NOT NULL,                -- opaque id supplied by agent
  agent_org text,
  agent_contact text,                    -- email / endpoint
  agent_signature text,                  -- optional cryptographic signature
  -- bid
  offered_price_sek integer NOT NULL,
  start_date date,
  end_date date,
  hours_per_week integer,
  message_md text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.mp_offer_status NOT NULL DEFAULT 'pending',
  -- response token for agent to read its own offer back
  response_token text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  responded_at timestamptz,
  responded_message_md text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mp_offers_price_positive CHECK (offered_price_sek > 0)
);

CREATE INDEX idx_mp_offers_listing ON public.mp_offers(listing_id);
CREATE INDEX idx_mp_offers_status ON public.mp_offers(status);
CREATE UNIQUE INDEX idx_mp_offers_response_token ON public.mp_offers(response_token);

ALTER TABLE public.mp_offers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_mp_offers_updated_at
  BEFORE UPDATE ON public.mp_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- mp_negotiation_events: audit trail
-- ============================================================
CREATE TABLE public.mp_negotiation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.mp_listings(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES public.mp_offers(id) ON DELETE CASCADE,
  actor_kind text NOT NULL,        -- 'consultant' | 'agent' | 'system'
  actor_id text,
  kind public.mp_event_kind NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mp_events_listing ON public.mp_negotiation_events(listing_id);
CREATE INDEX idx_mp_events_offer ON public.mp_negotiation_events(offer_id);
CREATE INDEX idx_mp_events_kind ON public.mp_negotiation_events(kind);

ALTER TABLE public.mp_negotiation_events ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- mp_agent_runs: per-call log of agent API hits
-- ============================================================
CREATE TABLE public.mp_agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  listing_id uuid REFERENCES public.mp_listings(id) ON DELETE SET NULL,
  offer_id uuid REFERENCES public.mp_offers(id) ON DELETE SET NULL,
  action text NOT NULL,            -- 'read_listing' | 'create_offer' | 'counter' | 'withdraw'
  request_payload jsonb,
  response_payload jsonb,
  status_code integer,
  client_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mp_agent_runs_agent ON public.mp_agent_runs(agent_id);
CREATE INDEX idx_mp_agent_runs_listing ON public.mp_agent_runs(listing_id);
CREATE INDEX idx_mp_agent_runs_created ON public.mp_agent_runs(created_at DESC);

ALTER TABLE public.mp_agent_runs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- Helper: Dokhus verification gate
-- A listing can only enter status='published' if the consultant's
-- profile is fully verified (digital signature + >=2 references).
-- Uses cached columns on public.profiles maintained by
-- ref_calculate_profile_status().
-- ============================================================
CREATE OR REPLACE FUNCTION public.mp_can_publish(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT has_bankid AND has_required_references AND profile_status = 'complete'
     FROM public.profiles
     WHERE user_id = _user_id),
    false
  )
$$;

-- Trigger: enforce gate on publish
CREATE OR REPLACE FUNCTION public.mp_listings_enforce_publish_gate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status <> 'published') THEN
    IF NOT public.mp_can_publish(NEW.user_id) THEN
      RAISE EXCEPTION 'Listing kan inte publiceras: Dokhus-verifiering saknas (digital signering + minst 2 referenser krävs).'
        USING ERRCODE = 'check_violation';
    END IF;
    NEW.verified_at_publish := true;
    NEW.published_at := COALESCE(NEW.published_at, now());
  END IF;

  IF NEW.status = 'closed' AND (TG_OP = 'INSERT' OR OLD.status <> 'closed') THEN
    NEW.closed_at := COALESCE(NEW.closed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mp_listings_publish_gate
  BEFORE INSERT OR UPDATE ON public.mp_listings
  FOR EACH ROW EXECUTE FUNCTION public.mp_listings_enforce_publish_gate();

-- ============================================================
-- RLS Policies
-- ============================================================

-- mp_listings
CREATE POLICY "mp_listings_owner_all"
  ON public.mp_listings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "mp_listings_published_readable"
  ON public.mp_listings
  FOR SELECT
  USING (status = 'published');

CREATE POLICY "mp_listings_admin_all"
  ON public.mp_listings
  FOR ALL
  USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));

-- mp_offers
CREATE POLICY "mp_offers_listing_owner_select"
  ON public.mp_offers
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.mp_listings l
                 WHERE l.id = mp_offers.listing_id
                   AND l.user_id = auth.uid()));

CREATE POLICY "mp_offers_listing_owner_update"
  ON public.mp_offers
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.mp_listings l
                 WHERE l.id = mp_offers.listing_id
                   AND l.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.mp_listings l
                      WHERE l.id = mp_offers.listing_id
                        AND l.user_id = auth.uid()));

CREATE POLICY "mp_offers_admin_all"
  ON public.mp_offers
  FOR ALL
  USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));

-- mp_negotiation_events: read-only for listing owner + admin; writes via service_role only
CREATE POLICY "mp_events_owner_select"
  ON public.mp_negotiation_events
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.mp_listings l
                 WHERE l.id = mp_negotiation_events.listing_id
                   AND l.user_id = auth.uid()));

CREATE POLICY "mp_events_admin_all"
  ON public.mp_negotiation_events
  FOR ALL
  USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));

-- mp_agent_runs: admin only
CREATE POLICY "mp_agent_runs_admin_all"
  ON public.mp_agent_runs
  FOR ALL
  USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));
