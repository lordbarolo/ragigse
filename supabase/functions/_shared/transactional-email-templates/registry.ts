/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as reportDelivery } from './report-delivery.tsx'
import { template as invoiceConfirmation } from './invoice-confirmation.tsx'
import { template as invoiceAdminNotify } from './invoice-admin-notify.tsx'
import { template as referenceInvite } from './reference-invite.tsx'
import { template as representationInvite } from './representation-invite.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'report-delivery': reportDelivery,
  'invoice-confirmation': invoiceConfirmation,
  'invoice-admin-notify': invoiceAdminNotify,
  'reference-invite': referenceInvite,
  'representation-invite': representationInvite,
}
