import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CalendarEvent {
  summary: string;
  description: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { events, accessToken } = await req.json() as { 
      events: CalendarEvent[]; 
      accessToken: string;
    };
    
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ error: 'No events provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'No access token provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Adding calendar events:', events.length);

    const results = [];
    const errors = [];

    for (const event of events) {
      try {
        const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(event),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Calendar API error for event:', event.summary, response.status, errorText);
          errors.push({ event: event.summary, error: errorText });
        } else {
          const data = await response.json();
          results.push({ event: event.summary, id: data.id });
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        errors.push({ event: event.summary, error: errorMessage });
      }
    }

    return new Response(JSON.stringify({ 
      success: results.length,
      failed: errors.length,
      results,
      errors 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in add-calendar-events function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
