export type PricingRecord = {
  PricingId: number
  PricingName: string
}

export type WorkPortionSubmission = {
  name: string
  applicability: 'Required' | 'Not required'
  assignedTo: string
  due: string
  dependency: string
}

export type PricingCaseSubmission = {
  caseTitle: string
  requestType: string
  workType: string
  subWorkType: string
  priority: string
  requestSource: string
  requestedBy: string
  assignedStaffOrTeam: string
  effectiveDate: string
  dueDate: string
  jurisdiction: string
  lob: string
  urgent: boolean
  codeStatus: 'Assigned' | 'Pending'
  primaryCode: string
  codeDescriptor: string
  codeInstruction: string
  manufacturerDeveloper: string
  technologyProduct: string
  siteOfService: string
  clinicalJudgement: boolean
  novelTechnology: boolean
  methodologyChange: boolean
  routingRationale: string
  workPortions: WorkPortionSubmission[]
  notifyAssignee: boolean
  returnIncompleteWork: boolean
  issueSummary: string
  relatedPricingId?: number
  comparatorCodes: string
  specialInstructions: string
  supportingDocumentNames: string[]
}

export class ConnectorNotConfiguredError extends Error {
  constructor(operation: string) {
    super(
      `The PricingInquiryConnector "${operation}" operation is not wired up yet. ` +
        'Add the connector to this app and call the generated service method in src/lib/pricingConnector.ts.',
    )
    this.name = 'ConnectorNotConfiguredError'
  }
}

// Replace the body with the generated PricingInquiryConnector service call
// and map its response to PricingRecord[].
export async function loadPricingFromConnector(): Promise<PricingRecord[]> {
  throw new ConnectorNotConfiguredError('load pricing')
}

// Replace the body with the generated connector call that creates a pricing case.
export async function submitPricingCaseToConnector(
  submission: PricingCaseSubmission,
): Promise<void> {
  void submission
  throw new ConnectorNotConfiguredError('create pricing case')
}
