import {
  Mpa_pricingrequestsstatuscode,
  type Mpa_pricingrequests,
} from '../generated/models/Mpa_pricingrequestsModel'

export type OptionMap = Record<number, string>

export function formatChoiceValue(map: OptionMap, rawValue?: number): string {
  if (rawValue === undefined || rawValue === null) {
    return '-'
  }

  return map[rawValue] ?? String(rawValue)
}

export function prettifyChoiceLabel(label: string): string {
  return label.replaceAll('_', ' ')
}

export function toOptions(map: OptionMap): Array<{ value: string; label: string }> {
  return Object.entries(map).map(([value, label]) => ({
    value,
    label: prettifyChoiceLabel(label),
  }))
}

export function formatStatus(record: Mpa_pricingrequests): string {
  if (record.statuscodename) {
    return record.statuscodename
  }

  const raw: unknown = record.statuscode
  if (raw === undefined || raw === null || raw === '') {
    return '-'
  }

  const code = Number(raw)
  if (Number.isNaN(code)) {
    return prettifyChoiceLabel(String(raw))
  }

  return prettifyChoiceLabel(formatChoiceValue(Mpa_pricingrequestsstatuscode, code))
}

export function toChoice<T extends number>(value: string): T {
  return Number(value) as T
}
