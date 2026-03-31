import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, User, BookOpen, Award, Calendar, Sparkles, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const ProfileView = () => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [skillsOffered, setSkillsOffered] = useState<string[]>([]);
  const [skillsWanted, setSkillsWanted] = useState<string[]>([]);
  const [newOffered, setNewOffered] = useState("");
  const [newWanted, setNewWanted] = useState("");
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ sessions: 0, certs: 0, slots: 0, connections: 0 });

  useEffect(() => {
    if (!user) return;
    loadProfile();
    loadStats();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (data) {
      setName(data.name);
      setBio(data.bio || "");
      setSkillsOffered(data.skills_offered || []);
      setSkillsWanted(data.skills_wanted || []);
    }
  };

  const loadStats = async () => {
    if (!user) return;
    const [sessionRes, certRes, slotRes, connRes] = await Promise.all([
      supabase.from("sessions").select("*", { count: "exact", head: true }).or(`teacher_id.eq.${user.id},learner_id.eq.${user.id}`),
      supabase.from("certificates").select("*", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("teacher_slots").select("*", { count: "exact", head: true }).eq("teacher_id", user.id).eq("is_active", true),
      supabase.from("connection_requests").select("*", { count: "exact", head: true }).eq("status", "accepted").or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    ]);
    setStats({
      sessions: sessionRes.count || 0,
      certs: certRes.count || 0,
      slots: slotRes.count || 0,
      connections: connRes.count || 0,
    });
  };

  const addSkill = (type: "offered" | "wanted") => {
    if (type === "offered" && newOffered.trim()) {
      if (!skillsOffered.includes(newOffered.trim())) {
        setSkillsOffered([...skillsOffered, newOffered.trim()]);
      }
      setNewOffered("");
    } else if (type === "wanted" && newWanted.trim()) {
      if (!skillsWanted.includes(newWanted.trim())) {
        setSkillsWanted([...skillsWanted, newWanted.trim()]);
      }
      setNewWanted("");
    }
  };

  const removeSkill = (type: "offered" | "wanted", index: number) => {
    if (type === "offered") setSkillsOffered(skillsOffered.filter((_, i) => i !== index));
    else setSkillsWanted(skillsWanted.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from("profiles").update({
      name,
      bio,
      skills_offered: skillsOffered,
      skills_wanted: skillsWanted,
    }).eq("user_id", user.id);
    setLoading(false);
    if (error) toast.error("Failed to save: " + error.message);
    else toast.success("Profile saved!");
  };

  const statItems = [
    { icon: Calendar, label: "Sessions", value: stats.sessions, color: "bg-gradient-primary" },
    { icon: Award, label: "Certificates", value: stats.certs, color: "bg-gradient-secondary" },
    { icon: Sparkles, label: "Teaching Slots", value: stats.slots, color: "bg-gradient-accent" },
    { icon: User, label: "Connections", value: stats.connections, color: "bg-gradient-primary" },
  ];

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display mb-1">Profile</h1>
        <p className="text-muted-foreground mb-8">Manage your skills, bio, and availability</p>
      </motion.div>

      <div className="max-w-4xl space-y-6">
        {/* Profile Header Card */}
        <motion.div
          className="bg-card rounded-xl p-6 shadow-card border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-start gap-5">
            <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xl shrink-0">
              {name ? name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "?"}
            </div>
            <div className="flex-1 space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="mb-2 block text-xs text-muted-foreground uppercase tracking-wider">Full Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div>
                  <Label className="mb-2 block text-xs text-muted-foreground uppercase tracking-wider">Email</Label>
                  <Input value={user?.email || ""} disabled className="opacity-60" />
                </div>
              </div>
              <div>
                <Label htmlFor="bio" className="mb-2 block text-xs text-muted-foreground uppercase tracking-wider">Bio</Label>
                <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell others about yourself..." className="resize-none" rows={3} />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statItems.map((stat, i) => (
            <motion.div
              key={stat.label}
              className="bg-card rounded-xl p-4 shadow-card border border-border/50 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05 }}
            >
              <div className={`w-9 h-9 rounded-lg ${stat.color} flex items-center justify-center mx-auto mb-2`}>
                <stat.icon className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="text-xl font-bold font-display">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Skills Offered */}
        <motion.div
          className="bg-card rounded-xl p-6 shadow-card border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-4 h-4 text-secondary" />
            <Label className="text-sm font-semibold uppercase tracking-wider">Skills You Teach</Label>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
            {skillsOffered.length === 0 && <span className="text-xs text-muted-foreground">No teaching skills added yet</span>}
            {skillsOffered.map((s, i) => (
              <Badge key={i} className="bg-secondary/20 text-secondary hover:bg-secondary/30 gap-1 px-3 py-1">
                {s}
                <button onClick={() => removeSkill("offered", i)}><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add a skill..." value={newOffered} onChange={(e) => setNewOffered(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("offered"))} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={() => addSkill("offered")}>Add</Button>
          </div>
        </motion.div>

        {/* Skills Wanted */}
        <motion.div
          className="bg-card rounded-xl p-6 shadow-card border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-primary" />
            <Label className="text-sm font-semibold uppercase tracking-wider">Skills You Want to Learn</Label>
          </div>
          <div className="flex flex-wrap gap-2 mb-4 min-h-[32px]">
            {skillsWanted.length === 0 && <span className="text-xs text-muted-foreground">No learning goals added yet</span>}
            {skillsWanted.map((s, i) => (
              <Badge key={i} className="bg-primary/10 text-primary hover:bg-primary/20 gap-1 px-3 py-1">
                {s}
                <button onClick={() => removeSkill("wanted", i)}><X className="w-3 h-3" /></button>
              </Badge>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="Add a skill..." value={newWanted} onChange={(e) => setNewWanted(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("wanted"))} className="max-w-xs" />
            <Button variant="outline" size="sm" onClick={() => addSkill("wanted")}>Add</Button>
          </div>
        </motion.div>

        {/* Save */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
          <Button variant="hero" onClick={handleSave} disabled={loading} className="gap-2">
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Profile"}
          </Button>
        </motion.div>
      </div>
    </div>
  );
};

export default ProfileView;
