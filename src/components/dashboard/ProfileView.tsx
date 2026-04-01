import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  User, Mail, Calendar, GraduationCap, Briefcase, 
  Camera, Save, Edit2, Loader2, Plus, X, 
  MapPin, BookOpen, Clock, Trash2, CheckCircle, Award
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  name: string | null;
  role: string | null;
  dob: string | null;
  bio: string | null;
  avatar_url: string | null;
  education_level: string | null;
  year_of_studying: number | null;
  experience_years: number | null;
  skills_offered: string[] | null;
  skills_wanted: string[] | null;
}

const ProfileView = () => {
  const { user } = useAuth();
  
  // -- State: View/Edit Mode --
  const [isEditMode, setIsEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  // -- Profile Data State --
  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    role: "Student",
    dob: "",
    bio: "",
    avatar_url: "",
    education_level: "College",
    year_of_studying: 1,
    experience_years: 0,
    skills_offered: [] as string[],
    skills_wanted: [] as string[],
  });

  // Skills input state
  const [newSkill, setNewSkill] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    try {
      setPageLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;

      if (data) {
        const p = data as any as Profile;
        setProfileData({
          name: p.name || "",
          email: user.email || "",
          role: p.role || "Student",
          dob: p.dob || "",
          bio: p.bio || "",
          avatar_url: p.avatar_url || "",
          education_level: p.education_level || "College",
          year_of_studying: p.year_of_studying || 1,
          experience_years: p.experience_years || 0,
          skills_offered: p.skills_offered || [],
          skills_wanted: p.skills_wanted || [],
        });
      }
    } catch (err) {
      console.error("Error loading profile:", err);
      toast.error("Failed to load profile");
    } finally {
      setPageLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    if (!profileData.name.trim()) {
      toast.error("Full Name is required");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          name: profileData.name,
          role: profileData.role,
          dob: profileData.dob || null,
          bio: profileData.bio,
          education_level: profileData.role === "Student" ? profileData.education_level : null,
          year_of_studying: profileData.role === "Student" ? profileData.year_of_studying : null,
          experience_years: profileData.role === "Teacher" ? profileData.experience_years : null,
          skills_offered: profileData.skills_offered,
          skills_wanted: profileData.skills_wanted,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      toast.success("Profile updated successfully! ✅");
      setIsEditMode(false);
    } catch (err: any) {
      toast.error("Failed to save: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update Profile Table
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setProfileData(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Profile photo updated!");
    } catch (err: any) {
      toast.error("Image upload failed: " + err.message);
    } finally {
      setUploadingImage(false);
    }
  };

  const addSkill = (type: "offered" | "wanted") => {
    const val = newSkill.trim();
    if (!val) return;
    
    if (type === "offered") {
      if (profileData.skills_offered.includes(val)) {
        toast.error("Skill already added");
        return;
      }
      setProfileData(prev => ({
        ...prev,
        skills_offered: [...prev.skills_offered, val]
      }));
    } else {
      if (profileData.skills_wanted.includes(val)) {
        toast.error("Skill already added");
        return;
      }
      setProfileData(prev => ({
        ...prev,
        skills_wanted: [...prev.skills_wanted, val]
      }));
    }
    setNewSkill("");
  };

  const removeSkill = (type: "offered" | "wanted", index: number) => {
    if (type === "offered") {
      setProfileData(prev => ({
        ...prev,
        skills_offered: prev.skills_offered.filter((_, i) => i !== index)
      }));
    } else {
      setProfileData(prev => ({
        ...prev,
        skills_wanted: prev.skills_wanted.filter((_, i) => i !== index)
      }));
    }
  };

  if (pageLoading) {
    return <ProfileSkeleton />;
  }

  const initials = profileData.name
    ? profileData.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display text-foreground tracking-tight">Your Profile</h1>
          <p className="text-muted-foreground mt-1 text-sm font-medium">Manage your personal information and roles</p>
        </div>
        {!isEditMode ? (
          <Button onClick={() => setIsEditMode(true)} className="rounded-full px-6 shadow-sm hover:shadow-md transition-all group">
            <Edit2 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { setIsEditMode(false); loadProfile(); }} className="rounded-full px-6">
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading} className="rounded-full px-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: BASIC INFO CARD */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="overflow-hidden border-none shadow-premium bg-white dark:bg-slate-900 rounded-[2rem]">
            <div className="h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 relative">
              <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px] opacity-20" />
            </div>
            
            <CardContent className="pt-0 relative px-8 flex flex-col items-center">
              {/* Profile Image with Camera Overlay */}
              <div className="relative -mt-16 mb-6">
                <div className="w-32 h-32 rounded-full border-[6px] border-white dark:border-slate-900 shadow-xl overflow-hidden bg-muted flex items-center justify-center group relative">
                  {profileData.avatar_url ? (
                    <img src={profileData.avatar_url} alt={profileData.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-4xl font-bold text-muted-foreground">{initials}</div>
                  )}
                  
                  {isEditMode && (
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    >
                      {uploadingImage ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                    </button>
                  )}
                  <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                </div>
                
                {/* Role Badge Overlay */}
                <div className="absolute bottom-1 right-2">
                   <Badge className={`rounded-full px-3 py-1 shadow-lg border-2 border-white dark:border-slate-900 ${profileData.role === 'Teacher' ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                      {profileData.role}
                   </Badge>
                </div>
              </div>

              <div className="text-center space-y-1.5 mb-8">
                <h2 className="text-2xl font-bold text-foreground">{profileData.name || "Set your name"}</h2>
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground font-medium">
                  <Mail className="w-3.5 h-3.5" />
                  {profileData.email}
                </div>
                {profileData.dob && (
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground mt-1">
                    <Calendar className="w-3 h-3" />
                    Born {new Date(profileData.dob).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                )}
              </div>

              {/* Action specific view info */}
              <div className="w-full space-y-4 py-8 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    {profileData.role === "Student" ? <GraduationCap className="w-4 h-4" /> : <Briefcase className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Account Type</p>
                    <p className="text-sm font-semibold">{profileData.role}</p>
                  </div>
                </div>

                {profileData.role === "Student" ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        <BookOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Education Level</p>
                        <p className="text-sm font-semibold">{profileData.education_level}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Year of Study</p>
                        <p className="text-sm font-semibold">Year {profileData.year_of_studying}</p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400">
                        <Award className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground/70">Experience</p>
                        <p className="text-sm font-semibold">{profileData.experience_years}+ Years</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: FORM CARD */}
        <div className="lg:col-span-8">
          <Card className="border-none shadow-premium bg-white dark:bg-slate-900 rounded-[2rem] h-full">
            <CardHeader className="px-8 pt-8 outline-none">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                Personal Details
              </CardTitle>
              <CardDescription>Update your profile information and how others see you.</CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-8 space-y-8">
              {/* Common Fields Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="fullname" className="text-sm font-bold text-muted-foreground">Full Name</Label>
                  <Input 
                    id="fullname" 
                    value={profileData.name} 
                    onChange={(e) => setProfileData(p => ({...p, name: e.target.value}))}
                    disabled={!isEditMode}
                    placeholder="Enter your name"
                    className="rounded-xl bg-muted/30 border-muted-foreground/10 focus:ring-blue-500/20"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-muted-foreground">Role</Label>
                  <Select 
                    value={profileData.role} 
                    onValueChange={(val: any) => setProfileData(p => ({...p, role: val}))}
                    disabled={!isEditMode}
                  >
                    <SelectTrigger className="rounded-xl bg-muted/30 border-muted-foreground/10 h-10">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Student">🎓 Student</SelectItem>
                      <SelectItem value="Teacher">🧑🏫 Teacher</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob" className="text-sm font-bold text-muted-foreground">Date of Birth</Label>
                  <Input 
                    id="dob" 
                    type="date"
                    value={profileData.dob} 
                    onChange={(e) => setProfileData(p => ({...p, dob: e.target.value}))}
                    disabled={!isEditMode}
                    className="rounded-xl bg-muted/30 border-muted-foreground/10 h-10"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-muted-foreground">Email Address</Label>
                  <Input 
                    value={profileData.email} 
                    disabled 
                    className="rounded-xl bg-muted/50 border-muted-foreground/10 opacity-70 h-10"
                  />
                </div>
              </div>

              {/* Role Specific Fields */}
              <SeparatorWithTitle title={profileData.role === "Student" ? "Educational Details" : "Professional Details"} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {profileData.role === "Student" ? (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-bold text-muted-foreground">Education Level</Label>
                      <Select 
                        value={profileData.education_level} 
                        onValueChange={(val: any) => setProfileData(p => ({...p, education_level: val}))}
                        disabled={!isEditMode}
                      >
                        <SelectTrigger className="rounded-xl bg-muted/30 border-muted-foreground/10 h-10">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="School">School</SelectItem>
                          <SelectItem value="College">College</SelectItem>
                          <SelectItem value="Graduate">Graduate</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="year" className="text-sm font-bold text-muted-foreground">Year of Studying</Label>
                      <Input 
                        id="year" 
                        type="number"
                        min={1}
                        max={10}
                        value={profileData.year_of_studying} 
                        onChange={(e) => setProfileData(p => ({...p, year_of_studying: parseInt(e.target.value) || 1}))}
                        disabled={!isEditMode}
                        className="rounded-xl bg-muted/30 border-muted-foreground/10 h-10"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="experience" className="text-sm font-bold text-muted-foreground">Years of Experience</Label>
                      <Input 
                        id="experience" 
                        type="number"
                        min={0}
                        value={profileData.experience_years} 
                        onChange={(e) => setProfileData(p => ({...p, experience_years: parseInt(e.target.value) || 0}))}
                        disabled={!isEditMode}
                        className="rounded-xl bg-muted/30 border-muted-foreground/10 h-10 max-w-[200px]"
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Bio / Description */}
              <div className="space-y-2">
                <Label htmlFor="bio" className="text-sm font-bold text-muted-foreground">Bio / Description</Label>
                <Textarea 
                  id="bio" 
                  value={profileData.bio} 
                  onChange={(e) => setProfileData(p => ({...p, bio: e.target.value}))}
                  disabled={!isEditMode}
                  placeholder="Tell us about yourself..."
                  className="rounded-xl bg-muted/30 border-muted-foreground/10 min-h-[120px] resize-none"
                />
              </div>

              {/* Skills Tagging Section */}
              <div className="space-y-4">
                <SeparatorWithTitle title={profileData.role === "Teacher" ? "Expertise / Skills Offered" : "Skills You Teach"} />
                
                <div className="flex flex-wrap gap-2 min-h-[40px] p-4 rounded-2xl bg-muted/20 border border-muted-foreground/5">
                  {(profileData.skills_offered.length === 0) ? (
                    <span className="text-xs text-muted-foreground italic">No skills added yet</span>
                  ) : (
                    profileData.skills_offered.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="rounded-full pl-3 pr-2 py-1 flex items-center gap-1.5 bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800">
                        {skill}
                        {isEditMode && (
                          <button onClick={() => removeSkill("offered", idx)} className="hover:text-red-500 transition-colors">
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </Badge>
                    ))
                  )}
                </div>

                {isEditMode && (
                  <div className="flex gap-2">
                    <Input 
                      placeholder="Add a skill (e.g. Photoshop, JavaScript)"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("offered"))}
                      className="rounded-xl h-10 max-w-sm"
                    />
                    <Button onClick={() => addSkill("offered")} size="sm" className="h-10 px-4 rounded-xl">
                      <Plus className="w-4 h-4 mr-1.5" /> Add
                    </Button>
                  </div>
                )}
              </div>

              {profileData.role === "Student" && (
                <div className="space-y-4">
                  <SeparatorWithTitle title="Skills You Want to Learn" />
                  
                  <div className="flex flex-wrap gap-2 min-h-[40px] p-4 rounded-2xl bg-muted/20 border border-muted-foreground/5">
                    {(profileData.skills_wanted.length === 0) ? (
                      <span className="text-xs text-muted-foreground italic">No skills added yet</span>
                    ) : (
                      profileData.skills_wanted.map((skill, idx) => (
                        <Badge key={idx} variant="secondary" className="rounded-full pl-3 pr-2 py-1 flex items-center gap-1.5 bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-800">
                          {skill}
                          {isEditMode && (
                            <button onClick={() => removeSkill("wanted", idx)} className="hover:text-red-500 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </Badge>
                      ))
                    )}
                  </div>

                  {isEditMode && (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="What do you want to learn?"
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill("wanted"))}
                        className="rounded-xl h-10 max-w-sm"
                      />
                      <Button onClick={() => addSkill("wanted")} size="sm" variant="outline" className="h-10 px-4 rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50">
                        <Plus className="w-4 h-4 mr-1.5" /> Add
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// -- HELPER COMPONENTS --

const SeparatorWithTitle = ({ title }: { title: string }) => (
  <div className="relative flex items-center py-4">
    <div className="flex-grow border-t border-muted-foreground/10"></div>
    <span className="flex-shrink mx-4 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">{title}</span>
    <div className="flex-grow border-t border-muted-foreground/10"></div>
  </div>
);

const ProfileSkeleton = () => (
  <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-pulse">
    <div className="flex justify-between items-center">
      <div className="space-y-2">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 rounded-lg" />
      </div>
      <Skeleton className="h-10 w-32 rounded-full" />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      <div className="lg:col-span-4">
        <Skeleton className="h-[500px] w-full rounded-[2rem]" />
      </div>
      <div className="lg:col-span-8">
        <Skeleton className="h-[700px] w-full rounded-[2rem]" />
      </div>
    </div>
  </div>
);

export default ProfileView;
