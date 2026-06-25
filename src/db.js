import { openDB } from 'idb'

const DB_NAME = 'quanta-db'
const DB_VERSION = 1

export async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('notes')) {
        const notes = db.createObjectStore('notes', { keyPath: 'id' })
        notes.createIndex('topic', 'topic')
        notes.createIndex('nextReview', 'nextReview')
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' })
      }
    }
  })
}

export async function getAllNotes() {
  const db = await getDB()
  return db.getAll('notes')
}

export async function getNote(id) {
  const db = await getDB()
  return db.get('notes', id)
}

export async function saveNote(note) {
  const db = await getDB()
  return db.put('notes', note)
}

export async function deleteNote(id) {
  const db = await getDB()
  return db.delete('notes', id)
}

export async function getDueNotes() {
  const db = await getDB()
  const all = await db.getAll('notes')
  return all.filter(n => n.nextReview <= Date.now())
}

export async function getSetting(key) {
  const db = await getDB()
  const row = await db.get('settings', key)
  return row?.value
}

export async function setSetting(key, value) {
  const db = await getDB()
  return db.put('settings', { key, value })
}

// ── Custom sources ────────────────────────────────────────────────────────────
const CUSTOM_SOURCES_KEY = 'customSources'

export async function getCustomSources() {
  const data = await getSetting(CUSTOM_SOURCES_KEY)
  return data || {}
}

export async function saveCustomSource(key, label, icon) {
  const existing = await getCustomSources()
  existing[key] = { label, icon }
  await setSetting(CUSTOM_SOURCES_KEY, existing)
  return existing
}

export async function deleteCustomSource(key) {
  const existing = await getCustomSources()
  delete existing[key]
  await setSetting(CUSTOM_SOURCES_KEY, existing)
  return existing
}

// ── Backup / restore ──────────────────────────────────────────────────────────
export async function exportData() {
  const notes = await getAllNotes()
  const customSources = await getCustomSources()
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), notes, customSources }, null, 2)
}

export async function importData(jsonString) {
  const data = JSON.parse(jsonString)
  if (!data.notes || !Array.isArray(data.notes)) throw new Error('Invalid backup file')
  const db = await getDB()
  const tx = db.transaction('notes', 'readwrite')
  await Promise.all(data.notes.map(n => tx.store.put(n)))
  await tx.done
  // Restore custom sources if present in backup
  if (data.customSources) {
    await setSetting(CUSTOM_SOURCES_KEY, data.customSources)
  }
  return data.notes.length
}

export const SEED_NOTES = [
  {
    id: 1, topic: 'Data Cloud', title: 'What is Data Cloud?',
    body: `Data Cloud is Salesforce's customer data platform (CDP). At its core, it solves a single problem: you have customer data scattered across multiple systems — CRM, website, email, support tickets — and you need one unified view of each person.\n\nThink of it as a giant assembler. It ingests data from streams, maps it to standard objects (DMOs), resolves identity across all records, and then lets you build segments and insights on top of that unified profile.`,
    source: 'trailhead', connections: [2, 3],
    created: Date.now() - 864000000, lastReview: Date.now() - 172800000,
    interval: 3, ease: 2.5, nextReview: Date.now() - 86400000,
    captures: ['First principles: it\'s just a big join table that stays up to date in real time.']
  },
  {
    id: 2, topic: 'Identity Resolution', title: 'Identity Resolution — the core idea',
    body: `Identity resolution answers one question: are these two records the same person?\n\nYou might have sarah@gmail.com in your CRM and sarah.jones@work.com on your website. Same Sarah? Identity resolution uses match rules — name + phone, or name + address — to decide yes, and creates a unified individual record that links both.\n\nWithout it, your segmentation is broken. You'd think you have two people when you have one, and you'd send duplicate communications.`,
    source: 'blog', connections: [1, 3],
    created: Date.now() - 604800000, lastReview: Date.now() - 432000000,
    interval: 5, ease: 2.3, nextReview: Date.now() + 86400000,
    captures: ['It\'s just deduplication with probability scoring behind it.']
  },
  {
    id: 3, topic: 'Calculated Insights', title: 'Calculated Insights — SQL on unified data',
    body: `A Calculated Insight (CI) is a SQL query you write against your unified Data Cloud objects. The output becomes a persistent metric attached to a profile or segment.\n\nExample: count all Tasks completed in the last 30 days per Lead. That number becomes a field on the Lead's unified profile — engagement_score — and you can use it in segments or write it back to CRM.\n\nKey constraint in Simple Start: you can't query standard ssot__ DMOs directly. You need to use the custom DLL objects mapped to your ingested data.`,
    source: 'sandbox', connections: [1, 4],
    created: Date.now() - 432000000, lastReview: Date.now() - 86400000,
    interval: 2, ease: 2.1, nextReview: Date.now(),
    captures: [
      'CI = a saved SQL query whose result gets stored as a field on the unified profile.',
      'Simple Start restriction: use Task_Home__dll, not ssot__TaskActivity__dlm'
    ]
  },
  {
    id: 4, topic: 'Activation', title: 'Activation — writing Data Cloud insights back to CRM',
    body: `After you've built a segment or calculated insight, activation is how you actually use the data.\n\nActivation Target: a destination you configure — for example, the Lead object in Salesforce CRM. You map fields from the CI output to CRM fields, then the activation job runs and writes the values back.\n\nThis is the last mile. Without activation, all your work stays inside Data Cloud and never affects what your sales or marketing teams see.`,
    source: 'trailhead', connections: [3, 5],
    created: Date.now() - 259200000, lastReview: null,
    interval: 1, ease: 2.5, nextReview: Date.now(),
    captures: []
  },
  {
    id: 5, topic: 'Segmentation', title: 'Segments — slicing unified profiles into audiences',
    body: `A segment is a filter on your unified profiles. "All leads with engagement score greater than 5 AND last activity within 30 days." The segment auto-updates as data changes.\n\nYou publish a segment to an Activation Target. That's the bridge between defining an audience and doing something with them in a downstream system like Marketing Cloud or Salesforce CRM.`,
    source: 'trailhead', connections: [2, 4],
    created: Date.now() - 172800000, lastReview: null,
    interval: 1, ease: 2.5, nextReview: Date.now() + 3600000,
    captures: []
  }
]
