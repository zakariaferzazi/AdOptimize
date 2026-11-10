-- Adds durable per-conversation task state.
--
-- A conversation carries its objective, the campaign under discussion, the
-- parameters collected so far, the user's decisions, unresolved requirements and
-- the pending proposal. Without this the agent re-asks for information it has
-- already been given.

ALTER TABLE conversations ADD COLUMN task_state TEXT;
