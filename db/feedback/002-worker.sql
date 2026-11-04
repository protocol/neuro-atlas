-- Private worker additions only; apply AFTER 001-feedback.sql using a migration role.
BEGIN;
CREATE TABLE atlas_feedback.worker_reservations (
  id uuid PRIMARY KEY,
  job_id uuid NOT NULL REFERENCES atlas_feedback.jobs(id),
  fencing_token bigint NOT NULL CHECK(fencing_token > 0),
  ordinal integer NOT NULL CHECK(ordinal BETWEEN 1 AND 2),
  upper_usd numeric NOT NULL CHECK(upper_usd > 0 AND upper_usd < 'Infinity'::numeric),
  upper_tokens integer NOT NULL CHECK(upper_tokens > 0),
  actual_usd numeric CHECK(actual_usd >= 0 AND actual_usd <= upper_usd),
  state text NOT NULL CHECK(state IN ('reserved','settled','unknown')),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(job_id,ordinal),
  CHECK((state='settled') = (actual_usd IS NOT NULL))
);
CREATE TABLE atlas_feedback.worker_bundles (
  job_id uuid PRIMARY KEY REFERENCES atlas_feedback.jobs(id),
  digest text NOT NULL UNIQUE CHECK(digest ~ '^[0-9a-f]{64}$'),
  bundle jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE FUNCTION atlas_feedback.immutable_worker_bundle() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'immutable worker bundle';
END $$;
CREATE TRIGGER immutable_worker_bundle BEFORE UPDATE ON atlas_feedback.worker_bundles
  FOR EACH ROW EXECUTE FUNCTION atlas_feedback.immutable_worker_bundle();
CREATE TABLE atlas_feedback.publisher_claims (
  job_id uuid PRIMARY KEY REFERENCES atlas_feedback.jobs(id),
  instance_id uuid NOT NULL,
  fencing_token bigint NOT NULL DEFAULT 1 CHECK(fencing_token > 0),
  lease_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- Deployment must grant column-limited roles separately; no GRANT to PUBLIC or runtime
-- role creation is performed by this migration. Worker cannot write publications/claims;
-- publisher cannot read input_private or model credentials; host must enforce these grants.
COMMIT;
