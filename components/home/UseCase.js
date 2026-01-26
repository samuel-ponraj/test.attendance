'use client'
import { motion } from "framer-motion";
import {
  GraduationCap,
  Dumbbell,
  Building2,
  Users
} from "lucide-react";
import styles from "./UseCase.module.css";

const useCases = [
  {
    icon: GraduationCap,
    title: "Classes & Tuitions",
    description: "Perfect for tutors and coaching centers to track student attendance daily.",
    variant: "blue",
  },
  {
    icon: Dumbbell,
    title: "Sports Teams",
    description: "Keep track of player attendance for practice sessions and matches.",
    variant: "green",
  },
  {
    icon: Building2,
    title: "Offices",
    description: "Streamline employee attendance for small offices and startups.",
    variant: "purple",
  },
  {
    icon: Users,
    title: "Training Teams",
    description: "Monitor trainee attendance for workshops and corporate training programs.",
    variant: "orange",
  },
];

const UseCasesSection = () => {
  return (
    <section id="use-cases" className={styles.section}>
      <div className={styles.container}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={styles.header}
        >
            <span className={styles.badge}>USE CASES</span>
          <h2>
            Built for <span>Any Team</span>
          </h2>
          <p>
            Whether you're managing a classroom or a sports team, Kingz Digital Attendance adapts to your needs.
          </p>
        </motion.div>

        {/* Cards */}
        <div className={styles.grid}>
          {useCases.map((useCase, index) => (
            <motion.div
              key={useCase.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className={`${styles.card} ${styles[useCase.variant]}`}>
                <div className={styles.icon}>
                  <useCase.icon size={28} />
                </div>

                <h3>{useCase.title}</h3>
                <p>{useCase.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default UseCasesSection;
