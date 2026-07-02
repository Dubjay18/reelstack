'use client'

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState('')
  const [toastType, setToastType] = useState<ToastType>('info')
  const [visible, setVisible] = useState(false)

  const showToast = useCallback((msg: string, type: ToastType = 'info') => {
    setMessage(msg)
    setToastType(type)
    setVisible(true)
  }, [])

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(timer)
  }, [visible])

  const borderColor =
    toastType === 'error'
      ? 'border-red-500/50'
      : toastType === 'success'
        ? 'border-green-500/50'
        : 'border-outline-variant'

  const icon =
    toastType === 'error' ? 'error' : toastType === 'success' ? 'check_circle' : 'info'

  const iconColor =
    toastType === 'error'
      ? 'text-red-400'
      : toastType === 'success'
        ? 'text-green-400'
        : 'text-primary'

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {visible && (
        <div
          className={`fixed bottom-lg right-lg bg-surface-container border ${borderColor} text-on-background px-md py-sm rounded-xl shadow-modal z-50 flex items-center gap-xs animate-in fade-in slide-in-from-bottom-4 duration-300`}
        >
          <span className={`material-symbols-outlined text-[20px] ${iconColor}`}>{icon}</span>
          <span className="font-body-sm text-body-sm">{message}</span>
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
