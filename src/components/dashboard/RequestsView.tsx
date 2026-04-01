import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, MessageSquare, ArrowUpRight, ArrowDownLeft, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RequestWithProfile {
  id: string;
  sender_id: string;
  receiver_id: string;
  skill: string;
  status: string;
  created_at: string;
  sender_name?: string;
  receiver_name?: string;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { label: "Pending", className: "badge-pending" },
  accepted: { label: "Accepted", className: "badge-accepted" },
  rejected: { label: "Rejected", className: "badge-rejected" },
};

const RequestsView = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<RequestWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"all" | "incoming" | "outgoing">("all");

  useEffect(() => {
    if (!user) return;
    loadRequests();

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
    else toast.success(status === "accepted" ? "Request accepted! 🎉" : "Request rejected");
  };

  const filteredRequests = requests.filter(req => {
    if (activeFilter === "incoming") return req.receiver_id === user?.id;
    if (activeFilter === "outgoing") return req.sender_id === user?.id;
    return true;
  });

  const incomingCount = requests.filter(r => r.receiver_id === user?.id && r.status === "pending").length;

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-card border border-border animate-pulse">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
              <div className="h-8 bg-muted rounded-lg w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground mb-1">Requests</h1>
          <p className="text-muted-foreground text-sm">Manage your connection requests</p>
        </div>
        {incomingCount > 0 && (
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/60 dark:border-amber-800/40 px-3 py-1.5 rounded-full text-sm font-semibold shrink-0">
            <Clock className="w-3.5 h-3.5" />
            {incomingCount} pending
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(["all", "incoming", "outgoing"] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
              activeFilter === filter
                ? "bg-white dark:bg-slate-900 text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {filteredRequests.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 shadow-card border border-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-2">No requests yet</h3>
          <p className="text-muted-foreground text-sm">
            {activeFilter === "incoming"
              ? "No incoming requests yet."
              : activeFilter === "outgoing"
              ? "You haven't sent any requests yet."
              : "Find matches and send connection requests to start learning!"}
          </p>
        </div>
      )}

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.map((req, i) => {
          const isIncoming = req.receiver_id === user?.id;
          const otherPerson = isIncoming ? req.sender_name : req.receiver_name;
          const initials = (otherPerson || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
          const status = statusConfig[req.status] || { label: req.status, className: "badge-pending" };
          const date = new Date(req.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" });

          return (
            <motion.div
              key={req.id}
              className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-card border border-border hover:shadow-elevated transition-all duration-200"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                  {initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-semibold text-sm text-foreground truncate">{otherPerson}</span>
                    <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${status.className}`}>
                      {isIncoming ? <ArrowDownLeft className="w-2.5 h-2.5" /> : <ArrowUpRight className="w-2.5 h-2.5" />}
                      {isIncoming ? "Incoming" : "Outgoing"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {isIncoming ? "Wants to learn" : "You requested"}{" "}
                    <span className="font-semibold text-primary">{req.skill}</span>
                    <span className="ml-2 text-muted-foreground/60">· {date}</span>
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {req.status === "pending" && isIncoming ? (
                    <>
                      <button
                        onClick={() => updateStatus(req.id, "accepted")}
                        className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition-colors"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => updateStatus(req.id, "rejected")}
                        className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 flex items-center justify-center text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${status.className}`}>
                      {status.label}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RequestsView;
