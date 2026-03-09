-- Create coding_streaks table for tracking LeetCode daily challenges
CREATE TABLE public.coding_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL,
  problem_title TEXT NOT NULL,
  problem_link TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.coding_streaks ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own coding challenges"
ON public.coding_streaks
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own coding challenges"
ON public.coding_streaks
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coding challenges"
ON public.coding_streaks
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coding challenges"
ON public.coding_streaks
FOR DELETE
USING (auth.uid() = user_id);