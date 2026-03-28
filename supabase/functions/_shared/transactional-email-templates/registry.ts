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

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'report-delivery': reportDelivery,
  'invoice-confirmation': invoiceConfirmation,
}
