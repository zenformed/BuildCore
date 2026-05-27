-- Waiting on is no longer used in BuildCore project list or create flows.
ALTER TABLE crm_projects DROP COLUMN IF EXISTS waiting_on;
