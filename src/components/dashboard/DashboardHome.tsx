import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, BookOpen, Calendar, Award, ArrowRight, TrendingUp, Zap, Target,
  Plus, X, Sparkles, GraduationCap, Loader2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface DashboardHomeProps {
  onNavigate: (tab: string) => void;
}

const DashboardHome = ({ onNavigate }: DashboardHomeProps) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ matches: 0, skills: 0, sessions: 0, certs: 0 });
  const [profileName, setProfileName] = useState("");
  const [loading, setLoading] = useState(true);

  // Skills state
  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [skillsWanted, setSkillsWanted] = useState<string[]>([]);
  const [newOffered, setNewOffered] = useState("");
  const [newWanted, setNewWanted] = useState("");
  const [savingSkills, setSavingSkills] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (profile) {
      setProfileName(profile.name || "");
      setSkillsOffered(profile.skills_offered || []);
      setSkillsWanted(profile.skills_wanted || []);
      setStats((s) => ({ ...s, skills: (profile.skills_wanted || []).length }));
    }

    const [sessionRes, certRes, requestRes] = await Promise.all([
      supabase.from("sessions").select("*", { count: "exact", head: true }).or(`teacher_id.eq.${user.id},learner_id.eq.${user.id}`),
      supabase.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("connection_requests").select("*", { count: "exact", head: true }).eq("status", "accepted").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`),
    ]);

    setStats((s) => ({
      ...s,
      sessions: sessionRes.count || 0,
      certs: certRes.count || 0,
      matches: requestRes.count || 0,
    }));
    setLoading(false);
  };

  const addSkill = (type: "offered" | "wanted") => {
    if (type === "offered") {
      const val = newOffered.trim();
      if (!val) return;
      if (skillsOffered.includes(val)) {
        toast.error("Skill already added");
        return;
      }
      setSkillsOffered((prev) => [...prev, val]);
      setNewOffered("");
    } else {
      const val = newWanted.trim();
      if (!val) return;
      if (skillsWanted.includes(val)) {
        toast.error("Skill already added");
        return;
      }
      setSkillsWanted((prev) => [...prev, val]);
      setNewWanted("");
    }
  };

  const removeSkill = (type: "offered" | "wanted", index: number) => {
    if (type === "offered") setSkillsOffered((prev) => prev.filter((_, i) => i !== index));
    else setSkillsWanted((prev) => prev.filter((_, i) => i !== index));
  };

  const saveSkills = async () => {
    if (!user) return;
    setSavingSkills(true);
    const { error } = await supabase
      .from("profiles")
      .update({ skills_offered: skillsOffered, skills_wanted: skillsWanted })
      .eq("user_id", user.id);

    if (error) toast.error("Failed to save skills");
    else {
      toast.success("Skills saved! ✅");
      setStats((s) => ({ ...s, skills: skillsWanted.length }));
    }
    setSavingSkills(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  const statCards = [
    { icon: Users, label: "Connections", value: stats.matches, sub: "+12%", color: "from-blue-500 to-blue-600", lightBg: "bg-blue-50 dark:bg-blue-950/30", text: "text-blue-600 dark:text-blue-400" },
    { icon: BookOpen, label: "Learning Goals", value: stats.skills, sub: "Active", color: "from-teal-500 to-teal-600", lightBg: "bg-teal-50 dark:bg-teal-950/30", text: "text-teal-600 dark:text-teal-400" },
    { icon: Calendar, label: "Sessions", value: stats.sessions, sub: "Total", color: "from-violet-500 to-violet-600", lightBg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-600 dark:text-violet-400" },
    { icon: Award, label: "Certificates", value: stats.certs, sub: "Earned", color: "from-amber-500 to-amber-600", lightBg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-600 dark:text-amber-400" },
  ];

  const quickActions = [
    { icon: Target, title: "Find Skill Matches", desc: "Discover peers who teach what you want to learn", key: "match", gradient: "from-blue-500 to-indigo-600", cta: "Browse Matches" },
    { icon: Zap, title: "Book a Session", desc: "Schedule a learning session with connected teachers", key: "sessions", gradient: "from-teal-500 to-cyan-600", cta: "View Sessions" },
    { icon: TrendingUp, title: "Ask AI Tutor", desc: "Get instant answers and personalized learning roadmaps", key: "ai", gradient: "from-purple-500 to-pink-600", cta: "Open AI Tutor" },
  ];

  const container = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
  const item = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } } };

  return (
    <motion.div variants={container} initial="hidden" animate="visible" className="space-y-5">

      {/* ── Welcome Banner ── */}
      <motion.div variants={item} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-teal-600 p-5 md:p-7 text-white shadow-glow">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.12),transparent)]" />
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-28 translate-x-28" />
        <div className="relative z-10">
          <p className="text-blue-200 text-xs font-medium mb-1">{greeting()},</p>
          <h1 className="text-xl md:text-2xl font-bold font-display mb-1.5">
            {loading
              ? <span className="inline-block w-36 h-7 rounded-lg bg-white/20 animate-pulse" />
              : `${profileName || "there"} 👋`}
          </h1>
          <p className="text-blue-100 text-xs max-w-sm leading-relaxed">
            Track your progress, find new connections, and keep learning every day.
          </p>
          <button
            onClick={() => onNavigate("match")}
            className="mt-4 inline-flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 border border-white/20"
          >
            Explore Matches <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>

      {/* ── Skills Section (Prominent) ── */}
      <motion.div variants={item} className="grid md:grid-cols-2 gap-4">

        {/* Skills You Teach */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-border p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <GraduationCap className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-foreground leading-tight">Skills You Teach</h2>
              <p className="text-[11px] text-muted-foreground">What can you teach others?</p>
            </div>
            {skillsOffered.length > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-teal-100 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/40">
                {skillsOffered.length}
              </span>
            )}
          </div>

          {/* Skill chips */}
          <div className="flex flex-wrap gap-1.5 min-h-[32px] mb-3">
            {skillsOffered.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No teaching skills added yet</p>
            ) : (
              skillsOffered.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200/60 dark:bg-teal-950/30 dark:text-teal-400 dark:border-teal-800/40">
                  {s}
                  <button onClick={() => removeSkill("offered", i)} className="hover:text-red-500 transition-colors ml-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Add skill input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a teaching skill..."
              value={newOffered}
              onChange={(e) => setNewOffered(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("offered"))}
              className="flex-1 h-8 text-xs rounded-lg border-border"
            />
            <button
              onClick={() => addSkill("offered")}
              className="w-8 h-8 rounded-lg bg-teal-500 hover:bg-teal-600 flex items-center justify-center text-white shrink-0 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Skills You Want to Learn */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-card border border-border p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm flex-shrink-0">
              <Sparkles className="w-4.5 h-4.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold font-display text-foreground leading-tight">Skills You Want to Learn</h2>
              <p className="text-[11px] text-muted-foreground">What would you like to master?</p>
            </div>
            {skillsWanted.length > 0 && (
              <span className="ml-auto text-[10px] font-bold bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/40">
                {skillsWanted.length}
              </span>
            )}
          </div>

          {/* Skill chips */}
          <div className="flex flex-wrap gap-1.5 min-h-[32px] mb-3">
            {skillsWanted.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No learning goals added yet</p>
            ) : (
              skillsWanted.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/60 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800/40">
                  {s}
                  <button onClick={() => removeSkill("wanted", i)} className="hover:text-red-500 transition-colors ml-0.5">
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))
            )}
          </div>

          {/* Add skill input */}
          <div className="flex gap-2">
            <Input
              placeholder="Add a learning goal..."
              value={newWanted}
              onChange={(e) => setNewWanted(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("wanted"))}
              className="flex-1 h-8 text-xs rounded-lg border-border"
            />
            <button
              onClick={() => addSkill("wanted")}
              className="w-8 h-8 rounded-lg bg-blue-500 hover:bg-blue-600 flex items-center justify-center text-white shrink-0 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Save Skills button — appears when there are changes */}
      {(skillsOffered.length > 0 || skillsWanted.length > 0) && (
        <motion.div variants={item} className="flex justify-end">
          <button
            onClick={saveSkills}
            disabled={savingSkills}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-60"
          >
            {savingSkills ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            {savingSkills ? "Saving..." : "Save Skills"}
          </button>
        </motion.div>
      )}

      {/* ── Stats Grid ── */}
      <motion.div variants={item}>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Your Stats</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((stat) => (
            <div
              key={stat.label}
              className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-card border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-3 shadow-sm`}>
                <stat.icon className="w-4 h-4 text-white" />
              </div>
              <div className="text-2xl font-bold font-display text-foreground">
                {loading ? <span className="inline-block w-8 h-6 rounded bg-muted animate-pulse" /> : stat.value}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              <div className={`text-xs font-semibold mt-1 ${stat.text}`}>{stat.sub}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── Quick Actions ── */}
      <motion.div variants={item}>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <button
              key={action.key}
              onClick={() => onNavigate(action.key)}
              className="group text-left bg-white dark:bg-slate-900 rounded-xl p-4 shadow-card border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform duration-300`}>
                <action.icon className="w-4 h-4 text-white" />
              </div>
              <h3 className="font-semibold font-display text-sm text-foreground mb-1">{action.title}</h3>
              <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">{action.desc}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-primary group-hover:gap-2.5 transition-all duration-200">
                {action.cta} <ArrowRight className="w-3 h-3" />
              </span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ── Learning Journey Flow ── */}
      <motion.div variants={item} className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-card border border-border">
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-3">Your Learning Journey</p>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {[
            { step: "Match", key: "match", color: "bg-blue-500" },
            { step: "Request", key: "requests", color: "bg-violet-500" },
            { step: "Book Slot", key: "sessions", color: "bg-cyan-500" },
            { step: "Learn", key: "sessions", color: "bg-teal-500" },
            { step: "Task", key: "sessions", color: "bg-orange-500" },
            { step: "Certificate", key: "certificates", color: "bg-amber-500" },
          ].map((item, i, arr) => (
            <div key={item.step} className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={() => onNavigate(item.key)}
                className={`inline-flex items-center gap-1.5 ${item.color} text-white text-[11px] font-bold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity`}
              >
                <span className="w-4 h-4 rounded-full bg-white/25 flex items-center justify-center text-[9px] font-black">{i + 1}</span>
                {item.step}
              </button>
              {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DashboardHome;
