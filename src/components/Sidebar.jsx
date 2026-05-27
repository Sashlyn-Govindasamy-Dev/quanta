import { useState } from 'react'
import { getTopicColor } from '../config.js'
import { isDue } from '../srs.js'

export function Sidebar({ notes, activeId, onSelect, onNew }) {
  const [query, setQuery] = useState('')

  const topics = [...new Set(notes.map(n => n.topic))].sort()
  const filtered = notes.filter(n =>
    !query || n.title.toLowerCase().includes(query.toLowerCase()) ||
    n.topic.toLowerCase().includes(query.toLowerCase())
  )
  const grouped = topics.reduce((acc, t) => {
    acc[t] = filtered.filter(n => n.topic === t)
    return acc
  }, {})

  return (
    <aside style={{
      width: 230, minWidth: 230, borderRight: '0.5px solid var(--border)',
      background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column',
      height: '100%', overflow: 'hidden'
    }}>
      <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'var(--bg-primary)', border: '0.5px solid var(--border)',
          borderRadius: 'var(--radius-md)', padding: '7px 10px'
        }}>
          <i className="ti ti-search" aria-hidden="true" style={{ fontSize: 14, color: 'var(--text-tertiary)' }} />
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search notes..."
            style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: 13, flex: 1 }}
          />
          {query && <button onClick={() => setQuery('')} style={{ border: 'none', background: 'transparent', padding: 0, color: 'var(--text-tertiary)', fontSize: 14 }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {topics.map(topic => {
          const topicNotes = grouped[topic]
          if (!topicNotes?.length) return null
          const color = getTopicColor(topic)
          return (
            <div key={topic} style={{ marginBottom: 4 }}>
              <div style={{
                fontSize: 10, fontWeight: 500, color: 'var(--text-tertiary)',
                letterSpacing: '0.07em', textTransform: 'uppercase',
                padding: '8px 8px 4px'
              }}>{topic}</div>
              {topicNotes.map(note => (
                <NoteItem
                  key={note.id} note={note} color={color}
                  active={note.id === activeId}
                  onSelect={() => onSelect(note.id)}
                />
              ))}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 16, color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }}>
            No notes found
          </div>
        )}
      </div>

      <div style={{ padding: '8px 10px', borderTop: '0.5px solid var(--border)' }}>
        <button onClick={onNew} style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          padding: '8px 10px', border: '0.5px dashed var(--border-mid)',
          borderRadius: 'var(--radius-md)', background: 'transparent',
          fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500
        }}>
          <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 14 }} />
          New note
        </button>
      </div>
    </aside>
  )
}

function NoteItem({ note, color, active, onSelect }) {
  const due = isDue(note)
  return (
    <button onClick={onSelect} style={{
      display: 'flex', alignItems: 'flex-start', gap: 9, width: '100%', textAlign: 'left',
      padding: '7px 10px', borderRadius: 'var(--radius-md)',
      background: active ? 'var(--bg-primary)' : 'transparent',
      border: active ? '0.5px solid var(--border)' : '0.5px solid transparent',
      color: 'inherit',
    }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', background: color.dot,
        marginTop: 5, flexShrink: 0
      }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4, fontWeight: active ? 500 : 400 }}>
          {note.title}
        </div>
        {due && <div style={{ fontSize: 10, color: 'var(--amber-400)', marginTop: 2, fontWeight: 500 }}>
          ⚡ due for review
        </div>}
      </div>
    </button>
  )
}
