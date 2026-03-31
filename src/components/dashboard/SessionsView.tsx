import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Video, ExternalLink, Calendar, Clock, User, BookOpen, Upload, FileText, CheckCircle, XCircle, Timer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateCertificate, downloadCertificate } from "@/utils/certificateGenerator";

const SessionsView = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [taskForms, setTaskForms] = useState<Record<string, { title: string; description: string }>>({});
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadSessions();

    const channel = supabase
      .channel("sessions_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sessions" }, () => loadSessions())
      .on("postgres_changes", { event: "*", schema: "public", table: "task_submissions" }, () => loadSessions())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("sessions")
      .select("*")
      .or(`teacher_id.eq.${user.id},learner_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error || !data) { setLoading(false); return; }

    const userIds = [...new Set(data.flatMap((s) => [s.teacher_id, s.learner_id]))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
    const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.name]));

    const slotIds = data.map(s => s.slot_id).filter(Boolean);
    let slotMap: Record<string, any> = {};
    if (slotIds.length > 0) {
      const { data: slots } = await supabase.from("teacher_slots").select("id, slot_date, slot_time, skill").in("id", slotIds);
      slotMap = Object.fromEntries((slots || []).map(s => [s.id, s]));
    }

    // Load submissions for sessions
    const sessionIds = data.map(s => s.id);
    const { data: submissions } = await supabase.from("task_submissions").select("*").in("session_id", sessionIds);
    const submissionMap = Object.fromEntries((submissions || []).map(s => [s.session_id, s]));

    setSessions(data.map((s) => {
      const slot = s.slot_id ? slotMap[s.slot_id] : null;
      const meetingLink = s.meeting_link || `https://meet.jit.si/swapgyaan-${s.id}`;
      return {
        ...s,
        teacher_name: nameMap[s.teacher_id] || "Unknown",
        learner_name: nameMap[s.learner_id] || "Unknown",
        role: s.teacher_id === user.id ? "Teaching" : "Learning",
        partner: s.teacher_id === user.id ? nameMap[s.learner_id] : nameMap[s.teacher_id],
        scheduled_date: slot?.slot_date || null,
        scheduled_time: slot?.slot_time || null,
        meeting_link: meetingLink,
        submission: submissionMap[s.id] || null,
      };
    }));
    setLoading(false);
  };

  const cancelSession = async (id: string) => {
    if (!user) return;
    
    // Find the session to get its slot_id
    const session = sessions.find(s => s.id === id);

    const { error } = await supabase
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (error) {
      toast.error(error.message || "Failed to cancel session");
      return;
    }

    // Free up the slot so the teacher can reuse or delete it
    if (session?.slot_id) {
      const { error: slotError } = await supabase
        .from("teacher_slots")
        .update({ is_booked: false, booked_by: null } as any)
        .eq("id", session.slot_id);
    }

    toast.success("Session cancelled");
    loadSessions();
  };

  const assignTask = async (sessionId: string) => {
    const form = taskForms[sessionId];
    if (!form?.title?.trim() || !form?.description?.trim()) {
      toast.error("Fill task title and description");
      return;
    }
    const { error } = await supabase.from("sessions").update({
      task_title: form.title,
      task_description: form.description,
      task_status: "assigned",
    }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else {
      toast.success("Task assigned!");
      setTaskForms(prev => { const n = { ...prev }; delete n[sessionId]; return n; });
    }
  };

  const handleFileUpload = async (sessionId: string, file: File) => {
    if (!user) return;
    setSubmitting(sessionId);
    const filePath = `${user.id}/${sessionId}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("task-submissions").upload(filePath, file);
    if (uploadError) { toast.error("Upload failed: " + uploadError.message); setSubmitting(null); return; }

    const { data: urlData } = supabase.storage.from("task-submissions").getPublicUrl(filePath);

    const { error } = await supabase.from("task_submissions").insert({
      session_id: sessionId,
      learner_id: user.id,
      file_url: urlData.publicUrl,
      status: "pending",
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("File submitted!");
      loadSessions();
    }
    setSubmitting(null);
  };

  const handleTextSubmit = async (sessionId: string) => {
    if (!user) return;
    const text = textAnswers[sessionId];
    if (!text?.trim()) { toast.error("Enter your answer"); return; }
    setSubmitting(sessionId);

    const { error } = await supabase.from("task_submissions").insert({
      session_id: sessionId,
      learner_id: user.id,
      text_answer: text,
      status: "pending",
    } as any);
    if (error) toast.error(error.message);
    else {
      toast.success("Answer submitted!");

      // Auto-evaluate if it looks like code
      const session = sessions.find(s => s.id === sessionId);
      if (session?.task_description) {
        try {
          const resp = await supabase.functions.invoke("evaluate-code", {
            body: { code: text, task_description: session.task_description, session_id: sessionId },
          });
          if (resp.data?.pass) toast.success(`Auto-evaluated: Score ${resp.data.score}/100 ✅`);
          else if (resp.data?.feedback) toast("Feedback: " + resp.data.feedback);
        } catch { /* manual review fallback */ }
      }
      loadSessions();
    }
    setSubmitting(null);
    setTextAnswers(prev => { const n = { ...prev }; delete n[sessionId]; return n; });
  };

  const approveSubmission = async (sessionId: string) => {
    if (!user) return;
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    const { error: approveError } = await supabase
      .from("sessions")
      .update({
        task_status: "approved",
        status: "completed",
      })
      .eq("id", sessionId)
      .eq("teacher_id", user.id);

    if (approveError) {
      toast.error(approveError.message || "Only the teacher can approve this session");
      return;
    }

    if (session.submission) {
      await supabase.from("task_submissions").update({ status: "approved" } as any).eq("id", session.submission.id);
    }

    // Duplicate-safe lookup: keep one certificate per session
    const { data: existingCert, error: existingCertError } = await supabase
      .from("certificates")
      .select("id, certificate_id")
      .eq("session_id", sessionId)
      .maybeSingle();

    if (existingCertError) {
      console.error("Certificate lookup error:", existingCertError);
      toast.error("Failed to check existing certificate: " + (existingCertError.message || "Unknown error"));
      return;
    }

    const certId = existingCert?.certificate_id || `SG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Generate DOCX locally
    let docBlob: Blob | null = null;
    let pdfUrl = "";

    try {
      docBlob = await generateCertificate({
        learnerName: session.learner_name,
        teacherName: session.teacher_name,
        skillName: session.skill,
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        certificateId: certId,
      });

      // Upload to storage as DOCX (can be converted to PDF later via edge function)
      const fileName = `${certId}-${session.learner_name}-${session.skill}.docx`;
      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(fileName, docBlob, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        });

      if (uploadError) {
        console.error("Certificate upload error:", uploadError);
        toast.error("Certificate uploaded locally but storage failed. Try again.");
      } else {
        // Get public URL
        const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(fileName);
        pdfUrl = urlData.publicUrl;
        console.log("Certificate uploaded to storage:", pdfUrl);
      }
    } catch (error) {
      console.error("Certificate generation error:", error);
      toast.error("Certificate generation failed");
      loadSessions();
      return;
    }

    // Save certificate metadata to DB (no ON CONFLICT dependency)
    const payload = {
      certificate_id: certId,
      user_id: session.learner_id,
      session_id: sessionId,
      skill_name: session.skill,
      mentor_name: session.teacher_name,
      pdf_url: pdfUrl,
    };

    const { error: certDbError } = existingCert?.id
      ? await supabase.from("certificates").update(payload).eq("id", existingCert.id)
      : await supabase.from("certificates").insert(payload);

    if (certDbError) {
      console.error("Certificate DB save error:", certDbError);
      toast.error("Failed to save certificate metadata: " + (certDbError.message || "Unknown error"));
      loadSessions();
      return;
    }

    // Prompt teacher to download
    if (docBlob) {
      downloadCertificate(docBlob, `${session.learner_name}-${session.skill}-certificate.docx`);
    }

    toast.success("Approved and certificate generated! 🎓 Learner can now download from their Certificates page.");
    loadSessions();
  };

  const getCountdown = (session: any) => {
    if (!session.start_time) return null;
    const start = new Date(session.start_time).getTime();
    const end = session.end_time ? new Date(session.end_time).getTime() : start + 3600000;
    if (now > end) return "ended";
    if (now < start) {
      const diff = start - now;
      const mins = Math.floor(diff / 60000);
      const hrs = Math.floor(mins / 60);
      return hrs > 0 ? `Starts in ${hrs}h ${mins % 60}m` : `Starts in ${mins}m`;
    }
    const remaining = end - now;
    const mins = Math.floor(remaining / 60000);
    return `${mins}m remaining`;
  };

  if (loading) return <div className="text-muted-foreground">Loading sessions...</div>;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display mb-1">My Sessions</h1>
        <p className="text-muted-foreground mb-8">Your learning and teaching sessions</p>
      </motion.div>

      {sessions.length === 0 ? (
        <motion.div className="bg-card rounded-xl p-8 shadow-card border border-border/50 text-center" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Video className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-display font-semibold text-lg mb-1">No sessions yet</h3>
          <p className="text-muted-foreground text-sm">Book a slot from a matched teacher to start learning!</p>
        </motion.div>
      ) : (
        <div className="space-y-4">
          {sessions.map((session, i) => {
            const countdown = getCountdown(session);
            const isTeacher = session.role === "Teaching";
            return (
              <motion.div
                key={session.id}
                className="bg-card rounded-xl p-6 shadow-card border border-border/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex flex-col gap-4">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${isTeacher ? "bg-gradient-secondary" : "bg-gradient-primary"}`}>
                        <Video className="w-6 h-6 text-primary-foreground" />
                      </div>
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-semibold font-display text-lg">{session.skill}</h3>
                          <p className="text-sm text-muted-foreground">with {session.partner}</p>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> Teacher: {session.teacher_name}</span>
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> Learner: {session.learner_name}</span>
                        </div>
                        {(session.scheduled_date || session.scheduled_time) && (
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {session.scheduled_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {session.scheduled_date}</span>}
                            {session.scheduled_time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {session.scheduled_time}</span>}
                          </div>
                        )}
                        {countdown && (
                          <div className="flex items-center gap-1 text-xs font-medium">
                            <Timer className="w-3 h-3" />
                            <span className={countdown === "ended" ? "text-destructive" : "text-primary"}>{countdown === "ended" ? "Session Ended" : countdown}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${isTeacher ? "bg-secondary/20 text-secondary" : "bg-primary/10 text-primary"}`}>{session.role}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${session.status === "completed" || session.status === "cancelled" ? "bg-muted text-muted-foreground" : "bg-accent/20 text-accent-foreground"}`}>{session.status}</span>
                          {session.task_status && session.task_status !== "none" && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">Task: {session.task_status}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {session.status === "scheduled" && countdown !== "ended" && (
                        <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                          <Button variant="hero" size="sm"><ExternalLink className="w-4 h-4" /> Join</Button>
                        </a>
                      )}
                      {isTeacher && session.status === "scheduled" && (
                        <Button variant="ghost" size="sm" onClick={() => cancelSession(session.id)}>
                          <XCircle className="w-4 h-4 text-destructive" /> Cancel Session
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Teacher: Assign Task */}
                  {isTeacher && session.status === "scheduled" && (!session.task_status || session.task_status === "none") && (
                    <div className="border-t border-border/50 pt-4 space-y-3">
                      <p className="text-sm font-medium">Assign a Task</p>
                      <Input
                        placeholder="Task title"
                        value={taskForms[session.id]?.title || ""}
                        onChange={e => setTaskForms(prev => ({ ...prev, [session.id]: { ...prev[session.id], title: e.target.value, description: prev[session.id]?.description || "" } }))}
                      />
                      <Textarea
                        placeholder="Task description / instructions..."
                        value={taskForms[session.id]?.description || ""}
                        onChange={e => setTaskForms(prev => ({ ...prev, [session.id]: { ...prev[session.id], description: e.target.value, title: prev[session.id]?.title || "" } }))}
                      />
                      <Button size="sm" onClick={() => assignTask(session.id)}>Assign Task</Button>
                    </div>
                  )}

                  {/* Learner: Submit */}
                  {!isTeacher && session.task_status === "assigned" && !session.submission && (
                    <div className="border-t border-border/50 pt-4 space-y-3">
                      <p className="text-sm font-medium">📝 Task: {session.task_title}</p>
                      <p className="text-xs text-muted-foreground">{session.task_description}</p>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Upload file (PDF/code)</label>
                          <Input
                            type="file"
                            accept=".pdf,.doc,.docx,.py,.js,.ts,.jsx,.tsx,.txt,.zip"
                            onChange={e => e.target.files?.[0] && handleFileUpload(session.id, e.target.files[0])}
                            disabled={submitting === session.id}
                          />
                        </div>
                        <div className="text-xs text-center text-muted-foreground">— or write code —</div>
                        <Textarea
                          placeholder="Write your code / answer here..."
                          className="font-mono text-xs"
                          rows={6}
                          value={textAnswers[session.id] || ""}
                          onChange={e => setTextAnswers(prev => ({ ...prev, [session.id]: e.target.value }))}
                        />
                        <Button size="sm" onClick={() => handleTextSubmit(session.id)} disabled={submitting === session.id}>
                          <Upload className="w-4 h-4" /> Submit Answer
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Teacher: Review submission */}
                  {isTeacher && session.submission && session.submission.status === "pending" && (
                    <div className="border-t border-border/50 pt-4 space-y-3">
                      <p className="text-sm font-medium">📋 Submission to Review</p>
                      {session.submission.file_url && (
                        <a href={session.submission.file_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                          <FileText className="w-4 h-4" /> View uploaded file
                        </a>
                      )}
                      {session.submission.text_answer && (
                        <pre className="bg-muted rounded-lg p-3 text-xs font-mono overflow-x-auto max-h-48">{session.submission.text_answer}</pre>
                      )}
                      <div className="flex gap-2">
                        <Button size="sm" variant="hero" onClick={() => approveSubmission(session.id)}>
                          <CheckCircle className="w-4 h-4" /> Approve & Certify
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Status indicators for submissions */}
                  {session.submission && session.submission.status === "approved" && (
                    <div className="border-t border-border/50 pt-3 flex items-center gap-2 text-sm text-primary">
                      <CheckCircle className="w-4 h-4" /> Task approved — Certificate generated! 🎓
                    </div>
                  )}
                  {session.submission && session.submission.status === "needs_revision" && (
                    <div className="border-t border-border/50 pt-3 flex items-center gap-2 text-sm text-destructive">
                      <XCircle className="w-4 h-4" /> Needs revision — please resubmit
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionsView;
