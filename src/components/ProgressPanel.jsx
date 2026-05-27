import { getTopicColor, SOURCE_CONFIG } from '../config.js'
import { getRetentionPercent, isDue } from '../srs.js'
import { exportData, importData } from '../db.js'
import { showToast } from './Toast.jsx'

export function ProgressPanel({ notes, onReload }) {
  const total = notes.length
  const due = notes.filter(isDue).length
  const reviewed = notes.filter(n => n.lastReview).length
  const totalCaptures = notes.reduce((s, n) => s + n.captures.length, 0)
  const totalConnections = notes.reduce((s, n) => s + n.connections.length, 0) / 2
  const avgRetention = total ? Math.round(notes.reduce((s, n) => s + getRetentionPercent(n), 0) / total) : 0
  const topics = [...new Set(notes.map(n => n.topic))].sort()

  const sourceCounts = notes.reduce((acc, n) => {
    acc[n.source] = (acc[n.source] || 0) + 1; return acc
  }, {})

  const handleExport = async () => {
    const json = await exportData()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `quanta-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click(); URL.revokeObjectURL(url)
    showToast('Backup downloaded!')
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const text = await file.text()
      try {
        const count = await importData(text)
        await onReload()
        showToast(`Imported ${count} notes!`, 'success')
      } catch (err) {
        showToast('Import failed — invalid file', 'error')
      }
    }
    input.click()
  }

  return (
    <div style={{ maxWidth: 680, padding: '24px 28px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 24 }}>Progress</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total notes', value: total, icon: 'ti-notes' },
          { label: 'Due today', value: due, icon: 'ti-clock', accent: due > 0 ? 'var(--amber-400)' : undefined },
          { label: 'Avg retention', value: `${avgRetention}%`, icon: 'ti-brain' },
          { label: 'Reviewed', value: reviewed, icon: 'ti-check' },
          { label: 'Insights captured', value: totalCaptures, icon: 'ti-bulb' },
          { label: 'Connections', value: Math.floor(totalConnections), icon: 'ti-vector-triangle' },
        ].map(s => (
          <div key={s.label} style={{
            background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)',
            padding: '14px 16px', border: '0.5px solid var(--border)'
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 5 }}>
              <i className={`ti ${s.icon}`} aria-hidden="true" style={{ fontSize: 13 }} />
              {s.label}
            </div>
            <div style={{ fontSize: 24, fontWeight: 500, color: s.accent || 'var(--text-primary)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Retention by topic */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Retention by topic
        </div>
        {topics.map(topic => {
          const topicNotes = notes.filter(n => n.topic === topic)
          const avg = Math.round(topicNotes.reduce((s, n) => s + getRetentionPercent(n), 0) / topicNotes.length)
          const color = getTopicColor(topic)
          const topicDue = topicNotes.filter(isDue).length
          return (
            <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 120, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color.dot }} />
                {topic}
              </div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <div style={{ width: `${avg}%`, height: '100%', borderRadius: 4, background: color.dot, transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 32, textAlign: 'right' }}>{avg}%</div>
              {topicDue > 0 && <div style={{ fontSize: 10, color: 'var(--amber-400)', fontWeight: 500 }}>⚡{topicDue}</div>}
            </div>
          )
        })}
      </div>

      {/* Sources */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Learning sources
        </div>
        {Object.entries(sourceCounts).map(([src, count]) => {
          const cfg = SOURCE_CONFIG[src] || SOURCE_CONFIG.thinking
          return (
            <div key={src} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
              <div style={{ width: 120, fontSize: 12, color: 'var(--text-secondary)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className={`ti ${cfg.icon}`} aria-hidden="true" style={{ fontSize: 13 }} />
                {cfg.label}
              </div>
              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--bg-secondary)', overflow: 'hidden' }}>
                <div style={{ width: `${Math.round(count / total * 100)}%`, height: '100%', borderRadius: 4, background: 'var(--purple-400)', transition: 'width 0.5s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 20, textAlign: 'right' }}>{count}</div>
            </div>
          )
        })}
      </div>

      {/* Data management */}
      <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 14 }}>
          Data management
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={handleExport} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
            border: '0.5px solid var(--border-mid)', borderRadius: 'var(--radius-md)',
            background: 'transparent', fontSize: 13, color: 'var(--text-secondary)'
          }}>
            <i className="ti ti-download" aria-hidden="true" />
            Export backup
          </button>
          <button onClick={handleImport} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
            border: '0.5px solid var(--border-mid)', borderRadius: 'var(--radius-md)',
            background: 'transparent', fontSize: 13, color: 'var(--text-secondary)'
          }}>
            <i className="ti ti-upload" aria-hidden="true" />
            Restore backup
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 10 }}>
          Your notes are stored locally in your browser's IndexedDB. Export regularly to back up your knowledge garden.
        </p>
      </div>
    </div>
  )
}
