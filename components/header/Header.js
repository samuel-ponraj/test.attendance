'use client'
import Image from 'next/image'
<<<<<<< HEAD
import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../app/context/AuthContext'
import { useRouter } from 'next/navigation'
import styles from './Header.module.css'

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 100)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const handleAuthClick = async () => {
    if (user) {
      await logout()
      router.push('/')
    } else {
      router.push('/login') // redirect to login page
    }
  }

  return (
    <div className={`${styles.headerContainer} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.header}>
        <Image src='/logo/KDA-logo-white.png' alt='KDS Logo' width={150} height={100}/>
        <div style={{display:'flex', alignItems:'center', gap:'30px'}}>
          <button onClick={handleAuthClick}>
            {user ? (
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
=======
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
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
    </div>
  )
}

<<<<<<< HEAD
export default Header
=======
export default Header
>>>>>>> c39aa9d3570ced9499a5f3473f6b937ca0c693a8
