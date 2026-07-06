import { useState, useEffect } from 'react'
import { getTopicColor } from '../config.js'
import { getSetting, setSetting } from '../db.js'
import { generateQuestion, evaluateAnswer, pickQuestionType, generateCertQuestion, evaluateCertAnswer } from '../ai.js'
import { applyQuizResult } from '../srs.js'
import { showToast } from './Toast.jsx'

const TYPE_META = {
  recall:      { label: 'Recall',        icon: 'ti-brain',            desc: 'Do you remember it?' },
  application: { label: 'Application',   icon: 'ti-tool',             desc: 'Can you use it?' },
  feynman:     { label: 'Feynman',       icon: 'ti-school',           desc: 'Can you teach it?' },
  connection:  { label: 'Connection',    icon: 'ti-vector-triangle',  desc: 'How does it relate?' },
  cert:        { label: 'Cert scenario', icon: 'ti-certificate',      desc: 'Combine concepts to solve it' },
}

// Record a quiz answer into daily session history (for streaks + Progress view)
async function recordSession(score) {
  const sessions = (await getSetting('quizSessions')) || []
  const today = new Date().toISOString().slice(0, 10)
  const existing = sessions.find(s => s.date === today)
  if (existing) {
    existing.count += 1
    existing.totalScore += score
  } else {
    sessions.push({ date: today, count: 1, totalScore: score })
  }
  await setSetting('quizSessions', sessions.slice(-90)) // keep ~3 months
}

export function QuizPanel({ notes, onQuizScore }) {
  const [apiKey, setApiKey] = useState(null)
  const [keyInput, setKeyInput] = useState('')
  const [keyLoaded, setKeyLoaded] = useState(false)

  const [mode, setMode] = useState('standard') // standard | cert
  const [topicFilter, setTopicFilter] = useState('all')
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [scheduleMsg, setScheduleMsg] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | generating | answering | evaluating | feedback
  const [sessionScores, setSessionScores] = useState([])
  const [error, setError] = useState(null)

  const topics = [...new Set(notes.map(n => n.topic))].sort()

  useEffect(() => {
    getSetting('anthropicApiKey').then(k => { setApiKey(k || null); setKeyLoaded(true) })
  }, [])

  const saveKey = async () => {
    const k = keyInput.trim()
    if (!k) return
    await setSetting('anthropicApiKey', k)
    setApiKey(k)
    setKeyInput('')
    showToast('API key saved — stored only on this device')
  }

  const clearKey = async () => {
    await setSetting('anthropicApiKey', null)
    setApiKey(null)
    showToast('API key removed')
  }

  // Pick 2-3 related notes for a cert scenario: a seed note plus its
  // connections, topped up with same-topic notes if needed
  const pickCertNotes = (pool) => {
    const seed = pool[Math.floor(Math.random() * pool.length)]
    const related = notes.filter(n => seed.connections.includes(n.id))
    const sameTopic = notes.filter(n => n.topic === seed.topic && n.id !== seed.id && !seed.connections.includes(n.id))
    const combined = [seed, ...related, ...sameTopic].slice(0, 3)
    return combined
  }

  const nextQuestion = async () => {
    const pool = topicFilter === 'all' ? notes : notes.filter(n => n.topic === topicFilter)
    if (!pool.length) { showToast('No notes in this topic yet', 'error'); return }
    if (mode === 'cert' && notes.length < 2) { showToast('Cert mode needs at least 2 notes', 'error'); return }

    setPhase('generating'); setError(null); setFeedback(null); setAnswer(''); setScheduleMsg(null)
    try {
      if (mode === 'cert') {
        const certNotes = pickCertNotes(pool)
        const q = await generateCertQuestion(apiKey, certNotes)
        setQuestion({ ...q, notes: certNotes, note: certNotes[0] })
      } else {
        const note = pool[Math.floor(Math.random() * pool.length)]
        const connected = notes.filter(n => note.connections.includes(n.id))
        const type = pickQuestionType(connected.length > 0)
        const q = await generateQuestion(apiKey, note, connected, type)
        setQuestion({ ...q, note, notes: [note] })
      }
      setPhase('answering')
    } catch (e) {
      setError(e.message); setPhase('idle')
    }
  }

  const submit = async () => {
    if (!answer.trim()) return
    setPhase('evaluating'); setError(null)
    try {
      const result = question.type === 'cert'
        ? await evaluateCertAnswer(apiKey, question.notes, question, answer.trim())
        : await evaluateAnswer(apiKey, question.note, question, answer.trim())

      setFeedback(result)
      setSessionScores(prev => [...prev, result.score])
      await recordSession(result.score)

      // Feed the score into the review schedule for every note involved
      const msgs = []
      for (const n of question.notes) {
        const adj = applyQuizResult(n, result.score)
        onQuizScore(n.id, result.score, question.type)
        if (adj) {
          const days = adj.interval
          msgs.push(`${n.title} → next review ${days === 1 ? 'tomorrow' : `in ${days} days`}`)
        }
      }
      setScheduleMsg(msgs.length
        ? `Review schedule updated: ${msgs.join(' · ')}`
        : 'Solid result — review schedule unchanged.')

      setPhase('feedback')
    } catch (e) {
      setError(e.message); setPhase('answering')
    }
  }

  if (!keyLoaded) return null

  // ── Setup screen ──────────────────────────────────────────────────────────
  if (!apiKey) return (
    <div style={{ maxWidth: 560, padding: '40px 28px' }}>
      <h1 style={{ fontSize: 22, fontWeight: 500, marginBottom: 10 }}>Quiz setup</h1>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 8 }}>
        Quiz mode uses Claude to generate questions from your notes and evaluate your answers —
        active recall and the Feynman technique, powered by your own content.
      </p>
      <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.8, marginBottom: 20 }}>
        It needs an Anthropic API key. Create one at{' '}
        <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: 'var(--purple-600)' }}>console.anthropic.com</a>{' '}
        → API Keys. The key is stored only in this browser and is only ever sent to Anthropic.
      </p>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="password"
          value={keyInput}
          onChange={e => setKeyInput(e.target.value)}
          placeholder="sk-ant-..."
          style={{
            flex: 1, border: '0.5px solid var(--border-mid)', borderRadius: 'var(--radius-md)',
            padding: '9px 12px', fontSize: 14, outline: 'none', background: 'var(--bg-secondary)',
            color: 'var(--text-primary)', fontFamily: 'var(--font-mono)'
          }}
        />
        <button onClick={saveKey} disabled={!keyInput.trim()} style={{
          padding: '9px 20px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
          background: keyInput.trim() ? 'var(--purple-600)' : 'var(--border)', color: '#fff', border: 'none',
          cursor: keyInput.trim() ? 'pointer' : 'not-allowed'
        }}>Save</button>
      </div>
    </div>
  )

  const color = question ? getTopicColor(question.note.topic) : null
  const avg = sessionScores.length ? Math.round(sessionScores.reduce((a, b) => a + b, 0) / sessionScores.length) : null

  return (
    <div style={{ maxWidth: 680, padding: '24px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500 }}>Quiz</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {avg !== null && (
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              Session: {sessionScores.length} answered · avg {avg}%
            </span>
          )}
          <button onClick={clearKey} title="Remove API key" style={{
            border: 'none', background: 'transparent', color: 'var(--text-tertiary)', fontSize: 12
          }}>
            <i className="ti ti-key-off" aria-hidden="true" />
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
        Answer in as much detail as you can — the evaluation rewards completeness and flags exactly what you missed.
        Results feed back into your review schedule automatically.
      </p>

      {/* Mode toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button onClick={() => setMode('standard')} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
          borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500,
          border: mode === 'standard' ? '0.5px solid var(--purple-400)' : '0.5px solid var(--border)',
          background: mode === 'standard' ? 'var(--purple-50)' : 'transparent',
          color: mode === 'standard' ? 'var(--purple-800)' : 'var(--text-secondary)'
        }}>
          <i className="ti ti-brain" aria-hidden="true" style={{ fontSize: 13 }} />
          Standard
        </button>
        <button onClick={() => setMode('cert')} style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
          borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500,
          border: mode === 'cert' ? '0.5px solid var(--purple-400)' : '0.5px solid var(--border)',
          background: mode === 'cert' ? 'var(--purple-50)' : 'transparent',
          color: mode === 'cert' ? 'var(--purple-800)' : 'var(--text-secondary)'
        }}>
          <i className="ti ti-certificate" aria-hidden="true" style={{ fontSize: 13 }} />
          Cert scenario
        </button>
      </div>

      {mode === 'cert' && (
        <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
          Certification-style scenarios combining 2-3 related concepts — the way real exam questions test you.
        </p>
      )}

      {/* Topic filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
        {['all', ...topics].map(t => (
          <button key={t} onClick={() => setTopicFilter(t)} style={{
            padding: '5px 12px', borderRadius: 99, fontSize: 12, fontWeight: 500,
            border: topicFilter === t ? '0.5px solid var(--purple-400)' : '0.5px solid var(--border)',
            background: topicFilter === t ? 'var(--purple-50)' : 'transparent',
            color: topicFilter === t ? 'var(--purple-800)' : 'var(--text-secondary)'
          }}>{t === 'all' ? 'All topics' : t}</button>
        ))}
      </div>

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: 16,
          background: 'var(--coral-50)', border: '0.5px solid var(--coral-100)',
          fontSize: 13, color: 'var(--coral-800)'
        }}>{error}</div>
      )}

      {/* Idle */}
      {phase === 'idle' && (
        <button onClick={nextQuestion} style={{
          padding: '10px 24px', background: 'var(--purple-600)', color: '#fff',
          border: 'none', borderRadius: 'var(--radius-md)', fontSize: 14, fontWeight: 500
        }}>
          <i className="ti ti-player-play" aria-hidden="true" style={{ marginRight: 8 }} />
          Start quiz
        </button>
      )}

      {/* Generating / evaluating */}
      {(phase === 'generating' || phase === 'evaluating') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple-400)', animation: 'pulse 1s infinite' }} />
          {phase === 'generating' ? (mode === 'cert' ? 'Building a scenario from your related notes...' : 'Generating question from your notes...') : 'Evaluating your answer...'}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
      )}

      {/* Question */}
      {question && (phase === 'answering' || phase === 'evaluating' || phase === 'feedback') && (
        <div style={{
          borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)',
          background: 'var(--bg-secondary)', padding: '20px 22px', marginBottom: 16
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            {question.type === 'cert' ? (
              question.notes.map(n => {
                const c = getTopicColor(n.topic)
                return <span key={n.id} style={{
                  fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
                  background: c.bg, color: c.text
                }}>{n.title}</span>
              })
            ) : (
              <span style={{
                fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
                background: color.bg, color: color.text
              }}>{question.note.topic}</span>
            )}
            <span style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
              background: 'var(--purple-50)', color: 'var(--purple-800)',
              display: 'flex', alignItems: 'center', gap: 5
            }}>
              <i className={`ti ${TYPE_META[question.type].icon}`} aria-hidden="true" style={{ fontSize: 11 }} />
              {TYPE_META[question.type].label} — {TYPE_META[question.type].desc}
            </span>
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)', fontWeight: 500 }}>
            {question.question}
          </p>
          {question.hint && phase === 'answering' && (
            <details style={{ marginTop: 10 }}>
              <summary style={{ fontSize: 12, color: 'var(--text-tertiary)', cursor: 'pointer' }}>Need a hint?</summary>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 6 }}>{question.hint}</p>
            </details>
          )}
        </div>
      )}

      {/* Answer box */}
      {(phase === 'answering' || phase === 'evaluating') && (
        <div>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Write your answer in full — detail is rewarded. Explain it like you'd teach it."
            rows={8}
            disabled={phase === 'evaluating'}
            style={{
              width: '100%', border: '0.5px solid var(--border-mid)', borderRadius: 'var(--radius-md)',
              padding: '12px 14px', fontSize: 14, lineHeight: 1.8, outline: 'none',
              background: 'var(--bg-primary)', resize: 'vertical', color: 'var(--text-primary)',
              fontFamily: 'inherit', marginBottom: 10
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={submit} disabled={!answer.trim() || phase === 'evaluating'} style={{
              padding: '9px 22px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
              background: answer.trim() && phase !== 'evaluating' ? 'var(--purple-600)' : 'var(--border)',
              color: '#fff', border: 'none',
              cursor: answer.trim() && phase !== 'evaluating' ? 'pointer' : 'not-allowed'
            }}>Submit answer</button>
            <button onClick={nextQuestion} disabled={phase === 'evaluating'} style={{
              padding: '9px 18px', borderRadius: 'var(--radius-md)', fontSize: 13,
              background: 'transparent', border: '0.5px solid var(--border)', color: 'var(--text-secondary)'
            }}>Skip</button>
          </div>
        </div>
      )}

      {/* Feedback */}
      {phase === 'feedback' && feedback && (
        <div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12,
            padding: '16px 20px', borderRadius: 'var(--radius-lg)',
            background: feedback.score >= 75 ? 'var(--teal-50)' : feedback.score >= 50 ? 'var(--amber-50)' : 'var(--coral-50)',
            border: `0.5px solid ${feedback.score >= 75 ? 'var(--teal-200)' : feedback.score >= 50 ? 'var(--amber-100)' : 'var(--coral-100)'}`
          }}>
            <div style={{
              fontSize: 28, fontWeight: 600,
              color: feedback.score >= 75 ? 'var(--teal-800)' : feedback.score >= 50 ? 'var(--amber-800)' : 'var(--coral-800)'
            }}>{feedback.score}%</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {feedback.score >= 90 ? 'Excellent — this concept is solid.' :
               feedback.score >= 75 ? 'Good understanding with minor gaps.' :
               feedback.score >= 50 ? 'You have the shape of it — the details need work.' :
               'This one needs a revisit. Read the gaps below, then review the note.'}
            </div>
          </div>

          {scheduleMsg && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16,
              padding: '9px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--blue-50)', fontSize: 12.5, color: 'var(--blue-800)'
            }}>
              <i className="ti ti-calendar-stats" aria-hidden="true" style={{ fontSize: 14, flexShrink: 0 }} />
              {scheduleMsg}
            </div>
          )}

          {feedback.noteWarning && (
            <div style={{
              display: 'flex', gap: 8, marginBottom: 16,
              padding: '11px 14px', borderRadius: 'var(--radius-md)',
              background: 'var(--coral-50)', border: '0.5px solid var(--coral-100)',
              fontSize: 13, color: 'var(--coral-800)', lineHeight: 1.7
            }}>
              <i className="ti ti-alert-octagon" aria-hidden="true" style={{ fontSize: 15, flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong>Your note may contain an error:</strong> {feedback.noteWarning}
                <br />Open the note and run a sense check before your next review.
              </div>
            </div>
          )}

          <FeedbackBlock icon="ti-check" title="What you got right" color="var(--teal-600)">{feedback.strengths}</FeedbackBlock>
          <FeedbackBlock icon="ti-alert-triangle" title="Gaps" color="var(--amber-400)">{feedback.gaps}</FeedbackBlock>
          {feedback.feynmanNote && (
            <FeedbackBlock icon="ti-school" title="Explanation quality (Feynman)" color="var(--purple-600)">{feedback.feynmanNote}</FeedbackBlock>
          )}
          <FeedbackBlock icon="ti-bulb" title="Model answer from your notes" color="var(--blue-400)">{feedback.modelAnswer}</FeedbackBlock>

          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button onClick={nextQuestion} style={{
              padding: '9px 22px', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500,
              background: 'var(--purple-600)', color: '#fff', border: 'none'
            }}>Next question</button>
          </div>
        </div>
      )}
    </div>
  )
}

function FeedbackBlock({ icon, title, color, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <i className={`ti ${icon}`} aria-hidden="true" style={{ fontSize: 14, color }} />
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
      </div>
      <p style={{ fontSize: 13, lineHeight: 1.8, color: 'var(--text-primary)', paddingLeft: 21 }}>{children}</p>
    </div>
  )
}
