"use client"
import Link from 'next/link'
import React, { useEffect, useState } from 'react'
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
  Sparkles,
  ChevronLeft,
  type LucideIcon,
} from 'lucide-react'

type NavIcon = LucideIcon

const COLLAPSED_WIDTH = '76px'
const EXPANDED_WIDTH = '240px'
const STORAGE_KEY = 'rs_sidebar_collapsed'

interface NavItemProps {
  href: string
  icon: NavIcon
  label: string
  active: boolean
  collapsed: boolean
}

function NavItem({ href, icon: Icon, label, active, collapsed }: NavItemProps) {
  return (
    <Link
      className={`group relative flex items-center gap-sm py-sm rounded-r-lg border-l-[3px] transition-all font-heading text-body-sm font-medium
        ${collapsed ? 'justify-center px-0 mx-1 rounded-lg border-l-0' : 'px-md'}
        ${active
          ? collapsed
            ? 'text-primary bg-surface-container-high'
            : 'text-primary bg-surface-container-high border-primary'
          : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container'
        }`}
      href={href}
      title={collapsed ? label : undefined}
    >
      <Icon size={19} strokeWidth={active ? 2.5 : 1.75} className="flex-shrink-0" />
      {!collapsed && label}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-surface-container-high border border-outline-variant px-2.5 py-1 text-[12px] text-on-surface opacity-0 shadow-elevated transition-opacity group-hover:opacity-100 z-50">
          {label}
        </span>
      )}
    </Link>
  )
}

function Sidebar() {
  const { logout } = useAuth()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    setCollapsed(stored === 'true')
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH)
    localStorage.setItem(STORAGE_KEY, String(collapsed))
  }, [collapsed, mounted])

  const isMoviePage = pathname.startsWith('/movie/')
  const isSearchPage = pathname.startsWith('/search')
  const isProfilePage = pathname.startsWith('/profile')
  const isListsPage = pathname.startsWith('/lists')
  const isSavedListsPage = pathname.startsWith('/saved-lists')
  const isLeaderboardPage = pathname.startsWith('/leaderboard')
  const isNotificationsPage = pathname.startsWith('/notifications')
  const isRileyPage = pathname.startsWith('/riley')
  const isDashboardPage = pathname === '/dashboard'
  const isSettingsPage = pathname.startsWith('/settings')

  return (
    <>
      <nav
        className={`hidden md:flex flex-col bg-surface-dim border-r border-outline-variant h-full fixed left-0 top-0 py-lg z-50 transition-[width] duration-200 ease-spring overflow-visible ${mounted ? '' : 'invisible'}`}
        style={{ width: collapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH }}
      >
        {/* Collapse toggle — straddles the border edge, like a modal/panel collapse handle */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="absolute top-7 -right-3 w-6 h-6 rounded-full bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container flex items-center justify-center shadow-card transition-colors z-10"
        >
          <ChevronLeft size={13} strokeWidth={2.5} className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
        </button>

        <div className={`mb-xl ${collapsed ? 'px-0 flex justify-center' : 'px-md'}`}>
          <Link href="/dashboard">
            <div className="flex items-center gap-2">
              <LogoMark size={28} />
              {!collapsed && (
                <h1 className="font-bold text-[17px] tracking-tight text-on-surface whitespace-nowrap" style={{ letterSpacing: '-0.02em' }}>Reelstack</h1>
              )}
            </div>
          </Link>
        </div>

        <div className={`flex-1 flex flex-col gap-xs ${collapsed ? '' : 'px-sm'}`}>
          <NavItem href="/dashboard" icon={Home} label="Home" active={isDashboardPage} collapsed={collapsed} />
          <NavItem href="/search" icon={Search} label="Search" active={isSearchPage} collapsed={collapsed} />
          <NavItem href="/riley" icon={Sparkles} label="Riley" active={isRileyPage} collapsed={collapsed} />
          <NavItem href="/lists" icon={List} label="My Lists" active={isListsPage} collapsed={collapsed} />
          <NavItem href="/saved-lists" icon={Bookmark} label="Saved Lists" active={isSavedListsPage} collapsed={collapsed} />
          <NavItem href="/leaderboard" icon={Trophy} label="Leaderboard" active={isLeaderboardPage} collapsed={collapsed} />
          <NavItem href="/profile" icon={User} label="Profile" active={isProfilePage} collapsed={collapsed} />
          <NavItem href="/notifications" icon={Bell} label="Alerts" active={isNotificationsPage} collapsed={collapsed} />
        </div>

        <div className={`mt-auto flex flex-col gap-sm ${collapsed ? '' : 'px-sm'}`}>
          <NavItem href="/settings/mcp" icon={Settings} label="Settings" active={isSettingsPage} collapsed={collapsed} />
          <button
            onClick={logout}
            title={collapsed ? 'Log out' : undefined}
            className={`group relative w-full text-left flex items-center gap-sm text-on-surface-variant hover:text-error hover:bg-error-container/10 py-sm transition-colors rounded-lg font-heading text-body-sm font-medium
              ${collapsed ? 'justify-center px-0 mx-1' : 'px-md'}`}
          >
            <LogOut size={19} strokeWidth={1.75} className="flex-shrink-0" />
            {!collapsed && 'Log out'}
            {collapsed && (
              <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-surface-container-high border border-outline-variant px-2.5 py-1 text-[12px] text-on-surface opacity-0 shadow-elevated transition-opacity group-hover:opacity-100 z-50">
                Log out
              </span>
            )}
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
        <Link className={`flex flex-col items-center justify-center active:scale-95 w-16 h-full ${isRileyPage ? 'text-primary' : 'text-on-surface-variant'}`} href="/riley">
          <Sparkles size={22} strokeWidth={isRileyPage ? 2.5 : 1.75} className="mb-1" />
          <span className="font-caption text-[10px]">Riley</span>
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
