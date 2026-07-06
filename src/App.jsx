import { useState, useEffect, useRef } from 'react'
import { useNotes } from './hooks/useNotes.js'
import { useNotifications } from './hooks/useNotifications.js'
import { useAutoBackup } from './hooks/useAutoBackup.js'
import { Sidebar } from './components/Sidebar.jsx'
import { NoteView } from './components/NoteView.jsx'
import { ReviewPanel } from './components/ReviewPanel.jsx'
import { GraphPanel } from './components/GraphPanel.jsx'
import { CapturePanel } from './components/CapturePanel.jsx'
import { ProgressPanel } from './components/ProgressPanel.jsx'
import { QuizPanel } from './components/QuizPanel.jsx'
import { NewNoteModal } from './components/NewNoteModal.jsx'
import { DueReviewBanner } from './components/DueReviewBanner.jsx'
import { Toast, useToast } from './components/Toast.jsx'
import { isDue } from './srs.js'
import { buildSourceConfig } from './config.js'
import { getCustomSources, saveCustomSource, deleteCustomSource } from './db.js'

const TABS = [
  { id: 'notes',    icon: 'ti-notes',             label: 'Notes'    },
  { id: 'review',   icon: 'ti-brain',             label: 'Review'   },
  { id: 'quiz',     icon: 'ti-messages-question',  label: 'Quiz'     },
  { id: 'graph',    icon: 'ti-vector-triangle',   label: 'Graph'    },
  { id: 'capture',  icon: 'ti-bulb',              label: 'Capture'  },
  { id: 'progress', icon: 'ti-chart-line',        label: 'Progress' },
]

export default function App() {
  const { notes, loading, addNote, updateNote, removeNote, rateRecall, addCapture, addConnection, removeConnection, applyQuizScore, reload } = useNotes()
  const { requestPermission } = useNotifications(notes)
  const autoBackup = useAutoBackup()
  const toast = useToast()

  const [tab, setTab] = useState('notes')
  const [activeNoteId, setActiveNoteId] = useState(null)
  const [showNewNote, setShowNewNote] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  const [notifPrompted, setNotifPrompted] = useState(false)
  const [customSources, setCustomSources] = useState({})

  // Load custom sources from IndexedDB
  useEffect(() => {
    getCustomSources().then(setCustomSources)
  }, [])

  const sourceConfig = buildSourceConfig(customSources)

  const handleAddSource = async (key, label, icon) => {
    const updated = await saveCustomSource(key, label, icon)
    setCustomSources(updated)
  }

  const handleDeleteSource = async (key) => {
    const updated = await deleteCustomSource(key)
    setCustomSources(updated)
  }

  // Set first note as active on load
  useEffect(() => {
    if (notes.length && !activeNoteId) setActiveNoteId(notes[0].id)
  }, [notes.length])

  // Trigger auto-backup on app open once notes are loaded
  useEffect(() => {
    if (notes.length) autoBackup.runAutoBackup(notes.length)
  }, [notes.length > 0])

  // Backup on every note change (add/edit/review/capture/connection) —
  // debounced 1.5s so rapid edits produce one write, skips the initial load
  const notesInitializedRef = useRef(false)
  useEffect(() => {
    if (loading) return
    if (!notesInitializedRef.current) {
      notesInitializedRef.current = true
      return
    }
    const t = setTimeout(() => autoBackup.backupOnChange(), 1500)
    return () => clearTimeout(t)
  }, [notes])

  // Prompt for notifications once
  useEffect(() => {
    if (!notes.length || notifPrompted) return
    if (Notification.permission === 'default' && notes.filter(isDue).length > 0) {
      setNotifPrompted(true)
      setTimeout(() => requestPermission(), 2000)
    }
  }, [notes.length])

  const handleSelectNote = (id) => {
    setActiveNoteId(id)
    setTab('notes')
  }

  const handleNewNote = async (data) => {
    const note = await addNote(data)
    setActiveNoteId(note.id)
    setTab('notes')
  }

  const handleDeleteNote = async (id) => {
    await removeNote(id)
    const remaining = notes.filter(n => n.id !== id)
    setActiveNoteId(remaining.length ? remaining[0].id : null)
  }

  const activeNote = notes.find(n => n.id === activeNoteId)
  const topics = [...new Set(notes.map(n => n.topic))].sort()
  const dueCount = notes.filter(isDue).length

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--purple-400)', animation: 'pulse 1s infinite' }} />
      <style>{`@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.8)} }`}</style>
      <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Loading Quanta...</span>
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      {/* Topbar */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 16px', height: 48, borderBottom: '0.5px solid var(--border)',
        background: 'var(--bg-primary)', flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="20" height="20" viewBox="0 0 32 32" aria-hidden="true">
            <circle cx="16" cy="16" r="5" fill="var(--purple-400)"/>
            <circle cx="16" cy="4" r="2.5" fill="var(--purple-200)"/>
            <circle cx="16" cy="28" r="2.5" fill="var(--purple-200)"/>
            <circle cx="4" cy="16" r="2.5" fill="var(--purple-200)"/>
            <circle cx="28" cy="16" r="2.5" fill="var(--purple-200)"/>
            <line x1="16" y1="11" x2="16" y2="6.5" stroke="var(--purple-400)" strokeWidth="1.5"/>
            <line x1="16" y1="21" x2="16" y2="25.5" stroke="var(--purple-400)" strokeWidth="1.5"/>
            <line x1="11" y1="16" x2="6.5" y2="16" stroke="var(--purple-400)" strokeWidth="1.5"/>
            <line x1="21" y1="16" x2="25.5" y2="16" stroke="var(--purple-400)" strokeWidth="1.5"/>
          </svg>
          <span style={{ fontWeight: 500, fontSize: 15 }}>Quanta</span>
        </div>

        <nav style={{ display: 'flex', gap: 2 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
              borderRadius: 'var(--radius-md)', border: '0.5px solid transparent',
              background: tab === t.id ? 'var(--bg-secondary)' : 'transparent',
              borderColor: tab === t.id ? 'var(--border)' : 'transparent',
              fontSize: 13, fontWeight: tab === t.id ? 500 : 400,
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              position: 'relative'
            }}>
              <i className={`ti ${t.icon}`} aria-hidden="true" style={{ fontSize: 15 }} />
              {t.label}
              {t.id === 'review' && dueCount > 0 && (
                <span style={{
                  position: 'absolute', top: 2, right: 2, width: 7, height: 7,
                  borderRadius: '50%', background: 'var(--amber-200)'
                }} />
              )}
            </button>
          ))}
        </nav>

        <div style={{ width: 120 }} />
      </header>

      {/* Due banner */}
      {!bannerDismissed && (
        <DueReviewBanner
          notes={notes}
          onGoToReview={() => { setTab('review'); setBannerDismissed(true) }}
          onDismiss={() => setBannerDismissed(true)}
        />
      )}

      {/* Main */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {tab === 'notes' && (
          <Sidebar
            notes={notes}
            activeId={activeNoteId}
            onSelect={handleSelectNote}
            onNew={() => setShowNewNote(true)}
          />
        )}

        <main style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-primary)' }}>
          {tab === 'notes' && (
            activeNote
              ? <NoteView
                  note={activeNote}
                  notes={notes}
                  sourceConfig={sourceConfig}
                  onUpdate={updateNote}
                  onAddCapture={addCapture}
                  onAddConnection={addConnection}
                  onRemoveConnection={removeConnection}
                  onDelete={handleDeleteNote}
                  onSwitchTab={setTab}
                />
              : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-tertiary)', flexDirection: 'column', gap: 12 }}>
                  <i className="ti ti-notes" aria-hidden="true" style={{ fontSize: 40 }} />
                  <p style={{ fontSize: 14 }}>Select a note or create your first one</p>
                  <button onClick={() => setShowNewNote(true)} style={{
                    padding: '8px 20px', background: 'var(--purple-600)', color: '#fff',
                    border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500
                  }}>New note</button>
                </div>
          )}
          {tab === 'review' && <ReviewPanel notes={notes} sourceConfig={sourceConfig} onRate={rateRecall} />}
          {tab === 'quiz' && <QuizPanel notes={notes} onQuizScore={applyQuizScore} />}
          {tab === 'graph' && <GraphPanel notes={notes} onSelectNote={handleSelectNote} />}
          {tab === 'capture' && <CapturePanel notes={notes} sourceConfig={sourceConfig} onAddNote={handleNewNote} onAddCapture={addCapture} onSelectNote={handleSelectNote} onSwitchTab={setTab} />}
          {tab === 'progress' && <ProgressPanel notes={notes} sourceConfig={sourceConfig} onAddSource={handleAddSource} onDeleteSource={handleDeleteSource} customSources={customSources} onReload={reload} autoBackup={autoBackup} />}
        </main>
      </div>

      {showNewNote && (
        <NewNoteModal
          existingTopics={topics}
          sourceConfig={sourceConfig}
          onSave={handleNewNote}
          onClose={() => setShowNewNote(false)}
        />
      )}

      <Toast toast={toast} />
    </div>
  )
}
