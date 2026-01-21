'use client'
import Image from 'next/image'
import styles from './Header.module.css'
import { useEffect, useState } from 'react'
import { useUser, useClerk } from '@clerk/nextjs';
import Link from 'next/link';
import {  LogOut } from 'lucide-react';


const Header = () => {

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);
      const { isSignedIn, user } = useUser();
      const { openSignIn, signOut } = useClerk();
      const toggleMenu = () => setIsMenuOpen(!isMenuOpen);


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
      
        router.push('/');
      
    });
    } else {
      openSignIn();
    }
  };

  return (
    <div
        className={`${styles.headerContainer} ${isScrolled ? styles.scrolled : ''}`}>
        <div className={styles.header}>
            <Image src='/logo/KDA-logo-white.png' alt='KDS Logo' width={150} height={100}/>
            
            <div style={{display:'flex', alignItems:'center', gap:'30px'}}>
            
              
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