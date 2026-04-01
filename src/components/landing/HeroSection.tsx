import { motion } from "framer-motion";
import { ArrowRight, Sparkles, GraduationCap, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_NAME } from "@/lib/branding";

const HeroSection = () => {
  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-background">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient orbs */}
        <div className="absolute -top-48 -right-48 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-48 -left-48 w-[500px] h-[500px] bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-blue-400/5 rounded-full blur-3xl" />

        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle, #2563eb 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }} />
      </div>

      <div className="container relative z-10 py-20">
        <div className="max-w-4xl mx-auto text-center">

          {/* Badge */}
          <motion.div
            className="flex justify-center mb-6"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/8 border border-primary/20 text-primary text-sm font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              AI-Powered Skill Exchange Platform
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            className="text-5xl md:text-7xl font-bold font-display leading-[1.08] tracking-tight mb-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            Learn Together.{" "}
            <span className="text-gradient-primary">Grow Faster.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            Exchange skills with verified peers, get matched by AI, learn through live sessions,
            and earn verifiable certificates — all in one platform.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Link to="/auth">
              <button className="inline-flex items-center gap-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold text-base px-7 py-3.5 rounded-xl transition-all duration-200 shadow-glow hover:shadow-lg group">
                Get Started Free
                <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
            <Link to="/auth">
              <button className="inline-flex items-center gap-2 border border-border bg-background hover:bg-muted text-foreground font-semibold text-base px-7 py-3.5 rounded-xl transition-all duration-200">
                Explore Skills
              </button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex flex-wrap items-center justify-center gap-8 md:gap-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            {[
              { value: "10K+", label: "Active Learners", color: "text-blue-600" },
              { value: "500+", label: "Skills Available", color: "text-teal-600" },
              { value: "2K+", label: "Certificates Issued", color: "text-violet-600" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className={`text-3xl font-bold font-display ${stat.color}`}>{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="flex items-center justify-center gap-3 mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.7 }}
          >
            <div className="flex -space-x-2">
              {["🧑‍💻", "👩‍🎨", "🧑‍🔬", "👨‍🏫", "👩‍💼"].map((emoji, i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-sm">
                  {emoji}
                </div>
              ))}
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <strong className="text-foreground">4.9/5</strong> from 2,000+ learners
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
