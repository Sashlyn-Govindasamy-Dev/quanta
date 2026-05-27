import { useEffect, useCallback } from 'react'
import { isDue } from '../srs.js'

export function useNotifications(notes) {
  const requestPermission = useCallback(async () => {
    if (!('Notification' in window)) return 'unsupported'
    if (Notification.permission === 'granted') return 'granted'
    const result = await Notification.requestPermission()
    return result
  }, [])

  const sendNotification = useCallback((title, body, onClick) => {
    if (Notification.permission !== 'granted') return
    const n = new Notification(title, {
      body,
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: 'quanta-review'
    })
    if (onClick) n.onclick = onClick
  }, [])

  // On app open: check due notes and notify
  useEffect(() => {
    if (!notes.length) return
    const due = notes.filter(isDue)
    if (!due.length) return

    if (Notification.permission === 'granted') {
      sendNotification(
        `Quanta — ${due.length} concept${due.length > 1 ? 's' : ''} due for review`,
        due.slice(0, 3).map(n => n.title).join(', ') + (due.length > 3 ? '...' : ''),
        () => window.focus()
      )
    }
  }, [notes.length > 0]) // fire once on load

  // Schedule a daily reminder at 9am
  useEffect(() => {
    if (Notification.permission !== 'granted') return
    const now = new Date()
    const next9am = new Date(now)
    next9am.setHours(9, 0, 0, 0)
    if (next9am <= now) next9am.setDate(next9am.getDate() + 1)
    const ms = next9am - now

    const timer = setTimeout(() => {
      const due = notes.filter(isDue)
      if (due.length > 0) {
        sendNotification(
          `Good morning! ${due.length} concept${due.length > 1 ? 's' : ''} to review`,
          'Open Quanta to keep your knowledge sharp.',
          () => window.focus()
        )
      }
    }, ms)

    return () => clearTimeout(timer)
  }, [notes])

  return { requestPermission, sendNotification }
}
