import { useMemo } from 'react'
import {
  Mpa_pricingrequestsmpa_priority,
  Mpa_pricingrequestsmpa_requesttype,
  type Mpa_pricingrequests,
} from '../generated/models/Mpa_pricingrequestsModel'
import { formatChoiceValue, formatStatus, prettifyChoiceLabel } from '../lib/pricingRequestUtils'
import type { AppPage } from '../navigation'

type CommandCenterPageProps = {
  records: Mpa_pricingrequests[]
  isLoading: boolean
  onNavigate: (page: AppPage) => void
}

const CLOSED_STATUSES = new Set([2, 514200004])
const PENDING_APPROVAL_STATUS = 514200003
const HIGH_PRIORITY = 514200000
const DEADLINE_WINDOW_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

function startOfToday(): number {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

function parseDate(value?: string): number | null {
  if (!value) {
    return null
  }

  const time = new Date(value).getTime()
  return Number.isNaN(time) ? null : time
}

function formatShortDate(time: number): string {
  return new Date(time).toLocaleDateString(undefined, { month: 'short', day: '2-digit' })
}

function priorityClass(priority?: number): string {
  if (priority === HIGH_PRIORITY) {
    return 'pill pill-high'
  }
  return priority === undefined ? 'pill' : 'pill pill-medium'
}

function CommandCenterPage({ records, isLoading, onNavigate }: CommandCenterPageProps) {
  const metrics = useMemo(() => {
    const today = startOfToday()
    const open = records.filter((record) => !CLOSED_STATUSES.has(Number(record.statuscode)))

    const dueSoon = open.filter((record) => {
      const due = parseDate(record.mpa_duedate)
      return due !== null && due >= today && due <= today + 14 * DAY_MS
    })

    const pendingApproval = open.filter(
      (record) => Number(record.statuscode) === PENDING_APPROVAL_STATUS,
    )

    const highPriority = open.filter((record) => Number(record.mpa_priority) === HIGH_PRIORITY)

    return { open, dueSoon, pendingApproval, highPriority }
  }, [records])

  const stages = useMemo(() => {
    const counts = new Map<string, number>()
    metrics.open.forEach((record) => {
      const label = formatStatus(record)
      counts.set(label, (counts.get(label) ?? 0) + 1)
    })

    return Array.from(counts.entries()).sort((left, right) => right[1] - left[1])
  }, [metrics.open])

  const maxStageCount = stages.reduce((max, [, count]) => Math.max(max, count), 0)

  const deadlines = useMemo(() => {
    const today = startOfToday()

    return metrics.open
      .map((record) => ({ record, due: parseDate(record.mpa_duedate) }))
      .filter(
        (item): item is { record: Mpa_pricingrequests; due: number } =>
          item.due !== null && item.due >= today && item.due <= today + DEADLINE_WINDOW_DAYS * DAY_MS,
      )
      .sort((left, right) => left.due - right.due)
      .slice(0, 3)
  }, [metrics.open])

  const priorityWork = useMemo(
    () =>
      [...metrics.open]
        .sort((left, right) => {
          const leftDue = parseDate(left.mpa_duedate) ?? Number.MAX_SAFE_INTEGER
          const rightDue = parseDate(right.mpa_duedate) ?? Number.MAX_SAFE_INTEGER
          return leftDue - rightDue
        })
        .slice(0, 5),
    [metrics.open],
  )

  const today = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const stats = [
    { label: 'Open workload', value: metrics.open.length, note: 'Active pricing cases' },
    { label: 'Due within 14 days', value: metrics.dueSoon.length, note: 'Based on due date' },
    { label: 'Pending approval', value: metrics.pendingApproval.length, note: 'Awaiting approval' },
    {
      label: 'High priority',
      value: metrics.highPriority.length,
      note: 'Review needed',
      alert: metrics.highPriority.length > 0,
    },
  ]

  return (
    <div className="command-center" aria-label="Pricing command center">
      <div className="cc-heading">
        <div>
          <p className="cc-date">{today}</p>
          <h2>Pricing command center</h2>
          <p className="cc-subtitle">Operational readiness across active Medicare pricing work.</p>
        </div>
        <button className="primary" type="button" onClick={() => onNavigate('intake')}>
          + New pricing case
        </button>
      </div>

      {isLoading ? <p className="status-text">Loading records...</p> : null}

      <div className="cc-stats">
        {stats.map((stat) => (
          <article className="cc-panel cc-stat" key={stat.label}>
            <p className="cc-stat-label">{stat.label}</p>
            <p className="cc-stat-value">{stat.value}</p>
            <p className={stat.alert ? 'cc-stat-note alert' : 'cc-stat-note'}>{stat.note}</p>
          </article>
        ))}
      </div>

      <div className="cc-columns">
        <section className="cc-panel">
          <div className="cc-panel-head">
            <div>
              <h3>Workload by stage</h3>
              <p>Active cases and current bottlenecks</p>
            </div>
            <button className="secondary" type="button" onClick={() => onNavigate('my-work')}>
              View queue
            </button>
          </div>
          {stages.length === 0 ? (
            <p className="cc-empty">No active cases.</p>
          ) : (
            <ul className="cc-stages">
              {stages.map(([label, count]) => (
                <li key={label}>
                  <span>{prettifyChoiceLabel(label)}</span>
                  <div className="cc-bar">
                    <div style={{ width: `${(count / maxStageCount) * 100}%` }} />
                  </div>
                  <strong>{count}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="cc-panel">
          <div className="cc-panel-head">
            <div>
              <h3>Upcoming deadlines</h3>
              <p>Next {DEADLINE_WINDOW_DAYS} days</p>
            </div>
          </div>
          {deadlines.length === 0 ? (
            <p className="cc-empty">No upcoming deadlines.</p>
          ) : (
            <ul className="cc-deadlines">
              {deadlines.map(({ record, due }) => (
                <li key={record.mpa_pricingrequestid}>
                  <div className="cc-date-chip">{formatShortDate(due)}</div>
                  <div className="cc-deadline-text">
                    <strong>{record.mpa_description || record.mpa_name || 'Pricing case'}</strong>
                    <span>
                      {prettifyChoiceLabel(
                        formatChoiceValue(Mpa_pricingrequestsmpa_requesttype, record.mpa_requesttype),
                      )}
                    </span>
                  </div>
                  <span className={priorityClass(record.mpa_priority)}>
                    {formatChoiceValue(Mpa_pricingrequestsmpa_priority, record.mpa_priority)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="cc-panel">
        <div className="cc-panel-head">
          <div>
            <h3>Priority work</h3>
            <p>Cases requiring action or attention</p>
          </div>
          <button className="secondary" type="button" onClick={() => onNavigate('pricing-records')}>
            View all
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Case</th>
                <th>Work item</th>
                <th>Requested by</th>
                <th>Due</th>
                <th>Status</th>
                <th>Priority</th>
              </tr>
            </thead>
            <tbody>
              {priorityWork.length === 0 ? (
                <tr>
                  <td colSpan={6} className="empty-row">
                    No active cases.
                  </td>
                </tr>
              ) : (
                priorityWork.map((record) => {
                  const due = parseDate(record.mpa_duedate)
                  return (
                    <tr key={record.mpa_pricingrequestid}>
                      <td>{record.mpa_name || '-'}</td>
                      <td>{record.mpa_description}</td>
                      <td>{record.mpa_requestedbyname || '-'}</td>
                      <td>{due === null ? '-' : formatShortDate(due)}</td>
                      <td>
                        <span className="pill pill-status">{formatStatus(record)}</span>
                      </td>
                      <td>
                        <span className={priorityClass(record.mpa_priority)}>
                          {formatChoiceValue(Mpa_pricingrequestsmpa_priority, record.mpa_priority)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

export default CommandCenterPage
