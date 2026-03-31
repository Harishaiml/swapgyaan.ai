-- 1. Add Soft Delete column to teacher_slots
ALTER TABLE teacher_slots 
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Optional Cleanup: Function to auto-remove inactive slots after 7 days
-- Since teacher_slots lacks an 'updated_at' column, you can base cleanup on the 'slot_date'.
-- This deletes any inactive slot whose assigned date is older than 7 days.
-- You can run this command as a scheduled job (e.g., using pg_cron).

DELETE FROM teacher_slots 
WHERE is_active = FALSE 
  AND slot_date < CURRENT_DATE - INTERVAL '7 days';
