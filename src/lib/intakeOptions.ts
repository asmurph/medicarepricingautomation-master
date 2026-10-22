export type Option = { value: string; label: string }

const fromLabels = (labels: string[]): Option[] =>
  labels.map((label) => ({ value: label, label }))

export const requestTypeOptions = fromLabels(['Change request (CR)', 'New request', 'Correction'])
export const requestSourceOptions = fromLabels(['Internal', 'External'])
export const workTypeOptions = fromLabels(['Non-dental', 'Dental'])
export const subWorkTypeOptions = fromLabels([
  'Drugs & biologicals',
  'DMEPOS',
  'Laboratory',
  'Physician fee schedule',
  'Ambulance',
  'Preventive',
  'Restorative',
  'Prosthodontics',
])
export const jurisdictionOptions = fromLabels(['JE', 'JF', 'JH', 'JJ', 'JK', 'JL'])
export const lobOptions = fromLabels(['Part A', 'Part B', 'DME'])
export const priorityOptions = fromLabels(['High', 'Medium', 'Low'])
export const yesNoOptions = fromLabels(['No', 'Yes'])
