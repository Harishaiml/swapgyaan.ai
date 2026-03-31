-- Ensure unique constraint exists for certificates.certificate_id
-- This is idempotent and safe to run multiple times.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_certificate_id'
      AND conrelid = 'public.certificates'::regclass
  ) THEN
    ALTER TABLE public.certificates
    ADD CONSTRAINT unique_certificate_id UNIQUE (certificate_id);
  END IF;
END $$;
