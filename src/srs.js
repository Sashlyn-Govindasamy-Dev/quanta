// SM-2 spaced repetition algorithm
// quality: 0=forgot, 1=hard, 2=ok, 3=easy

export function calculateNextReview(note, quality) {
  let { interval, ease } = note

  if (quality === 0) {
    interval = 1
    ease = Math.max(1.3, ease - 0.2)
  } else if (quality === 1) {
    interval = Math.max(1, Math.round(interval * 1.2))
    ease = Math.max(1.3, ease - 0.15)
  } else if (quality === 2) {
    interval = Math.max(1, Math.round(interval * ease))
    // ease unchanged
  } else {
    interval = Math.max(1, Math.round(interval * ease * 1.3))
    ease = Math.min(3.0, ease + 0.15)
  }

  return {
    interval,
    ease,
    lastReview: Date.now(),
    nextReview: Date.now() + interval * 86400000
  }
}

export function getRetentionPercent(note) {
  if (!note.lastReview) return 15
  const daysSince = (Date.now() - note.lastReview) / 86400000
  // Ebbinghaus forgetting curve: R = e^(-t / (S * ease))
  const stability = note.interval * note.ease
  return Math.max(0, Math.round(100 * Math.exp(-daysSince / stability)))
}

export function isDue(note) {
  return note.nextReview <= Date.now()
}

export function getDaysUntilReview(note) {
  const ms = note.nextReview - Date.now()
  return Math.ceil(ms / 86400000)
}
