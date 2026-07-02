// Bridge for global mutation error handling.
// QueryClient is created at module scope in _layout.tsx, but ToastProvider
// mounts later. This module bridges the two so QueryClient's onError can
// send errors to the toast system once it's available.

let toastErrorHandler: ((message: string) => void) | null = null;

export function setToastErrorHandler(fn: (message: string) => void) {
  toastErrorHandler = fn;
}

export function getToastErrorHandler(): ((message: string) => void) | null {
  return toastErrorHandler;
}
