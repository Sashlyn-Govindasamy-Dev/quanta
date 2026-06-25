import { useState } from 'react'

export function NewNoteModal({ onSave, onClose, existingTopics, sourceConfig }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [topic, setTopic] = useState(existingTopics[0] || '')
  const [newTopic, setNewTopic] = useState('')
  const [source, setSource] = useState('trailhead')
  const [useNewTopic, setUseNewTopic] = useState(!existingTopics.length)

  const finalTopic = useNewTopic ? newTopic.trim() : topic

  const handleSave = () => {
    if (!title.trim() || !finalTopic || !body.trim()) return
    onSave({ title: title.trim(), body: body.trim(), topic: finalTopic, source })
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
    }}>
      <div style={{
        background: 'var(--bg-primary)', borderRadius: 'var(--radius-xl)',
        border: '0.5px solid var(--border)', width: '100%', maxWidth: 580,
        boxShadow: 'var(--shadow-md)', padding: 28
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 500 }}>New note</h2>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, color: 'var(--text-tertiary)', cursor: 'pointer' }}>
            <i className="ti ti-x" aria-hidden="true" />
          </button>
        </div>

        <Field label="Title">
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What concept is this note about?"
            style={inputStyle} autoFocus
          />
        </Field>

        <Field label="Topic">
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <button onClick={() => setUseNewTopic(false)} style={toggleBtn(!useNewTopic)}>Existing topic</button>
            <button onClick={() => setUseNewTopic(true)} style={toggleBtn(useNewTopic)}>New topic</button>
          </div>
          {useNewTopic ? (
            <input value={newTopic} onChange={e => setNewTopic(e.target.value)}
              placeholder="Name this topic..." style={inputStyle} />
          ) : (
            <select value={topic} onChange={e => setTopic(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {existingTopics.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </Field>

        <Field label="Source">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(sourceConfig).map(([key, cfg]) => (
              <button key={key} onClick={() => setSource(key)} style={{
                ...toggleBtn(source === key),
                display: 'flex', alignItems: 'center', gap: 6
              }}>
                <i className={`ti ${cfg.icon}`} aria-hidden="true" style={{ fontSize: 13 }} />
                {cfg.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Note body">
          <textarea value={body} onChange={e => setBody(e.target.value)}
            placeholder="Write what you understand about this concept in your own words..."
            rows={6} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.8 }}
          />
        </Field>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={{
            padding: '8px 20px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)',
            background: 'transparent', fontSize: 13, color: 'var(--text-secondary)'
          }}>Cancel</button>
          <button onClick={handleSave} disabled={!title.trim() || !finalTopic || !body.trim()} style={{
            padding: '8px 20px', background: !title.trim() || !finalTopic || !body.trim() ? 'var(--border)' : 'var(--purple-600)',
            color: '#fff', border: 'none', borderRadius: 'var(--radius-md)',
            fontSize: 13, fontWeight: 500,
            cursor: !title.trim() || !finalTopic || !body.trim() ? 'not-allowed' : 'pointer'
          }}>Save note</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle = {
  width: '100%', border: '0.5px solid var(--border-mid)', borderRadius: 'var(--radius-md)',
  padding: '9px 12px', fontSize: 14, outline: 'none', background: 'var(--bg-secondary)',
  color: 'var(--text-primary)', fontFamily: 'inherit'
}

const toggleBtn = (active) => ({
  padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500,
  border: active ? '0.5px solid var(--purple-400)' : '0.5px solid var(--border)',
  background: active ? 'var(--purple-50)' : 'transparent',
  color: active ? 'var(--purple-800)' : 'var(--text-secondary)',
  cursor: 'pointer', fontFamily: 'inherit'
})
