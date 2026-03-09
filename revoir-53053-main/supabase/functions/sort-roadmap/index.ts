import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RoadmapNode {
  id: string;
  title: string;
  description: string | null;
  estimated_hours: number | null;
  difficulty: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nodes } = await req.json() as { nodes: RoadmapNode[] };
    
    if (!nodes || nodes.length === 0) {
      return new Response(JSON.stringify({ error: 'No nodes provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Sorting roadmap nodes:', nodes.length);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const systemPrompt = `You are an expert learning path optimizer. Your task is to analyze learning topics and determine the optimal order in which they should be studied.

Rules:
1. Foundational/prerequisite topics must come before advanced topics
2. Consider dependencies between topics
3. Group related topics together when possible
4. Easier topics generally come before harder ones (but not always if dependencies require otherwise)
5. Return ONLY valid JSON - no additional text or markdown

Return a JSON array with the order field for each node.`;

    const userPrompt = `Analyze these learning topics and determine the optimal learning order:

${JSON.stringify(nodes.map(n => ({
  id: n.id,
  title: n.title,
  description: n.description,
  estimated_hours: n.estimated_hours,
  difficulty: n.difficulty
})), null, 2)}

Return a JSON array in this exact format:
[
  { "id": "node_id_here", "order": 1 },
  { "id": "another_node_id", "order": 2 }
]

Order them from first to study (order: 1) to last (order: N). Every node must have a unique order number.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Credits exhausted. Please add funds.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data));

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    // Parse the response
    let sortedNodes;
    try {
      const parsed = JSON.parse(content);
      // Handle both array and object with array property
      sortedNodes = Array.isArray(parsed) ? parsed : (parsed.nodes || parsed.order || parsed.sorted || Object.values(parsed)[0]);
      
      if (!Array.isArray(sortedNodes)) {
        throw new Error('Response is not an array');
      }
    } catch (e) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Failed to parse AI response as JSON');
    }

    // Validate the response
    const nodeIds = new Set(nodes.map(n => n.id));
    const validSortedNodes = sortedNodes.filter((n: any) => nodeIds.has(n.id) && typeof n.order === 'number');

    if (validSortedNodes.length !== nodes.length) {
      console.warn('Some nodes missing from AI response, using fallback ordering');
      // Add missing nodes at the end
      let maxOrder = Math.max(...validSortedNodes.map((n: any) => n.order), 0);
      for (const node of nodes) {
        if (!validSortedNodes.find((n: any) => n.id === node.id)) {
          validSortedNodes.push({ id: node.id, order: ++maxOrder });
        }
      }
    }

    return new Response(JSON.stringify({ sortedNodes: validSortedNodes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: unknown) {
    console.error('Error in sort-roadmap function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
