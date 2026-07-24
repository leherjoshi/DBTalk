import { useState, useEffect } from 'react'

interface HistoryItem {
  id: string
  question: string
  sql: string
  timestamp: Date
  favorite: boolean
}

interface Props {
  onSelectQuery: (question: string) => void
}

const STORAGE_KEY = 'text-to-sql-history'
const MAX_HISTORY = 50

export default function QueryHistory({ onSelectQuery }: Props) {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'favorites'>('all')

  useEffect(() => {
    loadHistory()
    // Listen for new queries
    const handler = (e: CustomEvent) => {
      addToHistory(e.detail.question, e.detail.sql)
    }
    window.addEventListener('query-executed' as any, handler)
    return () => window.removeEventListener('query-executed' as any, handler)
  }, [])

  const loadHistory = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setHistory(parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })))
      }
    } catch (err) {
      console.error('Failed to load history:', err)
    }
  }

  const addToHistory = (question: string, sql: string) => {
    const newItem: HistoryItem = {
      id: crypto.randomUUID(),
      question,
      sql,
      timestamp: new Date(),
      favorite: false,
    }
    const updated = [newItem, ...history].slice(0, MAX_HISTORY)
    setHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = history.map(item =>
      item.id === id ? { ...item, favorite: !item.favorite } : item
    )
    setHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const updated = history.filter(item => item.id !== id)
    setHistory(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const clearAll = () => {
    if (confirm('Clear all query history?')) {
      setHistory([])
      localStorage.removeItem(STORAGE_KEY)
    }
  }

  const filtered = filter === 'favorites'
    ? history.filter(item => item.favorite)
    : history

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
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
        <span>🕐</span>
        <span>History</span>
        {history.length > 0 && (
          <span style={{
            background: 'var(--accent-cyan)',
            color: '#0d1117',
            borderRadius: '10px',
            padding: '2px 6px',
            fontSize: '10px',
            fontWeight: 600,
          }}>
            {history.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 100,
            }}
            onClick={() => setIsOpen(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '8px',
              width: '600px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 101,
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--accent-cyan)',
              }}>
                Query History
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                ×
              </button>
            </div>

            {/* Filter tabs */}
            <div style={{
              display: 'flex',
              gap: '8px',
              padding: '12px 16px',
              borderBottom: '1px solid var(--border-color)',
            }}>
              {[
                { key: 'all', label: 'All', count: history.length },
                { key: 'favorites', label: 'Favorites', count: history.filter(i => i.favorite).length },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key as any)}
                  style={{
                    background: filter === tab.key ? 'var(--bg-tertiary)' : 'transparent',
                    border: '1px solid',
                    borderColor: filter === tab.key ? 'var(--accent-cyan)' : 'var(--border-color)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    color: filter === tab.key ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.15s',
                  }}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
              <div style={{ flex: 1 }} />
              {history.length > 0 && (
                <button
                  onClick={clearAll}
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--accent-red)',
                    borderRadius: '4px',
                    padding: '6px 12px',
                    color: 'var(--accent-red)',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.15s',
                  }}
                >
                  Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '8px',
            }}>
              {filtered.length === 0 && (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                }}>
                  {filter === 'favorites' ? 'No favorites yet' : 'No queries yet'}
                </div>
              )}
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectQuery(item.question)
                    setIsOpen(false)
                  }}
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '12px',
                    marginBottom: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-cyan)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '8px',
                  }}>
                    <div style={{
                      flex: 1,
                      fontFamily: 'var(--font-mono)',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      lineHeight: 1.5,
                    }}>
                      {item.question}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                      <button
                        onClick={(e) => toggleFavorite(item.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          fontSize: '16px',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title={item.favorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        {item.favorite ? '⭐' : '☆'}
                      </button>
                      <button
                        onClick={(e) => deleteItem(item.id, e)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--accent-red)',
                          fontSize: '14px',
                          cursor: 'pointer',
                          padding: '2px',
                        }}
                        title="Delete"
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    color: 'var(--text-secondary)',
                  }}>
                    {item.timestamp.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  )
}
