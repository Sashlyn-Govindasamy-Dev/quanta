import { useState } from 'react'
import { getTopicColor, AVAILABLE_ICONS } from '../config.js'
import { getRetentionPercent, isDue } from '../srs.js'
import { importData } from '../db.js'
import { showToast } from './Toast.jsx'

export function ProgressPanel({ notes, sourceConfig, customSources, onAddSource, onDeleteSource, onReload, autoBackup }) {
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

  // New source form state
  const [showAddSource, setShowAddSource] = useState(false)
  const [newSourceLabel, setNewSourceLabel] = useState('')
  const [newSourceIcon, setNewSourceIcon] = useState('ti-book')

  const handleAddSource = async () => {
    if (!newSourceLabel.trim()) return
    const key = newSourceLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    if (!key) return
    await onAddSource(key, newSourceLabel.trim(), newSourceIcon)
    showToast(`Source "${newSourceLabel.trim()}" added!`)
    setNewSourceLabel('')
    setNewSourceIcon('ti-book')
    setShowAddSource(false)
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

  const { supported, folderName, lastBackup, pickFolder, manualBackup } = autoBackup

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
          const cfg = sourceConfig[src] || sourceConfig.thinking
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

      {/* ── Manage Learning Sources ─────────────────────────────────────────── */}
      <div style={{ marginBottom: 28, borderTop: '0.5px solid var(--border)', paddingTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Manage learning sources
          </div>
          <button onClick={() => setShowAddSource(!showAddSource)} style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
            border: '0.5px solid var(--purple-200)', borderRadius: 'var(--radius-md)',
            background: showAddSource ? 'var(--purple-50)' : 'transparent',
            fontSize: 12, color: 'var(--purple-800)', fontWeight: 500, cursor: 'pointer'
          }}>
            <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 12 }} />
            Add source
          </button>
        </div>

        {/* All sources list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: showAddSource ? 16 : 0 }}>
          {Object.entries(sourceConfig).map(([key, cfg]) => {
            const isCustom = !!customSources[key]
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)'
              }}>
                <i className={`ti ${cfg.icon}`} aria-hidden="true" style={{ fontSize: 15, color: 'var(--purple-400)', width: 20, textAlign: 'center' }} />
                <span style={{ flex: 1, fontSize: 13, color: 'var(--text-primary)' }}>{cfg.label}</span>
                {isCustom ? (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500,
                    background: 'var(--purple-50)', color: 'var(--purple-600)',
                    border: '0.5px solid var(--purple-200)', marginRight: 4
                  }}>custom</span>
                ) : (
                  <span style={{
                    fontSize: 10, padding: '2px 7px', borderRadius: 99, fontWeight: 500,
                    background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)',
                    border: '0.5px solid var(--border)', marginRight: 4
                  }}>built-in</span>
                )}
                {isCustom && (
                  <button onClick={async () => {
                    if (confirm(`Remove source "${cfg.label}"?`)) {
                      await onDeleteSource(key)
                      showToast(`Source "${cfg.label}" removed`)
                    }
                  }} style={{
                    border: 'none', background: 'transparent', color: 'var(--coral-400)',
                    fontSize: 13, cursor: 'pointer', padding: '2px 4px'
                  }}>
                    <i className="ti ti-trash" aria-hidden="true" />
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {/* Add source form */}
        {showAddSource && (
          <div style={{
            padding: '16px', borderRadius: 'var(--radius-md)',
            border: '0.5px solid var(--purple-200)', background: 'var(--purple-50)',
            marginTop: 8
          }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--purple-800)', marginBottom: 12 }}>
              New learning source
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              <input
                value={newSourceLabel}
                onChange={e => setNewSourceLabel(e.target.value)}
                placeholder="Source name (e.g. YouTube, Course...)"
                style={{
                  flex: 1, minWidth: 180, border: '0.5px solid var(--purple-200)',
                  borderRadius: 'var(--radius-md)', padding: '8px 12px', fontSize: 13,
                  background: '#fff', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit'
                }}
              />
            </div>
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--purple-700)', marginBottom: 8 }}>Choose an icon</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
              {AVAILABLE_ICONS.map(ic => (
                <button key={ic.value} onClick={() => setNewSourceIcon(ic.value)} title={ic.label} style={{
                  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 'var(--radius-md)', cursor: 'pointer',
                  border: newSourceIcon === ic.value ? '2px solid var(--purple-400)' : '0.5px solid var(--purple-200)',
                  background: newSourceIcon === ic.value ? 'var(--purple-100)' : 'transparent',
                  color: newSourceIcon === ic.value ? 'var(--purple-800)' : 'var(--purple-400)',
                  fontSize: 16
                }}>
                  <i className={`ti ${ic.value}`} aria-hidden="true" />
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleAddSource} disabled={!newSourceLabel.trim()} style={{
                padding: '7px 18px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
                background: !newSourceLabel.trim() ? 'var(--border)' : 'var(--purple-600)',
                color: '#fff', border: 'none',
                cursor: !newSourceLabel.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit'
              }}>Save source</button>
              <button onClick={() => { setShowAddSource(false); setNewSourceLabel(''); setNewSourceIcon('ti-book') }} style={{
                padding: '7px 18px', borderRadius: 'var(--radius-md)', fontSize: 13,
                background: 'transparent', border: '0.5px solid var(--purple-200)',
                color: 'var(--purple-800)', cursor: 'pointer', fontFamily: 'inherit'
              }}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      {/* Data management */}
      <div style={{ borderTop: '0.5px solid var(--border)', paddingTop: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
          Data management
        </div>

        {/* Auto-backup status */}
        <div style={{
          padding: '12px 14px', borderRadius: 'var(--radius-md)', marginBottom: 14,
          background: folderName ? 'var(--teal-50)' : 'var(--bg-secondary)',
          border: `0.5px solid ${folderName ? 'var(--teal-200)' : 'var(--border)'}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <i className="ti ti-refresh" aria-hidden="true" style={{ fontSize: 14, color: folderName ? 'var(--teal-600)' : 'var(--text-tertiary)' }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: folderName ? 'var(--teal-800)' : 'var(--text-secondary)' }}>
              {folderName ? `Auto-backup active → ${folderName}` : 'Auto-backup not configured'}
            </span>
          </div>
          <div style={{ fontSize: 12, color: folderName ? 'var(--teal-600)' : 'var(--text-tertiary)', marginBottom: 10 }}>
            {folderName
              ? `Quanta backs up automatically each time you open the app. ${lastBackup ? `Last backup: ${lastBackup.toLocaleString()}` : 'No backup yet this session.'}`
              : 'Choose a folder on your computer and Quanta will save a backup there every time you open the app.'}
          </div>
          {supported ? (
            <button onClick={pickFolder} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500,
              background: folderName ? 'var(--teal-100)' : 'var(--purple-50)',
              border: `0.5px solid ${folderName ? 'var(--teal-200)' : 'var(--purple-200)'}`,
              color: folderName ? 'var(--teal-800)' : 'var(--purple-800)', cursor: 'pointer'
            }}>
              <i className="ti ti-folder" aria-hidden="true" style={{ marginRight: 6 }} />
              {folderName ? 'Change folder' : 'Choose backup folder'}
            </button>
          ) : (
            <p style={{ fontSize: 12, color: 'var(--coral-400)' }}>
              Auto-backup requires Chrome or Edge. Use manual export below.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={manualBackup} style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '9px 18px',
            border: '0.5px solid var(--border-mid)', borderRadius: 'var(--radius-md)',
            background: 'transparent', fontSize: 13, color: 'var(--text-secondary)'
          }}>
            <i className="ti ti-download" aria-hidden="true" />
            {folderName ? 'Backup now' : 'Export backup'}
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
          Your notes live in your browser's IndexedDB. Configure auto-backup above so you never lose your Quanta notes.
        </p>
      </div>
    </div>
  )
}
