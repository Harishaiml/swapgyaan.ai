import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Award, Download, Share2, Loader2, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateCertificate, downloadCertificate } from "@/utils/certificateGenerator";

const CertificatesView = () => {
  const { user } = useAuth();
  const [earnedCerts, setEarnedCerts] = useState<any[]>([]);
  const [issuedCerts, setIssuedCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadCertificates();

    const channel = supabase
      .channel("certificates_all")
      .on("postgres_changes", { event: "*", schema: "public", table: "certificates" }, () => {
        loadCertificates();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadCertificates = async () => {
    if (!user) return;

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("name")
      .eq("user_id", user.id)
      .maybeSingle();

    const myName = myProfile?.name || "Learner";

    const { data: earnedRaw } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setEarnedCerts((earnedRaw || []).map(c => ({ ...c, learner_name: myName })));

    const { data: teacherSessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("status", "completed");

    if (teacherSessions && teacherSessions.length > 0) {
      const teacherSessionIds = teacherSessions.map((s: any) => s.id);

      const { data: issuedRaw } = await supabase
        .from("certificates")
        .select("*")
        .in("session_id", teacherSessionIds)
        .order("created_at", { ascending: false });

      const teacherIssuedRaw = (issuedRaw || []).filter((c: any) => c.user_id !== user.id);

      if (teacherIssuedRaw.length > 0) {
        const learnerIds = [...new Set(teacherIssuedRaw.map((c: any) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", learnerIds);

        const profileMap: Record<string, string> = Object.fromEntries(
          (profiles || []).map((p: any) => [p.user_id, p.name])
        );

        setIssuedCerts(teacherIssuedRaw.map((c: any) => ({
          ...c,
          learner_name: profileMap[c.user_id] || "Learner",
        })));
      } else {
        setIssuedCerts([]);
      }
    } else {
      setIssuedCerts([]);
    }

    setLoading(false);
  };

  const shareCert = (certId: string) => {
    const url = `${window.location.origin}/verify?cert=${certId}`;
    navigator.clipboard.writeText(url);
    toast.success("Verification link copied! 🔗");
  };

  const handleDownload = async (cert: any) => {
    setDownloadingId(cert.id);
    try {
      const blob = await generateCertificate({
        learnerName: cert.learner_name || "Learner",
        teacherName: cert.mentor_name || "Teacher",
        skillName: cert.skill_name,
        date: new Date(cert.created_at).toLocaleDateString("en-US", {
          year: "numeric", month: "long", day: "numeric",
        }),
        certificateId: cert.certificate_id,
      });
      downloadCertificate(blob, `${cert.skill_name}-certificate.pdf`);
      toast.success("Certificate downloaded! 🎓");
    } catch (error) {
      if (cert.pdf_url) {
        window.open(cert.pdf_url, "_blank");
        toast.success("Certificate opened!");
      } else {
        toast.error("Failed to download certificate");
      }
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-border animate-pulse overflow-hidden">
              <div className="h-36 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800" />
              <div className="p-5 space-y-3">
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-2/3" />
                <div className="h-9 bg-muted rounded-xl mt-4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const renderCertGrid = (certs: any[], isTeacher = false) => (
    <div className="grid md:grid-cols-2 gap-5">
      {certs.map((cert, i) => (
        <motion.div
          key={cert.id}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-border overflow-hidden hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.08, type: "spring" }}
        >
          {/* Premium top section */}
          <div className="relative p-8 text-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            {/* Ambient glow */}
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_top,_#facc15,_transparent)]" />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-yellow-500/50 to-transparent" />

            <div className="relative z-10">
              {/* Icon */}
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Award className="w-7 h-7 text-white" />
              </div>

              <p className="text-yellow-400/80 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Certificate of Completion</p>
              <h3 className="text-xl font-black font-display text-white mb-2 tracking-tight">{cert.skill_name}</h3>

              {isTeacher ? (
                <p className="text-slate-400 text-xs">Issued to <span className="text-slate-200 font-semibold">{cert.learner_name}</span></p>
              ) : (
                <p className="text-slate-400 text-xs">Earned by <span className="text-slate-200 font-semibold">{cert.learner_name}</span></p>
              )}
            </div>
          </div>

          {/* Details section */}
          <div className="p-5">
            <div className="space-y-2.5 mb-5">
              {isTeacher ? (
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Learner</span>
                  <span className="font-semibold text-sm text-foreground">{cert.learner_name}</span>
                </div>
              ) : (
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Teacher</span>
                  <span className="font-semibold text-sm text-foreground">{cert.mentor_name}</span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</span>
                <span className="font-semibold text-sm text-foreground">
                  {new Date(cert.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Credential ID</span>
                <span className="font-mono text-[10px] font-semibold text-primary bg-primary/8 px-2 py-1 rounded-lg border border-primary/20">
                  {cert.certificate_id}
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50"
                onClick={() => handleDownload(cert)}
                disabled={downloadingId === cert.id}
              >
                {downloadingId === cert.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                Download PDF
              </button>
              <button
                className="w-10 h-10 rounded-xl bg-muted hover:bg-muted-foreground/10 flex items-center justify-center transition-colors shrink-0"
                onClick={() => shareCert(cert.certificate_id)}
                title="Copy verification link"
              >
                <Share2 className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground mb-1">Certificates</h1>
        <p className="text-muted-foreground text-sm">View and download your earned certificates</p>
      </div>

      {/* Empty state */}
      {earnedCerts.length === 0 && issuedCerts.length === 0 && (
        <motion.div
          className="bg-white dark:bg-slate-900 rounded-2xl p-12 shadow-card border border-border text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="w-20 h-20 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-5">
            <Award className="w-10 h-10 text-amber-500" />
          </div>
          <h3 className="font-display font-bold text-xl text-foreground mb-2">No certificates yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Complete sessions, submit tasks, and get them approved by your teacher to earn certificates.
          </p>
        </motion.div>
      )}

      {/* Earned as learner */}
      {earnedCerts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <GraduationCap className="w-4 h-4 text-amber-500" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              My Earned Certificates <span className="text-foreground">({earnedCerts.length})</span>
            </h2>
          </div>
          {renderCertGrid(earnedCerts, false)}
        </div>
      )}

      {/* Issued as teacher */}
      {issuedCerts.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-teal-500" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
              Certificates I Issued <span className="text-foreground">({issuedCerts.length})</span>
            </h2>
          </div>
          {renderCertGrid(issuedCerts, true)}
        </div>
      )}
    </div>
  );
};

export default CertificatesView;
