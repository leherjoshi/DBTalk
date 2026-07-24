interface Suggestion {
  category: string
  icon: string
  queries: string[]
}

interface Props {
  onSelect: (query: string) => void
}

const SUGGESTIONS: Suggestion[] = [
  {
    category: 'Revenue Analysis',
    icon: '💰',
    queries: [
      'What are the top 5 product categories by revenue?',
      'Show me monthly revenue trends for the last year',
      'Which sellers generated the most revenue?',
      'What is the average order value by state?',
    ],
  },
  {
    category: 'Customer Insights',
    icon: '👥',
    queries: [
      'Which states have the most customers?',
      'What is the customer distribution by city?',
      'Show me the top 10 customers by total spend',
      'How many active customers do we have?',
    ],
  },
  {
    category: 'Product Analysis',
    icon: '📦',
    queries: [
      'What are the most popular product categories?',
      'Which products have the most photos?',
      'Show me products with the highest sales volume',
      'What is the average price per category?',
    ],
  },
  {
    category: 'Order Analytics',
    icon: '📊',
    queries: [
      'How many orders were delivered vs canceled?',
      'What is the order status distribution?',
      'Show me orders by delivery status over time',
      'Which months had the highest order volume?',
    ],
  },
  {
    category: 'Seller Performance',
    icon: '🏪',
    queries: [
      'Which sellers have the highest average order value?',
      'What is the seller distribution by state?',
      'Show me top sellers by number of orders',
      'Which sellers have the best delivery times?',
    ],
  },
  {
    category: 'Reviews & NPS',
    icon: '⭐',
    queries: [
      'What is the average review score by category?',
      'Which products have the lowest review scores?',
      'Show me the distribution of review scores',
      'What percentage of reviews are 5 stars?',
    ],
  },
]

export default function QuerySuggestions({ onSelect }: Props) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '16px',
      padding: '20px',
    }}>
      {SUGGESTIONS.map((section) => (
        <div
          key={section.category}
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '12px',
            background: 'var(--bg-tertiary)',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <span style={{ fontSize: '16px' }}>{section.icon}</span>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--accent-cyan)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {section.category}
            </span>
          </div>

          {/* Queries */}
          <div style={{ padding: '8px' }}>
            {section.queries.map((query, idx) => (
              <button
                key={idx}
                onClick={() => onSelect(query)}
                style={{
                  width: '100%',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  padding: '10px 12px',
                  marginBottom: '6px',
                  color: 'var(--text-primary)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  textAlign: 'left',
                  lineHeight: 1.4,
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-primary)'
                  e.currentTarget.style.borderColor = 'var(--accent-cyan)'
                  e.currentTarget.style.color = 'var(--accent-cyan)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--bg-tertiary)'
                  e.currentTarget.style.borderColor = 'var(--border-color)'
                  e.currentTarget.style.color = 'var(--text-primary)'
                }}
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
