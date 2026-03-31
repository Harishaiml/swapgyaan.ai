import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RequestWithProfile {
  id: string;
  sender_id: string;
  receiver_id: string;
  skill: string;
  status: string;
  sender_name?: string;
  receiver_name?: string;
}

const RequestsView = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadRequests();

    // Real-time subscription
    const channel = supabase
      .channel("connection_requests_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "connection_requests" }, () => {
        loadRequests();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("connection_requests")
      .select("*")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Fetch profile names
    const userIds = [...new Set(data.flatMap((r) => [r.sender_id, r.receiver_id]))];
    const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", userIds);
    const nameMap = Object.fromEntries((profiles || []).map((p) => [p.user_id, p.name]));

    setRequests(data.map((r) => ({
      ...r,
      sender_name: nameMap[r.sender_id] || "Unknown",
      receiver_name: nameMap[r.receiver_id] || "Unknown",
    })));
    setLoading(false);
  };

  const updateStatus = async (id: string, status: "accepted" | "rejected") => {
    const { error } = await supabase.from("connection_requests").update({ status }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success(status === "accepted" ? "Request accepted!" : "Request rejected");
  };

  if (loading) return <div className="text-muted-foreground">Loading requests...</div>;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display mb-1">Connection Requests</h1>
        <p className="text-muted-foreground mb-8">Manage your learning connections</p>
      </motion.div>

      {requests.length === 0 ? (
        <p className="text-muted-foreground">No requests yet. Find matches and send connection requests!</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req, i) => {
            const isIncoming = req.receiver_id === user?.id;
            return (
              <motion.div
                key={req.id}
                className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center justify-between"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                    {(isIncoming ? req.sender_name : req.receiver_name)?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium">{isIncoming ? req.sender_name : req.receiver_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {isIncoming ? "Wants to learn" : "You requested"}: <span className="text-primary font-medium">{req.skill}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {req.status === "pending" && isIncoming ? (
                    <>
                      <Button size="sm" variant="hero" onClick={() => updateStatus(req.id, "accepted")}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => updateStatus(req.id, "rejected")}>
                        <X className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <span className={`text-xs px-3 py-1 rounded-full ${
                      req.status === "accepted" ? "bg-secondary/20 text-secondary" :
                      req.status === "rejected" ? "bg-destructive/20 text-destructive" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
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

export default RequestsView;
