const INITIAL_STATE = {
  open: false,
  message: '',
}

let state = { ...INITIAL_STATE }
const listeners = new Set()

const notify = () => {
  listeners.forEach((listener) => listener(state))
}

export const getAsyncActionOverlayState = () => state

export const subscribeAsyncActionOverlay = (listener) => {
  listeners.add(listener)
  listener(state)
  return () => listeners.delete(listener)
}

export const hideAsyncActionOverlay = () => {
  state = { ...INITIAL_STATE }
  notify()
}

export const showAsyncActionLoading = (message) => {
  state = { open: true, message }
  notify()
}
