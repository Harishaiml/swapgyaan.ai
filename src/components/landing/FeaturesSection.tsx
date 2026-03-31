import { motion } from "framer-motion";
import { Users, Brain, Video, Award, MessageSquare, Zap } from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Smart Matching",
    description: "AI matches you with the perfect skill partner based on what you want to learn and teach.",
  },
  {
    icon: Video,
    title: "Live Sessions",
    description: "Connect via integrated video calls. No setup needed — just click and learn.",
  },
  {
    icon: Brain,
    title: "AI Tutor",
    description: "Get personalized roadmaps, quizzes, and practice tasks powered by AI.",
  },
  {
    icon: Award,
    title: "Verified Certificates",
    description: "Earn certificates after completing tasks. Verified with QR codes.",
  },
  {
    icon: MessageSquare,
    title: "Task & Review",
    description: "Teachers assign tasks, learners submit, and work gets reviewed in real-time.",
  },
  {
    icon: Zap,
    title: "Dual Role",
    description: "Be both a learner and teacher. Teach Python while learning Guitar.",
  },
];

const FeaturesSection = () => {
  return (
    <section className="py-24 relative">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            Everything You Need to{" "}
            <span className="text-gradient-primary">Swap Skills</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A complete platform for peer-to-peer learning with AI assistance
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              className="group p-6 rounded-xl bg-card shadow-card hover:shadow-elevated transition-all duration-300 border border-border/50"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <feature.icon className="w-6 h-6 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold font-display mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
