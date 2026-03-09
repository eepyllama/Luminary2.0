import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roadmap, planType, hoursPerWeek } = await req.json();
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY');

    if (!GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY is not configured');
    }

    console.log('Generating study plan with params:', { planType, hoursPerWeek, roadmap });

    const today = new Date().toISOString().split('T')[0];

    const systemPrompt = `You are an expert academic scheduler. Your job is to take a learning roadmap and convert it into a practical, day-by-day study plan that fits into the user's schedule.

Guidelines:
1. Act as a scheduler - distribute the roadmap modules across days and time slots
2. Each study session should be 1-2 hours long maximum
3. Respect the user's weekly hour constraints (${hoursPerWeek} hours per week)
4. Space sessions realistically (allow rest days, avoid cramming)
5. Start scheduling from today: ${today}
6. Use realistic times (9 AM - 8 PM range, avoid late nights)
7. Each session description should include specific topics from the module
8. Return ONLY valid JSON - no explanatory text, no markdown formatting

CRITICAL: Return ONLY a valid JSON object with an "events" array.`;

    const userPrompt = `Schedule the following roadmap into a ${planType} study plan.

**Constraints:**
- Study Hours Per Week: ${hoursPerWeek} hours
- Start Date: Today, ${today}
- Plan Type: ${planType}

**Roadmap Data:**
Title: ${roadmap.title}
Subject: ${roadmap.subject}
Description: ${roadmap.description || 'No description'}

Subtasks to schedule:
${roadmap.subtasks.map((st: any, i: number) => `${i + 1}. ${st.title} (${st.estimated_hours || 2}h) - ${st.description}`).join('\n')}

**Output Requirements:**
Return a JSON object with an "events" array. Each event MUST follow this exact schema:
{
  "summary": "Study Session: [Module Title]",
  "description": "[Specific topics and details from the module]",
  "start": { "dateTime": "2025-10-08T10:00:00-07:00" },
  "end": { "dateTime": "2025-10-08T12:00:00-07:00" }
}

Distribute all modules into manageable sessions across the schedule.`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsedContent = JSON.parse(content);

    console.log('Generated study plan:', parsedContent);

    return new Response(JSON.stringify(parsedContent), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-study-plan:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
