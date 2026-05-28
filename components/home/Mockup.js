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

const desktopMockups = [
  {
    image: "/mockups/dashboard-desktop.png",
    title: "Admin dashboard",
    description: "Track team totals, present members, absent members, charts, and billing balances from one view.",
  },
  {
    image: "/mockups/payments-desktop.png",
    title: "Payments workspace",
    description: "Filter teams and members, review billing periods, and see paid and pending balances clearly.",
  },
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
          <span className={styles.badge}>Product Preview</span>
          <h2>Dashboards made for daily operations</h2>
          <p>Desktop views for admins, compact views for teams, and billing screens that make payment status easy to scan.</p>
        </motion.div>

        <div id="product-preview" className={styles.showcase}>
          {desktopMockups.map((mockup, index) => (
            <motion.article
              key={mockup.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={styles.showcaseCard}
            >
              <div className={styles.showcaseImageWrap}>
                <Image
                  src={mockup.image}
                  alt={mockup.title}
                  width={1920}
                  height={1080}
                  className={styles.showcaseImage}
                />
              </div>
              <div className={styles.showcaseCopy}>
                <h3>{mockup.title}</h3>
                <p>{mockup.description}</p>
              </div>
            </motion.article>
          ))}
        </div>

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
