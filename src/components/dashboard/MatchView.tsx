import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { UserPlus, Star, Calendar, Clock, ExternalLink } from "lucide-react";
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

    // Load existing requests to prevent duplicates
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

    // Load available slots for accepted connections
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
        const matchingSkills = myProfile.skills_wanted.filter((s) =>
          profile.skills_offered.some((o) => o.toLowerCase() === s.toLowerCase())
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
      toast.success("Connection request sent!");
    }
  };

  const bookSlot = async (slot: any) => {
    if (!user) return;
    setBookingSlot(slot.id);

    // Verify connection is accepted
    const acceptedSkills = acceptedConnections.get(slot.teacher_id) || [];
    const skillMatch = acceptedSkills.some(s => s.toLowerCase() === slot.skill.toLowerCase());
    if (!skillMatch) {
      toast.error("Connection not accepted for this skill");
      setBookingSlot(null);
      return;
    }

    // Check slot not already booked (re-check)
    const { data: freshSlot } = await supabase.from("teacher_slots").select("is_booked").eq("id", slot.id).single();
    if (freshSlot?.is_booked) {
      toast.error("This slot was just booked by someone else!");
      setBookingSlot(null);
      loadMatches();
      return;
    }

    // Book the slot
    const { error: slotError } = await supabase.from("teacher_slots").update({ is_booked: true, booked_by: user.id }).eq("id", slot.id);
    if (slotError) { toast.error(slotError.message); setBookingSlot(null); return; }

    // Create session with meeting link
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
    else { toast.success("Slot booked! Session created with meeting link."); }

    setBookingSlot(null);
    loadMatches();
  };

  if (loading) return <div className="text-muted-foreground">Loading matches...</div>;

  return (
    <div>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display mb-1">Find Matches</h1>
        <p className="text-muted-foreground mb-8">
          {matches.length > 0
            ? `Found ${matches.length} skill matches for you`
            : "Add skills you want to learn in your Profile to find matches"}
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-4">
        {matches.map((match, i) => {
          const acceptedSkills = acceptedConnections.get(match.user_id) || [];
          const teacherSlots = availableSlots.filter(s => s.teacher_id === match.user_id);

          return (
            <motion.div
              key={match.user_id}
              className="bg-card rounded-xl p-6 shadow-card border border-border/50 hover:shadow-elevated transition-shadow"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold text-sm shrink-0">
                  {match.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold font-display">{match.name}</h3>
                      <div className="flex items-center gap-1 text-xs text-accent">
                        <Star className="w-3 h-3 fill-current" />
                        {match.matchScore}%
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <span className="text-secondary font-medium">Teaches:</span>{" "}
                      {match.matchingSkills.join(", ")}
                    </div>
                  </div>

                  {/* Request / Status buttons */}
                  <div className="flex flex-wrap gap-2">
                    {match.matchingSkills.map((skill) => {
                      const key = `${match.user_id}-${skill}`;
                      const isSent = sentRequests.has(key);
                      const isAccepted = acceptedSkills.some(s => s.toLowerCase() === skill.toLowerCase());

                      if (isAccepted) {
                        return (
                          <span key={skill} className="text-xs px-3 py-1 rounded-full bg-secondary/20 text-secondary">
                            ✓ Connected — {skill}
                          </span>
                        );
                      }
                      return (
                        <Button key={skill} variant={isSent ? "outline" : "hero"} size="sm" disabled={isSent} onClick={() => sendRequest(match.user_id, skill)}>
                          <UserPlus className="w-4 h-4" />
                          {isSent ? "Requested" : `Learn ${skill}`}
                        </Button>
                      );
                    })}
                  </div>

                  {/* Available slots for accepted connections */}
                  {teacherSlots.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border/50">
                      <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Available Slots</span>
                      {teacherSlots.map(slot => (
                        <div key={slot.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                          <div className="text-xs text-muted-foreground flex items-center gap-3">
                            <span className="font-medium text-foreground">{slot.skill}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{slot.slot_date}</span>
                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{slot.slot_time}</span>
                          </div>
                          <Button
                            variant="hero"
                            size="sm"
                            disabled={bookingSlot === slot.id}
                            onClick={() => bookSlot(slot)}
                          >
                            <ExternalLink className="w-3 h-3" />
                            {bookingSlot === slot.id ? "Booking..." : "Book"}
                          </Button>
                        </div>
                      ))}
                    </div>
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

export default MatchView;
