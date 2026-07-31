export function forceLightTheme() {
  if (typeof window === 'undefined') return

  const root = document.documentElement
  root.classList.remove('dark')
  root.classList.add('light')
}
