"use client"
import Link from 'next/link'
import React from 'react'
import { usePathname } from 'next/navigation'  // ← replace window.location
import { useAuth } from './providers/auth-provider'

function Sidebar() {
  const { user: authUser, isLoading: authLoading, logout } = useAuth()
  const pathname = usePathname()  // ← consistent on server + client

  const isMoviePage = pathname.startsWith('/movie/')
  const isSearchPage = pathname.startsWith('/search')
  const isProfilePage = pathname.startsWith('/profile')
  const isListsPage = pathname.startsWith('/lists')
  const isSavedListsPage = pathname.startsWith('/saved-lists')
  const isLeaderboardPage = pathname.startsWith('/leaderboard')
  const isNotificationsPage = pathname.startsWith('/notifications')
  const isDashboardPage = pathname === '/dashboard'

  // helper so you don't repeat the ternary everywhere
  const filled = { fontVariationSettings: "'FILL' 1" }
  const filledClassName = "text-primary border-l-[3px] border-primary bg-surface-container-high"


  return (
    <>
      <nav className="hidden md:flex flex-col bg-surface-dim border-r border-outline-variant w-[--sidebar-width] h-full fixed left-0 top-0 py-lg z-50">

        <div className="px-md mb-xl">
          <Link href="/dashboard">
            <h1 className="font-display-md text-display-md font-bold text-primary tracking-tight">Reelstack</h1>
            <p className="font-caption text-caption text-on-surface-variant mt-1">Cinephile Gallery</p>
          </Link>
        </div>
        <div className="flex-1 flex flex-col gap-xs px-sm">
          <Link
            className={`flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading ${isDashboardPage ? filledClassName : ''}`}
            href="/dashboard"
          >
            <span className="material-symbols-outlined" style={isDashboardPage ? filled : undefined}>home</span>
            Home
          </Link>
          <Link
            className={`flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading ${isSearchPage ? filledClassName : ''}`}
            href="/search"
          >
            <span className="material-symbols-outlined" style={isSearchPage ? filled : undefined}>search</span>
            Search
          </Link>
          <Link
            className={`flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading ${isListsPage ? filledClassName : ''}`}
            href="/lists"
          >
            <span className="material-symbols-outlined" style={isListsPage ? filled : undefined}>format_list_bulleted</span>
            My Lists
          </Link>
          <Link
            className={`flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading ${isSavedListsPage ? filledClassName : ''}`}
            href="/saved-lists"
          >
            <span className="material-symbols-outlined" style={isSavedListsPage ? filled : undefined}>bookmark</span>
            Saved Lists
          </Link>
          <Link
            className={`flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading ${isLeaderboardPage ? filledClassName : ''}`}
            href="/leaderboard"
          >
            <span className="material-symbols-outlined" style={isLeaderboardPage ? filled : undefined}>leaderboard</span>
            Leaderboard
          </Link>
          <Link
            className={`flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-r-lg border-l-[3px] border-transparent font-heading text-heading ${isProfilePage ? filledClassName : ''}`}
            href="/profile"
          >
            <span className="material-symbols-outlined" style={isProfilePage ? filled : undefined}>person</span>
            Profile
          </Link>
             <div className={`flex items-center justify-between px-md py-2 hover:bg-surface-container transition-colors rounded-r-lg text-on-surface-variant hover:text-on-surface border-l-[3px] border-transparent font-heading text-heading ${isNotificationsPage ? filledClassName : ''}`}>
            <Link href={"/notifications"} className="flex items-center gap-sm">
              <span className="material-symbols-outlined" style={isNotificationsPage ? filled : undefined}>notifications</span>
              Alerts
            </Link>
            {/* <NotificationBell /> */}
          </div>
        </div>
        <div className="mt-auto px-sm flex flex-col gap-sm">
          <button className="w-full text-left flex items-center gap-sm text-on-surface-variant hover:text-on-surface px-md py-sm hover:bg-surface-container transition-colors rounded-lg font-heading text-heading">
            <span className="material-symbols-outlined">settings</span>
            Settings
          </button>
          <button 
            onClick={logout}
            className="w-full text-left flex items-center gap-sm text-on-surface-variant hover:text-error-container hover:bg-error-container/10 px-md py-sm transition-colors rounded-lg font-heading text-heading"
          >
            <span className="material-symbols-outlined">logout</span>
            Log out
          </button>
        </div>
      </nav>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 w-full h-16 z-50 bg-surface-container-low/95 backdrop-blur-lg flex justify-around items-center px-sm pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.4)]">
        <Link className={`flex flex-col items-center justify-center text-on-surface-variant active:scale-95 w-16 h-full ${isDashboardPage ? 'text-primary' : ''}`} href="/dashboard">
          <span style={isDashboardPage ? filled : undefined} className="material-symbols-outlined mb-1">home</span>
          <span className="font-caption text-[10px]">Home</span>
        </Link>
        <Link className={`flex flex-col items-center justify-center text-on-surface-variant active:scale-95 w-16 h-full ${isSearchPage ? 'text-primary' : ''}`} href="/search">
          <span style={isSearchPage ? filled : undefined} className="material-symbols-outlined mb-1">search</span>
          <span className="font-caption text-[10px]">Search</span>
        </Link>
        <Link className={`flex flex-col items-center justify-center text-on-surface-variant active:scale-95 w-16 h-full ${isListsPage ? 'text-primary' : ''}`} href="/lists">
          <span style={isListsPage ? filled : undefined} className="material-symbols-outlined mb-1">list</span>
          <span className="font-caption text-[10px]">Lists</span>
        </Link>
        <Link className={`flex flex-col items-center justify-center text-on-surface-variant active:scale-95 w-16 h-full ${isProfilePage ? 'text-primary' : ''}`} href="/profile">
          <span style={isProfilePage ? filled : undefined} className="material-symbols-outlined mb-1">person</span>
          <span className="font-caption text-[10px] font-semibold">Profile</span>
        </Link>
      </nav>
    </>
  )
}

export default Sidebar