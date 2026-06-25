export const TOPIC_COLORS = {
  'Data Cloud':           { dot: '#7F77DD', bg: '#EEEDFE', text: '#3C3489' },
  'Identity Resolution':  { dot: '#1D9E75', bg: '#E1F5EE', text: '#085041' },
  'Calculated Insights':  { dot: '#BA7517', bg: '#FAEEDA', text: '#633806' },
  'Activation':           { dot: '#D85A30', bg: '#FAECE7', text: '#4A1B0C' },
  'Segmentation':         { dot: '#378ADD', bg: '#E6F1FB', text: '#0C447C' },
  'Marketing Cloud':      { dot: '#D4537E', bg: '#FBEAF0', text: '#72243E' },
  'SOQL':                 { dot: '#639922', bg: '#EAF3DE', text: '#27500A' },
}

const PALETTE = [
  { dot: '#7F77DD', bg: '#EEEDFE', text: '#3C3489' },
  { dot: '#1D9E75', bg: '#E1F5EE', text: '#085041' },
  { dot: '#D85A30', bg: '#FAECE7', text: '#4A1B0C' },
  { dot: '#378ADD', bg: '#E6F1FB', text: '#0C447C' },
  { dot: '#D4537E', bg: '#FBEAF0', text: '#72243E' },
  { dot: '#639922', bg: '#EAF3DE', text: '#27500A' },
  { dot: '#BA7517', bg: '#FAEEDA', text: '#633806' },
]

export function getTopicColor(topic) {
  if (TOPIC_COLORS[topic]) return TOPIC_COLORS[topic]
  let hash = 0
  for (let i = 0; i < topic.length; i++) hash = topic.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}

// Built-in sources — always available
export const DEFAULT_SOURCES = {
  trailhead: { icon: 'ti-cloud',       label: 'Trailhead'    },
  blog:      { icon: 'ti-article',     label: 'Blog post'    },
  sandbox:   { icon: 'ti-terminal-2',  label: 'Sandbox'      },
  thinking:  { icon: 'ti-bulb',        label: 'My thinking'  },
}

// Available icons for custom sources
export const AVAILABLE_ICONS = [
  { value: 'ti-book',          label: 'Book'          },
  { value: 'ti-video',         label: 'Video'         },
  { value: 'ti-school',        label: 'Course'        },
  { value: 'ti-headphones',    label: 'Podcast'       },
  { value: 'ti-brand-youtube', label: 'YouTube'       },
  { value: 'ti-notes',         label: 'Notes'         },
  { value: 'ti-link',          label: 'Link'          },
  { value: 'ti-presentation',  label: 'Presentation'  },
  { value: 'ti-certificate',   label: 'Certificate'   },
  { value: 'ti-message',       label: 'Discussion'    },
  { value: 'ti-tool',          label: 'Hands-on'      },
  { value: 'ti-flask',         label: 'Experiment'    },
]

// Merge default + custom sources (custom sources stored in IndexedDB settings)
export function buildSourceConfig(customSources = {}) {
  return { ...DEFAULT_SOURCES, ...customSources }
}

// Legacy export for backwards compat — components that haven't migrated yet
export const SOURCE_CONFIG = DEFAULT_SOURCES
