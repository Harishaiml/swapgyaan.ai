import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Calendar, Clock, Trash2, Users } from "lucide-react";
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

    // Fetch booked_by names
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

    const { error } = await supabase.from("teacher_slots").insert({
      teacher_id: user.id,
      skill: skill.trim(),
      slot_date: date,
      slot_time: time,
    });

    if (error) toast.error(error.message);
    else {
      toast.success("Slot created!");
      setShowForm(false);
      setSkill("");
      setDate("");
      setTime("");
    }
  };

  const deactivateSlot = async (id: string) => {
    // Block deactivate if an active session is currently scheduled
    const { data: sess } = await supabase.from("sessions").select("id").eq("slot_id", id).eq("status", "scheduled");
    if (sess && sess.length > 0) {
      toast.error("Cannot deactivate: you have an active scheduled session for this slot.");
      return;
    }
    
    const { error } = await supabase.from("teacher_slots").update({ is_active: false }).eq("id", id);
    if (error) toast.error(error.message);
    else toast.success("Slot deactivated");
  };

  const activeSlots = slots.filter(s => s.is_active !== false);
  const inactiveSlots = slots.filter(s => s.is_active === false);

  if (loading) return <div className="text-muted-foreground">Loading slots...</div>;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold font-display mb-1">Teacher Dashboard</h1>
            <p className="text-muted-foreground">Manage your teaching slots (max 4 per skill)</p>
          </div>
          <Button variant="hero" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4" /> New Slot
          </Button>
        </div>
      </motion.div>

      {showForm && (
        <motion.div
          className="bg-card rounded-xl p-6 shadow-card border border-border/50 mb-6"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
        >
          <h3 className="font-display font-semibold mb-4">Create Teaching Slot</h3>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <Input placeholder="Skill (e.g. React)" value={skill} onChange={(e) => setSkill(e.target.value)} />
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground mb-4">
            Set the date & time for your teaching session. Learners will see this schedule when booking.
          </p>
          <div className="flex gap-2">
            <Button variant="hero" size="sm" onClick={createSlot}>Create</Button>
            <Button variant="outline" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
          </div>
        </motion.div>
      )}

      {slots.length === 0 ? (
        <p className="text-muted-foreground">No slots yet. Create your first teaching slot!</p>
      ) : (
        <div className="space-y-8">
          {/* Active Slots */}
          <div>
            <h3 className="font-semibold text-lg mb-4">Active Slots</h3>
            {activeSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active slots.</p>
            ) : (
              <div className="space-y-4">
                {activeSlots.map((slot, i) => (
                  <motion.div
                    key={slot.id}
                    className="bg-card rounded-xl p-5 shadow-card border border-border/50 flex items-center justify-between"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-secondary flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">{slot.skill}</h3>
                        <div className="text-sm text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{slot.slot_date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{slot.slot_time}</span>
                        </div>
                        {slot.booked_by_name && (
                          <div className="text-xs text-primary flex items-center gap-1 mt-1">
                            <Users className="w-3 h-3" /> Booked by: {slot.booked_by_name}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-3 py-1 rounded-full ${slot.is_booked ? "bg-accent/20 text-accent-foreground" : "bg-secondary/20 text-secondary"}`}>
                        {slot.is_booked ? "Booked" : "Available"}
                      </span>
                      {!slot.is_booked && (
                        <Button variant="outline" size="sm" className="text-destructive border-destructive/20 hover:bg-destructive/10 hover:text-destructive gap-2" onClick={() => deactivateSlot(slot.id)}>
                          <Trash2 className="w-3.5 h-3.5" /> Deactivate
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Inactive Slots */}
          {inactiveSlots.length > 0 && (
            <div>
              <h3 className="font-semibold text-lg mb-4 text-muted-foreground">Inactive Slots</h3>
              <div className="space-y-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-300">
                {inactiveSlots.map((slot, i) => (
                  <motion.div
                    key={slot.id}
                    className="bg-card/50 rounded-xl p-5 shadow-card border border-border/20 flex items-center justify-between"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium text-muted-foreground line-through">{slot.skill}</h3>
                        <div className="text-sm text-muted-foreground flex items-center gap-3">
                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{slot.slot_date}</span>
                          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{slot.slot_time}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">
                        Deactivated
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
