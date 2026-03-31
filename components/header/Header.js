'use client'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useAuth } from '../../app/context/AuthContext'
import { useRouter } from 'next/navigation'
import styles from './Header.module.css'
import Link from 'next/link'

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
      router.push('/login') 
    }
  }

  return (
    <div className={`${styles.headerContainer} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.header}>
        <Link href='/'>
        <Image src='/logo/KDA-logo-white.png' alt='KDS Logo' width={150} height={100}/>
        </Link>
        <div style={{display:'flex', alignItems:'center', gap:'30px'}}>
          <button onClick={handleAuthClick}>
            {user ? (
              <>
                <LogOut className="w-4" />
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
