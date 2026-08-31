-- Cluster-level provisioning. Idempotent, and NOT part of the migration set.
--
-- Roles are cluster-scoped, so creating one inside a migration makes the
-- migration set unreplayable: it succeeds against the first database and fails
-- against every later one in the same cluster. Provisioning runs once per
-- cluster; migrations run once per database.
--
-- The password is a psql VARIABLE with a developer default. CI passes its own:
--
--   psql "$DATABASE_URL" -v app_user_password="..." -f packages/db/bootstrap.sql
--
-- It was previously hardcoded, which made the CI_APP_USER_PASSWORD secret inert
-- -- set, referenced in the workflow, and consumed by nothing. A secret that
-- configures nothing is worse than no secret: the workflow reads as though the
-- credential were managed.
\if :{?app_user_password}
\else
\set app_user_password app_user_dev_only
\endif

-- The password is applied OUTSIDE this block. psql does not interpolate
-- variables inside dollar-quoted strings, so `:'app_user_password'` here would
-- be sent to the server literally and become the password itself.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN NOBYPASSRLS;
  END IF;
END
$$;

-- Never grant BYPASSRLS or ownership: RLS is silently skipped for both.
-- Setting the password on every run also makes re-provisioning idempotent
-- against a cluster where the role already exists with a different one.
ALTER ROLE app_user WITH PASSWORD :'app_user_password'
  NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
