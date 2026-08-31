export function initGoogleAnalytics() {
  const gaId = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (!gaId || typeof window === 'undefined') {
    return
  }

  if (document.getElementById('google-analytics-loader')) {
    return
  }

  const loader = document.createElement('script')
  loader.id = 'google-analytics-loader'
  loader.async = true
  loader.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`
  document.head.appendChild(loader)

  const inline = document.createElement('script')
  inline.id = 'google-analytics'
  inline.textContent = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${gaId}');
  `
  document.head.appendChild(inline)
}
