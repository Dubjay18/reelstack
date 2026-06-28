// TASK-042 — Authenticated shell layout
// Wraps all /dashboard, /lists, /search routes.
// Includes sidebar (desktop) + bottom tab bar (mobile).
// TODO: add AuthProvider check and redirect to /login if no token.

import Sidebar from "@/components/sidebar";



export default function AppLayout({ children }: { children: React.ReactNode }) {
 
  return (
    <div className="flex min-h-dvh bg-zinc-950">
  <Sidebar/>
      <main className="flex-1 p-6">{children}</main>
      {/* TODO TASK-059: BottomTabBar (mobile) */}
    </div>
  )
}
