import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { getContext } from '@microsoft/power-apps/app'
import { SystemusersService } from './generated/services/SystemusersService'
import { Mpa_pricingrequestsService } from './generated/services/Mpa_pricingrequestsService'
import {
  Mpa_pricingrequestsmpa_jurisdiction,
  Mpa_pricingrequestsmpa_lob,
  Mpa_pricingrequestsmpa_priority,
  Mpa_pricingrequestsmpa_requestsource,
  Mpa_pricingrequestsmpa_requesttype,
  Mpa_pricingrequestsmpa_subworktype,
  Mpa_pricingrequestsmpa_worktype,
  type Mpa_pricingrequests,
  type Mpa_pricingrequestsBase,
  type Mpa_pricingrequestsmpa_jurisdiction as JurisdictionChoice,
  type Mpa_pricingrequestsmpa_lob as LobChoice,
  type Mpa_pricingrequestsmpa_priority as PriorityChoice,
  type Mpa_pricingrequestsmpa_requestsource as RequestSourceChoice,
  type Mpa_pricingrequestsmpa_requesttype as RequestTypeChoice,
  type Mpa_pricingrequestsmpa_subworktype as SubWorkTypeChoice,
  type Mpa_pricingrequestsmpa_worktype as WorkTypeChoice,
} from './generated/models/Mpa_pricingrequestsModel'

type AppPage =
  | 'home'
  | 'my-work'
  | 'intake'
  | 'pricing-records'
  | 'change-requests'
  | 'reports'
  | 'documents'
  | 'meetings'
  | 'inquiries'
  | 'admin'

type OptionMap = Record<number, string>

type FormState = {
  name: string
  description: string
  effectiveDate: string
  dueDate: string
  requestType: string
  requestSource: string
  workType: string
  subWorkType: string
  jurisdiction: string
  lob: string
  priority: string
  requestedByUserId: string
  ownerUserId: string
}

const navItems: Array<{ key: AppPage; label: string }> = [
  { key: 'home', label: 'Home' },
  { key: 'my-work', label: 'My Work' },
  { key: 'intake', label: 'Intake' },
  { key: 'pricing-records', label: 'Pricing Records' },
  { key: 'change-requests', label: 'Change Requests' },
  { key: 'reports', label: 'Reports' },
  { key: 'documents', label: 'Documents' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'inquiries', label: 'Inquiries' },
  { key: 'admin', label: 'Admin' },
]

const defaultFormState: FormState = {
  name: '',
  description: '',
  effectiveDate: '',
  dueDate: '',
  requestType: '',
  requestSource: '514200000',
  workType: '514200000',
  subWorkType: '514200000',
  jurisdiction: '514200005',
  lob: '514200001',
  priority: '514200001',
  requestedByUserId: '',
  ownerUserId: '',
}

const guidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formatChoiceValue(map: OptionMap, rawValue?: number): string {
  if (rawValue === undefined || rawValue === null) {
    return '-'
  }

  return map[rawValue] ?? String(rawValue)
}

function prettifyChoiceLabel(label: string): string {
  return label.replaceAll('_', ' ')
}

function toOptions(map: OptionMap): Array<{ value: string; label: string }> {
  return Object.entries(map).map(([value, label]) => ({
    value,
    label: prettifyChoiceLabel(label),
  }))
}

function toChoice<T extends number>(value: string): T {
  return Number(value) as T
}

function App() {
  const [activePage, setActivePage] = useState<AppPage>('home')
  const [records, setRecords] = useState<Mpa_pricingrequests[]>([])
  const [myWorkRequestedBy, setMyWorkRequestedBy] = useState<string>('')
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [formState, setFormState] = useState<FormState>(defaultFormState)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const requestTypeOptions = useMemo(
    () => toOptions(Mpa_pricingrequestsmpa_requesttype),
    [],
  )
  const requestSourceOptions = useMemo(
    () => toOptions(Mpa_pricingrequestsmpa_requestsource),
    [],
  )
  const workTypeOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_worktype), [])
  const subWorkTypeOptions = useMemo(
    () => toOptions(Mpa_pricingrequestsmpa_subworktype),
    [],
  )
  const jurisdictionOptions = useMemo(
    () => toOptions(Mpa_pricingrequestsmpa_jurisdiction),
    [],
  )
  const lobOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_lob), [])
  const priorityOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_priority), [])
  const requestedByOptions = useMemo(() => {
    return Array.from(
      new Set(
        records
          .map((record) => record.mpa_requestedbyname?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((left, right) => left.localeCompare(right))
  }, [records])

  const myWorkRecords = useMemo(() => {
    if (!myWorkRequestedBy) {
      return []
    }

    return records.filter(
      (record) => (record.mpa_requestedbyname ?? '').trim() === myWorkRequestedBy,
    )
  }, [records, myWorkRequestedBy])

  const loadRecords = useCallback(async () => {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const response = await Mpa_pricingrequestsService.getAll({
        top: 50,
        orderBy: ['createdon desc'],
      })

      if (!response.success) {
        throw response.error ?? new Error('Unable to load pricing requests.')
      }

      setRecords(response.data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load records.'
      setErrorMessage(message)
      setRecords([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadRecords()
  }, [loadRecords])

  useEffect(() => {
    let cancelled = false

    const loadCurrentUser = async () => {
      try {
        const { user } = await getContext()
        let systemUserId = user.systemUserId?.trim() ?? ''

        const lookups: string[] = []
        if (user.objectId) {
          lookups.push(`azureactivedirectoryobjectid eq ${user.objectId}`)
        }
        if (user.userPrincipalName) {
          const upn = user.userPrincipalName.replaceAll("'", "''")
          lookups.push(`domainname eq '${upn}'`, `internalemailaddress eq '${upn}'`)
        }

        for (const filter of lookups) {
          if (systemUserId) {
            break
          }
          const result = await SystemusersService.getAll({
            select: ['systemuserid'],
            filter,
            top: 1,
          })
          if (result.success) {
            systemUserId = result.data[0]?.systemuserid ?? ''
          } else {
            console.warn('Systemuser lookup failed', filter, result.error)
          }
        }

        if (cancelled || !systemUserId) {
          if (!systemUserId) {
            console.warn('Could not resolve current user systemuser id', user)
          }
          return
        }

        setCurrentUserName(user.fullName ?? '')
        setFormState((current) =>
          current.requestedByUserId
            ? current
            : { ...current, requestedByUserId: systemUserId },
        )
      } catch (error) {
        console.warn('Unable to load current user', error)
      }
    }

    void loadCurrentUser()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!myWorkRequestedBy && requestedByOptions.length > 0) {
      setMyWorkRequestedBy(requestedByOptions[0])
    }
  }, [myWorkRequestedBy, requestedByOptions])

  const onFieldChange = (field: keyof FormState, value: string) => {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  const onSubmitNewRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    const requestedById = formState.requestedByUserId.trim()
    const ownerId = formState.ownerUserId.trim() || requestedById

    if (!guidPattern.test(requestedById)) {
      setErrorMessage('Requested By User ID must be a valid GUID.')
      return
    }

    if (!guidPattern.test(ownerId)) {
      setErrorMessage('Owner User ID must be a valid GUID.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload: Omit<Mpa_pricingrequestsBase, 'mpa_pricingrequestid'> = {
        mpa_description: formState.description,
        mpa_effectivedate: formState.effectiveDate,
        mpa_jurisdiction: toChoice<JurisdictionChoice>(formState.jurisdiction),
        mpa_lob: toChoice<LobChoice>(formState.lob),
        mpa_requestsource: toChoice<RequestSourceChoice>(formState.requestSource),
        mpa_requesttype: toChoice<RequestTypeChoice>(formState.requestType),
        mpa_subworktype: toChoice<SubWorkTypeChoice>(formState.subWorkType),
        mpa_worktype: toChoice<WorkTypeChoice>(formState.workType),
        mpa_priority: toChoice<PriorityChoice>(formState.priority),
        'mpa_RequestedBy@odata.bind': `/systemusers(${requestedById})`,
        ownerid: ownerId,
        owneridtype: 'systemusers',
        statecode: 0,
        statuscode: 1,
      }

      if (formState.name.trim()) {
        payload.mpa_name = formState.name.trim()
      }

      if (formState.dueDate) {
        payload.mpa_duedate = formState.dueDate
      }

      const response = await Mpa_pricingrequestsService.create(payload)

      if (!response.success) {
        throw response.error ?? new Error('Unable to create pricing request.')
      }

      setSuccessMessage('Pricing request created successfully.')
      setFormState((current) => ({ ...defaultFormState, requestedByUserId: current.requestedByUserId }))
      setActivePage('pricing-records')
      await loadRecords()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create pricing request.'
      setErrorMessage(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderPlaceholderPage = (title: string, description: string) => (
    <section className="card" aria-label={`${title} page`}>
      <div className="card-header">
        <h2>{title}</h2>
      </div>
      <div className="placeholder-body">
        <p>{description}</p>
      </div>
    </section>
  )

  const renderHomePage = () => (
    <section className="card" aria-label="Home page">
      <div className="card-header">
        <h2>Home</h2>
      </div>
      <div className="home-grid">
        <article className="home-tile">
          <h3>Total Pricing Requests</h3>
          <p className="home-metric">{records.length}</p>
        </article>
        <article className="home-tile">
          <h3>Quick Actions</h3>
          <div className="home-actions">
            <button className="primary" type="button" onClick={() => setActivePage('intake')}>
              New Intake Request
            </button>
            <button
              className="secondary"
              type="button"
              onClick={() => setActivePage('pricing-records')}
            >
              View Pricing Records
            </button>
          </div>
        </article>
      </div>
    </section>
  )

  const renderMyWorkPage = () => (
    <section className="card" aria-label="My Work page">
      <div className="card-header">
        <h2>My Work</h2>
      </div>

      <div className="my-work-toolbar">
        <label>
          Requested By
          <select
            value={myWorkRequestedBy}
            onChange={(event) => setMyWorkRequestedBy(event.target.value)}
          >
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
                      {formatChoiceValue(
                        Mpa_pricingrequestsmpa_priority,
                        record.mpa_priority,
                      )}
                    </td>
                    <td>{record.mpa_effectivedate}</td>
                    <td>{record.statuscodename || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )

  const renderPricingRecordsPage = () => (
    <section className="card" aria-label="Pricing request records grid">
      <div className="card-header">
        <h2>Pricing Request Records</h2>
        <button className="primary" type="button" onClick={() => setActivePage('intake')}>
          Create New Request
        </button>
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
                      {formatChoiceValue(
                        Mpa_pricingrequestsmpa_priority,
                        record.mpa_priority,
                      )}
                    </td>
                    <td>{record.mpa_effectivedate}</td>
                    <td>{record.statuscodename || '-'}</td>
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

  const renderIntakePage = () => (
    <section className="card" aria-label="New pricing request form">
      <div className="card-header">
        <h2>Intake - Submit New Pricing Request</h2>
      </div>

      <form className="request-form" onSubmit={onSubmitNewRequest}>
        <div className="form-section">
          <label>
            Request Type *
            <select
              value={formState.requestType}
              onChange={(event) => onFieldChange('requestType', event.target.value)}
              required
            >
              <option value="" />
              {requestTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Work Type *
            <select
              value={formState.workType}
              onChange={(event) => onFieldChange('workType', event.target.value)}
              required
            >
              {workTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Sub Work Type *
            <select
              value={formState.subWorkType}
              onChange={(event) => onFieldChange('subWorkType', event.target.value)}
              required
            >
              {subWorkTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Priority
            <select
              value={formState.priority}
              onChange={(event) => onFieldChange('priority', event.target.value)}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Requested By *{currentUserName ? ` (${currentUserName})` : ''}
            <input
              type="text"
              value={formState.requestedByUserId}
              onChange={(event) => onFieldChange('requestedByUserId', event.target.value)}
              required
            />
          </label>
        </div>

        <div className="form-section">
          <label>
            Description *
            <textarea
              value={formState.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              rows={4}
              required
            />
          </label>

          <label>
            Request Source *
            <select
              value={formState.requestSource}
              onChange={(event) => onFieldChange('requestSource', event.target.value)}
              required
            >
              {requestSourceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Due Date
            <input
              type="date"
              value={formState.dueDate}
              onChange={(event) => onFieldChange('dueDate', event.target.value)}
            />
          </label>

          <label>
            Juristiction *
            <select
              value={formState.jurisdiction}
              onChange={(event) => onFieldChange('jurisdiction', event.target.value)}
              required
            >
              {jurisdictionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            LOB *
            <select
              value={formState.lob}
              onChange={(event) => onFieldChange('lob', event.target.value)}
              required
            >
              {lobOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-section">
          <label>
            Change Request Number
            <input
              type="text"
              value={formState.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
            />
          </label>

          <label>
            Effective Date *
            <input
              type="date"
              value={formState.effectiveDate}
              onChange={(event) => onFieldChange('effectiveDate', event.target.value)}
              required
            />
          </label>

          <label>
            Attachments
            <input ref={attachmentInputRef} type="file" multiple />
          </label>

          <label>
            Status
            <input type="text" value="New" readOnly />
          </label>
        </div>

        <div className="form-actions">
          <button className="primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Request'}
          </button>
          <button
            className="secondary"
            type="button"
            onClick={() => {
              setFormState((current) => ({
                ...defaultFormState,
                requestedByUserId: current.requestedByUserId,
              }))
              if (attachmentInputRef.current) {
                attachmentInputRef.current.value = ''
              }
              setErrorMessage('')
              setSuccessMessage('')
            }}
          >
            Reset
          </button>
          <button className="secondary" type="button" onClick={() => setActivePage('pricing-records')}>
            Back to Pricing Records
          </button>
        </div>
      </form>

      <p className="helper-text">
        Note: IDs must reference valid Dataverse users in your environment.
      </p>
    </section>
  )

  const renderActivePage = () => {
    switch (activePage) {
      case 'home':
        return renderHomePage()
      case 'my-work':
        return renderMyWorkPage()
      case 'intake':
        return renderIntakePage()
      case 'pricing-records':
        return renderPricingRecordsPage()
      case 'change-requests':
        return renderPlaceholderPage(
          'Change Requests',
          'Track requested changes and review their current status.',
        )
      case 'reports':
        return renderPlaceholderPage('Reports', 'View dashboards and exportable insights.')
      case 'documents':
        return renderPlaceholderPage('Documents', 'Manage request-related files and attachments.')
      case 'meetings':
        return renderPlaceholderPage('Meetings', 'Review agenda items and meeting outcomes.')
      case 'inquiries':
        return renderPlaceholderPage('Inquiries', 'Capture and respond to pricing inquiries.')
      case 'admin':
        return renderPlaceholderPage('Admin', 'Configure application settings and governance.')
      default:
        return renderHomePage()
    }
  }

  return (
    <main className="app-shell">
      <header className="top-header">
        <h1>Medicare Pricing Automation</h1>
        <p>Central workspace for intake, pricing records, and operations.</p>
      </header>

      <div className="workspace-layout">
        <aside className="left-nav" aria-label="Application navigation">
          <p className="nav-title">Navigation</p>
          <nav>
            {navItems.map((item) => (
              <button
                key={item.key}
                className={activePage === item.key ? 'side-link active' : 'side-link'}
                type="button"
                onClick={() => {
                  setActivePage(item.key)
                  setErrorMessage('')
                  setSuccessMessage('')
                }}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="content-pane">
          {errorMessage ? <p className="message error">{errorMessage}</p> : null}
          {successMessage ? <p className="message success">{successMessage}</p> : null}
          {renderActivePage()}
        </section>
      </div>
    </main>
  )
}

export default App
