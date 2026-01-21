import { Crown, Mail, Phone } from "lucide-react";
import styles from "./Footer.module.css";
import Image from "next/image";
import Link from "next/link";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        {/* Top section */}
        <div className={styles.top}>
          {/* Brand */}
          <div>
            <a href="/" className="flex items-center gap-2 mb-6">
              <Image src='/logo/KDA-logo-white.png' alt='KDS Logo' width={180} height={100}/>
            </a>

            <p className={styles.brandText}>
              Simple and efficient attendance management for teams of all sizes.
              Track, manage, and grow with ease.
            </p>

            <p className={styles.poweredby}>
              Powered by <Link href='https://kingzdigitalsolutions.in/'>Kingz Digital Solutions</Link>
            </p>
          </div>

          {/* Quick Links */}
        <div className="flex  align-center justify-center">
          <div className={styles.quickLinks}>
            <h4 className={styles.sectionTitle}>Quick Links</h4>
            <nav className={styles.links}>
              <a href="#features" className={styles.footerLink}>Features</a>
              <a href="#use-cases" className={styles.footerLink}>Use Cases</a>
              <a href="#how-it-works" className={styles.footerLink}>How It Works</a>
            </nav>
          </div>
        </div>

          {/* Contact */}
          <div>
            <h4 className={styles.sectionTitle}>Contact</h4>
            <div className={styles.contact}>
              <a href="mailto:contact@kingzdigitalsolutions.in" className={styles.contactItem}>
                <Mail className="w-4 h-4" />
                contact@kingzdigitalsolutions.in
              </a>

              <a href="tel:+919345018217" className={styles.contactItem}>
                <Phone className="w-4 h-4" />
                +91 9345018217
              </a>

              <a href="https://kingzdigitalsolutions.in/" className={styles.contactItemLogo}>
                <Image src='/logo/kds-transparent copy.png' alt='KDS Logo' width={150} height={100}/>
              </a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className={styles.bottom}>
          <p className="text-sm ">
            © {currentYear} Kingz Digital Solutions. All rights reserved.
          </p>

          {/* <div className={styles.bottomLinks}>
            <a href="#" className={styles.footerLink}>Privacy Policy</a>
            <a href="#" className={styles.footerLink}>Terms of Service</a>
          </div> */}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
