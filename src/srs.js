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

// Quiz→SRS feedback: a quiz is one signal, not a full review, so this is
// asymmetric on purpose — poor scores pull the review forward aggressively,
// strong scores extend only modestly. Returns null when no change is needed.
// Deliberately does NOT touch lastReview (that belongs to real reviews).
export function applyQuizResult(note, score) {
  let { interval, ease } = note

  if (score < 50) {
    interval = 1
    ease = Math.max(1.3, ease - 0.2)
  } else if (score < 70) {
    interval = Math.max(1, Math.round(interval * 0.5))
    ease = Math.max(1.3, ease - 0.1)
  } else if (score < 90) {
    return null // solid answer — current schedule already reflects this
  } else {
    interval = Math.max(1, Math.round(interval * 1.15))
    ease = Math.min(3.0, ease + 0.05)
  }

  return {
    interval,
    ease,
    nextReview: Date.now() + interval * 86400000
  }
}
