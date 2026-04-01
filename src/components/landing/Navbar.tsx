import { Link } from "react-router-dom";
import { GraduationCap, Menu, X } from "lucide-react";
import { useState } from "react";
import { APP_NAME } from "@/lib/branding";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16">
      <div className="absolute inset-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-border/50 shadow-xs" />
      <nav className="relative container h-full flex items-center justify-between gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-sm group-hover:shadow-glow transition-shadow duration-300">
            <GraduationCap className="w-4.5 h-4.5 text-white" />
          </div>
          <span className="font-display font-bold text-base text-foreground">{APP_NAME}</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {[
            { href: "#features", label: "Features" },
            { href: "#how-it-works", label: "How it Works" },
          ].map(({ href, label }) => (
            <a
              key={label}
              href={href}
              className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
            >
              {label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-2">
          <Link
            to="/auth"
            className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          >
            Sign In
          </Link>
          <Link
            to="/auth"
            className="px-4 py-2 rounded-xl text-sm font-semibold bg-primary text-white hover:bg-primary/90 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Get Started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden w-9 h-9 rounded-lg bg-muted flex items-center justify-center hover:bg-muted-foreground/10 transition-colors"
        >
          {menuOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-slate-900 border-b border-border shadow-elevated p-4 space-y-2">
          <a href="#features" className="block px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">Features</a>
          <a href="#how-it-works" className="block px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">How it Works</a>
          <Link to="/auth" className="block px-3 py-2 rounded-xl text-sm font-semibold text-primary hover:bg-primary/5 transition-colors">Sign In</Link>
          <Link to="/auth" className="block px-3 py-2 rounded-xl text-sm font-semibold bg-primary text-white text-center hover:bg-primary/90 transition-colors">Get Started Free</Link>
        </div>
      )}
    </header>
  );
};

export default Navbar;
