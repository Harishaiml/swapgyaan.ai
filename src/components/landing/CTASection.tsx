import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section className="py-24">
      <div className="container">
        <motion.div
          className="relative rounded-2xl bg-gradient-hero p-12 md:p-20 text-center overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.15),transparent)]" />
          <div className="relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold font-display text-primary-foreground mb-4">
              Ready to Start Swapping Skills?
            </h2>
            <p className="text-primary-foreground/80 text-lg mb-8 max-w-xl mx-auto">
              Join thousands of learners and teachers exchanging knowledge every day.
            </p>
            <Link to="/auth">
              <Button size="lg" className="bg-card text-foreground hover:bg-card/90 text-base px-8 py-6 font-semibold">
                Join SwapGyaan AI
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;
