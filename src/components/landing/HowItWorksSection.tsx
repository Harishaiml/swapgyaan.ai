import { motion } from "framer-motion";

const steps = [
  { step: "01", title: "Sign Up & Add Skills", description: "Register and list skills you can teach and want to learn." },
  { step: "02", title: "Get AI Matched", description: "Our AI finds the best skill partners for mutual learning." },
  { step: "03", title: "Connect & Book", description: "Send a request, get accepted, and book a live session slot." },
  { step: "04", title: "Learn & Earn", description: "Attend sessions, complete tasks, and earn verified certificates." },
];

const HowItWorksSection = () => {
  return (
    <section className="py-24 bg-muted/50">
      <div className="container">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-5xl font-bold font-display mb-4">
            How It <span className="text-gradient-primary">Works</span>
          </h2>
          <p className="text-muted-foreground text-lg">Four simple steps to start learning</p>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-8 max-w-5xl mx-auto">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              className="text-center relative"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="text-5xl font-bold font-display text-gradient-primary mb-4 opacity-30">
                {item.step}
              </div>
              <h3 className="text-lg font-semibold font-display mb-2">{item.title}</h3>
              <p className="text-muted-foreground text-sm">{item.description}</p>
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 -right-4 w-8 h-0.5 bg-border" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
