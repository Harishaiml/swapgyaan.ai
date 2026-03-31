-- Fix certificate visibility for both learner and teacher

-- Drop old RLS policy that only allows learner view
DROP POLICY IF EXISTS "Learners can view their own certificates" ON public.certificates;

-- Add policy for learners to view their own certificates
CREATE POLICY "Learners can view their own certificates" ON public.certificates
	FOR SELECT TO authenticated
	USING (auth.uid() = user_id);

-- Add policy for teachers to view certificates they issued
CREATE POLICY "Teachers can view their issued certificates" ON public.certificates
	FOR SELECT TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.sessions s 
			WHERE s.id = session_id AND s.teacher_id = auth.uid()
		)
	);

-- Drop and recreate insert policy to allow teacher to insert (for approval flow)
DROP POLICY IF EXISTS "System can insert certificates" ON public.certificates;

-- Allow inserts from authenticated users (teacher approving sessions)
CREATE POLICY "Teachers can create certificates for approved tasks" ON public.certificates
	FOR INSERT TO authenticated
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.sessions s 
			WHERE s.id = session_id AND s.teacher_id = auth.uid()
		)
	);

-- Allow updates to pdf_url for valid records
DROP POLICY IF EXISTS "Certificates can be updated" ON public.certificates;
CREATE POLICY "Teachers can update their certificate records" ON public.certificates
	FOR UPDATE TO authenticated
	USING (
		EXISTS (
			SELECT 1 FROM public.sessions s 
			WHERE s.id = session_id AND s.teacher_id = auth.uid()
		)
	)
	WITH CHECK (
		EXISTS (
			SELECT 1 FROM public.sessions s 
			WHERE s.id = session_id AND s.teacher_id = auth.uid()
		)
	);

-- Ensure certificates bucket allows authenticated uploads for teacher approvals
DROP POLICY IF EXISTS "Authenticated users can upload certificates" ON storage.objects;
CREATE POLICY "Teachers can upload certificates" ON storage.objects
	FOR INSERT TO authenticated
	WITH CHECK (bucket_id = 'certificates');

-- Allow anyone to download certificates (public view)
DROP POLICY IF EXISTS "Anyone can view certificates" ON storage.objects;
CREATE POLICY "Anyone can download certificates" ON storage.objects
	FOR SELECT USING (bucket_id = 'certificates');
