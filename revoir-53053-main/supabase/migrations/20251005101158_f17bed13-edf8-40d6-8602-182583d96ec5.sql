-- Create roadmaps table
CREATE TABLE public.roadmaps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  difficulty TEXT NOT NULL,
  deadline DATE,
  tags TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subtasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roadmaps
CREATE POLICY "Users can view their own roadmaps" 
ON public.roadmaps 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own roadmaps" 
ON public.roadmaps 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmaps" 
ON public.roadmaps 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmaps" 
ON public.roadmaps 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for subtasks
CREATE POLICY "Users can view subtasks of their roadmaps" 
ON public.subtasks 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.roadmaps 
  WHERE roadmaps.id = subtasks.roadmap_id 
  AND roadmaps.user_id = auth.uid()
));

CREATE POLICY "Users can create subtasks for their roadmaps" 
ON public.subtasks 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.roadmaps 
  WHERE roadmaps.id = subtasks.roadmap_id 
  AND roadmaps.user_id = auth.uid()
));

CREATE POLICY "Users can update subtasks of their roadmaps" 
ON public.subtasks 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.roadmaps 
  WHERE roadmaps.id = subtasks.roadmap_id 
  AND roadmaps.user_id = auth.uid()
));

CREATE POLICY "Users can delete subtasks of their roadmaps" 
ON public.subtasks 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.roadmaps 
  WHERE roadmaps.id = subtasks.roadmap_id 
  AND roadmaps.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_roadmaps_updated_at
BEFORE UPDATE ON public.roadmaps
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();