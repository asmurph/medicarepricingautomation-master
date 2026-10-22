import {
  Mpa_pricingrequestsmpa_jurisdiction,
  Mpa_pricingrequestsmpa_lob,
  Mpa_pricingrequestsmpa_priority,
  Mpa_pricingrequestsmpa_requestsource,
  Mpa_pricingrequestsmpa_requesttype,
  type Mpa_pricingrequests,
} from '../generated/models/Mpa_pricingrequestsModel'
import { formatChoiceValue, formatStatus } from '../lib/pricingRequestUtils'

type PricingRecordsPageProps = {
  records: Mpa_pricingrequests[]
  isLoading: boolean
  onRefresh: () => void
  onCreateNew: () => void
}

function PricingRecordsPage({
  records,
  isLoading,
  onRefresh,
  onCreateNew,
}: PricingRecordsPageProps) {
  return (
    <section className="card" aria-label="Pricing request records grid">
      <div className="card-header">
        <h2>Pricing Request Records</h2>
        <div>
          <button className="secondary" type="button" onClick={onRefresh}>
            Refresh
          </button>{' '}
          <button className="primary" type="button" onClick={onCreateNew}>
            Create New Request
          </button>
        </div>
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
                <th>Source</th>
                <th>Jurisdiction</th>
                <th>LOB</th>
                <th>Priority</th>
                <th>Effective Date</th>
                <th>Status</th>
                <th>Requested By</th>
              </tr>
            </thead>
            <tbody>
              {records.length === 0 ? (
                <tr>
                  <td colSpan={10} className="empty-row">
                    No pricing requests found.
                  </td>
                </tr>
              ) : (
                records.map((record) => (
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
                        Mpa_pricingrequestsmpa_requestsource,
                        record.mpa_requestsource,
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
                    <td>{record.mpa_requestedbyname || '-'}</td>
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

export default PricingRecordsPage
