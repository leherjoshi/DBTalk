import { useState, useEffect } from 'react'

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    if (stored) {
      setIsDark(stored === 'dark')
      applyTheme(stored === 'dark')
    }
  }, [])

  const applyTheme = (dark: boolean) => {
    const root = document.documentElement
    if (dark) {
      root.style.setProperty('--bg-primary', '#0d1117')
      root.style.setProperty('--bg-secondary', '#161b22')
      root.style.setProperty('--bg-tertiary', '#21262d')
      root.style.setProperty('--border-color', '#30363d')
      root.style.setProperty('--text-primary', '#e6edf3')
      root.style.setProperty('--text-secondary', '#8b949e')
    } else {
      root.style.setProperty('--bg-primary', '#ffffff')
      root.style.setProperty('--bg-secondary', '#f6f8fa')
      root.style.setProperty('--bg-tertiary', '#eaeef2')
      root.style.setProperty('--border-color', '#d0d7de')
      root.style.setProperty('--text-primary', '#1f2328')
      root.style.setProperty('--text-secondary', '#656d76')
    }
  }

  const toggle = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
  }

  return (
    <button
      onClick={toggle}
      style={{
        background: 'var(--bg-tertiary)',
        border: '1px solid var(--border-color)',
        borderRadius: '6px',
        padding: '6px 12px',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontFamily: 'var(--font-mono)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--bg-secondary)'
        e.currentTarget.style.borderColor = 'var(--accent-cyan)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg-tertiary)'
        e.currentTarget.style.borderColor = 'var(--border-color)'
      }}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      <span>{isDark ? '☀️' : '🌙'}</span>
      <span>{isDark ? 'Light' : 'Dark'}</span>
    </button>
  )
}
