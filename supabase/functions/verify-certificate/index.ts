import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

serve(async (req) => {
  console.log("[verify-certificate] request received", { method: req.method, url: req.url });

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let certificateId = "";

    if (req.method === "GET") {
      const cert = new URL(req.url).searchParams.get("cert");
      certificateId = cert || "";
    } else {
      const body = await req.json().catch(() => ({}));
      certificateId = body?.certificate_id || body?.cert || "";
    }

    console.log("[verify-certificate] certificate_id", certificateId);

    if (!certificateId) {
      return new Response(JSON.stringify({ valid: false, error: "certificate_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRole);

    const { data: cert, error } = await supabase
      .from("certificates")
      .select("certificate_id, user_id, mentor_name, skill_name, created_at, pdf_url")
      .eq("certificate_id", certificateId)
      .maybeSingle();

    if (error || !cert) {
      return new Response(JSON.stringify({ valid: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: learner } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", cert.user_id)
      .maybeSingle();

    return new Response(JSON.stringify({
      valid: true,
      certificate_id: cert.certificate_id,
      learner_name: learner?.name || "Learner",
      teacher_name: cert.mentor_name,
      skill_name: cert.skill_name,
      created_at: cert.created_at,
      pdf_url: cert.pdf_url,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
