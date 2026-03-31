import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import puppeteer from "npm:puppeteer-core@23.4.1";
import chromium from "npm:@sparticuz/chromium@123.0.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const CERT_BUCKET = "certificates";
const APP_NAME = "SwapGyaan AI";

const buildCertificateHtml = (args: {
  learnerName: string;
  teacherName: string;
  skillName: string;
  completionDate: string;
  certificateId: string;
}) => {
  const logoSvg = encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop stop-color='#0f766e'/><stop offset='1' stop-color='#f59e0b'/></linearGradient></defs><rect rx='24' width='128' height='128' fill='url(#g)'/><path d='M33 77c9 10 22 16 31 16 16 0 31-12 31-31 0-17-13-30-29-30-14 0-27 10-30 24h16c2-6 8-10 14-10 9 0 15 7 15 16 0 10-7 17-17 17-5 0-13-4-18-9l-13 7z' fill='white'/></svg>`);

  return `<!doctype html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <style>
        body {
          margin: 0;
          font-family: "Georgia", "Times New Roman", serif;
          color: #0f172a;
          background: #f8fafc;
        }
        .page {
          width: 1123px;
          height: 794px;
          margin: 0 auto;
          background: radial-gradient(circle at top right, #ccfbf1, #fef3c7 45%, #ffffff 80%);
          border: 14px solid #0f766e;
          box-sizing: border-box;
          position: relative;
          padding: 56px 84px;
        }
        .logo {
          display: block;
          margin: 0 auto 14px auto;
          width: 74px;
          height: 74px;
        }
        .app {
          text-align: center;
          font-size: 34px;
          letter-spacing: 1px;
          color: #0f766e;
          font-weight: 700;
        }
        .title {
          margin-top: 28px;
          text-align: center;
          font-size: 48px;
          font-weight: 700;
        }
        .subtitle {
          margin-top: 10px;
          text-align: center;
          font-size: 20px;
          color: #334155;
        }
        .name {
          margin-top: 26px;
          text-align: center;
          font-size: 42px;
          font-weight: 700;
          border-bottom: 2px solid #334155;
          display: inline-block;
          left: 50%;
          position: relative;
          transform: translateX(-50%);
          padding: 0 20px 6px 20px;
        }
        .body {
          margin-top: 32px;
          text-align: center;
          font-size: 24px;
          line-height: 1.6;
        }
        .meta {
          margin-top: 44px;
          display: flex;
          justify-content: space-between;
          font-size: 18px;
        }
        .meta strong {
          display: block;
          margin-bottom: 6px;
        }
        .foot {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 28px;
          text-align: center;
          font-size: 16px;
          color: #334155;
        }
        .certid {
          margin-top: 10px;
          font-family: "Courier New", monospace;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <img class="logo" src="data:image/svg+xml;utf8,${logoSvg}" alt="SwapGyaan AI" />
        <div class="app">${APP_NAME}</div>
        <div class="title">Certificate of Completion</div>
        <div class="subtitle">This certifies that</div>
        <div class="name">${args.learnerName}</div>
        <div class="body">
          has successfully completed <strong>${args.skillName}</strong><br />
          under the guidance of <strong>${args.teacherName}</strong>
        </div>
        <div class="meta">
          <div><strong>Completion Date</strong>${args.completionDate}</div>
          <div><strong>Teacher</strong>${args.teacherName}</div>
          <div><strong>Skill</strong>${args.skillName}</div>
        </div>
        <div class="foot">
          Verify at: /verify?cert=${args.certificateId}
          <div class="certid">Certificate ID: ${args.certificateId}</div>
        </div>
      </div>
    </body>
  </html>`;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { session_id: sessionId } = await req.json();
    if (!sessionId) {
      return new Response(JSON.stringify({ error: "session_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const requesterId = authData.user.id;
    const { data: session, error: sessionError } = await serviceClient
      .from("sessions")
      .select("id, teacher_id, learner_id, skill, task_status, updated_at")
      .eq("id", sessionId)
      .maybeSingle();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.teacher_id !== requesterId) {
      return new Response(JSON.stringify({ error: "Only the session teacher can generate certificates" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (session.task_status !== "approved") {
      return new Response(JSON.stringify({ error: "Certificate generation requires task_status to be approved" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: teacherProfile } = await serviceClient
      .from("profiles")
      .select("name")
      .eq("user_id", session.teacher_id)
      .maybeSingle();
    const { data: learnerProfile } = await serviceClient
      .from("profiles")
      .select("name")
      .eq("user_id", session.learner_id)
      .maybeSingle();

    const teacherName = teacherProfile?.name || "Teacher";
    const learnerName = learnerProfile?.name || "Learner";

    const { data: existingCertificate } = await serviceClient
      .from("certificates")
      .select("id, certificate_id, pdf_url")
      .eq("session_id", session.id)
      .maybeSingle();

    const certificateId = existingCertificate?.certificate_id || crypto.randomUUID();

    const { data: upserted, error: upsertError } = await serviceClient
      .from("certificates")
      .upsert(
        {
          session_id: session.id,
          user_id: session.learner_id,
          skill_name: session.skill,
          mentor_name: teacherName,
          certificate_id: certificateId,
        },
        { onConflict: "session_id" },
      )
      .select("id, certificate_id, created_at, pdf_url")
      .single();

    if (upsertError || !upserted) {
      throw upsertError || new Error("Failed to upsert certificate");
    }

    if (upserted.pdf_url) {
      return new Response(JSON.stringify({
        certificate_id: upserted.certificate_id,
        pdf_url: upserted.pdf_url,
        created: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completionDate = new Date(upserted.created_at || session.updated_at).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const html = buildCertificateHtml({
      learnerName,
      teacherName,
      skillName: session.skill,
      completionDate,
      certificateId,
    });

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    const pdfBytes = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    });
    await browser.close();

    const storagePath = `${session.learner_id}/${certificateId}.pdf`;
    const { error: uploadError } = await serviceClient.storage
      .from(CERT_BUCKET)
      .upload(storagePath, pdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data: publicData } = serviceClient.storage.from(CERT_BUCKET).getPublicUrl(storagePath);

    const { error: updatePdfError } = await serviceClient
      .from("certificates")
      .update({ pdf_url: publicData.publicUrl })
      .eq("id", upserted.id);

    if (updatePdfError) {
      throw updatePdfError;
    }

    return new Response(JSON.stringify({
      certificate_id: certificateId,
      pdf_url: publicData.publicUrl,
      created: true,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("create-certificate error:", error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
