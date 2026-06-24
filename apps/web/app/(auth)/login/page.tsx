import type { Metadata } from 'next'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Log in to your Reelstack account and curate your film gallery.',
}

export default function LoginPage() {
  return <LoginForm />
}
