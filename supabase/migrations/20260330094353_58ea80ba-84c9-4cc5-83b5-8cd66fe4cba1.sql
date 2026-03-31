
-- Allow session participants to delete sessions
CREATE POLICY "Session participants can delete" ON public.sessions
  FOR DELETE TO authenticated
  USING ((auth.uid() = teacher_id) OR (auth.uid() = learner_id));
