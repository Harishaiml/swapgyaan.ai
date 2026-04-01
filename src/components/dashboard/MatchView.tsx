import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Star, Calendar, Clock, ExternalLink, Search, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface MatchProfile {
  user_id: string;
  name: string;
  skills_offered: string[];
  skills_wanted: string[];
  matchScore: number;
  matchingSkills: string[];
}

const MatchView = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState<MatchProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [acceptedConnections, setAcceptedConnections] = useState<Map<string, string[]>>(new Map());
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [bookingSlot, setBookingSlot] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    loadMatches();
  }, [user]);

  const loadMatches = async () => {
    if (!user) return;
    const { data: myProfile } = await supabase.from("profiles").select("*").eq("user_id", user.id).single();
    if (!myProfile || myProfile.skills_wanted.length === 0) { setLoading(false); return; }

    const { data: allProfiles } = await supabase.from("profiles").select("*").neq("user_id", user.id);
    if (!allProfiles) { setLoading(false); return; }

    const { data: existingRequests } = await supabase
      .from("connection_requests")
      .select("receiver_id, skill, status")
      .eq("sender_id", user.id);

    const sentSet = new Set<string>();
    const acceptedMap = new Map<string, string[]>();
    (existingRequests || []).forEach(r => {
      sentSet.add(`${r.receiver_id}-${r.skill}`);
      if (r.status === "accepted") {
        const existing = acceptedMap.get(r.receiver_id) || [];
        existing.push(r.skill);
        acceptedMap.set(r.receiver_id, existing);
      }
    });
    setSentRequests(sentSet);
    setAcceptedConnections(acceptedMap);

    const acceptedTeacherIds = [...acceptedMap.keys()];
    if (acceptedTeacherIds.length > 0) {
      const { data: slots } = await supabase
        .from("teacher_slots")
        .select("*")
        .in("teacher_id", acceptedTeacherIds)
        .eq("is_booked", false)
        .eq("is_active", true);
      setAvailableSlots(slots || []);
    }

    const matched = allProfiles
      .map((profile) => {
        const matchingSkills = myProfile.skills_wanted.filter((s: string) =>
          profile.skills_offered.some((o: string) => o.toLowerCase() === s.toLowerCase())
        );
        const score = myProfile.skills_wanted.length > 0
          ? Math.round((matchingSkills.length / myProfile.skills_wanted.length) * 100)
          : 0;
        return { ...profile, matchScore: score, matchingSkills };
      })
      .filter((p) => p.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore);

    setMatches(matched);
    setLoading(false);
  };

  const sendRequest = async (receiverId: string, skill: string) => {
    if (!user) return;
    const key = `${receiverId}-${skill}`;
    if (sentRequests.has(key)) { toast.error("Request already sent!"); return; }

    const { error } = await supabase.from("connection_requests").insert({
      sender_id: user.id,
      receiver_id: receiverId,
      skill,
    });
    if (error) {
      if (error.code === "23505") toast.error("Request already sent!");
      else toast.error(error.message);
    } else {
      setSentRequests(new Set([...sentRequests, key]));
      toast.success("Connection request sent! 🎉");
    }
  };

  const bookSlot = async (slot: any) => {
    if (!user) return;
    setBookingSlot(slot.id);

    const acceptedSkills = acceptedConnections.get(slot.teacher_id) || [];
    const skillMatch = acceptedSkills.some(s => s.toLowerCase() === slot.skill.toLowerCase());
    if (!skillMatch) {
      toast.error("Connection not accepted for this skill");
      setBookingSlot(null);
      return;
    }

    const { data: freshSlot } = await supabase.from("teacher_slots").select("is_booked").eq("id", slot.id).single();
    if (freshSlot?.is_booked) {
      toast.error("This slot was just booked by someone else!");
      setBookingSlot(null);
      loadMatches();
      return;
    }

    const { error: slotError } = await supabase.from("teacher_slots").update({ is_booked: true, booked_by: user.id }).eq("id", slot.id);
    if (slotError) { toast.error(slotError.message); setBookingSlot(null); return; }

    const sessionId = crypto.randomUUID();
    const meetingLink = `https://meet.jit.si/swapgyaan-${sessionId}`;
    const { error: sessionError } = await supabase.from("sessions").insert({
      id: sessionId,
      teacher_id: slot.teacher_id,
      learner_id: user.id,
      skill: slot.skill,
      slot_id: slot.id,
      meeting_link: meetingLink,
      status: "scheduled",
    });

    if (sessionError) { toast.error(sessionError.message); }
    else { toast.success("Session booked! 🚀 Meeting link created."); }

    setBookingSlot(null);
    loadMatches();
  };

  const filteredMatches = matches.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.matchingSkills.some(s => s.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="skeleton w-48 h-8" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-slate-900 rounded-xl p-5 shadow-card border border-border animate-pulse">
            <div className="flex gap-4">
              <div className="w-12 h-12 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-1/3" />
                <div className="h-3 bg-muted rounded w-1/2" />
                <div className="flex gap-2 mt-3">
                  <div className="h-8 bg-muted rounded-lg w-28" />
                </div>
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
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground mb-1">Find Matches</h1>
        <p className="text-muted-foreground text-sm">
          {matches.length > 0
            ? `${matches.length} skill match${matches.length !== 1 ? "es" : ""} found`
            : "Add skills you want to learn in your Profile to find matches"}
        </p>
      </div>

      {/* Search */}
      {matches.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or skill..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900 border-border h-10 rounded-xl"
          />
        </div>
      )}

      {/* Empty state */}
      {matches.length === 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 shadow-card border border-border text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="font-display font-semibold text-lg text-foreground mb-2">No matches yet</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Add skills you want to learn in your profile to start finding teachers who can help you.
          </p>
        </div>
      )}

      {/* Match Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredMatches.map((match, i) => {
          const acceptedSkills = acceptedConnections.get(match.user_id) || [];
          const teacherSlots = availableSlots.filter(s => s.teacher_id === match.user_id);
          const initials = match.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
          const matchColor = match.matchScore >= 75 ? "text-emerald-600" : match.matchScore >= 50 ? "text-amber-600" : "text-orange-600";
          const matchBg = match.matchScore >= 75 ? "bg-emerald-50 dark:bg-emerald-950/30" : match.matchScore >= 50 ? "bg-amber-50 dark:bg-amber-950/30" : "bg-orange-50 dark:bg-orange-950/30";

          return (
            <motion.div
              key={match.user_id}
              className="bg-white dark:bg-slate-900 rounded-xl shadow-card border border-border hover:shadow-elevated transition-all duration-300 hover:-translate-y-0.5 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
            >
              {/* Card Header */}
              <div className="p-5">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-semibold font-display text-foreground truncate">{match.name}</h3>
                      <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full shrink-0 ${matchBg} ${matchColor}`}>
                        <Star className="w-3 h-3 fill-current" />
                        {match.matchScore}%
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Teaches: <span className="font-medium text-foreground">{match.matchingSkills.join(", ")}</span>
                    </p>
                  </div>
                </div>

                {/* Skills Tags */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {match.matchingSkills.map((skill) => {
                    const key = `${match.user_id}-${skill}`;
                    const isSent = sentRequests.has(key);
                    const isAccepted = acceptedSkills.some(s => s.toLowerCase() === skill.toLowerCase());

                    if (isAccepted) {
                      return (
                        <span key={skill} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/40 font-medium">
                          ✓ {skill}
                        </span>
                      );
                    }
                    return (
                      <button
                        key={skill}
                        disabled={isSent}
                        onClick={() => sendRequest(match.user_id, skill)}
                        className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium transition-all duration-200 ${
                          isSent
                            ? "bg-muted text-muted-foreground cursor-not-allowed"
                            : "bg-primary text-white hover:bg-primary/90 shadow-sm hover:shadow-md"
                        }`}
                      >
                        {!isSent && <UserPlus className="w-3 h-3" />}
                        {isSent ? `Requested: ${skill}` : `Learn ${skill}`}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Available Slots */}
              {teacherSlots.length > 0 && (
                <div className="border-t border-border/50 px-5 py-3 bg-muted/30">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">Available Slots</p>
                  <div className="space-y-1.5">
                    {teacherSlots.map(slot => (
                      <div key={slot.id} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 rounded-lg px-3 py-2 border border-border/50">
                        <div className="text-xs text-muted-foreground flex items-center gap-3 min-w-0">
                          <span className="font-semibold text-foreground truncate">{slot.skill}</span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Calendar className="w-3 h-3" />{slot.slot_date}
                          </span>
                          <span className="flex items-center gap-1 shrink-0">
                            <Clock className="w-3 h-3" />{slot.slot_time}
                          </span>
                        </div>
                        <button
                          disabled={bookingSlot === slot.id}
                          onClick={() => bookSlot(slot)}
                          className="inline-flex items-center gap-1 text-xs font-semibold bg-gradient-to-r from-teal-500 to-teal-600 text-white px-3 py-1.5 rounded-lg hover:opacity-90 transition-opacity shrink-0 disabled:opacity-50"
                        >
                          {bookingSlot === slot.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <ExternalLink className="w-3 h-3" />
                          )}
                          {bookingSlot === slot.id ? "Booking..." : "Book"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default MatchView;
