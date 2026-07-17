"use client"
import Link from 'next/link'
import React from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from './providers/auth-provider'
import { LogoMark } from './ui/logo'
import {
  Home,
  Search,
  List,
  Bookmark,
  Trophy,
  User,
  Bell,
  Settings,
  LogOut,
  type LucideIcon,
} from 'lucide-react'

type NavIcon = LucideIcon

interface NavItemProps {
  href: string
  icon: NavIcon
  label: string
  active: boolean
}

function NavItem({ href, icon: Icon, label, active }: NavItemProps) {
  return (
    <Link
      className={`flex items-center gap-sm px-md py-sm rounded-r-lg border-l-[3px] transition-colors font-heading text-body-sm font-medium
        ${active
          ? 'text-primary bg-surface-container-high border-primary'
          : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container'
        }`}
      href={href}
    >
      <Icon size={19} strokeWidth={active ? 2.5 : 1.75} />
      {label}
    </Link>
  )
}

function Sidebar() {
  const { logout } = useAuth()
  const pathname = usePathname()

  const isMoviePage = pathname.startsWith('/movie/')
  const isSearchPage = pathname.startsWith('/search')
  const isProfilePage = pathname.startsWith('/profile')
  const isListsPage = pathname.startsWith('/lists')
  const isSavedListsPage = pathname.startsWith('/saved-lists')
  const isLeaderboardPage = pathname.startsWith('/leaderboard')
  const isNotificationsPage = pathname.startsWith('/notifications')
  const isDashboardPage = pathname === '/dashboard'

  return (
    <>
      <nav className="hidden md:flex flex-col bg-surface-dim border-r border-outline-variant w-[--sidebar-width] h-full fixed left-0 top-0 py-lg z-50">

        <div className="px-md mb-xl">
          <Link href="/dashboard">
            <div className="flex items-center gap-2">
              <LogoMark size={28} />
              <h1 className="font-bold text-[17px] tracking-tight text-on-surface" style={{ letterSpacing: '-0.02em' }}>Reelstack</h1>
            </div>
          </Link>
        </div>

        <div className="flex-1 flex flex-col gap-xs px-sm">
          <NavItem href="/dashboard" icon={Home} label="Home" active={isDashboardPage} />
          <NavItem href="/search" icon={Search} label="Search" active={isSearchPage} />
          <NavItem href="/lists" icon={List} label="My Lists" active={isListsPage} />
          <NavItem href="/saved-lists" icon={Bookmark} label="Saved Lists" active={isSavedListsPage} />
          <NavItem href="/leaderboard" icon={Trophy} label="Leaderboard" active={isLeaderboardPage} />
          <NavItem href="/profile" icon={User} label="Profile" active={isProfilePage} />
          <NavItem href="/notifications" icon={Bell} label="Alerts" active={isNotificationsPage} />
        </div>

        <div className="mt-auto px-sm flex flex-col gap-sm">
          <button className="w-full text-left flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-lg font-heading text-body-sm font-medium">
            <Settings size={19} strokeWidth={1.75} />
            Settings
          </button>
          <button
            onClick={logout}
            className="w-full text-left flex items-center gap-sm text-on-surface-variant hover:text-error hover:bg-error-container/10 px-md py-sm transition-colors rounded-lg font-heading text-body-sm font-medium"
          >
            <LogOut size={19} strokeWidth={1.75} />
            Log out
          </button>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 z-50 bg-surface-container-low/95 backdrop-blur-lg flex justify-around items-center px-sm pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
        <Link className={`flex flex-col items-center justify-center active:scale-95 w-16 h-full ${isDashboardPage ? 'text-primary' : 'text-on-surface-variant'}`} href="/dashboard">
          <Home size={22} strokeWidth={isDashboardPage ? 2.5 : 1.75} className="mb-1" />
          <span className="font-caption text-[10px]">Home</span>
        </Link>
        <Link className={`flex flex-col items-center justify-center active:scale-95 w-16 h-full ${isSearchPage ? 'text-primary' : 'text-on-surface-variant'}`} href="/search">
          <Search size={22} strokeWidth={isSearchPage ? 2.5 : 1.75} className="mb-1" />
          <span className="font-caption text-[10px]">Search</span>
        </Link>
        <Link className={`flex flex-col items-center justify-center active:scale-95 w-16 h-full ${isListsPage ? 'text-primary' : 'text-on-surface-variant'}`} href="/lists">
          <List size={22} strokeWidth={isListsPage ? 2.5 : 1.75} className="mb-1" />
          <span className="font-caption text-[10px]">Lists</span>
        </Link>
        <Link className={`flex flex-col items-center justify-center active:scale-95 w-16 h-full ${isProfilePage ? 'text-primary' : 'text-on-surface-variant'}`} href="/profile">
          <User size={22} strokeWidth={isProfilePage ? 2.5 : 1.75} className="mb-1" />
          <span className="font-caption text-[10px] font-semibold">Profile</span>
        </Link>
      </nav>
    </>
  )
}

export default Sidebar
