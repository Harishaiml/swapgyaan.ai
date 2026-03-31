
-- Create task_submissions table
CREATE TABLE public.task_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  learner_id uuid NOT NULL,
  file_url text,
  text_answer text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: Learner can insert their own submissions
CREATE POLICY "Learners can insert submissions" ON public.task_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = learner_id);

-- RLS: Session participants can view submissions
CREATE POLICY "Session participants can view submissions" ON public.task_submissions
  FOR SELECT TO authenticated
  USING (
    auth.uid() = learner_id OR
    EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = session_id AND s.teacher_id = auth.uid())
  );

-- RLS: Learner can update their own submissions
CREATE POLICY "Learners can update submissions" ON public.task_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = learner_id);

-- Trigger for updated_at
CREATE TRIGGER update_task_submissions_updated_at
  BEFORE UPDATE ON public.task_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Add start_time and end_time to sessions
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS start_time timestamptz;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS end_time timestamptz;

-- Create task-submissions storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-submissions', 'task-submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Learners can upload their files
CREATE POLICY "Learners can upload submissions" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-submissions' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Storage RLS: Session participants can view files
CREATE POLICY "Session participants can view submission files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'task-submissions');

-- Enable realtime for task_submissions
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_submissions;
