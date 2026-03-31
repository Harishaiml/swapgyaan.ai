import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, BookOpen, Calendar, Award, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DashboardHomeProps {
  onNavigate: (tab: string) => void;
}

const DashboardHome = ({ onNavigate }: DashboardHomeProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ matches: 0, skills: 0, sessions: 0, certs: 0 });
  const [profileName, setProfileName] = useState("");

  useEffect(() => {
    if (!user) return;
    loadStats();
  }, [user]);

  const loadStats = async () => {
    if (!user) return;

    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (profile) {
      setProfileName(profile.name);
      setStats((s) => ({ ...s, skills: profile.skills_wanted.length }));
    }

    const { count: sessionCount } = await supabase
      .from("sessions")
      .select("*", { count: "exact", head: true })
      .or(`teacher_id.eq.${user.id},learner_id.eq.${user.id}`);

    const { count: certCount } = await supabase
      .from("certificates")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const { count: requestCount } = await supabase
      .from("connection_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`);

    setStats((s) => ({
      ...s,
      sessions: sessionCount || 0,
      certs: certCount || 0,
      matches: requestCount || 0,
    }));
  };

  const statItems = [
    { icon: Users, label: "Connections", value: stats.matches.toString(), color: "bg-gradient-primary" },
    { icon: BookOpen, label: "Skills Learning", value: stats.skills.toString(), color: "bg-gradient-secondary" },
    { icon: Calendar, label: "Sessions", value: stats.sessions.toString(), color: "bg-gradient-accent" },
    { icon: Award, label: "Certificates", value: stats.certs.toString(), color: "bg-gradient-primary" },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display mb-1">Welcome, {profileName || "there"}! 👋</h1>
        <p className="text-muted-foreground mb-8">Here's your learning progress overview</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statItems.map((stat, i) => (
          <motion.div
            key={stat.label}
            className="bg-card rounded-xl p-5 shadow-card border border-border/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center mb-3`}>
              <stat.icon className="w-5 h-5 text-primary-foreground" />
            </div>
            <div className="text-2xl font-bold font-display">{stat.value}</div>
            <div className="text-sm text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <motion.div
          className="bg-card rounded-xl p-6 shadow-card border border-border/50 cursor-pointer hover:shadow-elevated transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          onClick={() => onNavigate("match")}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-lg">Find Skill Matches</h3>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Discover peers who teach what you want to learn</p>
        </motion.div>

        <motion.div
          className="bg-card rounded-xl p-6 shadow-card border border-border/50 cursor-pointer hover:shadow-elevated transition-shadow"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          onClick={() => onNavigate("profile")}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-display font-semibold text-lg">Update Your Profile</h3>
            <ArrowRight className="w-5 h-5 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">Add skills you teach and want to learn to get matched</p>
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardHome;
