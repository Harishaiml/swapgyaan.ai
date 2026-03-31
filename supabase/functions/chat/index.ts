import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { messages, skill, mode, simplify } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    let systemPrompt = `You are SwapGyaan AI Tutor — a friendly, expert learning assistant.
You help learners understand skills, create roadmaps, generate quizzes, and suggest practice tasks.

Guidelines:
- Always explain clearly with examples and steps
- If the topic involves coding, include code snippets with comments
- Keep explanations simple and beginner-friendly unless asked otherwise
- Be encouraging and supportive
- Structure responses with headers, bullet points, and numbered steps when appropriate`;

    if (skill) {
      systemPrompt += `\n\nThe learner is currently studying: ${skill}. Focus your answers on this skill.`;
    }

    if (mode === "code") {
      systemPrompt += `\n\nFocus on providing code examples, implementations, and programming solutions.`;
    } else if (mode === "steps") {
      systemPrompt += `\n\nProvide step-by-step instructions and learning roadmaps.`;
    } else if (mode === "explain") {
      systemPrompt += `\n\nFocus on clear conceptual explanations with analogies.`;
    }

    if (simplify) {
      systemPrompt += `\n\nIMPORTANT: Explain everything as simply as possible, like explaining to a 10-year-old. Use analogies and avoid jargon.`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited. Please wait a moment and try again." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
