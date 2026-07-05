import { useState, useEffect } from 'react'
import { getTopicColor } from '../config.js'
import { getSetting, setSetting } from '../db.js'
import { generateQuestion, evaluateAnswer, pickQuestionType } from '../ai.js'
import { showToast } from './Toast.jsx'

const TYPE_META = {
  recall:      { label: 'Recall',      icon: 'ti-brain',            desc: 'Do you remember it?' },
  application: { label: 'Application', icon: 'ti-tool',             desc: 'Can you use it?' },
  feynman:     { label: 'Feynman',     icon: 'ti-school',           desc: 'Can you teach it?' },
  connection:  { label: 'Connection',  icon: 'ti-vector-triangle',  desc: 'How does it relate?' },
}

export function QuizPanel({ notes }) {
  const [apiKey, setApiKey] = useState(null)
  const [keyInput, setKeyInput] = useState('')
  const [keyLoaded, setKeyLoaded] = useState(false)

  const [topicFilter, setTopicFilter] = useState('all')
  const [question, setQuestion] = useState(null)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
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

  const nextQuestion = async () => {
    const pool = topicFilter === 'all' ? notes : notes.filter(n => n.topic === topicFilter)
    if (!pool.length) { showToast('No notes in this topic yet', 'error'); return }

    setPhase('generating'); setError(null); setFeedback(null); setAnswer('')
    try {
      const note = pool[Math.floor(Math.random() * pool.length)]
      const connected = notes.filter(n => note.connections.includes(n.id))
      const type = pickQuestionType(connected.length > 0)
      const q = await generateQuestion(apiKey, note, connected, type)
      setQuestion({ ...q, note })
      setPhase('answering')
    } catch (e) {
      setError(e.message); setPhase('idle')
    }
  }

  const submit = async () => {
    if (!answer.trim()) return
    setPhase('evaluating'); setError(null)
    try {
      const result = await evaluateAnswer(apiKey, question.note, question, answer.trim())
      setFeedback(result)
      setSessionScores(prev => [...prev, result.score])
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
      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>
        Answer in as much detail as you can — the evaluation rewards completeness and flags exactly what you missed.
      </p>

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

      {/* Generating */}
      {(phase === 'generating' || phase === 'evaluating') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '20px 0', color: 'var(--text-tertiary)', fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple-400)', animation: 'pulse 1s infinite' }} />
          {phase === 'generating' ? 'Generating question from your notes...' : 'Evaluating your answer...'}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
        </div>
      )}

      {/* Question */}
      {question && (phase === 'answering' || phase === 'evaluating' || phase === 'feedback') && (
        <div style={{
          borderRadius: 'var(--radius-lg)', border: '0.5px solid var(--border)',
          background: 'var(--bg-secondary)', padding: '20px 22px', marginBottom: 16
        }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center' }}>
            <span style={{
              fontSize: 11, padding: '3px 9px', borderRadius: 99, fontWeight: 500,
              background: color.bg, color: color.text
            }}>{question.note.topic}</span>
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
            display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
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

          <FeedbackBlock icon="ti-check" title="What you got right" color="var(--teal-600)">{feedback.strengths}</FeedbackBlock>
          <FeedbackBlock icon="ti-alert-triangle" title="Gaps" color="var(--amber-400)">{feedback.gaps}</FeedbackBlock>
          {feedback.feynmanNote && (
            <FeedbackBlock icon="ti-school" title="Explanation quality (Feynman)" color="var(--purple-600)">{feedback.feynmanNote}</FeedbackBlock>
          )}
          <FeedbackBlock icon="ti-bulb" title="Model answer from your note" color="var(--blue-400)">{feedback.modelAnswer}</FeedbackBlock>

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
