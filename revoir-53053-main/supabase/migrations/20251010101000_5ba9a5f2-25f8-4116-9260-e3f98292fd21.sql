-- Add missing columns to roadmaps table
ALTER TABLE public.roadmaps 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';