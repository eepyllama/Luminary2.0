-- Drop existing functions
DROP FUNCTION IF EXISTS get_current_streak(uuid);
DROP FUNCTION IF EXISTS get_longest_streak(uuid);

-- Create function to calculate current streak
CREATE OR REPLACE FUNCTION get_current_streak(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  streak_count INTEGER := 0;
  check_date DATE := CURRENT_DATE;
  has_session BOOLEAN;
BEGIN
  -- Loop backwards from today
  LOOP
    -- Check if user has at least 1 session on check_date
    SELECT EXISTS(
      SELECT 1 FROM study_sessions
      WHERE user_id = user_uuid
      AND DATE(completed_at) = check_date
    ) INTO has_session;
    
    -- If no session found, break the streak
    EXIT WHEN NOT has_session;
    
    -- Increment streak and check previous day
    streak_count := streak_count + 1;
    check_date := check_date - 1;
  END LOOP;
  
  RETURN streak_count;
END;
$$;

-- Create function to calculate longest streak ever
CREATE OR REPLACE FUNCTION get_longest_streak(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_streak INTEGER := 0;
  current_streak INTEGER := 0;
  prev_date DATE := NULL;
  session_date DATE;
BEGIN
  -- Get all unique study dates ordered chronologically
  FOR session_date IN
    SELECT DISTINCT DATE(completed_at) as study_date
    FROM study_sessions
    WHERE user_id = user_uuid
    ORDER BY study_date ASC
  LOOP
    -- If this is the first date or consecutive with previous
    IF prev_date IS NULL OR session_date = prev_date + 1 THEN
      current_streak := current_streak + 1;
      max_streak := GREATEST(max_streak, current_streak);
    ELSE
      -- Streak broken, start new streak
      current_streak := 1;
    END IF;
    
    prev_date := session_date;
  END LOOP;
  
  RETURN max_streak;
END;
$$;

-- Create function to get today's Pomodoro count
CREATE OR REPLACE FUNCTION get_today_pomodoro_count(user_uuid UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM study_sessions
    WHERE user_id = user_uuid
    AND DATE(completed_at) = CURRENT_DATE
  );
END;
$$;