import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Video, ExternalLink, Calendar, Clock, User, BookOpen, Upload,
  FileText, CheckCircle, XCircle, Timer, Loader2, Plus, ClipboardList
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateCertificate } from "@/utils/certificateGenerator";

const SessionsView = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [taskForms, setTaskForms] = useState<Record<string, { title: string; description: string }>>({});
  const [now, setNow] = useState(Date.now());
  const [activeFilter, setActiveFilter] = useState<"all" | "scheduled" | "completed" | "cancelled">("all");

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
    const session = sessions.find(s => s.id === id);
    const { error } = await supabase
      .from("sessions")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("teacher_id", user.id);

    if (error) { toast.error(error.message || "Failed to cancel session"); return; }

    if (session?.slot_id) {
      await supabase.from("teacher_slots").update({ is_booked: false, booked_by: null } as any).eq("id", session.slot_id);
    }

    toast.success("Session cancelled");
    loadSessions();
  };

  const assignTask = async (sessionId: string) => {
    const form = taskForms[sessionId];
    if (!form?.title?.trim() || !form?.description?.trim()) { toast.error("Fill task title and description"); return; }
    const { error } = await supabase.from("sessions").update({
      task_title: form.title,
      task_description: form.description,
      task_status: "assigned",
    }).eq("id", sessionId);
    if (error) toast.error(error.message);
    else {
      toast.success("Task assigned! ✅");
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
    else { toast.success("File submitted! ✅"); loadSessions(); }
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
      toast.success("Answer submitted! ✅");
      const session = sessions.find(s => s.id === sessionId);
      if (session?.task_description) {
        try {
          const resp = await supabase.functions.invoke("evaluate-code", {
            body: { code: text, task_description: session.task_description, session_id: sessionId },
          });
          if (resp.data?.pass) toast.success(`Auto-evaluated: Score ${resp.data.score}/100 ✅`);
          else if (resp.data?.feedback) toast("Feedback: " + resp.data.feedback);
        } catch { /* fallback */ }
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
      .update({ task_status: "approved", status: "completed" })
      .eq("id", sessionId)
      .eq("teacher_id", user.id);

    if (approveError) { toast.error(approveError.message || "Only the teacher can approve this session"); return; }

    if (session.submission) {
      await supabase.from("task_submissions").update({ status: "approved" } as any).eq("id", session.submission.id);
    }

    const { data: existingCerts } = await supabase
      .from("certificates")
      .select("id, certificate_id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1);

    const existingCert = existingCerts?.[0] || null;
    const certId = existingCert?.certificate_id ||
      `SG-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    let docBlob: Blob | null = null;
    let pdfUrl = "";

    try {
      docBlob = await generateCertificate({
        learnerName: session.learner_name,
        teacherName: session.teacher_name,
        skillName: session.skill || session.task_title || "Skill",
        date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
        certificateId: certId,
      });
    } catch (error) {
      toast.error("Certificate generation failed: " + (error instanceof Error ? error.message : String(error)));
      loadSessions();
      return;
    }

    try {
      const safeSkill = (session.skill || "skill").replace(/[^a-zA-Z0-9-_]/g, "_");
      const safeName = (session.learner_name || "learner").replace(/[^a-zA-Z0-9-_]/g, "_");
      const fileName = `${certId}-${safeName}-${safeSkill}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from("certificates")
        .upload(fileName, docBlob!, { contentType: "application/pdf", upsert: true });

      if (!uploadError) {
        const { data: urlData } = supabase.storage.from("certificates").getPublicUrl(fileName);
        pdfUrl = urlData.publicUrl;
      }
    } catch { }

    const payload = {
      certificate_id: certId,
      user_id: session.learner_id,
      session_id: sessionId,
      skill_name: session.skill || session.task_title || "Skill",
      mentor_name: session.teacher_name,
      pdf_url: pdfUrl,
    };

    const { error: certDbError } = existingCert?.id
      ? await supabase.from("certificates").update(payload).eq("id", existingCert.id)
      : await supabase.from("certificates").insert(payload);

    if (certDbError) toast.error("Certificate DB save failed: " + (certDbError.message || "Unknown error"));

    toast.success("✅ Task approved — Certificate generated!");
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

  const statusConfig: Record<string, string> = {
    scheduled: "badge-scheduled",
    completed: "badge-completed",
    cancelled: "badge-cancelled",
  };

  const filteredSessions = sessions.filter(s =>
    activeFilter === "all" ? true : s.status === activeFilter
  );

  const counts = {
    all: sessions.length,
    scheduled: sessions.filter(s => s.status === "scheduled").length,
    completed: sessions.filter(s => s.status === "completed").length,
    cancelled: sessions.filter(s => s.status === "cancelled").length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-card border border-border animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="flex gap-2 mt-3">
                  <div className="h-8 bg-muted rounded-lg w-20" />
                  <div className="h-8 bg-muted rounded-lg w-28" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground mb-1">Sessions</h1>
        <p className="text-muted-foreground text-sm">Your learning and teaching sessions</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit flex-wrap">
        {(["all", "scheduled", "completed", "cancelled"] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 capitalize ${
              activeFilter === filter
                ? "bg-white dark:bg-slate-900 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {filter} {counts[filter] > 0 && <span className="ml-1 opacity-60">({counts[filter]})</span>}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredSessions.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 shadow-card border border-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center mx-auto mb-4">
            <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-2">No sessions yet</h3>
          <p className="text-muted-foreground text-sm">Book a slot from a matched teacher to start learning!</p>
        </div>
      )}

      {/* Session Cards */}
      <div className="space-y-4">
        {filteredSessions.map((session, i) => {
          const countdown = getCountdown(session);
          const isTeacher = session.role === "Teaching";

          return (
            <motion.div
              key={session.id}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-border overflow-hidden hover:shadow-elevated transition-all duration-200"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              {/* Session Header */}
              <div className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                      isTeacher
                        ? "bg-gradient-to-br from-teal-500 to-cyan-600"
                        : "bg-gradient-to-br from-blue-500 to-indigo-600"
                    }`}>
                      <Video className="w-5 h-5 text-white" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="font-semibold font-display text-foreground">{session.skill}</h3>
                      <p className="text-sm text-muted-foreground">with <span className="font-medium text-foreground">{session.partner}</span></p>

                      {/* Meta info */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3" /> {session.teacher_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" /> {session.learner_name}
                        </span>
                      </div>

                      {/* Date/Time */}
                      {(session.scheduled_date || session.scheduled_time) && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {session.scheduled_date && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{session.scheduled_date}
                            </span>
                          )}
                          {session.scheduled_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />{session.scheduled_time}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Countdown */}
                      {countdown && (
                        <div className="flex items-center gap-1 text-xs font-medium">
                          <Timer className="w-3 h-3" />
                          <span className={countdown === "ended" ? "text-destructive" : "text-primary"}>
                            {countdown === "ended" ? "Session Ended" : countdown}
                          </span>
                        </div>
                      )}

                      {/* Status badges */}
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isTeacher
                            ? "bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/40"
                            : "bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40"
                        }`}>
                          {session.role}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusConfig[session.status] || "badge-pending"}`}>
                          {session.status}
                        </span>
                        {session.task_status && session.task_status !== "none" && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200/60 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-800/40">
                            Task: {session.task_status}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 shrink-0">
                    {session.status === "scheduled" && countdown !== "ended" && (
                      <a href={session.meeting_link} target="_blank" rel="noopener noreferrer">
                        <button className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md">
                          <ExternalLink className="w-3.5 h-3.5" /> Join Meeting
                        </button>
                      </a>
                    )}
                    {isTeacher && session.status === "scheduled" && (
                      <button
                        onClick={() => cancelSession(session.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-destructive px-3 py-2 rounded-lg hover:bg-destructive/5 transition-all duration-200"
                      >
                        <XCircle className="w-3.5 h-3.5" /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Task sections */}
              {/* Teacher: Assign Task */}
              {isTeacher && session.status === "scheduled" && (!session.task_status || session.task_status === "none") && (
                <div className="border-t border-border/50 p-5 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-violet-600" />
                    <p className="text-sm font-semibold text-foreground">Assign a Task</p>
                  </div>
                  <div className="space-y-2">
                    <Input
                      placeholder="Task title"
                      value={taskForms[session.id]?.title || ""}
                      onChange={e => setTaskForms(prev => ({ ...prev, [session.id]: { ...prev[session.id], title: e.target.value, description: prev[session.id]?.description || "" } }))}
                      className="rounded-xl text-sm"
                    />
                    <Textarea
                      placeholder="Task description / instructions..."
                      value={taskForms[session.id]?.description || ""}
                      onChange={e => setTaskForms(prev => ({ ...prev, [session.id]: { ...prev[session.id], description: e.target.value, title: prev[session.id]?.title || "" } }))}
                      className="rounded-xl text-sm resize-none"
                      rows={3}
                    />
                    <button
                      onClick={() => assignTask(session.id)}
                      className="inline-flex items-center gap-2 bg-violet-500 hover:bg-violet-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Assign Task
                    </button>
                  </div>
                </div>
              )}

              {/* Learner: Submit Task */}
              {!isTeacher && session.task_status === "assigned" && !session.submission && (
                <div className="border-t border-border/50 p-5 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-orange-600" />
                    <p className="text-sm font-semibold text-foreground">📝 {session.task_title}</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{session.task_description}</p>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Upload file (PDF/code)</label>
                      <Input
                        type="file"
                        accept=".pdf,.doc,.docx,.py,.js,.ts,.jsx,.tsx,.txt,.zip"
                        onChange={e => e.target.files?.[0] && handleFileUpload(session.id, e.target.files[0])}
                        disabled={submitting === session.id}
                        className="rounded-xl text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or write code</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <Textarea
                      placeholder="Write your code / answer here..."
                      className="font-mono text-xs rounded-xl resize-none"
                      rows={6}
                      value={textAnswers[session.id] || ""}
                      onChange={e => setTextAnswers(prev => ({ ...prev, [session.id]: e.target.value }))}
                    />
                    <button
                      onClick={() => handleTextSubmit(session.id)}
                      disabled={submitting === session.id}
                      className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {submitting === session.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      Submit Answer
                    </button>
                  </div>
                </div>
              )}

              {/* Teacher: Review submission */}
              {isTeacher && session.submission && session.submission.status === "pending" && session.task_status !== "approved" && (
                <div className="border-t border-border/50 p-5 bg-muted/30">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <p className="text-sm font-semibold text-foreground">📋 Submission to Review</p>
                  </div>
                  {session.submission.file_url && (
                    <a href={session.submission.file_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-3">
                      <FileText className="w-4 h-4" /> View uploaded file
                    </a>
                  )}
                  {session.submission.text_answer && (
                    <pre className="bg-slate-900 dark:bg-slate-950 text-slate-100 rounded-xl p-4 text-xs font-mono overflow-x-auto max-h-48 mb-3">
                      {session.submission.text_answer}
                    </pre>
                  )}
                  <button
                    onClick={() => approveSubmission(session.id)}
                    className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-all duration-200 shadow-sm"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Approve & Generate Certificate
                  </button>
                </div>
              )}

              {/* Approved badge */}
              {(session.task_status === "approved" || (session.submission && session.submission.status === "approved")) && (
                <div className="border-t border-border/50 p-4 bg-emerald-50 dark:bg-emerald-950/20">
                  <div className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle className="w-5 h-5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm">Task Approved — Certificate Generated! 🎓</p>
                      <p className="text-xs opacity-80 mt-0.5">
                        {isTeacher ? "Learner can download from their Certificates page." : "Download your certificate from the Certificates page."}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {session.submission && session.submission.status === "needs_revision" && (
                <div className="border-t border-border/50 p-4 bg-red-50 dark:bg-red-950/20 flex items-center gap-2 text-red-600 dark:text-red-400">
                  <XCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Needs revision — please resubmit</span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SessionsView;
