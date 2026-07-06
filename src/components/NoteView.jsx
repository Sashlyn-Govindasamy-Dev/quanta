import { useState } from 'react'
import { getTopicColor } from '../config.js'
import { getRetentionPercent, isDue, getDaysUntilReview } from '../srs.js'
import { getSetting } from '../db.js'
import { senseCheckNote } from '../ai.js'
import { showToast } from './Toast.jsx'

export function NoteView({ note, notes, sourceConfig, onUpdate, onAddCapture, onAddConnection, onRemoveConnection, onDelete, onSwitchTab }) {
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState(note.title)
  const [editBody, setEditBody] = useState(note.body)
  const [showLinkPicker, setShowLinkPicker] = useState(false)
  const [checking, setChecking] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  const report = note.senseCheck || null

  const runSenseCheck = async () => {
    const apiKey = await getSetting('anthropicApiKey')
    if (!apiKey) {
      showToast('Set up your API key in the Quiz tab first', 'error')
      return
    }
    setChecking(true)
    try {
      const result = await senseCheckNote(apiKey, note)
      onUpdate(note.id, { senseCheck: { ...result, checkedAt: Date.now() } })
      setReportOpen(true)
      showToast('Sense check complete')
    } catch (e) {
      showToast(e.message, 'error')
    } finally {
      setChecking(false)
    }
  }

  const color = getTopicColor(note.topic)
  const src = sourceConfig[note.source] || sourceConfig.thinking
  const retention = getRetentionPercent(note)
  const due = isDue(note)
  const daysUntil = getDaysUntilReview(note)
  const connected = notes.filter(n => note.connections.includes(n.id))
  const unconnected = notes.filter(n => n.id !== note.id && !note.connections.includes(n.id))

  const saveEdit = () => {
    onUpdate(note.id, { title: editTitle, body: editBody })
    setEditMode(false)
    showToast('Note saved')
  }

  const handleLink = (toId) => {
    onAddConnection(note.id, toId)
    setShowLinkPicker(false)
    showToast('Connection added')
  }

  return (
    <div style={{ maxWidth: 720, padding: '24px 28px' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        {editMode ? (
          <input
            value={editTitle} onChange={e => setEditTitle(e.target.value)}
            style={{
              fontSize: 22, fontWeight: 500, width: '100%', border: 'none',
              borderBottom: '2px solid var(--purple-400)', background: 'transparent',
              outline: 'none', padding: '4px 0', marginBottom: 12, color: 'var(--text-primary)'
            }}
          />
        ) : (
          <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 10, color: 'var(--text-primary)' }}>
            {note.title}
          </h1>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
          <span style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
            background: color.bg, color: color.text
          }}>{note.topic}</span>

          <span style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
            background: 'var(--bg-secondary)', color: 'var(--text-secondary)',
            border: '0.5px solid var(--border)'
          }}>
            <i className={`ti ${src.icon}`} aria-hidden="true" style={{ marginRight: 4 }} />
            {src.label}
          </span>

          <span style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
            background: due ? 'var(--amber-50)' : 'var(--teal-50)',
            color: due ? 'var(--amber-400)' : 'var(--teal-800)'
          }}>
            {due ? '⚡ Due for review' : `${retention}% retained · ${daysUntil}d`}
          </span>

          <span style={{
            fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
            background: 'var(--blue-50)', color: 'var(--blue-800)'
          }}>
            {connected.length} link{connected.length !== 1 ? 's' : ''}
          </span>

          {report && (
            note.modified && note.modified > report.checkedAt ? (
              <button onClick={() => setReportOpen(!reportOpen)} title="Note edited since last check — run another sense check to re-verify" style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500, border: 'none',
                background: 'var(--purple-50)', color: 'var(--purple-800)', cursor: 'pointer'
              }}>
                ⟳ Edited since check — re-check?
              </button>
            ) : (
              <button onClick={() => setReportOpen(!reportOpen)} title="View sense check report" style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500, border: 'none',
                background: report.verdict === 'accurate' ? 'var(--teal-50)' : report.verdict === 'minor_issues' ? 'var(--amber-50)' : 'var(--coral-50)',
                color: report.verdict === 'accurate' ? 'var(--teal-800)' : report.verdict === 'minor_issues' ? 'var(--amber-800)' : 'var(--coral-800)',
                cursor: 'pointer'
              }}>
                {report.verdict === 'accurate' ? '✓ Checked' : report.verdict === 'minor_issues' ? '⚠ Minor issues' : '✗ Issues found'}
                {' · '}{new Date(report.checkedAt).toLocaleDateString()}
              </button>
            )
          )}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button onClick={runSenseCheck} disabled={checking} title="Sense check this note against official documentation"
              style={{ padding: '4px 10px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', fontSize: 12, color: checking ? 'var(--text-tertiary)' : 'var(--purple-600)', cursor: checking ? 'wait' : 'pointer' }}>
              <i className={`ti ${checking ? 'ti-loader-2' : 'ti-shield-check'}`} aria-hidden="true" />
            </button>
            <button onClick={() => { setEditMode(!editMode); setEditTitle(note.title); setEditBody(note.body) }}
              style={{ padding: '4px 10px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', fontSize: 12, color: 'var(--text-secondary)' }}>
              <i className={`ti ${editMode ? 'ti-x' : 'ti-edit'}`} aria-hidden="true" />
            </button>
            <button onClick={() => { if (confirm('Delete this note?')) onDelete(note.id) }}
              style={{ padding: '4px 10px', border: '0.5px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'transparent', fontSize: 12, color: 'var(--coral-400)' }}>
              <i className="ti ti-trash" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {editMode ? (
        <div style={{ marginBottom: 20 }}>
          <textarea
            value={editBody} onChange={e => setEditBody(e.target.value)}
            rows={10} style={{
              width: '100%', border: '0.5px solid var(--border-mid)', borderRadius: 'var(--radius-md)',
              padding: '12px 14px', fontSize: 14, lineHeight: 1.8, outline: 'none',
              background: 'var(--bg-secondary)', resize: 'vertical', color: 'var(--text-primary)'
            }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button onClick={saveEdit} style={{
              padding: '7px 18px', background: 'var(--purple-600)', color: '#fff',
              border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500
            }}>Save</button>
            <button onClick={() => setEditMode(false)} style={{
              padding: '7px 18px', background: 'transparent', color: 'var(--text-secondary)',
              border: '0.5px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: 13
            }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ marginBottom: 24 }}>
          {note.body.split('\n\n').map((p, i) => (
            <p key={i} style={{ fontSize: 14, lineHeight: 1.85, color: 'var(--text-primary)', marginBottom: 14 }}>{p}</p>
          ))}
        </div>
      )}

      {/* Sense check report */}
      {checking && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', marginBottom: 20, borderRadius: 'var(--radius-md)', background: 'var(--purple-50)', border: '0.5px solid var(--purple-200)', fontSize: 13, color: 'var(--purple-800)' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple-400)', animation: 'pulse 1s infinite' }} />
          Checking your note against official documentation... this takes a few seconds
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
      )}

      {report && reportOpen && !checking && (
        <div style={{
          marginBottom: 24, borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          border: `0.5px solid ${report.verdict === 'accurate' ? 'var(--teal-200)' : report.verdict === 'minor_issues' ? 'var(--amber-100)' : 'var(--coral-100)'}`
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px',
            background: report.verdict === 'accurate' ? 'var(--teal-50)' : report.verdict === 'minor_issues' ? 'var(--amber-50)' : 'var(--coral-50)'
          }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: report.verdict === 'accurate' ? 'var(--teal-800)' : report.verdict === 'minor_issues' ? 'var(--amber-800)' : 'var(--coral-800)' }}>
              <i className="ti ti-shield-check" aria-hidden="true" style={{ marginRight: 6 }} />
              Sense check — {new Date(report.checkedAt).toLocaleString()}
            </div>
            <button onClick={() => setReportOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: 14, color: 'var(--text-tertiary)', cursor: 'pointer' }}>
              <i className="ti ti-x" aria-hidden="true" />
            </button>
          </div>

          <div style={{ padding: '14px 16px', background: 'var(--bg-primary)' }}>
            <p style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-primary)', marginBottom: report.findings?.length ? 14 : 0 }}>
              {report.summary}
            </p>

            {report.findings?.map((f, i) => (
              <div key={i} style={{
                padding: '10px 14px', marginBottom: 8, fontSize: 13, lineHeight: 1.7,
                borderLeft: `3px solid ${f.status === 'accurate' ? 'var(--teal-400)' : f.status === 'incorrect' ? 'var(--coral-400)' : f.status === 'org_specific' ? 'var(--blue-400)' : 'var(--amber-200)'}`,
                background: 'var(--bg-secondary)', borderRadius: '0 var(--radius-md) var(--radius-md) 0'
              }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
                    color: f.status === 'accurate' ? 'var(--teal-600)' : f.status === 'incorrect' ? 'var(--coral-400)' : f.status === 'org_specific' ? 'var(--blue-400)' : 'var(--amber-400)' }}>
                    {f.status.replace('_', ' ')}
                  </span>
                  <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: 'var(--bg-tertiary)', color: 'var(--text-tertiary)' }}>
                    {f.confidence === 'established' ? 'established concept' : f.confidence === 'verify_in_docs' ? 'verify in docs' : 'org-specific — cannot verify externally'}
                  </span>
                </div>
                <div style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginBottom: 4 }}>"{f.claim}"</div>
                <div style={{ color: 'var(--text-primary)' }}>{f.explanation}</div>
              </div>
            ))}

            {report.references?.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>References</div>
                {report.references.map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5,
                    color: 'var(--blue-400)', textDecoration: 'none', marginBottom: 4
                  }}>
                    <i className="ti ti-external-link" aria-hidden="true" style={{ fontSize: 12, flexShrink: 0 }} />
                    {r.title || r.url}
                  </a>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => { setEditMode(true); setEditTitle(note.title); setEditBody(note.body) }} style={{
                padding: '7px 16px', borderRadius: 'var(--radius-md)', fontSize: 12.5, fontWeight: 500,
                background: 'var(--purple-600)', color: '#fff', border: 'none'
              }}>
                <i className="ti ti-edit" aria-hidden="true" style={{ marginRight: 6 }} />
                Edit note now
              </button>
              <button onClick={runSenseCheck} disabled={checking} style={{
                padding: '7px 16px', borderRadius: 'var(--radius-md)', fontSize: 12.5, fontWeight: 500,
                background: 'transparent', border: '0.5px solid var(--purple-200)', color: 'var(--purple-800)',
                cursor: checking ? 'wait' : 'pointer'
              }}>
                <i className="ti ti-refresh" aria-hidden="true" style={{ marginRight: 6 }} />
                Check again
              </button>
            </div>

            <p style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 12, lineHeight: 1.6 }}>
              Read the findings, then edit your note yourself — correcting it in your own words is part of the learning. Re-check as many times as you need until you're satisfied. This check reduces error risk but isn't a guarantee; for version- or licence-specific claims, the linked docs are the source of truth.
            </p>
          </div>
        </div>
      )}

      {/* Captures */}
      {note.captures.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
            My insights
          </div>
          {note.captures.map((c, i) => (
            <div key={i} style={{
              padding: '10px 14px', marginBottom: 8,
              borderLeft: `3px solid ${color.dot}`,
              background: color.bg + '55',
              borderRadius: '0 var(--radius-md) var(--radius-md) 0',
              fontSize: 13, lineHeight: 1.75, color: 'var(--text-primary)'
            }}>{c}</div>
          ))}
        </div>
      )}

      <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', marginBottom: 20 }} />

      {/* Connections */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
          Linked concepts
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {connected.map(c => {
            const cc = getTopicColor(c.topic)
            return (
              <div key={c.id} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '5px 10px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
                fontSize: 12, cursor: 'pointer', position: 'relative'
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: cc.dot }} />
                <span style={{ color: 'var(--text-primary)' }}>{c.title}</span>
                <button onClick={() => { onRemoveConnection(note.id, c.id); showToast('Link removed') }}
                  style={{ border: 'none', background: 'transparent', padding: '0 0 0 4px', fontSize: 11, color: 'var(--text-tertiary)' }}>
                  <i className="ti ti-x" aria-hidden="true" />
                </button>
              </div>
            )
          })}

          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowLinkPicker(!showLinkPicker)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px',
              border: '0.5px dashed var(--border-mid)', borderRadius: 'var(--radius-md)',
              background: 'transparent', fontSize: 12, color: 'var(--text-secondary)'
            }}>
              <i className="ti ti-plus" aria-hidden="true" style={{ fontSize: 12 }} /> Link a concept
            </button>
            {showLinkPicker && unconnected.length > 0 && (
              <div style={{
                position: 'absolute', top: '110%', left: 0, zIndex: 100,
                background: 'var(--bg-primary)', border: '0.5px solid var(--border)',
                borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)',
                minWidth: 220, maxHeight: 200, overflowY: 'auto'
              }}>
                {unconnected.map(u => (
                  <button key={u.id} onClick={() => handleLink(u.id)} style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px',
                    border: 'none', background: 'transparent', fontSize: 13, color: 'var(--text-primary)',
                    cursor: 'pointer', borderBottom: '0.5px solid var(--border)'
                  }}>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginRight: 6 }}>{u.topic}</span>
                    {u.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <hr style={{ border: 'none', borderTop: '0.5px solid var(--border)', marginBottom: 20 }} />

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {due ? (
          <button onClick={() => onSwitchTab('review')} style={{
            padding: '8px 18px', background: 'var(--amber-50)', border: '0.5px solid var(--amber-200)',
            borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--amber-800)', fontWeight: 500
          }}>⚡ Review now</button>
        ) : (
          <button onClick={() => onSwitchTab('review')} style={{
            padding: '8px 18px', background: 'var(--bg-secondary)', border: '0.5px solid var(--border)',
            borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--text-secondary)'
          }}>
            <i className="ti ti-brain" aria-hidden="true" style={{ marginRight: 6 }} />Review queue
          </button>
        )}
        <button onClick={() => onSwitchTab('capture')} style={{
          padding: '8px 18px', background: 'var(--purple-50)', border: '0.5px solid var(--purple-200)',
          borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--purple-800)'
        }}>
          <i className="ti ti-bulb" aria-hidden="true" style={{ marginRight: 6 }} />Add insight
        </button>
      </div>
    </div>
  )
}
