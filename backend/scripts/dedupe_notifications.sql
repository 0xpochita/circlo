-- Dedupe notifications — removes duplicate rows created before the
-- indexer was made idempotent (see handlers/predictionPool.ts).
--
-- Dedupe key: (user_id, type, entity_id, actor_id). The OLDEST row is
-- kept (ROW_NUMBER ORDER BY created_at ASC → rn=1 survives).
--
-- Safe to run on Supabase SQL editor. Run inside a transaction first to
-- inspect the count, then commit.

BEGIN;

-- Inspect how many rows will be deleted.
SELECT COUNT(*) AS duplicates_to_delete
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, type, entity_id, COALESCE(actor_id, '00000000-0000-0000-0000-000000000000')
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM notifications
) t
WHERE t.rn > 1;

-- Delete duplicates, keep oldest per (user_id, type, entity_id, actor_id).
DELETE FROM notifications n
WHERE n.id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY user_id, type, entity_id, COALESCE(actor_id, '00000000-0000-0000-0000-000000000000')
             ORDER BY created_at ASC, id ASC
           ) AS rn
    FROM notifications
  ) t
  WHERE t.rn > 1
);

-- Verify: the same query should now return 0.
SELECT COUNT(*) AS remaining_duplicates
FROM (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY user_id, type, entity_id, COALESCE(actor_id, '00000000-0000-0000-0000-000000000000')
           ORDER BY created_at ASC, id ASC
         ) AS rn
  FROM notifications
) t
WHERE t.rn > 1;

-- If the remaining count is 0 and the first SELECT matches your expectation,
-- COMMIT. Otherwise, ROLLBACK.
-- COMMIT;
-- ROLLBACK;
