export type AppPage =
  | 'home'
  | 'my-work'
  | 'intake'
  | 'pricing-records'
  | 'tech-assessment'
  | 'calculations'
  | 'inquiries'
  | 'release-revisions'
  | 'workflow-data'
  | 'requirements'

export const navItems: Array<{ key: AppPage; label: string }> = [
  { key: 'home', label: 'Command Center' },
  { key: 'my-work', label: 'Work queue' },
  { key: 'intake', label: 'Open new case' },
  { key: 'pricing-records', label: 'Pricing case' },
  { key: 'tech-assessment', label: 'Technology assessment' },
  { key: 'calculations', label: 'Pricing calculations' },
  { key: 'inquiries', label: 'Inquiries & revisions' },
  { key: 'release-revisions', label: 'Release revisions' },
  { key: 'workflow-data', label: 'Workflow & data' },
  { key: 'requirements', label: 'Requirements' },
]

export const navIcons: Record<AppPage, string> = {
  home: 'M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10',
  'my-work': 'M4 7h16M4 12h16M4 17h16',
  intake: 'M12 5v14M5 12h14',
  'pricing-records': 'M12 3l9 9-9 9-9-9z',
  'tech-assessment': 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8z',
  calculations: 'M18 5H6l6 7-6 7h12',
  inquiries: 'M9 9a3 3 0 116 0c0 2-3 2-3 5M12 18v.5',
  'release-revisions': 'M20 12a8 8 0 11-3-6.2M20 4v5h-5',
  'workflow-data': 'M8 7a3 3 0 11-6 0 3 3 0 016 0zM22 17a3 3 0 11-6 0 3 3 0 016 0zM8 7h6a2 2 0 012 2v5',
  requirements: 'M5 12l5 5 9-10',
}
