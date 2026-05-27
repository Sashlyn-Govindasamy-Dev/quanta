import { useState, useEffect, useCallback } from 'react'
import { getAllNotes, saveNote, deleteNote, getSetting, setSetting, SEED_NOTES } from '../db.js'
import { calculateNextReview } from '../srs.js'

export function useNotes() {
  const [notes, setNotes] = useState([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    let all = await getAllNotes()
    if (all.length === 0) {
      // Seed with starter notes
      for (const note of SEED_NOTES) await saveNote(note)
      all = SEED_NOTES
    }
    setNotes(all)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const addNote = useCallback(async (note) => {
    const newNote = {
      id: Date.now(),
      interval: 1,
      ease: 2.5,
      lastReview: null,
      nextReview: Date.now() + 86400000,
      connections: [],
      captures: [],
      created: Date.now(),
      ...note
    }
    await saveNote(newNote)
    setNotes(prev => [...prev, newNote])
    return newNote
  }, [])

  const updateNote = useCallback(async (id, updates) => {
    setNotes(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, ...updates } : n)
      const note = updated.find(n => n.id === id)
      if (note) saveNote(note)
      return updated
    })
  }, [])

  const removeNote = useCallback(async (id) => {
    await deleteNote(id)
    // Remove from other notes' connections
    setNotes(prev => {
      const updated = prev
        .filter(n => n.id !== id)
        .map(n => ({ ...n, connections: n.connections.filter(c => c !== id) }))
      updated.forEach(n => saveNote(n))
      return updated
    })
  }, [])

  const rateRecall = useCallback(async (id, quality) => {
    setNotes(prev => {
      const note = prev.find(n => n.id === id)
      if (!note) return prev
      const srsUpdate = calculateNextReview(note, quality)
      const updated = prev.map(n => n.id === id ? { ...n, ...srsUpdate } : n)
      const updatedNote = updated.find(n => n.id === id)
      saveNote(updatedNote)
      return updated
    })
  }, [])

  const addCapture = useCallback(async (noteId, text) => {
    setNotes(prev => {
      const updated = prev.map(n =>
        n.id === noteId ? { ...n, captures: [...n.captures, text] } : n
      )
      const note = updated.find(n => n.id === noteId)
      if (note) saveNote(note)
      return updated
    })
  }, [])

  const addConnection = useCallback(async (fromId, toId) => {
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === fromId && !n.connections.includes(toId))
          return { ...n, connections: [...n.connections, toId] }
        if (n.id === toId && !n.connections.includes(fromId))
          return { ...n, connections: [...n.connections, fromId] }
        return n
      })
      updated.forEach(n => saveNote(n))
      return updated
    })
  }, [])

  const removeConnection = useCallback(async (fromId, toId) => {
    setNotes(prev => {
      const updated = prev.map(n => {
        if (n.id === fromId) return { ...n, connections: n.connections.filter(c => c !== toId) }
        if (n.id === toId) return { ...n, connections: n.connections.filter(c => c !== fromId) }
        return n
      })
      updated.forEach(n => saveNote(n))
      return updated
    })
  }, [])

  return {
    notes, loading,
    addNote, updateNote, removeNote,
    rateRecall, addCapture,
    addConnection, removeConnection,
    reload: load
  }
}
