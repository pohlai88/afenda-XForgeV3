-- Cluster-level provisioning. Idempotent, and NOT part of the migration set.
--
-- Roles are cluster-scoped, so creating one inside a migration makes the
-- migration set unreplayable: it succeeds against the first database and fails
-- against every later one in the same cluster. Provisioning runs once per
-- cluster; migrations run once per database.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev_only' NOBYPASSRLS;
  END IF;
END
$$;

-- Never grant BYPASSRLS or ownership: RLS is silently skipped for both.
ALTER ROLE app_user NOBYPASSRLS NOSUPERUSER NOCREATEDB NOCREATEROLE;
