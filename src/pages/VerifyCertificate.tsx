import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SUPABASE_ANON_KEY, SUPABASE_PROJECT_URL } from "@/integrations/supabase/client";

const VerifyCertificate = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const certParam = searchParams.get("cert") || id || "";

  const [cert, setCert] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);
  const [inputCert, setInputCert] = useState(certParam);

  useEffect(() => {
    setInputCert(certParam);
  }, [certParam]);

  useEffect(() => {
    const verify = async () => {
      if (!certParam) {
        setCert(null);
        setVerified(false);
        setLoading(false);
        return;
      }

      setLoading(true);
      const endpoint = `${SUPABASE_PROJECT_URL}/functions/v1/verify-certificate`;
      console.info("[verify-certificate] request", { endpoint, certificate_id: certParam });

      let data: any = null;
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ certificate_id: certParam }),
        });

        data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || `verify-certificate failed with status ${response.status}`);
        }
      } catch (requestError) {
        console.error("[verify-certificate] request failed", requestError);
        data = null;
      }

      if (data?.valid) {
        setCert(data);
        setVerified(true);
      } else {
        setCert(null);
        setVerified(false);
      }
      setLoading(false);
    };

    verify();
  }, [certParam]);

  const onVerifyClick = () => {
    const value = inputCert.trim();
    if (!value) return;
    setSearchParams({ cert: value });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Verifying certificate...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        className="bg-card rounded-2xl p-8 shadow-elevated border border-border/50 max-w-md w-full text-center"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="mb-6 space-y-2">
          <Input
            value={inputCert}
            onChange={(e) => setInputCert(e.target.value)}
            placeholder="Enter certificate ID"
          />
          <Button onClick={onVerifyClick} className="w-full">Verify</Button>
        </div>

        {verified ? (
          <>
            <div className="w-16 h-16 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-secondary" />
            </div>
            <h1 className="text-2xl font-bold font-display mb-2">Certificate Verified ✅</h1>
            <p className="text-muted-foreground mb-6">This certificate is authentic and issued by SwapGyaan AI.</p>
            <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Certificate ID</span>
                <span className="font-mono text-xs">{cert.certificate_id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Skill</span>
                <span className="font-medium">{cert.skill_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Learner</span>
                <span className="font-medium">{cert.learner_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Teacher</span>
                <span className="font-medium">{cert.teacher_name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Issued</span>
                <span className="font-medium">{new Date(cert.created_at).toLocaleDateString()}</span>
              </div>
            </div>
            {cert.pdf_url && (
              <a href={cert.pdf_url} target="_blank" rel="noopener noreferrer">
                <Button className="w-full mb-4">Open Certificate PDF</Button>
              </a>
            )}
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center mx-auto mb-6">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-bold font-display mb-2">Invalid Certificate</h1>
            <p className="text-muted-foreground mb-6">This certificate ID could not be verified.</p>
          </>
        )}
        <Link to="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Back to SwapGyaan AI
          </Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default VerifyCertificate;
