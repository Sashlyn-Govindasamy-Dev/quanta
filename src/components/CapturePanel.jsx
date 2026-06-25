import { useState } from 'react'
import { getTopicColor } from '../config.js'
import { showToast } from './Toast.jsx'

export function CapturePanel({ notes, sourceConfig, onAddNote, onAddCapture, onSelectNote, onSwitchTab }) {
  const [text, setText] = useState('')
  const [source, setSource] = useState('thinking')
  const [topicMode, setTopicMode] = useState('existing')
  const [selectedTopic, setSelectedTopic] = useState('')
  const [newTopicName, setNewTopicName] = useState('')

  const topics = [...new Set(notes.map(n => n.topic))].sort()
  const finalTopic = topicMode === 'new' ? newTopicName.trim() : selectedTopic || topics[0]

  const allCaptures = notes.flatMap(n =>
    n.captures.map(c => ({ text: c, note: n, color: getTopicColor(n.topic) }))
  ).reverse()

  const handleSave = async () => {
    if (!text.trim() || !finalTopic) return

    if (topicMode === 'new' && newTopicName.trim()) {
      await onAddNote({
        title: text.trim().slice(0, 80),
        body: text.trim(),
        topic: newTopicName.trim(),
        source,
        captures: [text.trim()]
      })
      showToast('New note created from insight!')
    } else {
      const note = notes.find(n => n.topic === finalTopic)
      if (note) {
        await onAddCapture(note.id, text.trim())
        showToast('Insight added!')
      }
    }

    setText('')
    setNewTopicName('')
  }

  return (
    <div style={{ maxWidth: 680, padding: '24px 28px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Capture an insight</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 24 }}>
        When something clicks — write it down immediately in your own words. No structure needed.
      </p>

      <div style={{
        borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--purple-200)',
        background: 'var(--purple-50)', padding: '16px 18px', marginBottom: 24
      }}>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write the connection you just made... e.g. 'Identity resolution is just deduplication — it figures out two records are the same person by matching on name + phone.'"
          rows={4}
          style={{
            width: '100%', border: 'none', background: 'transparent',
            fontSize: 14, lineHeight: 1.8, outline: 'none', resize: 'none',
            color: 'var(--purple-900)', fontFamily: 'inherit'
          }}
        />

        <div style={{ borderTop: '0.5px solid var(--purple-200)', marginTop: 12, paddingTop: 12 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
            {Object.entries(sourceConfig).map(([key, cfg]) => (
              <button key={key} onClick={() => setSource(key)} style={{
                padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 500,
                border: source === key ? '0.5px solid var(--purple-400)' : '0.5px solid var(--purple-200)',
                background: source === key ? 'var(--purple-100)' : 'transparent',
                color: source === key ? 'var(--purple-800)' : 'var(--purple-400)',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5
              }}>
                <i className={`ti ${cfg.icon}`} aria-hidden="true" style={{ fontSize: 11 }} />
                {cfg.label}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <button onClick={() => setTopicMode('existing')} style={{
                padding: '5px 12px', borderRadius: 'var(--radius-md)', fontSize: 12,
                border: topicMode === 'existing' ? '0.5px solid var(--purple-400)' : '0.5px solid var(--purple-200)',
                background: topicMode === 'existing' ? 'var(--purple-100)' : 'transparent',
                color: topicMode === 'existing' ? 'var(--purple-800)' : 'var(--purple-400)',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
              }}>Existing topic</button>
              <button onClick={() => setTopicMode('new')} style={{
                padding: '5px 12px', borderRadius: 'var(--radius-md)', fontSize: 12,
                border: topicMode === 'new' ? '0.5px solid var(--purple-400)' : '0.5px solid var(--purple-200)',
                background: topicMode === 'new' ? 'var(--purple-100)' : 'transparent',
                color: topicMode === 'new' ? 'var(--purple-800)' : 'var(--purple-400)',
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
              }}>New topic</button>
            </div>

            {topicMode === 'existing' ? (
              <select value={selectedTopic || topics[0]} onChange={e => setSelectedTopic(e.target.value)} style={{
                border: '0.5px solid var(--purple-200)', borderRadius: 'var(--radius-md)', background: 'transparent',
                padding: '5px 10px', fontSize: 12, color: 'var(--purple-800)', cursor: 'pointer', fontFamily: 'inherit'
              }}>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <input value={newTopicName} onChange={e => setNewTopicName(e.target.value)}
                placeholder="New topic name..."
                style={{
                  border: '0.5px solid var(--purple-200)', borderRadius: 'var(--radius-md)',
                  padding: '5px 10px', fontSize: 12, color: 'var(--purple-800)', background: 'transparent',
                  outline: 'none', fontFamily: 'inherit'
                }}
              />
            )}

            <button onClick={handleSave} disabled={!text.trim() || !finalTopic} style={{
              marginLeft: 'auto', padding: '6px 18px', borderRadius: 'var(--radius-md)',
              background: !text.trim() || !finalTopic ? 'var(--border)' : 'var(--purple-600)',
              color: '#fff', border: 'none', fontSize: 13, fontWeight: 500,
              cursor: !text.trim() || !finalTopic ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
            }}>Save insight</button>
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
          All captures ({allCaptures.length})
        </div>
        {allCaptures.length === 0 && (
          <div style={{ color: 'var(--text-tertiary)', fontSize: 14, padding: '20px 0' }}>
            No insights captured yet. When something clicks, write it here.
          </div>
        )}
        {allCaptures.map((c, i) => (
          <div key={i} onClick={() => { onSelectNote(c.note.id); onSwitchTab('notes') }} style={{
            padding: '11px 14px', marginBottom: 8, cursor: 'pointer',
            borderLeft: `3px solid ${c.color.dot}`,
            background: c.color.bg + '40',
            borderRadius: '0 var(--radius-md) var(--radius-md) 0',
            fontSize: 13, lineHeight: 1.75, color: 'var(--text-primary)'
          }}>
            <div>{c.text}</div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
              {c.note.topic} · {c.note.title}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
