export const FILE_TYPES = [
  { id: 'spreadsheet', label: 'Spreadsheets' },
  { id: 'presentation', label: 'Presentations' },
  { id: 'document', label: 'Documents' },
  { id: 'pdf', label: 'PDFs' },
  { id: 'audio', label: 'Audio' },
  { id: 'image', label: 'Images' },
  { id: 'video', label: 'Videos' },
  { id: 'code', label: 'Snippets' },
]

export const SORT_OPTIONS = [
  { id: 'recent_viewed', labelKey: 'recentViewed' },
  { id: 'last_updated', labelKey: 'lastUpdated' },
] as const
