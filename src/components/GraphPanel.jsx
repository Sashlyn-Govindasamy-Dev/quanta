import { useEffect, useRef } from 'react'
import { getTopicColor } from '../config.js'
import { isDue } from '../srs.js'

export function GraphPanel({ notes, onSelectNote }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !notes.length) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width
    const H = canvas.height
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = isDark ? '#252523' : '#F7F6F2'
    ctx.fillRect(0, 0, W, H)

    // Force-directed layout approximation
    const positions = {}
    const topics = [...new Set(notes.map(n => n.topic))]
    const topicCount = topics.length
    const cx = W / 2, cy = H / 2

    notes.forEach((note, i) => {
      const topicIdx = topics.indexOf(note.topic)
      const notesInTopic = notes.filter(n => n.topic === note.topic)
      const posInTopic = notesInTopic.indexOf(note)
      const angleBase = (topicIdx / topicCount) * 2 * Math.PI - Math.PI / 2
      const spread = 0.35
      const angle = angleBase + (posInTopic - (notesInTopic.length - 1) / 2) * spread
      const r = Math.min(W, H) * 0.28 + (note.connections.length > 2 ? -20 : 0)
      positions[note.id] = { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle), note }
    })

    // Draw edges
    const drawn = new Set()
    notes.forEach(note => {
      note.connections.forEach(cid => {
        const key = [note.id, cid].sort().join('-')
        if (drawn.has(key)) return
        drawn.add(key)
        const a = positions[note.id], b = positions[cid]
        if (!a || !b) return
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'
        ctx.lineWidth = 1
        ctx.stroke()
      })
    })

    // Draw nodes
    notes.forEach(note => {
      const p = positions[note.id]
      const color = getTopicColor(note.topic)
      const r = 10 + note.connections.length * 2.5
      const due = isDue(note)

      if (due) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, r + 5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(186,117,23,0.2)'
        ctx.fill()
      }

      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = color.bg
      ctx.fill()
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.strokeStyle = color.dot
      ctx.lineWidth = 2
      ctx.stroke()

      ctx.fillStyle = isDark ? '#f0efe8' : '#1a1a18'
      ctx.font = `500 11px 'DM Sans', system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      const label = note.title.length > 22 ? note.title.slice(0, 20) + '…' : note.title
      ctx.fillText(label, p.x, p.y + r + 6)
    })

    // Click handler
    const handleClick = (e) => {
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      for (const [id, p] of Object.entries(positions)) {
        const r = 10 + p.note.connections.length * 2.5
        if (Math.hypot(mx - p.x, my - p.y) < r + 8) {
          onSelectNote(parseInt(id))
          break
        }
      }
    }

    canvas.addEventListener('click', handleClick)
    return () => canvas.removeEventListener('click', handleClick)
  }, [notes])

  return (
    <div style={{ padding: '24px 28px', maxWidth: 720 }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 6 }}>Connection map</h1>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Every node is a note. Lines show connections. Larger nodes have more links.
        <span style={{ color: 'var(--amber-400)', marginLeft: 8 }}>⚡ Amber glow = due for review.</span>
        Click any node to open it.
      </p>
      <div style={{
        borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)',
        overflow: 'hidden', background: 'var(--bg-secondary)'
      }}>
        <canvas ref={canvasRef} width={660} height={400} style={{ display: 'block', width: '100%', cursor: 'pointer' }} />
      </div>
      <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        {[...new Set(notes.map(n => n.topic))].map(topic => {
          const color = getTopicColor(topic)
          return (
            <div key={topic} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color.dot }} />
              {topic}
            </div>
          )
        })}
      </div>
    </div>
  )
}
