'use client';
import { motion } from "framer-motion";
import styles from "./Mockup.module.css";
import Image from "next/image";

// Updated mockups
const mockups = [
  { image: '/mockups/dashboard.png', title: 'Dashboard', variant: 'dashboard' },
  { image: '/mockups/team.png', title: 'Team', variant: 'team' },
  { image: '/mockups/history.png', title: 'History', variant: 'history' },
  { image: '/mockups/analytics.png', title: 'Analytics', variant: 'analytics' },
];

const MockupsSection = () => {
  return (
    <section id="mockups" className={styles.section}>
      <div className={styles.container}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className={styles.header}
        >
          <span className={styles.badge}>Mobile-First Design</span>
          <h2>Beautiful on Every Device</h2>
          <p>Optimized for mobile with a responsive design that works seamlessly across all devices.</p>
        </motion.div>

        {/* Cards */}
        <div className={styles.grid}>
          {mockups.map((mockup, index) => (
            <motion.div
              key={mockup.title}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <div className={`${styles.card} ${styles[mockup.variant]}`}>
                <Image 
                  src={mockup.image} 
                  alt={mockup.title} 
                  width={300} 
                  height={200} 
                  className={styles.image}
                />
                <p>{mockup.title}</p>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
};

export default MockupsSection;
