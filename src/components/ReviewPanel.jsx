import { useState } from 'react'
import { getTopicColor, SOURCE_CONFIG } from '../config.js'
import { isDue, getRetentionPercent } from '../srs.js'
import { showToast } from './Toast.jsx'

export function ReviewPanel({ notes, onRate }) {
  const due = notes.filter(isDue)
  const [revealed, setRevealed] = useState({})
  const [done, setDone] = useState({})

  const handleRate = (id, quality) => {
    onRate(id, quality)
    setDone(prev => ({ ...prev, [id]: true }))
    const labels = ['Forgotten', 'Hard', 'Ok', 'Easy']
    showToast(`Rated: ${labels[quality]} — note rescheduled`)
  }

  const pending = due.filter(n => !done[n.id])
  const completed = due.filter(n => done[n.id])

  return (
    <div style={{ maxWidth: 680, padding: '24px 28px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Review queue</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          {pending.length > 0
            ? `${pending.length} concept${pending.length !== 1 ? 's' : ''} due — try to recall before revealing the answer.`
            : done && Object.keys(done).length > 0
              ? 'All done for now. Come back tomorrow to keep your retention high.'
              : 'Nothing due right now. Your knowledge is fresh!'}
        </p>
      </div>

      {pending.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '60px 20px',
          color: 'var(--text-tertiary)', fontSize: 14
        }}>
          <i className="ti ti-check" aria-hidden="true" style={{ fontSize: 40, display: 'block', marginBottom: 12, color: 'var(--teal-400)' }} />
          {Object.keys(done).length > 0 ? `${Object.keys(done).length} note${Object.keys(done).length !== 1 ? 's' : ''} reviewed. Well done!` : 'Nothing due today.'}
        </div>
      )}

      {pending.map(note => {
        const color = getTopicColor(note.topic)
        const src = SOURCE_CONFIG[note.source] || SOURCE_CONFIG.thinking
        const retention = getRetentionPercent(note)
        const isRevealed = !!revealed[note.id]

        return (
          <div key={note.id} style={{
            borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)',
            background: 'var(--bg-primary)', padding: '18px 20px', marginBottom: 14,
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
                background: color.bg, color: color.text
              }}>{note.topic}</span>
              <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>~{retention}% retained</span>
            </div>

            <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 14, lineHeight: 1.5 }}>
              Without looking — what do you know about: <em style={{ color: 'var(--purple-600)' }}>{note.title}</em>?
            </div>

            {!isRevealed ? (
              <button onClick={() => setRevealed(prev => ({ ...prev, [note.id]: true }))} style={{
                padding: '8px 18px', border: '0.5px solid var(--border-mid)',
                borderRadius: 'var(--radius-md)', background: 'transparent',
                fontSize: 13, color: 'var(--text-secondary)'
              }}>Reveal answer</button>
            ) : (
              <div>
                <div style={{
                  padding: '14px 16px', background: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-md)', fontSize: 13, lineHeight: 1.8,
                  color: 'var(--text-primary)', marginBottom: 14,
                  borderLeft: `3px solid ${color.dot}`
                }}>
                  {note.body.split('\n\n')[0]}
                </div>

                <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 8, fontWeight: 500 }}>
                  How well did you recall it?
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {[
                    { label: 'Forgot', quality: 0, bg: 'var(--coral-50)', border: 'var(--coral-100)', text: 'var(--coral-800)' },
                    { label: 'Struggled', quality: 1, bg: 'var(--amber-50)', border: 'var(--amber-100)', text: 'var(--amber-800)' },
                    { label: 'Got it', quality: 2, bg: 'var(--blue-50)', border: 'var(--blue-200)', text: 'var(--blue-800)' },
                    { label: 'Easy', quality: 3, bg: 'var(--teal-50)', border: 'var(--teal-200)', text: 'var(--teal-800)' },
                  ].map(r => (
                    <button key={r.quality} onClick={() => handleRate(note.id, r.quality)} style={{
                      padding: '8px 4px', borderRadius: 'var(--radius-md)',
                      border: `0.5px solid ${r.border}`, background: r.bg,
                      fontSize: 12, fontWeight: 500, color: r.text
                    }}>{r.label}</button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}

      {completed.length > 0 && (
        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '0.5px solid var(--border)' }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            Reviewed this session
          </div>
          {completed.map(note => (
            <div key={note.id} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
              borderRadius: 'var(--radius-md)', background: 'var(--bg-secondary)', marginBottom: 6,
              opacity: 0.7, fontSize: 13
            }}>
              <i className="ti ti-check" aria-hidden="true" style={{ color: 'var(--teal-400)' }} />
              {note.title}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
