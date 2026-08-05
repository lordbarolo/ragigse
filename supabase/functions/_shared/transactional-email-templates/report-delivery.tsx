/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'vårdbemanning.ai'

interface ReportDeliveryProps {
  occupation?: string
  kommun?: string
  reportUrl?: string
}

const ReportDeliveryEmail = ({ occupation, kommun, reportUrl }: ReportDeliveryProps) => (
  <Html lang="sv" dir="ltr">
    <Head />
    <Preview>Din ersättningsanalys för {occupation || 'din roll'} är klar</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={logo}>{SITE_NAME}</Text>
        <Heading style={h1}>Din ersättningsanalys är klar</Heading>
        <Text style={text}>
          Hej! Din personliga ersättningsanalys för <strong>{occupation || 'din roll'}</strong>
          {kommun ? ` i ${kommun}` : ''} är redo att läsas.
        </Text>
        <Section style={highlightBox}>
          <Text style={highlightText}>
            Rapporten innehåller marknadslöner, rekommenderad ersättning och
            förhandlingsstrategier anpassade för dig.
          </Text>
        </Section>
        <Button style={button} href={reportUrl || 'https://vardbemanning.ai'}>
          Öppna min rapport →
        </Button>
        <Text style={footer}>
          Rapporten finns alltid tillgänglig via ditt vårdbemanning.ai-konto.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ReportDeliveryEmail,
  subject: (data: Record<string, any>) =>
    `Din ersättningsanalys — ${data.occupation || 'din roll'}${data.kommun ? `, ${data.kommun}` : ''}`,
  displayName: 'Rapportleverans',
  previewData: { occupation: 'Specialistsjuksköterska', kommun: 'Stockholm', reportUrl: 'https://vardbemanning.ai/rapport/demo' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Inter', Arial, sans-serif" }
const container = { padding: '32px 28px' }
const logo = { fontSize: '20px', fontWeight: 'bold' as const, color: '#4F46E5', margin: '0 0 24px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const h1 = { fontSize: '22px', fontWeight: '600' as const, color: '#111827', margin: '0 0 16px', fontFamily: "'Work Sans', 'Inter', Arial, sans-serif" }
const text = { fontSize: '15px', color: '#475569', lineHeight: '1.6', margin: '0 0 20px' }
const highlightBox = { backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', margin: '0 0 24px' }
const highlightText = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0' }
const button = { backgroundColor: '#4F46E5', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '13px', color: '#94a3b8', margin: '32px 0 0', lineHeight: '1.5' }
