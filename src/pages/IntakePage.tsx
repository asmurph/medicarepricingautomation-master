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

type RoutingCondition = 'novelTechnology' | 'methodologyChange' | 'clinicalJudgement' | null

type WorkPortion = {
  id: string
  name: string
  assignedTo: string
  due: string
  dependency: string
  condition: RoutingCondition
}

const defaultWorkPortions: WorkPortion[] = [
  { id: 'intake', name: 'Intake validation', assignedTo: 'Pricing intake queue', due: 'At creation', dependency: 'None', condition: null },
  { id: 'code', name: 'Code evaluation', assignedTo: 'Pricing analyst queue', due: '10 business days', dependency: 'Intake complete', condition: null },
  { id: 'technology', name: 'Technology assessment', assignedTo: 'Technology assessment team', due: '5 business days', dependency: 'Code evaluation identifies applicability', condition: 'novelTechnology' },
  { id: 'methodology', name: 'Pricing methodology and calculation', assignedTo: 'Pricing analyst queue', due: '10 business days', dependency: 'Code evaluation', condition: null },
  { id: 'approval', name: 'Methodology approval', assignedTo: 'Senior pricing reviewer', due: 'Before calculation approval', dependency: 'Substantive methodology change', condition: 'methodologyChange' },
  { id: 'cmd', name: 'CMD review', assignedTo: 'Medical director', due: 'Before approval', dependency: 'Clinical judgment or assessment', condition: 'clinicalJudgement' },
  { id: 'quality', name: 'Independent quality review', assignedTo: 'Senior pricing reviewer', due: 'Before implementation', dependency: 'Calculation complete', condition: null },
  { id: 'implementation', name: 'Systems implementation', assignedTo: 'Systems implementation', due: 'Before effective date', dependency: 'Required approvals complete', condition: null },
]

type FormState = {
  caseTitle: string
  effectiveDate: string
  dueDate: string
  codeStatus: 'assigned' | 'pending'
  primaryCode: string
  codeDescriptor: string
  codeInstruction: string
  manufacturerDeveloper: string
  technologyProduct: string
  siteOfService: string
  urgent: string
  assignedStaffOrTeam: string
  requestType: string
  requestSource: string
  workType: string
  subWorkType: string
  jurisdiction: string
  lob: string
  priority: string
  requestedByUserId: string
  clinicalJudgement: string
  novelTechnology: string
  methodologyChange: string
  routingRationale: string
  issueSummary: string
  comparatorCodes: string
  specialInstructions: string
  supportingDocumentNames: string
  workPortions: WorkPortion[]
  notifyAssignee: boolean
  returnIncompleteWork: boolean
}

const defaultFormState: FormState = {
  caseTitle: '',
  effectiveDate: '',
  dueDate: '',
  codeStatus: 'assigned',
  primaryCode: '',
  codeDescriptor: '',
  codeInstruction: '',
  manufacturerDeveloper: '',
  technologyProduct: '',
  siteOfService: '',
  urgent: 'No',
  assignedStaffOrTeam: '',
  requestType: '',
  requestSource: '',
  workType: '',
  subWorkType: '',
  jurisdiction: '',
  lob: '',
  priority: '',
  requestedByUserId: '',
  clinicalJudgement: 'No',
  novelTechnology: 'No',
  methodologyChange: 'No',
  routingRationale: '',
  issueSummary: '',
  comparatorCodes: '',
  specialInstructions: '',
  supportingDocumentNames: '',
  workPortions: defaultWorkPortions,
  notifyAssignee: true,
  returnIncompleteWork: true,
}

const guidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function localDateInputValue(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

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
      <span>{label}{required ? <span className="intake-required"> *</span> : null}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        <option value="">Select {label.toLowerCase()}</option>
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

  function onFieldChange<K extends keyof FormState>(field: K, value: FormState[K]) {
    setFormState((current) => ({ ...current, [field]: value }))
  }

  const onSubmitNewRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    const requestedById = formState.requestedByUserId.trim()
    const ownerId = formState.assignedStaffOrTeam.trim() || requestedById

    if (!guidPattern.test(requestedById)) {
      setErrorMessage('Requested By User ID must be a valid GUID.')
      return
    }

    if (!guidPattern.test(ownerId)) {
      setErrorMessage('Assigned staff must be a valid system user ID.')
      return
    }

    if (formState.codeStatus === 'assigned' && !formState.primaryCode.trim()) {
      setErrorMessage('Enter a primary CPT/HCPCS code or mark the code as pending.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload: Omit<Mpa_pricingrequestsBase, 'mpa_pricingrequestid'> = {
        mpa_name: formState.caseTitle,
        mpa_description: formState.issueSummary,
        mpa_effectivedate: formState.effectiveDate,
        mpa_jurisdiction: toChoice<JurisdictionChoice>(formState.jurisdiction),
        mpa_lob: toChoice<LobChoice>(formState.lob),
        mpa_requestsource: toChoice<RequestSourceChoice>(formState.requestSource),
        mpa_requesttype: toChoice<RequestTypeChoice>(formState.requestType),
        mpa_subworktype: toChoice<SubWorkTypeChoice>(formState.subWorkType),
        mpa_worktype: toChoice<WorkTypeChoice>(formState.workType),
        mpa_internalnotes: [
          ['Code status', formState.codeStatus === 'assigned' ? 'Assigned' : 'Code pending'],
          ['Primary CPT/HCPCS code', formState.primaryCode],
          ['Code descriptor', formState.codeDescriptor],
          ['Parenthetical or CPT instruction', formState.codeInstruction],
          ['Manufacturer or developer', formState.manufacturerDeveloper],
          ['Technology or product name', formState.technologyProduct],
          ['Site of service', formState.siteOfService],
          ['Urgent or time-sensitive', formState.urgent],
          ['Assigned staff or team', formState.assignedStaffOrTeam],
          ['Clinical judgment required', formState.clinicalJudgement],
          ['New or novel technology', formState.novelTechnology],
          ['Substantive methodology change', formState.methodologyChange],
          ['Routing determination rationale', formState.routingRationale],
          ['Known comparator codes', formState.comparatorCodes],
          ['Special instructions', formState.specialInstructions],
          ['Supporting document filenames (not uploaded)', formState.supportingDocumentNames],
          ['Notify assignee when predecessor completes', String(formState.notifyAssignee)],
          ['Return incomplete work to assigned owner', String(formState.returnIncompleteWork)],
          ...formState.workPortions.map(
            (portion) => [
              `Workflow ${portion.name}`,
              `Applicability: ${
                portion.condition === null || formState[portion.condition] === 'Yes'
                  ? 'Required'
                  : 'Not required'
              }; Assigned to: ${portion.assignedTo}; Due: ${portion.due}; Dependency: ${portion.dependency}`,
            ] as [string, string],
          ),
        ]
          .filter(([, value]) => value.trim())
          .map(([label, value]) => `${label}: ${value}`)
          .join('\n'),
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

  const readinessItems = [
    {
      label: 'Request classification',
      complete: Boolean(formState.requestType && formState.workType && formState.subWorkType),
    },
    {
      label: 'Code or temporary identifier',
      complete: formState.codeStatus === 'pending' || Boolean(formState.primaryCode.trim()),
    },
    {
      label: 'Title and request source',
      complete: Boolean(formState.caseTitle.trim() && formState.requestSource),
    },
    {
      label: 'Effective date and jurisdiction',
      complete: Boolean(formState.effectiveDate && formState.jurisdiction && formState.lob),
    },
  ]
  const completedReadinessItems = readinessItems.filter((item) => item.complete).length

  return (
    <section className="intake-page" aria-label="Open a pricing case">
      <a
        className="intake-back-link"
        href="#work-queue"
        onClick={(event) => {
          event.preventDefault()
          onBack()
        }}
      >
        <span aria-hidden="true">←</span> Back to work queue
      </a>

      <header className="intake-heading">
        <div>
          <p className="intake-eyebrow">New record · Initial intake</p>
          <h2>Open a pricing case</h2>
          <p className="intake-intro">
            Create the parent case first. Related codes, methodology, documents, approvals, and
            implementation records can be added after the case is created.
          </p>
        </div>
        <div className="intake-heading-actions">
          <button className="secondary" type="button" onClick={onBack}>
            Cancel
          </button>
          <button className="primary" type="submit" form="pricing-case-form" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create pricing case'}
          </button>
        </div>
      </header>

      <div className="intake-layout">
        <form
          id="pricing-case-form"
          className="intake-form"
          onSubmit={onSubmitNewRequest}
          aria-label="Pricing case details"
        >
          <section className="intake-section" aria-labelledby="request-classification-heading">
            <header className="intake-section-header">
              <span className="intake-step">1</span>
              <div>
                <h3 id="request-classification-heading">Request classification</h3>
                <p>Required fields determine routing, priority, and the correct work-type workflow.</p>
              </div>
              <span className="intake-required-badge">Required</span>
            </header>

            <div className="intake-fields">
              <SelectField
                label="Request type"
                value={formState.requestType}
                options={requestTypeOptions}
                onChange={(value) => onFieldChange('requestType', value)}
                required
              />
              <SelectField
                label="Work type"
                value={formState.workType}
                options={workTypeOptions}
                onChange={(value) => onFieldChange('workType', value)}
                required
              />
              <SelectField
                label="Priority"
                value={formState.priority}
                options={priorityOptions}
                onChange={(value) => onFieldChange('priority', value)}
              />
              <SelectField
                label="Request source"
                value={formState.requestSource}
                options={requestSourceOptions}
                onChange={(value) => onFieldChange('requestSource', value)}
                required
              />
              <label className="intake-field-wide">
                <span>Case title<span className="intake-required"> *</span></span>
                <input
                  type="text"
                  value={formState.caseTitle}
                  onChange={(event) => onFieldChange('caseTitle', event.target.value)}
                  placeholder="Short, recognizable description"
                  required
                />
              </label>
              <label>
                <span>Date received</span>
                <input type="date" value={localDateInputValue()} readOnly />
                <small>System timestamp when the case is created.</small>
              </label>
            </div>
          </section>

          <section className="intake-section" aria-labelledby="service-identification-heading">
            <header className="intake-section-header">
              <span className="intake-step">2</span>
              <div>
                <h3 id="service-identification-heading">Code and service identification</h3>
                <p>The corrected design supports coded work and assessments that begin before a final code exists.</p>
              </div>
            </header>

            <div className="intake-fields">
              <fieldset className="intake-code-choice intake-field-wide">
                <legend>Code status</legend>
                <label className={formState.codeStatus === 'assigned' ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="code-status"
                    value="assigned"
                    checked={formState.codeStatus === 'assigned'}
                    onChange={() => onFieldChange('codeStatus', 'assigned')}
                  />
                  <span><strong>Assigned code</strong><small>A CPT or HCPCS code is available.</small></span>
                </label>
                <label className={formState.codeStatus === 'pending' ? 'selected' : ''}>
                  <input
                    type="radio"
                    name="code-status"
                    value="pending"
                    checked={formState.codeStatus === 'pending'}
                    onChange={() => onFieldChange('codeStatus', 'pending')}
                  />
                  <span><strong>Code pending</strong><small>Review begins before code assignment.</small></span>
                </label>
              </fieldset>
              {formState.codeStatus === 'assigned' ? (
                <label>
                  <span>Primary CPT/HCPCS code<span className="intake-required"> *</span></span>
                  <input
                    type="text"
                    value={formState.primaryCode}
                    onChange={(event) => onFieldChange('primaryCode', event.target.value)}
                    placeholder="Example: 1054T"
                    required
                  />
                  <small>Enter the five-character code. Additional codes can be linked after creation.</small>
                </label>
              ) : (
                <label>
                  <span>Temporary identifier</span>
                  <input
                    type="text"
                    value={formState.primaryCode}
                    onChange={(event) => onFieldChange('primaryCode', event.target.value)}
                    placeholder="Optional temporary identifier"
                  />
                </label>
              )}
              <label>
                <span>Descriptor</span>
                <textarea
                  value={formState.codeDescriptor}
                  onChange={(event) => onFieldChange('codeDescriptor', event.target.value)}
                  rows={2}
                  placeholder="Official descriptor when available"
                />
              </label>
              <label>
                <span>Parenthetical or CPT instruction</span>
                <textarea
                  value={formState.codeInstruction}
                  onChange={(event) => onFieldChange('codeInstruction', event.target.value)}
                  rows={2}
                  placeholder="Relevant parenthetical note or operational instruction"
                />
              </label>
              <label>
                <span>Manufacturer or developer</span>
                <input
                  type="text"
                  value={formState.manufacturerDeveloper}
                  onChange={(event) => onFieldChange('manufacturerDeveloper', event.target.value)}
                  placeholder="When applicable"
                />
              </label>
              <label>
                <span>Technology or product name</span>
                <input
                  type="text"
                  value={formState.technologyProduct}
                  onChange={(event) => onFieldChange('technologyProduct', event.target.value)}
                  placeholder="When applicable"
                />
              </label>
              <label>
                <span>Site of service</span>
                <input
                  type="text"
                  value={formState.siteOfService}
                  onChange={(event) => onFieldChange('siteOfService', event.target.value)}
                  placeholder="Enter when known"
                />
              </label>
              <SelectField
                label="Sub work type"
                value={formState.subWorkType}
                options={subWorkTypeOptions}
                onChange={(value) => onFieldChange('subWorkType', value)}
                required
              />
            </div>
          </section>

          <section className="intake-section" aria-labelledby="timing-assignment-heading">
            <header className="intake-section-header">
              <span className="intake-step">3</span>
              <div>
                <h3 id="timing-assignment-heading">Timing, jurisdiction, and assignment</h3>
                <p>These fields drive deadlines, locality treatment, ownership, and workload reporting.</p>
              </div>
            </header>
            <div className="intake-fields">
              <label>
                <span>Effective date<span className="intake-required"> *</span></span>
                <input
                  type="date"
                  value={formState.effectiveDate}
                  onChange={(event) => onFieldChange('effectiveDate', event.target.value)}
                  required
                />
              </label>
              <SelectField
                label="Jurisdiction"
                value={formState.jurisdiction}
                options={jurisdictionOptions}
                onChange={(value) => onFieldChange('jurisdiction', value)}
                required
              />
              <label>
                <span>Due date</span>
                <input
                  type="date"
                  value={formState.dueDate}
                  onChange={(event) => onFieldChange('dueDate', event.target.value)}
                />
              </label>
              <SelectField
                label="Line of business (LOB)"
                value={formState.lob}
                options={lobOptions}
                onChange={(value) => onFieldChange('lob', value)}
                required
              />
              <label>
                <span>Assigned staff system user ID</span>
                <input
                  type="text"
                  value={formState.assignedStaffOrTeam}
                  onChange={(event) => onFieldChange('assignedStaffOrTeam', event.target.value)}
                  placeholder="Leave blank to assign to requester"
                />
                <small>Enter a Dataverse system user GUID; teams are not supported by this request form.</small>
              </label>
              <label>
                <span>Initial status</span>
                <input type="text" value="New" readOnly />
                <small>Set automatically when the case is created.</small>
              </label>
              <SelectField
                label="Urgent or time-sensitive"
                value={formState.urgent}
                options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
                onChange={(value) => onFieldChange('urgent', value)}
              />
              <label>
                <span>Requested by<span className="intake-required"> *</span></span>
                <input
                  type="text"
                  value={formState.requestedByUserId}
                  onChange={(event) => onFieldChange('requestedByUserId', event.target.value)}
                  placeholder={currentUserName || 'Authenticated user ID'}
                  required
                />
                <small>{currentUserName ? `Signed in as ${currentUserName}` : 'Enter a valid Dataverse user ID.'}</small>
              </label>
            </div>
          </section>

          <section className="intake-section" aria-labelledby="routing-plan-heading">
            <header className="intake-section-header">
              <span className="intake-step">4</span>
              <div>
                <h3 id="routing-plan-heading">Assignment and conditional routing plan</h3>
                <p>The system evaluates applicability first, then defines the staff task needed for each case.</p>
              </div>
              <span className="intake-required-badge">Rules driven</span>
            </header>
            <div className="intake-fields intake-routing-fields">
              <SelectField
                label="Does the case involve clinical judgment?"
                value={formState.clinicalJudgement}
                options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
                onChange={(value) => onFieldChange('clinicalJudgement', value)}
              />
              <SelectField
                label="Is this a new or novel technology?"
                value={formState.novelTechnology}
                options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
                onChange={(value) => onFieldChange('novelTechnology', value)}
              />
              <SelectField
                label="Does the methodology substantively change?"
                value={formState.methodologyChange}
                options={[{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }]}
                onChange={(value) => onFieldChange('methodologyChange', value)}
              />
              <label>
                <span>Routing determination rationale<span className="intake-required"> *</span></span>
                <textarea
                  value={formState.routingRationale}
                  onChange={(event) => onFieldChange('routingRationale', event.target.value)}
                  rows={3}
                  placeholder="Document why specialized review is or is not required."
                  required
                />
              </label>
              <div className="intake-routing-preview intake-field-wide">
                <div className="intake-routing-preview-heading">
                  <strong>Work portion</strong>
                  <strong>Applicability</strong>
                  <strong>Assigned staff or team</strong>
                  <strong>Due</strong>
                  <strong>Dependency</strong>
                </div>
                {formState.workPortions.map((portion, index) => {
                  const required =
                    portion.condition === null || formState[portion.condition] === 'Yes'
                  return (
                    <div className={required ? 'intake-routing-row' : 'intake-routing-row muted'} key={portion.id}>
                      <span className="intake-work-name">
                        <i>{index + 1}</i>
                        <input
                          aria-label={`Work portion ${index + 1} name`}
                          value={portion.name}
                          onChange={(event) =>
                            setFormState((current) => ({
                              ...current,
                              workPortions: current.workPortions.map((item) =>
                                item.id === portion.id ? { ...item, name: event.target.value } : item,
                              ),
                            }))
                          }
                        />
                      </span>
                      <strong className={required ? 'required' : 'not-required'}>
                        {required ? 'Required' : 'Not required'}
                      </strong>
                      <select
                        aria-label={`Assigned staff or team for ${portion.name}`}
                        value={portion.assignedTo}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            workPortions: current.workPortions.map((item) =>
                              item.id === portion.id ? { ...item, assignedTo: event.target.value } : item,
                            ),
                          }))
                        }
                      >
                        {[portion.assignedTo, 'Pricing intake queue', 'Pricing analyst queue', 'Technology assessment team', 'Senior pricing reviewer', 'Medical director', 'Systems implementation'].filter((value, optionIndex, options) => options.indexOf(value) === optionIndex).map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <input
                        aria-label={`Due for ${portion.name}`}
                        value={portion.due}
                        onChange={(event) =>
                          setFormState((current) => ({
                            ...current,
                            workPortions: current.workPortions.map((item) =>
                              item.id === portion.id ? { ...item, due: event.target.value } : item,
                            ),
                          }))
                        }
                      />
                      <span>{portion.dependency}</span>
                    </div>
                  )
                })}
                <div className="intake-routing-controls">
                  <button
                    className="secondary"
                    type="button"
                    onClick={() =>
                      setFormState((current) => ({
                        ...current,
                        workPortions: [
                          ...current.workPortions,
                          {
                            id: `custom-${current.workPortions.length + 1}`,
                            name: 'New work portion',
                            assignedTo: 'Pricing analyst queue',
                            due: '10 business days',
                            dependency: 'Intake complete',
                            condition: null,
                          },
                        ],
                      }))
                    }
                  >
                    + Add work portion
                  </button>
                  <label>
                    <input
                      type="checkbox"
                      checked={formState.notifyAssignee}
                      onChange={(event) => onFieldChange('notifyAssignee', event.target.checked)}
                    />
                    Notify assignee when predecessor completes
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={formState.returnIncompleteWork}
                      onChange={(event) => onFieldChange('returnIncompleteWork', event.target.checked)}
                    />
                    Return incomplete work to assigned owner
                  </label>
                </div>
              </div>
            </div>
          </section>

          <section className="intake-section" aria-labelledby="initial-context-heading">
            <header className="intake-section-header">
              <span className="intake-step">5</span>
              <div>
                <h3 id="initial-context-heading">Initial context and supporting information</h3>
                <p>Summary is required for case creation; comparator context and instructions are optional.</p>
              </div>
              <span className="intake-required-badge">Context</span>
            </header>
            <div className="intake-fields">
              <label>
                <span>Issue or request summary<span className="intake-required"> *</span></span>
                <textarea
                  value={formState.issueSummary}
                  onChange={(event) => onFieldChange('issueSummary', event.target.value)}
                  rows={4}
                  placeholder="What decision, evaluation, correction, or implementation action is needed?"
                  required
                />
              </label>
              <label>
                <span>Known comparator code(s)</span>
                <textarea
                  value={formState.comparatorCodes}
                  onChange={(event) => onFieldChange('comparatorCodes', event.target.value)}
                  rows={3}
                  placeholder="Add after creation as related comparator records"
                />
              </label>
              <label>
                <span>Supporting document</span>
                <input
                  ref={attachmentInputRef}
                  type="file"
                  multiple
                  onChange={(event) =>
                    onFieldChange(
                      'supportingDocumentNames',
                      Array.from(event.target.files ?? []).map((file) => file.name).join(', '),
                    )
                  }
                />
                <small>File contents are not uploaded by the current Dataverse integration. Add files after case creation.</small>
              </label>
              <label>
                <span>Special instructions</span>
                <textarea
                  value={formState.specialInstructions}
                  onChange={(event) => onFieldChange('specialInstructions', event.target.value)}
                  rows={4}
                  placeholder="Known constraints, dependencies, or follow-up requirements"
                />
              </label>
            </div>
          </section>

          <div className="intake-bottom-actions">
            <button className="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create pricing case'}
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
              Reset form
            </button>
            <button className="secondary" type="button" onClick={onBack}>
              Cancel
            </button>
          </div>
        </form>

        <aside className="intake-aside" aria-label="Pricing case information">
          <section className="intake-aside-card">
            <header className="intake-aside-heading">
              <h3>Intake readiness</h3>
              <strong>{completedReadinessItems}/{readinessItems.length}</strong>
            </header>
            <div
              className="intake-progress"
              role="progressbar"
              aria-label="Intake readiness"
              aria-valuemin={0}
              aria-valuemax={readinessItems.length}
              aria-valuenow={completedReadinessItems}
            >
              <span style={{ width: `${(completedReadinessItems / readinessItems.length) * 100}%` }} />
            </div>
            <p className="intake-aside-help">Complete the required fields marked with an asterisk.</p>
            <ul className="intake-checklist">
              {readinessItems.map((item) => (
                <li key={item.label} className={item.complete ? 'complete' : ''}>
                  <span aria-hidden="true">{item.complete ? '✓' : '○'}</span>
                  {item.label}
                </li>
              ))}
            </ul>
          </section>

          <section className="intake-aside-card">
            <h3>System-created audit fields</h3>
            <p className="intake-aside-help">These fields populate automatically and cannot be edited by the user.</p>
            <dl className="intake-audit-list">
              <div><dt>Case ID</dt><dd>Generated on creation</dd></div>
              <div><dt>Created by</dt><dd>{currentUserName || 'Authenticated user'}</dd></div>
              <div><dt>Created date</dt><dd>System timestamp</dd></div>
              <div><dt>Initial status</dt><dd>New</dd></div>
              <div><dt>Revision</dt><dd>Version 1</dd></div>
            </dl>
          </section>

          <section className="intake-aside-card">
            <h3>What happens next</h3>
            <ul className="intake-next-list">
              <li>System validates required fields.</li>
              <li>Case ID and audit fields are created.</li>
              <li>Work routes according to work type.</li>
              <li>Related codes and supporting records can be added.</li>
            </ul>
          </section>
        </aside>
      </div>
    </section>
  )
}

export default IntakePage
