import { useEffect, useMemo, useRef, useState } from 'react'
import { getContext } from '@microsoft/power-apps/app'
import { SystemusersService } from '../generated/services/SystemusersService'
import { Mpa_pricingrequestsService } from '../generated/services/Mpa_pricingrequestsService'
import {
  Mpa_pricingrequestsmpa_jurisdiction,
  Mpa_pricingrequestsmpa_lob,
  Mpa_pricingrequestsmpa_priority,
  Mpa_pricingrequestsmpa_requestsource,
  Mpa_pricingrequestsmpa_requesttype,
  Mpa_pricingrequestsmpa_subworktype,
  Mpa_pricingrequestsmpa_worktype,
  type Mpa_pricingrequestsBase,
  type Mpa_pricingrequestsmpa_jurisdiction as JurisdictionChoice,
  type Mpa_pricingrequestsmpa_lob as LobChoice,
  type Mpa_pricingrequestsmpa_priority as PriorityChoice,
  type Mpa_pricingrequestsmpa_requestsource as RequestSourceChoice,
  type Mpa_pricingrequestsmpa_requesttype as RequestTypeChoice,
  type Mpa_pricingrequestsmpa_subworktype as SubWorkTypeChoice,
  type Mpa_pricingrequestsmpa_worktype as WorkTypeChoice,
} from '../generated/models/Mpa_pricingrequestsModel'
import { toChoice, toOptions } from '../lib/pricingRequestUtils'

type FormState = {
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

const defaultFormState: FormState = {
  description: '',
  effectiveDate: '',
  dueDate: '',
  requestType: '',
  requestSource: '',
  workType: '',
  subWorkType: '',
  jurisdiction: '',
  lob: '',
  priority: '',
  requestedByUserId: '',
  ownerUserId: '',
}

const guidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type IntakePageProps = {
  onCreated: () => Promise<void>
  onBack: () => void
  setErrorMessage: (message: string) => void
  setSuccessMessage: (message: string) => void
}

type SelectFieldProps = {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
  required?: boolean
}

function SelectField({ label, value, options, onChange, required }: SelectFieldProps) {
  return (
    <label>
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="" />
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function IntakePage({ onCreated, onBack, setErrorMessage, setSuccessMessage }: IntakePageProps) {
  const [formState, setFormState] = useState<FormState>(defaultFormState)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [currentUserName, setCurrentUserName] = useState<string>('')
  const attachmentInputRef = useRef<HTMLInputElement>(null)

  const requestTypeOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_requesttype), [])
  const requestSourceOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_requestsource), [])
  const workTypeOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_worktype), [])
  const subWorkTypeOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_subworktype), [])
  const jurisdictionOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_jurisdiction), [])
  const lobOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_lob), [])
  const priorityOptions = useMemo(() => toOptions(Mpa_pricingrequestsmpa_priority), [])

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
          current.requestedByUserId ? current : { ...current, requestedByUserId: systemUserId },
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
        'mpa_RequestedBy@odata.bind': `/systemusers(${requestedById})`,
        ownerid: ownerId,
        owneridtype: 'systemusers',
        statecode: 0,
        statuscode: 1,
      }

      if (formState.priority) {
        payload.mpa_priority = toChoice<PriorityChoice>(formState.priority)
      }

      if (formState.dueDate) {
        payload.mpa_duedate = formState.dueDate
      }

      const response = await Mpa_pricingrequestsService.create(payload)

      if (!response.success) {
        throw response.error ?? new Error('Unable to create pricing request.')
      }

      setSuccessMessage('Pricing request created successfully.')
      await onCreated()
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unable to create pricing request.'
      setErrorMessage(message)
      setIsSubmitting(false)
    }
  }

  return (
    <section className="card" aria-label="New pricing request form">
      <div className="card-header">
        <h2>Intake - Submit New Pricing Request</h2>
      </div>

      <form className="request-form" onSubmit={onSubmitNewRequest}>
        <div className="form-section">
          <SelectField
            label="Request Type *"
            value={formState.requestType}
            options={requestTypeOptions}
            onChange={(value) => onFieldChange('requestType', value)}
            required
          />
          <SelectField
            label="Work Type *"
            value={formState.workType}
            options={workTypeOptions}
            onChange={(value) => onFieldChange('workType', value)}
            required
          />
          <SelectField
            label="Sub Work Type *"
            value={formState.subWorkType}
            options={subWorkTypeOptions}
            onChange={(value) => onFieldChange('subWorkType', value)}
            required
          />
          <SelectField
            label="Priority"
            value={formState.priority}
            options={priorityOptions}
            onChange={(value) => onFieldChange('priority', value)}
          />

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

          <SelectField
            label="Request Source *"
            value={formState.requestSource}
            options={requestSourceOptions}
            onChange={(value) => onFieldChange('requestSource', value)}
            required
          />

          <label>
            Due Date
            <input
              type="date"
              value={formState.dueDate}
              onChange={(event) => onFieldChange('dueDate', event.target.value)}
            />
          </label>

          <SelectField
            label="Juristiction *"
            value={formState.jurisdiction}
            options={jurisdictionOptions}
            onChange={(value) => onFieldChange('jurisdiction', value)}
            required
          />
          <SelectField
            label="LOB *"
            value={formState.lob}
            options={lobOptions}
            onChange={(value) => onFieldChange('lob', value)}
            required
          />
        </div>

        <div className="form-section">
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
              setFormState({ ...defaultFormState })
              if (attachmentInputRef.current) {
                attachmentInputRef.current.value = ''
              }
              setErrorMessage('')
              setSuccessMessage('')
            }}
          >
            Reset
          </button>
          <button className="secondary" type="button" onClick={onBack}>
            Back to Pricing Records
          </button>
        </div>
      </form>

      <p className="helper-text">
        Note: IDs must reference valid Dataverse users in your environment.
      </p>
    </section>
  )
}

export default IntakePage
