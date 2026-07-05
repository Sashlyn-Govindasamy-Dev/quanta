// Anthropic API helpers for Quiz mode.
// The API key is provided by the user, stored locally in IndexedDB, and only
// ever sent to api.anthropic.com.

const API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

async function callClaude(apiKey, system, userContent, maxTokens = 1200) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }]
    })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    const msg = err?.error?.message || `API error ${res.status}`
    throw new Error(msg)
  }
  const data = await res.json()
  const text = data.content.filter(b => b.type === 'text').map(b => b.text).join('\n')
  // Strip markdown fences if the model wrapped JSON in them
  const clean = text.replace(/```json|```/g, '').trim()
  return JSON.parse(clean)
}

const QUESTION_TYPES = ['recall', 'application', 'feynman', 'connection']

export function pickQuestionType(hasConnections) {
  const pool = hasConnections ? QUESTION_TYPES : QUESTION_TYPES.filter(t => t !== 'connection')
  return pool[Math.floor(Math.random() * pool.length)]
}

// Generate one question from a note
export async function generateQuestion(apiKey, note, connectedNotes, type) {
  const system = `You are a quiz generator for a personal spaced-repetition learning app. You generate ONE question at a time from the user's own study notes. Respond ONLY with valid JSON, no markdown fences, no preamble. Schema: {"question": string, "type": string, "hint": string}. The hint should be short and only nudge, never reveal the answer.`

  const typeInstructions = {
    recall: 'Generate a RECALL question testing whether they remember the core concept and key details from this note.',
    application: 'Generate an APPLICATION question presenting a realistic scenario where they must apply this concept. Make the scenario concrete and practical.',
    feynman: 'Generate a FEYNMAN question asking them to explain this concept in simple terms, as if teaching someone with no background in the field. The question should demand plain language and an analogy.',
    connection: 'Generate a CONNECTION question asking how this concept relates to one of the connected concepts listed. Test whether they understand the relationship, not just each concept in isolation.'
  }

  const userContent = `${typeInstructions[type]}

NOTE TITLE: ${note.title}
TOPIC: ${note.topic}
NOTE CONTENT:
${note.body}
${note.captures.length ? `\nUSER'S OWN INSIGHTS ON THIS NOTE:\n${note.captures.map(c => '- ' + c).join('\n')}` : ''}
${connectedNotes.length ? `\nCONNECTED CONCEPTS: ${connectedNotes.map(n => n.title).join(' | ')}` : ''}`

  const result = await callClaude(apiKey, system, userContent, 500)
  return { ...result, type, noteId: note.id }
}

// Evaluate the user's free-text answer against their own note
export async function evaluateAnswer(apiKey, note, question, userAnswer) {
  const system = `You are a rigorous but encouraging study coach evaluating a learner's answer against THEIR OWN study note. Hold them to the standard of their own note content. Respond ONLY with valid JSON, no markdown fences. Schema: {"score": number (0-100), "strengths": string, "gaps": string, "modelAnswer": string, "feynmanNote": string|null}.

Rules:
- "score": factual accuracy AND completeness vs the note. Missing a key constraint or detail from the note lowers the score.
- "strengths": what they got right, be specific.
- "gaps": exactly what was missing or wrong, referencing what their note says. If nothing, say so.
- "modelAnswer": a strong answer built from THEIR note content, in 2-4 sentences.
- "feynmanNote": ONLY for feynman-type questions — assess explanation quality separately: did they use plain language? Did unexplained jargon slip in? Was there an analogy? For other types, null.
- Be direct. Do not inflate scores. A vague answer that gestures at the idea without specifics scores 40-60.`

  const userContent = `QUESTION TYPE: ${question.type}
QUESTION: ${question.question}

THE LEARNER'S NOTE (source of truth):
TITLE: ${note.title}
${note.body}
${note.captures.length ? `\nTHEIR INSIGHTS:\n${note.captures.map(c => '- ' + c).join('\n')}` : ''}

THE LEARNER'S ANSWER:
${userAnswer}`

  return callClaude(apiKey, system, userContent, 1000)
}
