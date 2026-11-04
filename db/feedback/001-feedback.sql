-- Apply explicitly using a private migration role. Never migrated implicitly at request time.
BEGIN;
CREATE SCHEMA IF NOT EXISTS atlas_feedback;
CREATE TABLE atlas_feedback.auth_transactions (
  state_hash text PRIMARY KEY, challenge text NOT NULL, canonical_origin text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, claimed_at timestamptz
);
CREATE TABLE atlas_feedback.sessions (
  token_hash text PRIMARY KEY, github_id bigint NOT NULL, login text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz
);
CREATE TABLE atlas_feedback.feedback (
  id uuid PRIMARY KEY, owner_github_id bigint NOT NULL, version integer NOT NULL CHECK(version > 0),
  state text NOT NULL CHECK(state IN ('received','queued','working','validating','publishing','pr_ready','merged','live','needs_clarification','needs_human_review','failed','cancelled')),
  input_private jsonb NOT NULL, approved_public jsonb NOT NULL, public_context jsonb NOT NULL,
  approval_hash text NOT NULL, approval_version text NOT NULL, base_sha text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  last_reason_code text, clarification text, pr_number integer CHECK(pr_number > 0), pr_head_sha text,
  preview_url text, preview_verified_sha text, merged_sha text, live_sha text
);
CREATE INDEX feedback_owner_recent ON atlas_feedback.feedback(owner_github_id, created_at DESC, id);
CREATE TABLE atlas_feedback.idempotency (
  owner_github_id bigint NOT NULL, operation text NOT NULL, key uuid NOT NULL, request_hash text NOT NULL,
  feedback_id uuid NOT NULL REFERENCES atlas_feedback.feedback(id), response_metadata jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(owner_github_id, operation, key)
);
CREATE TABLE atlas_feedback.jobs (
  id uuid PRIMARY KEY, feedback_id uuid NOT NULL REFERENCES atlas_feedback.feedback(id), input_version integer NOT NULL,
  approval_hash text NOT NULL, payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK(state IN ('pending','leased','working','validating','publishing','completed','cancelled','failed','parked')),
  attempt integer NOT NULL DEFAULT 0 CHECK(attempt BETWEEN 0 AND 2), lease_until timestamptz,
  fencing_token bigint NOT NULL DEFAULT 0, base_sha text, reserved_cost numeric NOT NULL DEFAULT 0 CHECK(reserved_cost >= 0 AND reserved_cost < 'Infinity'::numeric),
  charged_cost numeric NOT NULL DEFAULT 0 CHECK(charged_cost >= 0 AND charged_cost < 'Infinity'::numeric),
  patch_digest text, candidate_ref text, last_reason_code text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(feedback_id,input_version)
);
CREATE UNIQUE INDEX one_active_feedback_job ON atlas_feedback.jobs(feedback_id)
  WHERE state IN ('pending','leased','working','validating','publishing');
-- Snapshot fields are immutable even to a worker; state/accounting fields remain mutable.
CREATE FUNCTION atlas_feedback.keep_job_payload() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.payload IS DISTINCT FROM OLD.payload OR NEW.feedback_id IS DISTINCT FROM OLD.feedback_id
     OR NEW.input_version IS DISTINCT FROM OLD.input_version OR NEW.approval_hash IS DISTINCT FROM OLD.approval_hash THEN
    RAISE EXCEPTION 'immutable job snapshot';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER immutable_job_snapshot BEFORE UPDATE ON atlas_feedback.jobs FOR EACH ROW EXECUTE FUNCTION atlas_feedback.keep_job_payload();
CREATE TABLE atlas_feedback.events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, feedback_id uuid NOT NULL REFERENCES atlas_feedback.feedback(id),
  version integer NOT NULL, from_state text, to_state text NOT NULL, actor_service text NOT NULL,
  reason_code text, time timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION atlas_feedback.keep_event_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'append-only event history';
END $$;
CREATE TRIGGER append_only_events BEFORE UPDATE OR DELETE ON atlas_feedback.events FOR EACH ROW EXECUTE FUNCTION atlas_feedback.keep_event_history();
CREATE TABLE atlas_feedback.control (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false,
  policy_version text NOT NULL DEFAULT 'atlas-feedback-v1', allowed_owner_id bigint,
  max_job_usd numeric CHECK(max_job_usd > 0 AND max_job_usd < 'Infinity'::numeric),
  max_day_usd numeric CHECK(max_day_usd > 0 AND max_day_usd < 'Infinity'::numeric),
  max_tokens integer CHECK(max_tokens > 0), max_turns integer CHECK(max_turns > 0),
  max_wall_seconds integer CHECK(max_wall_seconds > 0), max_attempts integer CHECK(max_attempts BETWEEN 1 AND 2),
  daily_reserved numeric NOT NULL DEFAULT 0 CHECK(daily_reserved >= 0 AND daily_reserved < 'Infinity'::numeric),
  daily_charged numeric NOT NULL DEFAULT 0 CHECK(daily_charged >= 0 AND daily_charged < 'Infinity'::numeric),
  accounting_day date NOT NULL DEFAULT CURRENT_DATE, revision bigint NOT NULL DEFAULT 1,
  lease_job_id uuid REFERENCES atlas_feedback.jobs(id), lease_until timestamptz,
  fencing_token bigint NOT NULL DEFAULT 0
);
INSERT INTO atlas_feedback.control(singleton) VALUES (true);
CREATE TABLE atlas_feedback.publications (
  feedback_id uuid PRIMARY KEY REFERENCES atlas_feedback.feedback(id), branch text NOT NULL UNIQUE,
  pr_number integer CHECK(pr_number > 0), candidate_digest text NOT NULL, phase text NOT NULL,
  version integer NOT NULL, expected_head_sha text, commit_sha text, receipt_digest text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE atlas_feedback.rate_limits (
  bucket text NOT NULL, window_start timestamptz NOT NULL, count integer NOT NULL CHECK(count > 0),
  PRIMARY KEY(bucket,window_start)
);
COMMIT;
