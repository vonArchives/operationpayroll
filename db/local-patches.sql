-- Columns the app uses that the repo's migrations don't create
-- (production presumably added them by hand). Applied after migrations/.

ALTER TABLE cash_advances
  ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT false;
