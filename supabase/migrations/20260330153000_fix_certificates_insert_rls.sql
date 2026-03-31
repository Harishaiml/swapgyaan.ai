-- Fix certificates INSERT/UPSERT RLS so teachers can create learner certificates
-- while enforcing that certificate.user_id must equal the session learner.

-- Remove legacy/previous policies that may conflict.
DROP POLICY IF EXISTS "System can insert certificates" ON public.certificates;
DROP POLICY IF EXISTS "Teachers can create certificates for approved tasks" ON public.certificates;
DROP POLICY IF EXISTS "Teachers can update their certificate records" ON public.certificates;
DROP POLICY IF EXISTS "Teachers can delete certificate records" ON public.certificates;

-- INSERT: teacher can create a certificate only for their own session and only for that session's learner.
CREATE POLICY "Teachers can insert learner certificates" ON public.certificates
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = session_id
        AND s.teacher_id = auth.uid()
        AND s.learner_id = user_id
    )
  );

-- UPDATE: teacher can update certificate fields for their own session.
CREATE POLICY "Teachers can update session certificates" ON public.certificates
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = session_id
        AND s.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = session_id
        AND s.teacher_id = auth.uid()
        AND s.learner_id = user_id
    )
  );

-- DELETE: teacher can remove/recreate certificate rows for their own session if needed.
CREATE POLICY "Teachers can delete session certificates" ON public.certificates
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.sessions s
      WHERE s.id = session_id
        AND s.teacher_id = auth.uid()
    )
  );
