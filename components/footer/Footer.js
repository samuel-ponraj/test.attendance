import { Crown, Mail, Phone } from "lucide-react";
import styles from "./Footer.module.css";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Top section */}
        <div className={styles.top}>
          {/* Brand */}
          <div>
            <a href="#" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-xl text-background">
                Kingz<span className="text-primary">Digital</span>
              </span>
            </a>

            <p className={styles.brandText}>
              Simple and efficient attendance management for teams of all sizes.
              Track, manage, and grow with ease.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className={styles.sectionTitle}>Quick Links</h4>
            <nav className={styles.links}>
              <a href="#features" className={styles.footerLink}>Features</a>
              <a href="#use-cases" className={styles.footerLink}>Use Cases</a>
              <a href="#app-preview" className={styles.footerLink}>App Preview</a>
              <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
              <a href="#" className={styles.footerLink}>Dashboard</a>
            </nav>
          </div>

          {/* Contact */}
          <div>
            <h4 className={styles.sectionTitle}>Contact</h4>
            <div className={styles.contact}>
              <a href="mailto:hello@kingzdigital.com" className={styles.contactItem}>
                <Mail className="w-4 h-4" />
                hello@kingzdigital.com
              </a>

              <a href="tel:+1234567890" className={styles.contactItem}>
                <Phone className="w-4 h-4" />
                +1 (234) 567-890
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <p className="text-sm ">
            © {currentYear} Kingz Digital Services. All rights reserved.
          </p>

          <div className={styles.bottomLinks}>
            <a href="#" className={styles.footerLink}>Privacy Policy</a>
            <a href="#" className={styles.footerLink}>Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
