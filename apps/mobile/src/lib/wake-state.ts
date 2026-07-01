type WakeGateCallback = () => void

let callback: WakeGateCallback | null = null

export const wakeGate = {
  register(cb: WakeGateCallback) {
    callback = cb
  },
  unregister() {
    callback = null
  },
  trigger() {
    callback?.()
  },
}
