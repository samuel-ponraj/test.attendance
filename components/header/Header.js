'use client'
import Image from 'next/image'
import styles from './Header.module.css'
import { useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import { LayoutDashboard, LogOut } from 'lucide-react';


const Header = () => {

  const [isScrolled, setIsScrolled] = useState(false);
      const { isSignedIn, user } = useUser();
      const { openSignIn, signOut } = useClerk();


  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAuthClick = () => {
    if (isSignedIn) {
      signOut(() => {
      if (pathname === '/our-publications/ungal-thozhan/checkout') {
        router.push('/our-publications/ungal-thozhan');
      }
    });
    } else {
      openSignIn();
    }
  };

  return (
    <div
        className={`${styles.headerContainer} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.header}>
            <Image src='/logo/kds-transparent-white.png' alt='KDS Logo' width={150} height={100}/>
            <div style={{display:'flex', alignItems:'center', gap:'30px'}}>
              {/* <Link href='/dashboard'>
              {isSignedIn && (
                <h1 className={styles.dashboardBtn} ><LayoutDashboard /> Dashboard</h1>
              )}
              </Link> */}
              <button onClick={handleAuthClick}>
                {isSignedIn ? (
                  <>
                    <LogOut className="w-4 mr-1" />
                    Logout
                  </>
                ) : (
                  "Login"
                )}
              </button>
            </div>
        </div>
    </div>
  )
}

export default Header