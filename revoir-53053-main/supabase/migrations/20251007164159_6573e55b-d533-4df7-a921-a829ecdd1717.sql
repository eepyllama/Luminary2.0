-- Add new columns to subtasks table for enhanced task management
ALTER TABLE public.subtasks
ADD COLUMN IF NOT EXISTS deadline date,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
ADD COLUMN IF NOT EXISTS dependencies text[] DEFAULT '{}';

-- Update the description column to allow longer text if needed
ALTER TABLE public.subtasks
ALTER COLUMN description TYPE text;