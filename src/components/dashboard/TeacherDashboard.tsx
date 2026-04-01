import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Clock, Trash2, Users, BookOpen, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const TeacherDashboard = () => {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [skill, setSkill] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadSlots();

    const channel = supabase
      .channel("teacher_slots_changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "teacher_slots", filter: `teacher_id=eq.${user.id}` }, () => {
        loadSlots();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const loadSlots = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("teacher_slots")
      .select("*")
      .eq("teacher_id", user.id)
      .order("slot_date", { ascending: true });

    if (!data) { setSlots([]); setLoading(false); return; }

    const bookedIds = data.map(s => s.booked_by).filter(Boolean) as string[];
    let nameMap: Record<string, string> = {};
    if (bookedIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("user_id, name").in("user_id", bookedIds);
      nameMap = Object.fromEntries((profiles || []).map(p => [p.user_id, p.name]));
    }

    setSlots(data.map(s => ({ ...s, booked_by_name: s.booked_by ? nameMap[s.booked_by] || "Unknown" : null })));
    setLoading(false);
  };

  const createSlot = async () => {
    if (!user || !skill.trim() || !date || !time) {
      toast.error("Please fill all fields");
      return;
    }

    const existingForSkill = slots.filter((s) => s.skill.toLowerCase() === skill.toLowerCase());
    if (existingForSkill.length >= 4) {
      toast.error("Maximum 4 slots per skill!");
      return;
    }

    setCreating(true);
    const { error } = await supabase.from("teacher_slots").insert({
      teacher_id: user.id,
      skill: skill.trim(),
      slot_date: date,
      slot_time: time,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Teaching slot created! 🎓");
      setShowForm(false);
      setSkill("");
      setDate("");
      setTime("");
    }
    setCreating(false);
  };

  const deactivateSlot = async (id: string) => {
    const { data: sess } = await supabase.from("sessions").select("id").eq("slot_id", id).eq("status", "scheduled");
    if (sess && sess.length > 0) {
      toast.error("Cannot deactivate: active session exists for this slot.");
      return;
    }
    const { error } = await supabase.from("teacher_slots").update({ is_active: false }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Slot deactivated");
  };

  const activeSlots = slots.filter(s => s.is_active !== false);
  const inactiveSlots = slots.filter(s => s.is_active === false);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-card border border-border animate-pulse">
            <div className="flex gap-4 items-center">
              <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/4" />
                <div className="h-3 bg-muted rounded w-1/3" />
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground mb-1">Teach</h1>
          <p className="text-muted-foreground text-sm">Manage your teaching slots (max 4 per skill)</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md shrink-0"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "Cancel" : "New Slot"}
        </button>
      </div>

      {/* Create Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-border overflow-hidden"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25 }}
          >
            <div className="p-6">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <h3 className="font-display font-semibold text-foreground">Create Teaching Slot</h3>
              </div>
              <div className="grid sm:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Skill</label>
                  <Input placeholder="e.g. React, Python..." value={skill} onChange={(e) => setSkill(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Date</label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Time</label>
                  <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="rounded-xl" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-5">
                Learners with accepted connections will see this slot and can book it.
              </p>
              <button
                onClick={createSlot}
                disabled={creating}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-sm disabled:opacity-60"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {creating ? "Creating..." : "Create Slot"}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {slots.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 shadow-card border border-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-teal-600 dark:text-teal-400" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-2">No teaching slots yet</h3>
          <p className="text-muted-foreground text-sm mb-4">Create your first slot to let learners book sessions with you</p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Create First Slot
          </button>
        </div>
      )}

      {/* Active Slots */}
      {activeSlots.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Active Slots <span className="ml-1 text-foreground">({activeSlots.length})</span>
          </h2>
          <div className="space-y-3">
            {activeSlots.map((slot, i) => (
              <motion.div
                key={slot.id}
                className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-card border border-border hover:shadow-elevated transition-all duration-200"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shrink-0 shadow-sm">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground text-sm">{slot.skill}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />{slot.slot_date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />{slot.slot_time}
                      </span>
                      {slot.booked_by_name && (
                        <span className="flex items-center gap-1 text-primary font-medium">
                          <Users className="w-3 h-3" />Booked by {slot.booked_by_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      slot.is_booked
                        ? "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/40"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40"
                    }`}>
                      {slot.is_booked ? "Booked" : "Available"}
                    </span>
                    {!slot.is_booked && (
                      <button
                        onClick={() => deactivateSlot(slot.id)}
                        className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 flex items-center justify-center text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                        title="Deactivate slot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Inactive Slots */}
      {inactiveSlots.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-3">
            Deactivated Slots
          </h2>
          <div className="space-y-3 opacity-50">
            {inactiveSlots.map((slot, i) => (
              <div
                key={slot.id}
                className="bg-muted/50 rounded-xl p-4 border border-border/50 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-muted-foreground text-sm line-through">{slot.skill}</h3>
                  <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{slot.slot_date}</span>
                    <span>{slot.slot_time}</span>
                  </div>
                </div>
                <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Deactivated</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
