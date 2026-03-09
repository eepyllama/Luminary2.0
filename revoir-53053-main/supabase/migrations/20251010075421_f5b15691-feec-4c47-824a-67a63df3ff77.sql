-- Create roadmaps table
CREATE TABLE public.roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT,
  difficulty TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create subtasks table
CREATE TABLE public.subtasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  estimated_hours INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  deadline TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create study_sessions table
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  roadmap_id UUID NOT NULL REFERENCES public.roadmaps(id) ON DELETE CASCADE,
  subtask_id UUID REFERENCES public.subtasks(id) ON DELETE SET NULL,
  duration_minutes INTEGER NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roadmaps
CREATE POLICY "Users can view their own roadmaps"
  ON public.roadmaps FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own roadmaps"
  ON public.roadmaps FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmaps"
  ON public.roadmaps FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmaps"
  ON public.roadmaps FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for subtasks
CREATE POLICY "Users can view subtasks of their roadmaps"
  ON public.subtasks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.roadmaps
    WHERE roadmaps.id = subtasks.roadmap_id
    AND roadmaps.user_id = auth.uid()
  ));

CREATE POLICY "Users can create subtasks for their roadmaps"
  ON public.subtasks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.roadmaps
    WHERE roadmaps.id = subtasks.roadmap_id
    AND roadmaps.user_id = auth.uid()
  ));

CREATE POLICY "Users can update subtasks of their roadmaps"
  ON public.subtasks FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.roadmaps
    WHERE roadmaps.id = subtasks.roadmap_id
    AND roadmaps.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete subtasks of their roadmaps"
  ON public.subtasks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.roadmaps
    WHERE roadmaps.id = subtasks.roadmap_id
    AND roadmaps.user_id = auth.uid()
  ));

-- RLS Policies for study_sessions
CREATE POLICY "Users can view their own study sessions"
  ON public.study_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own study sessions"
  ON public.study_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own study sessions"
  ON public.study_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own study sessions"
  ON public.study_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Function to calculate current streak
CREATE OR REPLACE FUNCTION public.get_current_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_streak INTEGER := 0;
  v_check_date DATE := CURRENT_DATE;
  v_has_session BOOLEAN;
BEGIN
  LOOP
    SELECT EXISTS(
      SELECT 1 FROM public.study_sessions
      WHERE user_id = p_user_id
      AND DATE(completed_at) = v_check_date
    ) INTO v_has_session;
    
    IF v_has_session THEN
      v_streak := v_streak + 1;
      v_check_date := v_check_date - INTERVAL '1 day';
    ELSE
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to calculate longest streak
CREATE OR REPLACE FUNCTION public.get_longest_streak(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_longest_streak INTEGER := 0;
  v_current_streak INTEGER := 0;
  v_prev_date DATE := NULL;
  v_session_date DATE;
BEGIN
  FOR v_session_date IN
    SELECT DISTINCT DATE(completed_at) as session_date
    FROM public.study_sessions
    WHERE user_id = p_user_id
    ORDER BY session_date
  LOOP
    IF v_prev_date IS NULL OR v_session_date = v_prev_date + INTERVAL '1 day' THEN
      v_current_streak := v_current_streak + 1;
    ELSE
      v_current_streak := 1;
    END IF;
    
    IF v_current_streak > v_longest_streak THEN
      v_longest_streak := v_current_streak;
    END IF;
    
    v_prev_date := v_session_date;
  END LOOP;
  
  RETURN v_longest_streak;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for automatic timestamp updates
CREATE TRIGGER update_roadmaps_updated_at
  BEFORE UPDATE ON public.roadmaps
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subtasks_updated_at
  BEFORE UPDATE ON public.subtasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();