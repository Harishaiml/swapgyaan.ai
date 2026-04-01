import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, MessageSquare, BookOpen, Calendar, Award,
  Sparkles, User, LogOut, ChevronRight, Bell, Menu, X
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import DashboardHome from "@/components/dashboard/DashboardHome";
import MatchView from "@/components/dashboard/MatchView";
import RequestsView from "@/components/dashboard/RequestsView";
import SessionsView from "@/components/dashboard/SessionsView";
import CertificatesView from "@/components/dashboard/CertificatesView";
import ProfileView from "@/components/dashboard/ProfileView";
import TeacherDashboard from "@/components/dashboard/TeacherDashboard";
import AITutor from "@/components/dashboard/AITutor";
import BrandLogo from "@/components/BrandLogo";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", key: "home", gradient: "from-blue-500 to-blue-600" },
  { icon: Users, label: "Find Matches", key: "match", gradient: "from-violet-500 to-violet-600" },
  { icon: MessageSquare, label: "Requests", key: "requests", gradient: "from-orange-500 to-orange-600" },
  { icon: BookOpen, label: "Teach", key: "teach", gradient: "from-teal-500 to-teal-600" },
  { icon: Calendar, label: "Sessions", key: "sessions", gradient: "from-cyan-500 to-cyan-600" },
  { icon: Award, label: "Certificates", key: "certificates", gradient: "from-yellow-500 to-amber-600" },
  { icon: Sparkles, label: "AI Tutor", key: "ai", gradient: "from-purple-500 to-pink-600" },
  { icon: User, label: "Profile", key: "profile", gradient: "from-slate-500 to-slate-600" },
];

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  home: { title: "Dashboard", subtitle: "Your learning overview" },
  match: { title: "Find Matches", subtitle: "Discover skill partners" },
  requests: { title: "Requests", subtitle: "Manage connections" },
  teach: { title: "Teach", subtitle: "Manage teaching slots" },
  sessions: { title: "Sessions", subtitle: "Learning & teaching sessions" },
  certificates: { title: "Certificates", subtitle: "Your achievements" },
  ai: { title: "AI Tutor", subtitle: "Powered by AI" },
  profile: { title: "Profile", subtitle: "Manage your account" },
};

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileInitials, setProfileInitials] = useState("?");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name").eq("user_id", user.id).single().then(({ data }) => {
      if (data?.name) {
        setProfileName(data.name);
        setProfileInitials(
          data.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()
        );
      }
    });
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <BrandLogo size="md" showText={false} />
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handleTabChange = (key: string) => {
    setActiveTab(key);
    setSidebarOpen(false);
  };

  const renderContent = () => {
    switch (activeTab) {
      case "home": return <DashboardHome onNavigate={setActiveTab} />;
      case "match": return <MatchView />;
      case "requests": return <RequestsView />;
      case "teach": return <TeacherDashboard />;
      case "sessions": return <SessionsView />;
      case "certificates": return <CertificatesView />;
      case "ai": return <AITutor />;
      case "profile": return <ProfileView />;
      default: return <DashboardHome onNavigate={setActiveTab} />;
    }
  };

  const currentPage = pageTitles[activeTab] || pageTitles.home;

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        <aside
          className={`
            fixed top-0 left-0 h-full z-40 w-64 flex-col
            bg-white dark:bg-slate-900 border-r border-border
            flex flex-col transition-transform duration-300 ease-in-out shadow-elevated
            ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
            md:translate-x-0 md:static md:flex md:shadow-none
          `}
        >
          {/* Logo */}
          <div className="p-5 border-b border-border">
            <Link to="/" className="block">
              <BrandLogo size="sm" showText={true} />
            </Link>
          </div>

          {/* Nav Items */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 scrollbar-thin">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 pt-2 pb-1.5">Menu</p>
            {navItems.map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleTabChange(item.key)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                    transition-all duration-200 group relative
                    ${isActive
                      ? "bg-primary/8 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }
                  `}
                >
                  <div className={`
                    w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200
                    ${isActive
                      ? `bg-gradient-to-br ${item.gradient} shadow-sm`
                      : "bg-muted group-hover:bg-muted-foreground/10"
                    }
                  `}>
                    <item.icon className={`w-4 h-4 ${isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground"}`} />
                  </div>
                  <span className="flex-1 text-left">{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-primary/60 shrink-0" />}
                </button>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-3 border-t border-border">
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/60 mb-1">
              <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold text-xs shrink-0">
                {profileInitials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{profileName || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </aside>
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        {/* Top navbar */}
        <header className="sticky top-0 z-20 h-16 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-border flex items-center px-4 md:px-6 gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted-foreground/10 transition-colors"
          >
            <Menu className="w-4.5 h-4.5" />
          </button>

          {/* Page title */}
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-foreground font-display truncate">{currentPage.title}</h2>
            <p className="text-xs text-muted-foreground hidden sm:block">{currentPage.subtitle}</p>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted-foreground/10 transition-colors relative">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary"></span>
            </button>
            <button
              onClick={() => handleTabChange("profile")}
              className="w-9 h-9 rounded-lg bg-gradient-primary flex items-center justify-center text-white font-bold text-xs hover:shadow-glow transition-shadow duration-300"
            >
              {profileInitials}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto pb-24 md:pb-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {renderContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation — 5 key items */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden z-50">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-border px-1 py-1.5">
          <div className="flex justify-around">
            {[
              { icon: LayoutDashboard, label: "Home", key: "home", gradient: "from-blue-500 to-blue-600" },
              { icon: Users, label: "Match", key: "match", gradient: "from-violet-500 to-violet-600" },
              { icon: Calendar, label: "Sessions", key: "sessions", gradient: "from-cyan-500 to-cyan-600" },
              { icon: Sparkles, label: "AI Tutor", key: "ai", gradient: "from-purple-500 to-pink-600" },
              { icon: User, label: "Profile", key: "profile", gradient: "from-slate-500 to-slate-600" },
            ].map((item) => {
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => handleTabChange(item.key)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-xl flex-1 min-w-0 transition-all duration-200 ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 ${
                    isActive ? `bg-gradient-to-br ${item.gradient} shadow-sm` : "hover:bg-muted"
                  }`}>
                    <item.icon className={`w-4 h-4 ${
                      isActive ? "text-white" : "text-muted-foreground"
                    }`} />
                  </div>
                  <span className={`text-[9px] font-semibold leading-none truncate w-full text-center ${
                    isActive ? "text-primary" : "text-muted-foreground"
                  }`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
