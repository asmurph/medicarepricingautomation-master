import { useMemo, useState } from 'react'
import {
  Mpa_pricingrequestsmpa_jurisdiction,
  Mpa_pricingrequestsmpa_lob,
  Mpa_pricingrequestsmpa_priority,
  Mpa_pricingrequestsmpa_requesttype,
  type Mpa_pricingrequests,
} from '../generated/models/Mpa_pricingrequestsModel'
import { formatChoiceValue, formatStatus } from '../lib/pricingRequestUtils'

type MyWorkPageProps = {
  records: Mpa_pricingrequests[]
  isLoading: boolean
}

function MyWorkPage({ records, isLoading }: MyWorkPageProps) {
  const [requestedBy, setRequestedBy] = useState<string>('')

  const requestedByOptions = useMemo(() => {
    return Array.from(
      new Set(
        records
          .map((record) => record.mpa_requestedbyname?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((left, right) => left.localeCompare(right))
  }, [records])

  const selectedRequestedBy = requestedBy || requestedByOptions[0] || ''

  const myWorkRecords = useMemo(() => {
    if (!selectedRequestedBy) {
      return []
    }

    return records.filter(
      (record) => (record.mpa_requestedbyname ?? '').trim() === selectedRequestedBy,
    )
  }, [records, selectedRequestedBy])

  return (
    <section className="card" aria-label="My Work page">
      <div className="card-header">
        <h2>My Work</h2>
      </div>

      <div className="my-work-toolbar">
        <label>
          Requested By
          <select value={selectedRequestedBy} onChange={(event) => setRequestedBy(event.target.value)}>
            {requestedByOptions.length === 0 ? <option value="">No users found</option> : null}
            {requestedByOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? (
        <p className="status-text">Loading records...</p>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Request Type</th>
                <th>Jurisdiction</th>
                <th>LOB</th>
                <th>Priority</th>
                <th>Effective Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myWorkRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="empty-row">
                    No records found for this Requested By value.
                  </td>
                </tr>
              ) : (
                myWorkRecords.map((record) => (
                  <tr key={record.mpa_pricingrequestid}>
                    <td>{record.mpa_name || '-'}</td>
                    <td>{record.mpa_description}</td>
                    <td>
                      {formatChoiceValue(
                        Mpa_pricingrequestsmpa_requesttype,
                        record.mpa_requesttype,
                      )}
                    </td>
                    <td>
                      {formatChoiceValue(
                        Mpa_pricingrequestsmpa_jurisdiction,
                        record.mpa_jurisdiction,
                      )}
                    </td>
                    <td>{formatChoiceValue(Mpa_pricingrequestsmpa_lob, record.mpa_lob)}</td>
                    <td>
                      {formatChoiceValue(Mpa_pricingrequestsmpa_priority, record.mpa_priority)}
                    </td>
                    <td>{record.mpa_effectivedate}</td>
                    <td>{formatStatus(record)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default MyWorkPage
