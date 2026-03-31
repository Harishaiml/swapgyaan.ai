import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, LayoutDashboard, Users, BookOpen, Calendar, Award, MessageSquare, User, LogOut } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
  { icon: LayoutDashboard, label: "Dashboard", key: "home" },
  { icon: Users, label: "Find Matches", key: "match" },
  { icon: MessageSquare, label: "Requests", key: "requests" },
  { icon: BookOpen, label: "Teach", key: "teach" },
  { icon: Calendar, label: "Sessions", key: "sessions" },
  { icon: Award, label: "Certificates", key: "certificates" },
  { icon: Sparkles, label: "AI Tutor", key: "ai" },
  { icon: User, label: "Profile", key: "profile" },
];

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("home");
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
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

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden md:flex flex-col w-64 border-r border-border bg-card p-4">
        <Link to="/" className="mb-8 px-2">
          <BrandLogo size="sm" />
        </Link>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <Button variant="ghost" className="w-full justify-start gap-3 text-muted-foreground" onClick={handleSignOut}>
          <LogOut className="w-4 h-4" />
          Log Out
        </Button>
      </aside>

      <div className="fixed bottom-0 left-0 right-0 md:hidden bg-card border-t border-border z-50">
        <div className="flex justify-around py-2">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key)}
              className={`flex flex-col items-center gap-1 px-2 py-1 text-xs ${
                activeTab === item.key ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        <div className="p-6 md:p-8 max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
