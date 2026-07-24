import { useState } from 'react'

interface Props {
  results: Record<string, unknown>[]
  sql: string
}

export default function ExportButton({ results, sql }: Props) {
  const [showMenu, setShowMenu] = useState(false)

  if (!results || results.length === 0) return null

  const exportCSV = () => {
    const columns = Object.keys(results[0])
    const csvContent = [
      columns.join(','),
      ...results.map(row =>
        columns.map(col => {
          const val = row[col]
          if (val === null || val === undefined) return ''
          const str = String(val)
          return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
        }).join(',')
      )
    ].join('\n')

    download(csvContent, 'query-results.csv', 'text/csv')
    setShowMenu(false)
  }

  const exportJSON = () => {
    const jsonContent = JSON.stringify(results, null, 2)
    download(jsonContent, 'query-results.json', 'application/json')
    setShowMenu(false)
  }

  const exportSQL = () => {
    download(sql, 'query.sql', 'text/plain')
    setShowMenu(false)
  }

  const copyToClipboard = () => {
    const columns = Object.keys(results[0])
    const text = results.map(row =>
      columns.map(col => String(row[col] ?? '')).join('\t')
    ).join('\n')
    
    navigator.clipboard.writeText(text).then(() => {
      setShowMenu(false)
    })
  }

  const download = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowMenu(!showMenu)}
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
      >
        <span>📥</span>
        <span>Export</span>
      </button>

      {showMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 10,
            }}
            onClick={() => setShowMenu(false)}
          />
          <div
            style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '4px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              overflow: 'hidden',
              zIndex: 11,
              minWidth: '150px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
          >
            {[
              { label: 'Export CSV', icon: '📄', action: exportCSV },
              { label: 'Export JSON', icon: '📋', action: exportJSON },
              { label: 'Copy to Clipboard', icon: '📑', action: copyToClipboard },
              { label: 'Download SQL', icon: '💾', action: exportSQL },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.action}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  padding: '10px 12px',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  borderBottom: '1px solid var(--border-color)',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.color = 'var(--accent-cyan)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
