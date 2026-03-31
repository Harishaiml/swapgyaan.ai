import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Award, Download, Share2, Loader } from "lucide-react";
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

    // Subscribe to real-time changes
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
    
    // FetchCertificates earned by current user (as learner)
    const { data: earned } = await supabase
      .from("certificates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setEarnedCerts(earned || []);

    // Fetch certificates issued by current user (as teacher)
    // This uses RLS policy: teachers can see certs they issued via session relationship
    const { data: issued } = await supabase
      .from("certificates")
      .select("*")
      .order("created_at", { ascending: false });

    // Filter for only certificates issued by this teacher
    const sessionIds = (earned || []).map(c => c.session_id).filter(Boolean);
    if (sessionIds.length > 0) {
      const { data: sessions } = await supabase
        .from("sessions")
        .select("id, teacher_id, learner_id")
        .in("id", sessionIds)
        .eq("teacher_id", user.id);

      const teacherSessionIds = (sessions || []).map(s => s.id);
      const filteredIssued = (issued || []).filter(c => 
        teacherSessionIds.includes(c.session_id) && c.user_id !== user.id
      );
      setIssuedCerts(filteredIssued);
    } else {
      setIssuedCerts([]);
    }

    setLoading(false);
  };

  const shareCert = (certId: string) => {
    const url = `${window.location.origin}/verify?cert=${certId}`;
    navigator.clipboard.writeText(url);
    toast.success("Verification link copied!");
  };

  const handleDownloadFromStorage = (cert: any) => {
    if (cert.pdf_url) {
      const link = document.createElement("a");
      link.href = cert.pdf_url;
      link.download = `${cert.skill_name}-certificate`;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Certificate downloaded!");
    }
  };

  const handleDownloadDocx = async (cert: any) => {
    setDownloadingId(cert.id);
    try {
      // Try to download from storage first (faster, persisted)
      if (cert.pdf_url) {
        handleDownloadFromStorage(cert);
      } else {
        // Fallback: regenerate DOCX locally
        const docBlob = await generateCertificate({
          learnerName: "Learner",
          teacherName: cert.mentor_name || "Teacher",
          skillName: cert.skill_name,
          date: new Date(cert.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
          certificateId: cert.certificate_id,
        });

        downloadCertificate(docBlob, `${cert.skill_name}-certificate.docx`);
      }
      toast.success("Certificate downloaded!");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download certificate");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="text-muted-foreground">Loading certificates...</div>;

  const renderCertificateGrid = (certs: any[], title: string, emptyMessage: string) => {
    if (certs.length === 0) {
      return <p className="text-muted-foreground">{emptyMessage}</p>;
    }

    return (
      <>
        <h2 className="text-2xl font-bold font-display mb-4 mt-8">{title}</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {certs.map((cert, i) => (
            <motion.div
              key={cert.id}
              className="relative group bg-card rounded-2xl overflow-hidden shadow-lg border border-border/40 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.1, type: "spring" }}
            >
              {/* Premium Top Half */}
              <div className="relative p-8 text-center bg-gradient-to-br from-[#1E293B] to-[#0F172A] overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-yellow-500 via-transparent to-transparent"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 p-0.5 shadow-lg shadow-yellow-500/20">
                    <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center">
                      <Award className="w-8 h-8 text-yellow-400" />
                    </div>
                  </div>
                  <h3 className="text-2xl font-black font-display tracking-tight text-white mb-1">CERTIFICATE</h3>
                  <p className="text-sm font-medium text-yellow-400/90 uppercase tracking-widest mb-1">of Completion</p>
                  <div className="w-12 h-0.5 bg-yellow-500/50 mx-auto my-3 rounded-full"></div>
                  <p className="text-lg font-semibold text-slate-200">{cert.skill_name}</p>
                </div>
              </div>
              <div className="p-6 bg-card">
                <div className="text-sm space-y-3 mb-6">
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Teacher</span>
                    <span className="font-bold text-foreground">{cert.mentor_name}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border/50 pb-2">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Date</span>
                    <span className="font-bold text-foreground">{new Date(cert.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider font-semibold">Credential ID</span>
                    <span className="font-mono text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-md">{cert.certificate_id}</span>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Button
                    variant="default"
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white border-0 shadow-md shadow-yellow-500/20"
                    onClick={() => handleDownloadDocx(cert)}
                    disabled={downloadingId === cert.id}
                  >
                    {downloadingId === cert.id ? (
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4 mr-2" />
                    )}
                    Download
                  </Button>
                  <Button variant="outline" className="shrink-0 hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => shareCert(cert.certificate_id)}>
                    <Share2 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </>
    );
  };

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display mb-1">Certificates</h1>
        <p className="text-muted-foreground mb-8">View and manage your certificates</p>
      </motion.div>

      {/* My Earned Certificates (as learner) */}
      {renderCertificateGrid(
        earnedCerts,
        "My Earned Certificates",
        "No certificates earned yet. Complete tasks to earn certificates!"
      )}

      {/* Issued Certificates (as teacher) */}
      {issuedCerts.length > 0 && renderCertificateGrid(
        issuedCerts,
        "Certificates Issued",
        "No certificates issued yet"
      )}

      {/* Empty state */}
      {earnedCerts.length === 0 && issuedCerts.length === 0 && (
        <motion.div
          className="bg-card rounded-xl p-12 shadow-card border border-border/50 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Award className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg mb-2">No certificates yet</h3>
          <p className="text-muted-foreground">Complete approved tasks to earn and view certificates</p>
        </motion.div>
      )}
    </div>
  );
};

export default CertificatesView;
