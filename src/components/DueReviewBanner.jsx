import { useState } from 'react'
import { isDue } from '../srs.js'

export function DueReviewBanner({ notes, onGoToReview, onDismiss }) {
  const due = notes.filter(isDue)
  if (!due.length) return null

  return (
    <div style={{
      background: 'var(--amber-50)', borderBottom: '0.5px solid var(--amber-100)',
      padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 12,
      animation: 'slideDown 0.3s ease'
    }}>
      <style>{`@keyframes slideDown { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:none } }`}</style>
      <span style={{ fontSize: 14 }}>⚡</span>
      <span style={{ fontSize: 13, color: 'var(--amber-800)', flex: 1 }}>
        <strong>{due.length} concept{due.length !== 1 ? 's' : ''}</strong> due for review —&nbsp;
        {due.slice(0, 2).map(n => n.title).join(', ')}{due.length > 2 ? ` and ${due.length - 2} more` : ''}
      </span>
      <button onClick={onGoToReview} style={{
        padding: '5px 14px', background: 'var(--amber-400)', color: '#fff',
        border: 'none', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500
      }}>Review now</button>
      <button onClick={onDismiss} style={{
        border: 'none', background: 'transparent', color: 'var(--amber-400)', fontSize: 16, cursor: 'pointer', padding: 0
      }}>
        <i className="ti ti-x" aria-hidden="true" />
      </button>
    </div>
  )
}
