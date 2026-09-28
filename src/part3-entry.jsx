import { installSeo } from './seo'

const part3Paths = ['/ask', '/pricing', '/list-your-business', '/login', '/admin']

function showNewsletterToast(text) {
  document.querySelector('.part3-toast')?.remove()
  const toast = document.createElement('div')
  toast.className = 'part3-toast'
  toast.textContent = text
  document.body.appendChild(toast)
  window.setTimeout(() => toast.remove(), 4200)
}

function bindHomepageForms() {
  document.addEventListener('submit', async (event) => {
    const form = event.target
    if (!(form instanceof HTMLFormElement)) return
    if (form.matches('.hero-search')) {
      event.preventDefault()
      event.stopPropagation()
      const query = form.querySelector('input')?.value?.trim()
      window.location.href = query ? `/ask?q=${encodeURIComponent(query)}` : '/ask'
      return
    }
    if (!form.matches('.newsletter-card form')) return
    event.preventDefault()
    event.stopPropagation()
    const input = form.querySelector('input')
    try {
      const { subscribeToUpNorth } = await import('./api/subscribe.js')
      const result = await subscribeToUpNorth(input?.value || '')
      showNewsletterToast(result.message)
      if (input) input.value = ''
    } catch (error) {
      showNewsletterToast(error.message)
    }
  }, true)
}

if (window.location.pathname === '/login' || window.location.pathname === '/admin') {
  installSeo()
  import('./admin-panel-secure.jsx')
} else if (part3Paths.includes(window.location.pathname)) {
  import('./part3-app.jsx')
} else {
  bindHomepageForms()
  import('./main.jsx').then(() => installSeo())
}
