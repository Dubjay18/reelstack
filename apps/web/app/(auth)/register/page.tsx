import type { Metadata } from 'next'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = {
  title: 'Create Account',
  description: 'Join Reelstack and build your public film taste profile.',
}

export default function RegisterPage() {
  return <RegisterForm />
}
