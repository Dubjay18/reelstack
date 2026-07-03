// Auth shell layout — suppresses the main site nav.
// Both /login and /register share this centered, full-screen wrapper.

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh flex items-center justify-center p-md">
      {children}
    </div>
  )
}
