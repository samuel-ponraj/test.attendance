
import styles from './HomePage.module.css'
import { ArrowRight, CheckCircle } from 'lucide-react';
import Features from './Features'
import Link from 'next/link';
import UseCase from './UseCase'
import HowItWorks from './HowItWorks'

const HomePage = () => {
  return (
    <div className={styles.homePagecontainer}>
        <section className={styles.heroSection}>
          <p>✨ Simple & Efficient Attendance Management</p>
          <h1>Track Attendance with <span style={{color:'var(--primary)'}}>Ease & Precision</span></h1>
          <p>Streamline your team's attendance tracking. Add teams, manage members, and record attendance in just a few clicks.</p>
          <div className={styles.heroButtons}>
            <Link href='/dashboard'>
              <button className={styles.homeBtn1}>Record Attendance <ArrowRight /></button>
            </Link>
            <button className={styles.homeBtn2}>Learn More</button>
          </div>
          <div className={styles.highlights}>
            <div className={styles.highlight}>
              <CheckCircle style={{color:'var(--primary)'}}/>
              <span>Real-time tracking</span>
            </div>
            <div className={styles.highlight}>
              <CheckCircle style={{color:'var(--primary)'}} />
              <span>Team management</span>
            </div>
            <div className={styles.highlight}>
              <CheckCircle style={{color:'var(--primary)'}} />
              <span>Easy to use</span>
            </div>
          </div>
        </section>
    </div>
  )
}

export default HomePage