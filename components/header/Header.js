'use client'
import Image from 'next/image'
import styles from './Header.module.css'
import { useEffect, useState } from 'react'


const Header = () => {

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
  className={`${styles.headerContainer} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.header}>
            <Image src='/logo/kds-transparent-white.png' alt='KDS Logo' width={150} height={100}/>
            <div style={{display:'flex', alignItems:'center', gap:'20px'}}>
              <button>Login</button>
            </div>
        </div>
    </div>
  )
}

export default Header