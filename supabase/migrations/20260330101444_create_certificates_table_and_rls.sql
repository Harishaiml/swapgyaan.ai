-- Strict role and certificate automation hardening (existing schema only)

-- Learners must not be able to change session state.
DROP POLICY IF EXISTS "Session participants can update" ON public.sessions;
CREATE POLICY "Teachers can update their own sessions" ON public.sessions
	FOR UPDATE TO authenticated
	USING (auth.uid() = teacher_id)
	WITH CHECK (auth.uid() = teacher_id);

-- Delete remains teacher-only (hard delete is restricted; app uses soft cancel).
DROP POLICY IF EXISTS "Session participants can delete" ON public.sessions;
CREATE POLICY "Teachers can delete their own sessions" ON public.sessions
	FOR DELETE TO authenticated
	USING (auth.uid() = teacher_id);

-- One certificate per session to avoid duplicate generation.
CREATE UNIQUE INDEX IF NOT EXISTS certificates_session_id_unique_idx
ON public.certificates(session_id)
WHERE session_id IS NOT NULL;

-- Authenticated users can only view their own certificates.
DROP POLICY IF EXISTS "Certificates are viewable by everyone" ON public.certificates;
DROP POLICY IF EXISTS "System can insert certificates" ON public.certificates;

CREATE POLICY "Learners can view their own certificates" ON public.certificates
	FOR SELECT TO authenticated
	USING (auth.uid() = user_id);
