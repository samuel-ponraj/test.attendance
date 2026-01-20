'use client'
import { motion } from "framer-motion";
import { UserPlus, ListPlus, CheckCircle } from "lucide-react";
import styles from "./HowItWorks.module.css";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Team",
    description: "Sign up and create your first team in seconds. Add team members by name.",
  },
  {
    number: "02",
    icon: ListPlus,
    title: "Add Members",
    description: "Build your roster by adding all team members. Organize them as needed.",
  },
  {
    number: "03",
    icon: CheckCircle,
    title: "Mark Attendance",
    description: "Record attendance with a single tap. View reports and track history.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className={styles.section}>
      <div className={styles.ctabgblack}></div>
      <div className={styles.ctapatternoverlay}></div>
      <div className={styles.container}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={styles.header}
        >
          <span className={styles.badge}>How It Works</span>

          <h2>
            Get Started in <span>3 Simple Steps</span>
          </h2>

          <p>
            No complex setup required. Start tracking attendance in minutes.
          </p>
        </motion.div>

        {/* Steps */}
        <div className={styles.grid}>
          {steps.map((step, index) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className={styles.step}
            >
              {/* Connector */}
              {index < steps.length - 1 && (
                <div className={styles.connector} />
              )}

              {/* Icon circle */}
              <div className={styles.iconWrapper}>
                <span className={styles.stepNumber}>{step.number}</span>
                <step.icon size={48} />
              </div>

              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default HowItWorksSection;
