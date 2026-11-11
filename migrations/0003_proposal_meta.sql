-- Proposal metadata: owning task, target key, approval-card content and the
-- destructive flag. Applied automatically by ensureD1Schema as well.
ALTER TABLE proposals ADD COLUMN meta TEXT;
