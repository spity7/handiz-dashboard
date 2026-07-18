const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

let scriptLoadPromise = null
let gsiInitialized = false

export function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) {
    return Promise.resolve()
  }

  if (scriptLoadPromise) {
    return scriptLoadPromise
  }

  scriptLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src^="${GSI_SCRIPT_SRC}"]`)

    if (existing) {
      if (window.google?.accounts?.id) {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = GSI_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'))
    document.body.appendChild(script)
  })

  return scriptLoadPromise
}

export function ensureGoogleIdentityInitialized(clientId, callback) {
  if (!window.google?.accounts?.id) {
    return false
  }

  if (!gsiInitialized) {
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback,
    })
    gsiInitialized = true
  }

  return true
}
