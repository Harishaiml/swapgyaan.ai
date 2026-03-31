import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submission_id, code, task_description } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Use AI to evaluate the code submission
    const evalResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `You are a code evaluator. Evaluate the submitted code against the task description.
Return a JSON object with:
- "pass": boolean (true if the code reasonably solves the task)
- "score": number 0-100
- "feedback": string (brief feedback for the learner)
Only return the JSON object, nothing else.`,
          },
          {
            role: "user",
            content: `Task: ${task_description}\n\nSubmitted Code:\n${code}`,
          },
        ],
      }),
    });

    if (!evalResponse.ok) {
      throw new Error("AI evaluation failed");
    }

    const evalData = await evalResponse.json();
    const content = evalData.choices?.[0]?.message?.content || "";

    let result;
    try {
      // Try to parse JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { pass: false, score: 0, feedback: "Could not evaluate" };
    } catch {
      result = { pass: false, score: 0, feedback: content };
    }

    // AI evaluation is advisory; teacher approval is mandatory for final approval/certification.
    const newStatus = result.pass ? "pending" : "needs_revision";
    await supabase.from("task_submissions").update({ status: newStatus }).eq("id", submission_id);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("evaluate-code error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
